// 浏览类页面：首页、知识地图、章节页、知识点页、复习、公式速查
import { esc, pct, formatDate } from '../format.js'
import { chart } from '../charts.js'
import {
  curriculum,
  chapters,
  chapterById,
  cardById,
  relatedCards,
  totals,
} from '../data.js'
import {
  chapterMastery,
  chapterStatus,
  masteryOf,
  STATUS_LABELS,
  longestStreak,
} from '../store.js'
import { achievementsPanel, masteryBar, statusDot } from './shell.js'
import { buildReviewQueue, kindLabel } from '../review.js'
import { CHEATSHEET } from '../cheatsheet.js'

// ------------------------------------------------------------
// 侧栏：复习条 + 六篇章节树 + 成就
// ------------------------------------------------------------
export function sidebar(ctx) {
  const { route, state, stats } = ctx
  const selectedId = route.params.id ?? state.lastChapter

  const tree = curriculum
    .map((part) => {
      const list = chapters.filter((ch) => ch.partId === part.id)
      const rows = list
        .map((ch) => {
          const mastery = chapterMastery(ch.cards)
          const status = chapterStatus(mastery)
          return `<a class="chapter-row${ch.id === selectedId ? ' chapter-row--selected' : ''}" href="#/chapter/${ch.id}">
            <span class="chapter-row__index">${String(ch.num).padStart(2, '0')}</span>
            <span class="chapter-row__body">
              <span class="chapter-row__title">${esc(ch.title)}</span>
              <span class="chapter-row__meta">
                ${statusDot(status)}
                <span class="chapter-row__status">${STATUS_LABELS[status]}</span>
                ${masteryBar(mastery)}
              </span>
            </span>
          </a>`
        })
        .join('')
      return `<section class="map-tree">
        <div class="map-tree__head">
          <h3 class="map-tree__title">第 ${part.num} 篇 · ${esc(part.title)}</h3>
          <span class="map-tree__count">${list.length} 章</span>
        </div>
        <div class="map-tree__list">${rows}</div>
      </section>`
    })
    .join('')

  return `<aside class="map-panel">
    <div class="review-banner${stats.due === 0 ? ' review-banner--empty' : ''}">
      <span class="review-banner__text">${
        stats.due > 0 ? `<strong>${stats.due}</strong> 项到期` : '今日没有到期的内容'
      }</span>
      ${
        stats.due > 0
          ? `<button type="button" class="review-banner__start" data-action="start-review">开始复习</button>`
          : `<a class="review-banner__start" href="#/review">复习页</a>`
      }
    </div>
    <details class="map-fold" open>
      <summary class="map-fold__summary">章节目录 · 6 篇 ${totals.chapters} 章</summary>
      ${tree}
    </details>
    ${achievementsPanel(state)}
  </aside>`
}

