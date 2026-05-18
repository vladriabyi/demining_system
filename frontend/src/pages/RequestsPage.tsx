import { useCallback, useEffect, useMemo, useState } from "react"
import { useLocation } from "react-router-dom"
import { getRequests, deleteRequest } from "../api/requests"
import { useToast } from "../context/ToastContext"
import type { DeminingRequest, Priority, RequestStatus } from "../types"
import RequestDetailModal from "../components/RequestDetailModal"
import NewRequestModal from "../components/NewRequestModal"
import Spinner from "../components/Spinner"
import { StatusBadge, PriorityBadge } from "../components/StatusBadge"
import { REQUEST_STATUS, PRIORITY_LABEL } from "../components/constants"

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString("uk-UA", { day: "2-digit", month: "2-digit", year: "numeric" })

const sel   = "border border-white/8 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500/40 transition"
const selbg = { background: "rgba(255,255,255,0.04)" }

// ── Sorting ───────────────────────────────────────────────────
type SortField = "id" | "title" | "location_name" | "status" | "priority" | "created_at"
type SortDir   = "asc" | "desc"

const PRIORITY_ORDER: Record<string, number> = { low: 0, medium: 1, high: 2, critical: 3 }
const STATUS_ORDER:   Record<string, number> = {
  pending: 0, under_review: 1, approved: 2, in_progress: 3, completed: 4, rejected: 5,
}

function sortRequests(list: DeminingRequest[], field: SortField, dir: SortDir) {
  return [...list].sort((a, b) => {
    let cmp = 0
    if      (field === "id")            cmp = a.id - b.id
    else if (field === "title")         cmp = a.title.localeCompare(b.title, "uk")
    else if (field === "location_name") cmp = a.location_name.localeCompare(b.location_name, "uk")
    else if (field === "status")        cmp = STATUS_ORDER[a.status]   - STATUS_ORDER[b.status]
    else if (field === "priority")      cmp = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
    else if (field === "created_at")    cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    return dir === "asc" ? cmp : -cmp
  })
}

// ── SortHeader ────────────────────────────────────────────────
function SortTh({ label, field, sort, onSort }: {
  label: string
  field: SortField
  sort: { field: SortField; dir: SortDir }
  onSort: (f: SortField) => void
}) {
  const active = sort.field === field
  return (
    <th
      className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest whitespace-nowrap cursor-pointer select-none transition-colors hover:text-amber-400"
      style={{ color: active ? "#fbbf24" : "#475569" }}
      onClick={() => onSort(field)}
    >
      {label}{" "}
      <span className="ml-0.5 opacity-70">
        {active ? (sort.dir === "asc" ? "↑" : "↓") : "↕"}
      </span>
    </th>
  )
}

