'use client'

import { useState } from 'react'
import { HelpCircle, X, Lightbulb } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface HelpStep {
  icon: LucideIcon
  title: string
  description: string
}

interface Props {
  title: string
  intro: string
  steps: HelpStep[]
  tips?: string[]
  buttonClassName?: string
}

export function HelpButton({ title, intro, steps, tips, buttonClassName }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Bu sayfa hakkında yardım"
        className={cn(
          'w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 text-gray-400 hover:bg-orange-100 hover:text-orange-600 transition-colors shrink-0',
          buttonClassName
        )}
      >
        <HelpCircle size={16} />
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between px-6 py-4 border-b shrink-0">
              <div>
                <h2 className="text-lg font-bold text-gray-900">{title}</h2>
                <p className="text-sm text-gray-500 mt-0.5">{intro}</p>
              </div>
              <button onClick={() => setOpen(false)} className="p-1.5 text-gray-400 hover:text-gray-600 shrink-0">
                <X size={20} />
              </button>
            </div>

            {/* Adımlar */}
            <div className="overflow-y-auto p-6 space-y-4">
              {steps.map((step, i) => {
                const Icon = step.icon
                return (
                  <div key={i} className="flex gap-3">
                    <div className="w-9 h-9 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                      <Icon size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{step.title}</p>
                      <p className="text-sm text-gray-500 mt-0.5">{step.description}</p>
                    </div>
                  </div>
                )
              })}

              {tips && tips.length > 0 && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex gap-2.5">
                  <Lightbulb size={16} className="text-amber-500 shrink-0 mt-0.5" />
                  <ul className="text-xs text-amber-800 space-y-1">
                    {tips.map((tip, i) => <li key={i}>{tip}</li>)}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
