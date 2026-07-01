import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { tableId } = await req.json()
    if (!tableId) return NextResponse.json({ error: 'tableId required' }, { status: 400 })

    const service = createServiceClient()

    // Token-less: tableId geldi, table'dan tenant_id al
    const { data: table, error: tableErr } = await service
      .from('tables')
      .select('id, tenant_id')
      .eq('id', tableId)
      .single()

    if (tableErr || !table) {
      return NextResponse.json({ error: 'Masa bulunamadı' }, { status: 404 })
    }

    // Rate limit: son 60 saniyede aynı masadan çağrı var mı?
    const { data: recent } = await service
      .from('waiter_calls')
      .select('id')
      .eq('table_id', tableId)
      .eq('status', 'pending')
      .gte('created_at', new Date(Date.now() - 60_000).toISOString())
      .limit(1)

    if (recent && recent.length > 0) {
      return NextResponse.json({ ok: true, rateLimited: true })
    }

    await service.from('waiter_calls').insert({
      tenant_id: table.tenant_id,
      table_id:  tableId,
      status:    'pending',
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Hata' }, { status: 500 })
  }
}
