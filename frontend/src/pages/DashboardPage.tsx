import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { isOperator } from "../utils/roles"
import { getDashboardStats, getRequests } from "../api/requests"
import type { DashboardStats, DeminingRequest } from "../types"
import MapView from "../components/MapView"
import Spinner from "../components/Spinner"
import NewRequestModal from "../components/NewRequestModal"
import { PRIORITY_COLOR, REQUEST_STATUS } from "../components/constants"
import { reverseGeocode } from "../hooks/useGeocoding"

const STAT_CFG = [
  { key: "total_requests",       label: "Всього заявок", icon: "≡", color: "#60a5fa" },
  { key: "pending_requests",     label: "Очікують",      icon: "◷", color: "#94a3b8" },
  { key: "in_progress_requests", label: "В роботі",      icon: "⚙", color: "#fb923c" },
  { key: "completed_requests",   label: "Завершено",     icon: "✓", color: "#4ade80" },
  { key: "critical_requests",    label: "Критичних",     icon: "⚠", color: "#f87171" },
  { key: "total_brigades",       label: "Бригади",       icon: "🪖", color: "#a78bfa" },
] as const

function CivilianMapBanner({ onNewRequest }: { onNewRequest: () => void }) {
  return (
    <div className="rounded-2xl border border-amber-500/20 px-4 py-3 flex flex-wrap items-center gap-3 shrink-0"
      style={{ background: "rgba(251,191,36,0.06)" }}>
      <div className="flex-1 min-w-[200px]">
        <p className="text-sm font-bold text-white">Перша заявка на розмінування</p>
        <p className="text-xs text-slate-500 mt-0.5">
          Натисніть на карті місце небезпеки або кнопку нижче — не торкайтесь підозрілого предмета.
        </p>
      </div>
      <button onClick={onNewRequest}
        className="shrink-0 px-4 py-2 text-xs font-bold text-slate-900 rounded-xl hover:opacity-90 transition"
        style={{ background: "#fbbf24" }}>
        📋 Подати заявку
      </button>
    </div>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const userRef  = useRef(user)
  userRef.current = user

  const [requests, setRequests] = useState<DeminingRequest[]>([])
  const [stats,    setStats]    = useState<DashboardStats | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [showNew,  setShowNew]  = useState(false)
  const [modalCoords, setModalCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [draftPin, setDraftPin] = useState<{ lat: number; lng: number; label?: string } | null>(null)

  useLayoutEffect(() => {
    if (!user) return

    let cancelled = false
    setLoading(true)

    Promise.all([getRequests(), getDashboardStats()])
      .then(([r, s]) => {
        if (cancelled) return
        setRequests(r)
        setStats(s)
      })
      .catch(() => { /* залишаємо порожній стан */ })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [user?.id])

  const isCivilian  = user?.role === "civilian"
  const operator    = isOperator(user?.role)
  const hasRequests = requests.length > 0
  const mapClickable = isCivilian
  const showMapHint  = isCivilian && !hasRequests

  const recent = useMemo(() =>
    [...requests].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 6),
    [requests]
  )

  const openNewRequest = useCallback((coords?: { lat: number; lng: number } | null) => {
    setModalCoords(coords ?? (draftPin ? { lat: draftPin.lat, lng: draftPin.lng } : null))
    setShowNew(true)
  }, [draftPin])

  const handleMapClick = useCallback(async (lat: number, lng: number) => {
    if (!mapClickable) return
    setDraftPin({ lat, lng })
    try {
      const name = await reverseGeocode(lat, lng)
      setDraftPin({ lat, lng, label: name })
    } catch {
      setDraftPin({ lat, lng, label: `${lat.toFixed(4)}, ${lng.toFixed(4)}` })
    }
    openNewRequest({ lat, lng })
  }, [mapClickable, openNewRequest])

  const handleCreated = (r: DeminingRequest) => {
    setRequests(prev => [r, ...prev])
    setDraftPin(null)
    setModalCoords(null)
    setShowNew(false)
    getDashboardStats().then(setStats).catch(() => {})
  }

  if (loading || !user) {
    return (
      <div className="h-full flex items-center justify-center">
        <Spinner text="Завантаження…" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5 h-full">
      <div>
        <p className="text-[10px] text-slate-600 uppercase tracking-widest">Огляд</p>
        <h1 className="text-xl font-extrabold text-white mt-1">
          {user.full_name.split(" ")[0]}, вітаємо 👋
        </h1>
        {isCivilian && hasRequests && (
          <p className="text-xs text-slate-600 mt-0.5">Карта та список відображають лише ваші заявки.</p>
        )}
        {operator && (
          <p className="text-xs text-slate-600 mt-0.5">Карта та статистика — лише заявки, призначені вам координатором.</p>
        )}
        {showMapHint && (
          <p className="text-xs text-amber-500/80 mt-0.5">Клікніть на карті, щоб позначити місце та подати заявку.</p>
        )}
      </div>

      {showMapHint && <CivilianMapBanner onNewRequest={() => openNewRequest(null)} />}

      {(isCivilian ? hasRequests : true) && (
        <div className={`grid gap-3 shrink-0 ${
          isCivilian ? "grid-cols-3" : operator ? "grid-cols-4" : "grid-cols-6"
        }`}>
          {(isCivilian
            ? STAT_CFG.filter(s => ["total_requests", "pending_requests", "completed_requests"].includes(s.key))
            : operator
              ? STAT_CFG.filter(s =>
                  ["total_requests", "in_progress_requests", "pending_requests", "completed_requests"].includes(s.key))
              : STAT_CFG
          ).map(s => (
            <div key={s.key} className="rounded-xl border border-white/6 px-3 py-3 flex flex-col gap-1" style={{ background: "#0c1220" }}>
              <span className="text-base" style={{ color: s.color }}>{s.icon}</span>
              <p className="text-2xl font-extrabold text-white leading-none">{stats?.[s.key] ?? 0}</p>
              <p className="text-[10px] text-slate-600 leading-tight">
                {operator && s.key === "total_requests" ? "Призначено мені" : s.label}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="flex-1 min-h-0 grid grid-cols-3 gap-4">
        <div className="col-span-2 rounded-2xl overflow-hidden border border-white/6 relative min-h-[280px]">
          {showNew ? (
            <div className="h-full flex items-center justify-center" style={{ background: "#080d18" }}>
              <p className="text-xs text-slate-600 px-4 text-center">Заповніть форму заявки — карта тимчасово прихована</p>
            </div>
          ) : (
            <MapView
              requests={requests}
              onRequestClick={r => navigate("/requests", { state: { openId: r.id } })}
              onMapClick={mapClickable ? handleMapClick : undefined}
              selectedCoords={draftPin ? { lat: draftPin.lat, lng: draftPin.lng } : null}
              hint={showMapHint ? "📍 Клікніть на карті — місце небезпечного об'єкта" : undefined}
            />
          )}
        </div>

        <div className="rounded-2xl border border-white/6 flex flex-col overflow-hidden" style={{ background: "#0c1220" }}>
          <div className="px-4 py-3 border-b border-white/6 flex items-center justify-between">
            <p className="text-xs font-bold text-white">
              {isCivilian ? "Мої останні заявки" : operator ? "Мої завдання" : "Останні заявки"}
            </p>
            {isCivilian && (
              <button onClick={() => openNewRequest(null)}
                className="text-[10px] font-bold text-amber-400 hover:text-amber-300 transition">+ Нова</button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto">
            {recent.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-600 gap-3 p-6 text-center">
                <span className="text-3xl">🗺️</span>
                <p className="text-xs leading-relaxed">
                  {showMapHint
                    ? "Заявок ще немає. Оберіть точку на карті ліворуч або натисніть «Подати заявку»."
                    : operator
                      ? "Координатор ще не призначив вам заявок."
                      : "Немає заявок"}
                </p>
                {isCivilian && (
                  <button onClick={() => openNewRequest(null)}
                    className="text-xs font-semibold text-amber-400 hover:underline">
                    Подати першу заявку
                  </button>
                )}
                {showMapHint && (
                  <p className="text-[10px] text-slate-700">
                    У разі небезпеки: <span className="text-slate-500">101</span> · <span className="text-slate-500">112</span>
                  </p>
                )}
              </div>
            ) : recent.map(r => {
              const st = REQUEST_STATUS[r.status]
              return (
                <div key={r.id}
                  className="flex items-center gap-3 px-4 py-3 border-b border-white/4 hover:bg-white/3 cursor-pointer transition"
                  onClick={() => navigate("/requests", { state: { openId: r.id } })}>
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: PRIORITY_COLOR[r.priority] }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{r.title}</p>
                    <p className="text-[10px] text-slate-600 truncate">{r.location_name}</p>
                  </div>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md"
                    style={{ background: `${st?.color}15`, color: st?.color }}>
                    {st?.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {showNew && (
        <NewRequestModal
          initialCoords={modalCoords}
          onClose={() => { setShowNew(false); setModalCoords(null) }}
          onCreated={handleCreated}
        />
      )}
    </div>
  )
}
