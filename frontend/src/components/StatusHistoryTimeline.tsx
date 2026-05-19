import { memo, useMemo } from "react"
import type { RequestStatus, StatusHistoryEntry } from "../types"
import { REQUEST_STATUS } from "./constants"

interface Props {
  history: StatusHistoryEntry[] | null | undefined
}

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })

function statusLabel(status: string) {
  return REQUEST_STATUS[status as RequestStatus]?.label ?? status
}

function statusColor(status: string) {
  return REQUEST_STATUS[status as RequestStatus]?.color ?? "#64748b"
}

export default memo(function StatusHistoryTimeline({ history }: Props) {
  const entries = useMemo(
    () => [...(history ?? [])].sort(
      (a, b) => new Date(a.changed_at).getTime() - new Date(b.changed_at).getTime()
    ),
    [history]
  )

  if (entries.length === 0) {
    return (
      <p className="text-xs text-slate-600 text-center py-2">Історія змін ще відсутня</p>
    )
  }

  return (
    <ol className="relative flex flex-col gap-0 pl-1">
      {entries.map((e, i) => {
        const isLast = i === entries.length - 1
        const isCreate = e.old_status === e.new_status
        const oldColor = statusColor(e.old_status)
        const newColor = statusColor(e.new_status)
        const who = e.changer?.full_name ?? `користувач #${e.changed_by}`

        return (
          <li key={e.id} className="relative flex gap-3 pb-4 last:pb-0">
            {!isLast && (
              <span
                className="absolute left-[7px] top-4 bottom-0 w-px"
                style={{ background: "rgba(255,255,255,0.08)" }}
              />
            )}
            <span
              className="relative z-10 mt-1 w-3.5 h-3.5 rounded-full shrink-0 border-2"
              style={{ borderColor: newColor, background: `${newColor}22` }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-slate-600 font-mono">{fmt(e.changed_at)}</p>
              <p className="text-xs text-slate-300 mt-1 leading-snug">
                <span className="text-slate-500">{who}</span>
                {isCreate ? (
                  <> — заявку створено</>
                ) : (
                  <>
                    {" — "}
                    <span style={{ color: oldColor }}>{statusLabel(e.old_status)}</span>
                    <span className="text-slate-600 mx-1">→</span>
                    <span style={{ color: newColor }}>{statusLabel(e.new_status)}</span>
                  </>
                )}
              </p>
              {e.comment && (
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed italic">
                  {e.comment}
                </p>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
})
