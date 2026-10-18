// 应用装配：hash 路由 + 事件委托 + 全量重渲染（页面很小，重渲染最简单也最不容易出状态 bug）
import { parseHash, navigate, isBrowseRoute, TITLES } from './router.js'
import {
  getState,
  save,
  resetAll,
  recordAnswer,
  completeSession,
  recordTest,
  evaluateAchievements,
  overallStats,
  levelProgress,
} from './store.js'
import { buildReviewQueue } from './review.js'
import { cards, curriculum, chapterById, cardById, questionById, chartQuestionPool } from './data.js'
import { chapterQuiz, weeklyQuiz, testCenter, testSession, mistakeEntries } from './views/tests.js'
import { navbar, mobileNav, toast, xpToast } from './views/shell.js'
import {
  sidebar,
  homePage,
  knowledgeMapPage,
  chapterPage,
  knowledgePage,
  reviewPage,
  cheatsheetPage,
} from './views/pages.js'

const app = document.getElementById('app')
const toastRoot = document.getElementById('toasts')

const ui = {
  flipped: new Set(),
  revealed: new Set(),
  answers: {},
  selfcheck: {},
  filter: 'all',
  expanded: false,
  query: '',
  searchOpen: false,
  testChapter: 'ch1',
  session: null,
  review: null,
  map: { scale: 1, x: 0, y: 0 },
  toasts: [],
}

let toastTimer = null

// ------------------------------------------------------------
// 主题（首屏前先应用，避免闪白）
// ------------------------------------------------------------
function resolvedTheme() {
  const state = getState()
  if (state.theme === 'system') {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return state.theme
}

function applyTheme() {
  document.documentElement.setAttribute('data-theme', resolvedTheme())
}

applyTheme()

// ------------------------------------------------------------
// 组卷与状态
// ------------------------------------------------------------
function resetUi() {
  ui.flipped = new Set()
  ui.revealed = new Set()
  ui.answers = {}
  ui.selfcheck = {}
  ui.filter = 'all'
  ui.session = null
  ui.review = null
}

function statsFor(state) {
  const base = overallStats(cards)
  return {
    ...base,
    due: buildReviewQueue().length,
    levelPct: levelProgress(state.game.xp),
    levelXp: levelProgress(state.game.xp),
    level: state.game.level,
  }
}

function buildCtx(route) {
  const state = getState()
  return {
    route,
    state,
    ui,
    stats: statsFor(state),
    theme: resolvedTheme(),
  }
}

function render() {
  const route = parseHash(window.location.hash)
  const ctx = buildCtx(route)
  document.title = TITLES[route.name] || TITLES.home

  let detail = ''
  // 知识地图需要更宽的画布，单独占满整页；其余浏览类页面用「左树 + 右详情」
  let browse = isBrowseRoute(route.name) && route.name !== 'map'

  switch (route.name) {
    case 'home':
      detail = homePage(ctx)
      break
    case 'map':
      detail = knowledgeMapPage(ctx)
      break
    case 'chapter':
      detail = chapterPage(ctx)
      break
    case 'knowledge':
      detail = knowledgePage(ctx)
      break
    case 'review':
      detail = reviewPage(ctx)
      break
    case 'test':
      detail = testCenter(ctx)
      break
    case 'test-chapter':
    case 'test-weekly':
      detail = testSession(ctx)
      break
    case 'cheatsheet':
      detail = cheatsheetPage(ctx)
      break
    default:
      detail = `<div class="empty-state"><p>页面不存在。</p></div>`
      browse = false
  }

  const body = browse
    ? `<main class="layout">${sidebar(ctx)}<section class="detail-panel">${detail}</section></main>`
    : `<main class="page">${detail}</main>`

  app.innerHTML = `${navbar(ctx)}${body}${mobileNav(route)}`

  // 窄屏时章节目录默认折叠，避免正文被 25 章目录推到很下面
  document.querySelectorAll('details.map-fold').forEach((details) => {
    details.open = window.innerWidth > 860
  })

  if (route.name === 'map') setupMap()
  renderToasts()
}

function renderToasts() {
  if (!toastRoot) return
  toastRoot.innerHTML = ui.toasts.map((item) => (item.kind === 'xp' ? xpToast(item.gained) : toast(item))).join('')
}

function pushToast(items, xpGained = 0) {
  const list = []
  if (xpGained > 0) list.push({ kind: 'xp', gained: xpGained })
  for (const item of items) list.push(item)
  if (!list.length) return
  ui.toasts = list
  renderToasts()
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    ui.toasts = []
    renderToasts()
  }, 4200)
}

// ------------------------------------------------------------
// 地图交互（滚轮缩放 / 拖拽平移）
// ------------------------------------------------------------
function applyMapTransform() {
  const group = document.getElementById('map-group')
  if (!group) return
  const { scale, x, y } = ui.map
  group.setAttribute('transform', `translate(${x} ${y}) scale(${scale})`)
}

