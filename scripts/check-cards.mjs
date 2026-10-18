// 单章知识点校验：node scripts/check-cards.mjs data/cards-extra/ch01.js [更多文件…]
import { basename } from 'node:path'
import { pathToFileURL } from 'node:url'
import { chapters } from '../js/data.js'
import { CHART_NAMES } from '../js/charts.js'

const problems = []
const warnings = []
const files = process.argv.slice(2)
if (!files.length) {
  console.error('用法：node scripts/check-cards.mjs data/cards-extra/ch01.js')
  process.exit(1)
}

const normalize = (text) =>
  String(text || '')
    .replace(/[\s，。、；：！？"'（）()【】\[\]…—-]/g, '')
    .toLowerCase()

for (const file of files) {
  const match = basename(file).match(/^ch(\d+)\.js$/)
  if (!match) {
    problems.push(`${file}: 文件名必须是 chNN.js`)
    continue
  }
  const chapterId = `ch${parseInt(match[1], 10)}`
  const chapter = chapters.find((ch) => ch.id === chapterId)
  if (!chapter) {
    problems.push(`${file}: 找不到章节 ${chapterId}`)
    continue
  }

  let mod
  try {
    mod = await import(pathToFileURL(file).href + `?t=${Date.now()}`)
  } catch (error) {
    problems.push(`${file}: 无法 import（语法错误？）${error.message}`)
    continue
  }
  const list = mod.extraCards
  if (!Array.isArray(list)) {
    problems.push(`${file}: 必须 export const extraCards = []`)
    continue
  }

  // 只拿原有的 c1–c3 做对比，避免索引重建后把扩充卡自己当基准
  const baseCards = chapter.cards.filter((card) => /-c[1-3]$/.test(card.id))
  const baseTitles = baseCards.map((card) => normalize(card.title))
  const seenIds = new Set()
  const seenTitles = new Map()

  for (const [index, card] of list.entries()) {
    const flag = `${basename(file)} 第 ${index + 1} 张 (${card?.id ?? '无 id'})`
    if (!card || typeof card !== 'object') {
      problems.push(`${flag}: 不是对象`)
      continue
    }
    if (!new RegExp(`^${chapterId}-c\\d+$`).test(card.id || '')) {
      problems.push(`${flag}: id 应形如 ${chapterId}-c4`)
    }
    if (seenIds.has(card.id)) problems.push(`${flag}: id 重复`)
    seenIds.add(card.id)
    if (baseCards.some((c) => c.id === card.id)) problems.push(`${flag}: id 与已有卡片冲突`)

    for (const field of ['title', 'recall', 'definition', 'example']) {
      if (!card[field] || String(card[field]).trim().length < 4) {
        problems.push(`${flag}: 缺少或过短 ${field}`)
      }
    }
    if (card.definition && card.definition.length < 15) problems.push(`${flag}: definition 少于 15 字`)
    if (card.example && card.example.length < 20) problems.push(`${flag}: example 少于 20 字`)

    const key = normalize(card.title)
    if (seenTitles.has(key)) problems.push(`${flag}: 与第 ${seenTitles.get(key) + 1} 张标题重复`)
    seenTitles.set(key, index)
    if (baseTitles.includes(key)) problems.push(`${flag}: 与已有卡片标题重复`)

    const quiz = card.quiz
    if (!quiz) {
      problems.push(`${flag}: 缺 quiz`)
    } else {
      if (!quiz.q || quiz.q.length < 6) problems.push(`${flag}: quiz.q 太短`)
      if (!Array.isArray(quiz.options) || quiz.options.length !== 4) {
        problems.push(`${flag}: quiz 必须有 4 个选项`)
      } else {
        if (new Set(quiz.options.map((o) => String(o).trim())).size !== 4) {
          problems.push(`${flag}: quiz 选项有重复`)
        }
        if (quiz.options.some((o) => !String(o || '').trim())) problems.push(`${flag}: 存在空选项`)
      }
      if (!Number.isInteger(quiz.answer) || quiz.answer < 0 || quiz.answer > 3) {
        problems.push(`${flag}: quiz.answer 必须是 0–3`)
      }
      if (!quiz.explanation || quiz.explanation.length < 10) problems.push(`${flag}: quiz 解析过短`)
    }

    if (card.chart && !CHART_NAMES.includes(card.chart)) {
      problems.push(`${flag}: 图表不存在 ${card.chart}`)
    }
    if (card.related) {
      if (!Array.isArray(card.related)) problems.push(`${flag}: related 必须是数组`)
      else warnings.push(`${flag}: related → ${card.related.join(', ')}（全站校验时确认）`)
    }
  }

  if (list.length < 3) problems.push(`${file}: 只有 ${list.length} 张，至少 3 张（目标 4 张）`)
  const withFormula = list.filter((c) => c.formula).length
  const withExtra = list.filter((c) => c.keyPoint || c.mistake).length
  if (!withFormula && chapterId >= 'ch4') warnings.push(`${file}: 没有带公式的卡片`)
  if (!withExtra) warnings.push(`${file}: 没有带 keyPoint/mistake 的卡片`)

  console.log(`${file}: ${list.length} 张 · 公式 ${withFormula} · 重点/易错 ${withExtra}`)
}

if (warnings.length) {
  console.log('\n提示：')
  for (const w of warnings) console.log(`  · ${w}`)
}

if (problems.length) {
  console.error(`\n✗ ${problems.length} 个问题：`)
  for (const p of problems) console.error(`  · ${p}`)
  process.exit(1)
}

console.log('\n✓ 通过')
