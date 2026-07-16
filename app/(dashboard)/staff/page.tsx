import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { StaffManager } from '@/components/staff/StaffManager'
import { StaffHelp } from '@/components/help/pages/StaffHelp'

export default async function StaffPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const tenantId = user.app_metadata?.tenant_id as string | undefined
  if (!tenantId) redirect('/dashboard')

  const service = createServiceClient()
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const [{ data: staff }, { data: sessions }] = await Promise.all([
    service.from('users').select('*').eq('tenant_id', tenantId).order('created_at'),
    service
      .from('staff_sessions')
      .select('user_id, active_seconds, away_seconds, away_count, last_sync, session_end')
      .eq('tenant_id', tenantId)
      .gte('created_at', todayStart.toISOString()),
  ])

  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Personel Yönetimi</h1>
        <StaffHelp />
      </div>
      <StaffManager
        initialStaff={staff ?? []}
        currentUserId={user.id}
        todaySessions={sessions ?? []}
      />
    </div>
  )
}
