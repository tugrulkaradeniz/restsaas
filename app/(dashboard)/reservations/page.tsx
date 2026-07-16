import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ReservationsManager } from '@/components/reservations/ReservationsManager'
import { ReservationsHelp } from '@/components/help/pages/ReservationsHelp'

export default async function ReservationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const tenantId = user.app_metadata?.tenant_id as string

  const service = createServiceClient()
  const [{ data: reservations }, { data: allTables }, { data: floorPlans }] = await Promise.all([
    service
      .from('reservations')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('date', { ascending: false })
      .order('time', { ascending: true })
      .limit(200),
    service.from('tables').select('*').eq('tenant_id', tenantId).order('name'),
    service.from('floor_plans').select('id, layout').eq('tenant_id', tenantId),
  ])

  // Sadece bir plana eklenmiş masaları göster; plan yoksa tüm masaları göster
  const tableIdsOnPlans = new Set(
    (floorPlans ?? []).flatMap(fp =>
      ((fp.layout as { tables?: { id: string }[] })?.tables ?? []).map(t => t.id)
    )
  )
  const tables = (floorPlans ?? []).length > 0
    ? (allTables ?? []).filter(t => tableIdsOnPlans.has(t.id))
    : (allTables ?? [])

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-4 border-b bg-white flex items-center gap-2">
        <h1 className="text-2xl font-bold text-gray-900">Rezervasyonlar</h1>
        <ReservationsHelp />
      </div>
      <div className="flex-1 overflow-hidden">
        <ReservationsManager
          tenantId={tenantId}
          initialReservations={reservations ?? []}
          tables={tables ?? []}
        />
      </div>
    </div>
  )
}
