import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'

export async function POST(req: Request) {
  try {
    const { otpId, code, phone, email, name } = await req.json()
    if (!otpId || !code || !phone) return NextResponse.json({ error: 'Eksik alan' }, { status: 400 })

    const service = createServiceClient()

    // OTP kontrol
    const { data: otp } = await service
      .from('order_otps')
      .select('*')
      .eq('id', otpId)
      .eq('code', code)
      .eq('verified', false)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (!otp) return NextResponse.json({ error: 'Kod hatalı veya süresi dolmuş' }, { status: 400 })

    // OTP'yi kullanıldı işaretle
    await service.from('order_otps').update({ verified: true }).eq('id', otpId)

    // Token oluştur ve kaydet (upsert)
    const token = randomUUID()
    const { error } = await service.from('verified_customers').upsert({
      phone,
      email: email || null,
      name: name || null,
      verification_token: token,
      first_verified_at: new Date().toISOString(),
    }, { onConflict: 'phone', ignoreDuplicates: false })

    if (error) {
      // Zaten kayıtlıysa token'ı güncelle
      const { data: existing } = await service
        .from('verified_customers')
        .select('verification_token')
        .eq('phone', phone)
        .single()
      return NextResponse.json({ token: existing?.verification_token })
    }

    return NextResponse.json({ token })
  } catch {
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}
