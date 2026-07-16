import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { FloorPlanEditor } from '@/components/tables/FloorPlanEditor'
import { QrCodesButton } from '@/components/tables/QrCodesButton'
import { TablesHelp } from '@/components/help/pages/TablesHelp'

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

  // Sadece bir floor plan'da yer alan masaların QR kodlarını göster
  const tableIdsInPlans = new Set(
    (floorPlans ?? []).flatMap(fp => (fp.layout?.tables ?? []).map((t: { id: string }) => t.id))
  )
  const qrTables = tableIdsInPlans.size > 0
    ? (tables ?? []).filter(t => tableIdsInPlans.has(t.id))
    : (tables ?? [])

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-gray-900">Masa Planı</h1>
          <TablesHelp />
        </div>
        <QrCodesButton tables={qrTables} />
      </div>
      <FloorPlanEditor
        tenantId={tenantId}
        initialFloorPlans={floorPlans ?? []}
        tables={tables ?? []}
        todayReservations={reservations ?? []}
      />
    </div>
  )
}
