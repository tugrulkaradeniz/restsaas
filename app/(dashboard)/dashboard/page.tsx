import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils'
import { redirect } from 'next/navigation'
import {
  TrendingUp, ShoppingBag, Clock, CalendarDays,
  AlertTriangle, BellRing, ChefHat, CheckCircle2
} from 'lucide-react'
import Link from 'next/link'

const STATUS_LABEL: Record<string, string> = {
  pending: 'Bekliyor', confirmed: 'Onaylandı', preparing: 'Hazırlanıyor',
  ready: 'Hazır', delivered: 'Teslim', paid: 'Ödendi', cancelled: 'İptal',
}
const STATUS_COLOR: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-600',
  confirmed: 'bg-blue-100 text-blue-700',
  preparing: 'bg-orange-100 text-orange-700',
  ready: 'bg-green-100 text-green-700',
  delivered: 'bg-purple-100 text-purple-700',
  paid: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700',
}
const DAYS = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt']

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const service = createServiceClient()
  const tenantId = user.app_metadata?.tenant_id as string

  const now   = new Date()
  const today = now.toISOString().split('T')[0]
  const todayStart = today + 'T00:00:00.000Z'

  // 7 gün önce
  const weekAgo = new Date(now)
  weekAgo.setDate(weekAgo.getDate() - 6)
  weekAgo.setHours(0, 0, 0, 0)

  const [
    { data: todayOrders },
    { data: activeOrders },
    { data: reservations },
    { data: weekOrders },
    { data: tables },
    { data: ingredients },
    { data: pendingCalls },
  ] = await Promise.all([
    service
      .from('orders')
      .select('id, total_amount, status, created_at, table:tables(name), items:order_items(quantity, menu_item:menu_items(name))')
      .eq('tenant_id', tenantId)
      .gte('created_at', todayStart)
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false }),
    service
      .from('orders')
      .select('id')
      .eq('tenant_id', tenantId)
      .in('status', ['pending', 'confirmed', 'preparing', 'ready', 'delivered']),
    service
      .from('reservations')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('date', today)
      .eq('status', 'confirmed'),
    service
      .from('orders')
      .select('created_at, total_amount')
      .eq('tenant_id', tenantId)
      .gte('created_at', weekAgo.toISOString())
      .neq('status', 'cancelled'),
    service
      .from('tables')
      .select('status')
      .eq('tenant_id', tenantId),
    service
      .from('ingredients')
      .select('name, stock_qty, min_stock, unit')
      .eq('tenant_id', tenantId)
      .gt('min_stock', 0),
    service
      .from('waiter_calls')
      .select('id, created_at, table:tables(name)')
      .eq('tenant_id', tenantId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  // KPI hesapları
  const todayRevenue   = (todayOrders ?? []).reduce((s, o) => s + (o.total_amount ?? 0), 0)
  const todayOrderCnt  = todayOrders?.length ?? 0
  const activeOrderCnt = activeOrders?.length ?? 0
  const reserveCnt     = reservations?.length ?? 0

  // 7 günlük grafik
  const weekDays: { label: string; date: string; revenue: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const ds = d.toISOString().split('T')[0]
    weekDays.push({
      label: i === 0 ? 'Bugün' : DAYS[d.getDay()],
      date: ds,
      revenue: (weekOrders ?? [])
        .filter(o => o.created_at.startsWith(ds))
        .reduce((s, o) => s + (o.total_amount ?? 0), 0),
    })
  }
  const maxRevenue = Math.max(...weekDays.map(d => d.revenue), 1)

  // En çok satan ürünler (bugün)
  type ItemCount = { name: string; qty: number }
  const itemMap: Record<string, ItemCount> = {}
  for (const order of todayOrders ?? []) {
    const items = order.items as unknown as { quantity: number; menu_item: { name: string } | null }[]
    for (const item of items ?? []) {
      const name = item.menu_item?.name ?? '?'
      if (!itemMap[name]) itemMap[name] = { name, qty: 0 }
      itemMap[name].qty += item.quantity
    }
  }
  const topItems = Object.values(itemMap).sort((a, b) => b.qty - a.qty).slice(0, 6)

  // Son siparişler
  const recentOrders = (todayOrders ?? []).slice(0, 8)

  // Masa durumu
  const tableStats = {
    empty:    (tables ?? []).filter(t => t.status === 'empty').length,
    occupied: (tables ?? []).filter(t => t.status === 'occupied').length,
    reserved: (tables ?? []).filter(t => t.status === 'reserved').length,
    dirty:    (tables ?? []).filter(t => t.status === 'dirty').length,
  }

  // Düşük stok
  const lowStock = (ingredients ?? []).filter(i => i.stock_qty <= i.min_stock).slice(0, 6)

  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Genel Bakış</h1>

      {/* KPI kartları */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {[
          { label: 'Bugünkü Ciro',    value: formatCurrency(todayRevenue),     icon: TrendingUp,   color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Bugünkü Sipariş', value: String(todayOrderCnt),            icon: ShoppingBag,  color: 'text-blue-600',    bg: 'bg-blue-50'    },
          { label: 'Aktif Sipariş',   value: String(activeOrderCnt),           icon: Clock,        color: 'text-orange-600',  bg: 'bg-orange-50'  },
          { label: 'Bugün Rezervasyon', value: String(reserveCnt),             icon: CalendarDays, color: 'text-purple-600',  bg: 'bg-purple-50'  },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border p-4 flex items-center gap-3">
            <div className={`${s.bg} ${s.color} p-2.5 rounded-xl shrink-0`}>
              <s.icon size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 truncate">{s.label}</p>
              <p className="text-xl font-bold text-gray-900">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Garson çağrıları — varsa göster */}
      {(pendingCalls ?? []).length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <BellRing size={18} className="text-amber-500 shrink-0" />
          <p className="text-sm font-medium text-amber-800">
            {(pendingCalls ?? []).length} bekleyen garson çağrısı:&nbsp;
            {(pendingCalls ?? []).map((c, i) => (
              <span key={c.id}>
                {i > 0 && ', '}
                {((c.table as unknown) as { name: string } | null)?.name ?? '?'}
              </span>
            ))}
          </p>
          <Link href="/orders" className="ml-auto text-xs font-semibold text-amber-700 hover:text-amber-900 shrink-0">
            Git →
          </Link>
        </div>
      )}

      {/* Grafik + Top ürünler */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 7 günlük gelir grafiği */}
        <div className="bg-white rounded-xl border p-5 lg:col-span-2">
          <h2 className="font-semibold text-gray-900 mb-4 text-sm">7 Günlük Ciro</h2>
          <div className="flex items-end gap-2 h-36">
            {weekDays.map(d => (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs text-gray-500 font-mono">{d.revenue > 0 ? formatCurrency(d.revenue).replace(' ₺','') : ''}</span>
                <div className="w-full flex items-end" style={{ height: '96px' }}>
                  <div
                    className={`w-full rounded-t-md transition-all ${d.date === today ? 'bg-orange-500' : 'bg-orange-200'}`}
                    style={{ height: `${Math.max((d.revenue / maxRevenue) * 96, d.revenue > 0 ? 4 : 0)}px` }}
                  />
                </div>
                <span className={`text-xs font-medium ${d.date === today ? 'text-orange-600' : 'text-gray-400'}`}>{d.label}</span>
              </div>
            ))}
          </div>
          {weekDays.every(d => d.revenue === 0) && (
            <p className="text-xs text-center text-gray-400 mt-2">Bu hafta henüz sipariş yok</p>
          )}
        </div>

        {/* En çok satanlar */}
        <div className="bg-white rounded-xl border p-5">
          <h2 className="font-semibold text-gray-900 mb-4 text-sm">Bugün En Çok Satan</h2>
          {topItems.length === 0 ? (
            <p className="text-xs text-gray-400 mt-6 text-center">Bugün henüz sipariş yok</p>
          ) : (
            <div className="space-y-3">
              {topItems.map((item, i) => (
                <div key={item.name} className="flex items-center gap-3">
                  <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-700 text-xs font-bold flex items-center justify-center shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{item.name}</p>
                    <div className="h-1.5 bg-gray-100 rounded-full mt-1">
                      <div
                        className="h-1.5 bg-orange-400 rounded-full"
                        style={{ width: `${(item.qty / topItems[0].qty) * 100}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-xs font-bold text-gray-600 shrink-0">{item.qty}×</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Son siparişler + Masa & Stok */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Son siparişler */}
        <div className="bg-white rounded-xl border lg:col-span-2">
          <div className="flex items-center justify-between px-5 py-4 border-b">
            <h2 className="font-semibold text-gray-900 text-sm">Son Siparişler</h2>
            <Link href="/orders" className="text-xs text-orange-500 hover:text-orange-700 font-medium">
              Tümü →
            </Link>
          </div>
          {recentOrders.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-10">Bugün henüz sipariş yok</p>
          ) : (
            <div className="divide-y">
              {recentOrders.map(order => (
                <div key={order.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {((order.table as unknown) as { name: string } | null)?.name ?? 'Paket'}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(order.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[order.status] ?? ''}`}>
                    {STATUS_LABEL[order.status] ?? order.status}
                  </span>
                  <span className="text-sm font-semibold text-gray-900 shrink-0">
                    {formatCurrency(order.total_amount ?? 0)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Masa durumu + Düşük stok */}
        <div className="space-y-4">
          {/* Masa durumu */}
          <div className="bg-white rounded-xl border p-5">
            <h2 className="font-semibold text-gray-900 mb-3 text-sm flex items-center gap-2">
              <ChefHat size={15} className="text-gray-400" /> Masa Durumu
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Boş',     count: tableStats.empty,    color: 'bg-green-100 text-green-700' },
                { label: 'Dolu',    count: tableStats.occupied, color: 'bg-red-100 text-red-700'     },
                { label: 'Rezerve', count: tableStats.reserved, color: 'bg-amber-100 text-amber-700' },
                { label: 'Kirli',   count: tableStats.dirty,    color: 'bg-gray-100 text-gray-600'   },
              ].map(t => (
                <div key={t.label} className={`${t.color} rounded-lg px-3 py-2 text-center`}>
                  <p className="text-xl font-bold">{t.count}</p>
                  <p className="text-xs font-medium">{t.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Düşük stok */}
          <div className="bg-white rounded-xl border p-5">
            <h2 className="font-semibold text-gray-900 mb-3 text-sm flex items-center gap-2">
              <AlertTriangle size={15} className="text-amber-500" /> Düşük Stok
            </h2>
            {lowStock.length === 0 ? (
              <div className="flex items-center gap-2 text-xs text-green-600">
                <CheckCircle2 size={14} /> Tüm stoklar yeterli
              </div>
            ) : (
              <div className="space-y-2">
                {lowStock.map(ing => (
                  <div key={ing.name} className="flex items-center justify-between text-xs">
                    <span className="text-gray-700 font-medium truncate">{ing.name}</span>
                    <span className="text-red-600 font-semibold shrink-0 ml-2">
                      {ing.stock_qty} / {ing.min_stock} {ing.unit}
                    </span>
                  </div>
                ))}
                <Link href="/stock" className="block text-xs text-orange-500 hover:text-orange-700 font-medium mt-1">
                  Stoka git →
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
