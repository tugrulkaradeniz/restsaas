'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { cn, formatCurrency } from '@/lib/utils'
import type { MenuCategory, MenuItem } from '@/types/database'
import type { Campaign, CampaignType, DiscountType } from './types'
import { CAMPAIGN_TYPE_LABELS, DAYS } from './types'
import { Clock, UtensilsCrossed, Gift, LayoutGrid, ShoppingBag, Plus, Trash2, X } from 'lucide-react'

const TYPE_META: Record<CampaignType, { icon: React.ReactNode; desc: string; color: string }> = {
  happy_hour:     { icon: <Clock size={22} />,          desc: 'Belirli saatlerde ürün/kategori indirimi',  color: 'text-orange-500 bg-orange-50 border-orange-200' },
  bundle:         { icon: <UtensilsCrossed size={22} />, desc: 'Birden fazla ürünü sabit fiyatla sun',      color: 'text-blue-500 bg-blue-50 border-blue-200' },
  bogo:           { icon: <Gift size={22} />,           desc: 'N adet alana M adet bedava',                color: 'text-green-500 bg-green-50 border-green-200' },
  category:       { icon: <LayoutGrid size={22} />,     desc: 'Tüm kategoriye indirim uygula',             color: 'text-purple-500 bg-purple-50 border-purple-200' },
  order_discount: { icon: <ShoppingBag size={22} />,    desc: 'Minimum tutarı aşan siparişlere indirim',   color: 'text-teal-500 bg-teal-50 border-teal-200' },
}

interface BundleRow { menu_item_id: string; quantity: string }

interface FormState {
  name:              string
  description:       string
  discount_type:     DiscountType
  value:             string
  bundle_price:      string
  min_order_amount:  string
  has_time:          boolean
  start_time:        string
  end_time:          string
  days_of_week:      number[]
  valid_from:        string
  valid_to:          string
  // happy_hour
  happy_item_ids:    string[]
  happy_applies_all: boolean
  // bundle
  bundle_rows:       BundleRow[]
  // bogo
  bogo_product_id:   string
  bogo_buy:          string
  bogo_free:         string
  // category
  category_id:       string
}

const blank = (type: CampaignType): FormState => ({
  name: '', description: '',
  discount_type: 'percent', value: '',
  bundle_price: '', min_order_amount: '',
  has_time: type === 'happy_hour',
  start_time: '11:00', end_time: '14:00',
  days_of_week: [1,2,3,4,5,6,0],
  valid_from: '', valid_to: '',
  happy_item_ids: [], happy_applies_all: true,
  bundle_rows: [{ menu_item_id: '', quantity: '1' }],
  bogo_product_id: '', bogo_buy: '2', bogo_free: '1',
  category_id: '',
})

function fromCampaign(c: Campaign): FormState {
  const type = c.type
  return {
    name: c.name, description: c.description ?? '',
    discount_type: c.discount_type ?? 'percent', value: String(c.value ?? ''),
    bundle_price: String(c.bundle_price ?? ''), min_order_amount: String(c.min_order_amount ?? ''),
    has_time: !!(c.start_time || c.end_time),
    start_time: c.start_time?.slice(0,5) ?? '11:00',
    end_time:   c.end_time?.slice(0,5)   ?? '14:00',
    days_of_week: c.days_of_week ?? [1,2,3,4,5,6,0],
    valid_from: c.valid_from ?? '', valid_to: c.valid_to ?? '',
    happy_item_ids: (c.items ?? []).filter(i => i.item_type === 'product').map(i => i.menu_item_id!),
    happy_applies_all: (c.items ?? []).length === 0,
    bundle_rows: type === 'bundle'
      ? (c.items ?? []).map(i => ({ menu_item_id: i.menu_item_id!, quantity: String(i.quantity) }))
      : [{ menu_item_id: '', quantity: '1' }],
    bogo_product_id: type === 'bogo' ? ((c.items ?? []).find(i => i.role === 'main')?.menu_item_id ?? '') : '',
    bogo_buy:  String((c.items ?? []).find(i => i.role === 'main')?.quantity ?? 2),
    bogo_free: String((c.items ?? []).find(i => i.role === 'free')?.quantity ?? 1),
    category_id: type === 'category' ? ((c.items ?? [])[0]?.category_id ?? '') : '',
  }
}

