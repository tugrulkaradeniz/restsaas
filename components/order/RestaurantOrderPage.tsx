'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, ShoppingCart, Plus, Minus, X, Phone, User } from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'
import type { DeliveryZone } from '@/types/database'
import { CheckoutModal } from './CheckoutModal'

type OptionItem = { id: string; name: string; price_delta: number; sort_order: number; is_active: boolean }
type OptionGroup = { id: string; name: string; is_required: boolean; max_select: number; sort_order: number; options: OptionItem[] }
type MenuItem = {
  id: string; name: string; price: number; description_public: string | null
  image_url: string | null; calories: number | null; category_id: string
  option_groups: OptionGroup[]
}
type Category = { id: string; name: string; sort_order: number }
type Tenant = {
  id: string; slug: string; name: string; logo_url: string | null; address: string | null
  phone: string | null; lat: number | null; lng: number | null
  online_order_hours: Record<string, { open: string; close: string }> | null
}

export type CartItem = {
  menuItemId: string
  name: string
  basePrice: number
  quantity: number
  selectedOptions: { groupId: string; groupName: string; optionId: string; optionName: string; priceDelta: number }[]
  note: string
}

function cartItemTotal(item: CartItem): number {
  return (item.basePrice + item.selectedOptions.reduce((s, o) => s + o.priceDelta, 0)) * item.quantity
}

interface Props {
  tenant: Tenant
  categories: Category[]
  items: MenuItem[]
  zones: DeliveryZone[]
}

