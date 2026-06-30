'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { cn, formatCurrency } from '@/lib/utils'
import type { MenuCategory, MenuItem, MenuItemAllergen } from '@/types/database'
import { Plus, Pencil, Trash2, CheckCircle, XCircle, FlaskConical, ImagePlus, X } from 'lucide-react'
import { RecipeModal } from './RecipeModal'

type FullMenuItem = MenuItem & {
  allergens: MenuItemAllergen[]
  category: { name: string } | null
}

interface Props {
  tenantId:          string
  initialCategories: MenuCategory[]
  initialItems:      FullMenuItem[]
}

const ALLERGENS = ['Gluten', 'Süt', 'Yumurta', 'Fındık', 'Susam', 'Balık', 'Kabuklu deniz ürünleri', 'Soya', 'Kereviz', 'Hardal']

const blankItem = {
  name: '', price: '', cost: '', description_internal: '', description_public: '',
  is_available: true, is_visible_selfservis: true, category_id: '',
  allergens: [] as string[], image_url: null as string | null,
}

export function MenuManager({ tenantId, initialCategories, initialItems }: Props) {
  const [categories, setCategories] = useState<MenuCategory[]>(initialCategories)
  const [items, setItems]           = useState<FullMenuItem[]>(initialItems)
  const [activeCatId, setActiveCatId] = useState(categories[0]?.id ?? '')
  const [editingItem, setEditingItem] = useState<Partial<typeof blankItem> | null>(null)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [showItemForm, setShowItemForm] = useState(false)
  const [showCatForm, setShowCatForm]   = useState(false)
  const [newCatName, setNewCatName]     = useState('')
  const [recipeItem, setRecipeItem]     = useState<FullMenuItem | null>(null)
  const [imageFile, setImageFile]       = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploading, setUploading]       = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const filteredItems = items.filter((i) => i.category_id === activeCatId)

  function openNewItem() {
    setEditingItem({ ...blankItem, category_id: activeCatId })
    setEditingItemId(null)
    setImageFile(null)
    setImagePreview(null)
    setShowItemForm(true)
  }

  function openEditItem(item: FullMenuItem) {
    setEditingItem({
      name: item.name,
      price: String(item.price),
      cost: String(item.cost ?? ''),
      description_internal: item.description_internal ?? '',
      description_public: item.description_public ?? '',
      is_available: item.is_available,
      is_visible_selfservis: item.is_visible_selfservis,
      category_id: item.category_id,
      allergens: item.allergens.map((a) => a.allergen),
      image_url: item.image_url ?? null,
    })
    setEditingItemId(item.id)
    setImageFile(null)
    setImagePreview(item.image_url ?? null)
    setShowItemForm(true)
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { toast.error('Resim en fazla 5 MB olabilir'); return }
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  function removeImage() {
    setImageFile(null)
    setImagePreview(null)
    setEditingItem((p) => p ? { ...p, image_url: null } : p)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function uploadImage(itemId: string): Promise<string | null> {
    if (!imageFile) return editingItem?.image_url ?? null
    setUploading(true)
    const ext  = imageFile.name.split('.').pop()
    const path = `${tenantId}/${itemId}.${ext}`
    const { error } = await supabase.storage.from('menu-images').upload(path, imageFile, { upsert: true })
    setUploading(false)
    if (error) { toast.error('Resim yüklenemedi: ' + error.message); return null }
    const { data } = supabase.storage.from('menu-images').getPublicUrl(path)
    return data.publicUrl
  }

  async function saveItem() {
    if (!editingItem?.name || !editingItem.price || !editingItem.category_id) {
      toast.error('İsim, fiyat ve kategori zorunlu')
      return
    }

    const basePayload = {
      tenant_id: tenantId,
      name: editingItem.name,
      price: parseFloat(editingItem.price),
      cost: editingItem.cost ? parseFloat(editingItem.cost) : null,
      category_id: editingItem.category_id,
      description_internal: editingItem.description_internal || null,
      description_public: editingItem.description_public || null,
      is_available: editingItem.is_available,
      is_visible_selfservis: editingItem.is_visible_selfservis,
    }

    if (editingItemId) {
      // Önce kaydet, sonra resim yükle (itemId gerekli)
      const imageUrl = await uploadImage(editingItemId)
      const payload  = { ...basePayload, image_url: imageUrl }
      const { error } = await supabase.from('menu_items').update(payload).eq('id', editingItemId)
      if (error) { toast.error(error.message); return }
      await supabase.from('menu_item_allergens').delete().eq('menu_item_id', editingItemId)
      if (editingItem.allergens?.length) {
        await supabase.from('menu_item_allergens').insert(
          editingItem.allergens.map((a) => ({ menu_item_id: editingItemId, allergen: a }))
        )
      }
      setItems((prev) => prev.map((i) =>
        i.id === editingItemId
          ? { ...i, ...payload, allergens: (editingItem.allergens ?? []).map((a) => ({ id: '', menu_item_id: editingItemId!, allergen: a })) } as FullMenuItem
          : i
      ))
      toast.success('Ürün güncellendi')
    } else {
      // Önce ürünü ekle, id al, sonra resim yükle
      const { data, error } = await supabase.from('menu_items')
        .insert({ ...basePayload, image_url: null })
        .select('*, allergens:menu_item_allergens(*), category:menu_categories(name)')
        .single()
      if (error || !data) { toast.error(error?.message); return }

      const imageUrl = await uploadImage(data.id)
      if (imageUrl) {
        await supabase.from('menu_items').update({ image_url: imageUrl }).eq('id', data.id)
      }

      if (editingItem.allergens?.length) {
        await supabase.from('menu_item_allergens').insert(
          editingItem.allergens.map((a) => ({ menu_item_id: data.id, allergen: a }))
        )
      }
      setItems((prev) => [...prev, { ...data, image_url: imageUrl } as FullMenuItem])
      toast.success('Ürün eklendi')
    }
    setShowItemForm(false)
    setEditingItem(null)
    setImageFile(null)
    setImagePreview(null)
  }

  async function deleteItem(id: string) {
    if (!confirm('Bu ürünü silmek istediğinizden emin misiniz?')) return
    const { error } = await supabase.from('menu_items').delete().eq('id', id)
    if (error) { toast.error(error.message); return }
    setItems((prev) => prev.filter((i) => i.id !== id))
    toast.success('Ürün silindi')
  }

  async function toggleAvailable(item: FullMenuItem) {
    const { error } = await supabase.from('menu_items').update({ is_available: !item.is_available }).eq('id', item.id)
    if (!error) setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, is_available: !i.is_available } : i))
  }

  async function addCategory() {
    if (!newCatName.trim()) return
    const maxOrder = Math.max(0, ...categories.map((c) => c.sort_order))
    const { data, error } = await supabase.from('menu_categories')
      .insert({ tenant_id: tenantId, name: newCatName.trim(), sort_order: maxOrder + 1 })
      .select().single()
    if (error) { toast.error(error.message); return }
    setCategories((prev) => [...prev, data])
    setNewCatName('')
    setShowCatForm(false)
    toast.success('Kategori eklendi')
  }

  function toggleAllergen(allergen: string) {
    setEditingItem((prev) => {
      if (!prev) return prev
      const allergens = prev.allergens ?? []
      return {
        ...prev,
        allergens: allergens.includes(allergen)
          ? allergens.filter((a) => a !== allergen)
          : [...allergens, allergen],
      }
    })
  }

  return (
    <div className="flex gap-4">
      {/* Kategoriler */}
      <div className="w-52 bg-white rounded-xl border p-3 space-y-1 self-start">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Kategoriler</span>
          <button onClick={() => setShowCatForm((v) => !v)} className="text-orange-500 hover:text-orange-600">
            <Plus size={16} />
          </button>
        </div>
        {showCatForm && (
          <div className="flex gap-1 mb-2">
            <input autoFocus value={newCatName} onChange={(e) => setNewCatName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addCategory()}
              placeholder="Kategori adı" className="flex-1 border rounded-lg px-2 py-1 text-xs" />
            <button onClick={addCategory} className="bg-orange-500 text-white px-2 rounded-lg text-xs">Ekle</button>
          </div>
        )}
        {categories.map((cat) => (
          <button key={cat.id} onClick={() => setActiveCatId(cat.id)}
            className={cn(
              'w-full text-left text-sm px-3 py-2 rounded-lg transition-colors',
              activeCatId === cat.id ? 'bg-orange-500 text-white' : 'text-gray-700 hover:bg-gray-100'
            )}>
            {cat.name}
            <span className={cn('ml-1 text-xs', activeCatId === cat.id ? 'text-orange-100' : 'text-gray-400')}>
              ({items.filter((i) => i.category_id === cat.id).length})
            </span>
          </button>
        ))}
      </div>

      {/* Ürünler */}
      <div className="flex-1">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">
            {categories.find((c) => c.id === activeCatId)?.name ?? 'Kategori'}
          </h2>
          <button onClick={openNewItem} disabled={!activeCatId}
            className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-orange-600 disabled:opacity-50">
            <Plus size={15} /> Ürün Ekle
          </button>
        </div>

        <div className="space-y-2">
          {filteredItems.map((item) => (
            <div key={item.id} className="bg-white rounded-xl border px-4 py-3 flex items-center gap-4">
              {/* Küçük resim */}
              <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 shrink-0 flex items-center justify-center">
                {item.image_url
                  ? <Image src={item.image_url} alt={item.name} width={48} height={48} className="w-full h-full object-cover" />
                  : <span className="text-gray-300 text-xl">🍽️</span>
                }
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-gray-900">{item.name}</p>
                  {!item.is_available && (
                    <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Tükendi</span>
                  )}
                  {!item.is_visible_selfservis && (
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">Gizli</span>
                  )}
                </div>
                {item.description_public && (
                  <p className="text-xs text-gray-500 mt-0.5">{item.description_public}</p>
                )}
                {item.allergens.length > 0 && (
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {item.allergens.map((a) => (
                      <span key={a.id} className="text-xs bg-yellow-50 text-yellow-700 border border-yellow-200 px-1.5 py-0.5 rounded">
                        {a.allergen}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="text-right">
                <p className="font-semibold text-orange-600">{formatCurrency(item.price)}</p>
                {item.cost && (
                  <p className="text-xs text-gray-400">Maliyet: {formatCurrency(item.cost)}</p>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => toggleAvailable(item)} className="p-2 hover:bg-gray-100 rounded-lg" title={item.is_available ? 'Tükendi yap' : 'Mevcut yap'}>
                  {item.is_available ? <CheckCircle size={16} className="text-green-500" /> : <XCircle size={16} className="text-red-400" />}
                </button>
                <button onClick={() => setRecipeItem(item)} className="p-2 hover:bg-orange-50 rounded-lg" title="Reçete">
                  <FlaskConical size={16} className="text-orange-400" />
                </button>
                <button onClick={() => openEditItem(item)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <Pencil size={16} className="text-gray-400" />
                </button>
                <button onClick={() => deleteItem(item.id)} className="p-2 hover:bg-red-50 rounded-lg">
                  <Trash2 size={16} className="text-red-400" />
                </button>
              </div>
            </div>
          ))}
          {filteredItems.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <p>Bu kategoride henüz ürün yok</p>
            </div>
          )}
        </div>
      </div>

      {recipeItem && (
        <RecipeModal
          menuItemId={recipeItem.id}
          menuItemName={recipeItem.name}
          currentCost={recipeItem.cost ?? null}
          onClose={() => setRecipeItem(null)}
          onCostUpdated={(id, cost) => {
            setItems((prev) => prev.map((i) => i.id === id ? { ...i, cost } : i))
            setRecipeItem(null)
          }}
        />
      )}

      {/* Ürün form modal */}
      {showItemForm && editingItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              {editingItemId ? 'Ürün Düzenle' : 'Yeni Ürün'}
            </h2>

            <div className="space-y-3">
              {/* Resim yükleme */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ürün Resmi</label>
                {imagePreview ? (
                  <div className="relative w-full h-40 rounded-xl overflow-hidden bg-gray-100">
                    <Image src={imagePreview} alt="Önizleme" fill className="object-cover" />
                    <button onClick={removeImage}
                      className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1">
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={() => fileInputRef.current?.click()}
                    className="w-full h-32 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-orange-300 hover:text-orange-400 transition-colors">
                    <ImagePlus size={24} />
                    <span className="text-sm">Resim seç (JPG, PNG, WebP — max 5 MB)</span>
                  </button>
                )}
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden" onChange={onFileChange} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ürün Adı *</label>
                <input value={editingItem.name ?? ''} onChange={(e) => setEditingItem((p) => ({ ...p!, name: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Menemen" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Satış Fiyatı (₺) *</label>
                  <input type="number" step="0.01" value={editingItem.price ?? ''} onChange={(e) => setEditingItem((p) => ({ ...p!, price: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Maliyet (₺)</label>
                  <input type="number" step="0.01" value={editingItem.cost ?? ''} onChange={(e) => setEditingItem((p) => ({ ...p!, cost: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="0.00" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kategori *</label>
                <select value={editingItem.category_id ?? ''} onChange={(e) => setEditingItem((p) => ({ ...p!, category_id: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="">Seçin</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Müşteri Açıklaması</label>
                <textarea value={editingItem.description_public ?? ''} onChange={(e) => setEditingItem((p) => ({ ...p!, description_public: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} placeholder="QR menü ve online siparişte görünür" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">İç Not (mutfak/yönetim)</label>
                <textarea value={editingItem.description_internal ?? ''} onChange={(e) => setEditingItem((p) => ({ ...p!, description_internal: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} placeholder="Müşteri göremez" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Alerjenler</label>
                <div className="flex flex-wrap gap-2">
                  {ALLERGENS.map((a) => (
                    <button key={a} type="button" onClick={() => toggleAllergen(a)}
                      className={cn(
                        'px-3 py-1 rounded-full text-xs border transition-colors',
                        editingItem.allergens?.includes(a)
                          ? 'bg-yellow-400 border-yellow-400 text-white'
                          : 'bg-white border-gray-200 text-gray-600 hover:border-yellow-300'
                      )}>
                      {a}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={editingItem.is_available} onChange={(e) => setEditingItem((p) => ({ ...p!, is_available: e.target.checked }))} className="rounded" />
                  Mevcut
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={editingItem.is_visible_selfservis} onChange={(e) => setEditingItem((p) => ({ ...p!, is_visible_selfservis: e.target.checked }))} className="rounded" />
                  QR menüde görünür
                </label>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button onClick={saveItem} disabled={uploading}
                className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white py-2.5 rounded-lg font-medium text-sm">
                {uploading ? 'Resim yükleniyor...' : editingItemId ? 'Güncelle' : 'Ekle'}
              </button>
              <button onClick={() => { setShowItemForm(false); setEditingItem(null); setImageFile(null); setImagePreview(null) }}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-lg font-medium text-sm">
                İptal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
