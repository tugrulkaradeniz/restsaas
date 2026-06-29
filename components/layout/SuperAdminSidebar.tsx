'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Building2, Users, LogOut, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

const navItems = [
  { href: '/super-admin',         label: 'Genel Bakış',  icon: <LayoutDashboard size={18} />, exact: true },
  { href: '/super-admin/tenants', label: 'Restoranlar',  icon: <Building2 size={18} />,       exact: false },
  { href: '/super-admin/users',   label: 'Kullanıcılar', icon: <Users size={18} />,           exact: false },
]

export function SuperAdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside className="w-56 flex flex-col bg-gray-900 text-white shrink-0">
      <div className="px-4 py-5 border-b border-gray-700 flex items-center gap-2.5">
        <ShieldCheck size={18} className="text-orange-400 shrink-0" />
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider">Platform</p>
          <p className="font-semibold text-sm">Super Admin</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 space-y-0.5 px-2">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
              (item.exact ? pathname === item.href : pathname.startsWith(item.href))
                ? 'bg-orange-500 text-white'
                : 'text-gray-300 hover:bg-gray-800 hover:text-white'
            )}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="px-2 py-3 border-t border-gray-700">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-gray-800 hover:text-white w-full transition-colors"
        >
          <LogOut size={18} />
          Çıkış Yap
        </button>
      </div>
    </aside>
  )
}
