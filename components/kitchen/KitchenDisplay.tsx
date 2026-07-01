'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { Order, OrderItem, MenuItem, Table } from '@/types/database'
import { CheckCircle, Clock, Volume2, Printer } from 'lucide-react'
import { printKitchenTicket } from '@/lib/print'

type KitchenOrder = Order & {
  table: Pick<Table, 'name'> | null
  items: (OrderItem & { menu_item: Pick<MenuItem, 'name'> | null })[]
}

interface Props {
  initialOrders: KitchenOrder[]
}

function elapsed(createdAt: string): string {
  const diff = Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000)
  const m = Math.floor(diff / 60)
  const s = diff % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function urgencyColor(createdAt: string): string {
  const minutes = (Date.now() - new Date(createdAt).getTime()) / 60000
  if (minutes > 15) return 'border-red-500 bg-red-50'
  if (minutes > 8)  return 'border-yellow-400 bg-yellow-50'
  return 'border-gray-200 bg-white'
}

export function KitchenDisplay({ initialOrders }: Props) {
  const [orders, setOrders] = useState<KitchenOrder[]>(initialOrders)
  const [tick, setTick] = useState(0)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [autoPrint, setAutoPrint] = useState(false)
  const supabase = createClient()

  // Süre sayacı
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 10000)
    return () => clearInterval(interval)
  }, [])

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel('kitchen-orders')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const raw = payload.new as Order
            if (!['confirmed', 'preparing'].includes(raw.status)) return
            // order_items henüz insert edilmemiş olabilir, 800ms bekle
            setTimeout(async () => {
              const { data } = await supabase
                .from('orders')
                .select('*, table:tables(name), items:order_items(*, menu_item:menu_items(name))')
                .eq('id', raw.id)
                .single()
              if (!data) return
              const ko = data as KitchenOrder
              setOrders((prev) => {
                if (prev.some((o) => o.id === ko.id)) return prev
                return [ko, ...prev]
              })
              playBeep()
              // Auto-print aktifse mutfak bileti bas
              if (autoPrint) {
                printKitchenTicket({
                  tableName: ko.table?.name ?? 'Paket',
                  items: (ko.items ?? []).map(i => ({
                    name: i.menu_item?.name ?? '?',
                    quantity: i.quantity,
                    unit_price: 0,
                    note: i.note,
                  })),
                })
              }
            }, 800)
          }
          if (payload.eventType === 'UPDATE') {
            const updated = payload.new as Order
            setOrders((prev) => {
              if (!['confirmed', 'preparing'].includes(updated.status)) {
                return prev.filter((o) => o.id !== updated.id)
              }
              // Sadece status güncelle, items/table mevcut state'den koru
              return prev.map((o) => o.id === updated.id ? { ...o, status: updated.status } : o)
            })
          }
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function playBeep() {
    if (!soundEnabled) return
    try {
      const ctx = new AudioContext()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = 880
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
      osc.start()
      osc.stop(ctx.currentTime + 0.5)
    } catch {}
  }

  async function markPreparing(orderId: string) {
    const { error } = await supabase
      .from('orders')
      .update({ status: 'preparing' })
      .eq('id', orderId)
    if (error) toast.error(error.message)
  }

  async function markReady(orderId: string) {
    const { error } = await supabase
      .from('orders')
      .update({ status: 'ready' })
      .eq('id', orderId)
    if (error) toast.error(error.message)
    else {
      setOrders((prev) => prev.filter((o) => o.id !== orderId))
      toast.success('Sipariş hazır olarak işaretlendi')
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Mutfak Ekranı</h1>
          <p className="text-gray-400 text-sm">{orders.length} aktif sipariş</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoPrint(v => !v)}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
              autoPrint ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-400'
            )}
          >
            <Printer size={16} />
            {autoPrint ? 'Oto-Baskı Açık' : 'Oto-Baskı Kapalı'}
          </button>
          <button
            onClick={() => setSoundEnabled((v) => !v)}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
              soundEnabled ? 'bg-orange-500 text-white' : 'bg-gray-700 text-gray-400'
            )}
          >
            <Volume2 size={16} />
            {soundEnabled ? 'Ses Açık' : 'Ses Kapalı'}
          </button>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
          <CheckCircle size={48} className="mb-3 text-green-500" />
          <p className="text-lg font-medium">Tüm siparişler tamamlandı</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className={cn(
                'rounded-2xl border-2 p-4 flex flex-col gap-3 transition-colors',
                urgencyColor(order.created_at)
              )}
            >
              {/* Order header */}
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-bold text-gray-900 text-lg">
                    {order.table?.name ?? 'Paket'}
                  </p>
                  <span className={cn(
                    'inline-block text-xs px-2 py-0.5 rounded-full font-medium mt-1',
                    order.status === 'confirmed' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                  )}>
                    {order.status === 'confirmed' ? 'Yeni' : 'Hazırlanıyor'}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-gray-500 text-sm">
                  <Clock size={14} />
                  <span key={tick}>{elapsed(order.created_at)}</span>
                </div>
              </div>

              {/* Items */}
              <ul className="space-y-1.5 flex-1">
                {order.items?.filter((i) => i.status !== 'cancelled').map((item) => (
                  <li key={item.id} className="flex items-center gap-2">
                    <span className="w-6 h-6 bg-gray-900 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                      {item.quantity}
                    </span>
                    <span className="text-sm text-gray-800 font-medium">{item.menu_item?.name}</span>
                    {item.note && (
                      <span className="text-xs text-orange-600 truncate">({item.note})</span>
                    )}
                  </li>
                ))}
              </ul>

              {/* Actions */}
              <div className="flex gap-2 mt-1">
                <button
                  onClick={() => printKitchenTicket({
                    tableName: order.table?.name ?? 'Paket',
                    items: (order.items ?? []).map(i => ({
                      name: i.menu_item?.name ?? '?',
                      quantity: i.quantity,
                      unit_price: 0,
                      note: i.note,
                    })),
                  })}
                  className="px-2 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors"
                  title="Mutfak Bileti Yazdır"
                >
                  <Printer size={15} />
                </button>
                {order.status === 'confirmed' && (
                  <button
                    onClick={() => markPreparing(order.id)}
                    className="flex-1 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Başla
                  </button>
                )}
                <button
                  onClick={() => markReady(order.id)}
                  className="flex-1 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1"
                >
                  <CheckCircle size={15} />
                  Hazır
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
