'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { ArrowLeft, User, Mail, Package, MapPin, Plus, Trash2, Pencil, Star } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { CustomerAddress } from '@/types/database'

type Step = 'loading' | 'login' | 'otp' | 'profile'
type Tab = 'orders' | 'addresses'

type CustomerOrder = {
  id: string
  created_at: string
  status: string
  total_amount: number
  delivery_fee: number
  delivery_type: string | null
  payment_method: string | null
  tenant: { name: string; slug: string } | null
  items: { id: string; quantity: number; unit_price: number; note: string | null; menu_item: { name: string } | null }[]
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Onay bekliyor', confirmed: 'Onaylandı', preparing: 'Hazırlanıyor',
  ready: 'Hazır', delivered: 'Teslim edildi', paid: 'Tamamlandı', cancelled: 'İptal',
}

export default function AccountPage() {
  const [step, setStep] = useState<Step>('loading')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [otp, setOtp] = useState('')
  const [otpId, setOtpId] = useState<string | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [tab, setTab] = useState<Tab>('orders')
  const [orders, setOrders] = useState<CustomerOrder[]>([])
  const [addresses, setAddresses] = useState<CustomerAddress[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [newAddr, setNewAddr] = useState({ label: '', address: '' })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editAddr, setEditAddr] = useState({ label: '', address: '' })

  useEffect(() => {
    const lastPhone = localStorage.getItem('vc_last_phone')
    if (!lastPhone) { setStep('login'); return }
    const cachedToken = localStorage.getItem(`vc_token_${lastPhone}`)
    if (!cachedToken) { setPhone(lastPhone); setStep('login'); return }
    setPhone(lastPhone)
    setToken(cachedToken)
    loadProfile(lastPhone, cachedToken)
  }, [])

  async function loadProfile(p: string, t: string) {
    setStep('loading')
    const [ordersRes, addrRes] = await Promise.all([
      fetch('/api/customer/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: p, token: t }) }),
      fetch('/api/customer/addresses/list', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: p, token: t }) }),
    ])
    if (!ordersRes.ok || !addrRes.ok) {
      localStorage.removeItem(`vc_token_${p}`)
      toast.error('Oturum süresi dolmuş, tekrar doğrulayın')
      setStep('login')
      return
    }
    const ordersData = await ordersRes.json()
    const addrData = await addrRes.json()
    setOrders(ordersData.orders ?? [])
    setAddresses(addrData.addresses ?? [])
    setStep('profile')
  }

  async function sendOtp() {
    if (!phone.trim() || !email.trim()) { toast.error('Telefon ve email zorunlu'); return }
    setBusy(true)
    const res = await fetch('/api/online-order/send-otp', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }),
    })
    const data = await res.json()
    setBusy(false)
    if (!res.ok) { toast.error(data.error ?? 'OTP gönderilemedi'); return }
    setOtpId(data.otpId)
    setStep('otp')
    toast.success(`${email} adresine doğrulama kodu gönderildi`)
  }

  async function verifyOtp() {
    if (!otp.trim() || !otpId) return
    setBusy(true)
    const res = await fetch('/api/online-order/verify-otp', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ otpId, code: otp, phone, email, name }),
    })
    const data = await res.json()
    setBusy(false)
    if (!res.ok) { toast.error(data.error ?? 'Kod hatalı'); return }
    localStorage.setItem(`vc_token_${phone}`, data.token)
    localStorage.setItem('vc_last_phone', phone)
    setToken(data.token)
    await loadProfile(phone, data.token)
  }

  async function addAddress() {
    if (!token || !newAddr.address.trim()) { toast.error('Adres zorunlu'); return }
    const res = await fetch('/api/customer/addresses/add', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, token, label: newAddr.label, address: newAddr.address, isDefault: addresses.length === 0 }),
    })
    const data = await res.json()
    if (!res.ok) { toast.error(data.error ?? 'Eklenemedi'); return }
    setAddresses(prev => [data.address, ...prev])
    setNewAddr({ label: '', address: '' })
    setShowAddForm(false)
    toast.success('Adres eklendi')
  }

  async function saveEditAddress(id: string) {
    if (!token) return
    const res = await fetch('/api/customer/addresses/update', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, token, id, label: editAddr.label, address: editAddr.address }),
    })
    if (!res.ok) { toast.error('Güncellenemedi'); return }
    setAddresses(prev => prev.map(a => a.id === id ? { ...a, label: editAddr.label || 'Adres', address: editAddr.address } : a))
    setEditingId(null)
    toast.success('Adres güncellendi')
  }

  async function deleteAddress(id: string) {
    if (!token) return
    await fetch('/api/customer/addresses/delete', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone, token, id }),
    })
    setAddresses(prev => prev.filter(a => a.id !== id))
    toast.success('Adres silindi')
  }

  async function setDefaultAddress(id: string) {
    if (!token) return
    await fetch('/api/customer/addresses/update', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, token, id, isDefault: true }),
    })
    setAddresses(prev => prev.map(a => ({ ...a, is_default: a.id === id })))
  }

  if (step === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (step === 'login' || step === 'otp') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-orange-500 text-white px-4 pt-10 pb-6">
          <Link href="/order" className="inline-flex items-center gap-1.5 text-orange-100 text-sm mb-4">
            <ArrowLeft size={14} /> Marketplace&apos;e dön
          </Link>
          <h1 className="text-2xl font-bold">Hesabım</h1>
          <p className="text-orange-100 text-sm mt-1">Siparişlerini ve adreslerini gör</p>
        </div>

        <div className="max-w-md mx-auto p-5">
          {step === 'login' ? (
            <div className="bg-white rounded-2xl border p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ad Soyad (opsiyonel)</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Ahmet Yılmaz"
                  className="w-full border rounded-xl px-4 py-2.5 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefon *</label>
                <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="0532 123 45 67" type="tel"
                  className="w-full border rounded-xl px-4 py-2.5 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-posta *</label>
                <input value={email} onChange={e => setEmail(e.target.value)} placeholder="ahmet@email.com" type="email"
                  className="w-full border rounded-xl px-4 py-2.5 text-sm" />
              </div>
              <button onClick={sendOtp} disabled={busy}
                className="w-full bg-orange-500 text-white rounded-xl py-3 font-bold hover:bg-orange-600 disabled:opacity-50">
                {busy ? 'Gönderiliyor...' : 'Doğrulama Kodu Gönder'}
              </button>
              <p className="text-xs text-gray-400">
                Daha önce sipariş verdiysen aynı telefon/e-posta ile giriş yapabilirsin.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border p-5 space-y-4">
              <div className="bg-orange-50 rounded-xl p-4 text-sm text-orange-700">
                <Mail size={16} className="inline mr-2" />
                <strong>{email}</strong> adresine 6 haneli kod gönderdik.
              </div>
              <input
                value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456" autoFocus maxLength={6}
                className="w-full border rounded-xl px-4 py-3 text-center text-2xl tracking-[0.5em] font-mono"
              />
              <button onClick={verifyOtp} disabled={busy || otp.length < 6}
                className="w-full bg-orange-500 text-white rounded-xl py-3 font-bold hover:bg-orange-600 disabled:opacity-50">
                {busy ? 'Doğrulanıyor...' : 'Doğrula'}
              </button>
              <button onClick={() => setStep('login')} className="w-full text-sm text-gray-400 hover:text-gray-600">
                ← Geri Dön
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <div className="bg-orange-500 text-white px-4 pt-10 pb-6">
        <Link href="/order" className="inline-flex items-center gap-1.5 text-orange-100 text-sm mb-4">
          <ArrowLeft size={14} /> Marketplace&apos;e dön
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
            <User size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold">{name || phone}</h1>
            <p className="text-orange-100 text-sm">{phone}</p>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto">
        <div className="flex border-b bg-white">
          <button onClick={() => setTab('orders')}
            className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-1.5 border-b-2 ${tab === 'orders' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500'}`}>
            <Package size={14} /> Siparişlerim
          </button>
          <button onClick={() => setTab('addresses')}
            className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-1.5 border-b-2 ${tab === 'addresses' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500'}`}>
            <MapPin size={14} /> Adreslerim
          </button>
        </div>

        <div className="p-4 space-y-3">
          {tab === 'orders' ? (
            orders.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <Package size={32} className="mx-auto mb-2 text-gray-200" />
                <p className="text-sm">Henüz siparişin yok</p>
              </div>
            ) : orders.map(o => (
              <div key={o.id} className="bg-white rounded-xl border p-4">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="font-semibold text-sm text-gray-900">{o.tenant?.name ?? 'Restoran'}</p>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">
                    {STATUS_LABEL[o.status] ?? o.status}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mb-2">
                  {new Date(o.created_at).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
                <div className="text-xs text-gray-500 space-y-0.5 mb-2">
                  {o.items.map(i => (
                    <p key={i.id}>{i.quantity}× {i.menu_item?.name ?? '?'}</p>
                  ))}
                </div>
                <div className="flex items-center justify-between pt-2 border-t text-sm">
                  <span className="text-gray-500">{o.delivery_type === 'delivery' ? 'Teslimat' : 'Gel Al'}</span>
                  <span className="font-bold text-orange-600">{formatCurrency(o.total_amount)}</span>
                </div>
              </div>
            ))
          ) : (
            <>
              {addresses.map(a => (
                editingId === a.id ? (
                  <div key={a.id} className="bg-white rounded-xl border p-4 space-y-2">
                    <input value={editAddr.label} onChange={e => setEditAddr(p => ({ ...p, label: e.target.value }))}
                      placeholder="Etiket (Ev, İş...)" className="w-full border rounded-lg px-3 py-2 text-sm" />
                    <textarea value={editAddr.address} onChange={e => setEditAddr(p => ({ ...p, address: e.target.value }))}
                      rows={2} className="w-full border rounded-lg px-3 py-2 text-sm resize-none" />
                    <div className="flex gap-2">
                      <button onClick={() => saveEditAddress(a.id)} className="px-3 py-1.5 bg-orange-500 text-white rounded-lg text-xs font-medium">Kaydet</button>
                      <button onClick={() => setEditingId(null)} className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs">İptal</button>
                    </div>
                  </div>
                ) : (
                  <div key={a.id} className="bg-white rounded-xl border p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-semibold text-sm text-gray-900">{a.label}</p>
                          {a.is_default && <Star size={12} className="text-amber-400 fill-amber-400" />}
                        </div>
                        <p className="text-sm text-gray-500 mt-0.5">{a.address}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => { setEditingId(a.id); setEditAddr({ label: a.label, address: a.address }) }} className="p-1.5 text-gray-400 hover:text-blue-600">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => deleteAddress(a.id)} className="p-1.5 text-gray-400 hover:text-red-600">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    {!a.is_default && (
                      <button onClick={() => setDefaultAddress(a.id)} className="mt-2 text-xs text-orange-600 hover:underline flex items-center gap-1">
                        <Star size={11} /> Varsayılan yap
                      </button>
                    )}
                  </div>
                )
              ))}

              {showAddForm ? (
                <div className="bg-white rounded-xl border p-4 space-y-2">
                  <input value={newAddr.label} onChange={e => setNewAddr(p => ({ ...p, label: e.target.value }))}
                    placeholder="Etiket (Ev, İş...)" className="w-full border rounded-lg px-3 py-2 text-sm" />
                  <textarea value={newAddr.address} onChange={e => setNewAddr(p => ({ ...p, address: e.target.value }))}
                    placeholder="Mahalle, cadde, kapı no, daire..." rows={2}
                    className="w-full border rounded-lg px-3 py-2 text-sm resize-none" />
                  <div className="flex gap-2">
                    <button onClick={addAddress} className="px-3 py-1.5 bg-orange-500 text-white rounded-lg text-xs font-medium">Ekle</button>
                    <button onClick={() => setShowAddForm(false)} className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs">İptal</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setShowAddForm(true)}
                  className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed rounded-xl text-sm text-gray-500 hover:border-orange-300 hover:text-orange-600">
                  <Plus size={15} /> Yeni Adres Ekle
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
