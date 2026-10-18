// 小工具：转义、日期、百分比

const ESCAPES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ESCAPES[ch])
}

export function pct(part, total) {
  if (!total) return 0
  return Math.round((part / total) * 100)
}

export function formatDate(ts) {
  const d = new Date(ts)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export function daysUntil(ts, now = Date.now()) {
  const diff = ts - now
  if (diff <= 0) return 0
  return Math.ceil(diff / (24 * 60 * 60 * 1000))
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

export function shuffle(list) {
  const arr = [...list]
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

export function uniqueBy(list, keyFn) {
  const seen = new Set()
  const out = []
  for (const item of list) {
    const key = keyFn(item)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(item)
  }
  return out
}
