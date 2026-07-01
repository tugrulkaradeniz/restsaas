// ─── Types ───────────────────────────────────────────────────────────────────

export interface PrintSettings {
  // Adisyon
  receiptWidth:   '58mm' | '80mm' | 'A4'
  showOrderNo:    boolean
  showWaiter:     boolean
  showTax:        boolean
  footerLine1:    string
  footerLine2:    string
  // Mutfak
  kitchenWidth:     '58mm' | '80mm'
  kitchenLargeFont: boolean
  kitchenShowTime:  boolean
}

export const DEFAULT_SETTINGS: PrintSettings = {
  receiptWidth:  '80mm',
  showOrderNo:   false,
  showWaiter:    false,
  showTax:       false,
  footerLine1:   'Afiyet Olsun!',
  footerLine2:   'Teşekkürler — İyi Günler',
  kitchenWidth:     '80mm',
  kitchenLargeFont: true,
  kitchenShowTime:  true,
}

const STORAGE_KEY = 'print_settings'

export function loadPrintSettings(): PrintSettings {
  try {
    if (typeof window === 'undefined') return DEFAULT_SETTINGS
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
  } catch { /* ignore */ }
  return DEFAULT_SETTINGS
}

export function savePrintSettings(s: PrintSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PAYMENT_LABEL: Record<string, string> = {
  cash: 'Nakit',
  card: 'Kredi Kartı',
  pos:  'POS / QR',
}

function fmt(amount: number) {
  return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2 }).format(amount) + ' ₺'
}

function esc(str: string) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

// Maps paper width → CSS body pixel width + @page size
const PAPER: Record<string, { px: number; page: string }> = {
  '58mm': { px: 218, page: '58mm auto' },
  '80mm': { px: 302, page: '80mm auto' },
  'A4':   { px: 595, page: 'A4 portrait' },
}

// ─── Receipt ─────────────────────────────────────────────────────────────────

export interface ReceiptItem {
  name: string
  quantity: number
  unit_price: number
  note?: string | null
}

export interface ReceiptParams {
  tenantName:       string
  tenantAddress?:   string | null
  tableName:        string
  orderCreatedAt:   string
  orderNo?:         string | null
  waiterName?:      string | null
  items:            ReceiptItem[]
  totalAmount:      number
  paymentMethod?:   string | null
}

