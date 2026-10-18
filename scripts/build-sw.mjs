// 生成 sw.js：扫描站点静态资源，写入缓存清单与内容指纹
import { createHash } from 'node:crypto'
import { readdirSync, statSync, writeFileSync } from 'node:fs'
import { join, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')

const SKIP_DIRS = new Set(['scripts', 'node_modules', '.git', 'icons-src'])
const SKIP_FILES = new Set(['sw.js', 'README.md', '.nojekyll', '启动.cmd'])

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name) || name.startsWith('.')) continue
    const full = join(dir, name)
    const stat = statSync(full)
    if (stat.isDirectory()) walk(full, out)
    else if (!SKIP_FILES.has(name)) out.push(full)
  }
  return out
}

const files = walk(root)
  .filter((file) => /\.(html|css|js|json|svg|png|webmanifest|txt)$/.test(file))
  .sort()

const hash = createHash('md5')
for (const file of files) {
  const stat = statSync(file)
  hash.update(`${relative(root, file)}:${stat.size}`)
}
const version = hash.digest('hex').slice(0, 10)

const assets = ['.', ...files.map((file) => `./${relative(root, file).replace(/\\/g, '/')}`)]

const source = `// 由 scripts/build-sw.mjs 生成，请勿手改
const CACHE = 'mb-static-${version}'
const ASSETS = ${JSON.stringify(assets, null, 2)}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== location.origin) return

  // 页面导航：网络优先，断网时回退到缓存的首页
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          caches.open(CACHE).then((cache) => cache.put('./index.html', copy))
          return response
        })
        .catch(() => caches.match('./index.html')),
    )
    return
  }

  // 静态资源：先给缓存，后台更新（stale-while-revalidate）
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone()
            caches.open(CACHE).then((cache) => cache.put(request, copy))
          }
          return response
        })
        .catch(() => cached)
      return cached || network
    }),
  )
})
`

writeFileSync(join(root, 'sw.js'), source, 'utf8')
console.log(`sw.js 已生成：${files.length} 个静态资源，缓存版本 mb-static-${version}`)
