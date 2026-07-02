import { createServiceClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { RestaurantOrderPage } from '@/components/order/RestaurantOrderPage'

export const dynamic = 'force-dynamic'

interface Props { params: Promise<{ slug: string }> }

export default async function OrderSlugPage({ params }: Props) {
  const { slug } = await params
  const service = createServiceClient()

  const { data: tenant } = await service
    .from('tenants')
    .select('id, slug, name, logo_url, address, phone, lat, lng, online_order_hours, cuisine_type_ids, online_ordering_enabled')
    .eq('slug', slug)
    .single()

  if (!tenant || !tenant.online_ordering_enabled) notFound()

  const [{ data: categories }, { data: items }, { data: zones }] = await Promise.all([
    service.from('menu_categories').select('*').eq('tenant_id', tenant.id).eq('is_active', true).order('sort_order'),
    service.from('menu_items')
      .select('*, option_groups:item_option_groups(*, options:item_options(*))')
      .eq('tenant_id', tenant.id)
      .eq('is_available', true)
      .eq('is_visible_selfservis', true)
      .order('name'),
    service.from('delivery_zones').select('*').eq('tenant_id', tenant.id).eq('is_active', true).order('sort_order'),
  ])

  return (
    <RestaurantOrderPage
      tenant={tenant}
      categories={categories ?? []}
      items={items ?? []}
      zones={zones ?? []}
    />
  )
}
