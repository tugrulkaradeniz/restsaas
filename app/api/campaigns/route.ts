import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Yetki yok' }, { status: 401 })

  const service = createServiceClient()
  const tenantId = user.app_metadata?.tenant_id as string
  const { data, error } = await service
    .from('campaigns')
    .select('*, items:campaign_items(*, menu_item:menu_items(id,name,price), category:menu_categories(id,name))')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ campaigns: data })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Yetki yok' }, { status: 401 })

  const tenantId = user.app_metadata?.tenant_id as string
  if (!tenantId) return NextResponse.json({ error: 'Tenant bulunamadı' }, { status: 403 })

  const body = await req.json()
  const { items, ...campaignData } = body

  const service = createServiceClient()

  const { data: campaign, error } = await service
    .from('campaigns')
    .insert({ ...campaignData, tenant_id: tenantId })
    .select()
    .single()

  if (error || !campaign) return NextResponse.json({ error: error?.message ?? 'Oluşturulamadı' }, { status: 400 })

  if (items && items.length > 0) {
    await service.from('campaign_items').insert(
      items.map((it: object) => ({ ...it, campaign_id: campaign.id }))
    )
  }

  const { data: full } = await service
    .from('campaigns')
    .select('*, items:campaign_items(*, menu_item:menu_items(id,name,price), category:menu_categories(id,name))')
    .eq('id', campaign.id)
    .single()

  return NextResponse.json({ campaign: full })
}
