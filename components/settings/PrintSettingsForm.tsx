'use client'

import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  type PrintSettings,
  DEFAULT_SETTINGS,
  loadPrintSettings,
  savePrintSettings,
  generateReceiptHTML,
  generateKitchenHTML,
} from '@/lib/print'

// ─── Sample data for preview ─────────────────────────────────────────────────

const SAMPLE_RECEIPT_PARAMS = {
  tenantName:     'LEZZET DURAĞIM',
  tenantAddress:  'Atatürk Cad. No:12, İstanbul',
  tableName:      'Masa 5',
  orderCreatedAt: new Date().toISOString(),
  orderNo:        'abc123def456',
  waiterName:     'Mehmet K.',
  items: [
    { name: 'Hamburger',         quantity: 2, unit_price: 120, note: null },
    { name: 'Patates Kızartması',quantity: 1, unit_price:  45, note: 'az tuzlu' },
    { name: 'Kola',              quantity: 2, unit_price:  35, note: null },
  ],
  totalAmount:    355,
  paymentMethod:  'card',
}

const SAMPLE_KITCHEN_PARAMS = {
  tableName:   'Masa 5',
  orderNumber: 'abc123def456',
  items: [
    { name: 'Hamburger',          quantity: 2, unit_price: 0, note: null },
    { name: 'Patates Kızartması', quantity: 1, unit_price: 0, note: 'az tuzlu' },
    { name: 'Kola',               quantity: 2, unit_price: 0, note: null },
  ],
}

