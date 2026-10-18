// 数据与渲染自检：node scripts/check.mjs
// 1) 校验题库完整性（id 唯一、答案下标合法、图表存在、related 可解析）
// 2) 用 Node 直接调用各页面的纯渲染函数，捕获模板/引用错误
import assert from 'node:assert/strict'
import {
  curriculum,
  chapters,
  cards,
  questions,
  chapterPool,
  allTestables,
  cardById,
  chapterById,
  search,
  totals,
  chartQuestionPool,
} from '../js/data.js'
import { CHART_NAMES } from '../js/charts.js'
import { defaultState, overallStats, buildAchievementContext, ACHIEVEMENTS, setState } from '../js/store.js'
import { buildReviewQueue } from '../js/review.js'
import { buildBackup, parseBackup } from '../js/backup.js'
import { homePage, knowledgeMapPage, chapterPage, knowledgePage, reviewPage, cheatsheetPage, sidebar } from '../js/views/pages.js'
import { testCenter, testSession, mistakeEntries } from '../js/views/tests.js'

const problems = []
const PARTIAL = process.argv.includes('--partial')
const shortChapters = []
function check(condition, message) {
  if (!condition) problems.push(message)
}

// ---------- 结构 ----------
check(curriculum.length === 6, `应有 6 篇，实际 ${curriculum.length}`)
check(chapters.length === 25, `应有 25 章，实际 ${chapters.length}`)
check(totals.cards >= 70, `回忆卡过少：${totals.cards}`)
check(totals.questions >= 120, `题目过少：${totals.questions}`)

const chapterIds = new Set()
const cardIds = new Set()
const questionIds = new Set()

for (const ch of chapters) {
  check(!chapterIds.has(ch.id), `章 id 重复：${ch.id}`)
  chapterIds.add(ch.id)
  check(ch.cards.length >= 6, `${ch.id} 知识点不足 6 张（当前 ${ch.cards.length}）`)
  if (ch.questions.length >= 20) {
    // 达标
  } else {
    shortChapters.push(`${ch.id}(${ch.questions.length})`)
    if (!PARTIAL) check(false, `${ch.id} 题目不足 20 道（当前 ${ch.questions.length}）`)
  }
  check(Boolean(ch.intro), `${ch.id} 缺少 intro`)

  for (const card of ch.cards) {
    check(!cardIds.has(card.id), `卡片 id 重复：${card.id}`)
    cardIds.add(card.id)
    check(card.id.startsWith(ch.id), `${card.id} 应与 ${ch.id} 同前缀`)
    for (const field of ['title', 'recall', 'definition', 'example']) {
      check(Boolean(card[field]), `${card.id} 缺字段 ${field}`)
    }
    const quiz = card.quiz
    check(Boolean(quiz), `${card.id} 缺 quiz`)
    if (quiz) {
      check(quiz.options.length === 4, `${card.id} 速测题应为 4 个选项`)
      check(Number.isInteger(quiz.answer) && quiz.answer >= 0 && quiz.answer < quiz.options.length, `${card.id} 答案越界`)
      check(new Set(quiz.options).size === quiz.options.length, `${card.id} 选项重复`)
      check(Boolean(quiz.explanation), `${card.id} 速测题缺解析`)
    }
    if (card.chart) check(CHART_NAMES.includes(card.chart), `${card.id} 图表不存在：${card.chart}`)
    for (const rel of card.related || []) {
      check(cardById.has(rel), `${card.id} related 指向不存在的卡：${rel}`)
    }
  }

  for (const q of ch.questions) {
    check(!questionIds.has(q.id), `题目 id 重复：${q.id}`)
    questionIds.add(q.id)
    check(['basic', 'advanced', 'challenge'].includes(q.difficulty), `${q.id} difficulty 非法`)
    check(['choice', 'truefalse', 'essay', 'report'].includes(q.type), `${q.id} type 非法`)
    check(Boolean(q.prompt), `${q.id} 缺 prompt`)
    if (q.type === 'choice' || (q.type === 'report' && q.answerMode === 'choice')) {
      check(Array.isArray(q.options) && q.options.length === 4, `${q.id} 应有 4 个选项`)
      check(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < 4, `${q.id} 答案越界`)
      check(new Set(q.options).size === 4, `${q.id} 选项重复`)
      check(Boolean(q.explanation), `${q.id} 缺解析`)
    }
    if (q.type === 'truefalse') {
      check(typeof q.answer === 'boolean', `${q.id} 判断题答案应为布尔值`)
      check(Boolean(q.explanation), `${q.id} 缺解析`)
    }
    if (q.type === 'essay') {
      check(Boolean(q.reference), `${q.id} 问答题缺参考答案`)
    }
    if (q.type === 'report') {
      check(Boolean(q.table && q.table.columns && q.table.rows.length), `${q.id} 报表题缺表格`)
      for (const row of q.table.rows) {
        check(row.length === q.table.columns.length, `${q.id} 表格列数不一致`)
      }
    }
    if (q.chart) check(CHART_NAMES.includes(q.chart), `${q.id} 图表不存在：${q.chart}`)
  }
}

