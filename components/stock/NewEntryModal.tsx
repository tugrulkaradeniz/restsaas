'use client'

import { useState, useMemo } from 'react'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'
import type { Ingredient, Supplier } from '@/types/database'
import type { StockEntry, PaymentMethod } from './types'
import { Plus, Trash2, X } from 'lucide-react'

const KDV_RATES = [0, 1, 8, 10, 18, 20]
const METHOD_LABEL: Record<string, string> = {
  cash: 'Nakit', bank: 'Banka Havalesi', card: 'Kredi Kartı', check: 'Çek',
}

interface LineItem {
  ingredient_id: string
  quantity:      string
  unit_cost:     string
  kdv_rate:      string
  kdv_included:  boolean
}

const blankLine = (): LineItem => ({ ingredient_id: '', quantity: '', unit_cost: '', kdv_rate: '18', kdv_included: false })

function round2(n: number) { return Math.round(n * 100) / 100 }

function computeLine(l: LineItem) {
  const qty  = parseFloat(l.quantity)  || 0
  const uc   = parseFloat(l.unit_cost) || 0
  const rate = parseFloat(l.kdv_rate)  || 0
  if (qty === 0 || uc === 0) return { subtotal: 0, kdv_amount: 0, total: 0 }

  if (l.kdv_included) {
    const total    = round2(qty * uc)
    const subtotal = round2(total / (1 + rate / 100))
    return { subtotal, kdv_amount: round2(total - subtotal), total }
  } else {
    const subtotal = round2(qty * uc)
    const kdv      = round2(subtotal * (rate / 100))
    return { subtotal, kdv_amount: kdv, total: round2(subtotal + kdv) }
  }
}

interface Props {
  ingredients: Ingredient[]
  suppliers:   Supplier[]
  onClose:     () => void
  onSaved:     (entry: StockEntry) => void
}

