'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { cn, formatCurrency } from '@/lib/utils'
import type { MenuCategory, MenuItem } from '@/types/database'
import type { Campaign, CampaignType } from './types'
import { CAMPAIGN_TYPE_LABELS } from './types'
import { CampaignModal } from './CampaignModal'
import { Plus, Pencil, Trash2, Clock, ToggleLeft, ToggleRight } from 'lucide-react'

const TYPE_COLORS: Record<CampaignType, string> = {
  happy_hour:     'bg-orange-100 text-orange-700',
  bundle:         'bg-blue-100 text-blue-700',
  bogo:           'bg-green-100 text-green-700',
  category:       'bg-purple-100 text-purple-700',
  order_discount: 'bg-teal-100 text-teal-700',
}

const DAY_LABELS: Record<number, string> = { 0:'Paz', 1:'Pzt', 2:'Sal', 3:'Çar', 4:'Per', 5:'Cum', 6:'Cmt' }

function CampaignSummary({ c }: { c: Campaign }) {
  const parts: string[] = []

  if (c.type === 'happy_hour' || c.type === 'category') {
    const disc = c.discount_type === 'percent' ? `%${c.value}` : `${formatCurrency(c.value)}`
    parts.push(`${disc} indirim`)
    if (c.type === 'category') {
      const cat = c.items?.[0]?.category?.name
      if (cat) parts.push(`"${cat}" kategorisi`)
    } else {
      const itemCount = c.items?.length ?? 0
      parts.push(itemCount === 0 ? 'tüm ürünler' : `${itemCount} ürün`)
    }
  }

  if (c.type === 'order_discount') {
    const disc = c.discount_type === 'percent' ? `%${c.value}` : formatCurrency(c.value)
    parts.push(`${disc} indirim`)
    if (c.min_order_amount) parts.push(`min ${formatCurrency(c.min_order_amount)}`)
  }

  if (c.type === 'bundle') {
    const names = c.items?.map(i => i.menu_item?.name).filter(Boolean).join(' + ')
    if (names) parts.push(names)
    if (c.bundle_price) parts.push(`→ ${formatCurrency(c.bundle_price)}`)
    else if (c.value) parts.push(`→ %${c.value} indirim`)
  }

  if (c.type === 'bogo') {
    const main = c.items?.find(i => i.role === 'main')
    const free = c.items?.find(i => i.role === 'free')
    const name = main?.menu_item?.name ?? '?'
    parts.push(`${main?.quantity ?? 2} al ${free?.quantity ?? 1} bedava — ${name}`)
  }

  if (c.start_time && c.end_time) {
    const days = c.days_of_week
      ? c.days_of_week.sort().map(d => DAY_LABELS[d]).join(' ')
      : 'Her gün'
    parts.push(`${c.start_time.slice(0,5)}–${c.end_time.slice(0,5)} (${days})`)
  }

  if (c.valid_from || c.valid_to) {
    const from = c.valid_from ? new Date(c.valid_from).toLocaleDateString('tr-TR') : '...'
    const to   = c.valid_to   ? new Date(c.valid_to).toLocaleDateString('tr-TR')   : '...'
    parts.push(`${from} – ${to}`)
  }

  return <p className="text-xs text-gray-500 mt-1">{parts.join('  ·  ')}</p>
}

interface Props {
  initialCampaigns: Campaign[]
  menuItems:        (MenuItem & { category?: { name: string } | null })[]
  categories:       MenuCategory[]
}

