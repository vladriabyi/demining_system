import { useEffect, useRef, useState } from "react"
import { useDebounce } from "./useDebounce"

export interface NominatimResult {
  place_id:    number
  display_name: string
  lat:         string
  lon:         string
  address?: {
    city?:         string
    town?:         string
    village?:      string
    suburb?:       string
    road?:         string
    house_number?: string
    state?:        string
    pedestrian?:   string
    footway?:      string
  }
}

/** Формує коротку читабельну назву з результату Nominatim. */
export function buildShortName(r: NominatimResult): string {
  const a            = r.address ?? {}
  const road        = a.road ?? a.pedestrian ?? a.footway ?? ""
  const houseNumber = a.house_number ?? ""
  const city        = a.city ?? a.town ?? a.village ?? a.suburb ?? ""
  const state       = a.state ?? ""

  if (road && houseNumber && city) return `${road}, ${houseNumber}, ${city}`
  if (road && city)                return `${road}, ${city}`
  if (city && state)               return `${city}, ${state}`
  return r.display_name.split(",").slice(0, 3).join(",").trim()
}

/** Отримує зворотний геокод для координат через Nominatim. */
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
    { headers: { "Accept-Language": "uk" } },
  )
  const data: NominatimResult = await res.json()
  return buildShortName(data)
}

interface UseGeocodingOptions {
  /** Мінімальна довжина запиту для старту пошуку */
  minLength?: number
  /** Затримка дебаунсу в мс */
  debounceMs?: number
}

interface UseGeocodingReturn {
  suggestions:     NominatimResult[]
  searching:       boolean
  showSuggestions: boolean
  setShowSuggestions: (v: boolean) => void
  clearSuggestions: () => void
}

/**
 * Хук для пошуку адрес через Nominatim з дебаунсом.
 * Обмежує пошук лише територією України (countrycodes=ua).
 */
export function useGeocoding(
  query: string,
  { minLength = 3, debounceMs = 400 }: UseGeocodingOptions = {},
): UseGeocodingReturn {
  const [suggestions,     setSuggestions]     = useState<NominatimResult[]>([])
  const [searching,       setSearching]       = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)

  const debouncedQuery = useDebounce(query, debounceMs)
  const skipRef        = useRef(false)

  useEffect(() => {
    if (skipRef.current) { skipRef.current = false; return }
    if (debouncedQuery.length < minLength) { setSuggestions([]); return }

    setSearching(true)
    fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(debouncedQuery)}&format=json&addressdetails=1&countrycodes=ua&limit=6`,
      { headers: { "Accept-Language": "uk" } },
    )
      .then(r => r.json())
      .then((data: NominatimResult[]) => {
        setSuggestions(data)
        setShowSuggestions(true)
      })
      .catch(() => setSuggestions([]))
      .finally(() => setSearching(false))
  }, [debouncedQuery, minLength])

  return {
    suggestions,
    searching,
    showSuggestions,
    setShowSuggestions,
    clearSuggestions: () => { setSuggestions([]); setShowSuggestions(false) },
  }
}