export function RestaurantOrderPage({ tenant, categories, items, zones }: Props) {
  const [cart, setCart] = useState<CartItem[]>([])
  const [cartOpen, setCartOpen] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [orderId, setOrderId] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState(categories[0]?.id ?? '')
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)
  const [selectedOptions, setSelectedOptions] = useState<CartItem['selectedOptions']>([])
  const [itemNote, setItemNote] = useState('')
  const [itemQty, setItemQty] = useState(1)
  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const cartCount = cart.reduce((s, i) => s + i.quantity, 0)
  const cartTotal = cart.reduce((s, i) => s + cartItemTotal(i), 0)

  function scrollToCategory(catId: string) {
    setActiveCategory(catId)
    categoryRefs.current[catId]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function openItem(item: MenuItem) {
    setSelectedItem(item)
    setSelectedOptions([])
    setItemNote('')
    setItemQty(1)
  }

  function toggleOption(group: OptionGroup, opt: OptionItem) {
    setSelectedOptions(prev => {
      const existing = prev.filter(o => o.groupId === group.id)
      const isSelected = existing.some(o => o.optionId === opt.id)
      if (isSelected) return prev.filter(o => !(o.groupId === group.id && o.optionId === opt.id))
      if (group.max_select === 1) {
        return [...prev.filter(o => o.groupId !== group.id), { groupId: group.id, groupName: group.name, optionId: opt.id, optionName: opt.name, priceDelta: opt.price_delta }]
      }
      if (existing.length >= group.max_select) {
        toast.error(`Maksimum ${group.max_select} seçebilirsin`)
        return prev
      }
      return [...prev, { groupId: group.id, groupName: group.name, optionId: opt.id, optionName: opt.name, priceDelta: opt.price_delta }]
    })
  }

  function addToCart() {
    if (!selectedItem) return
    const requiredGroups = selectedItem.option_groups.filter(g => g.is_required)
    for (const g of requiredGroups) {
      if (!selectedOptions.some(o => o.groupId === g.id)) {
        toast.error(`"${g.name}" seçimi zorunlu`)
        return
      }
    }
    setCart(prev => {
      const idx = prev.findIndex(i =>
        i.menuItemId === selectedItem.id &&
        JSON.stringify(i.selectedOptions.map(o => o.optionId).sort()) === JSON.stringify(selectedOptions.map(o => o.optionId).sort())
      )
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = { ...next[idx], quantity: next[idx].quantity + itemQty }
        return next
      }
      return [...prev, {
        menuItemId: selectedItem.id,
        name: selectedItem.name,
        basePrice: selectedItem.price,
        quantity: itemQty,
        selectedOptions,
        note: itemNote,
      }]
    })
    toast.success(`${selectedItem.name} sepete eklendi`)
    setSelectedItem(null)
  }

  function updateQty(menuItemId: string, optionKey: string, delta: number) {
    setCart(prev => prev.map(i => {
      const k = JSON.stringify(i.selectedOptions.map(o => o.optionId).sort())
      if (i.menuItemId !== menuItemId || k !== optionKey) return i
      const q = i.quantity + delta
      return q <= 0 ? null : { ...i, quantity: q }
    }).filter(Boolean) as CartItem[])
  }

  function removeFromCart(idx: number) {
    setCart(prev => prev.filter((_, i) => i !== idx))
  }

  const itemsByCategory = (catId: string) => items.filter(i => i.category_id === catId)

  if (orderId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-lg">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Siparişiniz Alındı!</h2>
          <p className="text-gray-500 text-sm mb-1">Sipariş No: <span className="font-mono font-bold">#{orderId.slice(-6).toUpperCase()}</span></p>
          <p className="text-gray-500 text-sm mb-6">Hazırladığımızda sizi arayacağız.</p>
          {tenant.phone && (
            <a href={`tel:${tenant.phone}`} className="flex items-center justify-center gap-2 text-orange-500 text-sm font-medium mb-6">
              <Phone size={14} /> {tenant.phone}
            </a>
          )}
          <button
            onClick={() => { setOrderId(null); setCart([]) }}
            className="w-full py-3 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600"
          >
            Yeni Sipariş Ver
          </button>
          <Link href="/order" className="block mt-3 text-sm text-gray-400 hover:text-gray-600">
            ← Diğer Restoranlar
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      {/* Header */}
      <div className="bg-white sticky top-0 z-30 border-b shadow-sm">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link href="/order" className="p-2 -ml-2 text-gray-400 hover:text-gray-600">
            <ArrowLeft size={20} />
          </Link>
          {tenant.logo_url ? (
            <Image src={tenant.logo_url} alt={tenant.name} width={36} height={36} className="rounded-lg object-cover" />
          ) : (
            <div className="w-9 h-9 rounded-lg bg-orange-100 flex items-center justify-center text-lg">🍽️</div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-gray-900 truncate">{tenant.name}</h1>
            {tenant.address && <p className="text-xs text-gray-400 truncate">{tenant.address}</p>}
          </div>
          <Link href="/account" className="p-2 text-gray-400 hover:text-orange-500 shrink-0" title="Hesabım">
            <User size={20} />
          </Link>
        </div>

        {/* Kategori tabları */}
        <div className="flex gap-1 px-3 pb-2 overflow-x-auto scrollbar-hide">
          {categories.map(c => (
            <button
              key={c.id}
              onClick={() => scrollToCategory(c.id)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors shrink-0 ${
                activeCategory === c.id ? 'bg-orange-500 text-white' : 'text-gray-600 hover:text-orange-500'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Menü */}
      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-8">
        {categories.map(cat => {
          const catItems = itemsByCategory(cat.id)
          if (!catItems.length) return null
          return (
            <div key={cat.id} ref={el => { categoryRefs.current[cat.id] = el }}>
              <h2 className="text-base font-bold text-gray-900 mb-3">{cat.name}</h2>
              <div className="space-y-2">
                {catItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => openItem(item)}
                    className="w-full bg-white rounded-xl border p-3 flex items-center gap-3 text-left hover:shadow-md transition-shadow"
                  >
                    {item.image_url && (
                      <Image src={item.image_url} alt={item.name} width={72} height={72}
                        className="w-18 h-18 rounded-lg object-cover shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm">{item.name}</p>
                      {item.description_public && (
                        <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{item.description_public}</p>
                      )}
                      {item.calories && (
                        <p className="text-xs text-gray-400 mt-0.5">{item.calories} kcal</p>
                      )}
                      <p className="text-sm font-bold text-orange-500 mt-1">{formatCurrency(item.price)}</p>
                    </div>
                    <div className="shrink-0 w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center">
                      <Plus size={16} className="text-white" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Sepet bar */}
      {cartCount > 0 && (
        <div className="fixed bottom-4 left-4 right-4 z-40 max-w-2xl mx-auto">
          <button
            onClick={() => setCartOpen(true)}
            className="w-full bg-orange-500 text-white rounded-2xl px-5 py-4 flex items-center justify-between shadow-lg hover:bg-orange-600"
          >
            <div className="flex items-center gap-3">
              <span className="bg-white/20 rounded-xl px-2.5 py-0.5 font-bold">{cartCount}</span>
              <span className="font-semibold">Sepeti Gör</span>
            </div>
            <span className="font-bold">{formatCurrency(cartTotal)}</span>
          </button>
        </div>
      )}

      {/* Ürün detay modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50" onClick={() => setSelectedItem(null)}>
          <div className="bg-white w-full max-w-md rounded-t-2xl md:rounded-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            {selectedItem.image_url && (
              <div className="relative h-48 rounded-t-2xl overflow-hidden">
                <Image src={selectedItem.image_url} alt={selectedItem.name} fill className="object-cover" />
                <button onClick={() => setSelectedItem(null)} className="absolute top-3 right-3 p-2 bg-black/40 rounded-full text-white">
                  <X size={16} />
                </button>
              </div>
            )}
            <div className="p-5">
              {!selectedItem.image_url && (
                <button onClick={() => setSelectedItem(null)} className="float-right p-1 text-gray-400"><X size={18} /></button>
              )}
              <h2 className="text-xl font-bold text-gray-900">{selectedItem.name}</h2>
              {selectedItem.description_public && (
                <p className="text-sm text-gray-500 mt-1">{selectedItem.description_public}</p>
              )}
              <p className="text-lg font-bold text-orange-500 mt-2">{formatCurrency(selectedItem.price)}</p>

              {/* Seçenek grupları */}
              {selectedItem.option_groups
                .filter(g => g.options.some(o => o.is_active))
                .sort((a, b) => a.sort_order - b.sort_order)
                .map(group => (
                  <div key={group.id} className="mt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold text-gray-900 text-sm">{group.name}</span>
                      {group.is_required && <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-medium">Zorunlu</span>}
                      {group.max_select > 1 && <span className="text-xs text-gray-400">Maks {group.max_select}</span>}
                    </div>
                    <div className="space-y-2">
                      {group.options.filter(o => o.is_active).sort((a, b) => a.sort_order - b.sort_order).map(opt => {
                        const isSelected = selectedOptions.some(o => o.optionId === opt.id)
                        return (
                          <button
                            key={opt.id}
                            onClick={() => toggleOption(group, opt)}
                            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-sm transition-colors ${
                              isSelected ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <span className="font-medium">{opt.name}</span>
                            <div className="flex items-center gap-2">
                              {opt.price_delta !== 0 && (
                                <span className="text-gray-500">
                                  {opt.price_delta > 0 ? `+${formatCurrency(opt.price_delta)}` : formatCurrency(opt.price_delta)}
                                </span>
                              )}
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-orange-500 bg-orange-500' : 'border-gray-300'}`}>
                                {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                              </div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))
              }

              {/* Not */}
              <div className="mt-4">
                <label className="text-xs text-gray-500 block mb-1">Not (opsiyonel)</label>
                <textarea
                  value={itemNote}
                  onChange={e => setItemNote(e.target.value)}
                  placeholder="Özel istek..."
                  rows={2}
                  className="w-full border rounded-xl px-3 py-2 text-sm resize-none"
                />
              </div>

              {/* Miktar + Ekle */}
              <div className="flex items-center gap-3 mt-5">
                <div className="flex items-center gap-2 border rounded-xl">
                  <button onClick={() => setItemQty(q => Math.max(1, q - 1))} className="px-3 py-2.5 text-gray-600 hover:text-gray-900">
                    <Minus size={16} />
                  </button>
                  <span className="w-8 text-center font-bold">{itemQty}</span>
                  <button onClick={() => setItemQty(q => q + 1)} className="px-3 py-2.5 text-gray-600 hover:text-gray-900">
                    <Plus size={16} />
                  </button>
                </div>
                <button onClick={addToCart} className="flex-1 bg-orange-500 text-white rounded-xl py-3 font-semibold hover:bg-orange-600">
                  Sepete Ekle · {formatCurrency((selectedItem.price + selectedOptions.reduce((s, o) => s + o.priceDelta, 0)) * itemQty)}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sepet modal */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50" onClick={() => setCartOpen(false)}>
          <div className="bg-white w-full max-w-md rounded-t-2xl md:rounded-2xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b shrink-0">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <ShoppingCart size={18} className="text-orange-500" /> Sepet
              </h2>
              <button onClick={() => setCartOpen(false)} className="p-1 text-gray-400"><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto divide-y">
              {cart.map((item, idx) => {
                const optKey = JSON.stringify(item.selectedOptions.map(o => o.optionId).sort())
                return (
                  <div key={`${item.menuItemId}-${idx}`} className="px-5 py-3 flex items-start gap-3">
                    <div className="flex items-center gap-1.5 border rounded-lg shrink-0">
                      <button onClick={() => updateQty(item.menuItemId, optKey, -1)} className="px-2 py-1 text-gray-500 hover:text-gray-900">
                        <Minus size={12} />
                      </button>
                      <span className="text-sm font-bold w-4 text-center">{item.quantity}</span>
                      <button onClick={() => updateQty(item.menuItemId, optKey, 1)} className="px-2 py-1 text-gray-500 hover:text-gray-900">
                        <Plus size={12} />
                      </button>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{item.name}</p>
                      {item.selectedOptions.length > 0 && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          {item.selectedOptions.map(o => o.optionName).join(', ')}
                        </p>
                      )}
                      {item.note && <p className="text-xs text-gray-400 italic mt-0.5">{item.note}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-gray-900">{formatCurrency(cartItemTotal(item))}</p>
                      <button onClick={() => removeFromCart(idx)} className="text-xs text-red-400 hover:text-red-600 mt-1">Kaldır</button>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="border-t px-5 py-4 shrink-0 space-y-3">
              <div className="flex items-center justify-between font-bold">
                <span>Toplam</span>
                <span className="text-orange-500 text-lg">{formatCurrency(cartTotal)}</span>
              </div>
              <button
                onClick={() => { setCartOpen(false); setCheckoutOpen(true) }}
                className="w-full bg-orange-500 text-white rounded-xl py-3.5 font-bold hover:bg-orange-600"
              >
                Siparişi Tamamla
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Checkout */}
      {checkoutOpen && (
        <CheckoutModal
          tenant={tenant}
          cart={cart}
          cartTotal={cartTotal}
          zones={zones}
          onClose={() => setCheckoutOpen(false)}
          onSuccess={(id) => { setCheckoutOpen(false); setCartOpen(false); setOrderId(id) }}
        />
      )}
    </div>
  )
}
