'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { User, UserRole } from '@/types/database'
import { Plus, Trash2, Pencil, X, Check, Users, Monitor, Coffee } from 'lucide-react'

interface SessionRow {
  user_id: string
  active_seconds: number
  away_seconds: number
  away_count: number
  last_sync: string | null
  session_end: string | null
}

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
  todaySessions: SessionRow[]
}

function hms(s: number) {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (h > 0) return `${h}s ${m}dk`
  return `${m}dk`
}

function relativeTime(iso: string | null) {
  if (!iso) return '—'
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (diff < 2)  return 'az önce'
  if (diff < 60) return `${diff} dk önce`
  return `${Math.floor(diff / 60)}s önce`
}

export function StaffManager({ initialStaff, currentUserId, todaySessions }: Props) {
  const [staff, setStaff]             = useState<User[]>(initialStaff)
  const [showForm, setShowForm]       = useState(false)
  const [form, setForm]               = useState({ ...blank })
  const [saving, setSaving]           = useState(false)
  const [editingId, setEditingId]     = useState<string | null>(null)
  const [editingRole, setEditingRole] = useState<UserRole>('waiter')
  const [activeTab, setActiveTab]     = useState<'list' | 'activity'>('list')

  // Aggregate sessions per user
  const activityByUser = todaySessions.reduce<Record<string, {
    active: number; away: number; awayCount: number; lastSync: string | null; online: boolean
  }>>((acc, s) => {
    if (!acc[s.user_id]) acc[s.user_id] = { active: 0, away: 0, awayCount: 0, lastSync: null, online: false }
    acc[s.user_id].active    += s.active_seconds
    acc[s.user_id].away      += s.away_seconds
    acc[s.user_id].awayCount += s.away_count
    if (!s.last_sync || (s.last_sync > (acc[s.user_id].lastSync ?? ''))) {
      acc[s.user_id].lastSync = s.last_sync
    }
    // Online = open session (no session_end) with recent sync < 90s
    if (!s.session_end && s.last_sync) {
      const syncAge = (Date.now() - new Date(s.last_sync).getTime()) / 1000
      if (syncAge < 90) acc[s.user_id].online = true
    }
    return acc
  }, {})

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
        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {([['list', 'Personel Listesi'], ['activity', 'Bugünkü Aktivite']] as const).map(([key, label]) => (
            <button key={key} onClick={() => setActiveTab(key)}
              className={cn('px-4 py-1.5 rounded-md text-sm font-medium transition-colors',
                activeTab === key ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
              )}>
              {label}
            </button>
          ))}
        </div>
        {activeTab === 'list' && (
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-orange-600">
            <Plus size={15} /> Personel Ekle
          </button>
        )}
      </div>

      {/* Activity tab */}
      {activeTab === 'activity' && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b text-xs">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Personel</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 flex items-center gap-1"><Monitor size={12} /> Ekranda</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Uzakta</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Uzaklaşma</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Son Görülme</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Durum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {staff.filter(m => m.role !== 'super_admin').map(member => {
                const a = activityByUser[member.id]
                return (
                  <tr key={member.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{member.full_name}</p>
                      <p className="text-xs text-gray-400">{ROLE_LABELS[member.role] ?? member.role}</p>
                    </td>
                    <td className="px-4 py-3">
                      {a ? (
                        <span className="font-mono text-gray-900 font-medium">{hms(a.active)}</span>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {a ? (
                        <span className="font-mono text-gray-500">{hms(a.away)}</span>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {a ? (
                        <span className="flex items-center gap-1 text-gray-500">
                          <Coffee size={12} /> {a.awayCount}×
                        </span>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {a ? relativeTime(a.lastSync) : 'Bugün giriş yok'}
                    </td>
                    <td className="px-4 py-3">
                      {a?.online ? (
                        <span className="flex items-center gap-1.5 text-green-600 text-xs font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> Çevrimiçi
                        </span>
                      ) : a ? (
                        <span className="flex items-center gap-1.5 text-gray-400 text-xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-300" /> Çevrimdışı
                        </span>
                      ) : (
                        <span className="text-gray-300 text-xs">Giriş yok</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <p className="text-xs text-gray-400 px-4 py-2 border-t bg-gray-50">
            Veriler 30 saniyede bir güncellenir. Bugün = {new Date().toLocaleDateString('tr-TR')}.
          </p>
        </div>
      )}

      {/* Staff list tab */}
      {activeTab === 'list' && (

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

      )} {/* end list tab */}

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
