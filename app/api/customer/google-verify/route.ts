import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'

export async function POST(req: Request) {
  try {
    const { accessToken, phone, name } = await req.json()
    if (!accessToken || !phone) return NextResponse.json({ error: 'Eksik alan' }, { status: 400 })

    const service = createServiceClient()

    // Google oturumunun gerçekten Supabase Auth tarafından doğrulandığını kontrol et
    // (client'ın "ben Google ile giriş yaptım, emailim şu" iddiasına körü körüne güvenmemek için)
    const { data: { user }, error: authError } = await service.auth.getUser(accessToken)
    if (authError || !user?.email) {
      return NextResponse.json({ error: 'Google doğrulaması geçersiz' }, { status: 401 })
    }

    const token = randomUUID()
    const resolvedName = name || user.user_metadata?.full_name || user.user_metadata?.name || null

    const { error } = await service.from('verified_customers').upsert({
      phone,
      email: user.email,
      name: resolvedName,
      verification_token: token,
      first_verified_at: new Date().toISOString(),
    }, { onConflict: 'phone', ignoreDuplicates: false })

    if (error) {
      // Zaten kayıtlıysa mevcut token'ı döndür
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
