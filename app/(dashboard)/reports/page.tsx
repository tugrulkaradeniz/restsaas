import { createServiceClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { TrendingUp, ShoppingBag, Receipt, Users } from 'lucide-react'
import type { ReactNode } from 'react'
import ShiftReportPrintButton from '@/components/reports/ShiftReportPrintButton'
import type { ShiftReportParams } from '@/lib/print'

const PAYMENT_LABEL: Record<string, string> = {
  cash: 'Nakit',
  card: 'Kredi Kartı',
  pos:  'POS / QR',
}

type Period = 'today' | 'week' | 'month' | 'last_month'

function getDateRange(period: Period): { start: string; end: string; label: string } {
  const now = new Date()
  const pad = (n: number) => n.toString().padStart(2, '0')
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

  if (period === 'today') {
    const s = fmt(now)
    const e = new Date(now); e.setDate(e.getDate() + 1)
    return { start: `${s}T00:00:00`, end: `${fmt(e)}T00:00:00`, label: 'Bugün' }
  }
  if (period === 'week') {
    const s = new Date(now); s.setDate(s.getDate() - 6)
    const e = new Date(now); e.setDate(e.getDate() + 1)
    return { start: `${fmt(s)}T00:00:00`, end: `${fmt(e)}T00:00:00`, label: 'Son 7 Gün' }
  }
  if (period === 'month') {
    const s = new Date(now); s.setDate(s.getDate() - 29)
    const e = new Date(now); e.setDate(e.getDate() + 1)
    return { start: `${fmt(s)}T00:00:00`, end: `${fmt(e)}T00:00:00`, label: 'Son 30 Gün' }
  }
  // last_month
  const firstOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const firstOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  return {
    start: `${fmt(firstOfLastMonth)}T00:00:00`,
    end: `${fmt(firstOfThisMonth)}T00:00:00`,
    label: 'Geçen Ay',
  }
}

const fmt = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' })
const fmtNum = (n: number) => new Intl.NumberFormat('tr-TR').format(n)

interface SearchParams { period?: string }

export default async function ReportsPage({ searchParams }: { searchParams: SearchParams }) {
  const period: Period = (['today','week','month','last_month'].includes(searchParams.period ?? '')
    ? searchParams.period as Period
    : 'today')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const tenantId = user.app_metadata?.tenant_id as string

  const { start, end, label } = getDateRange(period)
  const service = createServiceClient()

  // Ödenen siparişler
  const { data: paidOrders } = await service
    .from('orders')
    .select('id, total_amount, discount_amount, payment_method, created_at')
    .eq('tenant_id', tenantId)
    .eq('status', 'paid')
    .gte('created_at', start)
    .lt('created_at', end)

  const orders = paidOrders ?? []
  const revenue = orders.reduce((s, o) => s + (o.total_amount ?? 0), 0)
  const orderCount = orders.length
  const avgOrder = orderCount > 0 ? revenue / orderCount : 0

  // Gün sonu — ödeme yöntemi dağılımı
  const { data: tenant } = await service
    .from('tenants')
    .select('name')
    .eq('id', tenantId)
    .single()

  const discountTotal = orders.reduce((s, o) => s + (o.discount_amount ?? 0), 0)
  const netRevenue = revenue
  const grossRevenue = revenue + discountTotal

  const paymentMap = new Map<string, { count: number; amount: number }>()
  for (const o of orders) {
    const key = o.payment_method ?? 'unknown'
    const existing = paymentMap.get(key) ?? { count: 0, amount: 0 }
    paymentMap.set(key, { count: existing.count + 1, amount: existing.amount + (o.total_amount ?? 0) })
  }
  const paymentBreakdown = Array.from(paymentMap.entries())
    .map(([method, v]) => ({ method, ...v }))
    .sort((a, b) => b.amount - a.amount)

  const shiftReport: ShiftReportParams = {
    tenantName: tenant?.name ?? '',
    periodLabel: label,
    rangeStart: start,
    rangeEnd: end,
    orderCount,
    grossRevenue,
    discountTotal,
    netRevenue,
    paymentBreakdown,
  }

  // Tüm sipariş sayısı (iptal dahil)
  const { count: totalOrderCount } = await service
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .gte('created_at', start)
    .lt('created_at', end)

  // En çok satan ürünler + KDV kırılımı
  let topItems: { name: string; qty: number; revenue: number }[] = []
  let kdvBreakdown: { rate: number; gross: number; net: number; kdvAmount: number }[] = []
  if (orders.length > 0) {
    const orderIds = orders.map(o => o.id)
    const { data: items } = await service
      .from('order_items')
      .select('menu_item_id, quantity, unit_price, menu_item:menu_items(name, kdv_rate, kdv_included)')
      .in('order_id', orderIds)

    if (items) {
      const map = new Map<string, { name: string; qty: number; revenue: number }>()
      const kdvMap = new Map<number, { gross: number; net: number; kdvAmount: number }>()
      for (const item of items) {
        const menuItem = item.menu_item as unknown as { name: string; kdv_rate: number | null; kdv_included: boolean | null } | null
        const name = menuItem?.name ?? 'Bilinmeyen'
        const lineTotal = item.quantity * item.unit_price
        const existing = map.get(item.menu_item_id) ?? { name, qty: 0, revenue: 0 }
        map.set(item.menu_item_id, {
          name,
          qty: existing.qty + item.quantity,
          revenue: existing.revenue + lineTotal,
        })

        const rate = menuItem?.kdv_rate ?? 10
        const included = menuItem?.kdv_included ?? true
        const net = included ? lineTotal / (1 + rate / 100) : lineTotal
        const kdvAmount = included ? lineTotal - net : lineTotal * (rate / 100)
        const gross = included ? lineTotal : lineTotal + kdvAmount
        const kExisting = kdvMap.get(rate) ?? { gross: 0, net: 0, kdvAmount: 0 }
        kdvMap.set(rate, {
          gross: kExisting.gross + gross,
          net: kExisting.net + net,
          kdvAmount: kExisting.kdvAmount + kdvAmount,
        })
      }
      topItems = Array.from(map.values())
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 10)
      kdvBreakdown = Array.from(kdvMap.entries())
        .map(([rate, v]) => ({ rate, ...v }))
        .sort((a, b) => b.rate - a.rate)
    }
  }
  const totalKdvAmount = kdvBreakdown.reduce((s, k) => s + k.kdvAmount, 0)

  // Personel satış raporu
  const { data: staffList } = await service
    .from('users')
    .select('id, full_name, role')
    .eq('tenant_id', tenantId)
    .neq('role', 'super_admin')
    .neq('role', 'kitchen')
    .order('full_name')

  const { data: waiterOrders } = await service
    .from('orders')
    .select('waiter_id, total_amount')
    .eq('tenant_id', tenantId)
    .eq('status', 'paid')
    .gte('created_at', start)
    .lt('created_at', end)

  const staffSalesMap = new Map<string, { count: number; revenue: number }>()
  let unattributedRevenue = 0
  let unattributedCount = 0
  for (const o of waiterOrders ?? []) {
    if (!o.waiter_id) {
      unattributedCount++
      unattributedRevenue += o.total_amount ?? 0
      continue
    }
    const existing = staffSalesMap.get(o.waiter_id) ?? { count: 0, revenue: 0 }
    staffSalesMap.set(o.waiter_id, { count: existing.count + 1, revenue: existing.revenue + (o.total_amount ?? 0) })
  }

  const staffSales = (staffList ?? [])
    .map(s => {
      const agg = staffSalesMap.get(s.id) ?? { count: 0, revenue: 0 }
      return { id: s.id, name: s.full_name, count: agg.count, revenue: agg.revenue }
    })
    .sort((a, b) => b.revenue - a.revenue)

  // Günlük ciro (sadece bu periyot)
  const dailyMap = new Map<string, number>()
  for (const o of orders) {
    const day = o.created_at.slice(0, 10)
    dailyMap.set(day, (dailyMap.get(day) ?? 0) + (o.total_amount ?? 0))
  }
  const dailyRevenue = Array.from(dailyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-14) // son 14 gün max

  const maxDaily = Math.max(...dailyRevenue.map(([, v]) => v), 1)

  const PERIODS: { key: Period; label: string }[] = [
    { key: 'today',      label: 'Bugün' },
    { key: 'week',       label: 'Son 7 Gün' },
    { key: 'month',      label: 'Son 30 Gün' },
    { key: 'last_month', label: 'Geçen Ay' },
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Başlık + periyot seçici */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Raporlar</h1>
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          {PERIODS.map(p => (
            <Link
              key={p.key}
              href={`/reports?period=${p.key}`}
              className={cn(
                'px-4 py-1.5 rounded-lg text-sm font-medium transition-colors',
                period === p.key ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
              )}
            >
              {p.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Özet kartlar */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          icon={<TrendingUp size={20} className="text-green-600" />}
          label="Toplam Ciro"
          value={fmt.format(revenue)}
          bg="bg-green-50"
        />
        <StatCard
          icon={<Receipt size={20} className="text-blue-600" />}
          label="Ödenen Sipariş"
          value={fmtNum(orderCount)}
          bg="bg-blue-50"
        />
        <StatCard
          icon={<ShoppingBag size={20} className="text-orange-600" />}
          label="Ort. Sipariş"
          value={fmt.format(avgOrder)}
          bg="bg-orange-50"
        />
        <StatCard
          icon={<Users size={20} className="text-purple-600" />}
          label="Toplam Sipariş"
          value={fmtNum(totalOrderCount ?? 0)}
          bg="bg-purple-50"
        />
      </div>

      <div className="grid grid-cols-5 gap-4">
        {/* En çok satan ürünler */}
        <div className="col-span-3 bg-white rounded-xl border">
          <div className="px-5 py-4 border-b">
            <h2 className="font-semibold text-gray-900">En Çok Satan Ürünler</h2>
            <p className="text-xs text-gray-500 mt-0.5">{label} — ödenen siparişler</p>
          </div>
          {topItems.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">Veri yok</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="text-xs text-gray-500 border-b">
                  <th className="px-5 py-2.5 text-left font-medium">#</th>
                  <th className="px-5 py-2.5 text-left font-medium">Ürün</th>
                  <th className="px-5 py-2.5 text-right font-medium">Adet</th>
                  <th className="px-5 py-2.5 text-right font-medium">Ciro</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {topItems.map((item, i) => (
                  <tr key={item.name} className="hover:bg-gray-50">
                    <td className="px-5 py-3 text-sm text-gray-400">{i + 1}</td>
                    <td className="px-5 py-3 text-sm font-medium text-gray-900">{item.name}</td>
                    <td className="px-5 py-3 text-sm text-gray-700 text-right">{fmtNum(item.qty)}</td>
                    <td className="px-5 py-3 text-sm font-medium text-gray-900 text-right">{fmt.format(item.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Günlük ciro grafiği */}
        <div className="col-span-2 bg-white rounded-xl border">
          <div className="px-5 py-4 border-b">
            <h2 className="font-semibold text-gray-900">Günlük Ciro</h2>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
          {dailyRevenue.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">Veri yok</p>
          ) : (
            <div className="px-5 py-4 space-y-2">
              {dailyRevenue.map(([day, val]) => (
                <div key={day} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-20 shrink-0">
                    {new Date(day).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                  </span>
                  <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                    <div
                      className="h-full bg-orange-400 rounded-full transition-all"
                      style={{ width: `${(val / maxDaily) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-gray-700 w-20 text-right shrink-0">
                    {fmt.format(val)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Gün Sonu — ödeme yöntemi dağılımı */}
      <div className="bg-white rounded-xl border">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-900">Gün Sonu Özeti</h2>
            <p className="text-xs text-gray-500 mt-0.5">{label} — ödenen siparişler, ödeme yöntemine göre</p>
          </div>
          <ShiftReportPrintButton report={shiftReport} />
        </div>
        <div className="grid grid-cols-3 gap-4 px-5 py-4 border-b">
          <div>
            <p className="text-xs text-gray-500">Brüt Ciro</p>
            <p className="text-lg font-semibold text-gray-900 mt-0.5">{fmt.format(grossRevenue)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">İndirim</p>
            <p className="text-lg font-semibold text-gray-900 mt-0.5">
              {discountTotal > 0 ? `-${fmt.format(discountTotal)}` : fmt.format(0)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Net Ciro</p>
            <p className="text-lg font-semibold text-gray-900 mt-0.5">{fmt.format(netRevenue)}</p>
          </div>
        </div>
        {paymentBreakdown.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-10">Veri yok</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-xs text-gray-500 border-b">
                <th className="px-5 py-2.5 text-left font-medium">Ödeme Yöntemi</th>
                <th className="px-5 py-2.5 text-right font-medium">Sipariş</th>
                <th className="px-5 py-2.5 text-right font-medium">Tutar</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {paymentBreakdown.map(pb => (
                <tr key={pb.method} className="hover:bg-gray-50">
                  <td className="px-5 py-3 text-sm font-medium text-gray-900">
                    {pb.method === 'unknown' ? 'Belirtilmemiş' : (PAYMENT_LABEL[pb.method] ?? pb.method)}
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-700 text-right">{fmtNum(pb.count)}</td>
                  <td className="px-5 py-3 text-sm font-medium text-gray-900 text-right">{fmt.format(pb.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Personel satış raporu */}
      <div className="bg-white rounded-xl border">
        <div className="px-5 py-4 border-b">
          <h2 className="font-semibold text-gray-900">Personel Satış Raporu</h2>
          <p className="text-xs text-gray-500 mt-0.5">{label} — ödenen siparişler, garsona göre</p>
        </div>
        {staffSales.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-10">Personel yok</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-xs text-gray-500 border-b">
                <th className="px-5 py-2.5 text-left font-medium">Personel</th>
                <th className="px-5 py-2.5 text-right font-medium">Sipariş</th>
                <th className="px-5 py-2.5 text-right font-medium">Ciro</th>
                <th className="px-5 py-2.5 text-right font-medium">Ort. Sipariş</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {staffSales.map(s => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 text-sm font-medium text-gray-900">{s.name}</td>
                  <td className="px-5 py-3 text-sm text-gray-700 text-right">{fmtNum(s.count)}</td>
                  <td className="px-5 py-3 text-sm font-medium text-gray-900 text-right">{fmt.format(s.revenue)}</td>
                  <td className="px-5 py-3 text-sm text-gray-700 text-right">
                    {s.count > 0 ? fmt.format(s.revenue / s.count) : '—'}
                  </td>
                </tr>
              ))}
              {unattributedCount > 0 && (
                <tr className="bg-gray-50/50">
                  <td className="px-5 py-3 text-sm text-gray-500 italic">Bilinmeyen / eski siparişler</td>
                  <td className="px-5 py-3 text-sm text-gray-500 text-right">{fmtNum(unattributedCount)}</td>
                  <td className="px-5 py-3 text-sm text-gray-500 text-right">{fmt.format(unattributedRevenue)}</td>
                  <td className="px-5 py-3 text-sm text-gray-500 text-right">—</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
      {/* KDV raporu */}
      <div className="bg-white rounded-xl border">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-900">KDV Raporu</h2>
            <p className="text-xs text-gray-500 mt-0.5">{label} — ödenen siparişler, oran bazında</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Toplam Tahsil Edilen KDV</p>
            <p className="text-lg font-bold text-gray-900">{fmt.format(totalKdvAmount)}</p>
          </div>
        </div>
        {kdvBreakdown.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-10">Veri yok</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-xs text-gray-500 border-b">
                <th className="px-5 py-2.5 text-left font-medium">KDV Oranı</th>
                <th className="px-5 py-2.5 text-right font-medium">KDV Hariç Tutar</th>
                <th className="px-5 py-2.5 text-right font-medium">KDV Tutarı</th>
                <th className="px-5 py-2.5 text-right font-medium">KDV Dahil Tutar</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {kdvBreakdown.map(k => (
                <tr key={k.rate} className="hover:bg-gray-50">
                  <td className="px-5 py-3 text-sm font-medium text-gray-900">%{k.rate}</td>
                  <td className="px-5 py-3 text-sm text-gray-700 text-right">{fmt.format(k.net)}</td>
                  <td className="px-5 py-3 text-sm text-gray-700 text-right">{fmt.format(k.kdvAmount)}</td>
                  <td className="px-5 py-3 text-sm font-medium text-gray-900 text-right">{fmt.format(k.gross)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, bg }: { icon: ReactNode; label: string; value: string; bg: string }) {
  return (
    <div className="bg-white rounded-xl border p-5">
      <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center mb-3', bg)}>
        {icon}
      </div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
    </div>
  )
}
