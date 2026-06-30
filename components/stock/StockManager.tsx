'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { IngredientsTab } from './IngredientsTab'
import { SuppliersTab } from './SuppliersTab'
import { EntriesTab } from './EntriesTab'
import type { Ingredient, Supplier } from '@/types/database'
import type { StockEntry } from './types'

const TABS = [
  { key: 'ingredients', label: 'Malzemeler' },
  { key: 'suppliers',   label: 'Tedarikçiler' },
  { key: 'entries',     label: 'Faturalar' },
]

interface Props {
  initialIngredients: Ingredient[]
  initialSuppliers:   Supplier[]
  initialEntries:     StockEntry[]
  tenantId:           string
}

export function StockManager({ initialIngredients, initialSuppliers, initialEntries, tenantId }: Props) {
  const [tab, setTab] = useState('entries')
  const [ingredients, setIngredients] = useState<Ingredient[]>(initialIngredients)
  const [suppliers, setSuppliers]     = useState<Supplier[]>(initialSuppliers)
  const [entries, setEntries]         = useState<StockEntry[]>(initialEntries)

  return (
    <div>
      <div className="flex border-b border-gray-200 mb-6">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'px-5 py-2.5 text-sm font-medium border-b-2 transition-colors',
              tab === t.key
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'ingredients' && (
        <IngredientsTab
          ingredients={ingredients}
          setIngredients={setIngredients}
          tenantId={tenantId}
        />
      )}
      {tab === 'suppliers' && (
        <SuppliersTab
          suppliers={suppliers}
          setSuppliers={setSuppliers}
          tenantId={tenantId}
        />
      )}
      {tab === 'entries' && (
        <EntriesTab
          entries={entries}
          setEntries={setEntries}
          ingredients={ingredients}
          suppliers={suppliers}
        />
      )}
    </div>
  )
}
