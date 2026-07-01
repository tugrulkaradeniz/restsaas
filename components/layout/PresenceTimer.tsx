'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Coffee } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

function hms(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

interface Props {
  userId: string
  tenantId: string
}

export function PresenceTimer({ userId, tenantId }: Props) {
  // All mutable tracking state lives in refs (never stale in callbacks)
  const sessionStart  = useRef(Date.now())
  const awayStart     = useRef<number | null>(null)
  const totalAwayRef  = useRef(0)
  const awayCountRef  = useRef(0)
  const isAwayRef     = useRef(false)
  const sessionIdRef  = useRef<string | null>(null)

  // Ticker forces re-render for display
  const [, setTick] = useState(0)
  const supabase = createClient()

  // Snapshot of current values for DB
  const snapshot = useCallback(() => {
    const now          = Date.now()
    const totalElapsed = Math.floor((now - sessionStart.current) / 1000)
    const currentAway  = isAwayRef.current && awayStart.current !== null
      ? Math.floor((now - awayStart.current) / 1000) : 0
    return {
      active_seconds: Math.max(0, totalElapsed - totalAwayRef.current - currentAway),
      away_seconds:   totalAwayRef.current + currentAway,
      away_count:     awayCountRef.current,
    }
  }, [])

  const syncToDB = useCallback(() => {
    if (!sessionIdRef.current) return
    const s = snapshot()
    supabase.from('staff_sessions').update({
      ...s,
      last_sync: new Date().toISOString(),
    }).eq('id', sessionIdRef.current).then(() => {/* fire-and-forget */})
  }, [snapshot, supabase])

  // Create session row on mount
  useEffect(() => {
    supabase.from('staff_sessions').insert({
      tenant_id: tenantId,
      user_id:   userId,
    }).select('id').single().then(({ data }) => {
      if (data) sessionIdRef.current = data.id
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, tenantId])

  // Periodic sync every 30s
  useEffect(() => {
    const id = setInterval(syncToDB, 30_000)
    return () => clearInterval(id)
  }, [syncToDB])

  // Final sync before unload
  useEffect(() => {
    function onUnload() {
      if (!sessionIdRef.current) return
      const s = snapshot()
      // sendBeacon keeps request alive after page close
      navigator.sendBeacon(
        `/api/staff-sessions/end`,
        JSON.stringify({ sessionId: sessionIdRef.current, ...s }),
      )
    }
    window.addEventListener('beforeunload', onUnload)
    return () => window.removeEventListener('beforeunload', onUnload)
  }, [snapshot])

  // Visibility + focus/blur tracking
  useEffect(() => {
    function goAway() {
      if (isAwayRef.current) return
      awayStart.current   = Date.now()
      isAwayRef.current   = true
      awayCountRef.current += 1
      setTick(t => t + 1)
    }
    function comeBack() {
      if (!isAwayRef.current) return
      if (awayStart.current !== null) {
        totalAwayRef.current += Math.floor((Date.now() - awayStart.current) / 1000)
        awayStart.current = null
      }
      isAwayRef.current = false
      setTick(t => t + 1)
      syncToDB()   // immediate sync on return
    }

    const onVisibility = () => (document.hidden ? goAway() : comeBack())
    const onBlur  = () => { if (!document.hidden) goAway() }
    const onFocus = () => { if (!document.hidden) comeBack() }

    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('blur',  onBlur)
    window.addEventListener('focus', onFocus)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('blur',  onBlur)
      window.removeEventListener('focus', onFocus)
    }
  }, [syncToDB])

  // 1-second ticker
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(id)
  }, [])

  // Display values (computed fresh each tick from refs)
  const now          = Date.now()
  const totalElapsed = Math.floor((now - sessionStart.current) / 1000)
  const currentAway  = isAwayRef.current && awayStart.current !== null
    ? Math.floor((now - awayStart.current) / 1000) : 0
  const activeTime   = Math.max(0, totalElapsed - totalAwayRef.current - currentAway)

  return (
    <div className="mx-2 mb-2 rounded-lg bg-gray-800 px-3 py-2 text-xs space-y-1.5">
      <div className="flex items-center gap-2">
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isAwayRef.current ? 'bg-gray-500' : 'bg-green-400'}`} />
        <span className="text-gray-400">Ekranda</span>
        <span className="ml-auto font-mono text-white">{hms(activeTime)}</span>
      </div>

      {isAwayRef.current && (
        <div className="flex items-center gap-2">
          <Coffee size={11} className="text-yellow-400 shrink-0" />
          <span className="text-yellow-300 animate-pulse">Uzakta</span>
          <span className="ml-auto font-mono text-yellow-300">{hms(currentAway)}</span>
        </div>
      )}

      {!isAwayRef.current && totalAwayRef.current > 0 && (
        <div className="flex items-center gap-2 text-gray-500">
          <Coffee size={11} className="shrink-0" />
          <span>Uzaklaşma</span>
          <span className="ml-auto font-mono">{awayCountRef.current}× {hms(totalAwayRef.current)}</span>
        </div>
      )}
    </div>
  )
}
