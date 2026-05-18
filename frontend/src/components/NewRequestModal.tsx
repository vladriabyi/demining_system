import { memo, useCallback, useEffect, useRef, useState } from "react"
import { createRequest, uploadPhoto } from "../api/requests"
import { useToast } from "../context/ToastContext"
import type { DeminingRequest, Priority } from "../types"
import MapView from "./MapView"

interface Props { onClose: () => void; onCreated: (r: DeminingRequest) => void }

const PRIORITIES: Priority[] = ["low", "medium", "high", "critical"]
const PRIORITY_LABELS = { low: "🟢 Низький", medium: "🟡 Середній", high: "🟠 Високий", critical: "🔴 Критичний" }
const ALLOWED   = ["image/jpeg", "image/png"]
const MAX_BYTES = 5 * 1024 * 1024

const inp = "w-full rounded-xl border border-white/8 px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/50 transition"
const bg  = { background: "rgba(255,255,255,0.04)" }

interface NominatimResult {
  place_id: number; display_name: string; lat: string; lon: string
  address?: { city?: string; town?: string; village?: string; suburb?: string
               road?: string; house_number?: string; state?: string
               pedestrian?: string; footway?: string }
}

function shortName(r: NominatimResult): string {
  const a  = r.address ?? {} as any
  const road        = a.road ?? a.pedestrian ?? a.footway ?? ""
  const houseNumber = a.house_number ?? ""
  const city        = a.city ?? a.town ?? a.village ?? a.suburb ?? ""
  const state       = a.state ?? ""
  if (road && houseNumber && city) return `${road}, ${houseNumber}, ${city}`
  if (road && city)                return `${road}, ${city}`
  if (city && state)               return `${city}, ${state}`
  return r.display_name.split(",").slice(0, 3).join(",").trim()
}

function useDebounce<T>(value: T, ms: number): T {
  const [dv, setDv] = useState(value)
  useEffect(() => { const t = setTimeout(() => setDv(value), ms); return () => clearTimeout(t) }, [value, ms])
  return dv
}

// Валідація українського телефону
function validatePhone(p: string): boolean {
  return /^(\+?38)?0\d{9}$/.test(p.replace(/[\s\-()]/g, ""))
}

