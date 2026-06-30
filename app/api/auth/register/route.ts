import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

function toAscii(str: string) {
  return str
    .replace(/ğ/gi, 'g').replace(/ü/gi, 'u').replace(/ş/gi, 's')
    .replace(/ı/gi, 'i').replace(/İ/g, 'i').replace(/ö/gi, 'o').replace(/ç/gi, 'c')
}

async function generateCode(name: string, supabase: Awaited<ReturnType<typeof createServiceClient>>): Promise<string> {
  const base = toAscii(name)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 8)
    .padEnd(8, '0')

  // Benzersiz olana kadar dene
  for (let i = 0; i < 10; i++) {
    const candidate = i === 0 ? base : (base.slice(0, 6) + String(i).padStart(2, '0'))
    const { data } = await supabase.from('tenants').select('id').eq('code', candidate).single()
    if (!data) return candidate
  }

  // Son çare: random suffix
  return base.slice(0, 5) + Math.random().toString(36).slice(2, 5).toUpperCase()
}

export async function POST(req: NextRequest) {
  const { email, password, fullName, restaurantName } = await req.json()

  if (!email || !password || !fullName || !restaurantName) {
    return NextResponse.json({ error: 'Tüm alanlar zorunludur.' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const slug = toAscii(restaurantName)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  const { data: existing } = await supabase.from('tenants').select('id').eq('slug', slug).single()
  if (existing) {
    return NextResponse.json({ error: 'Bu restoran adı zaten kullanılıyor.' }, { status: 409 })
  }

  const code = await generateCode(restaurantName, supabase)

  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .insert({ name: restaurantName, slug, code })
    .select('id, code')
    .single()

  if (tenantError || !tenant) {
    return NextResponse.json({ error: 'Restoran oluşturulamadı.' }, { status: 500 })
  }

  const { data: newUser, error: userError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { tenant_id: tenant.id, role: 'owner' },
    user_metadata: { full_name: fullName },
  })

  if (userError || !newUser?.user) {
    await supabase.from('tenants').delete().eq('id', tenant.id)
    return NextResponse.json({ error: userError?.message ?? 'Kullanıcı oluşturulamadı.' }, { status: 400 })
  }

  // Trigger'a güvenmek yerine public.users satırını garantile
  await supabase.from('users').upsert({
    id: newUser.user.id,
    tenant_id: tenant.id,
    email,
    role: 'owner',
    full_name: fullName,
  }, { onConflict: 'id' })

  return NextResponse.json({ ok: true, code: tenant.code })
}
