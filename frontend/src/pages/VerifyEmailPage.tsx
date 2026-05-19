import { useEffect, useRef, useState } from "react"
import { useSearchParams, useNavigate, Link } from "react-router-dom"
import { verifyEmail, resendVerification } from "../api/auth"
import { useAuth } from "../context/AuthContext"

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const { login }      = useAuth()
  const navigate       = useNavigate()

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [msg,    setMsg]    = useState("")

  // Resend state
  const [email,     setEmail]     = useState("")
  const [resending, setResending] = useState(false)
  const [resent,    setResent]    = useState(false)

  // Захист від подвійного виклику в React.StrictMode (dev-режим).
  // Токен верифікації одноразовий — повторний запит поверне 400.
  const hasRunRef = useRef(false)

  useEffect(() => {
    if (hasRunRef.current) return
    hasRunRef.current = true

    const token = searchParams.get("token") ?? ""
    if (!token) { setStatus("error"); setMsg("Токен відсутній у посиланні"); return }

    verifyEmail(token)
      .then(data => {
        login(data.access_token, data.user)
        setStatus("success")
        setTimeout(() => navigate("/", { replace: true }), 2500)
      })
      .catch(err => {
        const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        setStatus("error")
        setMsg(detail ?? "Невірний або застарілий токен")
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleResend = async () => {
    if (!email.trim()) return
    setResending(true)
    try {
      await resendVerification(email.trim())
      setResent(true)
    } catch {
      setMsg("Не вдалось надіслати лист")
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "#080d18" }}>
      <div className="w-full max-w-md text-center rounded-2xl border border-white/8 p-10" style={{ background: "#0c1220" }}>
        {status === "loading" && (
          <>
            <div className="w-16 h-16 rounded-full border-4 border-amber-400/30 border-t-amber-400 animate-spin mx-auto mb-6" />
            <h2 className="text-lg font-bold text-white">Підтвердження пошти…</h2>
            <p className="text-sm text-slate-500 mt-2">Зачекайте, будь ласка</p>
          </>
        )}
        {status === "success" && (
          <>
            <div className="text-5xl mb-4">✅</div>
            <h2 className="text-xl font-extrabold text-white mb-2">Пошту підтверджено!</h2>
            <p className="text-sm text-slate-400">Вхід виконано. Перенаправлення на головну…</p>
          </>
        )}
        {status === "error" && (
          <>
            <div className="text-5xl mb-4">❌</div>
            <h2 className="text-xl font-extrabold text-white mb-2">Помилка підтвердження</h2>
            <p className="text-sm text-slate-400 mb-6">{msg}</p>

            {resent ? (
              <div className="rounded-xl px-3 py-2.5 text-sm text-emerald-300 border border-emerald-500/20 mb-4"
                style={{ background: "rgba(74,222,128,0.08)" }}>
                Лист надіслано. Перевірте поштову скриньку.
              </div>
            ) : (
              <div className="text-left space-y-3 mb-4">
                <p className="text-xs text-slate-500">
                  Посилання могло застаріти. Введіть email — надішлемо новий лист підтвердження:
                </p>
                <input type="email" placeholder="your@email.com" value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-white/8 px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-amber-500/50 transition"
                  style={{ background: "rgba(255,255,255,0.04)" }} />
                <button onClick={handleResend} disabled={resending || !email.trim()}
                  className="w-full py-2.5 rounded-xl text-xs font-semibold text-amber-300 border border-amber-500/30 hover:bg-amber-500/10 transition disabled:opacity-50">
                  {resending ? "Надсилання…" : "📬 Надіслати новий лист"}
                </button>
              </div>
            )}

            <Link to="/login" className="text-sm text-amber-400 hover:underline">← Повернутись до входу</Link>
          </>
        )}
      </div>
    </div>
  )
}
