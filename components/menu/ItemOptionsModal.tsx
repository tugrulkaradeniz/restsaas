'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { X, Plus, Trash2, GripVertical, Check } from 'lucide-react'
import type { ItemOptionGroup, ItemOption } from '@/types/database'

type GroupWithOptions = ItemOptionGroup & { options: ItemOption[] }

interface Props {
  menuItemId: string
  menuItemName: string
  tenantId: string
  onClose: () => void
}

const blankGroup = { name: '', is_required: false, max_select: 1 }
const blankOption = { name: '', price_delta: '' }

export function ItemOptionsModal({ menuItemId, menuItemName, tenantId, onClose }: Props) {
  const [groups, setGroups] = useState<GroupWithOptions[]>([])
  const [loading, setLoading] = useState(true)
  const [addingGroup, setAddingGroup] = useState(false)
  const [newGroup, setNewGroup] = useState({ ...blankGroup })
  const [addingOption, setAddingOption] = useState<string | null>(null)
  const [newOption, setNewOption] = useState({ ...blankOption })
  const supabase = createClient()

  async function load() {
    const { data } = await supabase
      .from('item_option_groups')
      .select('*, options:item_options(*)')
      .eq('menu_item_id', menuItemId)
      .order('sort_order')
    setGroups((data ?? []).map(g => ({
      ...g,
      options: (g.options ?? []).sort((a: ItemOption, b: ItemOption) => a.sort_order - b.sort_order),
    })))
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function addGroup() {
    if (!newGroup.name.trim()) return
    const { data, error } = await supabase.from('item_option_groups').insert({
      menu_item_id: menuItemId,
      tenant_id: tenantId,
      name: newGroup.name.trim(),
      is_required: newGroup.is_required,
      max_select: newGroup.max_select,
      sort_order: groups.length,
    }).select().single()
    if (error) { toast.error(error.message); return }
    setGroups(prev => [...prev, { ...(data as ItemOptionGroup), options: [] }])
    setNewGroup({ ...blankGroup })
    setAddingGroup(false)
  }

  async function deleteGroup(groupId: string) {
    if (!confirm('Bu grubu ve tüm seçeneklerini silmek istediğinden emin misin?')) return
    await supabase.from('item_option_groups').delete().eq('id', groupId)
    setGroups(prev => prev.filter(g => g.id !== groupId))
  }

  async function addOption(groupId: string) {
    if (!newOption.name.trim()) return
    const group = groups.find(g => g.id === groupId)!
    const { data, error } = await supabase.from('item_options').insert({
      group_id: groupId,
      tenant_id: tenantId,
      name: newOption.name.trim(),
      price_delta: parseFloat(newOption.price_delta || '0'),
      sort_order: group.options.length,
    }).select().single()
    if (error) { toast.error(error.message); return }
    setGroups(prev => prev.map(g =>
      g.id === groupId ? { ...g, options: [...g.options, data as ItemOption] } : g
    ))
    setNewOption({ ...blankOption })
    setAddingOption(null)
  }

  async function deleteOption(groupId: string, optionId: string) {
    await supabase.from('item_options').delete().eq('id', optionId)
    setGroups(prev => prev.map(g =>
      g.id === groupId ? { ...g, options: g.options.filter(o => o.id !== optionId) } : g
    ))
  }

  async function toggleOptionActive(groupId: string, optionId: string, current: boolean) {
    await supabase.from('item_options').update({ is_active: !current }).eq('id', optionId)
    setGroups(prev => prev.map(g =>
      g.id === groupId
        ? { ...g, options: g.options.map(o => o.id === optionId ? { ...o, is_active: !current } : o) }
        : g
    ))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0">
          <div>
            <h2 className="font-bold text-gray-900">Ürün Seçenekleri</h2>
            <p className="text-xs text-gray-500">{menuItemName}</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {loading ? (
            <div className="text-center text-gray-400 py-8">Yükleniyor...</div>
          ) : (
            <>
              {groups.map(group => (
                <div key={group.id} className="border rounded-xl overflow-hidden">
                  {/* Group header */}
                  <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b">
                    <GripVertical size={14} className="text-gray-300" />
                    <div className="flex-1">
                      <span className="font-semibold text-sm text-gray-900">{group.name}</span>
                      <span className="ml-2 text-xs text-gray-500">
                        {group.is_required ? '· Zorunlu' : '· İsteğe bağlı'}
                        {group.max_select > 1 ? ` · Maks ${group.max_select}` : ' · Tek seçim'}
                      </span>
                    </div>
                    <button onClick={() => deleteGroup(group.id)} className="p-1 text-gray-400 hover:text-red-500">
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {/* Options */}
                  <div className="divide-y">
                    {group.options.map(opt => (
                      <div key={opt.id} className="flex items-center gap-2 px-4 py-2.5">
                        <span className={`flex-1 text-sm ${opt.is_active ? 'text-gray-900' : 'text-gray-400 line-through'}`}>
                          {opt.name}
                        </span>
                        <span className="text-xs text-gray-500 w-16 text-right">
                          {opt.price_delta > 0 ? `+${opt.price_delta}₺` : opt.price_delta < 0 ? `${opt.price_delta}₺` : 'Ücretsiz'}
                        </span>
                        <button
                          onClick={() => toggleOptionActive(group.id, opt.id, opt.is_active)}
                          className={`text-xs px-2 py-0.5 rounded-full ${opt.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                        >
                          {opt.is_active ? 'Aktif' : 'Pasif'}
                        </button>
                        <button onClick={() => deleteOption(group.id, opt.id)} className="p-1 text-gray-400 hover:text-red-500">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}

                    {/* Add option inline */}
                    {addingOption === group.id ? (
                      <div className="flex items-center gap-2 px-4 py-2.5 bg-orange-50">
                        <input
                          value={newOption.name}
                          onChange={e => setNewOption(p => ({ ...p, name: e.target.value }))}
                          placeholder="Seçenek adı"
                          className="flex-1 border rounded-lg px-2.5 py-1.5 text-sm"
                          autoFocus
                          onKeyDown={e => e.key === 'Enter' && addOption(group.id)}
                        />
                        <input
                          type="number"
                          value={newOption.price_delta}
                          onChange={e => setNewOption(p => ({ ...p, price_delta: e.target.value }))}
                          placeholder="+₺"
                          className="w-20 border rounded-lg px-2.5 py-1.5 text-sm"
                        />
                        <button onClick={() => addOption(group.id)} className="p-1.5 bg-orange-500 text-white rounded-lg">
                          <Check size={14} />
                        </button>
                        <button onClick={() => { setAddingOption(null); setNewOption({ ...blankOption }) }} className="p-1.5 text-gray-400">
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setAddingOption(group.id); setNewOption({ ...blankOption }) }}
                        className="flex items-center gap-2 px-4 py-2 text-xs text-orange-500 hover:bg-orange-50 w-full"
                      >
                        <Plus size={12} /> Seçenek Ekle
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {/* Add group */}
              {addingGroup ? (
                <div className="border border-orange-200 rounded-xl p-4 bg-orange-50 space-y-3">
                  <input
                    value={newGroup.name}
                    onChange={e => setNewGroup(p => ({ ...p, name: e.target.value }))}
                    placeholder="Grup adı (örn: Boyut, Ekstra Malzeme)"
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    autoFocus
                    onKeyDown={e => e.key === 'Enter' && addGroup()}
                  />
                  <div className="flex items-center gap-4 flex-wrap">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={newGroup.is_required}
                        onChange={e => setNewGroup(p => ({ ...p, is_required: e.target.checked }))}
                        className="rounded"
                      />
                      Zorunlu seçim
                    </label>
                    <div className="flex items-center gap-2 text-sm">
                      <label>Maks seçim:</label>
                      <select
                        value={newGroup.max_select}
                        onChange={e => setNewGroup(p => ({ ...p, max_select: parseInt(e.target.value) }))}
                        className="border rounded px-2 py-1 text-sm"
                      >
                        {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={addGroup} className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600">
                      Grup Ekle
                    </button>
                    <button onClick={() => { setAddingGroup(false); setNewGroup({ ...blankGroup }) }}
                      className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                      İptal
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setAddingGroup(true)}
                  className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 hover:border-orange-300 hover:text-orange-500 transition-colors"
                >
                  <Plus size={16} /> Yeni Seçenek Grubu Ekle
                </button>
              )}
            </>
          )}
        </div>

        <div className="px-5 py-4 border-t shrink-0">
          <button onClick={onClose} className="w-full py-2.5 border rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
            Kapat
          </button>
        </div>
      </div>
    </div>
  )
}
