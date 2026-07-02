import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { phone, token } = await req.json()
    if (!phone || !token) return NextResponse.json({ verified: false }, { status: 400 })

    const service = createServiceClient()
    const { data } = await service
      .from('verified_customers')
      .select('id')
      .eq('phone', phone)
      .eq('verification_token', token)
      .single()

    if (!data) return NextResponse.json({ verified: false }, { status: 401 })
    return NextResponse.json({ verified: true })
  } catch {
    return NextResponse.json({ verified: false }, { status: 500 })
  }
}