// ------------------------------------------------------------
// 首页
// ------------------------------------------------------------
export function homePage(ctx) {
  const { state, stats } = ctx
  const last = chapterById.get(state.lastChapter) ?? chapters[0]
  const partMastery = (part) => {
    const list = chapters.filter((ch) => ch.partId === part.id && ch.cards.length)
    if (!list.length) return 0
    return Math.round(list.reduce((sum, ch) => sum + chapterMastery(ch.cards), 0) / list.length)
  }
  const weak = [...chapters]
    .filter((ch) => ch.cards.length)
    .map((ch) => ({ ...ch, mastery: chapterMastery(ch.cards) }))
    .sort((a, b) => a.mastery - b.mastery)
    .slice(0, 3)

  return `<div class="home">
      <section class="home__hero">
        <p class="home__eyebrow">米什金《货币金融学》· 第十一版 · 6 篇 ${totals.chapters} 章</p>
        <h1 class="home__title">把货币、利率与央行<br />读成一张可以走通的地图</h1>
        <p class="home__sub">
          按教材的六篇结构组织 ${totals.cards} 张回忆卡与 ${totals.questions} 道分层题：
          先回忆、再看答案，用间隔重复把「利率—金融机构—货币政策—货币理论」串成一条线。
        </p>
        <div class="home__actions">
          <a class="btn btn--primary" href="#/chapter/${last.id}">继续学习 · 第 ${last.num} 章 ${esc(last.title)}</a>
          <a class="btn btn--ghost" href="#/map">浏览知识地图</a>
          <a class="btn btn--ghost" href="#/review">${
            stats.due > 0 ? `开始复习（${stats.due} 张到期）` : '快速复习'
          }</a>
        </div>
      </section>

      <section class="home__section">
        <div class="home__section-head">
          <h2 class="home__h2">学习进度</h2>
          <span class="home__more">数据保存在本机浏览器，换设备不会同步</span>
        </div>
        <div class="home__stats">
          <div class="home__stat-card">
            <span class="home__stat-value">${stats.mastery}%</span>
            <span class="home__stat-label">全书掌握度</span>
            <div class="home__bar"><span style="width:${stats.mastery}%"></span></div>
          </div>
          <div class="home__stat-card">
            <span class="home__stat-value">${stats.correct}/${totals.cards}</span>
            <span class="home__stat-label">已掌握知识点</span>
            <div class="home__bar"><span style="width:${pct(stats.correct, totals.cards)}%"></span></div>
          </div>
          <div class="home__stat-card">
            <span class="home__stat-value${stats.due > 0 ? ' home__stat-value--review' : ''}">${stats.due}</span>
            <span class="home__stat-label">今日待复习</span>
            <a class="home__stat-link" href="#/review">${stats.due > 0 ? '去复习 →' : '暂无到期'}</a>
          </div>
        </div>
      </section>

      <section class="home__section">
        <div class="home__section-head">
          <h2 class="home__h2">六篇结构</h2>
          <a class="home__more" href="#/map">查看全部 →</a>
        </div>
        <div class="home__tracks">
          ${curriculum
            .map((part) => {
              const mastery = partMastery(part)
              return `<a class="home__track" href="#/chapter/${part.chapters[0].id}">
                <div class="home__track-top">
                  <h3>第 ${part.num} 篇 · ${esc(part.title)}</h3>
                  <span>${part.chapters.length} 章</span>
                </div>
                <p>${esc(part.desc)}</p>
                <div class="home__bar"><span style="width:${mastery}%"></span></div>
                <span class="home__track-mastery">${mastery}% 掌握</span>
              </a>`
            })
            .join('')}
        </div>
      </section>

      <section class="home__section">
        <div class="home__section-head">
          <h2 class="home__h2">最薄弱的章节</h2>
          <span class="home__more">掌握度最低的三章，建议优先复习</span>
        </div>
        <div class="home__weak">
          ${weak
            .map(
              (ch) => `<a class="home__weak-item" href="#/chapter/${ch.id}">
                <span class="home__weak-title">第 ${ch.num} 章 ${esc(ch.title)}</span>
                <span class="home__weak-bar"><span style="width:${ch.mastery}%"></span></span>
                <span class="home__weak-value">${ch.mastery}%</span>
              </a>`,
            )
            .join('')}
        </div>
      </section>
    </div>`
}

