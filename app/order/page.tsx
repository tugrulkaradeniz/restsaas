import { createServiceClient } from '@/lib/supabase/server'
import { MarketplacePage } from '@/components/order/MarketplacePage'
import { unstable_noStore as noStore } from 'next/cache'

export const dynamic = 'force-dynamic'

export default async function OrderPage() {
  noStore()
  const service = createServiceClient()

  const [{ data: cuisineTypes }, { data: restaurants }] = await Promise.all([
    service.from('cuisine_types').select('*').eq('is_active', true).order('sort_order'),
    service
      .from('tenants')
      .select('id, slug, name, logo_url, address, cuisine_type_ids, lat, lng, online_order_hours')
      .eq('online_ordering_enabled', true),
  ])

  return (
    <MarketplacePage
      cuisineTypes={cuisineTypes ?? []}
      restaurants={restaurants ?? []}
    />
  )
}