// Paper pixel widths (at 96 dpi)
const PAPER_PX: Record<string, number> = {
  '58mm': 218,
  '80mm': 302,
  'A4':   595,
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function Toggle({
  label, checked, onChange, description,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
  description?: string
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer group">
      <div className="relative mt-0.5 shrink-0">
        <input type="checkbox" className="sr-only" checked={checked} onChange={e => onChange(e.target.checked)} />
        <div className={cn(
          'w-9 h-5 rounded-full transition-colors',
          checked ? 'bg-orange-500' : 'bg-gray-200'
        )} />
        <div className={cn(
          'absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform',
          checked ? 'translate-x-4' : 'translate-x-0'
        )} />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-700">{label}</p>
        {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
      </div>
    </label>
  )
}

function WidthPicker({
  value, options, onChange,
}: {
  value: string
  options: string[]
  onChange: (v: string) => void
}) {
  return (
    <div className="flex gap-2">
      {options.map(opt => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={cn(
            'flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors',
            value === opt
              ? 'border-orange-500 bg-orange-50 text-orange-700'
              : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
          )}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}

// ─── Preview iframe ───────────────────────────────────────────────────────────

function PrintPreview({
  html, paperWidth, maxPreviewWidth = 320,
}: {
  html: string
  paperWidth: string
  maxPreviewWidth?: number
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const rawPx = PAPER_PX[paperWidth] ?? 302
  const scale  = Math.min(1, maxPreviewWidth / rawPx)
  const scaledH = 460 * scale

  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return
    iframe.srcdoc = html
  }, [html])

  return (
    <div
      className="relative border border-gray-200 rounded-xl overflow-hidden bg-gray-100 shadow-inner"
      style={{ width: maxPreviewWidth, height: scaledH + 32 }}
    >
      {/* Paper top shadow */}
      <div className="absolute inset-x-0 top-0 h-4 bg-gradient-to-b from-gray-200 to-transparent z-10 pointer-events-none" />
      <div
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          width: rawPx,
          height: 460,
          overflow: 'hidden',
        }}
      >
        <iframe
          ref={iframeRef}
          sandbox="allow-same-origin"
          title="print-preview"
          style={{ width: rawPx, height: 460, border: 'none', background: '#fff' }}
        />
      </div>
      {/* Paper label */}
      <div className="absolute bottom-0 inset-x-0 bg-gray-100 text-center py-1 text-xs text-gray-400 border-t border-gray-200">
        {paperWidth} önizleme
      </div>
    </div>
  )
}

// ─── Main form ────────────────────────────────────────────────────────────────

type Tab = 'receipt' | 'kitchen'

export function PrintSettingsForm() {
  const [settings, setSettings] = useState<PrintSettings>(DEFAULT_SETTINGS)
  const [activeTab, setActiveTab] = useState<Tab>('receipt')
  const [saved, setSaved] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    setSettings(loadPrintSettings())
  }, [])

  function update<K extends keyof PrintSettings>(key: K, value: PrintSettings[K]) {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  function handleSave() {
    savePrintSettings(settings)
    setSaved(true)
    toast.success('Baskı ayarları kaydedildi')
    setTimeout(() => setSaved(false), 2000)
  }

  const receiptHtml = generateReceiptHTML(SAMPLE_RECEIPT_PARAMS, settings)
  const kitchenHtml = generateKitchenHTML(SAMPLE_KITCHEN_PARAMS, settings)

  return (
    <section className="bg-white rounded-xl border p-5 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-gray-900">Baskı Tasarımı</h2>
          <p className="text-xs text-gray-400 mt-0.5">Adisyon ve mutfak bileti görünümünü özelleştirin</p>
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {([['receipt', 'Adisyon'], ['kitchen', 'Mutfak']] as [Tab, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={cn(
                'px-4 py-1.5 rounded-md text-sm font-medium transition-colors',
                activeTab === key ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-6">
        {/* ── Left: settings panel ── */}
        <div className="flex-1 space-y-5 min-w-0">

          {activeTab === 'receipt' && (
            <>
              {/* Paper width */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Kağıt Genişliği</label>
                <WidthPicker
                  value={settings.receiptWidth}
                  options={['58mm', '80mm', 'A4']}
                  onChange={v => update('receiptWidth', v as PrintSettings['receiptWidth'])}
                />
                <p className="text-xs text-gray-400 mt-1.5">
                  58mm → küçük termal · 80mm → standart termal · A4 → normal yazıcı
                </p>
              </div>

              {/* Fields */}
              <div className="space-y-3">
                <p className="text-sm font-medium text-gray-700">Gösterilecek Alanlar</p>
                <Toggle
                  label="Sipariş Numarası"
                  description="Siparişin kısa ID'si adisyonda gösterilir"
                  checked={settings.showOrderNo}
                  onChange={v => update('showOrderNo', v)}
                />
                <Toggle
                  label="Garson Adı"
                  description="Siparişi alan garsonun adı"
                  checked={settings.showWaiter}
                  onChange={v => update('showWaiter', v)}
                />
                <Toggle
                  label="KDV Detayı"
                  description="Tutarı KDV hariç + KDV olarak ayrıştırır (%18)"
                  checked={settings.showTax}
                  onChange={v => update('showTax', v)}
                />
              </div>

              {/* Footer */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">Alt Mesaj</p>
                <input
                  value={settings.footerLine1}
                  onChange={e => update('footerLine1', e.target.value)}
                  placeholder="Afiyet Olsun!"
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
                <input
                  value={settings.footerLine2}
                  onChange={e => update('footerLine2', e.target.value)}
                  placeholder="Teşekkürler — İyi Günler"
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </>
          )}

          {activeTab === 'kitchen' && (
            <>
              {/* Paper width */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Kağıt Genişliği</label>
                <WidthPicker
                  value={settings.kitchenWidth}
                  options={['58mm', '80mm']}
                  onChange={v => update('kitchenWidth', v as PrintSettings['kitchenWidth'])}
                />
              </div>

              {/* Options */}
              <div className="space-y-3">
                <p className="text-sm font-medium text-gray-700">Seçenekler</p>
                <Toggle
                  label="Büyük Yazı"
                  description="Masa adı ve ürünler daha büyük basılır — mutfaktan okunabilir"
                  checked={settings.kitchenLargeFont}
                  onChange={v => update('kitchenLargeFont', v)}
                />
                <Toggle
                  label="Sipariş Saati"
                  description="Baskı saati bileti üzerinde gösterilir"
                  checked={settings.kitchenShowTime}
                  onChange={v => update('kitchenShowTime', v)}
                />
              </div>
            </>
          )}

          {/* Save */}
          <button
            onClick={handleSave}
            className={cn(
              'w-full py-2.5 rounded-lg font-medium text-sm transition-colors',
              saved
                ? 'bg-green-500 text-white'
                : 'bg-orange-500 hover:bg-orange-600 text-white'
            )}
          >
            {saved ? '✓ Kaydedildi' : 'Kaydet'}
          </button>

          <p className="text-xs text-gray-400 text-center -mt-2">
            Ayarlar bu tarayıcıda saklanır. Her değişiklikte önizleme anında güncellenir.
          </p>
        </div>

        {/* ── Right: live preview ── */}
        <div className="shrink-0">
          <p className="text-xs text-gray-500 mb-2 font-medium text-center">Önizleme</p>
          {activeTab === 'receipt' && (
            <PrintPreview
              html={receiptHtml}
              paperWidth={settings.receiptWidth}
              maxPreviewWidth={300}
            />
          )}
          {activeTab === 'kitchen' && (
            <PrintPreview
              html={kitchenHtml}
              paperWidth={settings.kitchenWidth}
              maxPreviewWidth={300}
            />
          )}
        </div>
      </div>
    </section>
  )
}
