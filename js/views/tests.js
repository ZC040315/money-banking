// 测试中心与测试会话
import { esc, pct } from '../format.js'
import { chart } from '../charts.js'
import {
  chapters,
  chapterById,
  itemMeta,
  chapterQuiz,
  weeklyQuiz,
  allTestables,
  cardById,
} from '../data.js'
import { masteryOf, dueItems } from '../store.js'

const DIFFICULTY_LABELS = { basic: '基础', advanced: '进阶', challenge: '疑难' }
const LETTERS = ['A', 'B', 'C', 'D']

// 错题：最近一次答错的知识点或题目
function mistakeEntries(state) {
  const entries = []
  for (const [id, rec] of Object.entries(state.progress)) {
    if (!rec || rec.attempts === 0 || rec.lastCorrect !== false) continue
    const meta = itemMeta(id)
    if (!meta) continue
    let prompt = ''
    let options = []
    let answer = -1
    let explanation = ''
    const card = cardById.get(id)
    if (card && card.quiz) {
      prompt = card.quiz.q
      options = card.quiz.options
      answer = card.quiz.answer
      explanation = card.quiz.explanation
    } else {
      const testable = allTestables().find((item) => item.id === id)
      if (testable) {
        prompt = testable.prompt
        options = testable.options
        answer = testable.answer
        explanation = testable.explanation
      } else {
        const q = meta
        prompt = q.title
      }
    }
    entries.push({
      id,
      meta,
      prompt,
      options,
      answer,
      explanation,
      wrong: Math.max(0, rec.attempts - (rec.lastCorrect ? 1 : 0)),
    })
  }
  return entries.sort((a, b) => b.wrong - a.wrong)
}

// 薄弱知识点：答过、掌握度未满 80%
function weakEntries(state) {
  const list = []
  for (const [id, rec] of Object.entries(state.progress)) {
    if (!rec || rec.attempts === 0) continue
    if (masteryOf(id) >= 80) continue
    const meta = itemMeta(id)
    if (!meta) continue
    list.push({ id, meta, wrong: Math.max(0, rec.attempts - (rec.lastCorrect ? 1 : 0)), mastery: masteryOf(id) })
  }
  return list.sort((a, b) => b.wrong - a.wrong || a.mastery - b.mastery).slice(0, 8)
}

