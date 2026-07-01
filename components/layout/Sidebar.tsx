'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutGrid, UtensilsCrossed, ClipboardList, ChefHat,
  BarChart3, Settings, LogOut, Users, Package, Tag,
  CalendarDays, Receipt, TrendingDown, Star
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { UserRole } from '@/types/database'
import { PresenceTimer } from './PresenceTimer'

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
  roles: UserRole[]
}

const navItems: NavItem[] = [
  { href: '/dashboard',   label: 'Genel Bakış',    icon: <BarChart3 size={18} />,     roles: ['super_admin','owner','manager'] },
  { href: '/tables',      label: 'Masa Planı',     icon: <LayoutGrid size={18} />,    roles: ['super_admin','owner','manager','cashier','waiter'] },
  { href: '/orders',      label: 'Siparişler',     icon: <ClipboardList size={18} />, roles: ['super_admin','owner','manager','cashier','waiter'] },
  { href: '/kitchen',     label: 'Mutfak Ekranı',  icon: <ChefHat size={18} />,       roles: ['super_admin','owner','manager','kitchen'] },
  { href: '/menu',        label: 'Menü',           icon: <UtensilsCrossed size={18}/>,roles: ['super_admin','owner','manager'] },
  { href: '/reservations',label: 'Rezervasyonlar', icon: <CalendarDays size={18} />,  roles: ['super_admin','owner','manager','cashier'] },
  { href: '/stock',       label: 'Stok',           icon: <Package size={18} />,       roles: ['super_admin','owner','manager'] },
  { href: '/campaigns',   label: 'Kampanyalar',    icon: <Tag size={18} />,           roles: ['super_admin','owner','manager'] },
  { href: '/reports',    label: 'Raporlar',   icon: <Receipt size={18} />,      roles: ['super_admin','owner','manager'] },
  { href: '/expenses',   label: 'Giderler',   icon: <TrendingDown size={18} />, roles: ['super_admin','owner','manager'] },
  { href: '/customers',  label: 'Müşteriler', icon: <Star size={18} />,         roles: ['super_admin','owner','manager'] },
  { href: '/staff',      label: 'Personel',   icon: <Users size={18} />,        roles: ['super_admin','owner'] },
  { href: '/settings',   label: 'Ayarlar',    icon: <Settings size={18} />,     roles: ['super_admin','owner'] },
]

interface Props {
  role: UserRole
  tenantName: string
}

export function Sidebar({ role, tenantName }: Props) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const visibleItems = navItems.filter((item) => item.roles.includes(role))

  return (
    <aside className="w-56 flex flex-col bg-gray-900 text-white shrink-0">
      <div className="px-4 py-5 border-b border-gray-700">
        <p className="text-xs text-gray-400 uppercase tracking-wider">İşletme</p>
        <p className="font-semibold text-sm mt-0.5 truncate">{tenantName}</p>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 space-y-0.5 px-2">
        {visibleItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
              pathname.startsWith(item.href) && item.href !== '/dashboard'
                ? 'bg-orange-500 text-white'
                : pathname === item.href && item.href === '/dashboard'
                ? 'bg-orange-500 text-white'
                : 'text-gray-300 hover:bg-gray-800 hover:text-white'
            )}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="border-t border-gray-700 pt-2">
        <PresenceTimer />
        <div className="px-2 pb-3">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-gray-800 hover:text-white w-full transition-colors"
          >
            <LogOut size={18} />
            Çıkış Yap
          </button>
        </div>
      </div>
    </aside>
  )
}
