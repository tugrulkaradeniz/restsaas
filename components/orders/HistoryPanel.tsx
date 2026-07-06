'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn, formatCurrency } from '@/lib/utils'
import type { Order, Table, MenuItem, OrderItem, OrderStatus } from '@/types/database'
import { Search, Printer, X, ChevronRight, Package, MapPin } from 'lucide-react'
import { printReceipt } from '@/lib/print'

type HistoryOrder = Order & {
  table: Pick<Table, 'id' | 'name'> | null
  waiter: { full_name: string } | null
  items: (OrderItem & { menu_item: Pick<MenuItem, 'id' | 'name' | 'price'> | null })[]
}

const STATUS_LABEL: Record<string, string> = {
  paid: 'Ödendi',
  cancelled: 'İptal',
}

const STATUS_COLOR: Record<string, string> = {
  paid: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700',
}

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

interface Props {
  tenantName: string
  tenantAddress?: string | null
}

export function HistoryPanel({ tenantName, tenantAddress }: Props) {
  const [dateFrom, setDateFrom] = useState(todayStr())
  const [dateTo, setDateTo] = useState(todayStr())
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'cancelled'>('all')
  const [search, setSearch] = useState('')
  const [orders, setOrders] = useState<HistoryOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [mobileView, setMobileView] = useState<'list' | 'detail'>('list')
  const supabase = createClient()

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const statuses: OrderStatus[] = statusFilter === 'all' ? ['paid', 'cancelled'] : [statusFilter]
    const end = new Date(dateTo)
    end.setDate(end.getDate() + 1)
    const endStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`

    supabase
      .from('orders')
      .select('*, table:tables(id,name), waiter:users(full_name), items:order_items(*, menu_item:menu_items(id,name,price))')
      .in('status', statuses)
      .gte('created_at', `${dateFrom}T00:00:00`)
      .lt('created_at', `${endStr}T00:00:00`)
      .order('created_at', { ascending: false })
      .limit(200)
      .then(({ data }) => {
        if (cancelled) return
        setOrders((data ?? []) as unknown as HistoryOrder[])
        setLoading(false)
      })

    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo, statusFilter])

  const filtered = orders.filter(o => {
    if (!search.trim()) return true
    const q = search.trim().toLowerCase()
    return (
      o.table?.name?.toLowerCase().includes(q) ||
      o.customer_name?.toLowerCase().includes(q) ||
      o.customer_phone?.toLowerCase().includes(q) ||
      o.id.toLowerCase().includes(q)
    )
  })

  const selected = filtered.find(o => o.id === selectedId) ?? null
  const totalRevenue = filtered.filter(o => o.status === 'paid').reduce((s, o) => s + o.total_amount, 0)

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Liste */}
      <div className={cn('flex-col border-r bg-white w-full md:w-80 shrink-0',
        mobileView === 'detail' ? 'hidden md:flex' : 'flex')}>
        {/* Filtreler */}
        <div className="px-3 py-2.5 border-b bg-gray-50 space-y-2 shrink-0">
          <div className="flex gap-1.5">
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="flex-1 border rounded-lg px-2 py-1.5 text-xs" />
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="flex-1 border rounded-lg px-2 py-1.5 text-xs" />
          </div>
          <div className="flex gap-1">
            {(['all', 'paid', 'cancelled'] as const).map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={cn('flex-1 py-1 rounded-lg text-xs font-medium transition-colors',
                  statusFilter === s ? 'bg-gray-700 text-white' : 'bg-white border text-gray-500 hover:bg-gray-100')}>
                {s === 'all' ? 'Tümü' : STATUS_LABEL[s]}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Masa, müşteri, sipariş no..."
              className="w-full border rounded-lg pl-7 pr-2 py-1.5 text-xs" />
          </div>
          <p className="text-xs text-gray-500">
            {loading ? 'Yükleniyor...' : `${filtered.length} sipariş · ${formatCurrency(totalRevenue)} ciro`}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto divide-y">
          {!loading && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400 gap-2">
              <Package size={32} className="text-gray-200" />
              <p className="text-sm">Sipariş bulunamadı</p>
            </div>
          )}
          {filtered.map(order => (
            <button
              key={order.id}
              onClick={() => { setSelectedId(order.id); setMobileView('detail') }}
              className={cn('w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors',
                selectedId === order.id ? 'bg-gray-100 border-l-2 border-gray-600' : '')}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="font-semibold text-sm text-gray-900">
                  {order.table?.name ?? order.customer_name ?? 'Paket'}
                </span>
                <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', STATUS_COLOR[order.status])}>
                  {STATUS_LABEL[order.status] ?? order.status}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{order.waiter?.full_name ?? (order.source === 'online' ? 'Online' : '—')}</span>
                <span>{formatCurrency(order.total_amount)}</span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                {new Date(order.created_at).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Detay */}
      <div className={cn('flex-col flex-1 bg-gray-50 overflow-hidden',
        mobileView === 'list' ? 'hidden md:flex' : 'flex')}>
        {!selected ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
            <ChevronRight size={32} className="text-gray-200" />
            <p className="text-sm">Sipariş seçin</p>
          </div>
        ) : (
          <div className="flex flex-col h-full overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 bg-white border-b shrink-0">
              <button onClick={() => setMobileView('list')} className="md:hidden p-1 text-gray-400">
                <X size={16} />
              </button>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900">{selected.table?.name ?? selected.customer_name ?? 'Paket'}</h3>
                <p className="text-xs text-gray-500">#{selected.id.slice(-8).toUpperCase()}</p>
              </div>
              <span className={cn('text-xs px-2.5 py-1 rounded-full font-medium', STATUS_COLOR[selected.status])}>
                {STATUS_LABEL[selected.status] ?? selected.status}
              </span>
              <button
                title="Adisyon Yazdır"
                onClick={() => printReceipt({
                  tenantName,
                  tenantAddress,
                  tableName: selected.table?.name ?? selected.customer_name ?? 'Paket',
                  orderCreatedAt: selected.created_at,
                  items: (selected.items ?? []).map(i => ({
                    name: i.menu_item?.name ?? '?',
                    quantity: i.quantity,
                    unit_price: i.unit_price,
                    note: i.note,
                  })),
                  totalAmount: selected.total_amount,
                  paymentMethod: selected.payment_method,
                })}
                className="p-1.5 text-gray-400 hover:text-orange-500"
              >
                <Printer size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {selected.customer_name && (
                <div className="bg-white rounded-xl border p-4 space-y-1">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Müşteri</h4>
                  <p className="text-sm font-medium text-gray-900">{selected.customer_name}</p>
                  {selected.customer_phone && <p className="text-xs text-gray-500">{selected.customer_phone}</p>}
                  {selected.delivery_address && (
                    <div className="flex items-start gap-2 text-xs text-gray-600 pt-1">
                      <MapPin size={12} className="text-gray-400 shrink-0 mt-0.5" />
                      <span>{selected.delivery_address}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="bg-white rounded-xl border overflow-hidden">
                <div className="px-4 py-2.5 border-b bg-gray-50">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Sipariş Kalemleri</h4>
                </div>
                <div className="divide-y">
                  {selected.items.map(item => (
                    <div key={item.id} className="px-4 py-3 flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <span className="text-sm font-medium text-gray-900">
                          {item.quantity}× {item.menu_item?.name ?? 'Ürün'}
                        </span>
                        {item.is_complimentary && (
                          <span className="ml-1.5 text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">İKRAM</span>
                        )}
                        {item.note && <p className="text-xs text-gray-400 italic mt-0.5">{item.note}</p>}
                      </div>
                      <span className="text-sm font-semibold text-gray-900 shrink-0">
                        {item.is_complimentary ? 'İkram' : formatCurrency(item.unit_price * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>
                {selected.discount_amount > 0 && (
                  <div className="px-4 py-2.5 border-t bg-emerald-50 flex items-center justify-between text-sm text-emerald-600">
                    <span>Kampanya İndirimi</span>
                    <span className="font-medium">-{formatCurrency(selected.discount_amount)}</span>
                  </div>
                )}
                <div className="px-4 py-3 border-t bg-gray-50 flex items-center justify-between">
                  <span className="text-sm font-bold text-gray-900">Toplam</span>
                  <span className="text-base font-bold text-orange-500">{formatCurrency(selected.total_amount)}</span>
                </div>
              </div>

              {selected.payment_method && (
                <p className="text-xs text-gray-400 text-center">
                  Ödeme: {selected.payment_method === 'cash' ? 'Nakit' : selected.payment_method === 'card' ? 'Kredi Kartı' : selected.payment_method}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