export function testCenter(ctx) {
  const { state, ui } = ctx
  const mistakes = mistakeEntries(state)
  const weak = weakEntries(state)
  const history = state.history.slice(0, 6)
  const selectedChapter = chapterById.get(ui.testChapter) ?? chapters[0]

  return `<div class="test-center">
    <section class="test-center__hero">
      <h1 class="test-center__title">测试中心</h1>
      <p class="test-center__desc">
        章节测试检验单章掌握，综合卷跨篇混合；答错的题自动进入错题集，未掌握的卡进入薄弱知识点表。
        所有题目都来自本页面的题库，不联网。
      </p>
    </section>

    <div class="test-center__grid">
      <section class="test-card">
        <h2 class="test-card__title">章节测试</h2>
        <p class="test-card__desc">从所选章节抽最多 6 道可判分题（选择 / 判断 / 报表），快速检验单章。</p>
        <label class="test-card__select">
          <span>选择章节</span>
          <select data-action="test-chapter-select">
            ${chapters
              .map(
                (ch) =>
                  `<option value="${ch.id}" ${ch.id === selectedChapter.id ? 'selected' : ''}>第 ${ch.num} 章 ${esc(
                    ch.title,
                  )}</option>`,
              )
              .join('')}
          </select>
        </label>
        <button type="button" class="btn btn--primary" data-action="start-chapter-test">开始章节测试</button>
      </section>

      <section class="test-card">
        <h2 class="test-card__title">综合卷</h2>
        <p class="test-card__desc">20 题，六篇混合，覆盖利率、机构、政策与理论，模拟考试节奏。</p>
        <button type="button" class="btn btn--primary" data-action="start-weekly-test">开始综合卷</button>
      </section>

      <section class="test-card">
        <h2 class="test-card__title">错题重做</h2>
        <p class="test-card__desc">${
          mistakes.length
            ? `当前累积 ${mistakes.length} 道错题，重做答对即视为订正。`
            : '还没有错题。做几套题，错的会自动收集到这里。'
        }</p>
        <button type="button" class="btn ${mistakes.length ? 'btn--primary' : 'btn--ghost'}"
          data-action="start-mistake-test" ${mistakes.length ? '' : 'disabled'}>开始重做</button>
      </section>

      ${
        history.length
          ? `<section class="test-card">
              <h2 class="test-card__title">最近成绩</h2>
              <ul class="test-history">
                ${history
                  .map(
                    (entry) => `<li class="test-history__item">
                      <span class="test-history__name">${esc(entry.title)}</span>
                      <span class="test-history__score">${entry.correct}/${entry.total} · ${pct(
                        entry.correct,
                        entry.total,
                      )}%</span>
                      <span class="test-history__date">${new Date(entry.ts).toLocaleDateString('zh-CN')}</span>
                    </li>`,
                  )
                  .join('')}
              </ul>
            </section>`
          : ''
      }
    </div>

    <section class="test-center__block">
      <h2 class="test-center__h2">错题集</h2>
      <p class="test-center__hint">最近一次答错的题会自动收集；就地重做，答对即订正。</p>
      ${
        mistakes.length
          ? `<div class="mistake-list">
              ${mistakes
                .slice(0, 6)
                .map((item) => {
                  const chosen = ui.answers[item.id]
                  const fixed = state.progress[item.id]?.lastCorrect === true
                  return `<article class="mistake-item">
                    <div class="mistake-item__head">
                      <span class="mistake-item__source">第 ${item.meta.chapterId.replace('ch', '')} 章 ${esc(
                        item.meta.chapterTitle,
                      )}</span>
                      <span class="mistake-item__count">错 ${item.wrong} 次</span>
                      ${fixed ? '<span class="mistake-item__fixed">已订正</span>' : ''}
                    </div>
                    <p class="mistake-item__prompt">${esc(item.prompt)}</p>
                    ${
                      item.options.length
                        ? `<div class="mistake-item__options">
                            ${item.options
                              .map((option, i) => {
                                const chosenThis = chosen === i
                                const isAnswer = i === item.answer
                                let cls = 'mistake-item__option'
                                if (chosenThis)
                                  cls += isAnswer
                                    ? ' mistake-item__option--correct'
                                    : ' mistake-item__option--wrong'
                                else if (chosen !== null && chosen !== undefined && isAnswer)
                                  cls += ' mistake-item__option--answer'
                                return `<button type="button" class="${cls}" ${
                                  chosen !== null && chosen !== undefined ? 'disabled' : ''
                                } data-action="answer" data-id="${item.id}" data-index="${i}">${LETTERS[i]} · ${esc(
                                  option,
                                )}</button>`
                              })
                              .join('')}
                          </div>
                          ${
                            chosen === null || chosen === undefined
                              ? ''
                              : `<p class="mistake-item__feedback">${
                                  chosen === item.answer ? '订正成功。' : '还是不对，正确答案是 ' + LETTERS[item.answer] + '。'
                                }${esc(item.explanation || '')}</p>`
                          }`
                        : `<p class="mistake-item__count">这是问答题，去 <a href="${item.meta.href}">章节页</a> 对照参考答案。</p>`
                    }
                  </article>`
                })
                .join('')}
            </div>`
          : `<p class="test-empty">还没有错题集内容。</p>`
      }
    </section>

    <section class="test-center__block">
      <h2 class="test-center__h2">薄弱知识点收集表</h2>
      <p class="test-center__hint">答过但掌握度未到 80% 的知识点，点击可跳转复习。</p>
      ${
        weak.length
          ? `<div class="weak-table">
              <div class="weak-table__head"><span>知识点</span><span>章节</span><span>掌握度</span><span></span></div>
              <div class="weak-table__list">
                ${weak
                  .map(
                    (item) => `<div class="weak-table__row">
                      <span class="weak-table__title">${esc(item.meta.title)}</span>
                      <span class="weak-table__chapter">第 ${item.meta.chapterId.replace('ch', '')} 章 ${esc(
                        item.meta.chapterTitle,
                      )}</span>
                      <span class="weak-table__count">${item.mastery}%</span>
                      <a class="weak-table__go" href="${item.meta.href}">去复习</a>
                    </div>`,
                  )
                  .join('')}
              </div>
            </div>`
          : `<p class="test-empty">还没有薄弱知识点——先去做一两套题。</p>`
      }
    </section>
  </div>`
}

