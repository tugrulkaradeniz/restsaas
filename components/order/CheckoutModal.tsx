'use client'

import { useState } from 'react'
import { X, MapPin, Package, Mail } from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'
import type { CartItem } from './RestaurantOrderPage'
import type { DeliveryZone } from '@/types/database'

type Tenant = {
  id: string; slug: string; name: string; lat: number | null; lng: number | null; phone: string | null
}

interface Props {
  tenant: Tenant
  cart: CartItem[]
  cartTotal: number
  zones: DeliveryZone[]
  onClose: () => void
  onSuccess: (orderId: string) => void
}

type Step = 'form' | 'otp' | 'placing'

function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function CheckoutModal({ tenant, cart, cartTotal, zones, onClose, onSuccess }: Props) {
  const [step, setStep] = useState<Step>('form')
  const [deliveryType, setDeliveryType] = useState<'pickup' | 'delivery'>(zones.length > 0 ? 'delivery' : 'pickup')
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '', note: '' })
  const [otp, setOtp] = useState('')
  const [otpId, setOtpId] = useState<string | null>(null)
  const [userLat, setUserLat] = useState<number | null>(null)
  const [userLng, setUserLng] = useState<number | null>(null)
  const [locating, setLocating] = useState(false)
  const [sending, setSending] = useState(false)
  const [verifying, setVerifying] = useState(false)

  // En uygun bölgeyi hesapla
  const eligibleZone: DeliveryZone | null = (() => {
    if (deliveryType !== 'delivery' || !userLat || !userLng || !tenant.lat || !tenant.lng) return null
    const dist = distanceKm(userLat, userLng, tenant.lat, tenant.lng)
    const sorted = zones
      .filter(z => z.is_active && dist <= z.max_distance_km && cartTotal >= z.min_order_amount)
      .sort((a, b) => a.max_distance_km - b.max_distance_km)
    return sorted[0] ?? null
  })()

  const deliveryFee = eligibleZone?.delivery_fee ?? 0
  const grandTotal = cartTotal + deliveryFee

  function getLocation() {
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      pos => { setUserLat(pos.coords.latitude); setUserLng(pos.coords.longitude); setLocating(false) },
      () => { toast.error('Konum alınamadı'); setLocating(false) }
    )
  }

  // Önce localStorage'da doğrulanmış müşteri var mı kontrol et
  async function checkAndProceed() {
    if (!form.name.trim() || !form.phone.trim() || !form.email.trim()) {
      toast.error('Ad, telefon ve email zorunlu')
      return
    }
    if (deliveryType === 'delivery' && !form.address.trim()) {
      toast.error('Teslimat adresi zorunlu')
      return
    }
    if (deliveryType === 'delivery' && !userLat) {
      toast.error('Lütfen konumunuzu paylaşın')
      return
    }
    if (deliveryType === 'delivery' && !eligibleZone) {
      toast.error('Teslimat bölgesi dışındasınız veya minimum sipariş tutarını karşılamıyorsunuz')
      return
    }

    // localStorage token kontrolü
    const token = localStorage.getItem(`vc_token_${form.phone}`)
    if (token) {
      const res = await fetch('/api/online-order/check-verified', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: form.phone, token }),
      })
      if (res.ok) {
        await placeOrder(token)
        return
      }
      localStorage.removeItem(`vc_token_${form.phone}`)
    }

    // OTP gönder
    await sendOtp()
  }

  async function sendOtp() {
    setSending(true)
    const res = await fetch('/api/online-order/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: form.email }),
    })
    const data = await res.json()
    setSending(false)
    if (!res.ok) { toast.error(data.error ?? 'OTP gönderilemedi'); return }
    setOtpId(data.otpId)
    setStep('otp')
    toast.success(`${form.email} adresine doğrulama kodu gönderildi`)
  }

  async function verifyOtp() {
    if (!otp.trim() || !otpId) return
    setVerifying(true)
    const res = await fetch('/api/online-order/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ otpId, code: otp, phone: form.phone, email: form.email, name: form.name }),
    })
    const data = await res.json()
    setVerifying(false)
    if (!res.ok) { toast.error(data.error ?? 'Kod hatalı'); return }
    localStorage.setItem(`vc_token_${form.phone}`, data.token)
    await placeOrder(data.token)
  }

  async function placeOrder(verificationToken: string) {
    setStep('placing')
    const res = await fetch('/api/online-order/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenantId: tenant.id,
        cart,
        deliveryType,
        deliveryZoneId: eligibleZone?.id ?? null,
        deliveryFee,
        customerName: form.name,
        customerPhone: form.phone,
        customerEmail: form.email,
        deliveryAddress: form.address || null,
        deliveryLat: userLat,
        deliveryLng: userLng,
        orderNote: form.note || null,
        verificationToken,
      }),
    })
    const data = await res.json()
    if (!res.ok) { toast.error(data.error ?? 'Sipariş oluşturulamadı'); setStep('form'); return }
    onSuccess(data.orderId)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white w-full max-w-md rounded-t-2xl md:rounded-2xl max-h-[92vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0">
          <h2 className="font-bold text-gray-900">
            {step === 'otp' ? 'E-posta Doğrulama' : 'Sipariş Bilgileri'}
          </h2>
          <button onClick={onClose} className="p-1 text-gray-400"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {step === 'placing' ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-gray-500">Siparişiniz oluşturuluyor...</p>
            </div>
          ) : step === 'otp' ? (
            <div className="p-5 space-y-5">
              <div className="bg-orange-50 rounded-xl p-4 text-sm text-orange-700">
                <Mail size={16} className="inline mr-2" />
                <strong>{form.email}</strong> adresine 6 haneli doğrulama kodu gönderdik.
                Spam klasörünü de kontrol edin.
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Doğrulama Kodu</label>
                <input
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="123456"
                  className="w-full border rounded-xl px-4 py-3 text-center text-2xl tracking-[0.5em] font-mono"
                  autoFocus
                  maxLength={6}
                />
              </div>
              <button
                onClick={verifyOtp}
                disabled={verifying || otp.length < 6}
                className="w-full bg-orange-500 text-white rounded-xl py-3.5 font-bold hover:bg-orange-600 disabled:opacity-50"
              >
                {verifying ? 'Doğrulanıyor...' : 'Doğrula ve Siparişi Ver'}
              </button>
              <button onClick={() => setStep('form')} className="w-full text-sm text-gray-400 hover:text-gray-600">
                ← Geri Dön
              </button>
              <button onClick={sendOtp} disabled={sending} className="w-full text-sm text-orange-500 hover:text-orange-700">
                Kodu tekrar gönder
              </button>
            </div>
          ) : (
            <div className="p-5 space-y-5">
              {/* Sipariş özeti */}
              <div className="bg-gray-50 rounded-xl p-3 space-y-1.5">
                {cart.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-gray-700">{item.quantity}× {item.name}
                      {item.selectedOptions.length > 0 && (
                        <span className="text-gray-400"> ({item.selectedOptions.map(o => o.optionName).join(', ')})</span>
                      )}
                    </span>
                    <span className="font-medium">{formatCurrency((item.basePrice + item.selectedOptions.reduce((s, o) => s + o.priceDelta, 0)) * item.quantity)}</span>
                  </div>
                ))}
                {deliveryFee > 0 && (
                  <div className="flex justify-between text-sm text-gray-500 pt-1.5 border-t">
                    <span>Teslimat ücreti</span>
                    <span>{formatCurrency(deliveryFee)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold pt-1.5 border-t">
                  <span>Toplam</span>
                  <span className="text-orange-500">{formatCurrency(grandTotal)}</span>
                </div>
              </div>

              {/* Teslimat tipi */}
              {zones.length > 0 && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setDeliveryType('delivery')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-medium transition-colors ${
                      deliveryType === 'delivery' ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-200 text-gray-600'
                    }`}
                  >
                    <MapPin size={15} /> Teslimat
                  </button>
                  <button
                    onClick={() => setDeliveryType('pickup')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-medium transition-colors ${
                      deliveryType === 'pickup' ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-200 text-gray-600'
                    }`}
                  >
                    <Package size={15} /> Gel Al
                  </button>
                </div>
              )}

              {/* Konum (teslimat için) */}
              {deliveryType === 'delivery' && (
                <div>
                  <button
                    onClick={getLocation}
                    disabled={locating}
                    className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-medium transition-colors ${
                      userLat ? 'border-green-500 bg-green-50 text-green-700' : 'border-dashed border-gray-300 text-gray-600 hover:border-orange-300'
                    }`}
                  >
                    <MapPin size={15} />
                    {locating ? 'Konum alınıyor...' : userLat ? `Konum alındı (${userLat.toFixed(3)}, ${userLng!.toFixed(3)})` : 'Konumumu Kullan'}
                  </button>
                  {userLat && !eligibleZone && (
                    <p className="text-xs text-red-500 mt-1.5">
                      Teslimat bölgesi dışındasınız veya min sipariş tutarı karşılanmıyor.
                    </p>
                  )}
                  {eligibleZone && (
                    <p className="text-xs text-green-600 mt-1.5">
                      ✓ {eligibleZone.name} — {eligibleZone.estimated_minutes} dk · Teslimat {deliveryFee > 0 ? formatCurrency(deliveryFee) : 'Ücretsiz'}
                    </p>
                  )}
                </div>
              )}

              {/* Form */}
              {[
                { label: 'Ad Soyad', key: 'name', placeholder: 'Ahmet Yılmaz', type: 'text' },
                { label: 'Telefon', key: 'phone', placeholder: '0532 123 45 67', type: 'tel' },
                { label: 'E-posta', key: 'email', placeholder: 'ahmet@email.com', type: 'email' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{f.label} *</label>
                  <input
                    type={f.type}
                    value={form[f.key as keyof typeof form]}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    className="w-full border rounded-xl px-4 py-2.5 text-sm"
                  />
                </div>
              ))}

              {deliveryType === 'delivery' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Teslimat Adresi *</label>
                  <textarea
                    value={form.address}
                    onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
                    placeholder="Mahalle, cadde, kapı no, daire..."
                    rows={2}
                    className="w-full border rounded-xl px-4 py-2.5 text-sm resize-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Not (opsiyonel)</label>
                <input
                  value={form.note}
                  onChange={e => setForm(p => ({ ...p, note: e.target.value }))}
                  placeholder="Kapıda zil çalmayın, kat: 3..."
                  className="w-full border rounded-xl px-4 py-2.5 text-sm"
                />
              </div>

              <p className="text-xs text-gray-400">
                E-posta adresinize doğrulama kodu gönderilecek. İlk siparişte bir kez doğrulama yeterli.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 'form' && (
          <div className="border-t px-5 py-4 shrink-0">
            <button
              onClick={checkAndProceed}
              disabled={sending}
              className="w-full bg-orange-500 text-white rounded-xl py-3.5 font-bold hover:bg-orange-600 disabled:opacity-50"
            >
              {sending ? 'Gönderiliyor...' : `Devam Et · ${formatCurrency(grandTotal)}`}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
