import { createServiceClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function UsersPage() {
  const supabase = createServiceClient()

  const { data: users } = await supabase
    .from('users')
    .select('id, email, full_name, role, created_at, tenant_id, tenants(name)')
    .order('created_at', { ascending: false })

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Kullanıcılar</h1>
        <p className="text-sm text-gray-500 mt-0.5">{users?.length ?? 0} kayıtlı kullanıcı</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr className="text-left text-xs text-gray-500">
              <th className="px-5 py-3 font-medium">Ad Soyad</th>
              <th className="px-5 py-3 font-medium">E-posta</th>
              <th className="px-5 py-3 font-medium">Rol</th>
              <th className="px-5 py-3 font-medium">Restoran</th>
              <th className="px-5 py-3 font-medium">Kayıt</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users?.map((u) => {
              const tenant = u.tenants as unknown as { name: string } | null
              return (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-900">{u.full_name}</td>
                  <td className="px-5 py-3 text-gray-500">{u.email}</td>
                  <td className="px-5 py-3"><RolePill role={u.role} /></td>
                  <td className="px-5 py-3">
                    {u.tenant_id && tenant ? (
                      <Link href={`/super-admin/tenants/${u.tenant_id}`} className="text-orange-500 hover:underline">
                        {tenant.name}
                      </Link>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-gray-500">{new Date(u.created_at).toLocaleDateString('tr-TR')}</td>
                </tr>
              )
            })}
            {!users?.length && (
              <tr><td colSpan={5} className="px-5 py-12 text-center text-gray-400">Henüz kullanıcı yok</td></tr>
            )}
          </tbody>
        </table>
      </div>
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
