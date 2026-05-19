import { memo, useState, useEffect } from "react"
import { getReport, getRequest } from "../api/requests"
import { useAuth } from "../context/AuthContext"
import { isCoordinatorOrAdmin, isOperator } from "../utils/roles"
import type { DeminingRequest, CompletionReport } from "../types"
import { StatusBadge, PriorityBadge } from "./StatusBadge"
import CompletionReportModal from "./CompletionReportModal"
import StatusHistoryTimeline from "./StatusHistoryTimeline"

interface Props {
  request: DeminingRequest
  onClose: () => void
  onStatusChanged?: () => void
}

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("uk-UA", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  })

function RequestPhoto({ path }: { path: string | null | undefined }) {
  if (!path) return null
  // Use relative /uploads/ path — proxied by Vite to backend
  return (
    <img
      src={`/uploads/${path}`}
      alt="Фото заявки"
      className="w-full h-44 object-cover rounded-xl border border-white/8"
      onError={e => {
        e.currentTarget.style.display = "none"
        const el = document.createElement("div")
        el.className = "w-full h-20 flex items-center justify-center rounded-xl text-slate-500 text-xs"
        el.style.background = "rgba(255,255,255,0.03)"
        el.style.border = "1px dashed rgba(255,255,255,0.1)"
        el.textContent = "📷 Фото недоступне"
        e.currentTarget.parentNode?.appendChild(el)
      }}
    />
  )
}

export default memo(function RequestDetailModal({ request: initial, onClose, onStatusChanged }: Props) {
  const { user } = useAuth()
  const [req, setReq] = useState(initial)
  const [showReport, setShowReport] = useState(false)
  const [completionReport, setCompletionReport] = useState<CompletionReport | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      getRequest(initial.id),
      getReport(initial.id).catch(() => null),
    ])
      .then(([fresh, report]) => {
        if (cancelled) return
        setReq(fresh)
        if (report) setCompletionReport(report)
      })
    return () => { cancelled = true }
  }, [initial.id])

  const canComplete =
    !completionReport &&
    ["in_progress", "approved"].includes(req.status) &&
    (isCoordinatorOrAdmin(user?.role) ||
      (isOperator(user?.role) && req.assigned_to_id === user?.id))

  const handleReportCompleted = async () => {
    setShowReport(false)
    const [fresh, report] = await Promise.all([
      getRequest(req.id),
      getReport(req.id),
    ])
    setReq(fresh)
    setCompletionReport(report)
    onStatusChanged?.()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md shadow-2xl flex flex-col max-h-[90vh] rounded-2xl border border-white/8"
        style={{ background: "#0c1220" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-white/6 gap-3">
          <div className="min-w-0">
            <p className="text-[11px] text-slate-500 uppercase tracking-widest mb-1">Заявка #{req.id}</p>
            <h2 className="text-base font-bold text-white leading-tight line-clamp-2">{req.title}</h2>
          </div>
          <button onClick={onClose} className="shrink-0 text-slate-500 hover:text-white transition text-xl leading-none mt-0.5">×</button>
        </div>

        <div className="overflow-y-auto p-6 flex flex-col gap-4">
          {/* Status + priority */}
          <div className="flex gap-2 flex-wrap">
            <StatusBadge status={req.status} />
            <PriorityBadge priority={req.priority} />
          </div>

          {/* Photo */}
          <RequestPhoto path={req.photo_path} />

          {/* Description */}
          {req.description && (
            <div>
              <p className="text-[10px] text-slate-600 uppercase tracking-widest mb-1.5">Опис</p>
              <p className="text-sm text-slate-300 leading-relaxed">{req.description}</p>
            </div>
          )}

          {/* Grid info */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Локація",    value: req.location_name },
              { label: "Координати", value: `${req.latitude.toFixed(4)}, ${req.longitude.toFixed(4)}` },
              { label: "Заявник",    value: req.requester?.full_name ?? `ID ${req.requester_id}` },
              { label: "Оператор",   value: req.assignee?.full_name ?? "—" },
              { label: "Створено",   value: fmt(req.created_at) },
              { label: "Оновлено",   value: fmt(req.updated_at) },
            ].map(item => (
              <div key={item.label} className="bg-white/3 rounded-xl px-3 py-2.5">
                <p className="text-[10px] text-slate-600 uppercase tracking-widest mb-1">{item.label}</p>
                <p className="text-sm text-slate-200 font-medium leading-snug">{item.value}</p>
              </div>
            ))}
          </div>

          {req.status_history && req.status_history.length > 0 && (
            <div>
              <p className="text-[10px] text-slate-600 uppercase tracking-widest mb-3">
                Історія статусів
              </p>
              <div className="rounded-xl border border-white/6 px-4 py-3" style={{ background: "rgba(255,255,255,0.02)" }}>
                <StatusHistoryTimeline history={req.status_history} />
              </div>
            </div>
          )}
        </div>

        {/* Completion report display */}
        {completionReport && (
          <div className="mx-6 mb-4 rounded-xl border border-emerald-500/20 p-4" style={{ background: "rgba(74,222,128,0.05)" }}>
            <p className="text-[10px] text-emerald-500 uppercase tracking-widest font-bold mb-3">✅ Завершальний звіт</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                ["Тип боєприпасу", completionReport.explosive_type_found],
                ["Кількість", `${completionReport.quantity} шт.`],
                ["Метод", completionReport.neutralization_method],
                ["Сапер",  completionReport.submitter?.full_name ?? `ID ${completionReport.submitted_by}`],
                ...(completionReport.area_cleared_m2  ? [["Площа", `${completionReport.area_cleared_m2} м²`]] : []),
                ...(completionReport.time_spent_hours ? [["Час роботи", `${completionReport.time_spent_hours} год.`]] : []),
              ].map(([k,v]) => (
                <div key={k} className="bg-white/3 rounded-lg px-2.5 py-2">
                  <p className="text-[9px] text-slate-600 uppercase tracking-widest">{k}</p>
                  <p className="text-xs text-slate-200 font-medium mt-0.5">{v}</p>
                </div>
              ))}
            </div>
            {completionReport.notes && (
              <p className="text-xs text-slate-400 mt-3 leading-relaxed">📝 {completionReport.notes}</p>
            )}
          </div>
        )}

        <div className="px-6 pb-5 shrink-0 flex flex-col gap-2">
          {canComplete && (
            <button onClick={() => setShowReport(true)}
              className="w-full py-2.5 text-sm font-bold rounded-xl transition"
              style={{ background: "rgba(74,222,128,0.12)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.25)" }}>
              ✅ Завершити та подати звіт
            </button>
          )}
          <button onClick={onClose}
            className="w-full py-2.5 text-sm font-semibold text-slate-400 hover:text-white rounded-xl transition border border-white/8 hover:bg-white/5">
            Закрити
          </button>
        </div>
        {showReport && (
          <CompletionReportModal
            request={req}
            onClose={() => setShowReport(false)}
            onCompleted={handleReportCompleted}
          />
        )}
      </div>
    </div>
  )
})
