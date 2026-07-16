import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { MenuManager } from '@/components/menu/MenuManager'
import { MenuHelp } from '@/components/help/pages/MenuHelp'

export default async function MenuPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const tenantId = user.app_metadata?.tenant_id as string
  if (!tenantId) redirect('/api/auth/signout')

  const [{ data: categories }, { data: items }] = await Promise.all([
    supabase.from('menu_categories').select('*').order('sort_order'),
    supabase
      .from('menu_items')
      .select('*, allergens:menu_item_allergens(*), removables:menu_item_removables(*), extras:menu_item_extras(*), category:menu_categories(name)')
      .order('name'),
  ])

  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Menü Yönetimi</h1>
        <MenuHelp />
      </div>
      <MenuManager
        tenantId={tenantId}
        initialCategories={categories ?? []}
        initialItems={items ?? []}
      />
    </div>
  )
}
