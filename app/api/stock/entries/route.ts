import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Yetki yok' }, { status: 401 })

  const tenantId = user.app_metadata?.tenant_id as string | undefined
  if (!tenantId) return NextResponse.json({ error: 'Tenant bulunamadı' }, { status: 403 })

  const body = await req.json()
  const {
    supplier_id, invoice_no, invoice_date, due_date, kdv_rate,
    items, payment_status, paid_amount, payment_method, payment_date, notes,
  } = body

  if (!items || items.length === 0) {
    return NextResponse.json({ error: 'En az bir kalem girin' }, { status: 400 })
  }

  const subtotal   = items.reduce((s: number, i: { total: number }) => s + i.total, 0)
  const kdvAmount  = Math.round(subtotal * (kdv_rate / 100) * 100) / 100
  const total      = Math.round((subtotal + kdvAmount) * 100) / 100
  const finalPaid  = payment_status === 'paid' ? total : (parseFloat(paid_amount) || 0)
  const finalStatus = payment_status === 'paid' ? 'paid'
                    : finalPaid > 0 ? 'partial'
                    : 'pending'

  const service = createServiceClient()

  const { data: entry, error: entryErr } = await service
    .from('stock_entries')
    .insert({
      tenant_id: tenantId,
      supplier_id: supplier_id || null,
      invoice_no: invoice_no || null,
      invoice_date: invoice_date || new Date().toISOString().split('T')[0],
      due_date: due_date || null,
      subtotal,
      kdv_rate: parseFloat(kdv_rate),
      kdv_amount: kdvAmount,
      total_amount: total,
      paid_amount: finalPaid,
      payment_status: finalStatus,
      notes: notes || null,
    })
    .select()
    .single()

  if (entryErr || !entry) {
    return NextResponse.json({ error: entryErr?.message ?? 'Fatura oluşturulamadı' }, { status: 400 })
  }

  // Kalemler
  const { error: itemsErr } = await service.from('stock_entry_items').insert(
    items.map((i: { ingredient_id: string; quantity: number; unit_cost: number; total: number }) => ({
      entry_id: entry.id,
      ingredient_id: i.ingredient_id,
      quantity: i.quantity,
      unit_cost: i.unit_cost,
      total: i.total,
    }))
  )
  if (itemsErr) return NextResponse.json({ error: itemsErr.message }, { status: 400 })

  // Stok güncelle: miktar ekle + son alış fiyatını güncelle
  for (const item of items) {
    const { data: ing } = await service
      .from('ingredients')
      .select('stock_qty')
      .eq('id', item.ingredient_id)
      .single()

    if (ing) {
      await service.from('ingredients').update({
        stock_qty: (ing.stock_qty ?? 0) + item.quantity,
        unit_cost: item.unit_cost,
      }).eq('id', item.ingredient_id)
    }
  }

  // Ödeme kaydı
  if (finalPaid > 0 && payment_method) {
    await service.from('stock_payments').insert({
      tenant_id: tenantId,
      entry_id: entry.id,
      amount: finalPaid,
      method: payment_method,
      paid_at: payment_date || new Date().toISOString().split('T')[0],
    })
  }

  const { data: full } = await service
    .from('stock_entries')
    .select('*, supplier:suppliers(name), items:stock_entry_items(*, ingredient:ingredients(name,unit))')
    .eq('id', entry.id)
    .single()

  return NextResponse.json({ ok: true, entry: full })
}
