import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { phone, token, id, label, address, isDefault } = await req.json()
    if (!phone || !token || !id) return NextResponse.json({ error: 'Eksik alan' }, { status: 400 })

    const service = createServiceClient()
    const { data: vc } = await service
      .from('verified_customers')
      .select('id')
      .eq('phone', phone)
      .eq('verification_token', token)
      .single()

    if (!vc) return NextResponse.json({ error: 'Doğrulama geçersiz' }, { status: 401 })

    // Adresin gerçekten bu müşteriye ait olduğunu doğrula
    const { data: existing } = await service
      .from('customer_addresses')
      .select('id')
      .eq('id', id)
      .eq('verified_customer_id', vc.id)
      .single()
    if (!existing) return NextResponse.json({ error: 'Adres bulunamadı' }, { status: 404 })

    if (isDefault) {
      await service.from('customer_addresses').update({ is_default: false }).eq('verified_customer_id', vc.id)
    }

    const { error } = await service.from('customer_addresses').update({
      ...(label !== undefined ? { label: label.trim() || 'Adres' } : {}),
      ...(address !== undefined ? { address: address.trim() } : {}),
      ...(isDefault !== undefined ? { is_default: !!isDefault } : {}),
    }).eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}