function setupMap() {
  const canvas = document.getElementById('map-canvas')
  if (!canvas) return
  let drag = null

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault()
    const next = Math.min(2.4, Math.max(0.4, ui.map.scale * (e.deltaY < 0 ? 1.1 : 0.9)))
    ui.map.scale = Number(next.toFixed(3))
    applyMapTransform()
  }, { passive: false })

  canvas.addEventListener('pointerdown', (e) => {
    drag = { x: e.clientX, y: e.clientY, ox: ui.map.x, oy: ui.map.y }
  })
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return
    ui.map.x = drag.ox + (e.clientX - drag.x)
    ui.map.y = drag.oy + (e.clientY - drag.y)
    applyMapTransform()
  })
  const end = () => {
    drag = null
  }
  canvas.addEventListener('pointerup', end)
  canvas.addEventListener('pointerleave', end)
}

// ------------------------------------------------------------
// 答题
// ------------------------------------------------------------
function answerOf(id) {
  const card = cardById.get(id)
  if (card && card.quiz) return { answer: card.quiz.answer, difficulty: 'basic' }
  const q = questionById.get(id)
  if (q) {
    if (q.type === 'truefalse') return { answer: q.answer ? 0 : 1, difficulty: q.difficulty }
    return { answer: q.answer, difficulty: q.difficulty }
  }
  return null
}

function commitAnswer(id, isCorrect, difficulty) {
  const { gained } = recordAnswer(id, isCorrect, difficulty)
  const unlocked = evaluateAchievements(curriculum)
  pushToast(unlocked, gained)
}

function handleAnswer(id, index) {
  if (ui.answers[id] !== undefined) return
  const info = answerOf(id)
  if (!info) return
  ui.answers[id] = index
  commitAnswer(id, index === info.answer, info.difficulty)
  render()
}

function handleSelfcheck(id, ok) {
  if (ui.selfcheck[id] !== undefined) return
  ui.selfcheck[id] = ok
  commitAnswer(id, ok, 'challenge')
  render()
}

// ------------------------------------------------------------
// 复习会话
// ------------------------------------------------------------
function startReview() {
  const queue = buildReviewQueue()
  if (!queue.length) {
    ui.review = null
    render()
    return
  }
  ui.review = { queue, index: 0, revealed: false, chosen: null, correct: null }
  render()
}

function finishReviewRound() {
  const gained = completeSession()
  const unlocked = evaluateAchievements(curriculum)
  ui.review = null
  pushToast(unlocked, gained)
  render()
}

function advanceReview() {
  const session = ui.review
  if (!session) return
  if (session.index + 1 >= session.queue.length) {
    finishReviewRound()
    return
  }
  session.index += 1
  session.revealed = false
  session.chosen = null
  session.correct = null
  render()
}

function gradeReview(ok) {
  const session = ui.review
  if (!session) return
  const item = session.queue[session.index]
  commitAnswer(item.id, ok, item.kind === 'essay' ? 'challenge' : 'basic')
  advanceReview()
}

function pickReview(index) {
  const session = ui.review
  if (!session) return
  const item = session.queue[session.index]
  if (session.chosen !== null && session.chosen !== undefined) return
  const correct = index === item.answer
  session.chosen = index
  session.correct = correct
  commitAnswer(item.id, correct, item.difficulty || 'advanced')
  render()
}

// ------------------------------------------------------------
// 测试会话
// ------------------------------------------------------------
function startSession(meta, items, title) {
  if (!items.length) return
  ui.session = { ...meta, title, items, index: 0, answers: [], done: false }
  navigate(meta.route)
  render()
}

function restartSession() {
  const session = ui.session
  if (!session) return
  if (session.kind === 'chapter') {
    startSession(
      { ...session, route: `#/test/chapter/${session.chapterId}` },
      chapterQuiz(session.chapterId, 10),
      session.title,
    )
  } else if (session.kind === 'weekly') {
    startSession({ ...session, route: '#/test/weekly' }, weeklyQuiz(20), session.title)
  } else if (session.kind === 'chart') {
    startSession({ ...session, route: '#/test/chapter/charts' }, chartQuestionPool(), session.title)
  } else if (session.kind === 'mistake') {
    const items = mistakeEntries(getState()).filter((item) => item.options.length)
    if (!items.length) {
      navigate('/test')
      return
    }
    startSession({ ...session, route: '#/test/chapter/mistakes' }, items, session.title)
  }
}

function pickSession(index) {
  const session = ui.session
  if (!session || session.done) return
  if (session.answers[session.index]) return
  const item = session.items[session.index]
  const correct = index === item.answer
  session.answers[session.index] = { chosen: index, correct }
  commitAnswer(item.id, correct, item.difficulty)
  render()
}

