import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { ExpensesManager } from '@/components/expenses/ExpensesManager'

export default async function ExpensesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const tenantId = user.app_metadata?.tenant_id as string
  const service = createServiceClient()

  const { data: expenses } = await service
    .from('expenses')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('date', { ascending: false })
    .limit(500)

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Gider Takibi</h1>
      <ExpensesManager tenantId={tenantId} initialExpenses={expenses ?? []} />
    </div>
  )
}
