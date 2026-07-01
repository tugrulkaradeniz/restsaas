'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Upload, X, Loader2 } from 'lucide-react'
import type { Tenant } from '@/types/database'

interface Props {
  tenant: Tenant | null
}

export function SettingsForm({ tenant }: Props) {
  const [form, setForm] = useState({
    name: tenant?.name ?? '',
    address: tenant?.address ?? '',
    loyalty_enabled: tenant?.loyalty_enabled ?? false,
    loyalty_rate: String(tenant?.loyalty_rate ?? 10),
    loyalty_redeem_rate: String(tenant?.loyalty_redeem_rate ?? 0.1),
    printer_model: tenant?.printer_model ?? '',
    printer_ip: tenant?.printer_ip ?? '',
    kitchen_printer_model: tenant?.kitchen_printer_model ?? '',
    kitchen_printer_ip: tenant?.kitchen_printer_ip ?? '',
  })
  const [logoUrl, setLogoUrl] = useState<string | null>(tenant?.logo_url ?? null)
  const [logoUploading, setLogoUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  async function uploadLogo(file: File) {
    if (!tenant) return
    setLogoUploading(true)
    try {
      const ext  = file.name.split('.').pop()
      const path = `${tenant.id}/logo.${ext}`
      const { error: upErr } = await supabase.storage
        .from('logos')
        .upload(path, file, { upsert: true, contentType: file.type })
      if (upErr) throw upErr

      const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(path)
      const urlWithBust = `${publicUrl}?t=${Date.now()}`

      const { error: dbErr } = await supabase.from('tenants').update({ logo_url: publicUrl }).eq('id', tenant.id)
      if (dbErr) throw dbErr

      setLogoUrl(urlWithBust)
      toast.success('Logo yüklendi')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Logo yüklenemedi')
    } finally {
      setLogoUploading(false)
    }
  }

  async function removeLogo() {
    if (!tenant) return
    await supabase.from('tenants').update({ logo_url: null }).eq('id', tenant.id)
    setLogoUrl(null)
    toast.success('Logo kaldırıldı')
  }

  async function save() {
    if (!tenant) return
    setSaving(true)
    const { error } = await supabase.from('tenants').update({
      name: form.name,
      address: form.address || null,
      loyalty_enabled: form.loyalty_enabled,
      loyalty_rate: parseFloat(form.loyalty_rate),
      loyalty_redeem_rate: parseFloat(form.loyalty_redeem_rate),
      printer_model: form.printer_model || null,
      printer_ip: form.printer_ip || null,
      kitchen_printer_model: form.kitchen_printer_model || null,
      kitchen_printer_ip: form.kitchen_printer_ip || null,
    }).eq('id', tenant.id)
    if (error) toast.error(error.message)
    else toast.success('Ayarlar kaydedildi')
    setSaving(false)
  }

  if (!tenant) return <p className="text-gray-500">Tenant bulunamadı.</p>

  return (
    <div className="space-y-6">
      {/* Genel */}
      <section className="bg-white rounded-xl border p-5 space-y-4">
        <h2 className="font-semibold text-gray-900">Genel Bilgiler</h2>

        {/* Logo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            İşletme Logosu <span className="text-gray-400 font-normal">(QR menüde görünür)</span>
          </label>
          <div className="flex items-center gap-4">
            {logoUrl ? (
              <div className="relative group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logoUrl} alt="Logo" className="h-16 w-auto object-contain border rounded-lg p-1 bg-gray-50" />
                <button
                  onClick={removeLogo}
                  className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <div className="w-16 h-16 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center bg-gray-50">
                <Upload size={18} className="text-gray-300" />
              </div>
            )}
            <div className="space-y-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) uploadLogo(f)
                }}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={logoUploading}
                className="flex items-center gap-2 text-sm px-3 py-1.5 border rounded-lg hover:bg-gray-50 disabled:opacity-50 text-gray-700"
              >
                {logoUploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                {logoUploading ? 'Yükleniyor...' : 'Logo Yükle'}
              </button>
              <p className="text-xs text-gray-400">PNG, JPG, SVG — maks. 2 MB</p>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">İşletme Adı</label>
          <input
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Adres <span className="text-gray-400 font-normal">(adisyonda görünür)</span></label>
          <input
            value={form.address}
            onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
            className="w-full border rounded-lg px-3 py-2 text-sm"
            placeholder="Atatürk Cad. No:12, İstanbul"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Abonelik Planı</label>
          <span className="inline-block bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-sm font-medium capitalize">
            {tenant.plan}
          </span>
        </div>
      </section>

      {/* Sadakat */}
      <section className="bg-white rounded-xl border p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Sadakat Programı</h2>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.loyalty_enabled}
              onChange={(e) => setForm((p) => ({ ...p, loyalty_enabled: e.target.checked }))}
              className="w-4 h-4 accent-orange-500"
            />
            Aktif
          </label>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Puan Kazanma (₺/puan)
            </label>
            <input
              type="number"
              step="0.01"
              value={form.loyalty_rate}
              onChange={(e) => setForm((p) => ({ ...p, loyalty_rate: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              disabled={!form.loyalty_enabled}
            />
            <p className="text-xs text-gray-400 mt-1">Her bu kadar ₺ için 1 puan</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Puan Kullanma (₺/puan)
            </label>
            <input
              type="number"
              step="0.01"
              value={form.loyalty_redeem_rate}
              onChange={(e) => setForm((p) => ({ ...p, loyalty_redeem_rate: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              disabled={!form.loyalty_enabled}
            />
            <p className="text-xs text-gray-400 mt-1">1 puan = bu kadar ₺ indirim</p>
          </div>
        </div>
      </section>

      {/* Yazıcılar */}
      <section className="bg-white rounded-xl border p-5 space-y-5">
        <h2 className="font-semibold text-gray-900">Termal Yazıcılar</h2>

        {/* Kasa yazıcısı */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />
            Kasa Yazıcısı
            <span className="text-xs font-normal text-gray-400">(adisyon / müşteri fişi)</span>
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Model</label>
              <input
                value={form.printer_model}
                onChange={(e) => setForm((p) => ({ ...p, printer_model: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="Epson TM-T20"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">IP Adresi</label>
              <input
                value={form.printer_ip}
                onChange={(e) => setForm((p) => ({ ...p, printer_ip: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="192.168.1.100"
              />
            </div>
          </div>
        </div>

        <div className="border-t" />

        {/* Mutfak yazıcısı */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
            Mutfak Yazıcısı
            <span className="text-xs font-normal text-gray-400">(sipariş bileti)</span>
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Model</label>
              <input
                value={form.kitchen_printer_model}
                onChange={(e) => setForm((p) => ({ ...p, kitchen_printer_model: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="Epson TM-T20"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">IP Adresi</label>
              <input
                value={form.kitchen_printer_ip}
                onChange={(e) => setForm((p) => ({ ...p, kitchen_printer_ip: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="192.168.1.101"
              />
            </div>
          </div>
        </div>
        <p className="text-xs text-gray-400">
          IP adresleri ileride doğrudan network baskı entegrasyonu için kullanılacak.
          Şu an tarayıcı üzerinden print dialog açılır.
        </p>
      </section>

      <button
        onClick={save}
        disabled={saving}
        className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg font-medium text-sm"
      >
        {saving ? 'Kaydediliyor...' : 'Kaydet'}
      </button>
    </div>
  )
}
