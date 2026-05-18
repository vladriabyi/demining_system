import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { AuthProvider, useAuth } from "./context/AuthContext"
import { ToastProvider } from "./context/ToastContext"
import Layout from "./components/Layout"
import LoginPage from "./pages/LoginPage"
import RegisterPage from "./pages/RegisterPage"
import VerifyEmailPage from "./pages/VerifyEmailPage"
import DashboardPage from "./pages/DashboardPage"
import RequestsPage from "./pages/RequestsPage"
import BrigadesPage from "./pages/BrigadesPage"
import AdminPage from "./pages/AdminPage"
import type { ReactNode } from "react"

function Protected({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

function StaffOnly({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  return user?.role === "admin" || user?.role === "coordinator"
    ? <>{children}</>
    : <Navigate to="/" replace />
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login"    element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/verify"   element={<VerifyEmailPage />} />
            <Route path="/" element={<Protected><Layout /></Protected>}>
              <Route index            element={<DashboardPage />} />
              <Route path="requests"  element={<RequestsPage />} />
              <Route path="brigades"  element={<BrigadesPage />} />
              <Route path="admin"     element={<StaffOnly><AdminPage /></StaffOnly>} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  )
}
