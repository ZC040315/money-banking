// ============================================================
// 进度存储：本地保存 + 利特纳盒子 + 掌握度 + 经验值 + 成就
// 全部逻辑是纯函数式的，state 只在内存里，写操作显式落盘。
// 注意：本模块可被 Node 直接 import（无 localStorage 时降级为默认值），
// 这样自检脚本可以在命令行里跑数据与进度逻辑。
// ============================================================

export const STORAGE_KEY = 'money-banking:v1:state'
export const BOX_INTERVALS_DAYS = [1, 2, 4, 8, 16]
export const BOX_MASTERY = [0, 40, 60, 80, 100]
export const DIFFICULTY_XP = { basic: 5, advanced: 10, challenge: 15 }
export const LEVEL_STEP = 100
export const SESSION_XP = 10

const DAY_MS = 24 * 60 * 60 * 1000

function hasStorage() {
  try {
    return typeof localStorage !== 'undefined' && localStorage !== null
  } catch {
    return false
  }
}

export function defaultState() {
  return {
    progress: {},
    game: {
      xp: 0,
      level: 1,
      achievements: {},
      answeredIds: [],
      reviewDays: [],
      sessions: 0,
    },
    history: [],
    theme: 'system',
    lastChapter: 'ch1',
    lastTest: null,
  }
}

function normalizeState(raw) {
  const base = defaultState()
  if (!raw || typeof raw !== 'object') return base
  const state = { ...base, ...raw }
  state.progress = raw.progress && typeof raw.progress === 'object' ? raw.progress : {}
  state.game = { ...base.game, ...(raw.game || {}) }
  state.game.answeredIds = Array.isArray(state.game.answeredIds) ? state.game.answeredIds : []
  state.game.reviewDays = Array.isArray(state.game.reviewDays) ? state.game.reviewDays : []
  state.game.achievements =
    state.game.achievements && typeof state.game.achievements === 'object'
      ? state.game.achievements
      : {}
  state.history = Array.isArray(raw.history) ? raw.history : []
  if (!Number.isFinite(state.game.xp)) state.game.xp = 0
  state.game.level = levelFromXp(state.game.xp)
  if (!['light', 'dark', 'system'].includes(state.theme)) state.theme = 'system'
  return state
}

function load() {
  if (!hasStorage()) return defaultState()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultState()
    return normalizeState(JSON.parse(raw))
  } catch {
    return defaultState()
  }
}

let state = load()

export function getState() {
  return state
}

export function setState(next) {
  state = normalizeState(next)
  return state
}

export function save() {
  if (!hasStorage()) return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // 隐私模式 / 配额满：静默失败，页面照常可用
  }
}

export function resetAll() {
  state = defaultState()
  save()
  return state
}

// ------------------------------------------------------------
// 等级与经验
// ------------------------------------------------------------
export function levelFromXp(xp) {
  return Math.floor(Math.max(0, xp) / LEVEL_STEP) + 1
}

export function levelProgress(xp) {
  return Math.max(0, xp) % LEVEL_STEP
}

// ------------------------------------------------------------
// 答题 → 利特纳盒子
// ------------------------------------------------------------
export function recordAnswer(itemId, isCorrect, difficulty) {
  const now = Date.now()
  const prev = state.progress[itemId]
  const prevBox = Number.isInteger(prev?.box) ? prev.box : 0
  const box = isCorrect ? Math.min(prevBox + 1, 4) : 0
  state.progress[itemId] = {
    correct: isCorrect || prev?.correct === true,
    attempts: (prev?.attempts ?? 0) + 1,
    lastTs: now,
    lastCorrect: isCorrect,
    box,
    dueTs: now + BOX_INTERVALS_DAYS[box] * DAY_MS,
  }

  let gained = 0
  if (isCorrect) {
    const repeat = prev?.correct === true
    gained = repeat ? 5 : (DIFFICULTY_XP[difficulty] ?? 8)
    state.game.xp += gained
    if (!state.game.answeredIds.includes(itemId)) {
      state.game.answeredIds.push(itemId)
    }
    state.game.level = levelFromXp(state.game.xp)
  }
  save()
  return { gained, box, dueTs: state.progress[itemId].dueTs }
}

