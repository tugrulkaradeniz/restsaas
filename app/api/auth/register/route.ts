import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const { email, password, fullName, restaurantName } = await req.json()

  if (!email || !password || !fullName || !restaurantName) {
    return NextResponse.json({ error: 'Tüm alanlar zorunludur.' }, { status: 400 })
  }

  const supabase = await createServiceClient()

  // Slug oluştur: "Lezzet Durağı" → "lezzet-duragi"
  const slug = restaurantName
    .toLowerCase()
    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
    .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  // Slug benzersiz mi?
  const { data: existing } = await supabase
    .from('tenants')
    .select('id')
    .eq('slug', slug)
    .single()

  if (existing) {
    return NextResponse.json({ error: 'Bu restoran adı zaten kullanılıyor.' }, { status: 409 })
  }

  // Tenant oluştur
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .insert({ name: restaurantName, slug })
    .select('id')
    .single()

  if (tenantError || !tenant) {
    return NextResponse.json({ error: 'Restoran oluşturulamadı.' }, { status: 500 })
  }

  // Auth kullanıcısı oluştur (trigger public.users'a ekler)
  const { error: userError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { tenant_id: tenant.id, role: 'owner' },
    user_metadata: { full_name: fullName },
  })

  if (userError) {
    // Tenant'ı geri sil
    await supabase.from('tenants').delete().eq('id', tenant.id)
    return NextResponse.json({ error: userError.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
