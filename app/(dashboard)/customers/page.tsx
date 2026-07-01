import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { CustomersManager } from '@/components/customers/CustomersManager'

export default async function CustomersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const tenantId = user.app_metadata?.tenant_id as string
  const service = createServiceClient()

  const [{ data: customers }, { data: tenant }] = await Promise.all([
    service
      .from('customers')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('full_name'),
    service.from('tenants').select('loyalty_redeem_rate').eq('id', tenantId).single(),
  ])

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Müşteri & Sadakat</h1>
      <CustomersManager
        tenantId={tenantId}
        initialCustomers={customers ?? []}
        loyaltyRate={tenant?.loyalty_redeem_rate ?? 0.1}
      />
    </div>
  )
}
