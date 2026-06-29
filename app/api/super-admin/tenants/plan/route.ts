import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function PATCH(req: NextRequest) {
  // Sadece super_admin çağırabilir
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.role !== 'super_admin') {
    return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 403 })
  }

  const { tenantId, plan } = await req.json()
  if (!tenantId || !['starter', 'pro', 'enterprise'].includes(plan)) {
    return NextResponse.json({ error: 'Geçersiz istek.' }, { status: 400 })
  }

  const service = await createServiceClient()
  const { error } = await service.from('tenants').update({ plan }).eq('id', tenantId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
