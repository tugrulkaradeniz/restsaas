'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { cn, formatCurrency } from '@/lib/utils'
import type { Ingredient, Supplier } from '@/types/database'
import type { StockEntry, PaymentMethod } from './types'
import { Plus, ChevronDown, ChevronUp, CreditCard } from 'lucide-react'
import { NewEntryModal } from './NewEntryModal'

const STATUS_LABEL: Record<string, string> = { paid: 'Ödendi', partial: 'Kısmi', pending: 'Bekliyor' }
const STATUS_COLOR: Record<string, string> = {
  paid:    'bg-green-100 text-green-700',
  partial: 'bg-yellow-100 text-yellow-700',
  pending: 'bg-red-100 text-red-700',
}
const METHOD_LABEL: Record<string, string> = { cash: 'Nakit', bank: 'Banka', card: 'Kart', check: 'Çek' }

interface Props {
  entries:     StockEntry[]
  setEntries:  (fn: (prev: StockEntry[]) => StockEntry[]) => void
  ingredients: Ingredient[]
  suppliers:   Supplier[]
}

export function EntriesTab({ entries, setEntries, ingredients, suppliers }: Props) {
  const [showNew, setShowNew]         = useState(false)
  const [expandedId, setExpandedId]   = useState<string | null>(null)
  const [payingId, setPayingId]       = useState<string | null>(null)
  const [payForm, setPayForm]         = useState({ amount: '', method: 'cash' as PaymentMethod, paid_at: '', note: '' })
  const [saving, setSaving]           = useState(false)

  const totalOwed = entries
    .filter((e) => e.payment_status !== 'paid')
    .reduce((s, e) => s + (e.total_amount - e.paid_amount), 0)

  async function addPayment(entryId: string) {
    if (!payForm.amount) { toast.error('Tutar girin'); return }
    setSaving(true)
    const res = await fetch(`/api/stock/entries/${entryId}/payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payForm, paid_at: payForm.paid_at || new Date().toISOString().split('T')[0] }),
    })
    const data = await res.json()
    if (!res.ok) {
      toast.error(data.error ?? 'Ödeme eklenemedi')
    } else {
      setEntries((prev) => prev.map((e) =>
        e.id === entryId
          ? { ...e, paid_amount: data.paid_amount, payment_status: data.payment_status }
          : e
      ))
      setPayingId(null)
      setPayForm({ amount: '', method: 'cash', paid_at: '', note: '' })
      toast.success('Ödeme kaydedildi')
    }
    setSaving(false)
  }

  return (
    <div>
      {totalOwed > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 flex items-center justify-between text-sm">
          <span className="text-red-700">Toplam bekleyen borç</span>
          <span className="font-bold text-red-700">{formatCurrency(totalOwed)}</span>
        </div>
      )}

      <div className="flex justify-between items-center mb-4">
        <span className="text-sm text-gray-500">{entries.length} fatura</span>
        <button onClick={() => setShowNew(true)}
          className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-orange-600">
          <Plus size={15} /> Yeni Fatura
        </button>
      </div>

      <div className="space-y-2">
        {entries.length === 0 && (
          <p className="text-center py-12 text-sm text-gray-400">Henüz fatura girilmedi</p>
        )}
        {entries.map((entry) => {
          const isExpanded = expandedId === entry.id
          const remaining  = entry.total_amount - entry.paid_amount
          return (
            <div key={entry.id} className="bg-white rounded-xl border overflow-hidden">
              <button
                onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left"
              >
                <div className="flex-1 grid grid-cols-5 gap-4 items-center text-sm">
                  <div>
                    <p className="font-medium text-gray-900">
                      {entry.invoice_no ?? '—'}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(entry.invoice_date).toLocaleDateString('tr-TR')}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-700">{entry.supplier?.name ?? 'Tedarikçisiz'}</p>
                    {entry.due_date && (
                      <p className="text-xs text-gray-400">
                        Vade: {new Date(entry.due_date).toLocaleDateString('tr-TR')}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-gray-500 text-xs">Ara toplam</p>
                    <p className="font-medium text-gray-800">{formatCurrency(entry.subtotal)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-500 text-xs">KDV %{entry.kdv_rate}</p>
                    <p className="font-medium text-gray-800">{formatCurrency(entry.kdv_amount)}</p>
                  </div>
                  <div className="text-right flex items-center justify-end gap-2">
                    <div>
                      <p className="font-bold text-gray-900">{formatCurrency(entry.total_amount)}</p>
                      {entry.payment_status !== 'paid' && (
                        <p className="text-xs text-red-500">Kalan: {formatCurrency(remaining)}</p>
                      )}
                    </div>
                    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium shrink-0', STATUS_COLOR[entry.payment_status])}>
                      {STATUS_LABEL[entry.payment_status]}
                    </span>
                  </div>
                </div>
                <div className="text-gray-400 shrink-0">
                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </button>

              {isExpanded && (
                <div className="border-t px-4 py-3 bg-gray-50">
                  {/* Kalemler */}
                  {entry.items && entry.items.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Kalemler</p>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-xs text-gray-400">
                            <th className="text-left pb-1">Malzeme</th>
                            <th className="text-right pb-1">Miktar</th>
                            <th className="text-right pb-1">Birim Fiyat</th>
                            <th className="text-right pb-1">Toplam</th>
                          </tr>
                        </thead>
                        <tbody>
                          {entry.items.map((item) => (
                            <tr key={item.id}>
                              <td className="text-gray-700">{item.ingredient?.name ?? '?'}</td>
                              <td className="text-right text-gray-600">{item.quantity} {item.ingredient?.unit}</td>
                              <td className="text-right text-gray-600">{formatCurrency(item.unit_cost)}</td>
                              <td className="text-right font-medium text-gray-800">{formatCurrency(item.total)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Notlar */}
                  {entry.notes && (
                    <p className="text-xs text-gray-500 mb-3 italic">{entry.notes}</p>
                  )}

                  {/* Ödeme ekle */}
                  {entry.payment_status !== 'paid' && (
                    <div className="border-t pt-3">
                      {payingId === entry.id ? (
                        <div className="flex flex-wrap gap-2 items-end">
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Tutar (₺)</p>
                            <input
                              type="number" step="0.01"
                              value={payForm.amount}
                              onChange={(e) => setPayForm((p) => ({ ...p, amount: e.target.value }))}
                              placeholder={String(remaining.toFixed(2))}
                              className="border rounded-lg px-3 py-1.5 text-sm w-32 focus:outline-none focus:ring-2 focus:ring-orange-500"
                            />
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Yöntem</p>
                            <select value={payForm.method}
                              onChange={(e) => setPayForm((p) => ({ ...p, method: e.target.value as PaymentMethod }))}
                              className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500">
                              {Object.entries(METHOD_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                            </select>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Tarih</p>
                            <input type="date" value={payForm.paid_at}
                              onChange={(e) => setPayForm((p) => ({ ...p, paid_at: e.target.value }))}
                              className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
                          </div>
                          <button onClick={() => addPayment(entry.id)} disabled={saving}
                            className="bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white px-4 py-1.5 rounded-lg text-sm font-medium">
                            {saving ? '...' : 'Kaydet'}
                          </button>
                          <button onClick={() => setPayingId(null)}
                            className="text-gray-400 hover:text-gray-600 px-2 py-1.5 text-sm">
                            İptal
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setPayingId(entry.id); setPayForm({ amount: String(remaining.toFixed(2)), method: 'cash', paid_at: '', note: '' }) }}
                          className="flex items-center gap-1.5 text-sm text-orange-600 hover:text-orange-700 font-medium"
                        >
                          <CreditCard size={14} /> Ödeme Ekle
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {showNew && (
        <NewEntryModal
          ingredients={ingredients}
          suppliers={suppliers}
          onClose={() => setShowNew(false)}
          onSaved={(entry) => {
            setEntries((prev) => [entry, ...prev])
            setShowNew(false)
          }}
        />
      )}
    </div>
  )
}
