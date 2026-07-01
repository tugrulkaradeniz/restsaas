'use client'

import { useState } from 'react'
import { QrCode } from 'lucide-react'
import { QrCodesModal } from './QrCodesModal'
import type { Table } from '@/types/database'

interface Props {
  tables: Table[]
}

export function QrCodesButton({ tables }: Props) {
  const [open, setOpen] = useState(false)
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <QrCode size={16} className="text-orange-500" />
        QR Kodlar
      </button>

      {open && (
        <QrCodesModal
          tables={tables}
          baseUrl={baseUrl}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
