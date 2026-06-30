import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Yetki yok' }, { status: 401 })

  const tenantId = user.app_metadata?.tenant_id as string | undefined
  if (!tenantId) return NextResponse.json({ error: 'Tenant bulunamadı' }, { status: 403 })

  const { amount, method, paid_at, note } = await req.json()
  if (!amount || !method) return NextResponse.json({ error: 'Tutar ve yöntem zorunlu' }, { status: 400 })

  const service = createServiceClient()

  const { data: entry } = await service
    .from('stock_entries')
    .select('tenant_id, total_amount, paid_amount')
    .eq('id', id)
    .single()

  if (!entry || entry.tenant_id !== tenantId) {
    return NextResponse.json({ error: 'Fatura bulunamadı' }, { status: 404 })
  }

  await service.from('stock_payments').insert({
    tenant_id: tenantId,
    entry_id: id,
    amount: parseFloat(amount),
    method,
    paid_at: paid_at || new Date().toISOString().split('T')[0],
    note: note || null,
  })

  const newPaid  = Math.min(entry.paid_amount + parseFloat(amount), entry.total_amount)
  const newStatus = newPaid >= entry.total_amount ? 'paid'
                  : newPaid > 0 ? 'partial'
                  : 'pending'

  await service.from('stock_entries').update({
    paid_amount: newPaid,
    payment_status: newStatus,
  }).eq('id', id)

  return NextResponse.json({ ok: true, paid_amount: newPaid, payment_status: newStatus })
}
