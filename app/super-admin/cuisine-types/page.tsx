'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, GripVertical, Check, X } from 'lucide-react'
import type { CuisineType } from '@/types/database'

export default function CuisineTypesPage() {
  const [items, setItems] = useState<CuisineType[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editEmoji, setEditEmoji] = useState('')
  const [newName, setNewName] = useState('')
  const [newEmoji, setNewEmoji] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const supabase = createClient()

  async function load() {
    const { data } = await supabase
      .from('cuisine_types')
      .select('*')
      .order('sort_order')
    setItems(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function addItem() {
    if (!newName.trim()) return
    const { error } = await supabase.from('cuisine_types').insert({
      name: newName.trim(), emoji: newEmoji.trim() || null,
      sort_order: (items.at(-1)?.sort_order ?? 0) + 1,
    })
    if (error) { toast.error(error.message); return }
    toast.success('Eklendi')
    setNewName(''); setNewEmoji(''); setShowAdd(false)
    load()
  }

  async function saveEdit(id: string) {
    const { error } = await supabase.from('cuisine_types').update({
      name: editName.trim(), emoji: editEmoji.trim() || null,
    }).eq('id', id)
    if (error) { toast.error(error.message); return }
    toast.success('Güncellendi')
    setEditing(null)
    load()
  }

  async function toggleActive(id: string, current: boolean) {
    await supabase.from('cuisine_types').update({ is_active: !current }).eq('id', id)
    load()
  }

  async function deleteItem(id: string) {
    if (!confirm('Silmek istediğinden emin misin?')) return
    await supabase.from('cuisine_types').delete().eq('id', id)
    toast.success('Silindi')
    load()
  }

  if (loading) return <div className="p-8 text-gray-400">Yükleniyor...</div>

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mutfak Tipleri</h1>
          <p className="text-sm text-gray-500 mt-1">Restoranların kendini etiketleyeceği kategoriler</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600"
        >
          <Plus size={16} /> Yeni Ekle
        </button>
      </div>

      {showAdd && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-4 flex items-center gap-3">
          <input
            placeholder="Emoji (🍕)"
            value={newEmoji}
            onChange={e => setNewEmoji(e.target.value)}
            className="w-20 border rounded-lg px-3 py-2 text-sm text-center"
            maxLength={4}
          />
          <input
            placeholder="Kategori adı"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            className="flex-1 border rounded-lg px-3 py-2 text-sm"
            onKeyDown={e => e.key === 'Enter' && addItem()}
            autoFocus
          />
          <button onClick={addItem} className="p-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600">
            <Check size={16} />
          </button>
          <button onClick={() => setShowAdd(false)} className="p-2 text-gray-500 hover:text-gray-700">
            <X size={16} />
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl border divide-y">
        {items.map(item => (
          <div key={item.id} className="flex items-center gap-3 px-4 py-3">
            <GripVertical size={16} className="text-gray-300 shrink-0" />
            {editing === item.id ? (
              <>
                <input
                  value={editEmoji}
                  onChange={e => setEditEmoji(e.target.value)}
                  className="w-16 border rounded px-2 py-1 text-sm text-center"
                  maxLength={4}
                />
                <input
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="flex-1 border rounded px-2 py-1 text-sm"
                  onKeyDown={e => e.key === 'Enter' && saveEdit(item.id)}
                  autoFocus
                />
                <button onClick={() => saveEdit(item.id)} className="p-1.5 bg-green-500 text-white rounded hover:bg-green-600">
                  <Check size={14} />
                </button>
                <button onClick={() => setEditing(null)} className="p-1.5 text-gray-400 hover:text-gray-600">
                  <X size={14} />
                </button>
              </>
            ) : (
              <>
                <span className="text-xl w-8 text-center">{item.emoji ?? '🍽️'}</span>
                <span className={`flex-1 text-sm font-medium ${item.is_active ? 'text-gray-900' : 'text-gray-400 line-through'}`}>
                  {item.name}
                </span>
                <button
                  onClick={() => toggleActive(item.id, item.is_active)}
                  className={`text-xs px-2.5 py-1 rounded-full font-medium ${item.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                >
                  {item.is_active ? 'Aktif' : 'Pasif'}
                </button>
                <button
                  onClick={() => { setEditing(item.id); setEditName(item.name); setEditEmoji(item.emoji ?? '') }}
                  className="p-1.5 text-gray-400 hover:text-blue-600"
                >
                  <Pencil size={14} />
                </button>
                <button onClick={() => deleteItem(item.id)} className="p-1.5 text-gray-400 hover:text-red-600">
                  <Trash2 size={14} />
                </button>
              </>
            )}
          </div>
        ))}
        {items.length === 0 && (
          <div className="py-12 text-center text-gray-400 text-sm">Henüz mutfak tipi eklenmemiş</div>
        )}
      </div>
    </div>
  )
}
