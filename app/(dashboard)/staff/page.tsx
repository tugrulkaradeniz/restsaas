import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { StaffManager } from '@/components/staff/StaffManager'

export default async function StaffPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const tenantId = user.app_metadata?.tenant_id as string | undefined
  if (!tenantId) redirect('/dashboard')

  const service = createServiceClient()
  const { data: staff } = await service
    .from('users')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at')

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Personel Yönetimi</h1>
      <StaffManager initialStaff={staff ?? []} currentUserId={user.id} />
    </div>
  )
}
