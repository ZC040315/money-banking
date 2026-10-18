// 真实浏览器自检：用 CDP 模拟移动端视口、执行点击、截图，并检查横向溢出与 JS 报错
// 用法：node scripts/qa.mjs [输出目录]
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'

const OUT = process.argv[2] || join(process.cwd(), '..', '_research', 'shots', 'mb2')
const BASE = process.argv[3] || 'http://127.0.0.1:8123/'
const PORT = 9333
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const PROFILE = join(OUT, 'profile')

mkdirSync(OUT, { recursive: true })

const chrome = spawn(
  CHROME,
  [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${PROFILE}`,
    '--window-size=1440,900',
    'about:blank',
  ],
  { stdio: 'ignore' },
)

async function waitForDevtools() {
  for (let i = 0; i < 60; i += 1) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/version`)
      if (res.ok) return
    } catch {
      /* not ready */
    }
    await sleep(200)
  }
  throw new Error('devtools 未就绪')
}

await waitForDevtools()

const targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()
const page = targets.find((t) => t.type === 'page')
if (!page) throw new Error('没有可用的 page target')

const ws = new WebSocket(page.webSocketDebuggerUrl)
await new Promise((resolve, reject) => {
  ws.onopen = resolve
  ws.onerror = reject
})

let nextId = 0
const pending = new Map()
const pageErrors = []

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data)
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id)
    pending.delete(msg.id)
    if (msg.error) reject(new Error(JSON.stringify(msg.error)))
    else resolve(msg.result)
    return
  }
  if (msg.method === 'Runtime.exceptionThrown') {
    const d = msg.params.exceptionDetails
    pageErrors.push(`${d.text} ${d.exception?.description ?? ''}`.trim())
  }
  if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
    pageErrors.push(msg.params.args.map((a) => a.value ?? a.description ?? '').join(' '))
  }
}

function send(method, params = {}) {
  const id = ++nextId
  ws.send(JSON.stringify({ id, method, params }))
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject })
    setTimeout(() => {
      if (pending.has(id)) {
        pending.delete(id)
        reject(new Error(`CDP 超时：${method}`))
      }
    }, 15000)
  })
}

async function evaluate(expression) {
  const result = await send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
  })
  if (result.exceptionDetails) {
    const details = result.exceptionDetails
    throw new Error(details.exception?.description || details.text)
  }
  return result.result?.value
}

async function setViewport(width, height, mobile) {
  await send('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: 1,
    mobile,
    screenWidth: width,
    screenHeight: height,
  })
  await send('Emulation.setTouchEmulationEnabled', { enabled: mobile, maxTouchPoints: mobile ? 5 : 1 })
}

async function goto(url) {
  await send('Page.navigate', { url })
  await sleep(900)
}

async function shot(name, { full = true, maxHeight = 3000 } = {}) {
  let clip
  if (full) {
    const metrics = await send('Page.getLayoutMetrics')
    const size = metrics.cssContentSize
    clip = {
      x: 0,
      y: 0,
      width: Math.ceil(size.width),
      height: Math.min(maxHeight, Math.ceil(size.height)),
      scale: 1,
    }
  }
  const { data } = await send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: full,
    ...(clip ? { clip } : {}),
  })
  const file = join(OUT, `${name}.png`)
  writeFileSync(file, Buffer.from(data, 'base64'))
  const overflow = await evaluate(
    'JSON.stringify({sw: document.documentElement.scrollWidth, iw: window.innerWidth})',
  )
  const info = JSON.parse(overflow)
  const bad = info.sw > info.iw + 1 ? `  ⚠ 横向溢出 ${info.sw}/${info.iw}` : ''
  console.log(`  ✓ ${name}${bad}`)
  if (bad) pageErrors.push(`${name} 横向溢出 ${info.sw} > ${info.iw}`)
}

await send('Page.enable')
await send('Runtime.enable')
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] })

// ---------------- 桌面 ----------------
console.log('桌面 1440×900')
await setViewport(1440, 900, false)

await goto(`${BASE}#/`)
await shot('home')

await goto(`${BASE}#/map`)
await shot('map')

await goto(`${BASE}#/test`)
await shot('test')

await goto(`${BASE}#/chapter/ch4`)
await shot('chapter4')

await evaluate('document.querySelector("[data-action=flip]").click()')
await sleep(300)
await shot('chapter4-flipped', { full: false })

await evaluate('document.querySelector("[data-action=answer]").click()')
await sleep(300)
await shot('chapter4-answered', { full: false })

