import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { OrdersView } from '@/components/orders/OrdersView'

export default async function OrdersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const tenantId = user.app_metadata?.tenant_id as string

  const [{ data: orders }, { data: tables }, { data: categories }] = await Promise.all([
    supabase
      .from('orders')
      .select('*, table:tables(id,name), waiter:users(full_name), items:order_items(*, menu_item:menu_items(id,name,price))')
      .order('created_at', { ascending: false })
      .limit(50),
    supabase.from('tables').select('*').order('name'),
    supabase
      .from('menu_categories')
      .select('*, items:menu_items(*)')
      .eq('is_active', true)
      .order('sort_order'),
  ])

  return (
    <OrdersView
      tenantId={tenantId}
      initialOrders={orders ?? []}
      tables={tables ?? []}
      categories={categories ?? []}
    />
  )
}
