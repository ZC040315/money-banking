// 由 scripts/build-sw.mjs 生成，请勿手改
const CACHE = 'mb-static-99906277e7'
const ASSETS = [
  ".",
  "./data/cards-extra/_index.js",
  "./data/cards-extra/ch01.js",
  "./data/cards-extra/ch02.js",
  "./data/cards-extra/ch03.js",
  "./data/cards-extra/ch04.js",
  "./data/cards-extra/ch05.js",
  "./data/cards-extra/ch06.js",
  "./data/cards-extra/ch07.js",
  "./data/cards-extra/ch08.js",
  "./data/cards-extra/ch09.js",
  "./data/cards-extra/ch10.js",
  "./data/cards-extra/ch11.js",
  "./data/cards-extra/ch12.js",
  "./data/cards-extra/ch13.js",
  "./data/cards-extra/ch14.js",
  "./data/cards-extra/ch15.js",
  "./data/cards-extra/ch16.js",
  "./data/cards-extra/ch17.js",
  "./data/cards-extra/ch18.js",
  "./data/cards-extra/ch19.js",
  "./data/cards-extra/ch20.js",
  "./data/cards-extra/ch21.js",
  "./data/cards-extra/ch22.js",
  "./data/cards-extra/ch23.js",
  "./data/cards-extra/ch24.js",
  "./data/cards-extra/ch25.js",
  "./data/extra/_index.js",
  "./data/extra/ch01.js",
  "./data/extra/ch02.js",
  "./data/extra/ch03.js",
  "./data/extra/ch04.js",
  "./data/extra/ch05.js",
  "./data/extra/ch06.js",
  "./data/extra/ch07.js",
  "./data/extra/ch08.js",
  "./data/extra/ch09.js",
  "./data/extra/ch10.js",
  "./data/extra/ch11.js",
  "./data/extra/ch12.js",
  "./data/extra/ch13.js",
  "./data/extra/ch14.js",
  "./data/extra/ch15.js",
  "./data/extra/ch16.js",
  "./data/extra/ch17.js",
  "./data/extra/ch18.js",
  "./data/extra/ch19.js",
  "./data/extra/ch20.js",
  "./data/extra/ch21.js",
  "./data/extra/ch22.js",
  "./data/extra/ch23.js",
  "./data/extra/ch24.js",
  "./data/extra/ch25.js",
  "./data/part1.js",
  "./data/part2.js",
  "./data/part3.js",
  "./data/part4.js",
  "./data/part5.js",
  "./data/part6.js",
  "./favicon.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./index.html",
  "./js/app.js",
  "./js/backup.js",
  "./js/charts.js",
  "./js/cheatsheet.js",
  "./js/data.js",
  "./js/format.js",
  "./js/review.js",
  "./js/router.js",
  "./js/store.js",
  "./js/views/pages.js",
  "./js/views/settings.js",
  "./js/views/shell.js",
  "./js/views/tests.js",
  "./manifest.webmanifest",
  "./styles/components.css",
  "./styles/global.css",
  "./styles/tokens.css"
]

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
