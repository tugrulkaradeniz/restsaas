import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { UserRole } from '@/types/database'

const ALLOWED_ROLES: UserRole[] = ['manager', 'cashier', 'waiter', 'kitchen']

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Yetki yok' }, { status: 401 })

  const tenantId = user.app_metadata?.tenant_id
  const callerRole = user.app_metadata?.role

  if (!tenantId || callerRole !== 'owner') {
    return NextResponse.json({ error: 'Sadece sahipler personel ekleyebilir' }, { status: 403 })
  }

  const { email, password, full_name, role } = await req.json()

  if (!email || !password || !full_name || !role) {
    return NextResponse.json({ error: 'Tüm alanlar zorunlu' }, { status: 400 })
  }

  if (!ALLOWED_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Geçersiz rol' }, { status: 400 })
  }

  const service = createServiceClient()
  const { data, error } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { tenant_id: tenantId, role },
    user_metadata: { full_name },
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ ok: true, userId: data.user.id })
}