await goto(`${BASE}#/knowledge/ch5-c1`)
await shot('knowledge')

await goto(`${BASE}#/cheatsheet`)
await shot('cheatsheet')

// 测试会话
await goto(`${BASE}#/test`)
await evaluate('document.querySelector("[data-action=start-chapter-test]").click()')
await sleep(600)
await shot('session-q1', { full: false })

await evaluate('document.querySelector("[data-action=session-pick]").click()')
await sleep(400)
await shot('session-answered', { full: false })

// 连点下一题直到交卷
for (let i = 0; i < 8; i += 1) {
  const state = await evaluate(
    'JSON.stringify({next: !!document.querySelector("[data-action=session-next]"), result: !!document.querySelector(".test-result")})',
  )
  const parsed = JSON.parse(state)
  if (parsed.result) break
  if (parsed.next) {
    await evaluate('document.querySelector("[data-action=session-next]").click()')
    await sleep(300)
    if (i < 6) await evaluate('document.querySelector("[data-action=session-pick]")?.click()')
    await sleep(250)
  }
}
await shot('session-result', { full: false })

// 深色模式
await goto(`${BASE}#/`)
await evaluate('document.querySelector("[data-action=toggle-theme]").click()')
await sleep(400)
await shot('home-dark', { full: false })
await evaluate('document.querySelector("[data-action=toggle-theme]").click()')
await sleep(200)

// 复习会话：预置一张到期卡
await goto(`${BASE}#/`)
const seed = await evaluate(`(() => {
  const now = Date.now();
  const state = {
    progress: {
      'ch4-c1': { correct: true, attempts: 2, lastCorrect: true, box: 2, dueTs: now - 1000, lastTs: now - 86400000 },
      'ch4-c2': { correct: false, attempts: 1, lastCorrect: false, box: 0, dueTs: now - 500, lastTs: now - 7200000 }
    },
    game: { xp: 40, level: 1, achievements: {}, answeredIds: ['ch4-c1'], reviewDays: [], sessions: 0 },
    history: [], theme: 'light', lastChapter: 'ch4'
  };
  localStorage.setItem('money-banking:v1:state', JSON.stringify(state));
  return 'seeded';
})()`)
await goto(`${BASE}#/review`)
await sleep(300)
await evaluate('location.reload()')
await sleep(900)
await shot('review-home')
await evaluate('document.querySelector("[data-action=start-review]").click()')
await sleep(500)
await shot('review-card', { full: false })
await evaluate('document.querySelector("[data-action=review-reveal]").click()')
await sleep(300)
await shot('review-revealed', { full: false })

// 搜索下拉
await goto(`${BASE}#/`)
await evaluate(`(() => {
  const input = document.getElementById('search-input');
  input.focus();
  input.value = '货币乘数';
  input.dispatchEvent(new Event('input', { bubbles: true }));
})()`)
await sleep(400)
await shot('search-dropdown', { full: false })

// 错题重做
await goto(`${BASE}#/test`)
const hasMistake = await evaluate(
  '!!document.querySelector("[data-action=start-mistake-test]:not([disabled])")',
)
if (hasMistake) {
  await evaluate('document.querySelector("[data-action=start-mistake-test]").click()')
  await sleep(600)
  await shot('mistake-session', { full: false })
  await evaluate('document.querySelector("[data-action=session-pick]")?.click()')
  await sleep(400)
  await shot('mistake-answered', { full: false })
}

// ---------------- 移动端 ----------------
console.log('移动端 390×844')
await setViewport(390, 844, true)

await goto(`${BASE}#/`)
await shot('m-home')

await goto(`${BASE}#/map`)
await shot('m-map')

await goto(`${BASE}#/test`)
await shot('m-test')

await goto(`${BASE}#/chapter/ch4`)
await shot('m-chapter')

await goto(`${BASE}#/knowledge/ch5-c1`)
await shot('m-knowledge')

await goto(`${BASE}#/test`)
await evaluate('document.querySelector("[data-action=start-chapter-test]").click()')
await sleep(600)
await shot('m-session', { full: false })

// ---------------- 汇总 ----------------
console.log('')
if (pageErrors.length) {
  console.error(`✗ 发现 ${pageErrors.length} 个问题：`)
  for (const error of pageErrors) console.error(`  · ${error}`)
} else {
  console.log('✓ 没有横向溢出，也没有 JS 报错')
}

ws.close()
chrome.kill()
process.exit(pageErrors.length ? 1 : 0)
