import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CampaignsManager } from '@/components/campaigns/CampaignsManager'

export default async function CampaignsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const tenantId = user.app_metadata?.tenant_id as string
  if (!tenantId) redirect('/api/auth/signout')

  const service = createServiceClient()
  const [{ data: campaigns }, { data: menuItems }, { data: categories }] = await Promise.all([
    service
      .from('campaigns')
      .select('*, items:campaign_items(*, menu_item:menu_items(id,name,price), category:menu_categories(id,name))')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false }),
    service
      .from('menu_items')
      .select('*, category:menu_categories(name)')
      .eq('tenant_id', tenantId)
      .eq('is_available', true)
      .order('name'),
    service
      .from('menu_categories')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('sort_order'),
  ])

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Kampanyalar</h1>
      <CampaignsManager
        initialCampaigns={(campaigns ?? []) as Parameters<typeof CampaignsManager>[0]['initialCampaigns']}
        menuItems={menuItems ?? []}
        categories={categories ?? []}
      />
    </div>
  )
}
