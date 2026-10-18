// 页面外壳：顶栏、移动端导航、通用小组件
import { esc } from '../format.js'
import { ACHIEVEMENTS } from '../store.js'
import { search, TYPE_LABELS } from '../data.js'

export const NAV_ITEMS = [
  { path: '/', label: '首页', icon: '⌂', match: ['home'] },
  { path: '/map', label: '知识地图', icon: '◈', match: ['map', 'chapter', 'knowledge'] },
  { path: '/review', label: '复习', icon: '↻', match: ['review'] },
  { path: '/test', label: '测试中心', icon: '✎', match: ['test', 'test-chapter', 'test-weekly'] },
  { path: '/cheatsheet', label: '公式速查', icon: '∫', match: ['cheatsheet'] },
]

const SUN = `<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4m11.4-11.4 1.4-1.4"/></svg>`
const MOON = `<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/></svg>`

function isActive(item, route) {
  return item.match.includes(route.name)
}

export function navbar(ctx) {
  const { route, state, ui, stats } = ctx
  const results = ui.searchOpen ? search(ui.query) : []
  const groups = new Map()
  for (const item of results) {
    if (!groups.has(item.type)) groups.set(item.type, [])
    groups.get(item.type).push(item)
  }

  const dropdown = ui.searchOpen
    ? `<div class="search-box__dropdown">
        ${
          !ui.query.trim()
            ? `<p class="search-box__empty">输入关键词搜索章节、知识点或题目</p>`
            : results.length === 0
              ? `<p class="search-box__empty">没有找到匹配内容</p>`
              : [...groups.entries()]
                  .map(
                    ([type, list]) => `<div class="search-box__group">
                      <span class="search-box__group-label">${TYPE_LABELS[type] || type}</span>
                      ${list
                        .map(
                          (item) => `<a class="search-box__result" href="${item.href}" data-action="close-search">
                            <span class="search-box__result-title">${esc(item.title)}</span>
                            <span class="search-box__result-sub">${esc(item.subtitle)}</span>
                          </a>`,
                        )
                        .join('')}
                    </div>`,
                  )
                  .join('')
        }
      </div>`
    : ''

  return `<header class="navbar">
    <div class="navbar__inner container">
      <a class="navbar__brand" href="#/">
        <span class="navbar__logo" aria-hidden="true">¥</span>
        <span class="navbar__name">货币金融学 · 知识地图</span>
      </a>
      <nav class="navbar__nav" aria-label="主导航">
        ${NAV_ITEMS.map(
          (item) =>
            `<a class="navbar__link${isActive(item, route) ? ' navbar__link--active' : ''}" href="#${item.path}">${item.label}</a>`,
        ).join('')}
      </nav>
      <div class="navbar__right">
        <div class="search-box">
          <svg class="search-box__icon" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
          <input id="search-input" type="search" placeholder="搜索章节、知识点、公式…（/）"
            value="${esc(ui.query)}" data-action="search" autocomplete="off" />
          ${dropdown}
        </div>
        <div class="navbar__stats" aria-label="学习概览">
          <span class="navbar__stat">已答 <strong>${stats.answered}</strong></span>
          <span class="navbar__stat">正确率 <strong>${stats.accuracy}%</strong></span>
          <span class="navbar__stat">待复习 <strong class="${stats.due > 0 ? 'text-review' : ''}">${stats.due}</strong></span>
        </div>
        <div class="player-stats" title="经验值 ${state.game.xp}">
          <span class="player-stats__level">Lv.${state.game.level}</span>
          <span class="player-stats__bar"><span class="player-stats__bar-fill" style="width:${stats.levelPct}%"></span></span>
          <span class="player-stats__xp">${stats.levelXp}/100</span>
        </div>
        <button type="button" class="theme-toggle" data-action="toggle-theme"
          aria-label="切换深浅色" title="切换深浅色">${ctx.theme === 'dark' ? SUN : MOON}</button>
      </div>
    </div>
  </header>`
}

export function mobileNav(route) {
  return `<nav class="mobile-nav" aria-label="移动端导航">
    ${NAV_ITEMS.map(
      (item) => `<a class="mobile-nav__item${isActive(item, route) ? ' mobile-nav__item--active' : ''}" href="#${item.path}">
        <span class="mobile-nav__icon" aria-hidden="true">${item.icon}</span>
        <span class="mobile-nav__label">${item.label}</span>
      </a>`,
    ).join('')}
  </nav>`
}

// ------------------------------------------------------------
// 小组件
// ------------------------------------------------------------
export function masteryBar(value) {
  return `<span class="mastery-bar"><span class="mastery-bar__fill" style="width:${value}%;background:${
    value >= 80 ? 'var(--color-mastered)' : value > 0 ? 'var(--color-accent)' : 'var(--color-muted)'
  }"></span></span>`
}

export function statusDot(status) {
  return `<span class="status-dot status-dot--${status}"></span>`
}

export function achievementsPanel(state) {
  const unlocked = ACHIEVEMENTS.filter((item) => state.game.achievements[item.id])
  return `<section class="achievements">
    <div class="achievements__head">
      <h3 class="achievements__title">成就</h3>
      <span class="achievements__count">${unlocked.length}/${ACHIEVEMENTS.length}</span>
    </div>
    <div class="achievements__grid">
      ${ACHIEVEMENTS.map(
        (item) => `<div class="achievement${state.game.achievements[item.id] ? ' achievement--unlocked' : ''}" title="${esc(item.desc)}">
          <span class="achievement__icon" aria-hidden="true">${item.icon}</span>
          <span class="achievement__name">${esc(item.title)}</span>
        </div>`,
      ).join('')}
    </div>
  </section>`
}

export function toast(item) {
  return `<div class="achievement-toast">
    <span class="achievement-toast__icon" aria-hidden="true">${item.icon}</span>
    <div>
      <p class="achievement-toast__kicker">成就解锁</p>
      <p class="achievement-toast__title">${esc(item.title)}</p>
      <p class="achievement-toast__desc">${esc(item.desc)}</p>
    </div>
  </div>`
}

export function xpToast(gained) {
  if (!gained) return ''
  return `<div class="achievement-toast">
    <span class="achievement-toast__icon" aria-hidden="true">＋</span>
    <div>
      <p class="achievement-toast__kicker">经验值</p>
      <p class="achievement-toast__title">+${gained} XP</p>
      <p class="achievement-toast__desc">答对得分，连续答对同一知识点收益递减</p>
    </div>
  </div>`
}