export function NewEntryModal({ ingredients, suppliers, onClose, onSaved }: Props) {
  const [header, setHeader] = useState({
    supplier_id:  '',
    invoice_no:   '',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date:     '',
    notes:        '',
  })
  const [lines, setLines]     = useState<LineItem[]>([blankLine()])
  const [payStatus, setPayStatus] = useState<'pending' | 'paid' | 'partial'>('pending')
  const [payMethod, setPayMethod] = useState<PaymentMethod>('cash')
  const [payDate, setPayDate]     = useState('')
  const [partialAmt, setPartialAmt] = useState('')
  const [saving, setSaving]       = useState(false)

  function updateLine(idx: number, field: keyof LineItem, value: string | boolean) {
    setLines((prev) => {
      const next = prev.map((l, i) => i === idx ? { ...l, [field]: value } : l)
      // Malzeme seçilince son birim fiyatını otomatik doldur
      if (field === 'ingredient_id' && typeof value === 'string' && value) {
        const ing = ingredients.find((i) => i.id === value)
        if (ing) next[idx] = { ...next[idx], unit_cost: String(ing.unit_cost) }
      }
      return next
    })
  }

  const computed = useMemo(() => {
    const items = lines.map((l) => ({ ...l, ...computeLine(l) }))
      .filter((i) => i.ingredient_id && i.quantity && i.unit_cost)
    const subtotal  = round2(items.reduce((s, i) => s + i.subtotal,   0))
    const kdvAmount = round2(items.reduce((s, i) => s + i.kdv_amount, 0))
    const total     = round2(items.reduce((s, i) => s + i.total,      0))

    // KDV dağılımı (orana göre grup)
    const kdvByRate: Record<number, number> = {}
    for (const item of items) {
      if (item.kdv_amount > 0) {
        const r = parseFloat(item.kdv_rate) || 0
        kdvByRate[r] = round2((kdvByRate[r] ?? 0) + item.kdv_amount)
      }
    }

    return { items, subtotal, kdvAmount, total, kdvByRate }
  }, [lines])

  async function submit() {
    if (computed.items.length === 0) { toast.error('En az bir geçerli kalem girin'); return }
    setSaving(true)

    const paid_amount = payStatus === 'paid' ? computed.total
                      : payStatus === 'partial' ? (parseFloat(partialAmt) || 0)
                      : 0

    const res = await fetch('/api/stock/entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...header,
        supplier_id:    header.supplier_id || null,
        items:          computed.items.map((i) => ({
          ingredient_id: i.ingredient_id,
          quantity:      parseFloat(i.quantity),
          unit_cost:     parseFloat(i.unit_cost),
          kdv_rate:      parseFloat(i.kdv_rate),
          kdv_included:  i.kdv_included,
          subtotal:      i.subtotal,
          kdv_amount:    i.kdv_amount,
          total:         i.total,
        })),
        payment_status: payStatus,
        paid_amount,
        payment_method: (payStatus !== 'pending' && paid_amount > 0) ? payMethod : null,
        payment_date:   payDate || null,
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      toast.error(data.error ?? 'Fatura kaydedilemedi')
    } else {
      toast.success('Fatura kaydedildi, stok güncellendi')
      onSaved(data.entry)
    }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto">

        {/* Başlık */}
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white z-10">
          <h2 className="text-lg font-bold text-gray-900">Yeni Stok Faturası</h2>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>

        <div className="p-6 space-y-6">

          {/* Fatura Bilgileri */}
          <section>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Fatura Bilgileri</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Tedarikçi</label>
                <select value={header.supplier_id} onChange={(e) => setHeader((p) => ({ ...p, supplier_id: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500">
                  <option value="">— Seçin (opsiyonel) —</option>
                  {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fatura / Fiş No</label>
                <input value={header.invoice_no} onChange={(e) => setHeader((p) => ({ ...p, invoice_no: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="FAT-2024-001" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fatura Tarihi</label>
                <input type="date" value={header.invoice_date} onChange={(e) => setHeader((p) => ({ ...p, invoice_date: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vade Tarihi</label>
                <input type="date" value={header.due_date} onChange={(e) => setHeader((p) => ({ ...p, due_date: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
              </div>
            </div>
          </section>

          {/* Kalemler */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Kalemler</h3>
              <button onClick={() => setLines((p) => [...p, blankLine()])}
                className="flex items-center gap-1 text-sm text-orange-600 hover:text-orange-700 font-medium">
                <Plus size={14} /> Kalem Ekle
              </button>
            </div>

            {/* Başlık satırı */}
            <div className="grid grid-cols-12 gap-2 text-xs text-gray-400 px-1 mb-1">
              <div className="col-span-4">Malzeme</div>
              <div className="col-span-2 text-right">Miktar</div>
              <div className="col-span-2 text-right">Birim Fiyat</div>
              <div className="col-span-1 text-center">KDV %</div>
              <div className="col-span-1 text-center">Dahil?</div>
              <div className="col-span-1 text-right">Toplam</div>
              <div className="col-span-1" />
            </div>

            <div className="space-y-2">
              {lines.map((line, idx) => {
                const { total } = computeLine(line)
                const ing = ingredients.find((i) => i.id === line.ingredient_id)
                return (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-4">
                      <select value={line.ingredient_id}
                        onChange={(e) => updateLine(idx, 'ingredient_id', e.target.value)}
                        className="w-full border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500">
                        <option value="">Malzeme seçin</option>
                        {ingredients.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
                      </select>
                    </div>
                    <div className="col-span-2 flex items-center gap-1">
                      <input type="number" step="0.001" value={line.quantity}
                        onChange={(e) => updateLine(idx, 'quantity', e.target.value)}
                        className="w-full border rounded-lg px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-orange-500"
                        placeholder="0" />
                      {ing && <span className="text-xs text-gray-400 shrink-0">{ing.unit}</span>}
                    </div>
                    <div className="col-span-2">
                      <input type="number" step="0.0001" value={line.unit_cost}
                        onChange={(e) => updateLine(idx, 'unit_cost', e.target.value)}
                        className="w-full border rounded-lg px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-orange-500"
                        placeholder="0.00" />
                    </div>
                    <div className="col-span-1">
                      <select value={line.kdv_rate}
                        onChange={(e) => updateLine(idx, 'kdv_rate', e.target.value)}
                        className="w-full border rounded-lg px-1 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-orange-500">
                        {KDV_RATES.map((r) => <option key={r} value={r}>%{r}</option>)}
                      </select>
                    </div>
                    <div className="col-span-1 flex justify-center">
                      <label className="flex flex-col items-center gap-0.5 cursor-pointer">
                        <input type="checkbox" checked={line.kdv_included}
                          onChange={(e) => updateLine(idx, 'kdv_included', e.target.checked)}
                          className="w-4 h-4 accent-orange-500" />
                        <span className="text-xs text-gray-400">{line.kdv_included ? 'Dahil' : 'Hariç'}</span>
                      </label>
                    </div>
                    <div className="col-span-1 text-right text-sm font-medium text-gray-800">
                      {total > 0 ? formatCurrency(total) : '—'}
                    </div>
                    <div className="col-span-1 flex justify-center">
                      {lines.length > 1 && (
                        <button onClick={() => setLines((p) => p.filter((_, i) => i !== idx))}
                          className="text-red-300 hover:text-red-500">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          {/* Özet */}
          <section className="bg-gray-50 rounded-xl p-4 space-y-1.5 text-sm">
            <div className="flex justify-between text-gray-500">
              <span>Ara Toplam (KDV hariç)</span>
              <span>{formatCurrency(computed.subtotal)}</span>
            </div>
            {Object.entries(computed.kdvByRate).sort(([a], [b]) => Number(a) - Number(b)).map(([rate, amount]) => (
              <div key={rate} className="flex justify-between text-gray-500">
                <span>KDV %{rate}</span>
                <span>{formatCurrency(amount)}</span>
              </div>
            ))}
            <div className="flex justify-between font-bold text-gray-900 text-base pt-1.5 border-t border-gray-200">
              <span>Genel Toplam</span>
              <span>{formatCurrency(computed.total)}</span>
            </div>
          </section>

          {/* Ödeme */}
          <section>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Ödeme Durumu</h3>
            <div className="flex gap-2 mb-4">
              {(['pending', 'paid', 'partial'] as const).map((s) => (
                <button key={s} onClick={() => setPayStatus(s)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    payStatus === s ? 'bg-orange-500 border-orange-500 text-white' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}>
                  {s === 'pending' ? 'Bekliyor' : s === 'paid' ? 'Ödendi' : 'Kısmi Ödeme'}
                </button>
              ))}
            </div>
            {payStatus !== 'pending' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ödeme Yöntemi</label>
                  <select value={payMethod} onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500">
                    {Object.entries(METHOD_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ödeme Tarihi</label>
                  <input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
                </div>
                {payStatus === 'partial' && (
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ödenen Tutar (₺) — Toplam: {formatCurrency(computed.total)}
                    </label>
                    <input type="number" step="0.01" value={partialAmt}
                      onChange={(e) => setPartialAmt(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="0.00" />
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Not */}
          <section>
            <label className="block text-sm font-medium text-gray-700 mb-1">Not</label>
            <textarea value={header.notes} onChange={(e) => setHeader((p) => ({ ...p, notes: e.target.value }))} rows={2}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="Fatura notu..." />
          </section>
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-6 py-4 border-t sticky bottom-0 bg-white">
          <button onClick={submit} disabled={saving || computed.items.length === 0}
            className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white py-2.5 rounded-lg font-medium text-sm">
            {saving ? 'Kaydediliyor...' : 'Faturayı Kaydet & Stok Güncelle'}
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
