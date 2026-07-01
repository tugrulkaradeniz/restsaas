'use client'

import { useState } from 'react'
import { BellRing, Check, Loader2 } from 'lucide-react'

interface Props {
  tableId: string
  tableName: string
}

type State = 'idle' | 'loading' | 'sent' | 'error'

export function CallWaiterButton({ tableId, tableName }: Props) {
  const [state, setState] = useState<State>('idle')

  async function callWaiter() {
    if (state === 'loading' || state === 'sent') return
    setState('loading')
    try {
      const res = await fetch('/api/waiter-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableId }),
      })
      if (res.ok) {
        setState('sent')
        setTimeout(() => setState('idle'), 30_000) // reset after 30s
      } else {
        setState('error')
        setTimeout(() => setState('idle'), 3000)
      }
    } catch {
      setState('error')
      setTimeout(() => setState('idle'), 3000)
    }
  }

  if (state === 'sent') {
    return (
      <div className="fixed bottom-20 inset-x-0 flex justify-center px-4">
        <div className="flex items-center gap-3 bg-green-500 text-white px-5 py-3 rounded-full shadow-lg text-sm font-medium">
          <Check size={18} />
          Garson yolda! {tableName} masasına geliyor.
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={callWaiter}
      disabled={state === 'loading'}
      className="fixed bottom-20 right-4 flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-70 text-white px-5 py-3 rounded-full shadow-lg text-sm font-semibold transition-colors"
    >
      {state === 'loading'
        ? <Loader2 size={18} className="animate-spin" />
        : <BellRing size={18} />
      }
      {state === 'loading' ? 'Gönderiliyor...' : 'Garson Çağır'}
    </button>
  )
}
