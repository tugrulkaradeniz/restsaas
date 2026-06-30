'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { User, UserRole } from '@/types/database'
import { Plus, Trash2, Pencil, X, Check, Users } from 'lucide-react'

const ROLE_LABELS: Record<string, string> = {
  owner:   'Sahip',
  manager: 'Müdür',
  cashier: 'Kasiyer',
  waiter:  'Garson',
  kitchen: 'Mutfak',
}

const ROLE_COLORS: Record<string, string> = {
  owner:   'bg-purple-100 text-purple-700',
  manager: 'bg-blue-100 text-blue-700',
  cashier: 'bg-yellow-100 text-yellow-700',
  waiter:  'bg-green-100 text-green-700',
  kitchen: 'bg-orange-100 text-orange-700',
}

const ADDABLE_ROLES: UserRole[] = ['manager', 'cashier', 'waiter', 'kitchen']

const blank = { full_name: '', email: '', password: '', role: 'waiter' as UserRole }

interface Props {
  initialStaff: User[]
  currentUserId: string
}

export function StaffManager({ initialStaff, currentUserId }: Props) {
  const [staff, setStaff]           = useState<User[]>(initialStaff)
  const [showForm, setShowForm]     = useState(false)
  const [form, setForm]             = useState({ ...blank })
  const [saving, setSaving]         = useState(false)
  const [editingId, setEditingId]   = useState<string | null>(null)
  const [editingRole, setEditingRole] = useState<UserRole>('waiter')

  async function addStaff() {
    if (!form.full_name || !form.email || !form.password) {
      toast.error('Tüm alanlar zorunlu')
      return
    }
    setSaving(true)
    const res = await fetch('/api/staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (!res.ok) {
      toast.error(data.error ?? 'Hata oluştu')
    } else {
      setStaff((prev) => [...prev, data.user])
      toast.success('Personel eklendi')
      setShowForm(false)
      setForm({ ...blank })
    }
    setSaving(false)
  }

  async function deleteStaff(id: string) {
    if (!confirm('Bu personeli silmek istediğinizden emin misiniz?')) return
    const res = await fetch(`/api/staff/${id}`, { method: 'DELETE' })
    const data = await res.json()
    if (!res.ok) {
      toast.error(data.error ?? 'Silinemedi')
    } else {
      setStaff((prev) => prev.filter((s) => s.id !== id))
      toast.success('Personel silindi')
    }
  }

  async function saveRole(id: string) {
    const res = await fetch(`/api/staff/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: editingRole }),
    })
    const data = await res.json()
    if (!res.ok) {
      toast.error(data.error ?? 'Güncellenemedi')
    } else {
      setStaff((prev) => prev.map((s) => s.id === id ? { ...s, role: editingRole } : s))
      setEditingId(null)
      toast.success('Rol güncellendi')
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-gray-500 flex items-center gap-1.5">
          <Users size={15} /> {staff.length} personel
        </span>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-orange-600"
        >
          <Plus size={15} /> Personel Ekle
        </button>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        {staff.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Users size={36} className="mx-auto mb-3 opacity-25" />
            <p className="text-sm">Henüz personel eklenmemiş</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b text-xs">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Ad Soyad</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">E-posta</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Rol</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Kayıt Tarihi</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {staff.map((member) => {
                const isMe    = member.id === currentUserId
                const isOwner = member.role === 'owner'
                return (
                  <tr key={member.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {member.full_name}
                      {isMe && <span className="ml-2 text-xs text-gray-400">(sen)</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{member.email}</td>
                    <td className="px-4 py-3">
                      {editingId === member.id ? (
                        <div className="flex items-center gap-1">
                          <select
                            value={editingRole}
                            onChange={(e) => setEditingRole(e.target.value as UserRole)}
                            className="border rounded-lg px-2 py-1 text-xs"
                          >
                            {ADDABLE_ROLES.map((r) => (
                              <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                            ))}
                          </select>
                          <button onClick={() => saveRole(member.id)} className="p-1 text-green-600 hover:bg-green-50 rounded">
                            <Check size={14} />
                          </button>
                          <button onClick={() => setEditingId(null)} className="p-1 text-gray-400 hover:bg-gray-100 rounded">
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-medium', ROLE_COLORS[member.role] ?? 'bg-gray-100 text-gray-700')}>
                          {ROLE_LABELS[member.role] ?? member.role}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {new Date(member.created_at).toLocaleDateString('tr-TR')}
                    </td>
                    <td className="px-4 py-3">
                      {!isMe && !isOwner && (
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => { setEditingId(member.id); setEditingRole(member.role) }}
                            className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => deleteStaff(member.id)}
                            className="p-1.5 hover:bg-red-50 rounded-lg text-red-300 hover:text-red-500"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
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
            <h2 className="text-lg font-bold text-gray-900 mb-4">Yeni Personel Ekle</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ad Soyad</label>
                <input
                  autoFocus
                  value={form.full_name}
                  onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Ahmet Yılmaz"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-posta</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="ahmet@restoran.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Şifre</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="En az 6 karakter"
                  minLength={6}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm((p) => ({ ...p, role: e.target.value as UserRole }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  {ADDABLE_ROLES.map((r) => (
                    <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button
                onClick={addStaff}
                disabled={saving}
                className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white py-2.5 rounded-lg font-medium text-sm"
              >
                {saving ? 'Ekleniyor...' : 'Ekle'}
              </button>
              <button
                onClick={() => { setShowForm(false); setForm({ ...blank }) }}
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
