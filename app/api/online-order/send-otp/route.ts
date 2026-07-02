import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { sendOtpEmail } from '@/lib/email'

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function POST(req: Request) {
  try {
    const { email } = await req.json()
    if (!email) return NextResponse.json({ error: 'Email zorunlu' }, { status: 400 })

    const code = generateCode()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

    const service = createServiceClient()
    const { data, error } = await service
      .from('order_otps')
      .insert({ email, code, expires_at: expiresAt })
      .select('id')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Email gönder
    try {
      await sendOtpEmail(email, code, 'RestSaas')
    } catch {
      // Dev ortamında email yoksa konsola yaz
      console.log(`[DEV] OTP for ${email}: ${code}`)
    }

    return NextResponse.json({ otpId: data.id })
  } catch {
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}
