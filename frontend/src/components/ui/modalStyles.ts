import type { CSSProperties } from "react"

/**
 * Спільні стилі для модальних вікон.
 * Використовуються в AdminRequestModal, CompletionReportModal, NewRequestModal.
 */

/** Tailwind-класи для текстових input/select/textarea всередині модалок. */
export const modalInp =
  "w-full rounded-xl border border-white/8 px-3 py-2.5 text-sm text-white " +
  "placeholder-slate-600 focus:outline-none focus:border-amber-500/50 transition"

/** Inline-стиль для напівпрозорого темного фону елементів форми. */
export const modalBg: CSSProperties = {
  background: "rgba(255,255,255,0.04)",
}

/** Колір фону самого модального вікна. */
export const MODAL_BG = "#0c1220"
