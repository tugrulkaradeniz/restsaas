'use client'

import { useState, useEffect } from 'react'
import { Stage, Layer, Rect, Circle, Text, Group } from 'react-konva'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { cn, formatCurrency } from '@/lib/utils'
import type {
  Order, Table, MenuCategory, MenuItem, OrderItem,
  OrderStatus, FloorPlan, FloorPlanTable, TableStatus,
} from '@/types/database'
import { Plus, Minus, ShoppingCart, Pencil, X, CreditCard, Banknote, Smartphone, LayoutGrid, Printer, BellRing, Check } from 'lucide-react'
import type { WaiterCall } from '@/types/database'

type PendingCall = WaiterCall & { tableName: string }
import { printReceipt } from '@/lib/print'

type FullOrder = Order & {
  table: Pick<Table, 'id' | 'name'> | null
  waiter: { full_name: string } | null
  items: (OrderItem & { menu_item: Pick<MenuItem, 'id' | 'name' | 'price'> | null })[]
}

type FullCategory = MenuCategory & { items: MenuItem[] }

interface CartItem {
  menuItemId: string
  name: string
  price: number
  qty: number
  note: string
}

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

const TABLE_COLORS: Record<TableStatus, string> = {
  empty:    '#22c55e',
  occupied: '#ef4444',
  reserved: '#f59e0b',
  dirty:    '#6b7280',
}

const ACTIVE_STATUSES = ['confirmed', 'preparing', 'ready', 'delivered']

interface Props {
  tenantId: string
  tenantName: string
  tenantAddress?: string | null
  initialOrders: FullOrder[]
  tables: Table[]
  categories: FullCategory[]
  floorPlans: FloorPlan[]
}

type PanelMode = 'none' | 'idle' | 'taking_order' | 'view_order'

const TABLE_W = 80
const TABLE_H = 60

