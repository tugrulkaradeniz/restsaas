import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { sessionId, active_seconds, away_seconds, away_count } = body
    if (!sessionId) return NextResponse.json({ ok: false })

    const service = createServiceClient()
    await service.from('staff_sessions').update({
      session_end:    new Date().toISOString(),
      active_seconds: active_seconds ?? 0,
      away_seconds:   away_seconds ?? 0,
      away_count:     away_count ?? 0,
      last_sync:      new Date().toISOString(),
    }).eq('id', sessionId)

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false })
  }
}
