import { useEffect, useState } from "react"

/**
 * Повертає «затриману» версію значення:
 * оновлюється лише після того, як вхідне значення
 * не змінювалось протягом `ms` мілісекунд.
 */
export function useDebounce<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState<T>(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(timer)
  }, [value, ms])

  return debounced
}
