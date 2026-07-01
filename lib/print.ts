const PAYMENT_LABEL: Record<string, string> = {
  cash: 'Nakit',
  card: 'Kredi Kartı',
  pos:  'POS / QR',
}

function fmt(amount: number) {
  return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2 }).format(amount) + ' ₺'
}

function openPrint(html: string) {
  const win = window.open('', '_blank', 'width=380,height=620,toolbar=0,menubar=0,scrollbars=0')
  if (!win) {
    alert('Pop-up engellendi. Lütfen tarayıcınızda pop-up\'a izin verin.')
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

const BASE_STYLE = `
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 12px;
      color: #000;
      background: #fff;
      padding: 8px 10px;
      width: 302px;
    }
    .center { text-align: center; }
    .right  { text-align: right; }
    .bold   { font-weight: bold; }
    .lg     { font-size: 15px; }
    .xl     { font-size: 20px; }
    .dashed { border-top: 1px dashed #000; margin: 6px 0; }
    .solid  { border-top: 2px solid #000; margin: 6px 0; }
    .row    { display: flex; justify-content: space-between; align-items: baseline; }
    .note   { font-size: 11px; color: #555; padding-left: 12px; }
    @media print {
      body { width: 100%; padding: 0 4px; }
      @page { size: 80mm auto; margin: 2mm; }
    }
  </style>
`

interface ReceiptItem {
  name: string
  quantity: number
  unit_price: number
  note?: string | null
}

export interface ReceiptParams {
  tenantName: string
  tenantAddress?: string | null
  tableName: string
  orderCreatedAt: string
  items: ReceiptItem[]
  totalAmount: number
  paymentMethod?: string | null
}

export function printReceipt(p: ReceiptParams) {
  const dateStr = new Date(p.orderCreatedAt).toLocaleString('tr-TR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  const itemRows = p.items.map(item => `
    <div class="row">
      <span>${item.quantity}x ${item.name}</span>
      <span>${fmt(item.quantity * item.unit_price)}</span>
    </div>
    ${item.note ? `<div class="note">↳ ${item.note}</div>` : ''}
  `).join('')

  const html = `<!DOCTYPE html><html lang="tr"><head>
    <meta charset="utf-8"><title>Adisyon</title>
    ${BASE_STYLE}
  </head><body>
    <div class="center bold xl">${esc(p.tenantName)}</div>
    ${p.tenantAddress ? `<div class="center" style="font-size:11px">${esc(p.tenantAddress)}</div>` : ''}
    <div class="dashed"></div>

    <div class="row"><span>Masa</span><span class="bold">${esc(p.tableName)}</span></div>
    <div class="row"><span>Tarih</span><span>${dateStr}</span></div>
    <div class="dashed"></div>

    ${itemRows}
    <div class="solid"></div>

    <div class="row bold lg">
      <span>TOPLAM</span>
      <span>${fmt(p.totalAmount)}</span>
    </div>
    ${p.paymentMethod ? `
    <div class="row" style="margin-top:4px">
      <span>Ödeme</span>
      <span>${PAYMENT_LABEL[p.paymentMethod] ?? p.paymentMethod}</span>
    </div>` : ''}

    <div class="dashed"></div>
    <div class="center bold" style="margin-top:4px">Afiyet Olsun!</div>
    <div class="center" style="font-size:11px;margin-top:2px">Teşekkürler — İyi Günler</div>
    <br><br>
  </body></html>`

  openPrint(html)
}

export interface KitchenTicketParams {
  tableName: string
  orderNumber?: string
  items: ReceiptItem[]
  note?: string | null
}

export function printKitchenTicket(p: KitchenTicketParams) {
  const timeStr = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })

  const itemRows = p.items.map(item => `
    <div class="row bold lg" style="margin: 5px 0">
      <span>${item.quantity}x&nbsp;${esc(item.name)}</span>
    </div>
    ${item.note ? `<div class="note bold">★ ${esc(item.note)}</div>` : ''}
  `).join('')

  const html = `<!DOCTYPE html><html lang="tr"><head>
    <meta charset="utf-8"><title>Mutfak Bileti</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body {
        font-family: 'Courier New', Courier, monospace;
        font-size: 14px;
        color: #000;
        background: #fff;
        padding: 8px 10px;
        width: 302px;
      }
      .center { text-align: center; }
      .bold   { font-weight: bold; }
      .lg     { font-size: 16px; }
      .xl     { font-size: 28px; line-height: 1.1; }
      .dashed { border-top: 1px dashed #000; margin: 6px 0; }
      .solid  { border-top: 3px solid #000; margin: 6px 0; }
      .row    { display: flex; justify-content: space-between; }
      .note   { font-size: 13px; padding-left: 10px; margin-top: 2px; }
      @media print {
        body { width: 100%; }
        @page { size: 80mm auto; margin: 2mm; }
      }
    </style>
  </head><body>
    <div class="center bold" style="font-size:13px;letter-spacing:2px">MUTFAK BİLETİ</div>
    <div class="solid"></div>

    <div class="center bold xl">${esc(p.tableName)}</div>
    <div class="center" style="font-size:18px;font-weight:bold;margin:4px 0">${timeStr}</div>

    <div class="solid"></div>
    ${itemRows}
    <div class="dashed"></div>
    <br><br>
  </body></html>`

  openPrint(html)
}

function esc(str: string) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