function buildItems(type: CampaignType, f: FormState) {
  if (type === 'happy_hour' && !f.happy_applies_all) {
    return f.happy_item_ids.map(id => ({ item_type: 'product', menu_item_id: id, quantity: 1, role: 'main' }))
  }
  if (type === 'bundle') {
    return f.bundle_rows
      .filter(r => r.menu_item_id)
      .map(r => ({ item_type: 'product', menu_item_id: r.menu_item_id, quantity: parseInt(r.quantity) || 1, role: 'bundled' }))
  }
  if (type === 'bogo' && f.bogo_product_id) {
    return [
      { item_type: 'product', menu_item_id: f.bogo_product_id, quantity: parseInt(f.bogo_buy) || 2, role: 'main' },
      { item_type: 'product', menu_item_id: f.bogo_product_id, quantity: parseInt(f.bogo_free) || 1, role: 'free' },
    ]
  }
  if (type === 'category' && f.category_id) {
    return [{ item_type: 'category', category_id: f.category_id, quantity: 1, role: 'main' }]
  }
  return []
}

interface Props {
  type:       CampaignType | null
  editing:    Campaign | null
  menuItems:  (MenuItem & { category?: { name: string } | null })[]
  categories: MenuCategory[]
  onClose:    () => void
  onSaved:    (c: Campaign) => void
}

