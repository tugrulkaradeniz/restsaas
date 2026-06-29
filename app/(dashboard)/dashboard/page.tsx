import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils'
import { TrendingUp, ShoppingBag, Users, Clock } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const [{ data: todayOrders }, { data: activeOrders }, { data: reservations }] = await Promise.all([
    supabase
      .from('orders')
      .select('total_amount, status')
      .gte('created_at', today)
      .neq('status', 'cancelled'),
    supabase
      .from('orders')
      .select('id')
      .in('status', ['pending', 'confirmed', 'preparing', 'ready', 'delivered']),
    supabase
      .from('reservations')
      .select('id')
      .eq('date', today)
      .eq('status', 'confirmed'),
  ])

  const todayRevenue = todayOrders?.reduce((sum, o) => sum + (o.total_amount || 0), 0) ?? 0
  const todayOrderCount = todayOrders?.length ?? 0
  const activeOrderCount = activeOrders?.length ?? 0
  const reservationCount = reservations?.length ?? 0

  const stats = [
    { label: 'Bugünkü Ciro', value: formatCurrency(todayRevenue), icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Bugünkü Sipariş', value: todayOrderCount.toString(), icon: ShoppingBag, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Aktif Sipariş', value: activeOrderCount.toString(), icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Bugün Rezervasyon', value: reservationCount.toString(), icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
  ]

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Genel Bakış</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border p-5 flex items-center gap-4">
            <div className={`${stat.bg} ${stat.color} p-3 rounded-xl`}>
              <stat.icon size={22} />
            </div>
            <div>
              <p className="text-sm text-gray-500">{stat.label}</p>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Son Siparişler</h2>
        {/* Detay için orders sayfasına yönlendirilir */}
        <p className="text-sm text-gray-400">Detaylı bilgi için Siparişler sayfasına gidin.</p>
      </div>
    </div>
  )
}
