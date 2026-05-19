import { useState } from "react"
import { flushSync } from "react-dom"
import { Link, useNavigate } from "react-router-dom"
import { login, resendVerification } from "../api/auth"
import { useAuth } from "../context/AuthContext"
import { apiErrorMessage } from "../utils/apiError"

export default function LoginPage() {
  const { login: authLogin } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail]       = useState("")
  const [password, setPassword] = useState("")
  const [error, setError]       = useState("")
  const [loading, setLoading]   = useState(false)
  const [info, setInfo]         = useState("")
  const [needsVerify, setNeedsVerify] = useState(false)
  const [resending, setResending]     = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setInfo("")
    setNeedsVerify(false)
    setLoading(true)
    try {
      const res = await login({ email, password })
      flushSync(() => authLogin(res.access_token, res.user))
      navigate("/", { replace: true })
    } catch (err: unknown) {
      const response = (err as { response?: { status?: number; data?: { detail?: string } } })?.response
      const detail   = response?.data?.detail
      if (response?.status === 403 && typeof detail === "string" && detail.toLowerCase().includes("пошт")) {
        setNeedsVerify(true)
      }
      setError(apiErrorMessage(err, typeof detail === "string" ? detail : "Помилка авторизації"))
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (!email.trim()) { setError("Введіть email"); return }
    setResending(true)
    setError("")
    try {
      await resendVerification(email.trim())
      setInfo("Лист підтвердження надіслано. Перевірте поштову скриньку (включно зі спамом).")
      setNeedsVerify(false)
    } catch {
      setError("Не вдалось надіслати лист")
    } finally {
      setResending(false)
    }
  }

  const inp = "w-full rounded-xl border border-white/8 px-4 py-3 text-sm text-white placeholder-slate-600 outline-none focus:border-amber-500/50 transition"
  const ibg = { background: "rgba(255,255,255,0.04)" }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "#080d18" }}>
      {/* Background grid pattern */}
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: "linear-gradient(rgba(251,191,36,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(251,191,36,0.4) 1px, transparent 1px)",
        backgroundSize: "60px 60px",
      }} />

      <div className="w-full max-w-sm relative">
        <div className="text-center mb-8">
          <div className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center text-2xl mb-4"
            style={{ background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.2)" }}>
            💣
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">DEMINING</h1>
          <p className="text-slate-500 text-xs mt-1 tracking-widest uppercase">Система гуманітарного розмінування</p>
        </div>

        <div className="rounded-2xl p-6 shadow-2xl border border-white/6" style={{ background: "#0c1220" }}>
          <h2 className="text-lg font-bold text-white mb-5 text-center">Вхід</h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input type="email" placeholder="Email" value={email}
              onChange={e => setEmail(e.target.value)} required
              className={inp} style={ibg} />
            <input type="password" placeholder="Пароль" value={password}
              onChange={e => setPassword(e.target.value)} required
              className={inp} style={ibg} />

            <div className="text-right -mt-1">
              <Link to="/forgot-password" className="text-xs text-amber-400/80 hover:text-amber-400 hover:underline">
                Забули пароль?
              </Link>
            </div>

            {info && (
              <div className="rounded-xl px-3 py-2.5 text-sm text-emerald-300 border border-emerald-500/20"
                style={{ background: "rgba(74,222,128,0.08)" }}>
                {info}
              </div>
            )}

            {error && (
              <div className="rounded-xl px-3 py-2.5 text-sm text-red-300 border border-red-500/20"
                style={{ background: "rgba(239,68,68,0.08)" }}>
                {error}
              </div>
            )}

            {needsVerify && (
              <button type="button" onClick={handleResend} disabled={resending}
                className="w-full py-2.5 rounded-xl text-xs font-semibold text-amber-300 border border-amber-500/30 hover:bg-amber-500/10 transition disabled:opacity-50">
                {resending ? "Надсилання…" : "📬 Надіслати лист підтвердження ще раз"}
              </button>
            )}

            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-bold text-slate-900 transition mt-1 disabled:opacity-60"
              style={{ background: loading ? "#92400e" : "#fbbf24" }}>
              {loading ? "Завантаження…" : "Увійти в систему"}
            </button>
          </form>

          <p className="text-xs text-slate-500 text-center mt-5">
            Немає акаунта?{" "}
            <Link to="/register" className="text-amber-400 hover:underline font-semibold">Зареєструватись</Link>
          </p>
        </div>
      </div>
    </div>
  )
}