import { useCallback, useEffect, useMemo, useState } from "react"
import { getRequests } from "../api/requests"
import { getUsers, updateUser } from "../api/users"
import { useToast } from "../context/ToastContext"
import type { DeminingRequest, User, UserRole } from "../types"
import AdminRequestModal from "../components/AdminRequestModal"
import Spinner from "../components/Spinner"
import { StatusBadge, PriorityBadge } from "../components/StatusBadge"
import { REQUEST_STATUS, PRIORITY_LABEL, PRIORITY_COLOR, ROLE_LABEL } from "../components/constants"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts"

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString("uk-UA", { day: "2-digit", month: "2-digit", year: "numeric" })

const ROLES: UserRole[] = ["civilian", "operator", "coordinator", "admin"]

// ── Sorting ───────────────────────────────────────────────────
type SortDir = "asc" | "desc"

type ReqSortField = "id" | "title" | "requester" | "status" | "priority" | "assignee" | "created_at"
type UsrSortField = "id" | "full_name" | "email" | "role" | "is_active" | "request_count"

const PRIORITY_ORDER: Record<string, number> = { low: 0, medium: 1, high: 2, critical: 3 }
const STATUS_ORDER:   Record<string, number> = {
  pending: 0, under_review: 1, approved: 2, in_progress: 3, completed: 4, rejected: 5,
}
const ROLE_ORDER: Record<string, number> = { civilian: 0, operator: 1, coordinator: 2, admin: 3 }

function sortRequests(list: DeminingRequest[], field: ReqSortField, dir: SortDir): DeminingRequest[] {
  return [...list].sort((a, b) => {
    let cmp = 0
    if      (field === "id")         cmp = a.id - b.id
    else if (field === "title")      cmp = a.title.localeCompare(b.title, "uk")
    else if (field === "requester")  cmp = (a.requester?.full_name ?? "").localeCompare(b.requester?.full_name ?? "", "uk")
    else if (field === "status")     cmp = STATUS_ORDER[a.status]    - STATUS_ORDER[b.status]
    else if (field === "priority")   cmp = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
    else if (field === "assignee")   cmp = (a.assignee?.full_name ?? "").localeCompare(b.assignee?.full_name ?? "", "uk")
    else if (field === "created_at") cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    return dir === "asc" ? cmp : -cmp
  })
}

function sortUsers(list: User[], field: UsrSortField, dir: SortDir, reqCounts: Record<number, number>): User[] {
  return [...list].sort((a, b) => {
    let cmp = 0
    if      (field === "id")            cmp = a.id - b.id
    else if (field === "full_name")     cmp = a.full_name.localeCompare(b.full_name, "uk")
    else if (field === "email")         cmp = a.email.localeCompare(b.email)
    else if (field === "role")          cmp = ROLE_ORDER[a.role]  - ROLE_ORDER[b.role]
    else if (field === "is_active")     cmp = Number(a.is_active) - Number(b.is_active)
    else if (field === "request_count") cmp = (reqCounts[a.id] ?? 0) - (reqCounts[b.id] ?? 0)
    return dir === "asc" ? cmp : -cmp
  })
}

function SortTh<F extends string>({ label, field, sort, onSort, className = "" }: {
  label: string; field: F; sort: { field: F; dir: SortDir }; onSort: (f: F) => void; className?: string
}) {
  const active = sort.field === field
  return (
    <th className={`px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest whitespace-nowrap cursor-pointer select-none hover:text-amber-400 transition-colors ${className}`}
      style={{ color: active ? "#fbbf24" : "#475569" }}
      onClick={() => onSort(field)}>
      {label} <span className="ml-0.5 opacity-70">{active ? (sort.dir === "asc" ? "↑" : "↓") : "↕"}</span>
    </th>
  )
}

