'use client'

import { useState } from 'react'
import type { ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { Reservation, Table, ReservationStatus } from '@/types/database'
import {
  Plus, Phone, Users, Clock, Calendar, X, Check,
  XCircle, LayoutGrid, FileText, CalendarDays,
} from 'lucide-react'

const STATUS_LABEL: Record<ReservationStatus, string> = {
  pending:   'Bekliyor',
  confirmed: 'Onaylandı',
  cancelled: 'İptal',
  completed: 'Tamamlandı',
}

const STATUS_COLOR: Record<ReservationStatus, string> = {
  pending:   'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-600',
  completed: 'bg-gray-100 text-gray-600',
}

type Tab = 'today' | 'upcoming' | 'past'

interface Props {
  tenantId: string
  initialReservations: Reservation[]
  tables: Table[]
}

function todayStr() { return new Date().toISOString().split('T')[0] }

const blankForm = {
  customer_name: '',
  customer_phone: '',
  party_size: '2',
  date: '',
  time: '19:00',
  table_id: '',
  note: '',
}

export function ReservationsManager({ tenantId, initialReservations, tables }: Props) {
  const [reservations, setReservations] = useState<Reservation[]>(initialReservations)
  const [tab, setTab] = useState<Tab>('today')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ ...blankForm, date: todayStr() })
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  const td = todayStr()

  const todayList    = reservations.filter(r => r.date === td && !['cancelled','completed'].includes(r.status))
  const upcomingList = reservations.filter(r => r.date > td && !['cancelled','completed'].includes(r.status))
  const pastList     = reservations.filter(r => r.date < td || ['cancelled','completed'].includes(r.status))

  const listByTab: Record<Tab, Reservation[]> = {
    today: todayList,
    upcoming: upcomingList,
    past: pastList,
  }

  const currentList = [...listByTab[tab]].sort((a, b) =>
    a.date === b.date ? a.time.localeCompare(b.time) : a.date.localeCompare(b.date)
  )

  const selectedReservation = reservations.find(r => r.id === selectedId)

  function openNew() {
    setForm({ ...blankForm, date: td })
    setSelectedId(null)
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
  }

  async function save() {
    if (!form.customer_name.trim()) { toast.error('Müşteri adı gerekli'); return }
    if (!form.customer_phone.trim()) { toast.error('Telefon gerekli'); return }
    if (!form.date) { toast.error('Tarih seçin'); return }
    if (!form.time) { toast.error('Saat seçin'); return }
    setSaving(true)

    const { data, error } = await supabase
      .from('reservations')
      .insert({
        tenant_id: tenantId,
        customer_name: form.customer_name.trim(),
        customer_phone: form.customer_phone.trim(),
        party_size: parseInt(form.party_size) || 2,
        date: form.date,
        time: form.time,
        table_id: form.table_id || null,
        note: form.note.trim() || null,
        status: 'confirmed',
      })
      .select()
      .single()

    setSaving(false)
    if (error) { toast.error(error.message); return }
    setReservations(prev => [data, ...prev])
    setSelectedId(data.id)
    closeForm()
    toast.success('Rezervasyon oluşturuldu')
  }

  async function updateStatus(id: string, status: ReservationStatus) {
    const { error } = await supabase.from('reservations').update({ status }).eq('id', id)
    if (error) { toast.error(error.message); return }
    setReservations(prev => prev.map(r => r.id === id ? { ...r, status } : r))
    toast.success(STATUS_LABEL[status])
  }

  const TABS: { key: Tab; label: string; count: number }[] = [
    { key: 'today',    label: 'Bugün',    count: todayList.length },
    { key: 'upcoming', label: 'Yaklaşan', count: upcomingList.length },
    { key: 'past',     label: 'Geçmiş',   count: pastList.length },
  ]

  return (
    <div className="flex h-full">
      {/* Sol panel */}
      <div className="w-80 border-r bg-white flex flex-col shrink-0">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900">Rezervasyonlar</h2>
            <button
              onClick={openNew}
              className="flex items-center gap-1.5 bg-orange-500 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-orange-600"
            >
              <Plus size={14} /> Yeni
            </button>
          </div>
          <div className="flex gap-1">
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => { setTab(t.key); setSelectedId(null); setShowForm(false) }}
                className={cn(
                  'flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors',
                  tab === t.key ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                {t.label}
                {t.count > 0 && (
                  <span className={cn('ml-1', tab === t.key ? 'text-orange-100' : 'text-gray-400')}>
                    ({t.count})
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y">
          {currentList.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-10">
              {{ today: 'Bugün rezervasyon yok', upcoming: 'Yaklaşan rezervasyon yok', past: 'Kayıt yok' }[tab]}
            </p>
          )}
          {currentList.map(r => (
            <button
              key={r.id}
              onClick={() => { setSelectedId(r.id); setShowForm(false) }}
              className={cn(
                'w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors',
                selectedId === r.id && !showForm && 'bg-orange-50'
              )}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm text-gray-900">{r.customer_name}</span>
                <span className={cn('text-xs px-2 py-0.5 rounded-full', STATUS_COLOR[r.status])}>
                  {STATUS_LABEL[r.status]}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                {tab !== 'today' && (
                  <span className="flex items-center gap-1"><Calendar size={11} />{r.date}</span>
                )}
                <span className="flex items-center gap-1"><Clock size={11} />{r.time.slice(0,5)}</span>
                <span className="flex items-center gap-1"><Users size={11} />{r.party_size} kişi</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Sağ panel */}
      <div className="flex-1 bg-gray-50 overflow-auto p-6">
        {!selectedReservation && !showForm && (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400 gap-3">
            <CalendarDays size={40} className="text-gray-300" />
            <p>Rezervasyon seçin veya yeni oluşturun</p>
          </div>
        )}

        {/* Detay */}
        {selectedReservation && !showForm && (
          <div className="max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">{selectedReservation.customer_name}</h2>
              <span className={cn('px-3 py-1 rounded-full text-sm font-medium', STATUS_COLOR[selectedReservation.status])}>
                {STATUS_LABEL[selectedReservation.status]}
              </span>
            </div>

            <div className="bg-white rounded-xl border divide-y mb-4">
              <InfoRow icon={<Phone size={15} />}    label="Telefon"     value={selectedReservation.customer_phone} />
              <InfoRow icon={<Users size={15} />}    label="Kişi"        value={`${selectedReservation.party_size} kişi`} />
              <InfoRow icon={<Calendar size={15} />} label="Tarih"       value={selectedReservation.date} />
              <InfoRow icon={<Clock size={15} />}    label="Saat"        value={selectedReservation.time.slice(0,5)} />
              {selectedReservation.table_id && (
                <InfoRow
                  icon={<LayoutGrid size={15} />}
                  label="Masa"
                  value={tables.find(t => t.id === selectedReservation.table_id)?.name ?? '—'}
                />
              )}
              {selectedReservation.note && (
                <InfoRow icon={<FileText size={15} />} label="Not" value={selectedReservation.note} />
              )}
            </div>

            {!['cancelled','completed'].includes(selectedReservation.status) && (
              <div className="flex gap-2 flex-wrap">
                {selectedReservation.status === 'pending' && (
                  <button
                    onClick={() => updateStatus(selectedReservation.id, 'confirmed')}
                    className="flex items-center gap-1.5 px-4 py-2 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600"
                  >
                    <Check size={15} /> Onayla
                  </button>
                )}
                <button
                  onClick={() => updateStatus(selectedReservation.id, 'completed')}
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600"
                >
                  <Check size={15} /> Tamamlandı
                </button>
                <button
                  onClick={() => updateStatus(selectedReservation.id, 'cancelled')}
                  className="flex items-center gap-1.5 px-4 py-2 bg-red-100 text-red-600 rounded-lg text-sm hover:bg-red-200"
                >
                  <XCircle size={15} /> İptal
                </button>
              </div>
            )}
          </div>
        )}

        {/* Yeni form */}
        {showForm && (
          <div className="max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Yeni Rezervasyon</h2>
              <button onClick={closeForm} className="p-1 text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <div className="bg-white rounded-xl border p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Müşteri Adı *</label>
                <input
                  autoFocus
                  value={form.customer_name}
                  onChange={e => setForm(p => ({ ...p, customer_name: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="Ahmet Yılmaz"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefon *</label>
                <input
                  value={form.customer_phone}
                  onChange={e => setForm(p => ({ ...p, customer_phone: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="0532 xxx xx xx"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tarih *</label>
                  <input
                    type="date"
                    value={form.date}
                    min={td}
                    onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Saat *</label>
                  <input
                    type="time"
                    value={form.time}
                    onChange={e => setForm(p => ({ ...p, time: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kişi Sayısı</label>
                  <input
                    type="number" min="1" max="50"
                    value={form.party_size}
                    onChange={e => setForm(p => ({ ...p, party_size: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Masa</label>
                  <select
                    value={form.table_id}
                    onChange={e => setForm(p => ({ ...p, table_id: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">Seçilmedi</option>
                    {tables.map(t => (
                      <option key={t.id} value={t.id}>{t.name} ({t.capacity} kişi)</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Not</label>
                <textarea
                  value={form.note}
                  onChange={e => setForm(p => ({ ...p, note: e.target.value }))}
                  rows={2}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="Özel istek, doğum günü vb."
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={save}
                  disabled={saving}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white py-2.5 rounded-lg font-medium text-sm"
                >
                  {saving ? 'Kaydediliyor...' : 'Oluştur'}
                </button>
                <button onClick={closeForm} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-lg font-medium text-sm">
                  İptal
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function InfoRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className="text-gray-400 shrink-0">{icon}</span>
      <span className="text-sm text-gray-500 w-24 shrink-0">{label}</span>
      <span className="text-sm font-medium text-gray-900">{value}</span>
    </div>
  )
}
