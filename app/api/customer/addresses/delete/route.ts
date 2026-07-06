import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { phone, token, id } = await req.json()
    if (!phone || !token || !id) return NextResponse.json({ error: 'Eksik alan' }, { status: 400 })

    const service = createServiceClient()
    const { data: vc } = await service
      .from('verified_customers')
      .select('id')
      .eq('phone', phone)
      .eq('verification_token', token)
      .single()

    if (!vc) return NextResponse.json({ error: 'Doğrulama geçersiz' }, { status: 401 })

    await service.from('customer_addresses').delete().eq('id', id).eq('verified_customer_id', vc.id)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}
