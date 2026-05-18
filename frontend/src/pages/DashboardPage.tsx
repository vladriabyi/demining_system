import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { getDashboardStats, getRequests } from "../api/requests"
import type { DashboardStats, DeminingRequest } from "../types"
import MapView from "../components/MapView"
import Spinner from "../components/Spinner"
import NewRequestModal from "../components/NewRequestModal"
import { PRIORITY_COLOR, REQUEST_STATUS } from "../components/constants"

const STAT_CFG = [
  { key: "total_requests",       label: "Всього заявок", icon: "≡", color: "#60a5fa" },
  { key: "pending_requests",     label: "Очікують",      icon: "◷", color: "#94a3b8" },
  { key: "in_progress_requests", label: "В роботі",      icon: "⚙", color: "#fb923c" },
  { key: "completed_requests",   label: "Завершено",     icon: "✓", color: "#4ade80" },
  { key: "critical_requests",    label: "Критичних",     icon: "⚠", color: "#f87171" },
  { key: "total_brigades",       label: "Бригади",       icon: "🪖", color: "#a78bfa" },
] as const

// ── Civilian onboarding ───────────────────────────────────────
const STEPS = [
  {
    icon: "🔍",
    title: "Знайдіть небезпечний об'єкт",
    desc:  "Виявили підозрілий предмет, міну або снаряд? Не торкайтесь і не наближайтесь.",
  },
  {
    icon: "📋",
    title: "Подайте заявку",
    desc:  "Натисніть кнопку «+ Нова заявка» та вкажіть місце знаходження та деталі.",
  },
  {
    icon: "🪖",
    title: "Сапери приїдуть",
    desc:  "Фахівці отримають ваше повідомлення, перевірять та знешкодять небезпеку.",
  },
]

function CivilianOnboarding({ onNewRequest }: { onNewRequest: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-8 py-8">
      {/* Hero */}
      <div className="text-center max-w-lg">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4"
          style={{ background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.2)" }}>
          💣
        </div>
        <h2 className="text-2xl font-extrabold text-white mb-2">Допоможіть зробити Україну безпечнішою</h2>
        <p className="text-sm text-slate-500 leading-relaxed">
          Якщо ви виявили підозрілий предмет — не торкайтесь його та негайно подайте заявку.
          Наші сапери оперативно відреагують.
        </p>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-3 gap-4 w-full max-w-2xl">
        {STEPS.map((s, i) => (
          <div key={i} className="rounded-2xl p-5 flex flex-col gap-3 border border-white/6" style={{ background: "#0c1220" }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
              style={{ background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.15)" }}>
              {s.icon}
            </div>
            <div>
              <p className="text-xs font-bold text-white mb-1">{s.title}</p>
              <p className="text-[11px] text-slate-500 leading-relaxed">{s.desc}</p>
            </div>
            <div className="text-[10px] font-bold text-amber-500/60 mt-auto">Крок {i + 1}</div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <button onClick={onNewRequest}
        className="px-8 py-3.5 text-sm font-bold text-slate-900 rounded-2xl transition hover:opacity-90 shadow-lg"
        style={{ background: "#fbbf24", boxShadow: "0 0 30px rgba(251,191,36,0.25)" }}>
        📋 Подати заявку на розмінування
      </button>

      <p className="text-xs text-slate-700">
        У разі небезпеки також телефонуйте <span className="text-slate-500 font-semibold">101</span> або <span className="text-slate-500 font-semibold">112</span>
      </p>
    </div>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const isCivilian = user?.role === "civilian"

  const [requests, setRequests] = useState<DeminingRequest[]>([])
  const [stats,    setStats]    = useState<DashboardStats | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [showNew,  setShowNew]  = useState(false)

  useEffect(() => {
    Promise.all([getRequests(), getDashboardStats()])
      .then(([r, s]) => { setRequests(r); setStats(s) })
      .finally(() => setLoading(false))
  }, [])

  const recent = useMemo(() =>
    [...requests].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 6),
    [requests]
  )

  const hasRequests = requests.length > 0

  return (
    <div className="flex flex-col gap-5 h-full">
      <div>
        <p className="text-[10px] text-slate-600 uppercase tracking-widest">Огляд</p>
        <h1 className="text-xl font-extrabold text-white mt-1">
          {user?.full_name?.split(" ")[0] ?? "Вітаємо"}, вітаємо 👋
        </h1>
        {isCivilian && hasRequests && (
          <p className="text-xs text-slate-600 mt-0.5">Карта та список відображають лише ваші заявки.</p>
        )}
      </div>

      {/* Stats — тільки для стаффу або якщо є заявки */}
      {(!isCivilian || hasRequests) && (
        <div className={`grid gap-3 shrink-0 ${isCivilian ? "grid-cols-3" : "grid-cols-6"}`}>
          {(isCivilian
            ? STAT_CFG.filter(s => ["total_requests","pending_requests","completed_requests"].includes(s.key))
            : STAT_CFG
          ).map(s => (
            <div key={s.key} className="rounded-xl border border-white/6 px-3 py-3 flex flex-col gap-1" style={{ background: "#0c1220" }}>
              <span className="text-base" style={{ color: s.color }}>{s.icon}</span>
              <p className="text-2xl font-extrabold text-white leading-none">{stats?.[s.key] ?? 0}</p>
              <p className="text-[10px] text-slate-600 leading-tight">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Основний контент */}
      {isCivilian && !hasRequests && !loading
        ? <CivilianOnboarding onNewRequest={() => setShowNew(true)} />
        : (
          <div className="flex-1 min-h-0 grid grid-cols-3 gap-4">
            <div className="col-span-2 rounded-2xl overflow-hidden border border-white/6">
              {loading
                ? <div className="h-full" style={{ background: "#0c1220" }}><Spinner text="Завантаження карти…" /></div>
                : <MapView requests={requests} onRequestClick={r => navigate("/requests", { state: { openId: r.id } })} />
              }
            </div>

            <div className="rounded-2xl border border-white/6 flex flex-col overflow-hidden" style={{ background: "#0c1220" }}>
              <div className="px-4 py-3 border-b border-white/6 flex items-center justify-between">
                <p className="text-xs font-bold text-white">{isCivilian ? "Мої останні заявки" : "Останні заявки"}</p>
                {isCivilian && (
                  <button onClick={() => setShowNew(true)}
                    className="text-[10px] font-bold text-amber-400 hover:text-amber-300 transition">+ Нова</button>
                )}
              </div>
              <div className="flex-1 overflow-y-auto">
                {loading ? <Spinner /> : recent.length === 0
                  ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-600 gap-2 p-4">
                      <span className="text-2xl">📭</span>
                      <p className="text-xs text-center">Немає заявок</p>
                      {isCivilian && (
                        <button onClick={() => setShowNew(true)}
                          className="mt-1 text-xs font-semibold text-amber-400 hover:underline">Подати першу заявку</button>
                      )}
                    </div>
                  )
                  : recent.map(r => {
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
                    })
                }
              </div>
            </div>
          </div>
        )
      }

      {showNew && (
        <NewRequestModal
          onClose={() => setShowNew(false)}
          onCreated={r => { setRequests(p => [r, ...p]); setShowNew(false) }}
        />
      )}
    </div>
  )
}
