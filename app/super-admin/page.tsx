import { createServiceClient } from '@/lib/supabase/server'
import { Building2, Users, TrendingUp, Star } from 'lucide-react'
import Link from 'next/link'

export default async function SuperAdminOverviewPage() {
  const supabase = createServiceClient()

  const [
    { count: totalTenants },
    { count: totalUsers },
    { data: allTenants },
    { data: recentTenants },
  ] = await Promise.all([
    supabase.from('tenants').select('*', { count: 'exact', head: true }),
    supabase.from('users').select('*', { count: 'exact', head: true }),
    supabase.from('tenants').select('plan'),
    supabase.from('tenants').select('id, name, slug, plan, created_at').order('created_at', { ascending: false }).limit(8),
  ])

  const planBreakdown = {
    starter:    allTenants?.filter((t) => t.plan === 'starter').length    ?? 0,
    pro:        allTenants?.filter((t) => t.plan === 'pro').length        ?? 0,
    enterprise: allTenants?.filter((t) => t.plan === 'enterprise').length ?? 0,
  }

  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)
  const newThisMonth = allTenants?.filter((t) =>
    new Date((t as { plan: string; created_at?: string }).created_at ?? '') >= monthStart
  ).length ?? 0

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Genel Bakış</h1>
        <p className="text-sm text-gray-500 mt-0.5">Platform geneli istatistikler</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={<Building2 size={20} className="text-orange-500" />} label="Toplam Restoran" value={totalTenants ?? 0} />
        <StatCard icon={<Users size={20} className="text-blue-500" />}       label="Toplam Kullanıcı" value={totalUsers ?? 0} />
        <StatCard icon={<TrendingUp size={20} className="text-green-500" />} label="Bu Ay Yeni"      value={newThisMonth} />
        <StatCard icon={<Star size={20} className="text-purple-500" />}      label="Pro / Enterprise" value={planBreakdown.pro + planBreakdown.enterprise} />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Plan Dağılımı</h2>
        <div className="flex gap-6">
          <PlanBadge label="Starter"    count={planBreakdown.starter}    color="gray" />
          <PlanBadge label="Pro"        count={planBreakdown.pro}        color="orange" />
          <PlanBadge label="Enterprise" count={planBreakdown.enterprise} color="purple" />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">Son Kayıtlar</h2>
          <Link href="/super-admin/tenants" className="text-xs text-orange-500 hover:underline">Tümünü gör →</Link>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left text-xs text-gray-500">
              <th className="px-5 py-3 font-medium">Restoran</th>
              <th className="px-5 py-3 font-medium">Slug</th>
              <th className="px-5 py-3 font-medium">Plan</th>
              <th className="px-5 py-3 font-medium">Kayıt Tarihi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {recentTenants?.map((t) => (
              <tr key={t.id} className="hover:bg-gray-50">
                <td className="px-5 py-3 font-medium text-gray-900">
                  <Link href={`/super-admin/tenants/${t.id}`} className="hover:text-orange-500 transition-colors">
                    {t.name}
                  </Link>
                </td>
                <td className="px-5 py-3 text-gray-500">{t.slug}</td>
                <td className="px-5 py-3"><PlanPill plan={t.plan} /></td>
                <td className="px-5 py-3 text-gray-500">{new Date(t.created_at).toLocaleDateString('tr-TR')}</td>
              </tr>
            ))}
            {!recentTenants?.length && (
              <tr><td colSpan={4} className="px-5 py-8 text-center text-gray-400 text-sm">Henüz restoran yok</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
      <div className="p-2.5 bg-gray-50 rounded-lg">{icon}</div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500 mt-0.5">{label}</p>
      </div>
    </div>
  )
}

function PlanBadge({ label, count, color }: { label: string; count: number; color: 'gray' | 'orange' | 'purple' }) {
  const colors = { gray: 'bg-gray-100 text-gray-700', orange: 'bg-orange-100 text-orange-700', purple: 'bg-purple-100 text-purple-700' }
  return (
    <div className="flex items-center gap-2">
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${colors[color]}`}>{label}</span>
      <span className="text-2xl font-bold text-gray-900">{count}</span>
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
