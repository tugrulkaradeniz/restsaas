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

    const { data: addresses, error } = await service
      .from('customer_addresses')
      .select('*')
      .eq('verified_customer_id', vc.id)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ addresses: addresses ?? [] })
  } catch {
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}
