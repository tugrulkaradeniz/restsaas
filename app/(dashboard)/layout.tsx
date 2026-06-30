import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/Sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Service client kullanıyoruz: RLS'yi bypass eder, JWT içerikleri değil identity önemli
  const service = createServiceClient()
  const { data: profile, error: profileError } = await service
    .from('users')
    .select('*, tenants(*)')
    .eq('id', user.id)
    .single()

  if (!profile) {
    console.error('[Dashboard] Profil bulunamadı:', user.id, profileError?.message)
    redirect('/api/auth/signout')
  }

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      <Sidebar role={profile.role} tenantName={profile.tenants?.name ?? ''} />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
