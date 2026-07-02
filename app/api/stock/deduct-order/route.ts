import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

function round2(n: number) { return Math.round(n * 100) / 100 }

export async function POST(req: Request) {
  try {
    const { orderId } = await req.json()
    if (!orderId) return NextResponse.json({ error: 'orderId required' }, { status: 400 })

    const service = createServiceClient()

    // Sipariş kalemlerini al
    const { data: items } = await service
      .from('order_items')
      .select('menu_item_id, quantity')
      .eq('order_id', orderId)

    if (!items?.length) return NextResponse.json({ ok: true })

    // Bu ürünlere ait reçeteleri al
    const menuItemIds = Array.from(new Set(items.map(i => i.menu_item_id as string)))
    const { data: recipes } = await service
      .from('recipes')
      .select('menu_item_id, ingredient_id, quantity')
      .in('menu_item_id', menuItemIds)

    if (!recipes?.length) return NextResponse.json({ ok: true })

    // Malzeme başına toplam düşülecek miktarı hesapla
    const deductions: Record<string, number> = {}
    for (const item of items) {
      const itemRecipes = recipes.filter(r => r.menu_item_id === item.menu_item_id)
      for (const r of itemRecipes) {
        const ingredientId = r.ingredient_id as string
        deductions[ingredientId] = round2((deductions[ingredientId] ?? 0) + r.quantity * item.quantity)
      }
    }

    // Malzemeleri güncelle
    for (const [ingredientId, qty] of Object.entries(deductions)) {
      const { data: ing } = await service
        .from('ingredients')
        .select('stock_qty')
        .eq('id', ingredientId)
        .single()

      if (ing) {
        await service
          .from('ingredients')
          .update({ stock_qty: round2((ing.stock_qty ?? 0) - qty) })
          .eq('id', ingredientId)
      }
    }

    return NextResponse.json({ ok: true, deducted: Object.keys(deductions).length })
  } catch {
    return NextResponse.json({ error: 'Hata' }, { status: 500 })
  }
}
