/** Повідомлення з відповіді FastAPI (detail: string | ValidationError[]). */
export function apiErrorMessage(err: unknown, fallback: string): string {
  const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail
  if (typeof detail === "string") return detail
  if (Array.isArray(detail)) {
    const parts = detail
      .map((item: { msg?: string }) => item?.msg)
      .filter((m): m is string => Boolean(m))
    if (parts.length) return parts.join(". ")
  }
  return fallback
}
