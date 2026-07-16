import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SettingsForm } from '@/components/settings/SettingsForm'
import { PrintSettingsForm } from '@/components/settings/PrintSettingsForm'
import { OnlineOrderSettings } from '@/components/settings/OnlineOrderSettings'
import { BusinessSettingsHelp, PrintSettingsHelp, OnlineOrderSettingsHelp } from '@/components/help/pages/SettingsHelp'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const tenantId = user.app_metadata?.tenant_id as string
  const service = createServiceClient()

  const [{ data: tenant }, { data: cuisineTypes }, { data: zones }] = await Promise.all([
    service.from('tenants').select('*').eq('id', tenantId).single(),
    service.from('cuisine_types').select('*').eq('is_active', true).order('sort_order'),
    service.from('delivery_zones').select('*').eq('tenant_id', tenantId).order('sort_order'),
  ])

  return (
    <div className="p-6 max-w-3xl space-y-10">
      <div>
        <div className="flex items-center gap-2 mb-6">
          <h1 className="text-2xl font-bold text-gray-900">İşletme Ayarları</h1>
          <BusinessSettingsHelp />
        </div>
        <SettingsForm tenant={tenant ?? null} />
      </div>
      <div>
        <div className="flex items-center gap-2 mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Baskı & Yazıcı</h1>
          <PrintSettingsHelp />
        </div>
        <PrintSettingsForm />
      </div>
      {tenant && (
        <div>
          <div className="flex items-center gap-2 mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Online Sipariş</h1>
            <OnlineOrderSettingsHelp />
          </div>
          <OnlineOrderSettings
            tenant={tenant}
            cuisineTypes={cuisineTypes ?? []}
            initialZones={zones ?? []}
          />
        </div>
      )}
    </div>
  )
}
