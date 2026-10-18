// 数据层：把 6 个 part 拍平成索引，并提供题库/搜索/组卷的纯函数
import { part1 } from '../data/part1.js'
import { part2 } from '../data/part2.js'
import { part3 } from '../data/part3.js'
import { part4 } from '../data/part4.js'
import { part5 } from '../data/part5.js'
import { part6 } from '../data/part6.js'
import { extraQuestions } from '../data/extra/_index.js'

export const curriculum = [part1, part2, part3, part4, part5, part6]

export const chapters = curriculum.flatMap((part) =>
  part.chapters.map((ch) => ({
    ...ch,
    // 题库 = 章节自带题 + data/extra/chNN.js 扩充题
    questions: [...ch.questions, ...(extraQuestions[ch.id] || [])],
    partId: part.id,
    partTitle: part.title,
    partNum: part.num,
  })),
)

export const cards = chapters.flatMap((ch) =>
  ch.cards.map((card) => ({
    ...card,
    chapterId: ch.id,
    chapterTitle: ch.title,
    chapterNum: ch.num,
    partId: ch.partId,
  })),
)

export const questions = chapters.flatMap((ch) =>
  ch.questions.map((q) => ({
    ...q,
    chapterId: ch.id,
    chapterTitle: ch.title,
    chapterNum: ch.num,
    partId: ch.partId,
  })),
)

export const chapterById = new Map(chapters.map((ch) => [ch.id, ch]))
export const cardById = new Map(cards.map((card) => [card.id, card]))
export const questionById = new Map(questions.map((q) => [q.id, q]))

export function chapterOfCard(cardId) {
  const card = cardById.get(cardId)
  return card ? chapterById.get(card.chapterId) : null
}

export function relatedCards(ids) {
  if (!Array.isArray(ids)) return []
  return ids
    .map((id) => cardById.get(id))
    .filter(Boolean)
    .map((card) => ({ card, chapter: chapterById.get(card.chapterId) }))
}

// ------------------------------------------------------------
// 题目归一化：卡片速测题 + 分层题 → 测试可用格式
// ------------------------------------------------------------
const TRUE_FALSE_OPTIONS = ['正确', '错误']

function isTestable(q) {
  if (!q) return false
  if (q.type === 'choice' || q.type === 'truefalse') return true
  if (q.type === 'report' && q.answerMode === 'choice') return true
  return false
}

function normalizeQuestion(q, chapter) {
  const base = {
    id: q.id,
    kind: 'question',
    difficulty: q.difficulty ?? 'advanced',
    type: q.type === 'report' ? 'choice' : q.type,
    prompt: q.prompt,
    explanation: q.explanation ?? '',
    chapterId: chapter.id,
    chapterTitle: chapter.title,
    chart: q.chart,
    chartCaption: q.chartCaption,
    table: q.table,
  }
  if (q.type === 'truefalse') {
    return { ...base, options: TRUE_FALSE_OPTIONS, answer: q.answer ? 0 : 1 }
  }
  return { ...base, options: q.options ?? [], answer: q.answer }
}

function normalizeCardQuiz(card, chapter) {
  return {
    id: card.id,
    kind: 'card',
    difficulty: 'basic',
    type: 'choice',
    prompt: card.quiz.q,
    options: card.quiz.options,
    answer: card.quiz.answer,
    explanation: card.quiz.explanation,
    chapterId: chapter.id,
    chapterTitle: chapter.title,
    chart: card.chart,
    chartCaption: card.chartCaption,
  }
}

export function chapterPool(chapterId) {
  const ch = chapterById.get(chapterId)
  if (!ch) return []
  const pool = []
  for (const card of ch.cards) {
    if (card.quiz) pool.push(normalizeCardQuiz(card, ch))
  }
  for (const q of ch.questions) {
    if (isTestable(q)) pool.push(normalizeQuestion(q, ch))
  }
  const seen = new Set()
  return pool.filter((item) => {
    if (seen.has(item.id)) return false
    seen.add(item.id)
    return true
  })
}