// ------------------------------------------------------------
// 知识节点图
// ------------------------------------------------------------
export function knowledgeMapPage(ctx) {
  const { state } = ctx
  const COL_W = 220
  const X0 = 140
  const Y0 = 118
  const CHAPTER_GAP = 116
  const nodes = []
  const links = []

  curriculum.forEach((part, pi) => {
    const x = X0 + pi * COL_W
    nodes.push({
      type: 'label',
      x,
      y: 76,
      text: `第 ${part.num} 篇 ${part.title}`,
      href: null,
    })
    const list = chapters.filter((ch) => ch.partId === part.id)
    list.forEach((ch, ci) => {
      const y = Y0 + ci * CHAPTER_GAP
      const mastery = chapterMastery(ch.cards)
      nodes.push({
        type: 'chapter',
        id: ch.id,
        x,
        y,
        title: ch.title,
        num: ch.num,
        mastery,
        status: chapterStatus(mastery),
        href: `#/chapter/${ch.id}`,
      })
      const span = ch.cards.length
      const spread = span > 1 ? Math.min(46, 176 / (span - 1)) : 0
      const radius = span > 5 ? 6.5 : 9
      ch.cards.forEach((card, ki) => {
        const cx = x + (ki - (span - 1) / 2) * spread
        const cy = y + 54
        const rec = state.progress[card.id]
        const status = rec?.correct ? 'mastered' : rec?.attempts > 0 ? 'review' : 'not-started'
        nodes.push({
          type: 'knowledge',
          id: card.id,
          x: cx,
          y: cy,
          r: radius,
          title: card.title,
          status,
          href: `#/knowledge/${card.id}`,
        })
        links.push({ from: { x, y }, to: { x: cx, y: cy } })
      })
    })
  })

  const maxHeight = Math.max(...nodes.map((n) => n.y)) + 70
  const width = X0 + (curriculum.length - 1) * COL_W + 130
  const height = Math.max(560, maxHeight)

  const linkSvg = links
    .map((l) => `<line x1="${l.from.x}" y1="${l.from.y + 22}" x2="${l.to.x}" y2="${l.to.y - 10}" class="km-edge" />`)
    .join('')

  const nodeSvg = nodes
    .map((node) => {
      if (node.type === 'label') {
        return `<text x="${node.x}" y="${node.y}" text-anchor="middle" class="km-cluster-label">${esc(node.text)}</text>`
      }
      if (node.type === 'chapter') {
        return `<a class="km-link" href="${node.href}">
          <g class="km-chapter">
            <rect x="${node.x - 98}" y="${node.y - 21}" width="196" height="42" rx="11"
              fill="var(--color-surface)" stroke="var(--color-${node.status === 'not-started' ? 'muted' : node.status})" stroke-width="1.8" />
            <text x="${node.x}" y="${node.y - 3}" text-anchor="middle" class="km-chapter-title">${node.num}. ${esc(
              node.title.length > 15 ? `${node.title.slice(0, 15)}…` : node.title,
            )}</text>
            <text x="${node.x}" y="${node.y + 14}" text-anchor="middle" class="km-chapter-mastery">掌握 ${node.mastery}%</text>
          </g>
        </a>`
      }
      return `<a class="km-link" href="${node.href}">
        <g class="km-knowledge">
          <circle cx="${node.x}" cy="${node.y}" r="${node.r}" fill="var(--color-surface)"
            stroke="var(--color-${node.status === 'not-started' ? 'muted' : node.status})" stroke-width="2.2" />
          <title>${esc(node.title)}</title>
        </g>
      </a>`
    })
    .join('')

  const t = ctx.ui.map
  return `<div class="knowledge-map">
    <div class="knowledge-map__toolbar">
      <span class="knowledge-map__legend">
        <span class="legend-dot legend-dot--muted"></span> 未学习
        <span class="legend-dot legend-dot--learning"></span> 学习中
        <span class="legend-dot legend-dot--mastered"></span> 已掌握
        <span class="legend-dot legend-dot--review"></span> 待复习
      </span>
      <button type="button" class="btn btn--ghost btn--sm" data-action="map-reset">复位视图</button>
    </div>
    <div class="knowledge-map__canvas" id="map-canvas">
      <svg viewBox="0 0 ${width} ${height}" width="100%" style="display:block;touch-action:none">
        <g id="map-group" transform="translate(${t.x} ${t.y}) scale(${t.scale})">${linkSvg}${nodeSvg}</g>
      </svg>
    </div>
    <p class="knowledge-map__hint">滚轮缩放 · 拖拽平移 · 点击方框进入章节、点击圆点进入知识点</p>
  </div>`
}

// ------------------------------------------------------------
// 章节页
// ------------------------------------------------------------
const DIFFICULTY_LABELS = { basic: '基础', advanced: '进阶', challenge: '疑难' }
const TYPE_LABELS = { choice: '选择题', truefalse: '判断题', essay: '问答题', report: '报表题' }

function optionsHtml(item, chosen, idPrefix) {
  const labels = ['A', 'B', 'C', 'D']
  return `<div class="question-card__options">
    ${item.options
      .map((option, index) => {
        const chosenThis = chosen === index
        const isAnswer = index === item.answer
        let cls = 'question-card__option'
        if (chosenThis) cls += isAnswer ? ' question-card__option--correct' : ' question-card__option--wrong'
        else if (chosen !== null && chosen !== undefined && isAnswer) cls += ' question-card__option--answer'
        return `<button type="button" class="${cls}" ${chosen !== null && chosen !== undefined ? 'disabled' : ''}
          data-action="answer" data-id="${item.id}" data-index="${index}">
          <span class="question-card__option-label">${labels[index] ?? index + 1}</span>
          <span>${esc(option)}</span>
        </button>`
      })
      .join('')}
  </div>`
}

function feedbackHtml(item, chosen) {
  if (chosen === null || chosen === undefined) return ''
  const ok = chosen === item.answer
  const label = ['A', 'B', 'C', 'D'][item.answer] ?? ''
  return `<p class="question-card__feedback ${
    ok ? 'question-card__feedback--correct' : 'question-card__feedback--wrong'
  }">${ok ? '答对了。' : `答错了，正确答案是 ${label}。`}${esc(item.explanation || '')}</p>`
}

