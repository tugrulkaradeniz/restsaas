'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'
import type { Ingredient } from '@/types/database'
import { Plus, Trash2, X, FlaskConical } from 'lucide-react'

interface RecipeLine {
  ingredient_id: string
  quantity:      string
  waste_percent: string
}

function round2(n: number) { return Math.round(n * 100) / 100 }

function lineCost(line: RecipeLine, ingredients: Ingredient[]) {
  const ing = ingredients.find((i) => i.id === line.ingredient_id)
  if (!ing) return 0
  const qty   = parseFloat(line.quantity)      || 0
  const waste = parseFloat(line.waste_percent) || 0
  return round2(qty * (1 + waste / 100) * ing.unit_cost)
}

const blankLine = (): RecipeLine => ({ ingredient_id: '', quantity: '', waste_percent: '0' })

interface Props {
  menuItemId:     string
  menuItemName:   string
  currentCost:    number | null
  onClose:        () => void
  onCostUpdated:  (id: string, cost: number) => void
}

export function RecipeModal({ menuItemId, menuItemName, currentCost, onClose, onCostUpdated }: Props) {
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [lines, setLines]             = useState<RecipeLine[]>([blankLine()])
  const [applyCost, setApplyCost]     = useState(true)
  const [loading, setLoading]         = useState(true)
  const [saving, setSaving]           = useState(false)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const [{ data: ings }, { data: recipes }] = await Promise.all([
        supabase.from('ingredients').select('*').order('name'),
        supabase.from('recipes').select('*').eq('menu_item_id', menuItemId),
      ])
      setIngredients(ings ?? [])
      if (recipes && recipes.length > 0) {
        setLines(recipes.map((r) => ({
          ingredient_id: r.ingredient_id,
          quantity:      String(r.quantity),
          waste_percent: String(r.waste_percent),
        })))
      }
      setLoading(false)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menuItemId])

  const totalCost = useMemo(
    () => round2(lines.reduce((s, l) => s + lineCost(l, ingredients), 0)),
    [lines, ingredients]
  )

  function updateLine(idx: number, field: keyof RecipeLine, value: string) {
    setLines((prev) => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l))
  }

  async function save() {
    const valid = lines.filter((l) => l.ingredient_id && parseFloat(l.quantity) > 0)
    if (valid.length === 0) { toast.error('En az bir geçerli kalem girin'); return }
    setSaving(true)

    // Mevcut reçeteyi sil, yenisini ekle
    await supabase.from('recipes').delete().eq('menu_item_id', menuItemId)
    const { error } = await supabase.from('recipes').insert(
      valid.map((l) => ({
        menu_item_id:  menuItemId,
        ingredient_id: l.ingredient_id,
        quantity:      parseFloat(l.quantity),
        waste_percent: parseFloat(l.waste_percent) || 0,
      }))
    )
    if (error) { toast.error(error.message); setSaving(false); return }

    if (applyCost) {
      await supabase.from('menu_items').update({ cost: totalCost }).eq('id', menuItemId)
      onCostUpdated(menuItemId, totalCost)
    }

    toast.success('Reçete kaydedildi')
    onClose()
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">

        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2">
            <FlaskConical size={18} className="text-orange-500" />
            <h2 className="text-lg font-bold text-gray-900">Reçete — {menuItemName}</h2>
          </div>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>

        <div className="p-6">
          {loading ? (
            <p className="text-sm text-gray-400 text-center py-8">Yükleniyor...</p>
          ) : (
            <>
              {ingredients.length === 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-4 text-sm text-yellow-800">
                  Henüz malzeme eklenmedi. Önce <strong>Stok → Malzemeler</strong> sekmesinden malzeme ekle.
                </div>
              )}

              {/* Kolon başlıkları */}
              <div className="grid grid-cols-12 gap-2 text-xs text-gray-400 px-1 mb-2">
                <div className="col-span-5">Malzeme</div>
                <div className="col-span-2 text-right">Miktar</div>
                <div className="col-span-2 text-center">Fire %</div>
                <div className="col-span-2 text-right">Maliyet</div>
                <div className="col-span-1" />
              </div>

              <div className="space-y-2 mb-4">
                {lines.map((line, idx) => {
                  const ing  = ingredients.find((i) => i.id === line.ingredient_id)
                  const cost = lineCost(line, ingredients)
                  return (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-5">
                        <select value={line.ingredient_id}
                          onChange={(e) => updateLine(idx, 'ingredient_id', e.target.value)}
                          className="w-full border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500">
                          <option value="">Malzeme seçin</option>
                          {ingredients.map((i) => (
                            <option key={i.id} value={i.id}>{i.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-2 flex items-center gap-1">
                        <input type="number" step="0.001" min="0" value={line.quantity}
                          onChange={(e) => updateLine(idx, 'quantity', e.target.value)}
                          className="w-full border rounded-lg px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-orange-500"
                          placeholder="0" />
                        {ing && <span className="text-xs text-gray-400 shrink-0">{ing.unit}</span>}
                      </div>
                      <div className="col-span-2 flex items-center gap-1">
                        <input type="number" step="0.1" min="0" max="100" value={line.waste_percent}
                          onChange={(e) => updateLine(idx, 'waste_percent', e.target.value)}
                          className="w-full border rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-orange-500"
                          placeholder="0" />
                        <span className="text-xs text-gray-400">%</span>
                      </div>
                      <div className="col-span-2 text-right text-sm font-medium text-gray-700">
                        {cost > 0 ? formatCurrency(cost) : '—'}
                      </div>
                      <div className="col-span-1 flex justify-center">
                        {lines.length > 1 && (
                          <button onClick={() => setLines((p) => p.filter((_, i) => i !== idx))}
                            className="text-red-300 hover:text-red-500">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              <button onClick={() => setLines((p) => [...p, blankLine()])}
                className="flex items-center gap-1.5 text-sm text-orange-600 hover:text-orange-700 font-medium mb-6">
                <Plus size={14} /> Malzeme Ekle
              </button>

              {/* Maliyet özeti */}
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 space-y-2 mb-4">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Hesaplanan Maliyet</span>
                  <span className="font-bold text-gray-900 text-base">{formatCurrency(totalCost)}</span>
                </div>
                {currentCost != null && currentCost > 0 && (
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Mevcut kayıtlı maliyet</span>
                    <span>{formatCurrency(currentCost)}</span>
                  </div>
                )}
                <label className="flex items-center gap-2 text-sm text-gray-700 pt-1 border-t border-orange-200 cursor-pointer">
                  <input type="checkbox" checked={applyCost} onChange={(e) => setApplyCost(e.target.checked)}
                    className="w-4 h-4 accent-orange-500" />
                  Bu maliyeti ürüne otomatik uygula
                </label>
              </div>
            </>
          )}
        </div>

        <div className="flex gap-2 px-6 py-4 border-t sticky bottom-0 bg-white">
          <button onClick={save} disabled={saving || loading}
            className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white py-2.5 rounded-lg font-medium text-sm">
            {saving ? 'Kaydediliyor...' : 'Reçeteyi Kaydet'}
          </button>
          <button onClick={onClose}
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-lg font-medium text-sm">
            İptal
          </button>
        </div>
      </div>
    </div>
  )
}
