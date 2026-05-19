import { useEffect, useState, memo, useMemo } from "react"
import { Navigate } from "react-router-dom"
import { isOperator } from "../utils/roles"
import { getBrigades, createBrigade, updateBrigade, deleteBrigade } from "../api/brigades"
import { getRequests, updateRequest } from "../api/requests"
import { getUsers } from "../api/users"
import { useToast } from "../context/ToastContext"
import { useAuth } from "../context/AuthContext"
import type { Brigade, BrigadeStatus, DeminingRequest, User } from "../types"
import Spinner from "../components/Spinner"
import { REQUEST_STATUS } from "../components/constants"

const BRIGADE_STATUS: Record<BrigadeStatus, { label: string; color: string; bg: string }> = {
  available:   { label: "Вільна",     color: "#4ade80", bg: "rgba(74,222,128,.12)"  },
  busy:        { label: "В роботі",   color: "#fb923c", bg: "rgba(251,146,60,.12)"  },
  unavailable: { label: "Недоступна", color: "#f87171", bg: "rgba(248,113,113,.12)" },
}

const inp = "w-full rounded-xl border border-white/8 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/50 transition"
const ibg = { background: "rgba(255,255,255,0.04)" }

// ─── BrigadeModal ─────────────────────────────────────────────
const BrigadeModal = memo(function BrigadeModal({ brigade, allUsers, onClose, onSaved }: {
  brigade?: Brigade | null; allUsers: User[]; onClose: () => void; onSaved: (b: Brigade) => void
}) {
  const toast  = useToast()
  const isEdit = !!brigade
  const [name, setName]           = useState(brigade?.name           ?? "")
  const [number, setNumber]       = useState(brigade?.number         ?? "")
  const [status, setStatus]       = useState<BrigadeStatus>(brigade?.status ?? "available")
  const [spec, setSpec]           = useState(brigade?.specialization ?? "")
  const [memberIds, setMemberIds] = useState<number[]>(brigade?.members.map(m => m.id) ?? [])
  const [loading, setLoading]     = useState(false)

  const toggle = (id: number) =>
    setMemberIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])

  const handleSave = async () => {
    if (!name.trim() || !number.trim()) { toast.error("Назва та номер обов'язкові"); return }
    setLoading(true)
    try {
      const payload = { name: name.trim(), number: number.trim(), status, specialization: spec.trim() || undefined, member_ids: memberIds }
      const saved   = isEdit ? await updateBrigade(brigade!.id, payload) : await createBrigade(payload)
      toast.success(isEdit ? "Бригаду оновлено" : "Бригаду створено")
      onSaved(saved)
    } catch { toast.error("Помилка збереження") }
    finally  { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="w-full max-w-lg shadow-2xl rounded-2xl border border-white/8 flex flex-col max-h-[90vh]"
        style={{ background: "#0c1220" }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/6 shrink-0">
          <div>
            <p className="text-[10px] text-slate-600 uppercase tracking-widest">{isEdit ? "Редагування" : "Нова бригада"}</p>
            <h2 className="text-sm font-bold text-white mt-0.5">{isEdit ? brigade!.name : "Створити бригаду"}</h2>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white text-xl">×</button>
        </div>
        <div className="p-6 flex flex-col gap-4 overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-slate-600 uppercase tracking-widest block mb-2">Назва</label>
              <input className={inp} style={ibg} value={name} onChange={e => setName(e.target.value)} placeholder="Бригада 1" />
            </div>
            <div>
              <label className="text-[10px] text-slate-600 uppercase tracking-widest block mb-2">Номер</label>
              <input className={inp} style={ibg} value={number} onChange={e => setNumber(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-[10px] text-slate-600 uppercase tracking-widest block mb-2">Статус</label>
            <select className={inp} style={ibg} value={status} onChange={e => setStatus(e.target.value as BrigadeStatus)}>
              {Object.entries(BRIGADE_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-slate-600 uppercase tracking-widest block mb-2">Спеціалізація</label>
            <input className={inp} style={ibg} value={spec} onChange={e => setSpec(e.target.value)} placeholder="Міни, ВНП…" />
          </div>
          <div>
            <label className="text-[10px] text-slate-600 uppercase tracking-widest block mb-2">
              Особовий склад ({memberIds.length} обрано)
            </label>
            <div className="rounded-xl border border-white/8 overflow-hidden" style={{ background: "rgba(255,255,255,0.02)" }}>
              {allUsers.filter(u => u.role !== "civilian").map(u => {
                const checked = memberIds.includes(u.id)
                return (
                  <div key={u.id} className="flex items-center gap-3 px-3 py-2.5 border-b border-white/4 last:border-0 cursor-pointer hover:bg-white/3 transition"
                    onClick={() => toggle(u.id)}>
                    <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border transition ${checked ? "border-amber-400" : "border-white/20"}`}
                      style={{ background: checked ? "rgba(251,191,36,.2)" : "transparent" }}>
                      {checked && <span className="text-amber-400 text-[10px] font-bold">✓</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{u.full_name}</p>
                      <p className="text-[10px] text-slate-500 truncate">{u.email}</p>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-md font-semibold uppercase"
                      style={{ background: "rgba(251,191,36,.1)", color: "#fbbf24", border: "1px solid rgba(251,191,36,.2)" }}>
                      {u.role}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-white/6 shrink-0">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm font-semibold text-slate-400 rounded-xl border border-white/8 hover:bg-white/5 transition">Скасувати</button>
          <button onClick={handleSave} disabled={loading}
            className="flex-1 py-2.5 text-sm font-bold text-slate-900 rounded-xl transition disabled:opacity-50"
            style={{ background: loading ? "#92400e" : "#fbbf24" }}>
            {loading ? "Збереження…" : isEdit ? "Зберегти" : "Створити"}
          </button>
        </div>
      </div>
    </div>
  )
})

// ─── AssignRequestModal ───────────────────────────────────────
const ACTIVE_STATUSES = ["pending", "under_review", "approved", "in_progress"]

const AssignRequestModal = memo(function AssignRequestModal({ brigade, requests, onClose, onAssigned }: {
  brigade: Brigade; requests: DeminingRequest[]; onClose: () => void; onAssigned: (id: number) => void
}) {
  const toast = useToast()
  const [loading, setLoading] = useState<number | null>(null)
  const [search,  setSearch]  = useState("")

  const available = useMemo(() =>
    requests.filter(r =>
      ACTIVE_STATUSES.includes(r.status) &&
      (r.brigade_id == null || r.brigade_id === brigade.id) &&
      (r.title.toLowerCase().includes(search.toLowerCase()) ||
       r.location_name.toLowerCase().includes(search.toLowerCase()))
    ), [requests, brigade.id, search]
  )

  const handleAssign = async (r: DeminingRequest) => {
    const unassign = r.brigade_id === brigade.id
    setLoading(r.id)
    try {
      // Призначаємо/знімаємо бригаду з заявки (критично)
      await updateRequest(r.id, { brigade_id: unassign ? null : brigade.id })

      // Автоматично оновлюємо статус бригади (некритично)
      if (!unassign) {
        // Призначення: вільна → в роботі
        if (brigade.status === "available") {
          try { await updateBrigade(brigade.id, { status: "busy" }) } catch {}
        }
      } else {
        // Зняття: перевіряємо чи є ще активні заявки у цієї бригади
        const remainingActive = requests.filter(
          req => req.brigade_id === brigade.id &&
                 req.id !== r.id &&
                 ACTIVE_STATUSES.includes(req.status)
        )
        if (remainingActive.length === 0 && brigade.status === "busy") {
          try { await updateBrigade(brigade.id, { status: "available" }) } catch {}
        }
      }

      toast.success(unassign ? "Бригаду знято із заявки" : `Призначено на «${r.title}»`)
      onAssigned(r.id)
    } catch (err: any) {
      const detail = err?.response?.data?.detail
      console.error("Brigade assign error:", err?.response?.status, detail, err)
      toast.error(detail ? `Помилка: ${detail}` : "Помилка призначення")
    }
    finally  { setLoading(null) }
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="w-full max-w-lg shadow-2xl rounded-2xl border border-white/8 flex flex-col max-h-[80vh]"
        style={{ background: "#0c1220" }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/6 shrink-0">
          <div>
            <p className="text-[10px] text-slate-600 uppercase tracking-widest">Призначення заявки</p>
            <h2 className="text-sm font-bold text-white mt-0.5">
              {brigade.name} <span className="text-slate-500 font-normal text-xs">· {brigade.number}</span>
            </h2>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white text-xl">×</button>
        </div>
        <div className="px-4 py-3 border-b border-white/6 shrink-0">
          <input className="w-full rounded-xl border border-white/8 px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/50 transition"
            style={ibg} placeholder="🔍 Пошук заявок…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex-1 overflow-y-auto">
          {available.length === 0
            ? <div className="flex flex-col items-center justify-center h-32 text-slate-600 gap-1">
                <span className="text-2xl">📭</span>
                <p className="text-xs">Немає активних вільних заявок</p>
              </div>
            : available.map(r => {
                const st       = REQUEST_STATUS[r.status]
                const assigned = r.brigade_id === brigade.id
                return (
                  <div key={r.id} className="flex items-center gap-3 px-4 py-3.5 border-b border-white/4 hover:bg-white/3 transition">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-xs font-semibold text-white truncate">{r.title}</p>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md"
                          style={{ background: `${st?.color}18`, color: st?.color }}>{st?.label}</span>
                        {assigned && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md"
                            style={{ background: "rgba(251,191,36,.12)", color: "#fbbf24" }}>● Призначена</span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5 truncate">📍 {r.location_name}</p>
                    </div>
                    <button disabled={loading === r.id} onClick={() => handleAssign(r)}
                      className="shrink-0 px-3 py-1.5 text-xs font-bold rounded-xl transition disabled:opacity-40"
                      style={assigned
                        ? { background: "rgba(248,113,113,.1)", color: "#f87171", border: "1px solid rgba(248,113,113,.25)" }
                        : { background: "rgba(251,191,36,.1)",  color: "#fbbf24",  border: "1px solid rgba(251,191,36,.25)" }}>
                      {loading === r.id ? "…" : assigned ? "Зняти" : "Призначити"}
                    </button>
                  </div>
                )
              })
          }
        </div>
        <div className="px-6 py-4 border-t border-white/6 shrink-0">
          <button onClick={onClose} className="w-full py-2.5 text-sm font-semibold text-slate-400 rounded-xl border border-white/8 hover:bg-white/5 transition">Закрити</button>
        </div>
      </div>
    </div>
  )
})

// ─── Main page ────────────────────────────────────────────────
export default function BrigadesPage() {
  const { user } = useAuth()
  const toast    = useToast()
  const isStaff  = user?.role === "admin" || user?.role === "coordinator"

  const [brigades,  setBrigades]  = useState<Brigade[]>([])
  const [allUsers,  setAllUsers]  = useState<User[]>([])
  const [requests,  setRequests]  = useState<DeminingRequest[]>([])
  const [loading,   setLoading]   = useState(true)
  const [modal,     setModal]     = useState<"create" | Brigade | null>(null)
  const [assignFor, setAssignFor] = useState<Brigade | null>(null)
  const [filter,    setFilter]    = useState<BrigadeStatus | "all">("all")

  const reload = async () => {
    try {
      const [b, r] = await Promise.all([getBrigades(), getRequests()])
      setBrigades(b.sort((a, z) => a.number.localeCompare(z.number)))
      setRequests(r)
      if (isStaff) {
        setAllUsers(await getUsers())
      }
    } catch {
      toast.error("Не вдалося завантажити бригади")
    }
  }

  useEffect(() => {
    reload().finally(() => setLoading(false))
  }, [isStaff])

  const handleSaved = (b: Brigade) => {
    setBrigades(prev => prev.some(x => x.id === b.id) ? prev.map(x => x.id === b.id ? b : x) : [...prev, b])
    setModal(null)
  }

  const handleDelete = async (id: number) => {
    if (!confirm("Видалити бригаду?")) return
    try { await deleteBrigade(id); setBrigades(prev => prev.filter(b => b.id !== id)); toast.success("Бригаду видалено") }
    catch { toast.error("Помилка видалення") }
  }

  const filtered = filter === "all" ? brigades : brigades.filter(b => b.status === filter)

  if (isOperator(user?.role)) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="flex flex-col gap-5 h-full">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] text-slate-600 uppercase tracking-widest">Управління</p>
          <h1 className="text-xl font-extrabold text-white mt-1">Бригади 🪖</h1>
          <p className="text-xs text-slate-500 mt-0.5">{brigades.length} бригад · {brigades.reduce((s, b) => s + b.members.length, 0)} саперів</p>
        </div>
        {isStaff && (
          <button onClick={() => setModal("create")} className="px-4 py-2.5 text-sm font-bold text-slate-900 rounded-xl"
            style={{ background: "#fbbf24" }}>+ Нова бригада</button>
        )}
      </div>

      <div className="flex gap-2 shrink-0">
        {([["all", "Всі"], ...Object.entries(BRIGADE_STATUS).map(([k, v]) => [k, v.label])] as [string, string][]).map(([k, label]) => (
          <button key={k} onClick={() => setFilter(k as BrigadeStatus | "all")}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold border transition"
            style={filter === k
              ? { background: "rgba(251,191,36,.15)", color: "#fbbf24", borderColor: "rgba(251,191,36,.3)" }
              : { background: "transparent", color: "#64748b", borderColor: "rgba(255,255,255,.08)" }}>
            {label}
          </button>
        ))}
      </div>

      {loading ? <Spinner text="Завантаження бригад…" /> : filtered.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 text-slate-600">
          <span className="text-4xl">🪖</span><p className="text-sm">Бригад не знайдено</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 overflow-y-auto pb-2">
          {filtered.map(b => {
            const st         = BRIGADE_STATUS[b.status]
            const activeReqs = (b.requests ?? []).filter(r => !["completed", "rejected"].includes(r.status))
            return (
              <div key={b.id} className="rounded-2xl border border-white/6 p-5 flex gap-5 items-start hover:border-white/10 transition"
                style={{ background: "#0c1220" }}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0"
                  style={{ background: st.bg, border: `1px solid ${st.color}30` }}>🪖</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-bold text-white">{b.name}</p>
                    <span className="text-[10px] font-mono text-slate-500 bg-white/5 px-1.5 py-0.5 rounded">{b.number}</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                  </div>
                  {b.specialization && <p className="text-xs text-slate-500 mt-1">🎯 {b.specialization}</p>}
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {b.members.length === 0
                      ? <span className="text-[10px] text-slate-600">Склад не призначено</span>
                      : b.members.map(m => (
                          <span key={m.id} className="text-[10px] px-2 py-0.5 rounded-full border border-white/8 text-slate-400"
                            style={{ background: "rgba(255,255,255,0.04)" }}>👤 {m.full_name}</span>
                        ))
                    }
                  </div>
                  {activeReqs.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {activeReqs.map(r => (
                        <span key={r.id} className="text-[10px] px-2 py-0.5 rounded-full"
                          style={{ background: "rgba(251,146,60,.1)", color: "#fb923c", border: "1px solid rgba(251,146,60,.2)" }}>
                          📋 {r.title}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {isStaff && (
                  <div className="flex flex-col gap-2 shrink-0">
                    <button onClick={() => setAssignFor(b)}
                      className="px-3 py-1.5 text-xs font-bold rounded-xl transition"
                      style={{ background: "rgba(251,191,36,.1)", color: "#fbbf24", border: "1px solid rgba(251,191,36,.2)" }}>
                      📋 Призначити заявку
                    </button>
                    <div className="flex gap-2">
                      <button onClick={() => setModal(b)}
                        className="flex-1 px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-white rounded-lg border border-white/8 hover:bg-white/5 transition">
                        Редагувати
                      </button>
                      <button onClick={() => handleDelete(b.id)}
                        className="flex-1 px-3 py-1.5 text-xs font-semibold text-red-400 rounded-lg border border-red-900/30 hover:bg-red-950/20 transition">
                        Видалити
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {modal && <BrigadeModal brigade={modal === "create" ? null : modal} allUsers={allUsers} onClose={() => setModal(null)} onSaved={handleSaved} />}
      {assignFor && (
        <AssignRequestModal brigade={assignFor} requests={requests} onClose={() => setAssignFor(null)}
          onAssigned={async () => { await reload() }} />
      )}
    </div>
  )
}