export default memo(function NewRequestModal({ onClose, onCreated }: Props) {
  const toast = useToast()
  const justSelectedRef = useRef(false)

  const [title,       setTitle]       = useState("")
  const [description, setDescription] = useState("")
  const [priority,    setPriority]    = useState<Priority>("medium")
  const [phone,       setPhone]       = useState("")
  const [loading,     setLoading]     = useState(false)

  const [photo,   setPhoto]   = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const [addressQuery,    setAddressQuery]    = useState("")
  const [suggestions,     setSuggestions]     = useState<NominatimResult[]>([])
  const [searching,       setSearching]       = useState(false)
  const [selectedPlace,   setSelectedPlace]   = useState<{ name: string; lat: number; lng: number } | null>(null)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [showMap,         setShowMap]         = useState(false)
  const [coords,          setCoords]          = useState<{ lat: number; lng: number } | null>(null)

  const debouncedQuery = useDebounce(addressQuery, 400)

  useEffect(() => {
    if (justSelectedRef.current) { justSelectedRef.current = false; return }
    if (debouncedQuery.length < 3) { setSuggestions([]); return }
    setSearching(true)
    fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(debouncedQuery)}&format=json&addressdetails=1&countrycodes=ua&limit=6`,
      { headers: { "Accept-Language": "uk" } }
    )
      .then(r => r.json())
      .then((data: NominatimResult[]) => { setSuggestions(data); setShowSuggestions(true) })
      .catch(() => setSuggestions([]))
      .finally(() => setSearching(false))
  }, [debouncedQuery])

  const selectSuggestion = (s: NominatimResult) => {
    const lat = parseFloat(s.lat), lng = parseFloat(s.lon)
    const name = shortName(s)
    justSelectedRef.current = true
    setSelectedPlace({ name, lat, lng })
    setCoords({ lat, lng })
    setAddressQuery(name)
    setSuggestions([])
    setShowSuggestions(false)
  }

  const handleMapClick = useCallback(async (lat: number, lng: number) => {
    setCoords({ lat, lng })
    try {
      const res  = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`, { headers: { "Accept-Language": "uk" } })
      const data: NominatimResult = await res.json()
      const name = shortName(data)
      setSelectedPlace({ name, lat, lng })
      justSelectedRef.current = true
      setAddressQuery(name)
    } catch {
      setSelectedPlace({ name: `${lat.toFixed(5)}, ${lng.toFixed(5)}`, lat, lng })
      justSelectedRef.current = true
      setAddressQuery(`${lat.toFixed(5)}, ${lng.toFixed(5)}`)
    }
    setShowMap(false)
  }, [])

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!ALLOWED.includes(file.type)) { toast.error("Дозволені лише JPEG та PNG"); return }
    if (file.size > MAX_BYTES)        { toast.error("Файл занадто великий (макс 5 МБ)"); return }
    setPhoto(file); setPreview(URL.createObjectURL(file))
  }

  const handleSubmit = async () => {
    if (!title.trim())   { toast.error("Введіть назву заявки"); return }
    if (!selectedPlace)  { toast.error("Оберіть місце на карті або через пошук"); return }
    if (phone && !validatePhone(phone)) { toast.error("Невірний формат телефону (напр. 0671234567)"); return }

    setLoading(true)
    try {
      let created = await createRequest({
        title:         title.trim(),
        description:   description.trim() || undefined,
        priority,
        location_name: selectedPlace.name,
        latitude:      selectedPlace.lat,
        longitude:     selectedPlace.lng,
        phone:         phone.trim() || undefined,
      })
      if (photo) {
        try { created = await uploadPhoto(created.id, photo) }
        catch { toast.error("Заявку створено, але фото не завантажено") }
      }
      toast.success("Заявку створено!")
      onCreated(created)
    } catch { toast.error("Помилка при створенні заявки") }
    finally  { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh] rounded-2xl border border-white/8" style={{ background: "#0c1220" }}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/6 shrink-0">
          <div>
            <p className="text-[10px] text-slate-600 uppercase tracking-widest">Нова заявка</p>
            <h2 className="text-base font-bold text-white mt-0.5">Створення заявки на розмінування</h2>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition text-xl">×</button>
        </div>

        <div className="overflow-y-auto p-6 flex flex-col gap-3">
          <input className={inp} style={bg} placeholder="Назва*" value={title} onChange={e => setTitle(e.target.value)} />
          <textarea className={`${inp} resize-none`} style={bg} placeholder="Опис ситуації" rows={2} value={description} onChange={e => setDescription(e.target.value)} />
          <select className={inp} style={bg} value={priority} onChange={e => setPriority(e.target.value as Priority)}>
            {PRIORITIES.map(p => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
          </select>

          {/* Телефон */}
          <div>
            <label className="text-[10px] text-slate-600 uppercase tracking-widest block mb-1.5">
              Контактний телефон <span className="normal-case text-slate-700">(необов'язково)</span>
            </label>
            <input className={inp} style={bg} placeholder="+38 (067) 123-45-67"
              value={phone} onChange={e => setPhone(e.target.value)} type="tel" />
          </div>

          {/* Пошук адреси */}
          <div className="relative">
            <label className="text-[10px] text-slate-600 uppercase tracking-widest block mb-1.5">
              Місце знаходження *
            </label>
            <div className="relative">
              <input className={inp} style={bg}
                placeholder="Введіть населений пункт або вулицю…"
                value={addressQuery}
                onChange={e => { setAddressQuery(e.target.value); setSelectedPlace(null) }}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                autoComplete="off"
              />
              {searching && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 animate-pulse">Пошук…</span>}
            </div>
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-10 w-full mt-1 rounded-xl border border-white/10 shadow-2xl overflow-hidden" style={{ background: "#111827" }}>
                {suggestions.map(s => (
                  <button key={s.place_id} type="button"
                    className="w-full text-left px-3 py-2.5 text-xs hover:bg-white/5 transition border-b border-white/5 last:border-0"
                    onMouseDown={() => selectSuggestion(s)}>
                    <p className="text-white font-semibold truncate">{shortName(s)}</p>
                    <p className="text-slate-500 truncate mt-0.5">{s.display_name}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedPlace && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-emerald-500/20 text-xs" style={{ background: "rgba(74,222,128,0.06)" }}>
              <span className="text-emerald-400">📍</span>
              <span className="text-emerald-300 font-semibold flex-1 truncate">{selectedPlace.name}</span>
              <span className="text-emerald-600 font-mono">{selectedPlace.lat.toFixed(4)}, {selectedPlace.lng.toFixed(4)}</span>
            </div>
          )}

          <button type="button" onClick={() => setShowMap(true)}
            className="flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-xl border border-amber-500/20 text-amber-400 hover:bg-amber-500/8 transition">
            ▦ {selectedPlace ? "Уточнити на карті" : "Вибрати точку на карті"}
          </button>

          <button type="button" onClick={() => fileRef.current?.click()}
            className="flex items-center justify-center gap-2 py-2.5 text-sm rounded-xl border border-white/8 text-slate-400 hover:text-white hover:bg-white/5 transition" style={bg}>
            📷 {photo ? photo.name : "Додати фото (необов'язково)"}
          </button>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={handleFile} />
          {preview && (
            <div className="relative">
              <img src={preview} alt="preview" className="w-full h-32 object-cover rounded-xl border border-white/8" />
              <button type="button" onClick={() => { setPhoto(null); setPreview(null); if (fileRef.current) fileRef.current.value = "" }}
                className="absolute top-1.5 right-1.5 bg-black/70 text-white text-xs px-2 py-0.5 rounded-lg">✕</button>
            </div>
          )}

          <div className="flex gap-3 mt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 text-sm font-semibold text-slate-400 hover:text-white rounded-xl border border-white/8 hover:bg-white/5 transition">Скасувати</button>
            <button type="button" onClick={handleSubmit} disabled={loading || !selectedPlace}
              className="flex-1 py-2.5 text-sm font-bold text-slate-900 rounded-xl transition disabled:opacity-40"
              style={{ background: loading ? "#92400e" : "#fbbf24" }}>
              {loading ? "Надсилання…" : "Створити заявку"}
            </button>
          </div>
        </div>
      </div>

      {showMap && (
        <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4" onClick={() => setShowMap(false)}>
          <div className="w-full max-w-2xl h-[70vh] flex flex-col rounded-2xl overflow-hidden border border-white/8" style={{ background: "#0c1220" }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/6">
              <p className="text-sm font-semibold text-white">Клікніть на карті щоб обрати місце</p>
              <button onClick={() => setShowMap(false)} className="text-slate-500 hover:text-white text-xl">×</button>
            </div>
            <div className="flex-1"><MapView onMapClick={handleMapClick} selectedCoords={coords} /></div>
          </div>
        </div>
      )}
    </div>
  )
})