// ── EditUserModal ─────────────────────────────────────────────
function EditUserModal({ user, onClose, onUpdated }: { user: User; onClose: () => void; onUpdated: (u: User) => void }) {
  const toast = useToast()
  const [role, setRole]         = useState<UserRole>(user.role)
  const [isActive, setIsActive] = useState(user.is_active)
  const [saving, setSaving]     = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try { const u = await updateUser(user.id, { role, is_active: isActive }); toast.success("Оновлено"); onUpdated(u) }
    catch { toast.error("Помилка збереження") }
    finally { setSaving(false) }
  }

  const s  = "w-full rounded-xl border border-white/8 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/50 transition"
  const sb = { background: "rgba(255,255,255,0.04)" }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl border border-white/8 shadow-2xl" style={{ background: "#0c1220" }} onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-white/6">
          <p className="text-[10px] text-slate-600 uppercase tracking-widest">Редагування</p>
          <h2 className="text-base font-bold text-white mt-0.5">{user.full_name}</h2>
          <p className="text-xs text-slate-600">{user.email}</p>
        </div>
        <div className="p-6 flex flex-col gap-4">
          <div>
            <label className="text-[10px] text-slate-600 uppercase tracking-widest block mb-2">Роль</label>
            <select className={s} style={sb} value={role} onChange={e => setRole(e.target.value as UserRole)}>
              {ROLES.map(r => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
            </select>
          </div>
          <div className="flex items-center justify-between rounded-xl px-4 py-3 border border-white/6" style={{ background: "rgba(255,255,255,0.03)" }}>
            <span className="text-sm text-slate-300">Активний акаунт</span>
            <button onClick={() => setIsActive(v => !v)}
              className="relative w-11 h-6 rounded-full transition-colors"
              style={{ background: isActive ? "#fbbf24" : "#334155" }}>
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${isActive ? "translate-x-5" : ""}`} />
            </button>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 py-2.5 text-sm font-semibold text-slate-400 rounded-xl border border-white/8 hover:bg-white/5 transition">Скасувати</button>
            <button onClick={handleSave} disabled={saving}
              className="flex-1 py-2.5 text-sm font-bold text-slate-900 rounded-xl disabled:opacity-50 transition"
              style={{ background: saving ? "#92400e" : "#fbbf24" }}>
              {saving ? "Збереження…" : "Зберегти"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

type Tab = "requests" | "stats" | "users"

export default function AdminPage() {
  const [requests,       setRequests]       = useState<DeminingRequest[]>([])
  const [users,          setUsers]          = useState<User[]>([])
  const [loading,        setLoading]        = useState(true)
  const [search,         setSearch]         = useState("")
  const [filterStatus,   setFilterStatus]   = useState("all")
  const [filterPriority, setFilterPriority] = useState("all")
  const [editReq,        setEditReq]        = useState<DeminingRequest | null>(null)
  const [editUser,       setEditUser]       = useState<User | null>(null)
  const [tab,            setTab]            = useState<Tab>("requests")

  const [reqSort, setReqSort] = useState<{ field: ReqSortField; dir: SortDir }>({ field: "created_at", dir: "desc" })
  const [usrSort, setUsrSort] = useState<{ field: UsrSortField; dir: SortDir }>({ field: "id", dir: "asc" })

  const handleReqSort = (field: ReqSortField) =>
    setReqSort(prev => ({ field, dir: prev.field === field && prev.dir === "asc" ? "desc" : "asc" }))
  const handleUsrSort = (field: UsrSortField) =>
    setUsrSort(prev => ({ field, dir: prev.field === field && prev.dir === "asc" ? "desc" : "asc" }))

  const load = useCallback(async () => {
    setLoading(true)
    try { const [reqs, usrs] = await Promise.all([getRequests(), getUsers()]); setRequests(reqs); setUsers(usrs) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const reqCounts = useMemo(() => {
    const map: Record<number, number> = {}
    requests.forEach(r => { map[r.requester_id] = (map[r.requester_id] ?? 0) + 1 })
    return map
  }, [requests])

  const filtered = useMemo(() => {
    const base = requests.filter(r => {
      const q = search.toLowerCase()
      return (
        (filterStatus   === "all" || r.status   === filterStatus) &&
        (filterPriority === "all" || r.priority === filterPriority) &&
        (r.title.toLowerCase().includes(q) || r.location_name?.toLowerCase().includes(q) || r.requester?.full_name?.toLowerCase().includes(q))
      )
    })
    return sortRequests(base, reqSort.field, reqSort.dir)
  }, [requests, search, filterStatus, filterPriority, reqSort])

  const sortedUsers = useMemo(() =>
    sortUsers(users, usrSort.field, usrSort.dir, reqCounts),
    [users, usrSort, reqCounts]
  )

  const statusChart   = useMemo(() => Object.entries(REQUEST_STATUS).map(([k, v]) => ({ name: v.label, value: requests.filter(r => r.status === k).length, color: v.color })), [requests])
  const priorityChart = useMemo(() => Object.entries(PRIORITY_LABEL).map(([k, v]) => ({ name: v, value: requests.filter(r => r.priority === k).length, color: PRIORITY_COLOR[k as keyof typeof PRIORITY_COLOR] })), [requests])

  const sel   = "border border-white/8 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500/40 transition"
  const selbg = { background: "rgba(255,255,255,0.04)" }
  const TABS: [Tab, string][] = [["requests", "📋  Заявки"], ["stats", "📊  Статистика"], ["users", "👥  Користувачі"]]

  return (
    <div className="flex flex-col gap-5 h-full">
      <div>
        <p className="text-[10px] text-slate-600 uppercase tracking-widest">Управління</p>
        <h1 className="text-xl font-extrabold text-white mt-0.5">Адмін-панель</h1>
      </div>

      <div className="flex gap-1 w-fit p-1 rounded-xl border border-white/6 shrink-0" style={{ background: "rgba(255,255,255,0.03)" }}>
        {TABS.map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-bold rounded-lg transition ${tab === key ? "text-slate-900" : "text-slate-500 hover:text-white"}`}
            style={tab === key ? { background: "#fbbf24" } : {}}>
            {label}
          </button>
        ))}
      </div>

      {/* ── REQUESTS TAB ── */}
      {tab === "requests" && (
        <>
          <div className="flex gap-2 shrink-0 flex-wrap">
            <input className={`${sel} flex-1 min-w-40`} style={selbg} placeholder="🔍 Пошук…" value={search} onChange={e => setSearch(e.target.value)} />
            <select className={sel} style={selbg} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="all">Всі статуси</option>
              {Object.entries(REQUEST_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <select className={sel} style={selbg} value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
              <option value="all">Всі пріоритети</option>
              {Object.entries(PRIORITY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="flex-1 min-h-0 overflow-auto rounded-2xl border border-white/6" style={{ background: "#0c1220" }}>
            {loading ? <Spinner /> : (
              <table className="w-full text-sm">
                <thead className="sticky top-0 border-b border-white/6" style={{ background: "#0c1220" }}>
                  <tr>
                    <SortTh label="#"         field="id"         sort={reqSort} onSort={handleReqSort} />
                    <SortTh label="Назва"     field="title"      sort={reqSort} onSort={handleReqSort} />
                    <SortTh label="Заявник"   field="requester"  sort={reqSort} onSort={handleReqSort} />
                    <SortTh label="Статус"    field="status"     sort={reqSort} onSort={handleReqSort} />
                    <SortTh label="Пріоритет" field="priority"   sort={reqSort} onSort={handleReqSort} />
                    <SortTh label="Оператор"  field="assignee"   sort={reqSort} onSort={handleReqSort} />
                    <SortTh label="Дата"      field="created_at" sort={reqSort} onSort={handleReqSort} />
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r => (
                    <tr key={r.id} className="border-b border-white/4 hover:bg-white/3 transition-colors">
                      <td className="px-4 py-3 text-slate-600 text-xs font-mono">#{r.id}</td>
                      <td className="px-4 py-3 text-white font-semibold max-w-xs truncate">{r.title}</td>
                      <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">{r.requester?.full_name ?? `ID ${r.requester_id}`}</td>
                      <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                      <td className="px-4 py-3"><PriorityBadge priority={r.priority} /></td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{r.assignee?.full_name ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap font-mono">{fmt(r.created_at)}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => setEditReq(r)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold text-amber-400 hover:text-amber-300 hover:bg-amber-950/40 transition">
                          ✏️ Редагувати
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* ── STATS TAB ── */}
      {tab === "stats" && (
        <div className="flex-1 min-h-0 grid grid-cols-2 gap-4 overflow-auto content-start">
          {[{ title: "За статусами", data: statusChart }, { title: "За пріоритетами", data: priorityChart }].map(({ title, data }) => (
            <div key={title} className="rounded-2xl border border-white/6 p-5" style={{ background: "#0c1220" }}>
              <p className="text-xs font-bold text-white mb-4">{title}</p>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={data} margin={{ left: -20 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#64748b" }} />
                  <YAxis tick={{ fontSize: 10, fill: "#64748b" }} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "#111827", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, fontSize: 11 }} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>{data.map((s, i) => <Cell key={i} fill={s.color} />)}</Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ))}
          <div className="col-span-2 grid grid-cols-4 gap-3">
            {[
              { label: "Всього заявок", value: requests.length,                                                         color: "#60a5fa" },
              { label: "Відкритих",     value: requests.filter(r => !["completed","rejected"].includes(r.status)).length, color: "#fb923c" },
              { label: "Завершено",     value: requests.filter(r => r.status === "completed").length,                   color: "#4ade80" },
              { label: "Критичних",     value: requests.filter(r => r.priority === "critical").length,                  color: "#f87171" },
            ].map(k => (
              <div key={k.label} className="rounded-2xl border border-white/6 px-4 py-4" style={{ background: "#0c1220" }}>
                <p className="text-3xl font-extrabold" style={{ color: k.color }}>{k.value}</p>
                <p className="text-xs text-slate-600 mt-1">{k.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── USERS TAB ── */}
      {tab === "users" && (
        <div className="flex-1 min-h-0 overflow-auto rounded-2xl border border-white/6" style={{ background: "#0c1220" }}>
          {loading ? <Spinner /> : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 border-b border-white/6" style={{ background: "#0c1220" }}>
                <tr>
                  <SortTh label="#"       field="id"            sort={usrSort} onSort={handleUsrSort} />
                  <SortTh label="Ім'я"    field="full_name"     sort={usrSort} onSort={handleUsrSort} />
                  <SortTh label="Email"   field="email"         sort={usrSort} onSort={handleUsrSort} />
                  <SortTh label="Роль"    field="role"          sort={usrSort} onSort={handleUsrSort} />
                  <SortTh label="Статус"  field="is_active"     sort={usrSort} onSort={handleUsrSort} />
                  <SortTh label="Заявок"  field="request_count" sort={usrSort} onSort={handleUsrSort} />
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {sortedUsers.map(u => (
                  <tr key={u.id} className="border-b border-white/4 hover:bg-white/3 transition-colors">
                    <td className="px-4 py-3 text-slate-600 text-xs font-mono">#{u.id}</td>
                    <td className="px-4 py-3 text-white font-semibold">{u.full_name}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide"
                        style={{ background: "rgba(251,191,36,0.1)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.2)" }}>
                        {ROLE_LABEL[u.role] ?? u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold ${u.is_active ? "text-emerald-400" : "text-red-400"}`}>
                        {u.is_active ? "● Активний" : "○ Деактивовано"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{reqCounts[u.id] ?? 0}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => setEditUser(u)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-amber-400 hover:text-amber-300 hover:bg-amber-950/40 transition">
                        ✏️ Редагувати
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {editReq  && <AdminRequestModal request={editReq} onClose={() => setEditReq(null)} onUpdated={u => { setRequests(p => p.map(r => r.id === u.id ? u : r)); setEditReq(null) }} />}
      {editUser && <EditUserModal user={editUser} onClose={() => setEditUser(null)} onUpdated={u => { setUsers(p => p.map(x => x.id === u.id ? u : x)); setEditUser(null) }} />}
    </div>
  )
}