export function questionCard(ctx, q, index) {
  const { ui } = ctx
  const chosen = ui.answers[q.id]
  const isEssay = q.type === 'essay'
  const revealed = ui.revealed.has(q.id)
  const self = ui.selfcheck[q.id]
  const done = ctx.state.progress[q.id]?.correct === true
  // 判断题在原始数据里没有 options、答案是布尔值，这里归一化成二选一
  const view =
    q.type === 'truefalse'
      ? { ...q, options: ['正确', '错误'], answer: q.answer ? 0 : 1 }
      : q

  const body = isEssay
    ? `<div class="question-card__essay">
        ${q.hint ? `<p class="question-card__hint">提示：${esc(q.hint)}</p>` : ''}
        ${
          revealed
            ? `<div class="question-card__reference">
                <span class="question-card__reference-label">参考答案</span>
                <p>${esc(q.reference || q.explanation || '')}</p>
              </div>
              <div class="question-card__selfcheck">
                <span>对照参考答案，你答对了吗？</span>
                <button type="button" class="question-card__selfcheck-btn question-card__selfcheck-btn--yes" data-action="selfcheck" data-id="${q.id}" data-ok="1">答对了</button>
                <button type="button" class="question-card__selfcheck-btn question-card__selfcheck-btn--no" data-action="selfcheck" data-id="${q.id}" data-ok="0">没答对</button>
              </div>`
            : `<button type="button" class="question-card__show-answer" data-action="reveal" data-id="${q.id}">先想一想，再看参考答案</button>`
        }
        ${
          self === true
            ? `<p class="question-card__feedback question-card__feedback--correct">已记为掌握，会进入复习队列。</p>`
            : self === false
              ? `<p class="question-card__feedback question-card__feedback--wrong">已记为待复习，稍后会再出现。</p>`
              : ''
        }
      </div>`
    : `${optionsHtml(view, chosen, 'q')}${feedbackHtml(view, chosen)}`

  return `<article class="question-card">
    <header class="question-card__head">
      <span class="question-card__difficulty question-card__difficulty--${q.difficulty}">${DIFFICULTY_LABELS[q.difficulty]}</span>
      <span class="question-card__type">${q.type === 'report' ? '报表分析题' : TYPE_LABELS[q.type] || '题目'}</span>
      ${q.chart ? '<span class="question-card__chart-tag">图形题</span>' : ''}
      ${q.table ? '<span class="question-card__chart-tag">表格题</span>' : ''}
      ${done ? '<span class="question-card__done">已掌握</span>' : ''}
    </header>
    <p class="question-card__title"><span class="question-card__num">${index + 1}.</span>${esc(q.prompt)}</p>
    ${q.chart ? chart(q.chart, q.chartCaption) : ''}
    ${
      q.table
        ? `<div class="report-table">
            <p class="report-table__title">${esc(q.table.title)}</p>
            <div class="report-table__wrap"><table>
              <thead><tr>${q.table.columns.map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead>
              <tbody>${q.table.rows
                .map((row) => `<tr>${row.map((cell) => `<td>${esc(cell)}</td>`).join('')}</tr>`)
                .join('')}</tbody>
            </table></div>
          </div>`
        : ''
    }
    ${body}
  </article>`
}

function recallCardHtml(ctx, card, index) {
  const { ui, state } = ctx
  const flipped = ui.flipped.has(card.id)
  const chosen = ui.answers[card.id]
  const done = state.progress[card.id]?.correct === true
  const params = []

  if (card.formula) {
    params.push(`<div class="recall-card__section"><span class="recall-card__label">公式</span><p class="recall-card__formula">${esc(card.formula)}</p></div>`)
  }
  const quizHtml = card.quiz
    ? `<div class="recall-card__section">
        <span class="recall-card__label">速测</span>
        <p class="recall-card__question">${esc(card.quiz.q)}</p>
        <div class="recall-card__options">
          ${card.quiz.options
            .map((option, i) => {
              const chosenThis = chosen === i
              const isAnswer = i === card.quiz.answer
              let cls = 'recall-card__option'
              if (chosenThis) cls += isAnswer ? ' recall-card__option--correct' : ' recall-card__option--wrong'
              else if (chosen !== null && chosen !== undefined && isAnswer) cls += ' recall-card__option--answer'
              return `<button type="button" class="${cls}" ${chosen !== null && chosen !== undefined ? 'disabled' : ''}
                data-action="answer" data-id="${card.id}" data-index="${i}">
                <span class="recall-card__option-label">${'ABCD'[i]}</span><span>${esc(option)}</span>
              </button>`
            })
            .join('')}
        </div>
        ${
          chosen === null || chosen === undefined
            ? ''
            : `<p class="recall-card__feedback ${
                chosen === card.quiz.answer ? 'recall-card__feedback--correct' : 'recall-card__feedback--wrong'
              }">${chosen === card.quiz.answer ? '答对了。' : '答错了。'}${esc(card.quiz.explanation)}</p>`
        }
      </div>`
    : ''

  return `<article class="recall-card">
    <div class="recall-card__head">
      <span class="recall-card__index">${String(index + 1).padStart(2, '0')}</span>
      <div>
        <h3 class="recall-card__title"><a href="#/knowledge/${card.id}" style="color:inherit;text-decoration:none">${esc(card.title)}</a></h3>
        <p class="recall-card__recall">${esc(card.recall)}</p>
      </div>
      ${done ? '<span class="recall-card__done">已掌握</span>' : masteryOf(card.id) > 0 ? `<span class="recall-card__done">掌握 ${masteryOf(card.id)}%</span>` : ''}
    </div>
    ${
      flipped
        ? `<div class="recall-card__body">
            <div class="recall-card__section"><span class="recall-card__label">一句话定义</span><p>${esc(card.definition)}</p></div>
            <div class="recall-card__section"><span class="recall-card__label">例子 / 机制</span><p>${esc(card.example)}</p></div>
            ${params.join('')}
            ${card.chart ? chart(card.chart, card.chartCaption) : ''}
            ${quizHtml}
          </div>`
        : `<button type="button" class="recall-card__reveal" data-action="flip" data-id="${card.id}">先在心里答一遍，再翻开</button>`
    }
  </article>`
}

export function chapterPage(ctx) {
  const { route, state, ui } = ctx
  const chapter = chapterById.get(route.params.id) ?? chapters[0]
  const mastery = chapterMastery(chapter.cards)
  const answered = chapter.cards.filter((card) => state.progress[card.id]?.attempts > 0).length
  const DIFF_ORDER = { basic: 0, advanced: 1, challenge: 2 }
  const sortedQuestions = [...chapter.questions].sort(
    (a, b) =>
      (DIFF_ORDER[a.difficulty] ?? 9) - (DIFF_ORDER[b.difficulty] ?? 9) ||
      a.id.localeCompare(b.id, 'en', { numeric: true }),
  )
  const counts = {
    all: sortedQuestions.length,
    basic: sortedQuestions.filter((q) => q.difficulty === 'basic').length,
    advanced: sortedQuestions.filter((q) => q.difficulty === 'advanced').length,
    challenge: sortedQuestions.filter((q) => q.difficulty === 'challenge').length,
    chart: sortedQuestions.filter((q) => q.chart).length,
  }
  const filters = [
    { key: 'all', label: '全部' },
    { key: 'basic', label: '基础' },
    { key: 'advanced', label: '进阶' },
    { key: 'challenge', label: '疑难' },
    ...(counts.chart ? [{ key: 'chart', label: '图形' }] : []),
  ].map((item) => ({ ...item, count: counts[item.key] }))
  const visible = sortedQuestions.filter((q) =>
    ui.filter === 'all'
      ? true
      : ui.filter === 'chart'
        ? Boolean(q.chart)
        : q.difficulty === ui.filter,
  )
  const PRACTICE_LIMIT = 10
  const shown = ui.expanded ? visible : visible.slice(0, PRACTICE_LIMIT)
  const hiddenCount = visible.length - shown.length

  return `<article class="chapter-detail">
    <header>
      <p class="chapter-detail__meta">第 ${chapter.partNum} 篇 · 第 ${chapter.num} 章 · 掌握度 ${mastery}% · 已答 ${answered}/${chapter.cards.length}</p>
      <h1 class="chapter-detail__title">${esc(chapter.title)}</h1>
      <p class="chapter-detail__desc">${esc(chapter.intro || '')}</p>
      ${
        chapter.focus
          ? `<div class="chapter-points">${chapter.focus
              .map((f) => `<span class="chapter-points__item">${esc(f)}</span>`)
              .join('')}</div>`
          : ''
      }
    </header>

    <div class="chapter-detail__list">
      ${chapter.cards.map((card, index) => recallCardHtml(ctx, card, index)).join('')}
    </div>

    <section class="practice">
      <div class="practice__head">
        <div>
          <h2 class="practice__title">分层题库<span class="practice__total">${counts.all} 题</span></h2>
          <p class="practice__desc">基础 / 进阶 / 疑难三档；问答题先自己写，再对照参考答案自评</p>
        </div>
        <div class="practice__filters">
          ${filters
            .map(
              (f) =>
                `<button type="button" class="practice__filter${
                  ui.filter === f.key ? ' practice__filter--active' : ''
                }" data-action="filter" data-filter="${f.key}">${f.label}<span class="practice__filter-count">${f.count}</span></button>`,
            )
            .join('')}
        </div>
      </div>
      <div class="practice__list">
        ${shown.map((q, index) => questionCard(ctx, q, index)).join('')}
        ${
          hiddenCount > 0
            ? `<button type="button" class="btn btn--ghost btn--block" data-action="expand-practice">展开剩余 ${hiddenCount} 题</button>`
            : ''
        }
      </div>
    </section>

    <p class="chapter-detail__note">答题结果与掌握度保存在本机；答对的卡会按 1/2/4/8/16 天的间隔重新出现。</p>
  </article>`
}

// ------------------------------------------------------------
// 知识点页
// ------------------------------------------------------------
export function knowledgePage(ctx) {
  const { route, state, ui } = ctx
  const card = cardById.get(route.params.id)
  if (!card) {
    return `<div class="empty-state"><p>没有找到这个知识点。</p></div>`
  }
  const chapter = chapterById.get(card.chapterId)
  const related = relatedCards(card.related)
  const chosen = ui.answers[card.id]
  const done = state.progress[card.id]?.correct === true

  return `<article class="knowledge-page">
    <nav class="knowledge-page__crumb" aria-label="面包屑">
      <a href="#/map">知识地图</a><span aria-hidden="true">/</span>
      <a href="#/chapter/${chapter.id}">第 ${chapter.num} 章 ${esc(chapter.title)}</a>
    </nav>

    <header class="knowledge-page__head">
      <h1 class="knowledge-page__title">${esc(card.title)}</h1>
      <p class="knowledge-page__one">${esc(card.definition)}</p>
    </header>

    <section class="knowledge-block">
      <h2 class="knowledge-block__title">核心概念</h2>
      <p class="knowledge-block__recall">${esc(card.recall)}</p>
      <p class="knowledge-block__text">${esc(card.example)}</p>
      ${card.chart ? chart(card.chart, card.chartCaption) : ''}
    </section>

    ${
      card.formula
        ? `<section class="knowledge-block">
            <h2 class="knowledge-block__title">公式</h2>
            <p class="knowledge-block__formula">${esc(card.formula)}</p>
          </section>`
        : ''
    }

    ${
      card.keyPoint
        ? `<section class="knowledge-block knowledge-block--key">
            <h2 class="knowledge-block__title">⭐ 考试重点</h2>
            <p class="knowledge-block__text">${esc(card.keyPoint)}</p>
          </section>`
        : ''
    }

    ${
      card.mistake
        ? `<section class="knowledge-block knowledge-block--mistake">
            <h2 class="knowledge-block__title">⚠️ 高频易错</h2>
            <p class="knowledge-block__text">${esc(card.mistake)}</p>
          </section>`
        : ''
    }

    <section class="knowledge-block">
      <h2 class="knowledge-block__title">速测题</h2>
      <p class="knowledge-block__question">${esc(card.quiz.q)}</p>
      <div>
        ${card.quiz.options
          .map((option, i) => {
            const chosenThis = chosen === i
            const isAnswer = i === card.quiz.answer
            let cls = 'knowledge-block__option'
            if (chosenThis) cls += isAnswer ? ' knowledge-block__option--correct' : ' knowledge-block__option--wrong'
            else if (chosen !== null && chosen !== undefined && isAnswer) cls += ' knowledge-block__option--answer'
            return `<button type="button" class="${cls}" ${chosen !== null && chosen !== undefined ? 'disabled' : ''}
              data-action="answer" data-id="${card.id}" data-index="${i}">
              <span class="knowledge-block__option-label">${'ABCD'[i]}</span><span>${esc(option)}</span>
            </button>`
          })
          .join('')}
      </div>
      ${
        chosen === null || chosen === undefined
          ? ''
          : `<p class="knowledge-block__feedback ${
              chosen === card.quiz.answer
                ? 'knowledge-block__feedback--correct'
                : 'knowledge-block__feedback--wrong'
            }">${chosen === card.quiz.answer ? '答对了。' : '答错了。'}${esc(card.quiz.explanation)}</p>`
      }
      ${done ? '<span class="knowledge-block__done">已掌握</span>' : ''}
    </section>

    ${
      related.length
        ? `<section class="knowledge-block">
            <h2 class="knowledge-block__title">🔗 相关知识</h2>
            <ul class="knowledge-block__related">
              ${related
                .map(
                  ({ card: relCard, chapter: relChapter }) => `<li>
                    <a href="#/knowledge/${relCard.id}">${esc(relCard.title)}
                      <span class="knowledge-block__related-chapter">第 ${relChapter.num} 章</span>
                    </a>
                  </li>`,
                )
                .join('')}
            </ul>
          </section>`
        : ''
    }

    <p class="chapter-detail__note">掌握度 ${masteryOf(card.id)}% · 最近复习 ${(() => {
      const ts = state.progress[card.id]?.lastTs
      return ts ? formatDate(ts) : '尚未开始'
    })()}</p>
  </article>`
}

// ------------------------------------------------------------
// 复习
// ------------------------------------------------------------
export function reviewPage(ctx) {
  const { state, ui, stats } = ctx
  const session = ui.review

  if (session && session.queue.length) {
    const item = session.queue[session.index]
    const letter = (i) => 'ABCD'[i] ?? String(i + 1)
    const head = `<div class="review-home__head">
      <div>
        <h1 class="review-home__title">复习 · 第 ${session.index + 1}/${session.queue.length} 项</h1>
        <p class="review-home__desc">第 ${item.chapterNum} 章 ${esc(item.chapterTitle)} · ${kindLabel(
          item.kind,
        )} · 盒子第 ${item.box + 1} 层</p>
      </div>
      <button type="button" class="btn btn--ghost btn--sm" data-action="review-exit">退出</button>
    </div>`

    if (item.kind === 'card') {
      return `<div class="review-home">${head}
        <article class="review-card">
          <div class="review-card__meta">${statusDot('review')}<span>知识点到期</span></div>
          <h2 class="review-card__title">${esc(item.title)}</h2>
          <p class="review-card__recall">${esc(item.recall)}</p>
          ${
            session.revealed
              ? `<div class="review-card__ref">${esc(item.definition)}<br /><br />${esc(item.example)}</div>
                 <div class="review-card__actions" style="display:flex;gap:12px;flex-wrap:wrap">
                   <button type="button" class="btn btn--primary" data-action="review-grade" data-ok="1">记住了</button>
                   <button type="button" class="btn btn--ghost" data-action="review-grade" data-ok="0">没记住</button>
                 </div>`
              : `<button type="button" class="btn btn--primary" data-action="review-reveal">想好了，翻面看答案</button>`
          }
        </article>
      </div>`
    }

    if (item.kind === 'question') {
      const chosen = session.chosen
      const answered = chosen !== null && chosen !== undefined
      const correct = session.correct === true
      return `<div class="review-home">${head}
        <article class="review-card">
          <div class="review-card__meta">${statusDot('review')}<span>题目重做 · 上次到期</span></div>
          <p class="review-card__prompt">${esc(item.prompt)}</p>
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
            ${(item.options || [])
              .map((option, index) => {
                const chosenThis = chosen === index
                const isAnswer = index === item.answer
                let cls = 'test-session__option'
                if (chosenThis) cls += isAnswer ? ' test-session__option--correct' : ' test-session__option--wrong'
                else if (answered && isAnswer) cls += ' test-session__option--answer'
                return `<button type="button" class="${cls}" ${answered ? 'disabled' : ''}
                  data-action="review-pick" data-index="${index}">
                  <span class="test-session__option-label">${letter(index)}</span>
                  <span>${esc(option)}</span>
                </button>`
              })
              .join('')}
          </div>
          ${
            answered
              ? `<p class="test-session__feedback ${
                  correct ? 'test-session__feedback--correct' : 'test-session__feedback--wrong'
                }">${correct ? '答对了。' : `答错了，正确答案是 ${letter(item.answer)}。`}${esc(
                  item.explanation || '',
                )}</p>
                 <div class="review-card__actions" style="display:flex;gap:12px;flex-wrap:wrap;margin-top:16px">
                   <button type="button" class="btn btn--primary" data-action="review-next">
                     ${session.index + 1 >= session.queue.length ? '完成本轮' : '下一题'}
                   </button>
                 </div>`
              : ''
          }
        </article>
      </div>`
    }

    return `<div class="review-home">${head}
      <article class="review-card">
        <div class="review-card__meta">${statusDot('review')}<span>问答题到期</span></div>
        <p class="review-card__prompt">${esc(item.prompt)}</p>
        ${item.hint ? `<p class="review-card__recall">提示：${esc(item.hint)}</p>` : ''}
        ${
          session.revealed
            ? `<div class="review-card__ref">${esc(item.reference || item.explanation || '')}</div>
               <div class="review-card__actions" style="display:flex;gap:12px;flex-wrap:wrap">
                 <button type="button" class="btn btn--primary" data-action="review-grade" data-ok="1">答对了</button>
                 <button type="button" class="btn btn--ghost" data-action="review-grade" data-ok="0">没答对</button>
               </div>`
            : `<button type="button" class="btn btn--primary" data-action="review-reveal">先想一想，看参考答案</button>`
        }
      </article>
    </div>`
  }

  const queue = buildReviewQueue()
  const weak = [...chapters]
    .filter((ch) => ch.cards.length)
    .map((ch) => ({ ...ch, mastery: chapterMastery(ch.cards) }))
    .sort((a, b) => a.mastery - b.mastery)
    .slice(0, 6)

  const counts = queue.reduce(
    (acc, item) => {
      acc[item.kind] = (acc[item.kind] || 0) + 1
      return acc
    },
    {},
  )

  return `<div class="review-home">
    <div class="review-home__head">
      <div>
        <h1 class="review-home__title">复习</h1>
        <p class="review-home__desc">
          利特纳盒子共 5 层：答对升一层，间隔 1 → 2 → 4 → 8 → 16 天；答错退回第 1 层。
          卡片与题目共用同一套间隔，所以做错的题也会像卡片一样按时回到这里。
          今天到期 <strong>${queue.length}</strong> 项${
            queue.length
              ? `（知识点 ${counts.card || 0} · 题目 ${counts.question || 0} · 问答 ${counts.essay || 0}）`
              : ''
          }，已完成 ${state.game.sessions} 次复习会话，最长连续 ${longestStreak(state.game.reviewDays)} 天。
        </p>
      </div>
      <button type="button" class="btn btn--primary" data-action="start-review" ${
        queue.length ? '' : 'disabled style="opacity:.5"'
      }>
        ${queue.length ? `开始复习（${queue.length}）` : '暂无到期'}
      </button>
    </div>

    ${
      queue.length
        ? `<section>
            <h2 class="review-home__weak-title">今日到期（按到期时间排序，最多显示 12 项）</h2>
            <div class="weak-table">
              <div class="weak-table__head"><span>内容</span><span>章节</span><span>类型</span><span>盒子</span></div>
              <div class="weak-table__list">
                ${queue
                  .slice(0, 12)
                  .map((item) => {
                    const label = item.kind === 'card' ? item.title : item.prompt
                    const href =
                      item.kind === 'card' ? `#/knowledge/${item.id}` : `#/chapter/${item.chapterId}`
                    return `<div class="weak-table__row">
                      <span class="weak-table__title"><a href="${href}">${esc(label)}</a></span>
                      <span class="weak-table__chapter">第 ${item.chapterNum} 章 ${esc(item.chapterTitle)}</span>
                      <span class="weak-table__count">${kindLabel(item.kind)}</span>
                      <span class="weak-table__chapter">第 ${item.box + 1} 层</span>
                    </div>`
                  })
                  .join('')}
              </div>
            </div>
          </section>`
        : `<p class="test-empty">今天没有到期的卡片或题目。去章节页翻几张新卡，或者做一套综合卷。</p>`
    }

    <section>
      <h2 class="review-home__weak-title">最薄弱的章节</h2>
      <div class="weak-table">
        <div class="weak-table__head"><span>章节</span><span>篇</span><span>掌握</span><span></span></div>
        <div class="weak-table__list">
          ${weak
            .map(
              (ch) => `<div class="weak-table__row">
                <span class="weak-table__title">第 ${ch.num} 章 ${esc(ch.title)}</span>
                <span class="weak-table__chapter">第 ${ch.partNum} 篇</span>
                <span class="weak-table__count">${ch.mastery}%</span>
                <a class="weak-table__go" href="#/chapter/${ch.id}">去学</a>
              </div>`,
            )
            .join('')}
        </div>
      </div>
    </section>
  </div>`
}

