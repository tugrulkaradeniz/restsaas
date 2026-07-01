'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { Customer, LoyaltyTransaction } from '@/types/database'
import { Search, Plus, Star, ArrowUpRight, ArrowDownLeft, Phone, X, Gift } from 'lucide-react'

type CustomerWithTx = Customer & { transactions?: LoyaltyTransaction[] }

interface Props {
  tenantId: string
  initialCustomers: Customer[]
  loyaltyRate: number
}

function fmt(n: number) {
  return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2 }).format(n) + ' ₺'
}

export function CustomersManager({ tenantId, initialCustomers, loyaltyRate }: Props) {
  const [customers, setCustomers] = useState<CustomerWithTx[]>(initialCustomers)
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [showPoints, setShowPoints] = useState(false)
  const [form, setForm] = useState({ full_name: '', phone: '' })
  const [pointsForm, setPointsForm] = useState({ amount: '', type: 'earn' as 'earn' | 'redeem', note: '' })
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  const filtered = customers.filter(c =>
    c.full_name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search)
  )

  const selected = customers.find(c => c.id === selectedId)

  async function selectCustomer(id: string) {
    setSelectedId(id)
    // Lazy-load transactions
    const existing = customers.find(c => c.id === id)
    if (existing?.transactions) return
    const { data } = await supabase
      .from('loyalty_transactions')
      .select('*')
      .eq('customer_id', id)
      .order('created_at', { ascending: false })
      .limit(50)
    setCustomers(prev => prev.map(c => c.id === id ? { ...c, transactions: data ?? [] } : c))
  }

  async function addCustomer() {
    if (!form.full_name.trim()) { toast.error('Ad Soyad gerekli'); return }
    if (!form.phone.trim()) { toast.error('Telefon gerekli'); return }
    setSaving(true)
    const { data, error } = await supabase.from('customers').insert({
      tenant_id:    tenantId,
      full_name:    form.full_name.trim(),
      phone:        form.phone.trim(),
      points_balance: 0,
    }).select().single()
    setSaving(false)
    if (error) { toast.error(error.message); return }
    setCustomers(prev => [{ ...data, transactions: [] }, ...prev])
    setShowForm(false)
    setForm({ full_name: '', phone: '' })
    toast.success('Müşteri eklendi')
  }

  async function addPoints() {
    if (!selected) return
    const pts = parseInt(pointsForm.amount)
    if (!pts || pts <= 0) { toast.error('Geçerli puan girin'); return }
    if (pointsForm.type === 'redeem' && pts > selected.points_balance) {
      toast.error('Yetersiz puan bakiyesi'); return
    }
    setSaving(true)
    const delta = pointsForm.type === 'earn' ? pts : -pts
    const { error: txErr } = await supabase.from('loyalty_transactions').insert({
      customer_id: selected.id,
      order_id:    null,
      type:        pointsForm.type,
      points:      pts,
      note:        pointsForm.note.trim() || null,
    })
    if (txErr) { toast.error(txErr.message); setSaving(false); return }
    const { error: upErr } = await supabase.from('customers')
      .update({ points_balance: selected.points_balance + delta })
      .eq('id', selected.id)
    setSaving(false)
    if (upErr) { toast.error(upErr.message); return }

    const newTx: LoyaltyTransaction = {
      id: crypto.randomUUID(),
      customer_id: selected.id,
      order_id: null,
      type: pointsForm.type,
      points: pts,
      note: pointsForm.note.trim() || null,
      created_at: new Date().toISOString(),
    }
    setCustomers(prev => prev.map(c => c.id === selected.id
      ? { ...c, points_balance: c.points_balance + delta, transactions: [newTx, ...(c.transactions ?? [])] }
      : c
    ))
    setShowPoints(false)
    setPointsForm({ amount: '', type: 'earn', note: '' })
    toast.success(pointsForm.type === 'earn' ? `${pts} puan eklendi` : `${pts} puan kullanıldı`)
  }

  return (
    <div className="flex gap-5">
      {/* Left: customer list */}
      <div className="w-80 shrink-0 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Ad veya telefon ara..."
              className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm bg-white"
            />
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 bg-orange-500 text-white px-3 py-2 rounded-lg text-sm hover:bg-orange-600 shrink-0"
          >
            <Plus size={14} /> Ekle
          </button>
        </div>

        <div className="bg-white rounded-xl border divide-y overflow-hidden">
          {filtered.length === 0 && (
            <p className="text-center text-gray-400 text-sm py-10">Müşteri bulunamadı</p>
          )}
          {filtered.map(c => (
            <button
              key={c.id}
              onClick={() => selectCustomer(c.id)}
              className={cn(
                'w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors',
                selectedId === c.id && 'bg-orange-50'
              )}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm text-gray-900">{c.full_name}</span>
                <span className="flex items-center gap-1 text-xs text-yellow-600 font-medium">
                  <Star size={11} fill="currentColor" /> {c.points_balance}
                </span>
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                <Phone size={11} /> {c.phone}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right: customer detail */}
      <div className="flex-1 min-w-0">
        {!selected ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <Star size={36} className="mb-2 opacity-20" />
            <p className="text-sm">Müşteri seçin</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Customer header */}
            <div className="bg-white rounded-xl border p-5 flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{selected.full_name}</h2>
                <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                  <Phone size={13} /> {selected.phone}
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Kayıt: {new Date(selected.created_at).toLocaleDateString('tr-TR')}
                </p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-yellow-500 flex items-center gap-1 justify-end">
                  <Star size={20} fill="currentColor" />
                  {selected.points_balance}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  ≈ {fmt(selected.points_balance * loyaltyRate)} değerinde
                </p>
                <button
                  onClick={() => setShowPoints(true)}
                  className="mt-2 flex items-center gap-1.5 bg-yellow-500 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-yellow-600"
                >
                  <Gift size={13} /> Puan İşlemi
                </button>
              </div>
            </div>

            {/* Transaction history */}
            <div className="bg-white rounded-xl border overflow-hidden">
              <div className="px-4 py-3 border-b bg-gray-50">
                <p className="text-sm font-semibold text-gray-700">Puan Geçmişi</p>
              </div>
              {!selected.transactions ? (
                <p className="text-center text-sm text-gray-400 py-8">Yükleniyor...</p>
              ) : selected.transactions.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-8">Henüz puan işlemi yok</p>
              ) : (
                <div className="divide-y">
                  {selected.transactions.map(tx => (
                    <div key={tx.id} className="flex items-center gap-3 px-4 py-3">
                      <div className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
                        tx.type === 'earn' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'
                      )}>
                        {tx.type === 'earn'
                          ? <ArrowUpRight size={15} />
                          : <ArrowDownLeft size={15} />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {tx.type === 'earn' ? 'Puan Kazandı' : 'Puan Kullandı'}
                        </p>
                        {tx.note && <p className="text-xs text-gray-400 truncate">{tx.note}</p>}
                      </div>
                      <div className="text-right shrink-0">
                        <p className={cn('font-semibold text-sm', tx.type === 'earn' ? 'text-green-600' : 'text-red-500')}>
                          {tx.type === 'earn' ? '+' : '-'}{tx.points}
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(tx.created_at).toLocaleDateString('tr-TR')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Add customer modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Yeni Müşteri</h2>
              <button onClick={() => setShowForm(false)}><X size={20} className="text-gray-400" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ad Soyad</label>
                <input autoFocus value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Ahmet Yılmaz" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="0532 xxx xx xx" />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={addCustomer} disabled={saving}
                className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white py-2.5 rounded-lg font-medium text-sm">
                {saving ? 'Ekleniyor...' : 'Ekle'}
              </button>
              <button onClick={() => setShowForm(false)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-lg font-medium text-sm">
                İptal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/use points modal */}
      {showPoints && selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Puan İşlemi</h2>
              <button onClick={() => setShowPoints(false)}><X size={20} className="text-gray-400" /></button>
            </div>
            <div className="flex gap-2 mb-4">
              {(['earn', 'redeem'] as const).map(t => (
                <button key={t} onClick={() => setPointsForm(p => ({ ...p, type: t }))}
                  className={cn('flex-1 py-2 rounded-lg text-sm font-medium border transition-colors',
                    pointsForm.type === t
                      ? t === 'earn' ? 'bg-green-500 text-white border-green-500' : 'bg-red-500 text-white border-red-500'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                  )}>
                  {t === 'earn' ? 'Puan Ekle' : 'Puan Kullan'}
                </button>
              ))}
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Puan Miktarı</label>
                <input autoFocus type="number" min="1" value={pointsForm.amount}
                  onChange={e => setPointsForm(p => ({ ...p, amount: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="100" />
                {pointsForm.type === 'redeem' && (
                  <p className="text-xs text-gray-400 mt-1">Mevcut: {selected.points_balance} puan</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Not <span className="text-gray-400 font-normal">(isteğe bağlı)</span></label>
                <input value={pointsForm.note} onChange={e => setPointsForm(p => ({ ...p, note: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Manuel düzeltme..." />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={addPoints} disabled={saving}
                className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white py-2.5 rounded-lg font-medium text-sm">
                {saving ? 'İşleniyor...' : 'Onayla'}
              </button>
              <button onClick={() => setShowPoints(false)}
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
