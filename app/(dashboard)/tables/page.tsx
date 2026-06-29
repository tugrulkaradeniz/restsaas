import { createClient } from '@/lib/supabase/server'
import { FloorPlanEditor } from '@/components/tables/FloorPlanEditor'

export default async function TablesPage() {
  const supabase = await createClient()

  const [{ data: floorPlans }, { data: tables }, { data: reservations }] = await Promise.all([
    supabase.from('floor_plans').select('*').order('name'),
    supabase.from('tables').select('*, orders(id,status)').order('name'),
    supabase
      .from('reservations')
      .select('*')
      .eq('status', 'confirmed')
      .eq('date', new Date().toISOString().split('T')[0]),
  ])

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Masa Planı</h1>
      </div>
      <FloorPlanEditor
        initialFloorPlans={floorPlans ?? []}
        tables={tables ?? []}
        todayReservations={reservations ?? []}
      />
    </div>
  )
}
