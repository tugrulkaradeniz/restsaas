'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { cn, formatCurrency } from '@/lib/utils'
import type { Order, Table, MenuCategory, MenuItem, OrderItem, OrderStatus } from '@/types/database'
import { Plus, Minus, ShoppingCart } from 'lucide-react'

type FullOrder = Order & {
  table: Pick<Table, 'id' | 'name'> | null
  waiter: { full_name: string } | null
  items: (OrderItem & { menu_item: Pick<MenuItem, 'id' | 'name' | 'price'> | null })[]
}

type FullCategory = MenuCategory & { items: MenuItem[] }

interface CartItem { menuItemId: string; name: string; price: number; qty: number; note: string }

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending:   'Bekliyor',
  confirmed: 'Onaylandı',
  preparing: 'Hazırlanıyor',
  ready:     'Hazır',
  delivered: 'Teslim Edildi',
  paid:      'Ödendi',
  cancelled: 'İptal',
}

const STATUS_COLOR: Record<OrderStatus, string> = {
  pending:   'bg-gray-100 text-gray-700',
  confirmed: 'bg-blue-100 text-blue-700',
  preparing: 'bg-orange-100 text-orange-700',
  ready:     'bg-green-100 text-green-700',
  delivered: 'bg-purple-100 text-purple-700',
  paid:      'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700',
}

interface Props {
  initialOrders: FullOrder[]
  tables: Table[]
  categories: FullCategory[]
}