function nextSession() {
  const session = ui.session
  if (!session) return
  if (session.index + 1 >= session.items.length) {
    session.done = true
    const correct = session.answers.filter((a) => a.correct).length
    recordTest({ title: session.title, total: session.items.length, correct })
    evaluateAchievements(curriculum)
    render()
    return
  }
  session.index += 1
  render()
}

// ------------------------------------------------------------
// 事件
// ------------------------------------------------------------
document.addEventListener('click', (event) => {
  const el = event.target.closest('[data-action]')
  if (!el) {
    if (ui.searchOpen && !event.target.closest('.search-box')) {
      ui.searchOpen = false
      render()
    }
    return
  }
  const action = el.dataset.action
  // 任何带动作的点击都先收起搜索下拉（点搜索框本身除外），避免它盖住新页面
  if (action !== 'search' && ui.searchOpen) ui.searchOpen = false

  switch (action) {
    case 'toggle-theme': {
      const state = getState()
      state.theme = resolvedTheme() === 'dark' ? 'light' : 'dark'
      save()
      applyTheme()
      render()
      return
    }
    case 'close-search':
      ui.searchOpen = false
      return
    case 'flip':
      ui.flipped.add(el.dataset.id)
      render()
      return
    case 'reveal':
      ui.revealed.add(el.dataset.id)
      render()
      return
    case 'answer':
      handleAnswer(el.dataset.id, Number(el.dataset.index))
      return
    case 'selfcheck':
      handleSelfcheck(el.dataset.id, el.dataset.ok === '1')
      return
    case 'filter':
      ui.filter = el.dataset.filter
      ui.expanded = false
      render()
      return
    case 'expand-practice':
      ui.expanded = true
      render()
      return
    case 'start-review':
      startReview()
      return
    case 'review-reveal':
      if (ui.review) ui.review.revealed = true
      render()
      return
    case 'review-grade':
      gradeReview(el.dataset.ok === '1')
      return
    case 'review-pick':
      pickReview(Number(el.dataset.index))
      return
    case 'review-next':
      advanceReview()
      return
    case 'review-exit':
      ui.review = null
      render()
      return
    case 'start-chapter-test': {
      const chapter = chapterById.get(ui.testChapter) ?? curriculum[0].chapters[0]
      const items = chapterQuiz(chapter.id, 10)
      startSession(
        { kind: 'chapter', chapterId: chapter.id, route: `#/test/chapter/${chapter.id}` },
        items,
        `第 ${chapter.num} 章 ${chapter.title}`,
      )
      return
    }
    case 'start-weekly-test':
      startSession({ kind: 'weekly', route: '#/test/weekly' }, weeklyQuiz(20), '综合卷 · 20 题')
      return
    case 'start-chart-test':
      startSession({ kind: 'chart', route: '#/test/chapter/charts' }, chartQuestionPool(), '图形题专项')
      return
    case 'start-mistake-test': {
      const items = mistakeEntries(getState()).filter((item) => item.options.length)
      startSession({ kind: 'mistake', route: '#/test/chapter/mistakes' }, items, '错题重做')
      return
    }
    case 'session-pick':
      pickSession(Number(el.dataset.index))
      return
    case 'session-next':
      nextSession()
      return
    case 'session-restart':
      restartSession()
      return
    case 'map-reset':
      ui.map = { scale: 1, x: 0, y: 0 }
      applyMapTransform()
      return
    case 'reset-progress': {
      if (window.confirm('确定清空全部学习进度、经验与成就？此操作不可撤销。')) {
        resetAll()
        resetUi()
        navigate('/')
        render()
      }
      return
    }
    default:
      return
  }
})

document.addEventListener('input', (event) => {
  if (event.target.id !== 'search-input') return
  ui.query = event.target.value
  ui.searchOpen = true
  const pos = event.target.selectionStart
  render()
  const input = document.getElementById('search-input')
  if (input) {
    input.focus()
    if (pos !== null) input.setSelectionRange(pos, pos)
  }
})

document.addEventListener('change', (event) => {
  const el = event.target.closest('[data-action="test-chapter-select"]')
  if (!el) return
  ui.testChapter = el.value
  render()
})

document.addEventListener('keydown', (event) => {
  if (event.key === '/' && document.activeElement?.tagName !== 'INPUT') {
    event.preventDefault()
    document.getElementById('search-input')?.focus()
  }
  if (event.key === 'Escape') {
    ui.searchOpen = false
    render()
  }
})

window.addEventListener('hashchange', () => {
  ui.searchOpen = false
  ui.expanded = false
  ui.filter = 'all'
  render()
})

// 模块脚本是 defer 的，DOM 已解析完；直接渲染一次保证首屏
render()
