'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

const PLANS = ['starter', 'pro', 'enterprise'] as const
type Plan = typeof PLANS[number]

export function PlanChangeForm({ tenantId, currentPlan }: { tenantId: string; currentPlan: string }) {
  const [plan, setPlan] = useState<Plan>(currentPlan as Plan)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (plan === currentPlan) return
    setLoading(true)

    const res = await fetch('/api/super-admin/tenants/plan', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId, plan }),
    })

    if (res.ok) {
      toast.success('Plan güncellendi.')
      router.refresh()
    } else {
      const { error } = await res.json()
      toast.error(error ?? 'Bir hata oluştu.')
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        {PLANS.map((p) => (
          <label key={p} className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors hover:bg-gray-50">
            <input
              type="radio"
              name="plan"
              value={p}
              checked={plan === p}
              onChange={() => setPlan(p)}
              className="accent-orange-500"
            />
            <div>
              <p className="text-sm font-medium capitalize text-gray-900">{p}</p>
              <p className="text-xs text-gray-500">
                {p === 'starter' && 'Temel özellikler'}
                {p === 'pro' && 'Gelişmiş özellikler + raporlar'}
                {p === 'enterprise' && 'Tüm özellikler + öncelikli destek'}
              </p>
            </div>
          </label>
        ))}
      </div>

      <button
        type="submit"
        disabled={loading || plan === currentPlan}
        className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-medium py-2 rounded-lg text-sm transition-colors"
      >
        {loading ? 'Güncelleniyor...' : 'Planı Güncelle'}
      </button>
    </form>
  )
}