export function allTestables() {
  return chapters.flatMap((ch) => chapterPool(ch.id))
}

export function chapterQuiz(chapterId, count = 6) {
  const pool = chapterPool(chapterId)
  return shuffleSlice(pool, count)
}

// 图形题：只取真正的题目（不含卡片速测），用于「图形题专项」
export function chartQuestionPool() {
  return allTestables().filter((item) => item.kind === 'question' && item.chart)
}

export function weeklyQuiz(count = 20) {
  return shuffleSlice(allTestables(), count)
}

function shuffleSlice(pool, count) {
  const arr = [...pool]
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr.slice(0, Math.min(count, arr.length))
}

// ------------------------------------------------------------
// 元信息：错题集 / 薄弱表需要「id → 可读标题」
// ------------------------------------------------------------
export function itemMeta(id) {
  const card = cardById.get(id)
  if (card) {
    return {
      id,
      kind: 'card',
      title: card.title,
      chapterId: card.chapterId,
      chapterTitle: card.chapterTitle,
      href: `#/knowledge/${card.id}`,
      difficulty: 'basic',
    }
  }
  const q = questionById.get(id)
  if (q) {
    const short = q.prompt.replace(/^(判断题|问答题|报表题|图片题)[：:]\s*/, '')
    return {
      id,
      kind: 'question',
      title: short.length > 46 ? `${short.slice(0, 46)}…` : short,
      chapterId: q.chapterId,
      chapterTitle: q.chapterTitle,
      href: `#/chapter/${q.chapterId}`,
      difficulty: q.difficulty,
    }
  }
  return null
}

// ------------------------------------------------------------
// 搜索索引
// ------------------------------------------------------------
const TYPE_LABELS = { chapter: '章节', knowledge: '知识点', question: '题目' }

export function searchIndex() {
  const items = []
  for (const ch of chapters) {
    items.push({
      id: ch.id,
      type: 'chapter',
      title: `第 ${ch.num} 章 ${ch.title}`,
      subtitle: `第 ${ch.partNum} 篇 · ${ch.partTitle}`,
      keywords: `${ch.title} ${ch.partTitle} ${ch.intro} ${(ch.focus || []).join(' ')}`,
      href: `#/chapter/${ch.id}`,
    })
    for (const card of ch.cards) {
      items.push({
        id: card.id,
        type: 'knowledge',
        title: card.title,
        subtitle: ch.title,
        keywords: `${card.title} ${card.definition} ${card.recall} ${card.example} ${
          card.formula || ''
        } ${card.keyPoint || ''} ${card.mistake || ''}`,
        href: `#/knowledge/${card.id}`,
      })
    }
    for (const q of ch.questions) {
      items.push({
        id: q.id,
        type: 'question',
        title: q.prompt,
        subtitle: `${ch.title} · ${q.difficulty}`,
        keywords: `${q.prompt} ${(q.options || []).join(' ')} ${q.explanation || ''}`,
        href: `#/chapter/${ch.id}`,
      })
    }
  }
  return items
}

let cachedIndex = null
export function search(query, limit = 12) {
  const q = String(query || '').trim().toLowerCase()
  if (!q) return []
  if (!cachedIndex) cachedIndex = searchIndex()
  const scored = []
  for (const item of cachedIndex) {
    const title = item.title.toLowerCase()
    const hay = item.keywords.toLowerCase()
    if (title.includes(q)) scored.push({ item, score: 0 })
    else if (hay.includes(q)) scored.push({ item, score: 1 })
  }
  scored.sort((a, b) => a.score - b.score)
  return scored.slice(0, limit).map((entry) => entry.item)
}

export { TYPE_LABELS }

// ------------------------------------------------------------
// 目录统计（首页 / 侧栏用）
// ------------------------------------------------------------
export const totals = {
  parts: curriculum.length,
  chapters: chapters.length,
  cards: cards.length,
  questions: questions.length,
}