// ---------- 题库 ----------
for (const ch of chapters) {
  const pool = chapterPool(ch.id)
  check(pool.length >= 6, `${ch.id} 可判分题不足 6（${pool.length}）`)
  for (const item of pool) {
    check(Array.isArray(item.options) && item.options.length >= 2, `${item.id} 选项异常`)
    check(item.answer >= 0 && item.answer < item.options.length, `${item.id} 归一化答案越界`)
  }
}
const testables = allTestables()
check(testables.length >= 150, `可判分题总量偏少：${testables.length}`)
check(new Set(testables.map((t) => t.id)).size === testables.length, '可判分题 id 有重复')

// ---------- 图形题 ----------
const chartQuestions = questions.filter((q) => q.chart)
check(chartQuestions.length >= 8, `图形题过少：${chartQuestions.length}`)
const usedCharts = new Set(
  [...cards.map((c) => c.chart), ...questions.map((q) => q.chart)].filter(Boolean),
)
for (const name of CHART_NAMES) {
  check(usedCharts.has(name), `图表已定义但没有任何内容引用：${name}`)
}
for (const item of chartQuestionPool()) {
  check(item.kind === 'question', `图形题专项混入了卡片速测：${item.id}`)
  check(Boolean(item.chart), `图形题缺 chart：${item.id}`)
}

// ---------- 成就条件可执行 ----------
const baseState = defaultState()
const achCtx = buildAchievementContext(curriculum)
for (const item of ACHIEVEMENTS) {
  check(typeof item.test === 'function', `${item.id} 缺 test`)
  check(typeof item.test(achCtx) === 'boolean', `${item.id} test 未返回布尔值`)
}

// ---------- 搜索 ----------
check(search('利率').length > 0, '搜索「利率」无结果')
check(search('货币乘数').length > 0, '搜索「货币乘数」无结果')
check(search('').length === 0, '空搜索应返回空数组')

// ---------- 渲染冒烟 ----------
const stats = { ...overallStats(cards), levelPct: 0, levelXp: 0, level: 1 }
const ui = {
  flipped: new Set(['ch1-c1']),
  revealed: new Set(['ch1-q5']),
  answers: { 'ch1-c1': 1 },
  selfcheck: {},
  filter: 'all',
  query: '利率',
  searchOpen: true,
  testChapter: 'ch4',
  session: null,
  review: null,
  map: { scale: 1, x: 0, y: 0 },
  toasts: [],
}
const baseCtx = {
  state: baseState,
  ui,
  stats,
  theme: 'light',
  route: { name: 'home', params: {} },
}

function renderAll(fn, route, label) {
  try {
    const html = fn({ ...baseCtx, route })
    assert.equal(typeof html, 'string')
    check(html.length > 200, `${label} 输出过短（${html.length}）`)
    check(!html.includes('undefined'), `${label} 输出含 undefined`)
    check(!html.includes('[object Object]'), `${label} 输出含 [object Object]`)
    return html
  } catch (error) {
    problems.push(`${label} 渲染抛错：${error.message}`)
    return ''
  }
}

renderAll(homePage, { name: 'home', params: {} }, '首页')
renderAll(knowledgeMapPage, { name: 'map', params: {} }, '知识地图')
renderAll(sidebar, { name: 'map', params: {} }, '侧栏')
renderAll(cheatsheetPage, { name: 'cheatsheet', params: {} }, '公式速查')
renderAll(testCenter, { name: 'test', params: {} }, '测试中心')
renderAll(testSession, { name: 'test-chapter', params: { id: 'ch4' } }, '测试会话（无 session）')

for (const ch of chapters) {
  renderAll(chapterPage, { name: 'chapter', params: { id: ch.id } }, `章节页 ${ch.id}`)
}
for (const card of cards) {
  renderAll(knowledgePage, { name: 'knowledge', params: { id: card.id } }, `知识点页 ${card.id}`)
}
renderAll(reviewPage, { name: 'review', params: {} }, '复习页')

// 带会话的测试渲染
const sessionCtx = {
  ...baseCtx,
  route: { name: 'test-chapter', params: { id: 'ch4' } },
  ui: {
    ...ui,
    session: {
      kind: 'chapter',
      chapterId: 'ch4',
      title: '第 4 章 理解利率',
      items: chapterPool('ch4'),
      index: 1,
      answers: [{ chosen: 1, correct: true }],
      done: false,
    },
  },
}
try {
  const html = testSession(sessionCtx)
  check(html.includes('test-session'), '测试会话未渲染出题目区')
} catch (error) {
  problems.push(`测试会话渲染抛错：${error.message}`)
}