export function CampaignModal({ type: initType, editing, menuItems, categories, onClose, onSaved }: Props) {
  const [step, setStep]   = useState<'type' | 'form'>(editing || initType ? 'form' : 'type')
  const [type, setType]   = useState<CampaignType | null>(editing?.type ?? initType ?? null)
  const [form, setForm]   = useState<FormState>(
    editing ? fromCampaign(editing) : (initType ? blank(initType) : blank('happy_hour'))
  )
  const [saving, setSaving] = useState(false)

  function set(patch: Partial<FormState>) { setForm(p => ({ ...p, ...patch })) }

  function selectType(t: CampaignType) {
    setType(t)
    setForm(blank(t))
    setStep('form')
  }

  function toggleDay(d: number) {
    set({ days_of_week: form.days_of_week.includes(d)
      ? form.days_of_week.filter(x => x !== d)
      : [...form.days_of_week, d]
    })
  }

  function toggleHappyItem(id: string) {
    set({ happy_item_ids: form.happy_item_ids.includes(id)
      ? form.happy_item_ids.filter(x => x !== id)
      : [...form.happy_item_ids, id]
    })
  }

  async function save() {
    if (!type) return
    if (!form.name.trim()) { toast.error('Kampanya adı girin'); return }
    if (type === 'bundle' && !form.bundle_price && !form.value) { toast.error('Kombo fiyatı veya indirim girin'); return }
    if (type === 'bogo' && !form.bogo_product_id) { toast.error('Ürün seçin'); return }
    if (type === 'category' && !form.category_id) { toast.error('Kategori seçin'); return }
    if ((type === 'happy_hour' || type === 'order_discount') && !form.value) { toast.error('İndirim değeri girin'); return }

    setSaving(true)

    const payload = {
      name:             form.name,
      type,
      description:      form.description || null,
      is_active:        editing?.is_active ?? true,
      discount_type:    (type !== 'bundle' || form.value) ? form.discount_type : null,
      value:            parseFloat(form.value) || 0,
      bundle_price:     form.bundle_price ? parseFloat(form.bundle_price) : null,
      min_order_amount: form.min_order_amount ? parseFloat(form.min_order_amount) : null,
      start_time:       form.has_time ? form.start_time : null,
      end_time:         form.has_time ? form.end_time   : null,
      days_of_week:     form.has_time ? form.days_of_week : null,
      valid_from:       form.valid_from || null,
      valid_to:         form.valid_to   || null,
      items:            buildItems(type, form),
    }

    const url    = editing ? `/api/campaigns/${editing.id}` : '/api/campaigns'
    const method = editing ? 'PATCH' : 'POST'
    const res    = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    const data   = await res.json()
    setSaving(false)

    if (!res.ok) { toast.error(data.error ?? 'Hata oluştu'); return }
    toast.success(editing ? 'Kampanya güncellendi' : 'Kampanya oluşturuldu')
    onSaved(data.campaign)
  }

  // ── TYPE SEÇİM EKRANI ──────────────────────────────────────────────────────
  if (step === 'type') return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900">Kampanya Türü Seçin</h2>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>
        <div className="space-y-2">
          {(Object.keys(TYPE_META) as CampaignType[]).map(t => (
            <button key={t} onClick={() => selectType(t)}
              className={cn('w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all hover:shadow-sm', TYPE_META[t].color)}>
              <div className="shrink-0">{TYPE_META[t].icon}</div>
              <div>
                <p className="font-semibold text-gray-900">{CAMPAIGN_TYPE_LABELS[t]}</p>
                <p className="text-xs text-gray-500 mt-0.5">{TYPE_META[t].desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )

  // ── FORM EKRANI ────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-white flex items-center justify-between px-6 py-4 border-b z-10">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">{CAMPAIGN_TYPE_LABELS[type!]}</p>
            <h2 className="text-lg font-bold text-gray-900">{editing ? 'Kampanyayı Düzenle' : 'Yeni Kampanya'}</h2>
          </div>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>

        <div className="p-6 space-y-5">

          {/* Temel bilgiler */}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kampanya Adı *</label>
              <input value={form.name} onChange={e => set({ name: e.target.value })}
                placeholder={type === 'happy_hour' ? 'Öğle Saati İndirimi' : type === 'bundle' ? 'Aile Komosu' : 'Kampanya adı'}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
              <input value={form.description} onChange={e => set({ description: e.target.value })}
                placeholder="Müşteriye gösterilecek kısa açıklama"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
            </div>
          </div>

          {/* ── HAPPY HOUR ── */}
          {type === 'happy_hour' && (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-gray-700">İndirim</p>
              <DiscountSection form={form} set={set} />
              <p className="text-sm font-semibold text-gray-700 pt-2">Hangi Ürünler</p>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={form.happy_applies_all} onChange={e => set({ happy_applies_all: e.target.checked })}
                  className="w-4 h-4 accent-orange-500" />
                Tüm ürünlere uygula
              </label>
              {!form.happy_applies_all && (
                <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto border rounded-lg p-2">
                  {menuItems.map(item => (
                    <label key={item.id} className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer hover:text-orange-600">
                      <input type="checkbox" checked={form.happy_item_ids.includes(item.id)} onChange={() => toggleHappyItem(item.id)}
                        className="w-3.5 h-3.5 accent-orange-500" />
                      <span className="truncate">{item.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── BUNDLE ── */}
          {type === 'bundle' && (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-gray-700">Kombo Ürünleri</p>
              <div className="space-y-2">
                {form.bundle_rows.map((row, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <select value={row.menu_item_id}
                      onChange={e => set({ bundle_rows: form.bundle_rows.map((r,i) => i===idx ? { ...r, menu_item_id: e.target.value } : r) })}
                      className="flex-1 border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500">
                      <option value="">Ürün seçin</option>
                      {menuItems.map(m => <option key={m.id} value={m.id}>{m.name} — {formatCurrency(m.price)}</option>)}
                    </select>
                    <input type="number" min="1" value={row.quantity}
                      onChange={e => set({ bundle_rows: form.bundle_rows.map((r,i) => i===idx ? { ...r, quantity: e.target.value } : r) })}
                      className="w-16 border rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-orange-500" />
                    {form.bundle_rows.length > 1 && (
                      <button onClick={() => set({ bundle_rows: form.bundle_rows.filter((_,i) => i!==idx) })}
                        className="text-red-300 hover:text-red-500"><Trash2 size={14} /></button>
                    )}
                  </div>
                ))}
              </div>
              <button onClick={() => set({ bundle_rows: [...form.bundle_rows, { menu_item_id: '', quantity: '1' }] })}
                className="flex items-center gap-1.5 text-sm text-orange-600 hover:text-orange-700 font-medium">
                <Plus size={14} /> Ürün Ekle
              </button>
              <p className="text-sm font-semibold text-gray-700 pt-2">Fiyatlandırma</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Kombo Fiyatı (₺)</label>
                  <input type="number" step="0.01" value={form.bundle_price} onChange={e => set({ bundle_price: e.target.value })}
                    placeholder="Örn: 150" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">veya % İndirim</label>
                  <input type="number" step="1" min="0" max="100" value={form.value} onChange={e => set({ value: e.target.value, discount_type: 'percent' })}
                    placeholder="Örn: 15" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
                </div>
              </div>
            </div>
          )}

          {/* ── BOGO ── */}
          {type === 'bogo' && (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-gray-700">Ürün Seç</p>
              <select value={form.bogo_product_id} onChange={e => set({ bogo_product_id: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500">
                <option value="">Ürün seçin</option>
                {menuItems.map(m => <option key={m.id} value={m.id}>{m.name} — {formatCurrency(m.price)}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Al (Kaç Adet) *</label>
                  <input type="number" min="1" value={form.bogo_buy} onChange={e => set({ bogo_buy: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-orange-500" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Bedava (Kaç Adet) *</label>
                  <input type="number" min="1" value={form.bogo_free} onChange={e => set({ bogo_free: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-orange-500" />
                </div>
              </div>
              <p className="text-xs text-gray-400">
                {form.bogo_buy && form.bogo_free ? `${form.bogo_buy} adet alana ${form.bogo_free} adet bedava` : ''}
              </p>
            </div>
          )}

          {/* ── CATEGORY ── */}
          {type === 'category' && (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-gray-700">Kategori</p>
              <select value={form.category_id} onChange={e => set({ category_id: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500">
                <option value="">Kategori seçin</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <p className="text-sm font-semibold text-gray-700 pt-1">İndirim</p>
              <DiscountSection form={form} set={set} />
            </div>
          )}

          {/* ── ORDER DISCOUNT ── */}
          {type === 'order_discount' && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Sipariş Tutarı (₺) *</label>
                <input type="number" step="0.01" value={form.min_order_amount} onChange={e => set({ min_order_amount: e.target.value })}
                  placeholder="Örn: 200" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
              </div>
              <p className="text-sm font-semibold text-gray-700">İndirim</p>
              <DiscountSection form={form} set={set} />
            </div>
          )}

          {/* ── ZAMAN KISITI ── */}
          <div className="border rounded-xl p-4 space-y-3">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 cursor-pointer">
              <input type="checkbox" checked={form.has_time} onChange={e => set({ has_time: e.target.checked })}
                className="w-4 h-4 accent-orange-500" />
              Saat kısıtı ekle
            </label>
            {form.has_time && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Başlangıç</label>
                    <input type="time" value={form.start_time} onChange={e => set({ start_time: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Bitiş</label>
                    <input type="time" value={form.end_time} onChange={e => set({ end_time: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-2">Günler</label>
                  <div className="flex gap-1.5 flex-wrap">
                    {DAYS.map(d => (
                      <button key={d.value} type="button" onClick={() => toggleDay(d.value)}
                        className={cn('px-3 py-1 rounded-full text-xs border font-medium transition-colors',
                          form.days_of_week.includes(d.value)
                            ? 'bg-orange-500 border-orange-500 text-white'
                            : 'bg-white border-gray-200 text-gray-500 hover:border-orange-300')}>
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* ── GEÇERLİLİK TARİHİ ── */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Başlangıç Tarihi</label>
              <input type="date" value={form.valid_from} onChange={e => set({ valid_from: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Bitiş Tarihi</label>
              <input type="date" value={form.valid_to} onChange={e => set({ valid_to: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
            </div>
          </div>

        </div>

        <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex gap-2">
          <button onClick={save} disabled={saving}
            className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white py-2.5 rounded-lg font-medium text-sm">
            {saving ? 'Kaydediliyor...' : editing ? 'Güncelle' : 'Kampanyayı Oluştur'}
          </button>
          <button onClick={onClose}
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-lg font-medium text-sm">
            İptal
          </button>
        </div>
      </div>
    </div>
  )
}

function DiscountSection({ form, set }: { form: FormState; set: (p: Partial<FormState>) => void }) {
  return (
    <div className="flex gap-2 items-center">
      <div className="flex rounded-lg border overflow-hidden shrink-0">
        <button type="button" onClick={() => set({ discount_type: 'percent' })}
          className={cn('px-3 py-2 text-sm font-medium transition-colors',
            form.discount_type === 'percent' ? 'bg-orange-500 text-white' : 'bg-white text-gray-500 hover:bg-gray-50')}>
          %
        </button>
        <button type="button" onClick={() => set({ discount_type: 'fixed' })}
          className={cn('px-3 py-2 text-sm font-medium transition-colors border-l',
            form.discount_type === 'fixed' ? 'bg-orange-500 text-white' : 'bg-white text-gray-500 hover:bg-gray-50')}>
          ₺
        </button>
      </div>
      <input type="number" step="0.01" min="0" value={form.value} onChange={e => set({ value: e.target.value })}
        placeholder={form.discount_type === 'percent' ? 'Örn: 20' : 'Örn: 50'}
        className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
      <span className="text-sm text-gray-500 shrink-0">{form.discount_type === 'percent' ? '% indirim' : '₺ indirim'}</span>
    </div>
  )
}
