import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { phone, token } = await req.json()
    if (!phone || !token) return NextResponse.json({ error: 'Eksik alan' }, { status: 400 })

    const service = createServiceClient()
    const { data: vc } = await service
      .from('verified_customers')
      .select('id')
      .eq('phone', phone)
      .eq('verification_token', token)
      .single()

    if (!vc) return NextResponse.json({ error: 'Doğrulama geçersiz' }, { status: 401 })

    const { data: orders, error } = await service
      .from('orders')
      .select('id, created_at, status, total_amount, delivery_fee, delivery_type, payment_method, tenant:tenants(name, slug), items:order_items(id, quantity, unit_price, note, menu_item:menu_items(name))')
      .eq('verified_customer_id', vc.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ orders: orders ?? [] })
  } catch {
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}
