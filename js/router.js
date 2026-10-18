// Hash 路由：#/chapter/ch4 → { name: 'chapter', params: { id: 'ch4' } }
// 不依赖任何路由库，GitHub Pages 上不需要 404 重写。

export const ROUTES = {
  home: '/',
  map: '/map',
  review: '/review',
  test: '/test',
  cheatsheet: '/cheatsheet',
}

const KNOWN = {
  '': 'home',
  map: 'map',
  review: 'review',
  test: 'test',
  cheatsheet: 'cheatsheet',
}

export function parseHash(hash) {
  const clean = String(hash || '').replace(/^#/, '') || '/'
  const [path, query] = clean.split('?')
  const segments = path.split('/').filter(Boolean)

  if (segments.length === 0) {
    return { name: 'home', path: '/', params: {}, query: query || '' }
  }

  if (segments[0] === 'chapter' && segments[1]) {
    return { name: 'chapter', path, params: { id: segments[1] }, query: query || '' }
  }
  if (segments[0] === 'knowledge' && segments[1]) {
    return { name: 'knowledge', path, params: { id: segments[1] }, query: query || '' }
  }
  if (segments[0] === 'test' && segments[1] === 'chapter' && segments[2]) {
    return { name: 'test-chapter', path, params: { id: segments[2] }, query: query || '' }
  }
  if (segments[0] === 'test' && segments[1] === 'weekly') {
    return { name: 'test-weekly', path, params: {}, query: query || '' }
  }

  const name = KNOWN[segments[0]] ?? 'home'
  return { name, path: `/${segments[0]}`, params: {}, query: query || '' }
}

export function navigate(path) {
  if (typeof window === 'undefined') return
  if (window.location.hash === `#${path}`) {
    // 相同 hash 不会触发 hashchange，手动广播一次
    window.dispatchEvent(new HashChangeEvent('hashchange'))
    return
  }
  window.location.hash = path
}

export function isBrowseRoute(name) {
  return name === 'map' || name === 'chapter' || name === 'knowledge' || name === 'review'
}

export const TITLES = {
  home: '货币金融学 · 知识地图',
  map: '知识地图 · 货币金融学',
  review: '复习 · 货币金融学',
  test: '测试中心 · 货币金融学',
  'test-chapter': '章节测试 · 货币金融学',
  'test-weekly': '综合卷 · 货币金融学',
  cheatsheet: '公式速查 · 货币金融学',
}
