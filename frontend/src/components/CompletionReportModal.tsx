import { memo, useState } from "react"
import { submitReport, type ReportCreate } from "../api/requests"
import { useToast } from "../context/ToastContext"
import type { DeminingRequest } from "../types"
import { modalInp, modalBg } from "./ui/modalStyles"

interface Props {
  request: DeminingRequest
  onClose: () => void
  onCompleted: () => void
}

const EXPLOSIVE_TYPES = [
  "Протипіхотна міна", "Протитанкова міна", "Артилерійський снаряд",
  "Авіабомба", "Касетний суббоєприпас", "Граната", "ВНП (саморобний)",
  "Міна-пастка", "Інше",
]

const NEUTRALIZATION_METHODS = [
  "Знешкодження на місці", "Підрив на місці", "Евакуація і знищення",
  "Передача до сховища", "Інше",
]

export default memo(function CompletionReportModal({ request: r, onClose, onCompleted }: Props) {
  const toast = useToast()

  const [explosiveType, setExplosiveType]   = useState(EXPLOSIVE_TYPES[0])
  const [quantity,      setQuantity]        = useState(1)
  const [areaCleared,   setAreaCleared]     = useState("")
  const [timeSpent,     setTimeSpent]       = useState("")
  const [method,        setMethod]          = useState(NEUTRALIZATION_METHODS[0])
  const [notes,         setNotes]           = useState("")
  const [loading,       setLoading]         = useState(false)

  const handleSubmit = async () => {
    if (quantity < 1) { toast.error("Кількість має бути ≥ 1"); return }

    const data: ReportCreate = {
      explosive_type_found:  explosiveType,
      quantity,
      area_cleared_m2:       areaCleared ? parseFloat(areaCleared) : undefined,
      time_spent_hours:      timeSpent   ? parseFloat(timeSpent)   : undefined,
      neutralization_method: method,
      notes:                 notes.trim() || undefined,
    }

    setLoading(true)
    try {
      await submitReport(r.id, data)
      toast.success("✅ Звіт подано! Заявку завершено.")
      onCompleted()
    } catch (err: any) {
      const detail = err?.response?.data?.detail
      toast.error(detail ?? "Помилка подачі звіту")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[70] p-4" onClick={onClose}>
      <div className="w-full max-w-md shadow-2xl rounded-2xl border border-white/8 flex flex-col max-h-[90vh]"
        style={{ background: "#0c1220" }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/6 shrink-0">
          <div>
            <p className="text-[10px] text-slate-600 uppercase tracking-widest">Завершальний звіт</p>
            <h2 className="text-sm font-bold text-white mt-0.5 truncate max-w-xs">#{r.id} {r.title}</h2>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white text-xl">×</button>
        </div>

        {/* Warning */}
        <div className="mx-6 mt-4 px-3 py-2.5 rounded-xl text-xs text-amber-300 flex gap-2"
          style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)" }}>
          ⚠️ Після подачі звіту заявка автоматично закриється та не підлягає редагуванню.
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col gap-4 overflow-y-auto">
          <div>
            <label className="text-[10px] text-slate-600 uppercase tracking-widest block mb-2">Тип знайденого боєприпасу *</label>
            <select className={modalInp} style={modalBg} value={explosiveType} onChange={e => setExplosiveType(e.target.value)}>
              {EXPLOSIVE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-slate-600 uppercase tracking-widest block mb-2">Кількість (шт.) *</label>
              <input className={modalInp} style={modalBg} type="number" min={1} value={quantity}
                onChange={e => setQuantity(parseInt(e.target.value) || 1)} />
            </div>
            <div>
              <label className="text-[10px] text-slate-600 uppercase tracking-widest block mb-2">Час роботи (год.)</label>
              <input className={modalInp} style={modalBg} type="number" min={0} step={0.5} placeholder="напр. 2.5"
                value={timeSpent} onChange={e => setTimeSpent(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="text-[10px] text-slate-600 uppercase tracking-widest block mb-2">Площа розчищена (м²)</label>
            <input className={modalInp} style={modalBg} type="number" min={0} placeholder="необов'язково"
              value={areaCleared} onChange={e => setAreaCleared(e.target.value)} />
          </div>

          <div>
            <label className="text-[10px] text-slate-600 uppercase tracking-widest block mb-2">Метод знешкодження *</label>
            <select className={modalInp} style={modalBg} value={method} onChange={e => setMethod(e.target.value)}>
              {NEUTRALIZATION_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          <div>
            <label className="text-[10px] text-slate-600 uppercase tracking-widest block mb-2">Додаткові нотатки</label>
            <textarea className={`${modalInp} resize-none`} style={modalBg} rows={3}
              placeholder="Опишіть особливості, труднощі, рекомендації…"
              value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-white/6 shrink-0">
          <button onClick={onClose}
            className="flex-1 py-2.5 text-sm font-semibold text-slate-400 hover:text-white rounded-xl border border-white/8 hover:bg-white/5 transition">
            Скасувати
          </button>
          <button onClick={handleSubmit} disabled={loading}
            className="flex-1 py-2.5 text-sm font-bold text-slate-900 rounded-xl transition disabled:opacity-50"
            style={{ background: loading ? "#166534" : "#4ade80", color: "#0a0f1a" }}>
            {loading ? "Відправка…" : "✅ Подати звіт"}
          </button>
        </div>
      </div>
    </div>
  )
})
