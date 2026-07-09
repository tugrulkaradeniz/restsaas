import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { StockManager } from '@/components/stock/StockManager'

export default async function StockPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const tenantId = user.app_metadata?.tenant_id as string | undefined
  if (!tenantId) redirect('/dashboard')

  const service = createServiceClient()
  const [
    { data: ingredients },
    { data: suppliers },
    { data: entries },
    { data: movements },
  ] = await Promise.all([
    service.from('ingredients').select('*').eq('tenant_id', tenantId).order('name'),
    service.from('suppliers').select('*').eq('tenant_id', tenantId).order('name'),
    service.from('stock_entries')
      .select('*, supplier:suppliers(name), items:stock_entry_items(*, ingredient:ingredients(name,unit))')
      .eq('tenant_id', tenantId)
      .order('invoice_date', { ascending: false })
      .limit(100),
    service.from('stock_movements')
      .select('*, ingredient:ingredients(name,unit)')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(200),
  ])

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Stok & Muhasebe</h1>
      <StockManager
        initialIngredients={ingredients ?? []}
        initialSuppliers={suppliers ?? []}
        initialEntries={entries ?? []}
        initialMovements={movements ?? []}
        tenantId={tenantId}
      />
    </div>
  )
}
