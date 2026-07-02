'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Plus, Trash2, MapPin, Clock, ToggleLeft, ToggleRight, Globe } from 'lucide-react'
import type { Tenant, CuisineType, DeliveryZone } from '@/types/database'

const DAYS = [
  { key: 'mon', label: 'Pazartesi' },
  { key: 'tue', label: 'Salı' },
  { key: 'wed', label: 'Çarşamba' },
  { key: 'thu', label: 'Perşembe' },
  { key: 'fri', label: 'Cuma' },
  { key: 'sat', label: 'Cumartesi' },
  { key: 'sun', label: 'Pazar' },
]

interface Props {
  tenant: Tenant
  cuisineTypes: CuisineType[]
  initialZones: DeliveryZone[]
}

export function OnlineOrderSettings({ tenant, cuisineTypes, initialZones }: Props) {
  const supabase = createClient()

  const [enabled, setEnabled] = useState(tenant.online_ordering_enabled)
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>(tenant.cuisine_type_ids ?? [])
  const [lat, setLat] = useState(tenant.lat?.toString() ?? '')
  const [lng, setLng] = useState(tenant.lng?.toString() ?? '')
  const [phone, setPhone] = useState(tenant.phone ?? '')
  const [hours, setHours] = useState<Record<string, { open: string; close: string } | null>>(
    (tenant.online_order_hours as Record<string, { open: string; close: string } | null>) ?? {}
  )
  const [zones, setZones] = useState<DeliveryZone[]>(initialZones)
  const [saving, setSaving] = useState(false)

  const [newZone, setNewZone] = useState({
    name: '', max_distance_km: '', min_order_amount: '',
    delivery_fee: '', estimated_minutes: '30',
  })

  async function saveSettings() {
    setSaving(true)
    const { error } = await supabase.from('tenants').update({
      online_ordering_enabled: enabled,
      cuisine_type_ids: selectedCuisines,
      lat: lat ? parseFloat(lat) : null,
      lng: lng ? parseFloat(lng) : null,
      phone: phone || null,
      online_order_hours: hours,
    }).eq('id', tenant.id)
    setSaving(false)
    if (error) toast.error(error.message)
    else toast.success('Online sipariş ayarları kaydedildi')
  }

  function toggleCuisine(id: string) {
    setSelectedCuisines(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  function setDayHours(day: string, field: 'open' | 'close', value: string) {
    setHours(prev => ({
      ...prev,
      [day]: { ...(prev[day] ?? { open: '09:00', close: '22:00' }), [field]: value },
    }))
  }

  function toggleDay(day: string) {
    setHours(prev => {
      if (prev[day]) {
        const next = { ...prev }
        delete next[day]
        return next
      }
      return { ...prev, [day]: { open: '09:00', close: '22:00' } }
    })
  }

  function getLocation() {
    navigator.geolocation.getCurrentPosition(
      pos => { setLat(pos.coords.latitude.toFixed(6)); setLng(pos.coords.longitude.toFixed(6)) },
      () => toast.error('Konum alınamadı')
    )
  }

  async function addZone() {
    if (!newZone.name || !newZone.max_distance_km) { toast.error('İsim ve mesafe zorunlu'); return }
    const { data, error } = await supabase.from('delivery_zones').insert({
      tenant_id: tenant.id,
      name: newZone.name,
      max_distance_km: parseFloat(newZone.max_distance_km),
      min_order_amount: parseFloat(newZone.min_order_amount || '0'),
      delivery_fee: parseFloat(newZone.delivery_fee || '0'),
      estimated_minutes: parseInt(newZone.estimated_minutes || '30'),
      sort_order: zones.length,
    }).select().single()
    if (error) { toast.error(error.message); return }
    setZones(prev => [...prev, data as DeliveryZone])
    setNewZone({ name: '', max_distance_km: '', min_order_amount: '', delivery_fee: '', estimated_minutes: '30' })
    toast.success('Bölge eklendi')
  }

  async function deleteZone(id: string) {
    await supabase.from('delivery_zones').delete().eq('id', id)
    setZones(prev => prev.filter(z => z.id !== id))
    toast.success('Bölge silindi')
  }

  async function toggleZone(id: string, current: boolean) {
    await supabase.from('delivery_zones').update({ is_active: !current }).eq('id', id)
    setZones(prev => prev.map(z => z.id === id ? { ...z, is_active: !current } : z))
  }

  return (
    <div className="space-y-8">
      {/* Aktif/Pasif */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border">
        <div>
          <p className="font-semibold text-gray-900">Online Sipariş</p>
          <p className="text-sm text-gray-500">Müşteriler {tenant.slug} üzerinden sipariş verebilir</p>
        </div>
        <button onClick={() => setEnabled(!enabled)}>
          {enabled
            ? <ToggleRight size={36} className="text-orange-500" />
            : <ToggleLeft size={36} className="text-gray-400" />}
        </button>
      </div>

      {/* Mutfak Tipleri */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Globe size={16} className="text-orange-500" /> Mutfak Tipleri
        </h3>
        <div className="flex flex-wrap gap-2">
          {cuisineTypes.filter(c => c.is_active).map(c => (
            <button
              key={c.id}
              onClick={() => toggleCuisine(c.id)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                selectedCuisines.includes(c.id)
                  ? 'bg-orange-500 text-white border-orange-500'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300'
              }`}
            >
              {c.emoji} {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Konum */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <MapPin size={16} className="text-orange-500" /> Restoran Konumu
        </h3>
        <p className="text-sm text-gray-500 mb-3">Teslimat mesafesi hesabı için gerekli</p>
        <div className="flex gap-3 items-end flex-wrap">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Enlem (Lat)</label>
            <input
              value={lat} onChange={e => setLat(e.target.value)}
              placeholder="41.0082"
              className="border rounded-lg px-3 py-2 text-sm w-40"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Boylam (Lng)</label>
            <input
              value={lng} onChange={e => setLng(e.target.value)}
              placeholder="28.9784"
              className="border rounded-lg px-3 py-2 text-sm w-40"
            />
          </div>
          <button
            onClick={getLocation}
            className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-2"
          >
            <MapPin size={14} /> Konumumu Kullan
          </button>
        </div>
      </div>

      {/* Telefon */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-2">İletişim Telefonu</h3>
        <input
          value={phone} onChange={e => setPhone(e.target.value)}
          placeholder="0212 123 45 67"
          className="border rounded-lg px-3 py-2 text-sm w-64"
        />
      </div>

      {/* Çalışma Saatleri */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Clock size={16} className="text-orange-500" /> Online Sipariş Saatleri
        </h3>
        <div className="space-y-2">
          {DAYS.map(d => (
            <div key={d.key} className="flex items-center gap-3">
              <button
                onClick={() => toggleDay(d.key)}
                className={`w-28 text-left text-sm px-3 py-2 rounded-lg border font-medium transition-colors ${
                  hours[d.key] ? 'bg-orange-50 border-orange-300 text-orange-700' : 'bg-gray-50 text-gray-400 border-gray-200'
                }`}
              >
                {d.label}
              </button>
              {hours[d.key] ? (
                <>
                  <input type="time" value={hours[d.key]!.open}
                    onChange={e => setDayHours(d.key, 'open', e.target.value)}
                    className="border rounded-lg px-2 py-1.5 text-sm"
                  />
                  <span className="text-gray-400 text-sm">–</span>
                  <input type="time" value={hours[d.key]!.close}
                    onChange={e => setDayHours(d.key, 'close', e.target.value)}
                    className="border rounded-lg px-2 py-1.5 text-sm"
                  />
                </>
              ) : (
                <span className="text-sm text-gray-400">Kapalı</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Teslimat Bölgeleri */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-3">Teslimat Bölgeleri</h3>

        {/* Bölge listesi */}
        {zones.length > 0 && (
          <div className="bg-white border rounded-xl divide-y mb-4">
            {zones.map(z => (
              <div key={z.id} className="flex items-center gap-3 px-4 py-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-900">{z.name}</p>
                  <p className="text-xs text-gray-500">
                    Maks {z.max_distance_km} km · Min {z.min_order_amount}₺ · Teslimat {z.delivery_fee}₺ · ~{z.estimated_minutes} dk
                  </p>
                </div>
                <button
                  onClick={() => toggleZone(z.id, z.is_active)}
                  className={`text-xs px-2.5 py-1 rounded-full font-medium ${z.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                >
                  {z.is_active ? 'Aktif' : 'Pasif'}
                </button>
                <button onClick={() => deleteZone(z.id)} className="p-1.5 text-gray-400 hover:text-red-600">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Yeni bölge */}
        <div className="bg-gray-50 rounded-xl border p-4 space-y-3">
          <p className="text-sm font-medium text-gray-700">Yeni Bölge Ekle</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="col-span-2 md:col-span-1">
              <label className="text-xs text-gray-500 block mb-1">Bölge Adı</label>
              <input
                value={newZone.name} onChange={e => setNewZone(p => ({ ...p, name: e.target.value }))}
                placeholder="Yakın Çevre"
                className="border rounded-lg px-3 py-2 text-sm w-full bg-white"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Maks Mesafe (km)</label>
              <input
                type="number" value={newZone.max_distance_km}
                onChange={e => setNewZone(p => ({ ...p, max_distance_km: e.target.value }))}
                placeholder="5"
                className="border rounded-lg px-3 py-2 text-sm w-full bg-white"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Min Sipariş (₺)</label>
              <input
                type="number" value={newZone.min_order_amount}
                onChange={e => setNewZone(p => ({ ...p, min_order_amount: e.target.value }))}
                placeholder="100"
                className="border rounded-lg px-3 py-2 text-sm w-full bg-white"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Teslimat Ücreti (₺)</label>
              <input
                type="number" value={newZone.delivery_fee}
                onChange={e => setNewZone(p => ({ ...p, delivery_fee: e.target.value }))}
                placeholder="20"
                className="border rounded-lg px-3 py-2 text-sm w-full bg-white"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Tahmini Süre (dk)</label>
              <input
                type="number" value={newZone.estimated_minutes}
                onChange={e => setNewZone(p => ({ ...p, estimated_minutes: e.target.value }))}
                placeholder="30"
                className="border rounded-lg px-3 py-2 text-sm w-full bg-white"
              />
            </div>
          </div>
          <button
            onClick={addZone}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600"
          >
            <Plus size={14} /> Bölge Ekle
          </button>
        </div>
      </div>

      {/* Kaydet */}
      <div className="pt-4 border-t">
        <button
          onClick={saveSettings}
          disabled={saving}
          className="px-6 py-2.5 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 disabled:opacity-50"
        >
          {saving ? 'Kaydediliyor...' : 'Ayarları Kaydet'}
        </button>
      </div>
    </div>
  )
}