// ------------------------------------------------------------
// 公式速查
// ------------------------------------------------------------
export function cheatsheetPage(ctx) {
  return `<div class="cheatsheet">
      <section class="cheatsheet__hero">
        <h1>公式与结论速查</h1>
        <p>考前最后一遍：把 ${totals.chapters} 章里真正会被计算、被引用的公式集中在这里。点击左侧目录可回到对应章节。</p>
      </section>
      ${CHEATSHEET.map(
        (group) => `<section class="cheatsheet__group">
          <h2 class="cheatsheet__group-title">${esc(group.title)}</h2>
          ${group.items
            .map(
              (item) => `<div class="formula">
                <div class="formula__name">${esc(item.name)}${item.chapter ? `<div style="font-weight:400;font-size:12px;color:var(--color-text-3);margin-top:2px">第 ${item.chapter} 章</div>` : ''}</div>
                <div class="formula__body">
                  <p class="formula__expr">${esc(item.expr)}</p>
                  <p class="formula__note">${item.note}</p>
                </div>
              </div>`,
            )
            .join('')}
        </section>`,
      ).join('')}
      <section class="cheatsheet__group">
        <h2 class="cheatsheet__group-title">本地数据</h2>
        <p class="formula__note">
          进度、经验与成就都保存在本机 <code>localStorage</code>（键名 <code>money-banking:v1:state</code>）。
          换浏览器或清除站点数据会丢失进度。
        </p>
        <div><button type="button" class="btn btn--ghost btn--sm" data-action="reset-progress">清空全部进度</button></div>
      </section>
    </div>`
}
