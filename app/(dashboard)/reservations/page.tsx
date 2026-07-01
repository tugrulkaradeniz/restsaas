import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ReservationsManager } from '@/components/reservations/ReservationsManager'

export default async function ReservationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const tenantId = user.app_metadata?.tenant_id as string

  const service = createServiceClient()
  const [{ data: reservations }, { data: tables }] = await Promise.all([
    service
      .from('reservations')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('date', { ascending: false })
      .order('time', { ascending: true })
      .limit(200),
    service
      .from('tables')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('name'),
  ])

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-4 border-b bg-white">
        <h1 className="text-2xl font-bold text-gray-900">Rezervasyonlar</h1>
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
