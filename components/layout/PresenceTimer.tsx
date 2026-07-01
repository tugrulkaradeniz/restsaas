'use client'

import { useState, useEffect, useRef } from 'react'
import { Coffee } from 'lucide-react'

function hms(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function PresenceTimer() {
  const sessionStart  = useRef(Date.now())
  const awayStart     = useRef<number | null>(null)
  const [totalAway,   setTotalAway]   = useState(0)   // accumulated away seconds
  const [awayCount,   setAwayCount]   = useState(0)   // how many times walked away
  const [isAway,      setIsAway]      = useState(false)
  const [,            setTick]        = useState(0)   // forces re-render every second

  // 1-second ticker
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(id)
  }, [])

  // Page Visibility API — detects tab switch / screen lock
  useEffect(() => {
    function onVisible() {
      if (document.hidden) {
        awayStart.current = Date.now()
        setIsAway(true)
        setAwayCount(n => n + 1)
      } else {
        if (awayStart.current !== null) {
          const gone = Math.floor((Date.now() - awayStart.current) / 1000)
          setTotalAway(prev => prev + gone)
          awayStart.current = null
        }
        setIsAway(false)
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  // Window focus/blur — detects switching to another app
  useEffect(() => {
    function onBlur() {
      if (!document.hidden && awayStart.current === null) {
        awayStart.current = Date.now()
        setIsAway(true)
        setAwayCount(n => n + 1)
      }
    }
    function onFocus() {
      if (!document.hidden && awayStart.current !== null) {
        const gone = Math.floor((Date.now() - awayStart.current) / 1000)
        setTotalAway(prev => prev + gone)
        awayStart.current = null
        setIsAway(false)
      }
    }
    window.addEventListener('blur', onBlur)
    window.addEventListener('focus', onFocus)
    return () => {
      window.removeEventListener('blur', onBlur)
      window.removeEventListener('focus', onFocus)
    }
  }, [])

  const now            = Date.now()
  const totalElapsed   = Math.floor((now - sessionStart.current) / 1000)
  const currentAwaySec = isAway && awayStart.current !== null
    ? Math.floor((now - awayStart.current) / 1000)
    : 0
  const activeTime     = Math.max(0, totalElapsed - totalAway - currentAwaySec)

  return (
    <div className="mx-2 mb-2 rounded-lg bg-gray-800 px-3 py-2 text-xs space-y-1.5">
      {/* Active time */}
      <div className="flex items-center gap-2">
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isAway ? 'bg-gray-500' : 'bg-green-400'}`} />
        <span className="text-gray-400">Ekranda</span>
        <span className="ml-auto font-mono text-white">{hms(activeTime)}</span>
      </div>

      {/* Currently away */}
      {isAway && (
        <div className="flex items-center gap-2">
          <Coffee size={11} className="text-yellow-400 shrink-0" />
          <span className="text-yellow-300 animate-pulse">Uzakta</span>
          <span className="ml-auto font-mono text-yellow-300">{hms(currentAwaySec)}</span>
        </div>
      )}

      {/* Away summary (only if returned and has data) */}
      {!isAway && totalAway > 0 && (
        <div className="flex items-center gap-2 text-gray-500">
          <Coffee size={11} className="shrink-0" />
          <span>Uzaklaşma</span>
          <span className="ml-auto font-mono">{awayCount}× {hms(totalAway)}</span>
        </div>
      )}
    </div>
  )
}
