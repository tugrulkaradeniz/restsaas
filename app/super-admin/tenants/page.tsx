import { createServiceClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Building2 } from 'lucide-react'

export default async function TenantsPage() {
  const supabase = await createServiceClient()

  const { data: tenants } = await supabase
    .from('tenants')
    .select('*, users(count)')
    .order('created_at', { ascending: false })

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Restoranlar</h1>
        <p className="text-sm text-gray-500 mt-0.5">{tenants?.length ?? 0} kayıtlı restoran</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr className="text-left text-xs text-gray-500">
              <th className="px-5 py-3 font-medium">Restoran</th>
              <th className="px-5 py-3 font-medium">Slug</th>
              <th className="px-5 py-3 font-medium">Plan</th>
              <th className="px-5 py-3 font-medium">Kullanıcı</th>
              <th className="px-5 py-3 font-medium">Trial Bitiş</th>
              <th className="px-5 py-3 font-medium">Kayıt</th>
              <th className="px-5 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {tenants?.map((t) => {
              const userCount = (t.users as unknown as { count: number }[])?.[0]?.count ?? 0
              const trialEnds = t.trial_ends_at ? new Date(t.trial_ends_at) : null
              const trialExpired = trialEnds && trialEnds < new Date()
              return (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-900 flex items-center gap-2">
                    <Building2 size={15} className="text-gray-400 shrink-0" />
                    {t.name}
                  </td>
                  <td className="px-5 py-3 text-gray-500">{t.slug}</td>
                  <td className="px-5 py-3"><PlanPill plan={t.plan} /></td>
                  <td className="px-5 py-3 text-gray-700">{userCount}</td>
                  <td className="px-5 py-3">
                    {trialEnds ? (
                      <span className={trialExpired ? 'text-red-500' : 'text-green-600'}>
                        {trialEnds.toLocaleDateString('tr-TR')}
                      </span>
                    ) : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-5 py-3 text-gray-500">{new Date(t.created_at).toLocaleDateString('tr-TR')}</td>
                  <td className="px-5 py-3">
                    <Link href={`/super-admin/tenants/${t.id}`} className="text-orange-500 hover:underline text-xs font-medium">
                      Detay →
                    </Link>
                  </td>
                </tr>
              )
            })}
            {!tenants?.length && (
              <tr><td colSpan={7} className="px-5 py-12 text-center text-gray-400">Henüz restoran yok</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function PlanPill({ plan }: { plan: string }) {
  const styles: Record<string, string> = {
    starter:    'bg-gray-100 text-gray-700',
    pro:        'bg-orange-100 text-orange-700',
    enterprise: 'bg-purple-100 text-purple-700',
  }
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[plan] ?? 'bg-gray-100 text-gray-700'}`}>{plan}</span>
}
