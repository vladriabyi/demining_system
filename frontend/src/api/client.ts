import axios from "axios"

const client = axios.create({ baseURL: "/api" })

client.interceptors.request.use(cfg => {
  const token = localStorage.getItem("access_token")
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

const AUTH_PUBLIC_PATHS = [
  "/auth/login",
  "/auth/register",
  "/auth/verify-email",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/resend-verification",
]

client.interceptors.response.use(
  res => res,
  err => {
    const status = err.response?.status
    const url: string = err.config?.url ?? ""
    const isPublicAuth = AUTH_PUBLIC_PATHS.some(p => url.includes(p))

    // 401 на /auth/login — невірний пароль; не перезавантажувати сторінку.
    // Редірект лише коли прострочений/невалідний токен на захищених API.
    if (status === 401 && !isPublicAuth) {
      localStorage.removeItem("access_token")
      localStorage.removeItem("user")
      window.location.replace("/login")
    }
    return Promise.reject(err)
  }
)

export default client
