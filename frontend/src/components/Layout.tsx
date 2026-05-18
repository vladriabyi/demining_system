import { memo } from "react"
import { Outlet, NavLink, useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { ROLE_LABEL } from "./constants"

const BASE_NAV = [
  { to: "/",         label: "Карта",   icon: "▦", roles: null },
  { to: "/requests", label: "Заявки",  icon: "≡", roles: null },
  { to: "/brigades", label: "Бригади", icon: "🪖", roles: ["operator", "coordinator", "admin"] },
]

export default memo(function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const isStaff  = user?.role === "admin" || user?.role === "coordinator"
  const nav = BASE_NAV.filter(n => !n.roles || n.roles.includes(user?.role ?? ""))

  const cls = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
      isActive
        ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
        : "text-slate-500 hover:text-slate-200 hover:bg-white/5 border border-transparent"
    }`

  return (
    <div className="flex h-screen" style={{ background: "#080d18" }}>
      {/* Sidebar */}
      <aside className="w-56 shrink-0 flex flex-col border-r border-white/5" style={{ background: "#0c1220" }}>
        {/* Logo */}
        <div className="px-5 py-5 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base"
              style={{ background: "rgba(251,191,36,.12)", border: "1px solid rgba(251,191,36,.2)" }}>
              💣
            </div>
            <div>
              <p className="text-sm font-bold text-white leading-tight tracking-tight">DEMINING</p>
              <p className="text-[10px] text-slate-600 uppercase tracking-widest">System v1.0</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 flex flex-col gap-0.5">
          {nav.map(n => (
            <NavLink key={n.to} to={n.to} end={n.to === "/"} className={cls}>
              <span className="text-base w-5 text-center opacity-70">{n.icon}</span>
              {n.label}
            </NavLink>
          ))}
          {isStaff && (
            <NavLink to="/admin" className={cls}>
              <span className="text-base w-5 text-center opacity-70">⚙</span>
              Адмін-панель
            </NavLink>
          )}
        </nav>

        {/* User block */}
        <div className="p-3 border-t border-white/5">
          <div className="px-3 py-2.5 rounded-xl bg-white/3 mb-2">
            <p className="text-sm font-semibold text-white truncate">{user?.full_name}</p>
            <p className="text-[11px] text-slate-500 truncate mt-0.5">{user?.email}</p>
            <span className="inline-block mt-1.5 px-2 py-0.5 text-[10px] rounded-md font-semibold uppercase tracking-widest"
              style={{ background: "rgba(251,191,36,.1)", color: "#fbbf24", border: "1px solid rgba(251,191,36,.2)" }}>
              {ROLE_LABEL[user?.role ?? ""] ?? user?.role}
            </span>
          </div>
          <button
            onClick={() => { logout(); navigate("/login", { replace: true }) }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-500 hover:text-red-400 hover:bg-red-950/20 transition"
          >
            <span className="text-base">⏏</span>
            Вийти
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto p-6 flex flex-col">
        <Outlet />
      </main>
    </div>
  )
})
