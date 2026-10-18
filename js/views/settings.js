// 设置页：学习数据摘要、进度导出/导入、外观、离线说明、清空
import { esc } from '../format.js'
import { chapters, cards, totals } from '../data.js'
import { summarize } from '../backup.js'
import { overallStats } from '../store.js'

const THEME_OPTIONS = [
  { key: 'system', label: '跟随系统' },
  { key: 'light', label: '浅色' },
  { key: 'dark', label: '深色' },
]

export function settingsPage(ctx) {
  const { state, stats } = ctx
  const summary = summarize(state)
  const overall = overallStats(cards)

  return `<div class="settings">
    <header class="settings__head">
      <h1 class="settings__title">设置与数据</h1>
      <p class="settings__desc">
        进度、经验与成就都存在这台设备的浏览器里（localStorage），换设备不会自动同步。
        下面可以把进度导出成一个 JSON 文件，在新设备上导入。
      </p>
    </header>

    <section class="settings__card">
      <h2 class="settings__h2">学习数据</h2>
      <div class="settings__stats">
        <div class="settings__stat"><strong>${overall.answered}</strong><span>已答条目</span></div>
        <div class="settings__stat"><strong>${overall.mastery}%</strong><span>全书掌握度</span></div>
        <div class="settings__stat"><strong>Lv.${summary.level}</strong><span>${summary.xp} XP</span></div>
        <div class="settings__stat"><strong>${summary.sessions}</strong><span>复习会话</span></div>
      </div>
      <p class="settings__hint">
        共 ${totals.chapters} 章 · ${totals.cards} 张知识点卡 · ${totals.questions} 道题 ·
        已解锁 ${summary.achievements}/8 个成就 · 待复习 ${stats.due} 项
      </p>
    </section>

    <section class="settings__card">
      <h2 class="settings__h2">备份与迁移</h2>
      <p class="settings__desc settings__desc--small">
        导出的文件包含全部做题记录、盒子层级、到期时间、经验与成就。导入会<strong>覆盖</strong>当前进度，操作前会再确认一次。
      </p>
      <div class="settings__actions">
        <button type="button" class="btn btn--primary" data-action="export-progress">导出进度（JSON）</button>
        <label class="btn btn--ghost" for="import-file">导入进度…</label>
        <input id="import-file" type="file" accept="application/json,.json" hidden />
      </div>
      <p class="settings__hint" id="backup-status">建议每周导出一次，文件名里带日期。</p>
    </section>

    <section class="settings__card">
      <h2 class="settings__h2">外观</h2>
      <div class="settings__actions" role="group" aria-label="主题">
        ${THEME_OPTIONS.map(
          (option) =>
            `<button type="button" class="btn ${
              state.theme === option.key ? 'btn--primary' : 'btn--ghost'
            }" data-action="set-theme" data-theme="${option.key}">${option.label}</button>`,
        ).join('')}
      </div>
      <p class="settings__hint">跟随系统时会随手机的深浅色自动切换。</p>
    </section>

    <section class="settings__card">
      <h2 class="settings__h2">离线使用</h2>
      <p class="settings__desc settings__desc--small">
        本站是纯静态页面，首次打开后会注册一个 Service Worker，把页面与题库缓存到本地。
        之后即使在飞机上、地铁里没有网络，也能打开继续背。
      </p>
      <p class="settings__hint">
        手机上建议用浏览器的「添加到主屏幕」，打开时就是全屏应用的样子。
        iOS 需要在 Safari 里添加到主屏幕后才会保留缓存。
      </p>
    </section>

    <section class="settings__card settings__card--danger">
      <h2 class="settings__h2">清空数据</h2>
      <p class="settings__desc settings__desc--small">
        会删掉全部做题记录、经验、成就与复习计划，不可撤销。建议先导出一份备份。
      </p>
      <div class="settings__actions">
        <button type="button" class="btn btn--ghost" data-action="reset-progress">清空全部进度</button>
      </div>
    </section>

    <footer class="settings__foot">
      <p class="settings__hint">
        内容按米什金《货币金融学》第十一版整理 ·
        <a href="https://github.com/ZC040315/money-banking" target="_blank" rel="noreferrer">源码与更新记录</a>
      </p>
    </footer>
  </div>`
}
