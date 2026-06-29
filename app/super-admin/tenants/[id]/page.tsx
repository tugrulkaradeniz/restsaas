import { createServiceClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { PlanChangeForm } from './PlanChangeForm'

export default async function TenantDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createServiceClient()

  const [{ data: tenant }, { data: users }] = await Promise.all([
    supabase.from('tenants').select('*').eq('id', params.id).single(),
    supabase.from('users').select('id, email, full_name, role, created_at').eq('tenant_id', params.id).order('created_at'),
  ])

  if (!tenant) notFound()

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/super-admin/tenants" className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500 transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{tenant.name}</h1>
          <p className="text-sm text-gray-500">{tenant.slug}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Bilgiler */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700 border-b border-gray-100 pb-2">Restoran Bilgileri</h2>
          <InfoRow label="ID"           value={tenant.id} mono />
          <InfoRow label="Plan"         value={tenant.plan} />
          <InfoRow label="Sadakat"      value={tenant.loyalty_enabled ? 'Aktif' : 'Pasif'} />
          <InfoRow label="Kayıt Tarihi" value={new Date(tenant.created_at).toLocaleDateString('tr-TR')} />
          {tenant.trial_ends_at && (
            <InfoRow label="Trial Bitiş" value={new Date(tenant.trial_ends_at).toLocaleDateString('tr-TR')} />
          )}
          {tenant.stripe_customer_id && (
            <InfoRow label="Stripe ID" value={tenant.stripe_customer_id} mono />
          )}
        </div>

        {/* Plan değiştir */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 border-b border-gray-100 pb-2 mb-4">Plan Değiştir</h2>
          <PlanChangeForm tenantId={tenant.id} currentPlan={tenant.plan} />
        </div>
      </div>

      {/* Kullanıcılar */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Kullanıcılar ({users?.length ?? 0})</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left text-xs text-gray-500">
              <th className="px-5 py-3 font-medium">Ad Soyad</th>
              <th className="px-5 py-3 font-medium">E-posta</th>
              <th className="px-5 py-3 font-medium">Rol</th>
              <th className="px-5 py-3 font-medium">Kayıt</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users?.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-5 py-3 font-medium text-gray-900">{u.full_name}</td>
                <td className="px-5 py-3 text-gray-500">{u.email}</td>
                <td className="px-5 py-3"><RolePill role={u.role} /></td>
                <td className="px-5 py-3 text-gray-500">{new Date(u.created_at).toLocaleDateString('tr-TR')}</td>
              </tr>
            ))}
            {!users?.length && (
              <tr><td colSpan={4} className="px-5 py-8 text-center text-gray-400">Kullanıcı yok</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="text-gray-500 shrink-0">{label}</span>
      <span className={`text-gray-900 text-right break-all ${mono ? 'font-mono text-xs' : ''}`}>{value}</span>
    </div>
  )
}

function RolePill({ role }: { role: string }) {
  const styles: Record<string, string> = {
    owner:       'bg-orange-100 text-orange-700',
    manager:     'bg-blue-100 text-blue-700',
    cashier:     'bg-green-100 text-green-700',
    waiter:      'bg-gray-100 text-gray-700',
    kitchen:     'bg-yellow-100 text-yellow-700',
    super_admin: 'bg-purple-100 text-purple-700',
  }
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[role] ?? 'bg-gray-100 text-gray-700'}`}>{role}</span>
}
