import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { login, register } from "../api/auth"
import { useAuth } from "../context/AuthContext"

export default function LoginPage() {
  const { login: authLogin } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode]       = useState<"login" | "register">("login")
  const [fullName, setFullName] = useState("")
  const [email, setEmail]     = useState("")
  const [password, setPassword] = useState("")
  const [error, setError]     = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const res = mode === "login"
        ? await login({ email, password })
        : await register({ email, password, full_name: fullName })
      authLogin(res.access_token, res.user)  // ← uses context, no reload needed
      navigate("/", { replace: true })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(msg ?? "Помилка авторизації")
    } finally {
      setLoading(false)
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
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center text-2xl mb-4"
            style={{ background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.2)" }}>
            💣
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">DEMINING</h1>
          <p className="text-slate-500 text-xs mt-1 tracking-widest uppercase">Система гуманітарного розмінування</p>
        </div>

        <div className="rounded-2xl p-6 shadow-2xl border border-white/6" style={{ background: "#0c1220" }}>
          {/* Tab switcher */}
          <div className="grid grid-cols-2 gap-1 p-1 rounded-xl mb-5 border border-white/6" style={{ background: "rgba(255,255,255,0.03)" }}>
            {(["login", "register"] as const).map(m => (
              <button key={m} type="button" onClick={() => { setMode(m); setError("") }}
                className={`py-2 text-sm font-semibold rounded-lg transition ${
                  mode === m ? "text-slate-900" : "text-slate-500 hover:text-white"
                }`}
                style={mode === m ? { background: "#fbbf24" } : {}}>
                {m === "login" ? "Увійти" : "Реєстрація"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            {mode === "register" && (
              <input type="text" placeholder="Повне ім'я" value={fullName}
                onChange={e => setFullName(e.target.value)} required
                className={inp} style={ibg} />
            )}
            <input type="email" placeholder="Email" value={email}
              onChange={e => setEmail(e.target.value)} required
              className={inp} style={ibg} />
            <input type="password" placeholder="Пароль" value={password}
              onChange={e => setPassword(e.target.value)} required
              className={inp} style={ibg} />

            {error && (
              <div className="rounded-xl px-3 py-2.5 text-sm text-red-300 border border-red-500/20"
                style={{ background: "rgba(239,68,68,0.08)" }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-bold text-slate-900 transition mt-1 disabled:opacity-60"
              style={{ background: loading ? "#92400e" : "#fbbf24" }}>
              {loading ? "Завантаження…" : mode === "login" ? "Увійти в систему" : "Зареєструватись"}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