export function generateReceiptHTML(p: ReceiptParams, s: PrintSettings): string {
  const paper = PAPER[s.receiptWidth]
  const fs    = s.receiptWidth === '58mm' ? 11 : 12

  const dateStr = new Date(p.orderCreatedAt).toLocaleString('tr-TR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  const itemRows = p.items.map(item => `
    <div class="row">
      <span class="item-name">${item.quantity}x ${esc(item.name)}</span>
      <span class="price">${fmt(item.quantity * item.unit_price)}</span>
    </div>
    ${item.note ? `<div class="note">↳ ${esc(item.note)}</div>` : ''}
  `).join('')

  const taxAmount = s.showTax ? p.totalAmount / 1.18 * 0.18 : 0
  const netAmount = p.totalAmount - taxAmount

  return `<!DOCTYPE html><html lang="tr"><head>
  <meta charset="utf-8">
  <title>Adisyon</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: ${fs}px;
      color: #000;
      background: #fff;
      padding: 10px 12px;
      width: ${paper.px}px;
    }
    .center  { text-align: center; }
    .right   { text-align: right; }
    .bold    { font-weight: bold; }
    .lg      { font-size: ${fs + 3}px; }
    .xl      { font-size: ${fs + 8}px; }
    .dashed  { border-top: 1px dashed #000; margin: 7px 0; }
    .solid   { border-top: 2px solid #000; margin: 7px 0; }
    .row     { display: flex; justify-content: space-between; align-items: baseline; margin: 2px 0; }
    .item-name { flex: 1; margin-right: 8px; word-break: break-word; }
    .price   { white-space: nowrap; }
    .note    { font-size: ${fs - 1}px; color: #555; padding-left: 14px; margin-bottom: 2px; }
    @media print {
      body { width: 100%; padding: 0 6px; }
      @page { size: ${paper.page}; margin: 2mm; }
    }
  </style>
</head><body>
  <div class="center bold xl">${esc(p.tenantName)}</div>
  ${p.tenantAddress ? `<div class="center" style="margin-top:2px">${esc(p.tenantAddress)}</div>` : ''}
  <div class="dashed"></div>

  <div class="row"><span>Masa</span><span class="bold">${esc(p.tableName)}</span></div>
  <div class="row"><span>Tarih</span><span>${dateStr}</span></div>
  ${s.showOrderNo && p.orderNo ? `<div class="row"><span>Sipariş No</span><span>#${esc(p.orderNo.slice(-6).toUpperCase())}</span></div>` : ''}
  ${s.showWaiter  && p.waiterName ? `<div class="row"><span>Garson</span><span>${esc(p.waiterName)}</span></div>` : ''}
  <div class="dashed"></div>

  ${itemRows}
  <div class="solid"></div>

  ${s.showTax ? `
  <div class="row"><span>Ara Toplam</span><span>${fmt(netAmount)}</span></div>
  <div class="row"><span>KDV (%18)</span><span>${fmt(taxAmount)}</span></div>
  <div class="dashed"></div>` : ''}

  <div class="row bold lg">
    <span>TOPLAM</span>
    <span>${fmt(p.totalAmount)}</span>
  </div>

  ${p.paymentMethod ? `
  <div class="row" style="margin-top:4px">
    <span>Ödeme</span>
    <span>${esc(PAYMENT_LABEL[p.paymentMethod] ?? p.paymentMethod)}</span>
  </div>` : ''}

  <div class="dashed"></div>
  ${s.footerLine1 ? `<div class="center bold" style="margin-top:4px">${esc(s.footerLine1)}</div>` : ''}
  ${s.footerLine2 ? `<div class="center" style="font-size:${fs - 1}px;margin-top:2px">${esc(s.footerLine2)}</div>` : ''}
  <br><br>
</body></html>`
}

// ─── Kitchen Ticket ───────────────────────────────────────────────────────────

export interface KitchenTicketParams {
  tableName:    string
  orderNumber?: string
  items:        ReceiptItem[]
  note?:        string | null
}

export function generateKitchenHTML(p: KitchenTicketParams, s: PrintSettings): string {
  const paper  = PAPER[s.kitchenWidth]
  const baseFn = s.kitchenLargeFont ? 15 : 12
  const tableFs = s.kitchenLargeFont ? 28 : 20
  const itemFs  = s.kitchenLargeFont ? 17 : 14
  const timeStr = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })

  const itemRows = p.items.map(item => `
    <div style="margin: 6px 0;">
      <span style="font-size:${itemFs}px;font-weight:bold">${item.quantity}x ${esc(item.name)}</span>
      ${item.note ? `<div style="font-size:${baseFn - 1}px;padding-left:12px;margin-top:2px">★ ${esc(item.note)}</div>` : ''}
    </div>
  `).join('')

  return `<!DOCTYPE html><html lang="tr"><head>
  <meta charset="utf-8">
  <title>Mutfak Bileti</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: ${baseFn}px;
      color: #000;
      background: #fff;
      padding: 10px 12px;
      width: ${paper.px}px;
    }
    .center { text-align: center; }
    .dashed { border-top: 1px dashed #000; margin: 6px 0; }
    .solid  { border-top: 3px solid #000; margin: 7px 0; }
    @media print {
      body { width: 100%; }
      @page { size: ${paper.page}; margin: 2mm; }
    }
  </style>
</head><body>
  <div class="center" style="font-size:${baseFn}px;font-weight:bold;letter-spacing:3px">MUTFAK BİLETİ</div>
  <div class="solid"></div>

  <div class="center" style="font-size:${tableFs}px;font-weight:bold;line-height:1.1">${esc(p.tableName)}</div>
  ${s.kitchenShowTime ? `<div class="center" style="font-size:${baseFn + 4}px;font-weight:bold;margin:4px 0">${timeStr}</div>` : ''}
  ${p.orderNumber ? `<div class="center" style="font-size:${baseFn}px">#${esc(p.orderNumber.slice(-6).toUpperCase())}</div>` : ''}

  <div class="solid"></div>
  ${itemRows}
  <div class="dashed"></div>
  <br><br>
</body></html>`
}

// ─── Public print functions (auto-load settings) ──────────────────────────────

function openPrint(html: string) {
  const win = window.open('', '_blank', 'width=420,height=680,toolbar=0,menubar=0,scrollbars=0')
  if (!win) {
    alert('Pop-up engellendi. Tarayıcınızda bu site için pop-up\'a izin verin.')
    return
  }
  win.document.write(html)
  win.document.close()
  win.onload = () => {
    setTimeout(() => {
      win.focus()
      win.print()
    }, 200)
  }
}

export function printReceipt(p: ReceiptParams, settingsOverride?: Partial<PrintSettings>) {
  const s = { ...loadPrintSettings(), ...settingsOverride }
  openPrint(generateReceiptHTML(p, s))
}

export function printKitchenTicket(p: KitchenTicketParams, settingsOverride?: Partial<PrintSettings>) {
  const s = { ...loadPrintSettings(), ...settingsOverride }
  openPrint(generateKitchenHTML(p, s))
}
