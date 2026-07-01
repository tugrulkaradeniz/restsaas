'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { Expense, ExpenseCategory } from '@/types/database'
import { Plus, Trash2, TrendingDown, X } from 'lucide-react'

const CATEGORY_LABEL: Record<ExpenseCategory, string> = {
  rent:        'Kira',
  electricity: 'Elektrik',
  water:       'Su / Fatura',
  staff:       'Personel',
  other:       'Diğer',
}

const CATEGORY_COLOR: Record<ExpenseCategory, string> = {
  rent:        'bg-blue-500',
  electricity: 'bg-yellow-400',
  water:       'bg-cyan-500',
  staff:       'bg-green-500',
  other:       'bg-gray-400',
}

const CATEGORY_BG: Record<ExpenseCategory, string> = {
  rent:        'bg-blue-50 text-blue-700',
  electricity: 'bg-yellow-50 text-yellow-700',
  water:       'bg-cyan-50 text-cyan-700',
  staff:       'bg-green-50 text-green-700',
  other:       'bg-gray-100 text-gray-600',
}

const CATEGORIES = Object.keys(CATEGORY_LABEL) as ExpenseCategory[]

function fmt(n: number) {
  return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2 }).format(n) + ' ₺'
}

function monthStr(d: Date) {
  return d.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })
}

function isoMonth(d: Date) {
  return d.toISOString().slice(0, 7) // "2024-07"
}

interface Props {
  tenantId: string
  initialExpenses: Expense[]
}

const blank = {
  category: 'other' as ExpenseCategory,
  amount: '',
  description: '',
  date: new Date().toISOString().split('T')[0],
}

export function ExpensesManager({ tenantId, initialExpenses }: Props) {
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ ...blank })
  const [saving, setSaving] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState(isoMonth(new Date()))
  const supabase = createClient()

  // Available months from data + current month
  const months = useMemo(() => {
    const set = new Set<string>()
    set.add(isoMonth(new Date()))
    expenses.forEach(e => set.add(e.date.slice(0, 7)))
    return Array.from(set).sort().reverse()
  }, [expenses])

  const filtered = expenses.filter(e => e.date.startsWith(selectedMonth))
  const total = filtered.reduce((s, e) => s + e.amount, 0)

  const byCategory = CATEGORIES.map(cat => ({
    cat,
    total: filtered.filter(e => e.category === cat).reduce((s, e) => s + e.amount, 0),
  })).filter(x => x.total > 0).sort((a, b) => b.total - a.total)

  const grouped = filtered.reduce<Record<string, Expense[]>>((acc, e) => {
    acc[e.date] = acc[e.date] ?? []
    acc[e.date].push(e)
    return acc
  }, {})
  const sortedDates = Object.keys(grouped).sort().reverse()

  async function addExpense() {
    if (!form.amount || parseFloat(form.amount) <= 0) { toast.error('Geçerli bir tutar girin'); return }
    if (!form.date) { toast.error('Tarih seçin'); return }
    setSaving(true)
    const { data, error } = await supabase.from('expenses').insert({
      tenant_id:   tenantId,
      category:    form.category,
      amount:      parseFloat(form.amount),
      description: form.description.trim() || null,
      date:        form.date,
    }).select().single()
    setSaving(false)
    if (error) { toast.error(error.message); return }
    setExpenses(prev => [data, ...prev])
    setSelectedMonth(form.date.slice(0, 7))
    setShowForm(false)
    setForm({ ...blank })
    toast.success('Gider eklendi')
  }

  async function deleteExpense(id: string) {
    if (!confirm('Bu gideri silmek istiyor musunuz?')) return
    const { error } = await supabase.from('expenses').delete().eq('id', id)
    if (error) { toast.error(error.message); return }
    setExpenses(prev => prev.filter(e => e.id !== id))
    toast.success('Silindi')
  }

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <select
          value={selectedMonth}
          onChange={e => setSelectedMonth(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm bg-white"
        >
          {months.map(m => (
            <option key={m} value={m}>
              {monthStr(new Date(m + '-01'))}
            </option>
          ))}
        </select>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-orange-600"
        >
          <Plus size={15} /> Gider Ekle
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-gray-400">Bu Ay Toplam</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{fmt(total)}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-gray-400">İşlem Sayısı</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{filtered.length}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-gray-400">En Büyük Kalem</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {byCategory[0] ? CATEGORY_LABEL[byCategory[0].cat] : '—'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-5">
        {/* Category breakdown */}
        <div className="bg-white rounded-xl border p-5 space-y-4">
          <p className="font-semibold text-gray-900 text-sm">Kategori Dağılımı</p>
          {byCategory.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Bu ay gider yok</p>
          ) : byCategory.map(({ cat, total: catTotal }) => (
            <div key={cat}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', CATEGORY_BG[cat])}>
                  {CATEGORY_LABEL[cat]}
                </span>
                <span className="font-medium text-gray-700">{fmt(catTotal)}</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={cn('h-full rounded-full', CATEGORY_COLOR[cat])}
                  style={{ width: `${(catTotal / total) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Expense list */}
        <div className="col-span-2 bg-white rounded-xl border overflow-hidden">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400">
              <TrendingDown size={32} className="mb-2 opacity-30" />
              <p className="text-sm">Bu ay gider kaydı yok</p>
            </div>
          ) : (
            <div className="divide-y">
              {sortedDates.map(date => (
                <div key={date}>
                  <div className="px-4 py-2 bg-gray-50 text-xs text-gray-500 font-medium">
                    {new Date(date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' })}
                  </div>
                  {grouped[date].map(exp => (
                    <div key={exp.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 group">
                      <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium shrink-0', CATEGORY_BG[exp.category])}>
                        {CATEGORY_LABEL[exp.category]}
                      </span>
                      <span className="flex-1 text-sm text-gray-700 truncate">
                        {exp.description || CATEGORY_LABEL[exp.category]}
                      </span>
                      <span className="font-semibold text-gray-900 tabular-nums text-sm shrink-0">
                        {fmt(exp.amount)}
                      </span>
                      <button
                        onClick={() => deleteExpense(exp.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-red-300 hover:text-red-500 transition-opacity"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Gider Ekle</h2>
              <button onClick={() => setShowForm(false)} className="p-1 text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
                <select
                  value={form.category}
                  onChange={e => setForm(p => ({ ...p, category: e.target.value as ExpenseCategory }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                >
                  {CATEGORIES.map(c => (
                    <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tutar (₺)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  autoFocus
                  value={form.amount}
                  onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tarih</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama <span className="text-gray-400 font-normal">(isteğe bağlı)</span></label>
                <input
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="Mayıs kirası, elektrik faturası..."
                />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button
                onClick={addExpense}
                disabled={saving}
                className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white py-2.5 rounded-lg font-medium text-sm"
              >
                {saving ? 'Kaydediliyor...' : 'Ekle'}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-lg font-medium text-sm"
              >
                İptal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