export function CampaignsManager({ initialCampaigns, menuItems, categories }: Props) {
  const [campaigns, setCampaigns] = useState<Campaign[]>(initialCampaigns)
  const [showModal, setShowModal] = useState(false)
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  function openNew()           { setEditingCampaign(null); setShowModal(true) }
  function openEdit(c: Campaign) { setEditingCampaign(c);  setShowModal(true) }

  function onSaved(c: Campaign) {
    setCampaigns(prev =>
      prev.some(x => x.id === c.id)
        ? prev.map(x => x.id === c.id ? c : x)
        : [c, ...prev]
    )
    setShowModal(false)
    setEditingCampaign(null)
  }

  async function toggleActive(c: Campaign) {
    const res  = await fetch(`/api/campaigns/${c.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !c.is_active }),
    })
    const data = await res.json()
    if (!res.ok) { toast.error(data.error); return }
    setCampaigns(prev => prev.map(x => x.id === c.id ? data.campaign : x))
  }

  async function deleteCampaign(id: string) {
    if (!confirm('Bu kampanyayı silmek istediğinizden emin misiniz?')) return
    setDeletingId(id)
    const res = await fetch(`/api/campaigns/${id}`, { method: 'DELETE' })
    setDeletingId(null)
    if (!res.ok) { toast.error('Silinemedi'); return }
    setCampaigns(prev => prev.filter(c => c.id !== id))
    toast.success('Kampanya silindi')
  }

  const active   = campaigns.filter(c => c.is_active)
  const inactive = campaigns.filter(c => !c.is_active)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="text-sm text-gray-500">
          {active.length} aktif · {inactive.length} pasif kampanya
        </div>
        <button onClick={openNew}
          className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-orange-600">
          <Plus size={15} /> Yeni Kampanya
        </button>
      </div>

      {campaigns.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <p className="text-4xl mb-3">🏷️</p>
          <p className="font-medium">Henüz kampanya oluşturulmadı</p>
          <p className="text-sm mt-1">Saatli indirim, kombo veya diğer kampanyaları buradan yönet</p>
        </div>
      )}

      {[true, false].map(isActive => {
        const list = campaigns.filter(c => c.is_active === isActive)
        if (list.length === 0) return null
        return (
          <div key={String(isActive)} className="mb-6">
            <h3 className={cn('text-xs font-semibold uppercase tracking-wide mb-3',
              isActive ? 'text-green-600' : 'text-gray-400')}>
              {isActive ? 'Aktif Kampanyalar' : 'Pasif Kampanyalar'}
            </h3>
            <div className="space-y-2">
              {list.map(c => (
                <div key={c.id}
                  className={cn('bg-white rounded-xl border px-4 py-3 flex items-center gap-4 transition-opacity',
                    !c.is_active && 'opacity-60')}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', TYPE_COLORS[c.type])}>
                        {CAMPAIGN_TYPE_LABELS[c.type]}
                      </span>
                      <p className="font-medium text-gray-900">{c.name}</p>
                      {c.start_time && (
                        <span className="flex items-center gap-0.5 text-xs text-gray-400">
                          <Clock size={11} /> {c.start_time.slice(0,5)}–{c.end_time?.slice(0,5)}
                        </span>
                      )}
                    </div>
                    <CampaignSummary c={c} />
                    {c.description && <p className="text-xs text-gray-400 mt-0.5 italic">{c.description}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => toggleActive(c)} title={c.is_active ? 'Pasife al' : 'Aktife al'}
                      className="p-2 hover:bg-gray-100 rounded-lg">
                      {c.is_active
                        ? <ToggleRight size={20} className="text-green-500" />
                        : <ToggleLeft  size={20} className="text-gray-400" />}
                    </button>
                    <button onClick={() => openEdit(c)} className="p-2 hover:bg-gray-100 rounded-lg">
                      <Pencil size={15} className="text-gray-400" />
                    </button>
                    <button onClick={() => deleteCampaign(c.id)} disabled={deletingId === c.id}
                      className="p-2 hover:bg-red-50 rounded-lg">
                      <Trash2 size={15} className="text-red-400" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {showModal && (
        <CampaignModal
          type={null}
          editing={editingCampaign}
          menuItems={menuItems}
          categories={categories}
          onClose={() => { setShowModal(false); setEditingCampaign(null) }}
          onSaved={onSaved}
        />
      )}
    </div>
  )
}
