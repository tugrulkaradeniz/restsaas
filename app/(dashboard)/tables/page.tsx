import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { FloorPlanEditor } from '@/components/tables/FloorPlanEditor'

export default async function TablesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const tenantId = user.app_metadata?.tenant_id as string

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
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Masa Planı</h1>
      <FloorPlanEditor
        tenantId={tenantId}
        initialFloorPlans={floorPlans ?? []}
        tables={tables ?? []}
        todayReservations={reservations ?? []}
      />
    </div>
  )
}
