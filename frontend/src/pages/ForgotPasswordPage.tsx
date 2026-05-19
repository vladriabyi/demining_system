import { useState } from "react"
import { Link } from "react-router-dom"
import { forgotPassword } from "../api/auth"
import { apiErrorMessage } from "../utils/apiError"
import { useToast } from "../context/ToastContext"

const inp = "w-full rounded-xl border border-white/8 px-4 py-3 text-sm text-white placeholder-slate-600 outline-none focus:border-amber-500/50 transition"
const ibg = { background: "rgba(255,255,255,0.04)" }

export default function ForgotPasswordPage() {
  const toast = useToast()
  const [email, setEmail]     = useState("")
  const [loading, setLoading] = useState(false)
  const [done, setDone]       = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) { toast.error("Введіть email"); return }
    setLoading(true)
    try {
      await forgotPassword(email.trim())
      setDone(true)
    } catch (err: unknown) {
      toast.error(apiErrorMessage(err, "Не вдалось надіслати лист"))
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "#080d18" }}>
        <div className="w-full max-w-md text-center rounded-2xl border border-white/8 p-10" style={{ background: "#0c1220" }}>
          <div className="text-5xl mb-4">📬</div>
          <h1 className="text-xl font-extrabold text-white mb-3">Перевірте пошту</h1>
          <p className="text-sm text-slate-400 leading-relaxed mb-6">
            Запит оброблено. Перевірте скриньку{" "}
            <span className="text-amber-400 font-semibold">{email}</span>
            {" "}— лист із посиланням для скидання пароля надійде протягом кількох хвилин.
            Посилання дійсне <span className="text-slate-300">30 хвилин</span>.
          </p>
          <p className="text-xs text-slate-600 mb-4">
            Не бачите листа? Перевірте папку «Спам» або переконайтесь, що вказали email, під яким реєструвались.
          </p>
          <Link to="/login" className="text-sm text-amber-400 hover:underline">← Повернутись до входу</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "#080d18" }}>
      <div className="w-full max-w-md rounded-2xl border border-white/8 p-8" style={{ background: "#0c1220" }}>
        <h1 className="text-xl font-extrabold text-white mb-1">Забули пароль?</h1>
        <p className="text-xs text-slate-500 mb-6">Введіть email — надішлемо посилання для встановлення нового пароля</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input type="email" placeholder="Email" value={email} required
            onChange={e => setEmail(e.target.value)} className={inp} style={ibg} />
          <button type="submit" disabled={loading}
            className="w-full py-3 text-sm font-bold text-slate-900 rounded-xl disabled:opacity-50"
            style={{ background: loading ? "#92400e" : "#fbbf24" }}>
            {loading ? "Надсилання…" : "Надіслати посилання"}
          </button>
        </form>
        <p className="text-xs text-slate-500 text-center mt-5">
          <Link to="/login" className="text-amber-400 hover:underline">← Назад до входу</Link>
        </p>
      </div>
    </div>
  )
}
