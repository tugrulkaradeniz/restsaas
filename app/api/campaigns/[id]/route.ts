import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

async function getCallerTenant() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  return { user, tenantId: user.app_metadata?.tenant_id as string }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const caller = await getCallerTenant()
  if (!caller) return NextResponse.json({ error: 'Yetki yok' }, { status: 401 })

  const body = await req.json()
  const { items, ...campaignData } = body

  const service = createServiceClient()

  // Tenant kontrolü
  const { data: existing } = await service.from('campaigns').select('tenant_id').eq('id', id).single()
  if (!existing || existing.tenant_id !== caller.tenantId)
    return NextResponse.json({ error: 'Bulunamadı' }, { status: 404 })

  const { error } = await service.from('campaigns').update(campaignData).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  if (items !== undefined) {
    await service.from('campaign_items').delete().eq('campaign_id', id)
    if (items.length > 0) {
      await service.from('campaign_items').insert(
        items.map((it: object) => ({ ...it, campaign_id: id }))
      )
    }
  }

  const { data: full } = await service
    .from('campaigns')
    .select('*, items:campaign_items(*, menu_item:menu_items(id,name,price), category:menu_categories(id,name))')
    .eq('id', id)
    .single()

  return NextResponse.json({ campaign: full })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const caller = await getCallerTenant()
  if (!caller) return NextResponse.json({ error: 'Yetki yok' }, { status: 401 })

  const service = createServiceClient()
  const { data: existing } = await service.from('campaigns').select('tenant_id').eq('id', id).single()
  if (!existing || existing.tenant_id !== caller.tenantId)
    return NextResponse.json({ error: 'Bulunamadı' }, { status: 404 })

  await service.from('campaigns').delete().eq('id', id)
  return NextResponse.json({ ok: true })
}
