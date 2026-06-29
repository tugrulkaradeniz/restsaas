import { createClient } from '@/lib/supabase/server'
import { MenuManager } from '@/components/menu/MenuManager'

export default async function MenuPage() {
  const supabase = await createClient()

  const [{ data: categories }, { data: items }] = await Promise.all([
    supabase.from('menu_categories').select('*').order('sort_order'),
    supabase
      .from('menu_items')
      .select('*, allergens:menu_item_allergens(*), category:menu_categories(name)')
      .order('name'),
  ])

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Menü Yönetimi</h1>
      <MenuManager initialCategories={categories ?? []} initialItems={items ?? []} />
    </div>
  )
}
