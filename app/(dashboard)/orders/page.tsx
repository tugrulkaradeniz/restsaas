import { createClient } from '@/lib/supabase/server'
import { OrdersView } from '@/components/orders/OrdersView'

export default async function OrdersPage() {
  const supabase = await createClient()

  const [{ data: orders }, { data: tables }, { data: categories }] = await Promise.all([
    supabase
      .from('orders')
      .select('*, table:tables(id,name), waiter:users(full_name), items:order_items(*, menu_item:menu_items(id,name,price))')
      .not('status', 'in', '("paid","cancelled")')
      .order('created_at', { ascending: false }),
    supabase.from('tables').select('*').order('name'),
    supabase
      .from('menu_categories')
      .select('*, items:menu_items(*)')
      .eq('is_active', true)
      .order('sort_order'),
  ])

  return (
    <OrdersView
      initialOrders={orders ?? []}
      tables={tables ?? []}
      categories={categories ?? []}
    />
  )
}
