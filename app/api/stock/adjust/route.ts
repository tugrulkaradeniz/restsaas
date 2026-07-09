import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

function round2(n: number) { return Math.round(n * 100) / 100 }

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Yetki yok' }, { status: 401 })

  const tenantId = user.app_metadata?.tenant_id as string | undefined
  if (!tenantId) return NextResponse.json({ error: 'Tenant bulunamadı' }, { status: 403 })

  const { ingredientId, newQty, note }: { ingredientId: string; newQty: number; note?: string } = await req.json()
  if (!ingredientId || typeof newQty !== 'number') return NextResponse.json({ error: 'Eksik alan' }, { status: 400 })

  const service = createServiceClient()
  const { data: ing } = await service
    .from('ingredients')
    .select('stock_qty, tenant_id')
    .eq('id', ingredientId)
    .single()

  if (!ing || ing.tenant_id !== tenantId) return NextResponse.json({ error: 'Malzeme bulunamadı' }, { status: 404 })

  const resultingQty = round2(newQty)
  const delta = round2(resultingQty - (ing.stock_qty ?? 0))
  if (delta === 0) return NextResponse.json({ ok: true })

  await service.from('ingredients').update({ stock_qty: resultingQty }).eq('id', ingredientId)
  await service.from('stock_movements').insert({
    tenant_id: tenantId,
    ingredient_id: ingredientId,
    type: 'adjustment',
    quantity_change: delta,
    resulting_qty: resultingQty,
    note: note || null,
    created_by: user.id,
  })

  return NextResponse.json({ ok: true })
}