export function OrdersView({ initialOrders, tables, categories }: Props) {
  const [orders, setOrders] = useState<FullOrder[]>(initialOrders)
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [showNewOrder, setShowNewOrder] = useState(false)
  const [selectedTableId, setSelectedTableId] = useState('')
  const [activeCategoryId, setActiveCategoryId] = useState(categories[0]?.id ?? '')
  const [cart, setCart] = useState<CartItem[]>([])
  const [submitting, setSubmitting] = useState(false)
  const supabase = createClient()

  const selectedOrder = orders.find((o) => o.id === selectedOrderId)

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel('orders-view')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        window.location.reload()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function addToCart(item: MenuItem) {
    setCart((prev) => {
      const existing = prev.find((c) => c.menuItemId === item.id)
      if (existing) return prev.map((c) => c.menuItemId === item.id ? { ...c, qty: c.qty + 1 } : c)
      return [...prev, { menuItemId: item.id, name: item.name, price: item.price, qty: 1, note: '' }]
    })
  }

  function removeFromCart(menuItemId: string) {
    setCart((prev) => {
      const existing = prev.find((c) => c.menuItemId === menuItemId)
      if (!existing || existing.qty <= 1) return prev.filter((c) => c.menuItemId !== menuItemId)
      return prev.map((c) => c.menuItemId === menuItemId ? { ...c, qty: c.qty - 1 } : c)
    })
  }

  const cartTotal = cart.reduce((sum, c) => sum + c.price * c.qty, 0)

  async function submitOrder() {
    if (!selectedTableId) { toast.error('Masa seçin'); return }
    if (cart.length === 0) { toast.error('Sepet boş'); return }
    setSubmitting(true)

    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .insert({
        table_id: selectedTableId,
        source: 'waiter',
        status: 'pending',
        total_amount: cartTotal,
      })
      .select()
      .single()

    if (orderErr || !order) { toast.error(orderErr?.message); setSubmitting(false); return }

    const items = cart.map((c) => ({
      order_id: order.id,
      menu_item_id: c.menuItemId,
      quantity: c.qty,
      unit_price: c.price,
      note: c.note || null,
      status: 'pending',
    }))

    const { error: itemsErr } = await supabase.from('order_items').insert(items)
    if (itemsErr) { toast.error(itemsErr.message); setSubmitting(false); return }

    toast.success('Sipariş oluşturuldu')
    setCart([])
    setShowNewOrder(false)
    window.location.reload()
    setSubmitting(false)
  }

  async function updateOrderStatus(orderId: string, status: OrderStatus) {
    const { error } = await supabase.from('orders').update({ status }).eq('id', orderId)
    if (error) toast.error(error.message)
    else setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status } : o))
  }

  const activeCategory = categories.find((c) => c.id === activeCategoryId)

  return (
    <div className="flex h-full">
      {/* Sipariş listesi */}
      <div className="w-72 border-r bg-white flex flex-col">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Siparişler</h2>
          <button
            onClick={() => setShowNewOrder(true)}
            className="flex items-center gap-1.5 bg-orange-500 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-orange-600"
          >
            <Plus size={14} /> Yeni
          </button>
        </div>
        <div className="flex-1 overflow-y-auto divide-y">
          {orders.map((order) => (
            <button
              key={order.id}
              onClick={() => setSelectedOrderId(order.id)}
              className={cn(
                'w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors',
                selectedOrderId === order.id && 'bg-orange-50'
              )}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm text-gray-900">
                  {order.table?.name ?? 'Paket'}
                </span>
                <span className={cn('text-xs px-2 py-0.5 rounded-full', STATUS_COLOR[order.status])}>
                  {STATUS_LABEL[order.status]}
                </span>
              </div>
              <div className="text-xs text-gray-500 mt-0.5">
                {order.items?.length ?? 0} ürün · {formatCurrency(order.total_amount)}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Sipariş detayı */}
      <div className="flex-1 overflow-auto bg-gray-50 p-6">
        {!selectedOrder && !showNewOrder && (
          <div className="flex items-center justify-center h-64 text-gray-400">
            <p>Sol taraftan bir sipariş seçin veya yeni sipariş oluşturun</p>
          </div>
        )}

        {selectedOrder && !showNewOrder && (
          <div className="max-w-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                {selectedOrder.table?.name ?? 'Paket'} — Sipariş
              </h2>
              <span className={cn('px-3 py-1 rounded-full text-sm font-medium', STATUS_COLOR[selectedOrder.status])}>
                {STATUS_LABEL[selectedOrder.status]}
              </span>
            </div>

            <div className="bg-white rounded-xl border divide-y mb-4">
              {selectedOrder.items?.map((item) => (
                <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center text-xs font-bold">
                    {item.quantity}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{item.menu_item?.name}</p>
                    {item.note && <p className="text-xs text-gray-500">{item.note}</p>}
                  </div>
                  <span className="text-sm text-gray-700">
                    {formatCurrency(item.unit_price * item.quantity)}
                  </span>
                </div>
              ))}
              <div className="px-4 py-3 flex justify-between font-semibold">
                <span>Toplam</span>
                <span>{formatCurrency(selectedOrder.total_amount)}</span>
              </div>
            </div>

            {/* Status actions */}
            <div className="flex gap-2 flex-wrap">
              {selectedOrder.status === 'pending' && (
                <button
                  onClick={() => updateOrderStatus(selectedOrder.id, 'confirmed')}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600"
                >
                  Onayla
                </button>
              )}
              {selectedOrder.status === 'ready' && (
                <button
                  onClick={() => updateOrderStatus(selectedOrder.id, 'delivered')}
                  className="px-4 py-2 bg-purple-500 text-white rounded-lg text-sm hover:bg-purple-600"
                >
                  Teslim Edildi
                </button>
              )}
              {['delivered', 'ready'].includes(selectedOrder.status) && (
                <button
                  onClick={() => updateOrderStatus(selectedOrder.id, 'paid')}
                  className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm hover:bg-emerald-600"
                >
                  Ödendi
                </button>
              )}
              {!['paid', 'cancelled'].includes(selectedOrder.status) && (
                <button
                  onClick={() => updateOrderStatus(selectedOrder.id, 'cancelled')}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600"
                >
                  İptal Et
                </button>
              )}
            </div>
          </div>
        )}

        {showNewOrder && (
          <div className="flex gap-4 h-full">
            {/* Menü */}
            <div className="flex-1 flex flex-col bg-white rounded-xl border overflow-hidden">
              <div className="border-b px-4 py-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Masa</label>
                <select
                  value={selectedTableId}
                  onChange={(e) => setSelectedTableId(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">Masa seçin</option>
                  {tables.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              {/* Kategori tabs */}
              <div className="flex gap-1 p-3 border-b overflow-x-auto">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategoryId(cat.id)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors',
                      activeCategoryId === cat.id
                        ? 'bg-orange-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    )}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>

              {/* Menu items */}
              <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 gap-2">
                {activeCategory?.items.filter((i) => i.is_available).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => addToCart(item)}
                    className="text-left p-3 border rounded-xl hover:border-orange-300 hover:bg-orange-50 transition-colors"
                  >
                    <p className="font-medium text-sm text-gray-900">{item.name}</p>
                    <p className="text-orange-600 font-semibold text-sm mt-1">
                      {formatCurrency(item.price)}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Sepet */}
            <div className="w-72 bg-white rounded-xl border flex flex-col">
              <div className="px-4 py-3 border-b flex items-center gap-2">
                <ShoppingCart size={18} className="text-orange-500" />
                <span className="font-semibold text-gray-900">Sepet</span>
              </div>
              <div className="flex-1 overflow-y-auto divide-y">
                {cart.map((item) => (
                  <div key={item.menuItemId} className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-900">{item.name}</p>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-2">
                        <button onClick={() => removeFromCart(item.menuItemId)} className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200">
                          <Minus size={12} />
                        </button>
                        <span className="text-sm font-semibold w-4 text-center">{item.qty}</span>
                        <button onClick={() => addToCart({ id: item.menuItemId, name: item.name, price: item.price } as MenuItem)} className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200">
                          <Plus size={12} />
                        </button>
                      </div>
                      <span className="text-sm text-gray-700">{formatCurrency(item.price * item.qty)}</span>
                    </div>
                  </div>
                ))}
                {cart.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-8">Sepet boş</p>
                )}
              </div>
              <div className="p-4 border-t">
                <div className="flex justify-between font-semibold mb-3">
                  <span>Toplam</span>
                  <span className="text-orange-600">{formatCurrency(cartTotal)}</span>
                </div>
                <button
                  onClick={submitOrder}
                  disabled={submitting || cart.length === 0}
                  className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white py-2.5 rounded-lg font-medium text-sm"
                >
                  {submitting ? 'Gönderiliyor...' : 'Siparişi Gönder'}
                </button>
                <button
                  onClick={() => { setShowNewOrder(false); setCart([]) }}
                  className="w-full mt-2 text-gray-500 hover:text-gray-700 text-sm py-1"
                >
                  İptal
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