export function completeSession(date = new Date()) {
  const day = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`
  if (!state.game.reviewDays.includes(day)) state.game.reviewDays.push(day)
  state.game.sessions += 1
  state.game.xp += SESSION_XP
  state.game.level = levelFromXp(state.game.xp)
  save()
  return SESSION_XP
}

export function recordTest(entry) {
  state.history.unshift({ ...entry, ts: Date.now() })
  state.history = state.history.slice(0, 20)
  save()
}

// ------------------------------------------------------------
// 掌握度
// ------------------------------------------------------------
export function masteryOf(itemId) {
  return BOX_MASTERY[state.progress[itemId]?.box ?? 0]
}

export function chapterMastery(cards) {
  if (!cards.length) return 0
  const total = cards.reduce((sum, card) => sum + masteryOf(card.id), 0)
  return Math.round(total / cards.length)
}

export function chapterStatus(mastery) {
  if (mastery >= 80) return 'mastered'
  if (mastery > 0) return 'learning'
  return 'not-started'
}

export const STATUS_LABELS = {
  'not-started': '未开始',
  learning: '学习中',
  mastered: '已掌握',
  review: '待复习',
}

export function dueItems(cards, now = Date.now()) {
  return cards
    .filter((card) => {
      const rec = state.progress[card.id]
      return rec && rec.attempts > 0 && rec.dueTs <= now
    })
    .map((card) => ({ ...card, dueTs: state.progress[card.id].dueTs, box: state.progress[card.id].box }))
    .sort((a, b) => a.dueTs - b.dueTs)
}

export function overallStats(cards) {
  const total = cards.length
  let answered = 0
  let correct = 0
  let sum = 0
  for (const card of cards) {
    const rec = state.progress[card.id]
    if (rec?.attempts > 0) answered += 1
    if (rec?.correct) correct += 1
    sum += masteryOf(card.id)
  }
  return {
    total,
    answered,
    correct,
    mastery: total ? Math.round(sum / total) : 0,
    accuracy: answered ? Math.round((correct / answered) * 100) : 0,
    due: dueItems(cards).length,
  }
}

export function weakCards(cards, limit = 6) {
  return cards
    .map((card) => {
      const rec = state.progress[card.id]
      return {
        ...card,
        attempts: rec?.attempts ?? 0,
        wrong: rec ? Math.max(0, (rec.attempts ?? 0) - (rec.lastCorrect ? 1 : 0)) : 0,
        mastery: masteryOf(card.id),
      }
    })
    .filter((card) => card.attempts > 0 && card.mastery < 80)
    .sort((a, b) => b.wrong - a.wrong || a.mastery - b.mastery || b.attempts - a.attempts)
    .slice(0, limit)
}

export function longestStreak(days) {
  const sorted = [...new Set(days)].sort()
  let best = 0
  let run = 0
  let prev = null
  for (const day of sorted) {
    if (prev) {
      const diff = (new Date(`${day}T00:00:00`) - new Date(`${prev}T00:00:00`)) / DAY_MS
      run = diff === 1 ? run + 1 : 1
    } else {
      run = 1
    }
    best = Math.max(best, run)
    prev = day
  }
  return best
}

// ------------------------------------------------------------
// 成就
// ------------------------------------------------------------
export const ACHIEVEMENTS = [
  { id: 'first-answer', title: '破冰者', desc: '答对第一道题', icon: '❄', test: (c) => c.answered >= 1 },
  { id: 'ten-answers', title: '十连斩', desc: '累计答对 10 个知识点或题目', icon: '✴', test: (c) => c.answered >= 10 },
  { id: 'first-review', title: '复习先锋', desc: '完成第一次复习会话', icon: '↻', test: (c) => c.sessions >= 1 },
  { id: 'streak-3', title: '连击选手', desc: '连续 3 天有复习记录', icon: '⚡', test: (c) => c.streak >= 3 },
  { id: 'rates-master', title: '利率通', desc: '第二篇 4 章掌握度全部达到 100%', icon: '📈', test: (c) => c.partMastery('p2') === 100 },
  { id: 'policy-master', title: '政策通', desc: '第四篇 4 章掌握度全部达到 100%', icon: '🏛', test: (c) => c.partMastery('p4') === 100 },
  { id: 'half-book', title: '半程达成', desc: '全书平均掌握度达到 50%', icon: '◐', test: (c) => c.book >= 50 },
  { id: 'money-master', title: '货币大师', desc: '全书平均掌握度达到 90%', icon: '★', test: (c) => c.book >= 90 },
]

export function buildAchievementContext(parts) {
  const chapters = parts.flatMap((part) => part.chapters.map((ch) => ({ ...ch, partId: part.id })))
  const allCards = chapters.flatMap((ch) => ch.cards)
  const answered = state.game.answeredIds.length
  const totalMastery = allCards.reduce((sum, card) => sum + masteryOf(card.id), 0)
  return {
    answered,
    sessions: state.game.sessions,
    streak: longestStreak(state.game.reviewDays),
    book: allCards.length ? Math.round(totalMastery / allCards.length) : 0,
    partMastery(partId) {
      const list = chapters.filter((ch) => ch.partId === partId && ch.cards.length)
      if (!list.length) return 0
      const sum = list.reduce((acc, ch) => acc + chapterMastery(ch.cards), 0)
      return Math.round(sum / list.length)
    },
  }
}

export function evaluateAchievements(parts) {
  const ctx = buildAchievementContext(parts)
  const unlocked = []
  for (const item of ACHIEVEMENTS) {
    if (state.game.achievements[item.id]) continue
    if (item.test(ctx)) {
      state.game.achievements[item.id] = true
      unlocked.push(item)
    }
  }
  if (unlocked.length) save()
  return unlocked
}
