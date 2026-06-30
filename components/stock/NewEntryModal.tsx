'use client'

import { useState, useMemo } from 'react'
import { toast } from 'sonner'
import { cn, formatCurrency } from '@/lib/utils'
import type { Ingredient, Supplier } from '@/types/database'
import type { StockEntry, PaymentMethod } from './types'
import { Plus, Trash2, X } from 'lucide-react'

const KDV_RATES = [0, 1, 8, 18, 20]
const METHOD_LABEL: Record<string, string> = { cash: 'Nakit', bank: 'Banka Havalesi', card: 'Kredi Kartı', check: 'Çek' }

interface LineItem {
  ingredient_id: string
  quantity:      string
  unit_cost:     string
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
    kdv_rate:     '18',
    notes:        '',
  })
  const [lines, setLines] = useState<LineItem[]>([{ ingredient_id: '', quantity: '', unit_cost: '' }])
  const [payStatus, setPayStatus] = useState<'pending' | 'paid' | 'partial'>('pending')
  const [payMethod, setPayMethod] = useState<PaymentMethod>('cash')
  const [payDate, setPayDate]     = useState('')
  const [partialAmt, setPartialAmt] = useState('')
  const [saving, setSaving]       = useState(false)

  function setLine(idx: number, field: keyof LineItem, value: string) {
    setLines((prev) => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l))
    // Malzeme seçilince birim fiyatı otomatik doldur
    if (field === 'ingredient_id' && value) {
      const ing = ingredients.find((i) => i.id === value)
      if (ing) {
        setLines((prev) => prev.map((l, i) => i === idx ? { ...l, ingredient_id: value, unit_cost: String(ing.unit_cost) } : l))
      }
    }
  }

  function addLine() {
    setLines((prev) => [...prev, { ingredient_id: '', quantity: '', unit_cost: '' }])
  }

  function removeLine(idx: number) {
    setLines((prev) => prev.filter((_, i) => i !== idx))
  }

  const computed = useMemo(() => {
    const validLines = lines.filter((l) => l.ingredient_id && l.quantity && l.unit_cost)
    const items = validLines.map((l) => ({
      ingredient_id: l.ingredient_id,
      quantity:      parseFloat(l.quantity),
      unit_cost:     parseFloat(l.unit_cost),
      total:         Math.round(parseFloat(l.quantity) * parseFloat(l.unit_cost) * 100) / 100,
    }))
    const subtotal  = items.reduce((s, i) => s + i.total, 0)
    const kdvRate   = parseFloat(header.kdv_rate)
    const kdvAmount = Math.round(subtotal * (kdvRate / 100) * 100) / 100
    const total     = Math.round((subtotal + kdvAmount) * 100) / 100
    return { items, subtotal, kdvAmount, total }
  }, [lines, header.kdv_rate])

  async function submit() {
    if (computed.items.length === 0) { toast.error('En az bir geçerli kalem girin'); return }
    setSaving(true)

    const paid_amount = payStatus === 'paid' ? computed.total
                      : payStatus === 'partial' ? parseFloat(partialAmt) || 0
                      : 0

    const res = await fetch('/api/stock/entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...header,
        supplier_id: header.supplier_id || null,
        items:          computed.items,
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
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white z-10">
          <h2 className="text-lg font-bold text-gray-900">Yeni Stok Faturası</h2>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>

        <div className="p-6 space-y-6">
          {/* Bölüm 1: Fatura Bilgileri */}
          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Fatura Bilgileri</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Tedarikçi</label>
                <select value={header.supplier_id} onChange={(e) => setHeader((p) => ({ ...p, supplier_id: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500">
                  <option value="">— Tedarikçi seçin (opsiyonel) —</option>
                  {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fatura / Fiş No</label>
                <input value={header.invoice_no} onChange={(e) => setHeader((p) => ({ ...p, invoice_no: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" placeholder="FAT-2024-001" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">KDV Oranı</label>
                <select value={header.kdv_rate} onChange={(e) => setHeader((p) => ({ ...p, kdv_rate: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500">
                  {KDV_RATES.map((r) => <option key={r} value={r}>%{r}</option>)}
                </select>
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

          {/* Bölüm 2: Kalemler */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Kalemler</h3>
              <button onClick={addLine} className="flex items-center gap-1 text-sm text-orange-600 hover:text-orange-700 font-medium">
                <Plus size={14} /> Kalem Ekle
              </button>
            </div>
            <div className="space-y-2">
              <div className="grid grid-cols-12 gap-2 text-xs text-gray-400 px-1">
                <div className="col-span-5">Malzeme</div>
                <div className="col-span-2 text-right">Miktar</div>
                <div className="col-span-2 text-right">Birim Fiyat</div>
                <div className="col-span-2 text-right">Toplam</div>
                <div className="col-span-1" />
              </div>
              {lines.map((line, idx) => {
                const ing   = ingredients.find((i) => i.id === line.ingredient_id)
                const total = (parseFloat(line.quantity) || 0) * (parseFloat(line.unit_cost) || 0)
                return (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-5">
                      <select value={line.ingredient_id}
                        onChange={(e) => setLine(idx, 'ingredient_id', e.target.value)}
                        className="w-full border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500">
                        <option value="">Malzeme seçin</option>
                        {ingredients.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
                      </select>
                    </div>
                    <div className="col-span-2 flex items-center gap-1">
                      <input type="number" step="0.001" value={line.quantity}
                        onChange={(e) => setLine(idx, 'quantity', e.target.value)}
                        className="w-full border rounded-lg px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-orange-500"
                        placeholder="0" />
                      {ing && <span className="text-xs text-gray-400 shrink-0">{ing.unit}</span>}
                    </div>
                    <div className="col-span-2">
                      <input type="number" step="0.01" value={line.unit_cost}
                        onChange={(e) => setLine(idx, 'unit_cost', e.target.value)}
                        className="w-full border rounded-lg px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-orange-500"
                        placeholder="0.00" />
                    </div>
                    <div className="col-span-2 text-right text-sm font-medium text-gray-800">
                      {total > 0 ? formatCurrency(total) : '—'}
                    </div>
                    <div className="col-span-1 flex justify-center">
                      {lines.length > 1 && (
                        <button onClick={() => removeLine(idx)} className="text-red-300 hover:text-red-500">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          {/* Bölüm 3: Özet */}
          <section className="bg-gray-50 rounded-xl p-4">
            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Ara Toplam</span>
                <span>{formatCurrency(computed.subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>KDV (%{header.kdv_rate})</span>
                <span>{formatCurrency(computed.kdvAmount)}</span>
              </div>
              <div className="flex justify-between font-bold text-gray-900 text-base pt-1 border-t">
                <span>Genel Toplam</span>
                <span>{formatCurrency(computed.total)}</span>
              </div>
            </div>
          </section>

          {/* Bölüm 4: Ödeme */}
          <section>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Ödeme Durumu</h3>
            <div className="flex gap-2 mb-4">
              {(['pending', 'paid', 'partial'] as const).map((s) => (
                <button key={s} onClick={() => setPayStatus(s)}
                  className={cn(
                    'flex-1 py-2 rounded-lg text-sm font-medium border transition-colors',
                    payStatus === s
                      ? 'bg-orange-500 border-orange-500 text-white'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  )}>
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

          {/* Notlar */}
          <section>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notlar</label>
            <textarea value={header.notes} onChange={(e) => setHeader((p) => ({ ...p, notes: e.target.value }))} rows={2}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="Fatura notu, özel koşullar..." />
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
