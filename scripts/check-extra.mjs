// 单章题库校验：node scripts/check-extra.mjs data/extra/ch01.js [更多文件…]
// 供生成题库的 agent 自查，也可单独跑。
import { readFileSync } from 'node:fs'
import { basename } from 'node:path'
import { pathToFileURL } from 'node:url'
import { chapters } from '../js/data.js'

const problems = []
const warnings = []

function chapterIdOf(file) {
  const match = basename(file).match(/^ch(\d+)\.js$/)
  return match ? `ch${parseInt(match[1], 10)}` : null
}

function normalize(text) {
  return String(text || '')
    .replace(/[\s，。、；：！？"'（）()【】\[\]…—-]/g, '')
    .toLowerCase()
}

const files = process.argv.slice(2)
if (!files.length) {
  console.error('用法：node scripts/check-extra.mjs data/extra/ch01.js')
  process.exit(1)
}

for (const file of files) {
  const chapterId = chapterIdOf(file)
  if (!chapterId) {
    problems.push(`${file}: 文件名必须是 chNN.js`)
    continue
  }
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
  const list = mod.extra
  if (!Array.isArray(list)) {
    problems.push(`${file}: 必须 export const extra = []`)
    continue
  }

  const seenIds = new Set()
  const seenPrompts = new Map()
  const basePrompts = chapter.questions
    .filter((q) => !/-e\d+$/.test(q.id))
    .map((q) => normalize(q.prompt))

  const stats = { basic: 0, advanced: 0, challenge: 0, choice: 0, truefalse: 0, essay: 0, report: 0 }
  const answerSpread = [0, 0, 0, 0]

  for (const [index, q] of list.entries()) {
    const flag = `${basename(file)} 第 ${index + 1} 题 (${q?.id ?? '无 id'})`
    if (!q || typeof q !== 'object') {
      problems.push(`${flag}: 不是对象`)
      continue
    }
    if (!new RegExp(`^${chapterId}-e\\d{2}$`).test(q.id || '')) {
      problems.push(`${flag}: id 应形如 ${chapterId}-e01`)
    }
    if (seenIds.has(q.id)) problems.push(`${flag}: id 重复`)
    seenIds.add(q.id)

    if (!['basic', 'advanced', 'challenge'].includes(q.difficulty)) {
      problems.push(`${flag}: difficulty 非法`)
    } else {
      stats[q.difficulty] += 1
    }

    if (!['choice', 'truefalse', 'essay', 'report'].includes(q.type)) {
      problems.push(`${flag}: type 非法`)
      continue
    }
    stats[q.type] += 1

    if (!q.prompt || normalize(q.prompt).length < 5) {
      problems.push(`${flag}: prompt 太短`)
    } else {
      const key = normalize(q.prompt)
      if (seenPrompts.has(key)) problems.push(`${flag}: 与第 ${seenPrompts.get(key) + 1} 题题干重复`)
      seenPrompts.set(key, index)
      if (basePrompts.includes(key)) problems.push(`${flag}: 与已有题题干重复`)
    }

    if (q.type !== 'essay' && (typeof q.explanation !== 'string' || q.explanation.trim().length < 8)) {
      problems.push(`${flag}: 缺解析或解析过短`)
    }

    if (q.type === 'choice' || q.type === 'report') {
      if (q.type === 'report') {
        if (!q.table || !Array.isArray(q.table.columns) || !Array.isArray(q.table.rows)) {
          problems.push(`${flag}: 报表题缺 table`)
        } else {
          if (!q.table.columns.length) problems.push(`${flag}: 表格没有列`)
          for (const row of q.table.rows) {
            if (row.length !== q.table.columns.length) problems.push(`${flag}: 表格列数不一致`)
          }
          if (!q.table.title) problems.push(`${flag}: 表格缺 title`)
        }
        if (q.answerMode !== 'choice') {
          problems.push(`${flag}: 报表题需 answerMode: 'choice'（本站只支持选项式判分）`)
        }
      }
      if (!Array.isArray(q.options) || q.options.length !== 4) {
        problems.push(`${flag}: 必须有 4 个选项`)
      } else {
        if (new Set(q.options.map((o) => String(o).trim())).size !== 4) {
          problems.push(`${flag}: 选项有重复`)
        }
        for (const option of q.options) {
          if (!String(option || '').trim()) problems.push(`${flag}: 存在空选项`)
        }
        if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer > 3) {
          problems.push(`${flag}: answer 必须是 0–3 的整数`)
        } else {
          answerSpread[q.answer] += 1
        }
      }
    }

    if (q.type === 'truefalse') {
      if (typeof q.answer !== 'boolean') problems.push(`${flag}: 判断题 answer 必须是 true/false`)
      if (q.options) problems.push(`${flag}: 判断题不要写 options`)
    }

    if (q.type === 'essay') {
      if (!q.reference || q.reference.trim().length < 20) {
        problems.push(`${flag}: 问答题需要 reference（≥20 字参考答案）`)
      }
      if (q.options || q.answer !== undefined) {
        problems.push(`${flag}: 问答题不要写 options/answer`)
      }
    }

    if (q.chart) {
      warnings.push(`${flag}: 引用了图表 ${q.chart}，请确认 js/charts.js 里存在`)
    }
  }

  const total = list.length
  if (total < 20) problems.push(`${file}: 只有 ${total} 题，要求 ≥20（目标 22）`)
  if (stats.basic < 6) problems.push(`${file}: 基础题只有 ${stats.basic}，至少 6`)
  if (stats.advanced < 4) problems.push(`${file}: 进阶题只有 ${stats.advanced}，至少 4`)
  if (stats.challenge < 1) problems.push(`${file}: 疑难/辨析题至少 1`)
  if (stats.truefalse < 2) problems.push(`${file}: 判断题至少 2`)
  if (stats.essay < 1) problems.push(`${file}: 简答/名词解释至少 1`)
  if (stats.report < 1) problems.push(`${file}: 报表/计算题至少 1`)

  const answered = answerSpread.reduce((a, b) => a + b, 0)
  if (answered >= 8) {
    const top = Math.max(...answerSpread)
    if (top / answered > 0.6) {
      problems.push(`${file}: 正确答案过度集中在某一项（${top}/${answered}），请打散`)
    }
  }

  console.log(
    `${file}: ${total} 题 · 基础${stats.basic}/进阶${stats.advanced}/疑难${stats.challenge} · 选${stats.choice}/判${stats.truefalse}/答${stats.essay}/报${stats.report}`,
  )
}

if (warnings.length) {
  console.log('\n提示：')
  for (const warning of warnings) console.log(`  · ${warning}`)
}

if (problems.length) {
  console.error(`\n✗ ${problems.length} 个问题：`)
  for (const problem of problems) console.error(`  · ${problem}`)
  process.exit(1)
}

console.log('\n✓ 通过')
