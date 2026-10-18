// 复习队列：把「到期的卡片」和「到期的题目」放进同一个利特纳流程
import { getState } from './store.js'
import { cardById, chapterById, questionById, testableById } from './data.js'

export const REVIEW_KIND_LABELS = {
  card: '知识点',
  question: '题目',
  essay: '问答题',
}

export const MAX_REVIEW = 40

/**
 * 按到期时间升序取复习队列。
 * - 卡片：走「先回忆 → 翻面 → 记住了/没记住」
 * - 选择题/判断题/报表题：直接重做，选完即判分
 * - 问答题：看参考答案后自评
 */
export function buildReviewQueue(now = Date.now()) {
  const state = getState()
  const items = []

  for (const [id, record] of Object.entries(state.progress)) {
    if (!record || !record.attempts) continue
    if (!Number.isFinite(record.dueTs) || record.dueTs > now) continue

    const card = cardById.get(id)
    if (card) {
      items.push({
        kind: 'card',
        id,
        dueTs: record.dueTs,
        box: record.box ?? 0,
        attempts: record.attempts,
        chapterId: card.chapterId,
        chapterTitle: card.chapterTitle,
        chapterNum: card.chapterNum,
        title: card.title,
        recall: card.recall,
        definition: card.definition,
        example: card.example,
        formula: card.formula,
        chart: card.chart,
        chartCaption: card.chartCaption,
      })
      continue
    }

    const question = questionById.get(id)
    if (!question) continue
    const chapter = chapterById.get(question.chapterId)
    const testable = testableById(id)
    const isEssay = question.type === 'essay'

    items.push({
      kind: isEssay ? 'essay' : 'question',
      id,
      dueTs: record.dueTs,
      box: record.box ?? 0,
      attempts: record.attempts,
      chapterId: question.chapterId,
      chapterTitle: chapter ? chapter.title : question.chapterId,
      chapterNum: chapter ? chapter.num : 0,
      difficulty: question.difficulty,
      prompt: question.prompt,
      options: testable ? testable.options : undefined,
      answer: testable ? testable.answer : undefined,
      explanation: question.explanation,
      hint: question.hint,
      reference: question.reference,
      chart: question.chart,
      chartCaption: question.chartCaption,
      table: question.table,
    })
  }

  items.sort((a, b) => a.dueTs - b.dueTs)
  return items
}

export function reviewQueueSize(now = Date.now()) {
  return buildReviewQueue(now).length
}

export function kindLabel(kind) {
  return REVIEW_KIND_LABELS[kind] ?? kind
}
