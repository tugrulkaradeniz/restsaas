import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

function round2(n: number) { return Math.round(n * 100) / 100 }

interface Item {
  ingredient_id: string
  quantity:      number
  unit_cost:     number
  kdv_rate:      number
  kdv_included:  boolean
  subtotal:      number
  kdv_amount:    number
  total:         number
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Yetki yok' }, { status: 401 })

  const tenantId = user.app_metadata?.tenant_id as string | undefined
  if (!tenantId) return NextResponse.json({ error: 'Tenant bulunamadı' }, { status: 403 })

  const body = await req.json()
  const {
    supplier_id, invoice_no, invoice_date, due_date,
    items, payment_status, paid_amount, payment_method, payment_date, notes,
  }: {
    supplier_id?: string; invoice_no?: string; invoice_date?: string; due_date?: string
    items: Item[]; payment_status: string; paid_amount?: number
    payment_method?: string; payment_date?: string; notes?: string
  } = body

  if (!items || items.length === 0)
    return NextResponse.json({ error: 'En az bir kalem girin' }, { status: 400 })

  const subtotal   = round2(items.reduce((s, i) => s + i.subtotal,   0))
  const kdvAmount  = round2(items.reduce((s, i) => s + i.kdv_amount, 0))
  const total      = round2(items.reduce((s, i) => s + i.total,      0))
  const finalPaid  = payment_status === 'paid' ? total : round2(paid_amount ?? 0)
  const finalStatus = payment_status === 'paid' ? 'paid'
                    : finalPaid > 0 ? 'partial' : 'pending'

  const service = createServiceClient()

  const { data: entry, error: entryErr } = await service
    .from('stock_entries')
    .insert({
      tenant_id:      tenantId,
      supplier_id:    supplier_id || null,
      invoice_no:     invoice_no  || null,
      invoice_date:   invoice_date || new Date().toISOString().split('T')[0],
      due_date:       due_date    || null,
      subtotal,
      kdv_amount:     kdvAmount,
      total_amount:   total,
      paid_amount:    finalPaid,
      payment_status: finalStatus,
      notes:          notes || null,
    })
    .select().single()

  if (entryErr || !entry)
    return NextResponse.json({ error: entryErr?.message ?? 'Fatura oluşturulamadı' }, { status: 400 })

  const { error: itemsErr } = await service.from('stock_entry_items').insert(
    items.map((i) => ({
      entry_id:      entry.id,
      ingredient_id: i.ingredient_id,
      quantity:      i.quantity,
      unit_cost:     i.unit_cost,
      kdv_rate:      i.kdv_rate,
      kdv_included:  i.kdv_included,
      kdv_amount:    i.kdv_amount,
      total:         i.total,
    }))
  )
  if (itemsErr) return NextResponse.json({ error: itemsErr.message }, { status: 400 })

  // Stok güncelle: miktar ekle, KDV hariç birim maliyeti güncelle
  for (const item of items) {
    const { data: ing } = await service.from('ingredients').select('stock_qty').eq('id', item.ingredient_id).single()
    if (ing) {
      const unitCostExcl = item.kdv_included
        ? round2(item.unit_cost / (1 + item.kdv_rate / 100))
        : item.unit_cost
      const resultingQty = round2((ing.stock_qty ?? 0) + item.quantity)
      await service.from('ingredients').update({
        stock_qty: resultingQty,
        unit_cost: unitCostExcl,
      }).eq('id', item.ingredient_id)
      await service.from('stock_movements').insert({
        tenant_id: tenantId,
        ingredient_id: item.ingredient_id,
        type: 'purchase',
        quantity_change: item.quantity,
        resulting_qty: resultingQty,
        entry_id: entry.id,
      })
    }
  }

  if (finalPaid > 0 && payment_method) {
    await service.from('stock_payments').insert({
      tenant_id: tenantId,
      entry_id:  entry.id,
      amount:    finalPaid,
      method:    payment_method,
      paid_at:   payment_date || new Date().toISOString().split('T')[0],
    })
  }

  const { data: full } = await service
    .from('stock_entries')
    .select('*, supplier:suppliers(name), items:stock_entry_items(*, ingredient:ingredients(name,unit))')
    .eq('id', entry.id).single()

  return NextResponse.json({ ok: true, entry: full })
}