const doneCtx = {
  ...sessionCtx,
  ui: {
    ...sessionCtx.ui,
    session: { ...sessionCtx.ui.session, done: true, answers: [{ chosen: 1, correct: true }] },
  },
}
try {
  const html = testSession(doneCtx)
  check(html.includes('test-result'), '测试结果页未渲染')
} catch (error) {
  problems.push(`测试结果渲染抛错：${error.message}`)
}

// 错题条目
const mistakeCtxState = defaultState()
mistakeCtxState.progress['ch4-q1'] = { attempts: 2, correct: false, lastCorrect: false, box: 0, dueTs: 0 }
const mistakes = mistakeEntries(mistakeCtxState)
check(mistakes.length === 1 && mistakes[0].options.length === 4, '错题条目构造失败')

// 复习队列：卡片与题目都要能进队列并渲染
{
  const reviewState = defaultState()
  const now = Date.now()
  reviewState.progress['ch4-e01'] = {
    attempts: 1,
    correct: false,
    lastCorrect: false,
    box: 0,
    dueTs: now - 5000,
    lastTs: now - 86400000,
  }
  reviewState.progress['ch4-c1'] = {
    attempts: 2,
    correct: true,
    lastCorrect: true,
    box: 2,
    dueTs: now - 2000,
    lastTs: now - 86400000,
  }
  setState(reviewState)
  const queue = buildReviewQueue()
  check(queue.length === 2, `复习队列应有 2 项，实际 ${queue.length}`)
  check(queue.some((item) => item.kind === 'question'), '复习队列里没有题目')
  check(queue.some((item) => item.kind === 'card'), '复习队列里没有卡片')
  const questionItem = queue.find((item) => item.kind === 'question')
  check(questionItem.options && questionItem.options.length === 4, '复习题目缺选项')
  const questionHtml = reviewPage({
    ...baseCtx,
    state: reviewState,
    ui: {
      ...ui,
      review: { queue, index: queue.indexOf(questionItem), revealed: false, chosen: null, correct: null },
    },
  })
  check(questionHtml.includes('review-pick'), '题目复习卡未渲染选项按钮')
  const cardItem = queue.find((item) => item.kind === 'card')
  const cardHtml = reviewPage({
    ...baseCtx,
    state: reviewState,
    ui: {
      ...ui,
      review: { queue, index: queue.indexOf(cardItem), revealed: true, chosen: null, correct: null },
    },
  })
  check(cardHtml.includes('review-grade'), '卡片复习卡未渲染自评按钮')
  setState(defaultState())
}

// 备份：导出 → 解析 → 还原 必须一致；坏数据必须被拒绝
{
  const state = defaultState()
  state.progress['ch1-c1'] = {
    attempts: 3,
    correct: true,
    lastCorrect: true,
    box: 2,
    dueTs: Date.now() + 86400000,
    lastTs: Date.now(),
  }
  state.game.xp = 120
  state.game.level = 2
  setState(state)

  const payload = buildBackup()
  check(payload.app === 'money-banking' && payload.version === 1, '备份缺少 app/version 标记')

  const parsed = parseBackup(JSON.stringify(payload))
  check(parsed.ok, `备份解析失败：${parsed.error}`)
  check(parsed.valid === 1, `备份记录数不对：${parsed.valid}`)
  check(parsed.state.progress['ch1-c1'].box === 2, '还原后盒子层级不一致')
  check(parsed.state.game.xp === 120, '还原后经验值不一致')

  check(parseBackup('这不是 json').ok === false, '非法 JSON 应被拒绝')
  check(parseBackup(JSON.stringify({ app: 'other' })).ok === false, '非本站文件应被拒绝')
  check(
    parseBackup(JSON.stringify({ app: 'money-banking', version: 99, state: { progress: {} } })).ok === false,
    '高版本备份应被拒绝',
  )
  const partial = parseBackup(
    JSON.stringify({
      app: 'money-banking',
      version: 1,
      state: { progress: { good: { box: 1, dueTs: Date.now(), attempts: 1 }, bad: { box: 'x' } } },
    }),
  )
  check(partial.ok && partial.valid === 1 && partial.dropped === 1, '坏记录应被剔除并计数')

  setState(defaultState())
}

// ---------- 汇总 ----------
if (problems.length) {
  console.error(`\n✗ 自检发现 ${problems.length} 个问题：`)
  for (const problem of problems) console.error(`  · ${problem}`)
  process.exit(1)
}

console.log('✓ 数据与渲染自检通过')
console.log(`  篇 ${totals.parts} · 章 ${totals.chapters} · 回忆卡 ${totals.cards} · 题目 ${totals.questions}`)
console.log(`  可判分题 ${testables.length} · 成就 ${ACHIEVEMENTS.length} · 图表 ${CHART_NAMES.length}`)
console.log(
  `  题库进度：${chapters.length - shortChapters.length}/${chapters.length} 章达到 20 题` +
    (shortChapters.length ? `（待补：${shortChapters.join(' ')}）` : ''),
)