export default function RequestsPage() {
  const location = useLocation()
  const toast    = useToast()

  const [requests,       setRequests]      = useState<DeminingRequest[]>([])
  const [loading,        setLoading]       = useState(true)
  const [search,         setSearch]        = useState("")
  const [filterStatus,   setFilterStatus]  = useState("all")
  const [filterPriority, setFilterPriority]= useState("all")
  const [viewing,        setViewing]       = useState<DeminingRequest | null>(null)
  const [showNew,        setShowNew]       = useState(false)
  const [deleting,       setDeleting]      = useState<number | null>(null)
  const [sort,           setSort]          = useState<{ field: SortField; dir: SortDir }>({ field: "created_at", dir: "desc" })

  const load = useCallback(async () => {
    setLoading(true)
    try { setRequests(await getRequests()) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const state = location.state as { openId?: number } | null
    if (state?.openId && requests.length > 0) {
      const found = requests.find(r => r.id === state.openId)
      if (found) setViewing(found)
    }
  }, [location.state, requests])

  const handleSort = (field: SortField) =>
    setSort(prev => ({ field, dir: prev.field === field && prev.dir === "asc" ? "desc" : "asc" }))

  const filtered = useMemo(() => {
    const base = requests.filter(r => {
      const q = search.toLowerCase()
      return (
        (filterStatus   === "all" || r.status   === filterStatus) &&
        (filterPriority === "all" || r.priority === filterPriority) &&
        (r.title.toLowerCase().includes(q) || r.location_name.toLowerCase().includes(q))
      )
    })
    return sortRequests(base, sort.field, sort.dir)
  }, [requests, search, filterStatus, filterPriority, sort])

  const handleDelete = async (id: number) => {
    if (!window.confirm("Видалити заявку?")) return
    setDeleting(id)
    try {
      await deleteRequest(id)
      setRequests(p => p.filter(r => r.id !== id))
      toast.success("Заявку видалено")
    } catch {
      toast.error("Помилка видалення")
    } finally {
      setDeleting(null)
    }
  }

  const sortProps = { sort, onSort: handleSort }

  return (
    <div className="flex flex-col gap-5 h-full">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <p className="text-[10px] text-slate-600 uppercase tracking-widest">Управління</p>
          <h1 className="text-xl font-extrabold text-white mt-0.5">Заявки</h1>
          <p className="text-xs text-slate-600 mt-0.5">{filtered.length} з {requests.length} показано</p>
        </div>
        <button onClick={() => setShowNew(true)}
          className="px-4 py-2.5 text-sm font-bold text-slate-900 rounded-xl transition"
          style={{ background: "#fbbf24" }}>
          + Нова заявка
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 shrink-0 flex-wrap">
        <input
          className={`${sel} flex-1 min-w-40`} style={selbg}
          placeholder="🔍 Пошук за назвою або локацією…"
          value={search} onChange={e => setSearch(e.target.value)}
        />
        <select className={sel} style={selbg} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="all">Всі статуси</option>
          {Object.entries(REQUEST_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select className={sel} style={selbg} value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
          <option value="all">Всі пріоритети</option>
          {Object.entries(PRIORITY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="flex-1 min-h-0 overflow-auto rounded-2xl border border-white/6" style={{ background: "#0c1220" }}>
        {loading
          ? <Spinner />
          : filtered.length === 0
            ? <div className="flex flex-col items-center justify-center h-full text-slate-600 gap-2">
                <span className="text-4xl">📭</span>
                <p className="text-sm">Заявок не знайдено</p>
              </div>
            : (
              <table className="w-full text-sm">
                <thead className="sticky top-0 border-b border-white/6" style={{ background: "#0c1220" }}>
                  <tr>
                    <SortTh label="#"         field="id"            {...sortProps} />
                    <SortTh label="Назва"     field="title"         {...sortProps} />
                    <SortTh label="Локація"   field="location_name" {...sortProps} />
                    <SortTh label="Статус"    field="status"        {...sortProps} />
                    <SortTh label="Пріоритет" field="priority"      {...sortProps} />
                    <SortTh label="Дата"      field="created_at"    {...sortProps} />
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r => (
                    <tr
                      key={r.id}
                      className="border-b border-white/4 hover:bg-white/3 transition-colors cursor-pointer"
                      onClick={() => setViewing(r)}
                    >
                      <td className="px-4 py-3 text-slate-600 text-xs font-mono">#{r.id}</td>
                      <td className="px-4 py-3 text-white font-semibold max-w-xs truncate">{r.title}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs max-w-xs truncate">{r.location_name}</td>
                      <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                      <td className="px-4 py-3"><PriorityBadge priority={r.priority} /></td>
                      <td className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap font-mono">{fmt(r.created_at)}</td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <button
                          disabled={deleting === r.id}
                          onClick={() => handleDelete(r.id)}
                          className="px-2.5 py-1.5 text-xs text-red-500 hover:text-red-300 hover:bg-red-950/40 rounded-lg transition disabled:opacity-40"
                        >
                          {deleting === r.id ? "…" : "🗑"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
        }
      </div>

      {viewing && <RequestDetailModal request={viewing} onClose={() => setViewing(null)} />}
      {showNew  && (
        <NewRequestModal
          onClose={() => setShowNew(false)}
          onCreated={r => { setRequests(p => [r, ...p]); setShowNew(false) }}
        />
      )}
    </div>
  )
}
