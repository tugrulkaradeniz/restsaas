'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { StockMovement, StockMovementType } from './types'

const TYPE_LABEL: Record<StockMovementType, string> = {
  order: 'Sipariş Düşümü',
  purchase: 'Satın Alma',
  adjustment: 'Manuel Düzenleme',
}

const TYPE_COLOR: Record<StockMovementType, string> = {
  order: 'bg-red-100 text-red-700',
  purchase: 'bg-green-100 text-green-700',
  adjustment: 'bg-blue-100 text-blue-700',
}

interface Props {
  movements: StockMovement[]
}

export function MovementsTab({ movements }: Props) {
  const [typeFilter, setTypeFilter] = useState<StockMovementType | 'all'>('all')

  const filtered = typeFilter === 'all' ? movements : movements.filter((m) => m.type === typeFilter)

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        {(['all', 'order', 'purchase', 'adjustment'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
              typeFilter === t ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            {t === 'all' ? 'Tümü' : TYPE_LABEL[t]}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        {filtered.length === 0 ? (
          <p className="text-center py-12 text-sm text-gray-400">Hareket yok</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b text-xs">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Tarih</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Malzeme</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Tip</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Değişim</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Sonrasında Stok</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Not</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((m) => (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                    {new Date(m.created_at).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">{m.ingredient?.name ?? '?'}</td>
                  <td className="px-4 py-3">
                    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', TYPE_COLOR[m.type])}>
                      {TYPE_LABEL[m.type]}
                    </span>
                  </td>
                  <td className={cn('px-4 py-3 text-right font-medium', m.quantity_change >= 0 ? 'text-green-600' : 'text-red-600')}>
                    {m.quantity_change >= 0 ? '+' : ''}{m.quantity_change} {m.ingredient?.unit ?? ''}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700">{m.resulting_qty} {m.ingredient?.unit ?? ''}</td>
                  <td className="px-4 py-3 text-gray-500">{m.note ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
