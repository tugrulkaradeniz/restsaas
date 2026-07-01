'use client'

import { useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { X, Printer } from 'lucide-react'
import type { Table } from '@/types/database'

interface Props {
  tables: Table[]
  baseUrl: string
  onClose: () => void
}

export function QrCodesModal({ tables, baseUrl, onClose }: Props) {
  const printRef = useRef<HTMLDivElement>(null)

  function printAll() {
    const content = printRef.current
    if (!content) return
    const win = window.open('', '_blank', 'width=800,height=600')
    if (!win) { alert('Pop-up engellenmiş'); return }
    win.document.write(`<!DOCTYPE html><html><head>
      <meta charset="utf-8"><title>QR Kodlar</title>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family: sans-serif; padding: 20px; }
        .grid { display: flex; flex-wrap: wrap; gap: 16px; }
        .card { border: 1px solid #ddd; border-radius: 8px; padding: 16px; text-align: center; width: 180px; }
        .card p { font-weight: bold; margin-top: 8px; font-size: 14px; }
        .card small { color: #888; font-size: 11px; word-break: break-all; }
        @media print { @page { size: A4 portrait; margin: 10mm; } }
      </style>
    </head><body>${content.innerHTML}</body></html>`)
    win.document.close()
    win.onload = () => { win.focus(); win.print() }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <h2 className="text-lg font-bold text-gray-900">Masa QR Kodları</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={printAll}
              className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-orange-600"
            >
              <Printer size={15} /> Tümünü Yazdır
            </button>
            <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* QR Grid */}
        <div className="overflow-y-auto p-6">
          <div ref={printRef} className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
            {tables.map(table => {
              const url = `${baseUrl}/menu/${table.qr_token}`
              return (
                <div key={table.id} className="border rounded-xl p-3 text-center hover:border-orange-300 transition-colors">
                  <QRCodeSVG
                    value={url}
                    size={100}
                    className="mx-auto"
                    level="M"
                    includeMargin
                  />
                  <p className="font-semibold text-sm text-gray-900 mt-2">{table.name}</p>
                  <p className="text-xs text-gray-400">{table.capacity} kişi</p>
                </div>
              )
            })}
          </div>
        </div>

        <p className="px-6 py-3 border-t text-xs text-gray-400 shrink-0">
          QR kodlar müşterilerin menüye erişmesini sağlar. Masaya bastırıp yapıştırabilirsiniz.
        </p>
      </div>
    </div>
  )
}
