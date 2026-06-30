import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { UserRole } from '@/types/database'

const ALLOWED_ROLES: UserRole[] = ['manager', 'cashier', 'waiter', 'kitchen']

async function getCallerAndTenant(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return {
    user,
    tenantId: user?.app_metadata?.tenant_id as string | undefined,
    callerRole: user?.app_metadata?.role as string | undefined,
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { user, tenantId, callerRole } = await getCallerAndTenant(req)

  if (!user) return NextResponse.json({ error: 'Yetki yok' }, { status: 401 })
  if (!tenantId || callerRole !== 'owner') {
    return NextResponse.json({ error: 'Yetki yok' }, { status: 403 })
  }
  if (id === user.id) {
    return NextResponse.json({ error: 'Kendi rolünüzü değiştiremezsiniz' }, { status: 400 })
  }

  const { role } = await req.json()
  if (!ALLOWED_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Geçersiz rol' }, { status: 400 })
  }

  const service = createServiceClient()

  const { data: target } = await service.from('users').select('tenant_id').eq('id', id).single()
  if (!target || target.tenant_id !== tenantId) {
    return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 })
  }

  const { data: authData } = await service.auth.admin.getUserById(id)
  await service.auth.admin.updateUserById(id, {
    app_metadata: { ...authData?.user?.app_metadata, role },
  })

  const { error } = await service.from('users').update({ role }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { user, tenantId, callerRole } = await getCallerAndTenant(req)

  if (!user) return NextResponse.json({ error: 'Yetki yok' }, { status: 401 })
  if (!tenantId || callerRole !== 'owner') {
    return NextResponse.json({ error: 'Yetki yok' }, { status: 403 })
  }
  if (id === user.id) {
    return NextResponse.json({ error: 'Kendinizi silemezsiniz' }, { status: 400 })
  }

  const service = createServiceClient()

  const { data: target } = await service.from('users').select('tenant_id, role').eq('id', id).single()
  if (!target || target.tenant_id !== tenantId) {
    return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 })
  }
  if (target.role === 'owner') {
    return NextResponse.json({ error: 'Sahip silinemez' }, { status: 400 })
  }

  const { error } = await service.auth.admin.deleteUser(id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ ok: true })
}
