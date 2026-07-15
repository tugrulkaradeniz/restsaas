'use client'

import { Printer } from 'lucide-react'
import { printShiftReport, type ShiftReportParams } from '@/lib/print'

export default function ShiftReportPrintButton({ report }: { report: ShiftReportParams }) {
  return (
    <button
      onClick={() => printShiftReport(report)}
      className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
    >
      <Printer size={15} />
      Yazdır
    </button>
  )
}
