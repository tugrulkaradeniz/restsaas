import { createClient } from '@/lib/supabase/server'
import { KitchenDisplay } from '@/components/kitchen/KitchenDisplay'

export default async function KitchenPage() {
  const supabase = await createClient()

  const { data: orders } = await supabase
    .from('orders')
    .select('*, table:tables(name), items:order_items(*, menu_item:menu_items(name))')
    .in('status', ['confirmed', 'preparing'])
    .order('created_at', { ascending: true })

  return <KitchenDisplay initialOrders={orders ?? []} />
}
