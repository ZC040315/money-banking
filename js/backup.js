// 进度备份：导出为 JSON、导入前逐条校验，避免把坏数据写进 localStorage
import { getState, setState, save, defaultState } from './store.js'

export const BACKUP_APP = 'money-banking'
export const BACKUP_VERSION = 1

export function summarize(state = getState()) {
  const progress = state.progress || {}
  const records = Object.values(progress)
  return {
    tracked: records.length,
    answered: records.filter((r) => r && r.attempts > 0).length,
    mastered: records.filter((r) => r && r.correct).length,
    xp: state.game?.xp ?? 0,
    level: state.game?.level ?? 1,
    sessions: state.game?.sessions ?? 0,
    achievements: Object.keys(state.game?.achievements || {}).length,
  }
}

export function buildBackup(state = getState()) {
  return {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    state: JSON.parse(JSON.stringify(state)),
  }
}

function sanitizeRecord(record) {
  if (!record || typeof record !== 'object') return null
  if (!Number.isFinite(record.dueTs)) return null
  if (!Number.isInteger(record.box)) return null
  return {
    correct: record.correct === true,
    attempts: Number.isFinite(record.attempts) ? record.attempts : 0,
    lastTs: Number.isFinite(record.lastTs) ? record.lastTs : Date.now(),
    lastCorrect: record.lastCorrect === true,
    box: Math.max(0, Math.min(4, record.box)),
    dueTs: record.dueTs,
  }
}

export function parseBackup(text) {
  let data
  try {
    data = JSON.parse(text)
  } catch {
    return { ok: false, error: '不是合法的 JSON 文件。' }
  }
  if (!data || data.app !== BACKUP_APP) {
    return { ok: false, error: '这不是本站的进度备份（缺少 app 标记）。' }
  }
  if (!Number.isInteger(data.version) || data.version > BACKUP_VERSION) {
    return { ok: false, error: `备份版本（${data.version}）高于当前站点支持的版本（${BACKUP_VERSION}）。` }
  }
  const state = data.state
  if (!state || typeof state !== 'object' || !state.progress || typeof state.progress !== 'object') {
    return { ok: false, error: '备份缺少 progress 字段。' }
  }

  const clean = {}
  let dropped = 0
  for (const [id, record] of Object.entries(state.progress)) {
    const sanitized = sanitizeRecord(record)
    if (!sanitized) {
      dropped += 1
      continue
    }
    clean[id] = sanitized
  }
  if (!Object.keys(clean).length && dropped > 0) {
    return { ok: false, error: '备份里的 progress 记录全部无法识别。' }
  }

  const base = defaultState()
  return {
    ok: true,
    valid: Object.keys(clean).length,
    dropped,
    exportedAt: data.exportedAt,
    state: {
      ...base,
      ...state,
      progress: clean,
      game: { ...base.game, ...(state.game || {}) },
      history: Array.isArray(state.history) ? state.history.slice(0, 20) : [],
      theme: ['light', 'dark', 'system'].includes(state.theme) ? state.theme : 'system',
    },
  }
}

export function applyBackup(parsed) {
  setState(parsed.state)
  save()
}