export function OrdersView({ tenantId, tenantName, tenantAddress, initialOrders, tables, categories, floorPlans }: Props) {
  const [orders, setOrders] = useState<FullOrder[]>(initialOrders)
  const [activePlanIdx, setActivePlanIdx] = useState(0)
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null)
  const [panelMode, setPanelMode] = useState<PanelMode>('none')
  const [activeCategoryId, setActiveCategoryId] = useState(categories[0]?.id ?? '')
  const [pendingCalls, setPendingCalls] = useState<PendingCall[]>([])
  const [mobileView, setMobileView] = useState<'plan' | 'panel'>('plan')
  const [cart, setCart] = useState<CartItem[]>([])
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [confirmPaymentId, setConfirmPaymentId] = useState<string | null>(null)
  const supabase = createClient()

  const activePlan = floorPlans[activePlanIdx]
  const layout = (activePlan?.layout ?? { tables: [], walls: [] }) as { tables: FloorPlanTable[]; walls: unknown[] }

  // Hangi masalar şu an dolu
  const occupiedTableIds = new Set(
    orders
      .filter(o => ACTIVE_STATUSES.includes(o.status))
      .map(o => o.table_id)
      .filter(Boolean) as string[]
  )

  function getTableStatus(tableId: string): TableStatus {
    if (occupiedTableIds.has(tableId)) return 'occupied'
    const t = tables.find(t => t.id === tableId)
    return t?.status ?? 'empty'
  }

  const selectedTable = tables.find(t => t.id === selectedTableId)
  const selectedTableOrder = selectedTableId
    ? orders.find(o => o.table_id === selectedTableId && ACTIVE_STATUSES.includes(o.status))
    : undefined

  // Realtime subscriptions
  useEffect(() => {
    const ordersChannel = supabase
      .channel('orders-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
        if (payload.eventType === 'UPDATE') {
          const u = payload.new as Order
          setOrders(prev => {
            const existing = prev.find(o => o.id === u.id)
            // Yemek hazır bildirimi
            if (existing && u.status === 'ready' && existing.status !== 'ready') {
              const tableName = existing.table?.name ?? 'Paket sipariş'
              toast.success(`🍽️ ${tableName} hazır! Servis edilebilir.`, {
                duration: 15_000,
                style: { background: '#16a34a', color: '#fff' },
              })
            }
            return prev.map(o => o.id === u.id ? { ...o, status: u.status, total_amount: u.total_amount } : o)
          })
        }
        if (payload.eventType === 'DELETE') {
          setOrders(prev => prev.filter(o => o.id !== (payload.old as Order).id))
        }
      })
      .subscribe()

    const callsChannel = supabase
      .channel('waiter-calls-realtime')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'waiter_calls', filter: `tenant_id=eq.${tenantId}` },
        (payload) => {
          const call = payload.new as WaiterCall
          const tbl  = tables.find(t => t.id === call.table_id)
          const tableName = tbl?.name ?? 'Bilinmeyen masa'
          const pending: PendingCall = { ...call, tableName }
          setPendingCalls(prev => [...prev, pending])
          toast(`🔔 ${tableName} garson çağırıyor!`, {
            duration: 60_000,
            action: {
              label: 'Gidiyorum',
              onClick: () => answerCall(call.id),
            },
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(ordersChannel)
      supabase.removeChannel(callsChannel)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function answerCall(callId: string) {
    await supabase.from('waiter_calls').update({ status: 'answered' }).eq('id', callId)
    setPendingCalls(prev => prev.filter(c => c.id !== callId))
  }

  function handleTableClick(tableId: string) {
    setSelectedTableId(tableId)
    setCart([])
    setEditingNoteId(null)
    const hasOrder = orders.some(o => o.table_id === tableId && ACTIVE_STATUSES.includes(o.status))
    setPanelMode(hasOrder ? 'view_order' : 'idle')
    setMobileView('panel')
  }

  function backToTables() {
    setMobileView('plan')
    setSelectedTableId(null)
    setPanelMode('none')
    setCart([])
  }

  function addToCart(item: { id: string; name: string; price: number }) {
    setCart(prev => {
      const ex = prev.find(c => c.menuItemId === item.id)
      if (ex) return prev.map(c => c.menuItemId === item.id ? { ...c, qty: c.qty + 1 } : c)
      return [...prev, { menuItemId: item.id, name: item.name, price: item.price, qty: 1, note: '' }]
    })
  }

  function removeFromCart(menuItemId: string) {
    setCart(prev => {
      const ex = prev.find(c => c.menuItemId === menuItemId)
      if (!ex || ex.qty <= 1) return prev.filter(c => c.menuItemId !== menuItemId)
      return prev.map(c => c.menuItemId === menuItemId ? { ...c, qty: c.qty - 1 } : c)
    })
  }

  function setNote(menuItemId: string, note: string) {
    setCart(prev => prev.map(c => c.menuItemId === menuItemId ? { ...c, note } : c))
  }

  const cartTotal = cart.reduce((s, c) => s + c.price * c.qty, 0)

  async function submitOrder() {
    if (!selectedTableId || cart.length === 0) return
    setSubmitting(true)

    // İlave sipariş: mevcut siparişe ürün ekleme
    if (selectedTableOrder && !['paid', 'cancelled'].includes(selectedTableOrder.status)) {
      const { error: iErr } = await supabase.from('order_items').insert(
        cart.map(c => ({
          order_id: selectedTableOrder.id,
          menu_item_id: c.menuItemId,
          quantity: c.qty,
          unit_price: c.price,
          note: c.note || null,
          status: 'pending',
        }))
      )
      if (iErr) { toast.error(iErr.message); setSubmitting(false); return }

      const newTotal = selectedTableOrder.total_amount + cartTotal
      await supabase.from('orders').update({ total_amount: newTotal }).eq('id', selectedTableOrder.id)

      const { data: full } = await supabase
        .from('orders')
        .select('*, table:tables(id,name), waiter:users(full_name), items:order_items(*, menu_item:menu_items(id,name,price))')
        .eq('id', selectedTableOrder.id)
        .single()

      if (full) setOrders(prev => prev.map(o => o.id === selectedTableOrder.id ? (full as unknown as FullOrder) : o))
      setCart([])
      setPanelMode('view_order')
      setSubmitting(false)
      toast.success('İlave sipariş eklendi')
      return
    }

    // Yeni sipariş
    const { data: order, error: oErr } = await supabase
      .from('orders')
      .insert({
        tenant_id: tenantId,
        table_id: selectedTableId,
        source: 'waiter',
        status: 'confirmed',
        total_amount: cartTotal,
      })
      .select('*, table:tables(id,name), waiter:users(full_name), items:order_items(*, menu_item:menu_items(id,name,price))')
      .single()

    if (oErr || !order) { toast.error(oErr?.message); setSubmitting(false); return }

    const { error: iErr } = await supabase.from('order_items').insert(
      cart.map(c => ({
        order_id: order.id,
        menu_item_id: c.menuItemId,
        quantity: c.qty,
        unit_price: c.price,
        note: c.note || null,
        status: 'pending',
      }))
    )
    if (iErr) { toast.error(iErr.message); setSubmitting(false); return }

    const { data: full } = await supabase
      .from('orders')
      .select('*, table:tables(id,name), waiter:users(full_name), items:order_items(*, menu_item:menu_items(id,name,price))')
      .eq('id', order.id)
      .single()

    setOrders(prev => [full as unknown as FullOrder, ...prev])
    setCart([])
    setPanelMode('view_order')
    setSubmitting(false)
    toast.success('Sipariş oluşturuldu')
  }

  async function updateOrderStatus(orderId: string, status: OrderStatus, paymentMethod?: string) {
    const update: { status: OrderStatus; payment_method?: string } = { status }
    if (paymentMethod) update.payment_method = paymentMethod
    const { error } = await supabase.from('orders').update(update).eq('id', orderId)
    if (error) { toast.error(error.message); return }
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o))
    if (status === 'paid' || status === 'cancelled') {
      setPanelMode('idle')
      toast.success(status === 'paid' ? 'Hesap alındı' : 'İptal edildi')
    }
  }

  async function collectPayment(orderId: string, method: string) {
    const order = orders.find(o => o.id === orderId)
    const table = tables.find(t => t.id === order?.table_id)
    setConfirmPaymentId(null)
    await updateOrderStatus(orderId, 'paid', method)
    if (order) {
      printReceipt({
        tenantName,
        tenantAddress,
        tableName: table?.name ?? order.table?.name ?? 'Paket',
        orderCreatedAt: order.created_at,
        items: (order.items ?? []).map(i => ({
          name: i.menu_item?.name ?? '?',
          quantity: i.quantity,
          unit_price: i.unit_price,
          note: i.note,
        })),
        totalAmount: order.total_amount,
        paymentMethod: method,
      })
    }
  }

  const activeItems = categories.find(c => c.id === activeCategoryId)?.items.filter(i => i.is_available) ?? []

  // Tablodan masalar (floor plan dışındakiler için fallback)
  const tablesNotOnPlan = tables.filter(t => !floorPlans.some(fp =>
    (fp.layout as { tables: FloorPlanTable[] })?.tables?.some(lt => lt.id === t.id)
  ))

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Garson çağrıları banner */}
      {pendingCalls.length > 0 && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center gap-3 shrink-0">
          <BellRing size={16} className="text-amber-500 animate-bounce shrink-0" />
          <div className="flex-1 flex flex-wrap gap-2">
            {pendingCalls.map(call => (
              <span key={call.id} className="flex items-center gap-1.5 bg-amber-100 border border-amber-300 text-amber-800 text-xs px-2.5 py-1 rounded-full font-medium">
                🔔 {call.tableName} çağırıyor
                <button onClick={() => answerCall(call.id)} className="hover:text-green-700 ml-0.5">
                  <Check size={12} />
                </button>
              </span>
            ))}
          </div>
          <span className="text-xs text-amber-600 shrink-0">{pendingCalls.length} bekleyen</span>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
      {/* ===== Sol: Floor plan ===== */}
      <div className={cn(
        'flex-col bg-white border-r shrink-0 w-full md:w-[58%]',
        mobileView === 'panel' ? 'hidden md:flex' : 'flex'
      )}>
        {/* Alan sekmeleri */}
        <div className="flex items-center gap-1 px-3 py-2 border-b bg-gray-50 overflow-x-auto shrink-0">
          {floorPlans.map((fp, i) => (
            <button
              key={fp.id}
              onClick={() => setActivePlanIdx(i)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors shrink-0',
                i === activePlanIdx ? 'bg-orange-500 text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'
              )}
            >
              {fp.name}
            </button>
          ))}
          {tablesNotOnPlan.length > 0 && (
            <button
              onClick={() => setActivePlanIdx(-1)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors shrink-0',
                activePlanIdx === -1 ? 'bg-orange-500 text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'
              )}
            >
              Tüm Masalar
            </button>
          )}
          {floorPlans.length === 0 && tablesNotOnPlan.length === 0 && (
            <span className="text-sm text-gray-400 px-2">
              Masa planı yok — /tables sayfasından oluşturun
            </span>
          )}
        </div>

        {/* Canvas veya grid */}
        <div className="flex-1 overflow-auto relative">
          {activePlanIdx >= 0 && activePlan ? (
            layout.tables.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
                <LayoutGrid size={36} className="text-gray-300" />
                <p className="text-sm">Bu alanda henüz masa yok</p>
                <p className="text-xs text-gray-300">Masa Planı sayfasından masa ekleyin</p>
              </div>
            ) : (
              <Stage
                width={760}
                height={520}
                onClick={(e) => { if (e.target === e.target.getStage()) setSelectedTableId(null) }}
              >
                <Layer>
                  {layout.tables.map((lt: FloorPlanTable) => {
                    const table = tables.find(t => t.id === lt.id)
                    const status = getTableStatus(lt.id)
                    const color = TABLE_COLORS[status]
                    const isSelected = selectedTableId === lt.id

                    return (
                      <Group
                        key={lt.id}
                        x={lt.x}
                        y={lt.y}
                        rotation={lt.rotation ?? 0}
                        onClick={() => handleTableClick(lt.id)}
                      >
                        {lt.shape === 'round' ? (
                          <Circle
                            radius={TABLE_W / 2}
                            fill={color}
                            stroke={isSelected ? '#1d4ed8' : 'white'}
                            strokeWidth={isSelected ? 3 : 2}
                            opacity={0.9}
                          />
                        ) : (
                          <Rect
                            x={-TABLE_W / 2}
                            y={-TABLE_H / 2}
                            width={TABLE_W}
                            height={TABLE_H}
                            cornerRadius={8}
                            fill={color}
                            stroke={isSelected ? '#1d4ed8' : 'white'}
                            strokeWidth={isSelected ? 3 : 2}
                            opacity={0.9}
                          />
                        )}
                        <Text
                          text={table?.name ?? '?'}
                          x={-TABLE_W / 2}
                          y={-10}
                          width={TABLE_W}
                          align="center"
                          fill="white"
                          fontStyle="bold"
                          fontSize={13}
                        />
                        <Text
                          text={table?.capacity ? `${table.capacity} kişi` : ''}
                          x={-TABLE_W / 2}
                          y={6}
                          width={TABLE_W}
                          align="center"
                          fill="rgba(255,255,255,0.8)"
                          fontSize={10}
                        />
                      </Group>
                    )
                  })}
                </Layer>
              </Stage>
            )
          ) : (
            // Fallback grid
            <div className="p-4">
              <p className="text-xs text-gray-400 mb-3">Tüm masalar</p>
              <div className="grid grid-cols-4 gap-2">
                {tables.map(t => {
                  const status = getTableStatus(t.id)
                  return (
                    <button
                      key={t.id}
                      onClick={() => handleTableClick(t.id)}
                      className={cn(
                        'p-3 rounded-xl border-2 text-left transition-all',
                        selectedTableId === t.id ? 'border-blue-500 ring-2 ring-blue-200' : 'border-transparent',
                        status === 'occupied' ? 'bg-red-50' : status === 'reserved' ? 'bg-yellow-50' : 'bg-green-50'
                      )}
                    >
                      <p className="font-semibold text-sm text-gray-900">{t.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{t.capacity} kişi</p>
                      <p className="text-xs font-medium mt-1" style={{ color: TABLE_COLORS[status] }}>
                        {{ empty: 'Boş', occupied: 'Dolu', reserved: 'Rezerve', dirty: 'Kirli' }[status]}
                      </p>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-5 px-4 py-2 border-t bg-gray-50 shrink-0">
          {(Object.entries(TABLE_COLORS) as [TableStatus, string][]).map(([s, c]) => (
            <div key={s} className="flex items-center gap-1.5 text-xs text-gray-600">
              <div className="w-3 h-3 rounded-full" style={{ background: c }} />
              {{ empty: 'Boş', occupied: 'Dolu', reserved: 'Rezerve', dirty: 'Kirli' }[s]}
            </div>
          ))}
        </div>
      </div>

      {/* ===== Sağ: Sipariş paneli ===== */}
      <div className={cn(
        'flex-col bg-gray-50 overflow-hidden flex-1',
        mobileView === 'plan' ? 'hidden md:flex' : 'flex'
      )}>
        {/* Mobile: masalara dön */}
        <button
          onClick={backToTables}
          className="md:hidden flex items-center gap-2 px-4 py-2.5 bg-white border-b text-sm font-medium text-gray-600 hover:bg-gray-50 shrink-0"
        >
          ← Masalara Dön
        </button>

        {/* Masa seçilmedi */}
        {panelMode === 'none' && (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
            <LayoutGrid size={40} className="text-gray-300" />
            <p className="text-sm">Sol taraftan bir masaya tıklayın</p>
          </div>
        )}

        {/* Masa seçildi, sipariş yok */}
        {panelMode === 'idle' && selectedTable && (
          <div className="flex flex-col items-center justify-center h-full gap-4 p-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{selectedTable.name}</p>
              <p className="text-gray-500 mt-1">{selectedTable.capacity} kişilik · Boş</p>
            </div>
            <button
              onClick={() => setPanelMode('taking_order')}
              className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-xl font-medium text-base"
            >
              <Plus size={18} /> Sipariş Aç
            </button>
            <button
              onClick={() => { setSelectedTableId(null); setPanelMode('none') }}
              className="text-sm text-gray-400 hover:text-gray-600"
            >
              İptal
            </button>
          </div>
        )}

        {/* Sipariş alınıyor: menü + sepet */}
        {panelMode === 'taking_order' && selectedTable && (
          <div className="flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 bg-white border-b flex items-center justify-between shrink-0">
              <div>
                <p className="font-bold text-gray-900">{selectedTable.name}</p>
                <p className="text-xs text-gray-500">
                  {selectedTableOrder ? '➕ İlave Sipariş' : 'Yeni Sipariş'}
                </p>
              </div>
              <button
                onClick={() => {
                  setCart([])
                  setPanelMode(selectedTableOrder ? 'view_order' : 'idle')
                }}
                className="p-1.5 text-gray-400 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>

            {/* Kategori sekmeleri */}
            <div className="flex gap-1 px-2 py-2 border-b bg-white overflow-x-auto shrink-0">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategoryId(cat.id)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors',
                    activeCategoryId === cat.id ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  )}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Ürünler */}
            <div className="flex-1 overflow-auto p-2 grid grid-cols-2 gap-2 content-start">
              {activeItems.map(item => {
                const inCart = cart.find(c => c.menuItemId === item.id)
                return (
                  <div
                    key={item.id}
                    onClick={() => !inCart && addToCart(item)}
                    className={cn(
                      'text-left p-3 border rounded-xl bg-white transition-colors relative',
                      inCart ? 'border-orange-300 cursor-default' : 'hover:border-orange-200 cursor-pointer'
                    )}
                  >
                    {inCart ? (
                      <div className="absolute top-2 right-2 flex items-center gap-1 bg-orange-500 rounded-full px-1.5 py-0.5">
                        <button
                          onClick={e => { e.stopPropagation(); removeFromCart(item.id) }}
                          className="text-white hover:text-orange-200 leading-none"
                        >
                          <Minus size={11} />
                        </button>
                        <span className="text-white text-xs font-bold w-4 text-center">{inCart.qty}</span>
                        <button
                          onClick={e => { e.stopPropagation(); addToCart(item) }}
                          className="text-white hover:text-orange-200 leading-none"
                        >
                          <Plus size={11} />
                        </button>
                      </div>
                    ) : null}
                    <p className="text-sm font-medium text-gray-900 pr-14 leading-tight">{item.name}</p>
                    <p className="text-orange-600 font-semibold text-sm mt-1">{formatCurrency(item.price)}</p>
                  </div>
                )
              })}
              {activeItems.length === 0 && (
                <p className="col-span-2 text-center text-gray-400 text-sm py-8">Bu kategoride ürün yok</p>
              )}
            </div>

            {/* Sepet */}
            {cart.length > 0 && (
              <div className="border-t bg-white shrink-0 max-h-52 flex flex-col">
                <div className="overflow-auto flex-1 px-3 py-2 space-y-1.5">
                  {cart.map(item => (
                    <div key={item.menuItemId}>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => removeFromCart(item.menuItemId)}
                          className="text-red-400 hover:text-red-600 shrink-0"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="flex-1 text-sm text-gray-800 truncate">{item.name}</span>
                        <button
                          onClick={() => setEditingNoteId(editingNoteId === item.menuItemId ? null : item.menuItemId)}
                          className="text-gray-300 hover:text-orange-500 shrink-0"
                        >
                          <Pencil size={11} />
                        </button>
                        <span className="text-xs text-gray-500 shrink-0">x{item.qty}</span>
                        <span className="text-sm font-medium w-16 text-right shrink-0">
                          {formatCurrency(item.price * item.qty)}
                        </span>
                      </div>
                      {editingNoteId === item.menuItemId && (
                        <input
                          autoFocus
                          value={item.note}
                          onChange={e => setNote(item.menuItemId, e.target.value)}
                          onBlur={() => setEditingNoteId(null)}
                          placeholder="Soğansız, az pişmiş…"
                          className="mt-1 w-full border rounded-lg px-2 py-1 text-xs"
                        />
                      )}
                      {item.note && editingNoteId !== item.menuItemId && (
                        <p className="text-xs text-orange-500 ml-5">&quot;{item.note}&quot;</p>
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between px-3 py-2.5 border-t">
                  <span className="font-bold text-gray-900">{formatCurrency(cartTotal)}</span>
                  <button
                    onClick={submitOrder}
                    disabled={submitting}
                    className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium"
                  >
                    <ShoppingCart size={14} />
                    {submitting ? 'Gönderiliyor...' : 'Sipariş Ver'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Mevcut sipariş görüntüleme */}
        {panelMode === 'view_order' && selectedTable && selectedTableOrder && (
          <div className="flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 bg-white border-b flex items-center justify-between shrink-0">
              <div>
                <p className="font-bold text-gray-900">{selectedTable.name}</p>
                <p className="text-xs text-gray-500">{selectedTable.capacity} kişilik</p>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={cn('text-xs px-2.5 py-1 rounded-full font-medium', STATUS_COLOR[selectedTableOrder.status])}>
                  {STATUS_LABEL[selectedTableOrder.status]}
                </span>
                <button
                  title="Adisyon Yazdır"
                  onClick={() => printReceipt({
                    tenantName,
                    tenantAddress,
                    tableName: selectedTable.name,
                    orderCreatedAt: selectedTableOrder.created_at,
                    items: (selectedTableOrder.items ?? []).map(i => ({
                      name: i.menu_item?.name ?? '?',
                      quantity: i.quantity,
                      unit_price: i.unit_price,
                      note: i.note,
                    })),
                    totalAmount: selectedTableOrder.total_amount,
                    paymentMethod: selectedTableOrder.payment_method,
                  })}
                  className="p-1.5 text-gray-400 hover:text-orange-500"
                >
                  <Printer size={16} />
                </button>
                <button
                  onClick={() => { setSelectedTableId(null); setPanelMode('none') }}
                  className="p-1.5 text-gray-400 hover:text-gray-600"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Sipariş kalemleri */}
            <div className="flex-1 overflow-auto p-4">
              <div className="bg-white rounded-xl border divide-y">
                {selectedTableOrder.items?.map(item => (
                  <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                    <span className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                      {item.quantity}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{item.menu_item?.name ?? '?'}</p>
                      {item.note && <p className="text-xs text-orange-500 truncate">Not: {item.note}</p>}
                    </div>
                    <span className="text-sm text-gray-700 shrink-0">{formatCurrency(item.unit_price * item.quantity)}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50">
                  <span className="font-semibold text-gray-900">Toplam</span>
                  <span className="font-bold text-lg text-orange-600">{formatCurrency(selectedTableOrder.total_amount)}</span>
                </div>
              </div>
            </div>

            {/* Aksiyonlar */}
            {!['paid','cancelled'].includes(selectedTableOrder.status) && (
              <div className="p-4 border-t bg-white shrink-0 space-y-2">
                {confirmPaymentId === selectedTableOrder.id ? (
                  <div className="bg-gray-50 border rounded-xl p-3 space-y-2">
                    <p className="text-xs text-center text-gray-500 uppercase tracking-wide font-medium">
                      Ödeme Yöntemi — {formatCurrency(selectedTableOrder.total_amount)}
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => collectPayment(selectedTableOrder.id, 'cash')}
                        className="flex flex-col items-center gap-1.5 py-3 bg-white border-2 border-transparent hover:border-emerald-400 rounded-xl transition-colors"
                      >
                        <Banknote size={22} className="text-emerald-600" />
                        <span className="text-xs font-semibold text-gray-700">Nakit</span>
                      </button>
                      <button
                        onClick={() => collectPayment(selectedTableOrder.id, 'card')}
                        className="flex flex-col items-center gap-1.5 py-3 bg-white border-2 border-transparent hover:border-blue-400 rounded-xl transition-colors"
                      >
                        <CreditCard size={22} className="text-blue-600" />
                        <span className="text-xs font-semibold text-gray-700">Kredi Kartı</span>
                      </button>
                      <button
                        onClick={() => collectPayment(selectedTableOrder.id, 'pos')}
                        className="flex flex-col items-center gap-1.5 py-3 bg-white border-2 border-transparent hover:border-purple-400 rounded-xl transition-colors"
                      >
                        <Smartphone size={22} className="text-purple-600" />
                        <span className="text-xs font-semibold text-gray-700">POS / QR</span>
                      </button>
                    </div>
                    <button
                      onClick={() => setConfirmPaymentId(null)}
                      className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-sm"
                    >
                      İptal
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => setConfirmPaymentId(selectedTableOrder.id)}
                      className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-xl font-semibold text-base"
                    >
                      <CreditCard size={18} /> Hesap Al
                    </button>
                    <button
                      onClick={() => { setCart([]); setPanelMode('taking_order') }}
                      className="w-full flex items-center justify-center gap-2 bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 py-2.5 rounded-xl font-semibold text-sm"
                    >
                      <Plus size={16} /> İlave Sipariş Ekle
                    </button>
                  </>
                )}
                <div className="flex gap-2">
                  {selectedTableOrder.status === 'pending' && (
                    <button
                      onClick={() => updateOrderStatus(selectedTableOrder.id, 'confirmed')}
                      className="flex-1 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200"
                    >
                      Onayla
                    </button>
                  )}
                  {selectedTableOrder.status === 'ready' && (
                    <button
                      onClick={() => updateOrderStatus(selectedTableOrder.id, 'delivered')}
                      className="flex-1 py-2 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-200"
                    >
                      Teslim Edildi
                    </button>
                  )}
                  <button
                    onClick={() => updateOrderStatus(selectedTableOrder.id, 'cancelled')}
                    className="flex-1 py-2 bg-red-100 text-red-600 rounded-lg text-sm font-medium hover:bg-red-200"
                  >
                    İptal Et
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      </div>
    </div>
  )
}
