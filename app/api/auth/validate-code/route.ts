import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const { code } = await req.json()
  if (!code) return NextResponse.json({ error: 'Kod gerekli.' }, { status: 400 })

  const supabase = createServiceClient()
  const { data } = await supabase
    .from('tenants')
    .select('id, name')
    .eq('code', code.trim().toUpperCase())
    .single()

  if (!data) return NextResponse.json({ error: 'Restoran kodu bulunamadı.' }, { status: 404 })

  return NextResponse.json({ tenantId: data.id, tenantName: data.name })
}
