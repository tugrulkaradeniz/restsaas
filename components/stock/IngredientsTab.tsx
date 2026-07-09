'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { cn, formatCurrency } from '@/lib/utils'
import type { Ingredient } from '@/types/database'
import { Plus, Pencil, Trash2, X, AlertTriangle } from 'lucide-react'

const UNITS = ['kg', 'g', 'litre', 'ml', 'adet', 'demet', 'kutu', 'şişe', 'paket', 'porsiyon']

const blank = { name: '', unit: 'kg', stock_qty: '', min_stock: '', unit_cost: '' }

interface Props {
  ingredients:    Ingredient[]
  setIngredients: (fn: (prev: Ingredient[]) => Ingredient[]) => void
  tenantId:       string
}

export function IngredientsTab({ ingredients, setIngredients, tenantId }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]         = useState({ ...blank })
  const [editId, setEditId]     = useState<string | null>(null)
  const [saving, setSaving]     = useState(false)
  const supabase = createClient()

  function openNew() {
    setForm({ ...blank })
    setEditId(null)
    setShowForm(true)
  }

  function openEdit(ing: Ingredient) {
    setForm({
      name:      ing.name,
      unit:      ing.unit,
      stock_qty: String(ing.stock_qty),
      min_stock: String(ing.min_stock),
      unit_cost: String(ing.unit_cost),
    })
    setEditId(ing.id)
    setShowForm(true)
  }

  async function save() {
    if (!form.name || !form.unit) { toast.error('İsim ve birim zorunlu'); return }
    setSaving(true)
    const payload = {
      name:      form.name.trim(),
      unit:      form.unit,
      stock_qty: parseFloat(form.stock_qty) || 0,
      min_stock: parseFloat(form.min_stock) || 0,
      unit_cost: parseFloat(form.unit_cost) || 0,
    }

    if (editId) {
      const original = ingredients.find((i) => i.id === editId)
      const { stock_qty, ...metaPayload } = payload
      const { error } = await supabase.from('ingredients').update(metaPayload).eq('id', editId)
      if (error) { toast.error(error.message); setSaving(false); return }
      if (original && stock_qty !== original.stock_qty) {
        const res = await fetch('/api/stock/adjust', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ingredientId: editId, newQty: stock_qty, note: 'Manuel düzenleme' }),
        })
        if (!res.ok) { toast.error('Stok miktarı güncellenemedi'); setSaving(false); return }
      }
      setIngredients((prev) => prev.map((i) => i.id === editId ? { ...i, ...metaPayload, stock_qty } : i))
      toast.success('Güncellendi')
    } else {
      const { data, error } = await supabase.from('ingredients')
        .insert({ ...payload, tenant_id: tenantId })
        .select()
        .single()
      if (error || !data) { toast.error(error?.message ?? 'Eklenemedi'); setSaving(false); return }
      setIngredients((prev) => [...prev, data])
      toast.success('Malzeme eklendi')
    }
    setShowForm(false)
    setSaving(false)
  }

  async function remove(id: string) {
    if (!confirm('Bu malzemeyi silmek istiyor musunuz?')) return
    const { error } = await supabase.from('ingredients').delete().eq('id', id)
    if (error) { toast.error(error.message); return }
    setIngredients((prev) => prev.filter((i) => i.id !== id))
    toast.success('Silindi')
  }

  const lowStock = ingredients.filter((i) => i.stock_qty <= i.min_stock)

  return (
    <div>
      {lowStock.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 mb-4 flex items-center gap-2 text-sm text-yellow-800">
          <AlertTriangle size={16} className="shrink-0 text-yellow-500" />
          <span><strong>{lowStock.length}</strong> malzeme kritik stok seviyesinde: {lowStock.map((i) => i.name).join(', ')}</span>
        </div>
      )}

      <div className="flex justify-between items-center mb-4">
        <span className="text-sm text-gray-500">{ingredients.length} malzeme</span>
        <button onClick={openNew} className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-orange-600">
          <Plus size={15} /> Malzeme Ekle
        </button>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        {ingredients.length === 0 ? (
          <p className="text-center py-12 text-sm text-gray-400">Henüz malzeme eklenmedi</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b text-xs">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Malzeme</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Birim</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Stok</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Min. Stok</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Birim Fiyat</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {ingredients.map((ing) => {
                const isLow = ing.stock_qty <= ing.min_stock
                return (
                  <tr key={ing.id} className={cn('hover:bg-gray-50', isLow && 'bg-yellow-50/50')}>
                    <td className="px-4 py-3 font-medium text-gray-900 flex items-center gap-1.5">
                      {isLow && <AlertTriangle size={13} className="text-yellow-500 shrink-0" />}
                      {ing.name}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{ing.unit}</td>
                    <td className={cn('px-4 py-3 text-right font-medium', isLow ? 'text-yellow-600' : 'text-gray-900')}>
                      {ing.stock_qty}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-400">{ing.min_stock}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{formatCurrency(ing.unit_cost)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => openEdit(ing)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><Pencil size={14} /></button>
                        <button onClick={() => remove(ing.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-300"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">{editId ? 'Malzeme Düzenle' : 'Yeni Malzeme'}</h2>
              <button onClick={() => setShowForm(false)}><X size={18} className="text-gray-400" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Malzeme Adı</label>
                <input autoFocus value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" placeholder="Domates" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Birim</label>
                  <select value={form.unit} onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500">
                    {UNITS.map((u) => <option key={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Birim Fiyat (₺)</label>
                  <input type="number" step="0.01" value={form.unit_cost} onChange={(e) => setForm((p) => ({ ...p, unit_cost: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" placeholder="0.00" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mevcut Stok</label>
                  <input type="number" step="0.001" value={form.stock_qty} onChange={(e) => setForm((p) => ({ ...p, stock_qty: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" placeholder="0" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min. Stok</label>
                  <input type="number" step="0.001" value={form.min_stock} onChange={(e) => setForm((p) => ({ ...p, min_stock: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" placeholder="0" />
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={save} disabled={saving}
                className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white py-2.5 rounded-lg font-medium text-sm">
                {saving ? 'Kaydediliyor...' : editId ? 'Güncelle' : 'Ekle'}
              </button>
              <button onClick={() => setShowForm(false)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-lg font-medium text-sm">
                İptal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
