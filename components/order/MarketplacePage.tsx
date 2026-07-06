'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Clock, Search, ChevronRight, MapPin } from 'lucide-react'
import type { CuisineType } from '@/types/database'

type Restaurant = {
  id: string
  slug: string
  name: string
  logo_url: string | null
  address: string | null
  cuisine_type_ids: string[]
  lat: number | null
  lng: number | null
  online_order_hours: Record<string, { open: string; close: string }> | null
}

interface Props {
  cuisineTypes: CuisineType[]
  restaurants: Restaurant[]
}

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

function isRestaurantOpen(hours: Record<string, { open: string; close: string }> | null): boolean {
  if (!hours) return true
  const now = new Date()
  const day = DAY_KEYS[now.getDay()]
  const h = hours[day]
  if (!h) return false
  const time = now.toTimeString().slice(0, 5)
  return time >= h.open && time <= h.close
}

function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function MarketplacePage({ cuisineTypes, restaurants }: Props) {
  const [search, setSearch] = useState('')
  const [selectedCuisine, setSelectedCuisine] = useState<string | null>(null)
  const [userLat, setUserLat] = useState<number | null>(null)
  const [userLng, setUserLng] = useState<number | null>(null)
  function requestLocation() {
    navigator.geolocation?.getCurrentPosition(
      pos => { setUserLat(pos.coords.latitude); setUserLng(pos.coords.longitude) },
      () => {}
    )
  }

  const filtered = useMemo(() => {
    let list = restaurants
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(r => r.name.toLowerCase().includes(q) || r.address?.toLowerCase().includes(q))
    }
    if (selectedCuisine) {
      list = list.filter(r => r.cuisine_type_ids?.includes(selectedCuisine))
    }
    // Konum varsa mesafeye göre sırala
    if (userLat && userLng) {
      list = [...list].sort((a, b) => {
        const da = a.lat && a.lng ? distanceKm(userLat, userLng, a.lat, a.lng) : 999
        const db = b.lat && b.lng ? distanceKm(userLat, userLng, b.lat, b.lng) : 999
        return da - db
      })
    }
    return list
  }, [restaurants, search, selectedCuisine, userLat, userLng])

  function getDistance(r: Restaurant): string | null {
    if (!userLat || !userLng || !r.lat || !r.lng) return null
    const d = distanceKm(userLat, userLng, r.lat, r.lng)
    return d < 1 ? `${Math.round(d * 1000)} m` : `${d.toFixed(1)} km`
  }

  function getCuisineNames(ids: string[]): string {
    return (ids ?? [])
      .map(id => cuisineTypes.find(c => c.id === id))
      .filter(Boolean)
      .map(c => `${c!.emoji ?? ''} ${c!.name}`)
      .join(' · ')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-orange-500 text-white px-4 pt-10 pb-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold mb-1">Ne yemek istersin?</h1>
            <p className="text-orange-100 text-sm mb-4">En yakın restoranlardan sipariş ver</p>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0 pt-1">
            <Link href="/account" className="text-xs text-orange-100 hover:text-white underline">
              Hesabım
            </Link>
            <Link href="/login" className="text-xs text-orange-100 hover:text-white underline">
              Restoran mısınız?
            </Link>
          </div>
        </div>

        {/* Konum */}
        {userLat ? (
          <div className="flex items-center gap-2 text-orange-100 text-sm mb-4">
            <MapPin size={14} />
            <span>Konumun algılandı — sıralama mesafeye göre</span>
          </div>
        ) : (
          <button
            onClick={requestLocation}
            className="flex items-center gap-2 bg-white/20 hover:bg-white/30 rounded-xl px-4 py-2.5 text-sm font-medium mb-4 w-full"
          >
            <MapPin size={16} /> Konumumu Kullan
          </button>
        )}

        {/* Arama */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Restoran veya yemek ara..."
            className="w-full pl-9 pr-4 py-3 rounded-xl text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
          />
        </div>
      </div>

      {/* Kategoriler */}
      <div className="px-4 py-4 overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          <button
            onClick={() => setSelectedCuisine(null)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              !selectedCuisine ? 'bg-orange-500 text-white' : 'bg-white border text-gray-600 hover:border-orange-300'
            }`}
          >
            Tümü
          </button>
          {cuisineTypes.filter(c => c.is_active).map(c => (
            <button
              key={c.id}
              onClick={() => setSelectedCuisine(prev => prev === c.id ? null : c.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                selectedCuisine === c.id ? 'bg-orange-500 text-white' : 'bg-white border text-gray-600 hover:border-orange-300'
              }`}
            >
              {c.emoji} {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Restoran listesi */}
      <div className="px-4 pb-8 space-y-3 max-w-2xl mx-auto">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-lg font-medium">Restoran bulunamadı</p>
            <p className="text-sm mt-1">Farklı bir kategori veya arama deneyin</p>
          </div>
        ) : (
          filtered.map(r => {
            const open = isRestaurantOpen(r.online_order_hours)
            const dist = getDistance(r)
            const cuisineLabel = getCuisineNames(r.cuisine_type_ids ?? [])
            return (
              <Link
                key={r.id}
                href={`/order/${r.slug}`}
                className={`flex items-center gap-4 bg-white rounded-2xl p-4 shadow-sm border transition-shadow hover:shadow-md ${!open ? 'opacity-60' : ''}`}
              >
                {/* Logo */}
                <div className="w-16 h-16 rounded-xl bg-orange-50 flex items-center justify-center shrink-0 overflow-hidden border">
                  {r.logo_url ? (
                    <Image src={r.logo_url} alt={r.name} width={64} height={64} className="object-cover w-full h-full" />
                  ) : (
                    <span className="text-2xl">🍽️</span>
                  )}
                </div>

                {/* Bilgi */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-bold text-gray-900 truncate">{r.name}</h2>
                    {!open && (
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full shrink-0">Kapalı</span>
                    )}
                  </div>
                  {cuisineLabel && (
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{cuisineLabel}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                    {r.address && (
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <MapPin size={11} /> <span className="truncate max-w-[140px]">{r.address}</span>
                      </span>
                    )}
                    {dist && (
                      <span className="flex items-center gap-1 text-xs text-orange-500 font-medium">
                        <Clock size={11} /> {dist}
                      </span>
                    )}
                  </div>
                </div>

                <ChevronRight size={18} className="text-gray-300 shrink-0" />
              </Link>
            )
          })
        )}
      </div>
    </div>
  )
}
