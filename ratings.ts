// ---------------------------------------------------------------------------
// Per-device star ratings (1–5) for materials, persisted in localStorage.
// The app is offline / server-less, so ratings live in the browser, keyed by
// material id. Used to triage the AI-generated drafts (which are good?).
// ---------------------------------------------------------------------------

const KEY = 'isa-ratings-v1'

export type RatingMap = Record<string, number>

export function loadRatings(): RatingMap {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return {}
    const obj = JSON.parse(raw)
    return obj && typeof obj === 'object' ? (obj as RatingMap) : {}
  } catch {
    return {}
  }
}

export function saveRatings(map: RatingMap): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(map))
  } catch {
    /* ignore unavailable/quota-exceeded storage */
  }
}
