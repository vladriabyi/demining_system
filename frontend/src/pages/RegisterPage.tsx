import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { register } from "../api/auth"
import { useToast } from "../context/ToastContext"

const inp = "w-full rounded-xl border border-white/8 px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/50 transition"
const ibg = { background: "rgba(255,255,255,0.04)" }

export default function RegisterPage() {
  const toast    = useToast()
  const navigate = useNavigate()

  const [fullName,  setFullName]  = useState("")
  const [email,     setEmail]     = useState("")
  const [password,  setPassword]  = useState("")
  const [password2, setPassword2] = useState("")
  const [loading,   setLoading]   = useState(false)
  const [done,      setDone]      = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fullName.trim() || !email.trim() || !password) { toast.error("Заповніть всі поля"); return }
    if (password !== password2) { toast.error("Паролі не збігаються"); return }
    if (password.length < 8)    { toast.error("Пароль має бути не менше 8 символів"); return }

    setLoading(true)
    try {
      await register({ full_name: fullName.trim(), email: email.trim(), password })
      setDone(true)
    } catch (err: any) {
      const detail = err?.response?.data?.detail
      toast.error(detail ?? "Помилка реєстрації")
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "#080d18" }}>
        <div className="w-full max-w-md text-center">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl mx-auto mb-6"
            style={{ background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.2)" }}>
            📬
          </div>
          <h1 className="text-2xl font-extrabold text-white mb-3">Перевірте вашу пошту!</h1>
          <p className="text-sm text-slate-400 leading-relaxed mb-6">
            Ми надіслали лист підтвердження на <span className="text-amber-400 font-semibold">{email}</span>.
            Натисніть посилання у листі для активації акаунта.
          </p>
          <p className="text-xs text-slate-600">
            Не знайшли? Перевірте папку «Спам».
          </p>
          <Link to="/login" className="inline-block mt-6 text-sm text-amber-400 hover:underline">
            ← Повернутись до входу
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "#080d18" }}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
            style={{ background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.2)" }}>
            💣
          </div>
          <div>
            <p className="text-sm font-bold text-white tracking-tight">DEMINING</p>
            <p className="text-[10px] text-slate-600 uppercase tracking-widest">System v1.0</p>
          </div>
        </div>

        <div className="rounded-2xl border border-white/8 p-8" style={{ background: "#0c1220" }}>
          <h1 className="text-xl font-extrabold text-white mb-1">Створити акаунт</h1>
          <p className="text-xs text-slate-500 mb-6">Зареєструйтесь для подачі заявки на розмінування</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="text-[10px] text-slate-600 uppercase tracking-widest block mb-2">Повне ім'я</label>
              <input className={inp} style={ibg} placeholder="Іванченко Іван Іванович"
                value={fullName} onChange={e => setFullName(e.target.value)} />
            </div>
            <div>
              <label className="text-[10px] text-slate-600 uppercase tracking-widest block mb-2">Email</label>
              <input className={inp} style={ibg} type="email" placeholder="example@gmail.com"
                value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="text-[10px] text-slate-600 uppercase tracking-widest block mb-2">Пароль</label>
              <input className={inp} style={ibg} type="password" placeholder="Мінімум 8 символів"
                value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            <div>
              <label className="text-[10px] text-slate-600 uppercase tracking-widest block mb-2">Підтвердіть пароль</label>
              <input className={inp} style={ibg} type="password" placeholder="Повторіть пароль"
                value={password2} onChange={e => setPassword2(e.target.value)} />
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3 text-sm font-bold text-slate-900 rounded-xl transition mt-2 disabled:opacity-50"
              style={{ background: loading ? "#92400e" : "#fbbf24" }}>
              {loading ? "Реєстрація…" : "Зареєструватись"}
            </button>
          </form>

          <p className="text-xs text-slate-600 text-center mt-5">
            Вже маєте акаунт?{" "}
            <Link to="/login" className="text-amber-400 hover:underline font-semibold">Увійти</Link>
          </p>
        </div>

        <p className="text-xs text-slate-700 text-center mt-6">
          У разі небезпеки телефонуйте <span className="text-slate-500">101</span> або <span className="text-slate-500">112</span>
        </p>
      </div>
    </div>
  )
}