// ------------------------------------------------------------
// 测试会话
// ------------------------------------------------------------
export function testSession(ctx) {
  const { ui, state } = ctx
  const session = ui.session
  if (!session || !session.items.length) {
    return `<div class="review-empty">
      <h2 class="review-empty__title">请从测试中心开始</h2>
      <p class="review-empty__desc">直接打开这个地址不会保留做题进度。</p>
      <a class="btn btn--primary" href="#/test">返回测试中心</a>
    </div>`
  }

  if (session.done) {
    const total = session.items.length
    const correct = session.answers.filter((a) => a.correct).length
    const rate = pct(correct, total)
    return `<div class="test-result">
      <p class="test-result__kicker">测试完成</p>
      <h2 class="test-result__title">${esc(session.title)}</h2>
      <div class="test-result__score">
        <span class="test-result__number">${correct}</span>
        <span class="test-result__of">/ ${total}</span>
      </div>
      <p class="test-result__rate">正确率 ${rate}% · 错题已进入错题集</p>
      <ul class="test-result__list">
        ${session.items
          .map((item, index) => {
            const answer = session.answers[index]
            return `<li class="test-result__item ${answer?.correct ? 'test-result__item--ok' : 'test-result__item--bad'}">
              <span class="test-result__mark">${answer?.correct ? '✓' : '✗'}</span>
              <span class="test-result__text">${esc(item.prompt)}</span>
            </li>`
          })
          .join('')}
      </ul>
      <div class="test-result__actions">
        <button type="button" class="btn btn--primary" data-action="session-restart">再来一套</button>
        <a class="btn btn--ghost" href="#/test">返回测试中心</a>
      </div>
    </div>`
  }

  const item = session.items[session.index]
  const chosen = session.answers[session.index]?.chosen
  const answered = chosen !== null && chosen !== undefined
  const isLast = session.index === session.items.length - 1
  const progress = Math.round(((session.index + (answered ? 1 : 0)) / session.items.length) * 100)

  return `<div class="test-session">
    <header class="test-session__head">
      <div>
        <p class="test-session__meta">${esc(session.title)} · 第 ${session.index + 1}/${session.items.length} 题</p>
        <h2 class="test-session__title">${esc(item.prompt)}</h2>
      </div>
      <span class="test-session__progress">${progress}%</span>
    </header>
    <div class="test-session__bar"><span style="width:${progress}%"></span></div>
    ${item.chart ? chart(item.chart, item.chartCaption) : ''}
    ${
      item.table
        ? `<div class="report-table">
            <p class="report-table__title">${esc(item.table.title)}</p>
            <div class="report-table__wrap"><table>
              <thead><tr>${item.table.columns.map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead>
              <tbody>${item.table.rows
                .map((row) => `<tr>${row.map((cell) => `<td>${esc(cell)}</td>`).join('')}</tr>`)
                .join('')}</tbody>
            </table></div>
          </div>`
        : ''
    }
    <div class="test-session__options">
      ${item.options
        .map((option, index) => {
          const chosenThis = chosen === index
          const isAnswer = index === item.answer
          let cls = 'test-session__option'
          if (chosenThis) cls += isAnswer ? ' test-session__option--correct' : ' test-session__option--wrong'
          else if (answered && isAnswer) cls += ' test-session__option--answer'
          return `<button type="button" class="${cls}" ${answered ? 'disabled' : ''}
            data-action="session-pick" data-index="${index}">
            <span class="test-session__option-label">${LETTERS[index] ?? index + 1}</span>
            <span>${esc(option)}</span>
          </button>`
        })
        .join('')}
    </div>
    ${
      answered
        ? `<div class="test-session__foot">
            <p class="test-session__feedback ${
              chosen === item.answer
                ? 'test-session__feedback--correct'
                : 'test-session__feedback--wrong'
            }">${chosen === item.answer ? '答对了。' : `答错了，正确答案是 ${LETTERS[item.answer]}。`}${esc(
              item.explanation || '',
            )}</p>
            <button type="button" class="btn btn--primary" data-action="session-next">${isLast ? '交卷' : '下一题'}</button>
          </div>`
        : ''
    }
  </div>`
}

export { chapterQuiz, weeklyQuiz, mistakeEntries }
