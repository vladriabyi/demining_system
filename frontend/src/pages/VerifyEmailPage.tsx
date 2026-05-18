import { useEffect, useState } from "react"
import { useSearchParams, useNavigate } from "react-router-dom"
import { verifyEmail } from "../api/auth"
import { useAuth } from "../context/AuthContext"

export default function VerifyEmailPage() {
  const [searchParams]  = useSearchParams()
  const { setTokenUser } = useAuth() as any
  const navigate         = useNavigate()

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [msg,    setMsg]    = useState("")

  useEffect(() => {
    const token = searchParams.get("token") ?? ""
    if (!token) { setStatus("error"); setMsg("Токен відсутній у посиланні"); return }

    verifyEmail(token)
      .then(data => {
        // Зберігаємо токен і автологін
        localStorage.setItem("access_token", data.access_token)
        if (setTokenUser) setTokenUser(data.access_token, data.user)
        setStatus("success")
        setTimeout(() => navigate("/", { replace: true }), 2500)
      })
      .catch(err => {
        const detail = err?.response?.data?.detail
        setStatus("error")
        setMsg(detail ?? "Невірний або застарілий токен")
      })
  }, [])

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
            <a href="/login" className="text-sm text-amber-400 hover:underline">← Повернутись до входу</a>
          </>
        )}
      </div>
    </div>
  )
}
