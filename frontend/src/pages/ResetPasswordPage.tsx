import { useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { resetPassword } from "../api/auth"
import { apiErrorMessage } from "../utils/apiError"
import { useToast } from "../context/ToastContext"

const inp = "w-full rounded-xl border border-white/8 px-4 py-3 text-sm text-white placeholder-slate-600 outline-none focus:border-amber-500/50 transition"
const ibg = { background: "rgba(255,255,255,0.04)" }

export default function ResetPasswordPage() {
  const toast    = useToast()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get("token") ?? ""

  const [password,  setPassword]  = useState("")
  const [password2, setPassword2] = useState("")
  const [loading,   setLoading]   = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) { toast.error("Токен відсутній у посиланні"); return }
    if (password !== password2) { toast.error("Паролі не збігаються"); return }
    if (password.length < 8) { toast.error("Пароль має бути не менше 8 символів"); return }

    setLoading(true)
    try {
      await resetPassword(token, password)
      toast.success("Пароль змінено. Увійдіть з новим паролем.")
      navigate("/login", { replace: true })
    } catch (err: unknown) {
      toast.error(apiErrorMessage(err, "Не вдалось змінити пароль"))
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "#080d18" }}>
        <div className="w-full max-w-md text-center rounded-2xl border border-white/8 p-10" style={{ background: "#0c1220" }}>
          <div className="text-5xl mb-4">❌</div>
          <h1 className="text-xl font-extrabold text-white mb-3">Невірне посилання</h1>
          <p className="text-sm text-slate-400 mb-6">Запросіть новий лист на сторінці скидання пароля.</p>
          <Link to="/forgot-password" className="text-sm text-amber-400 hover:underline">Скинути пароль</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "#080d18" }}>
      <div className="w-full max-w-md rounded-2xl border border-white/8 p-8" style={{ background: "#0c1220" }}>
        <h1 className="text-xl font-extrabold text-white mb-1">Новий пароль</h1>
        <p className="text-xs text-slate-500 mb-6">Введіть новий пароль (мінімум 8 символів)</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input type="password" placeholder="Новий пароль" value={password} required
            onChange={e => setPassword(e.target.value)} className={inp} style={ibg} />
          <input type="password" placeholder="Підтвердіть пароль" value={password2} required
            onChange={e => setPassword2(e.target.value)} className={inp} style={ibg} />
          <button type="submit" disabled={loading}
            className="w-full py-3 text-sm font-bold text-slate-900 rounded-xl disabled:opacity-50"
            style={{ background: loading ? "#92400e" : "#fbbf24" }}>
            {loading ? "Збереження…" : "Зберегти пароль"}
          </button>
        </form>
        <p className="text-xs text-slate-500 text-center mt-5">
          <Link to="/login" className="text-amber-400 hover:underline">← До входу</Link>
        </p>
      </div>
    </div>
  )
}
