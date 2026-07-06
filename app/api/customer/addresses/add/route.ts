import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { phone, token, label, address, lat, lng, isDefault } = await req.json()
    if (!phone || !token || !address?.trim()) return NextResponse.json({ error: 'Eksik alan' }, { status: 400 })

    const service = createServiceClient()
    const { data: vc } = await service
      .from('verified_customers')
      .select('id')
      .eq('phone', phone)
      .eq('verification_token', token)
      .single()

    if (!vc) return NextResponse.json({ error: 'Doğrulama geçersiz' }, { status: 401 })

    if (isDefault) {
      await service.from('customer_addresses').update({ is_default: false }).eq('verified_customer_id', vc.id)
    }

    const { data, error } = await service.from('customer_addresses').insert({
      verified_customer_id: vc.id,
      label: label?.trim() || 'Adres',
      address: address.trim(),
      lat: lat ?? null,
      lng: lng ?? null,
      is_default: !!isDefault,
    }).select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ address: data })
  } catch {
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}
