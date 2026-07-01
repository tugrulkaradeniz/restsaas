import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SettingsForm } from '@/components/settings/SettingsForm'
import { PrintSettingsForm } from '@/components/settings/PrintSettingsForm'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const tenantId = user.app_metadata?.tenant_id as string
  const service = createServiceClient()
  const { data: tenant } = await service
    .from('tenants')
    .select('*')
    .eq('id', tenantId)
    .single()

  return (
    <div className="p-6 max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">İşletme Ayarları</h1>
        <SettingsForm tenant={tenant ?? null} />
      </div>
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Baskı & Yazıcı</h1>
        <PrintSettingsForm />
      </div>
    </div>
  )
}
