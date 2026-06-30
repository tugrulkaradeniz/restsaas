'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { Supplier } from '@/types/database'
import { Plus, Pencil, Trash2, X, Building2 } from 'lucide-react'

const blank = { name: '', contact: '', email: '', phone: '', note: '' }

interface Props {
  suppliers:    Supplier[]
  setSuppliers: (fn: (prev: Supplier[]) => Supplier[]) => void
  tenantId:     string
}

export function SuppliersTab({ suppliers, setSuppliers, tenantId }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]         = useState({ ...blank })
  const [editId, setEditId]     = useState<string | null>(null)
  const [saving, setSaving]     = useState(false)
  const supabase = createClient()

  function openNew() { setForm({ ...blank }); setEditId(null); setShowForm(true) }

  function openEdit(s: Supplier) {
    setForm({ name: s.name, contact: s.contact ?? '', email: s.email ?? '', phone: s.phone ?? '', note: s.note ?? '' })
    setEditId(s.id)
    setShowForm(true)
  }

  async function save() {
    if (!form.name) { toast.error('Tedarikçi adı zorunlu'); return }
    setSaving(true)
    const payload = {
      name:    form.name.trim(),
      contact: form.contact || null,
      email:   form.email || null,
      phone:   form.phone || null,
      note:    form.note || null,
    }

    if (editId) {
      const { error } = await supabase.from('suppliers').update(payload).eq('id', editId)
      if (error) { toast.error(error.message); setSaving(false); return }
      setSuppliers((prev) => prev.map((s) => s.id === editId ? { ...s, ...payload } : s))
      toast.success('Güncellendi')
    } else {
      const { data, error } = await supabase.from('suppliers')
        .insert({ ...payload, tenant_id: tenantId })
        .select().single()
      if (error || !data) { toast.error(error?.message ?? 'Eklenemedi'); setSaving(false); return }
      setSuppliers((prev) => [...prev, data])
      toast.success('Tedarikçi eklendi')
    }
    setShowForm(false)
    setSaving(false)
  }

  async function remove(id: string) {
    if (!confirm('Bu tedarikçiyi silmek istiyor musunuz?')) return
    const { error } = await supabase.from('suppliers').delete().eq('id', id)
    if (error) { toast.error(error.message); return }
    setSuppliers((prev) => prev.filter((s) => s.id !== id))
    toast.success('Silindi')
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <span className="text-sm text-gray-500">{suppliers.length} tedarikçi</span>
        <button onClick={openNew} className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-orange-600">
          <Plus size={15} /> Tedarikçi Ekle
        </button>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        {suppliers.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Building2 size={36} className="mx-auto mb-2 opacity-25" />
            <p className="text-sm">Henüz tedarikçi eklenmedi</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b text-xs">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Firma</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Yetkili</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Telefon</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">E-posta</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {suppliers.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{s.name}</td>
                  <td className="px-4 py-3 text-gray-500">{s.contact ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{s.phone ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{s.email ?? '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => openEdit(s)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><Pencil size={14} /></button>
                      <button onClick={() => remove(s.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-300"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">{editId ? 'Tedarikçi Düzenle' : 'Yeni Tedarikçi'}</h2>
              <button onClick={() => setShowForm(false)}><X size={18} className="text-gray-400" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Firma Adı *</label>
                <input autoFocus value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" placeholder="ABC Gıda Ltd." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Yetkili</label>
                  <input value={form.contact} onChange={(e) => setForm((p) => ({ ...p, contact: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" placeholder="Mehmet Bey" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                  <input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" placeholder="0532 000 00 00" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-posta</label>
                <input type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" placeholder="info@abc.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Not</label>
                <textarea value={form.note} onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))} rows={2}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" placeholder="Ödeme vadesi, özel indirim vb." />
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
