// ============================================================
// 图表：内联 SVG，跟随主题换色，不依赖任何图片文件
// 坐标约定：viewBox 420×300，f 为 0~1 的相对位置
// ============================================================

const W = 420
const H = 300
const PAD = { l: 58, r: 20, t: 22, b: 44 }

const X = (f) => PAD.l + f * (W - PAD.l - PAD.r)
const Y = (f) => H - PAD.b - f * (H - PAD.b - PAD.t)

function line(x1, y1, x2, y2, cls = 'curve') {
  return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(
    1,
  )}" class="chart-${cls}" />`
}

function path(d, cls = 'curve') {
  return `<path d="${d}" class="chart-${cls}" />`
}

function dot(x, y, cls = 'equil') {
  return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4" class="chart-${cls}" />`
}

function vguide(x, from = 0, to = 1) {
  return line(x, Y(from), x, Y(to), 'guide')
}

function hguide(y, from = 0, to = 1) {
  return line(X(from), y, X(to), y, 'guide')
}

function label(x, y, text, cls = 'axis', anchor = 'middle') {
  return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="${anchor}" class="chart-${cls}">${text}</text>`
}

function frame({ yLabel, xLabel, xTicks = [], yTicks = [] }) {
  const parts = []
  parts.push(
    `<line x1="${X(0)}" y1="${Y(0)}" x2="${X(1) + 4}" y2="${Y(0)}" class="chart-axis" />`,
  )
  parts.push(
    `<line x1="${X(0)}" y1="${Y(1) - 4}" x2="${X(0)}" y2="${Y(0)}" class="chart-axis" />`,
  )
  for (const t of xTicks) {
    parts.push(line(X(t.at), Y(0), X(t.at), Y(0) + 4, 'axis'))
    parts.push(label(X(t.at), Y(0) + 16, t.text, 'tick'))
  }
  for (const t of yTicks) {
    parts.push(line(X(0) - 4, Y(t.at), X(0), Y(t.at), 'axis'))
    parts.push(label(X(0) - 8, Y(t.at) + 4, t.text, 'tick', 'end'))
  }
  parts.push(label(X(1), Y(0) + 32, xLabel, 'axis-label', 'end'))
  const cy = (Y(1) + Y(0)) / 2
  parts.push(
    `<text x="12" y="${cy.toFixed(1)}" text-anchor="middle" class="chart-axis-label" transform="rotate(-90 12 ${cy.toFixed(
      1,
    )})">${yLabel}</text>`,
  )
  return parts.join('')
}

function figure(inner) {
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="经济学示意图">${inner}</svg>`
}

// ------------------------------------------------------------
// 1. 债券市场：价格-数量，需求/供给与均衡
// ------------------------------------------------------------
function bondMarket() {
  const eq = { x: X(0.4256), y: Y(0.506) }
  return figure(
    [
      frame({
        yLabel: '债券价格 P',
        xLabel: '债券数量 Q',
        xTicks: [],
        yTicks: [{ at: 0.506, text: 'P*' }],
      }),
      path(`M${X(0.12).toFixed(1)},${Y(0.82).toFixed(1)} L${X(0.9).toFixed(1)},${Y(0.16).toFixed(1)}`, 'curve'),
      path(`M${X(0.12).toFixed(1)},${Y(0.22).toFixed(1)} L${X(0.88).toFixed(1)},${Y(0.92).toFixed(1)}`, 'curve'),
      path(
        `M${X(0.32).toFixed(1)},${Y(0.82).toFixed(1)} L${X(0.98).toFixed(1)},${Y(0.26).toFixed(1)}`,
        'shift',
      ),
      vguide(X(0.4256), 0, 0.506),
      hguide(eq.y, 0, 0.4256),
      dot(eq.x, eq.y),
      label(X(0.155), Y(0.86), 'D', 'curve-label', 'start'),
      label(X(0.905), Y(0.2), 'S', 'curve-label', 'start'),
      label(X(0.99), Y(0.31), "D′", 'shift-label', 'start'),
    ].join(''),
  )
}

// ------------------------------------------------------------
// 2. 流动性偏好：利率-货币数量
// ------------------------------------------------------------
function liquidityPref() {
  const eqY = Y(0.4767)
  return figure(
    [
      frame({
        yLabel: '利率 i',
        xLabel: '货币数量 M',
        yTicks: [{ at: 0.4767, text: 'i₁' }],
      }),
      path(`M${X(0.14).toFixed(1)},${Y(0.86).toFixed(1)} L${X(0.92).toFixed(1)},${Y(0.14).toFixed(1)}`, 'curve'),
      line(X(0.56), Y(0.08), X(0.56), Y(0.92), 'vertical'),
      path(
        `M${X(0.34).toFixed(1)},${Y(0.86).toFixed(1)} L${X(0.98).toFixed(1)},${Y(0.32).toFixed(1)}`,
        'shift',
      ),
      hguide(eqY, 0, 0.56),
      dot(X(0.56), eqY),
      label(X(0.585), Y(0.9), 'MS', 'curve-label', 'start'),
      label(X(0.16), Y(0.9), 'MD', 'curve-label', 'start'),
      label(X(0.99), Y(0.37), "MD′", 'shift-label', 'start'),
    ].join(''),
  )
}

// ------------------------------------------------------------
// 3. 收益率曲线：正常 / 平坦 / 倒挂
// ------------------------------------------------------------
function yieldCurve() {
  const ticks = [
    { at: 0.12, text: '1年' },
    { at: 0.36, text: '3年' },
    { at: 0.6, text: '5年' },
    { at: 1, text: '10年' },
  ]
  return figure(
    [
      frame({ yLabel: '到期收益率', xLabel: '距到期期限', xTicks: ticks }),
      path(`M${X(0.12).toFixed(1)},${Y(0.36).toFixed(1)} C${X(0.45).toFixed(1)},${Y(0.5).toFixed(
        1,
      )} ${X(0.7).toFixed(1)},${Y(0.66).toFixed(1)} ${X(1).toFixed(1)},${Y(0.84).toFixed(1)}`, 'curve'),
      path(`M${X(0.12).toFixed(1)},${Y(0.58).toFixed(1)} L${X(1).toFixed(1)},${Y(0.6).toFixed(1)}`, 'curve-2'),
      path(`M${X(0.12).toFixed(1)},${Y(0.82).toFixed(1)} C${X(0.5).toFixed(1)},${Y(0.66).toFixed(
        1,
      )} ${X(0.75).toFixed(1)},${Y(0.52).toFixed(1)} ${X(1).toFixed(1)},${Y(0.4).toFixed(1)}`, 'curve-3'),
      label(X(0.13), Y(0.26), '正常：向上倾斜', 'curve-label', 'start'),
      label(X(0.13), Y(0.68), '平坦', 'curve-label', 'start'),
      label(X(0.13), Y(0.93), '倒挂：向下倾斜', 'curve-label', 'start'),
    ].join(''),
  )
}

// ------------------------------------------------------------
// 4. 准备金市场：联邦基金利率由供求决定
// ------------------------------------------------------------
function reserveMarket() {
  const eqY = Y(0.4945)
  return figure(
    [
      frame({
        yLabel: '联邦基金利率 i',
        xLabel: '准备金数量 R',
        yTicks: [{ at: 0.4945, text: 'i*' }],
      }),
      path(`M${X(0.1).toFixed(1)},${Y(0.82).toFixed(1)} L${X(0.9).toFixed(1)},${Y(0.2).toFixed(1)}`, 'curve'),
      line(X(0.52), Y(0.12), X(0.52), Y(0.9), 'vertical'),
      path(`M${X(0.72).toFixed(1)},${Y(0.12).toFixed(1)} L${X(0.72).toFixed(1)},${Y(0.9).toFixed(1)}`, 'shift'),
      hguide(eqY, 0, 0.52),
      dot(X(0.52), eqY),
      label(X(0.12), Y(0.9), 'RD（需求）', 'curve-label', 'start'),
      label(X(0.5), Y(0.95), 'RS', 'curve-label', 'end'),
      label(X(0.75), Y(0.95), "RS′", 'shift-label', 'start'),
    ].join(''),
  )
}

// ------------------------------------------------------------
// 5. IS 曲线：利率与产出的负相关
// ------------------------------------------------------------
function isCurve() {
  return figure(
    [
      frame({
        yLabel: '实际利率 r',
        xLabel: '总产出 Y',
        xTicks: [{ at: 0.55, text: 'Y₁' }],
        yTicks: [{ at: 0.48, text: 'r₁' }],
      }),
      path(`M${X(0.16).toFixed(1)},${Y(0.78).toFixed(1)} L${X(0.9).toFixed(1)},${Y(0.2).toFixed(1)}`, 'curve'),
      path(`M${X(0.34).toFixed(1)},${Y(0.92).toFixed(1)} L${X(0.99).toFixed(1)},${Y(0.4).toFixed(1)}`, 'shift'),
      vguide(X(0.55), 0, 0.48),
      hguide(Y(0.48), 0, 0.55),
      dot(X(0.55), Y(0.48)),
      label(X(0.88), Y(0.26), 'IS', 'curve-label', 'start'),
      label(X(0.99), Y(0.47), "IS′", 'shift-label', 'end'),
    ].join(''),
  )
}

// ------------------------------------------------------------
// 6. 总需求 - 总供给
// ------------------------------------------------------------
function adAs() {
  return figure(
    [
      frame({
        yLabel: '物价水平 P',
        xLabel: '总产出 Y',
        xTicks: [{ at: 0.6, text: 'Y*' }],
      }),
      path(`M${X(0.12).toFixed(1)},${Y(0.84).toFixed(1)} L${X(0.94).toFixed(1)},${Y(0.2).toFixed(1)}`, 'curve'),
      path(`M${X(0.14).toFixed(1)},${Y(0.18).toFixed(1)} L${X(0.86).toFixed(1)},${Y(0.86).toFixed(1)}`, 'curve-2'),
      line(X(0.6), Y(0.12), X(0.6), Y(0.92), 'vertical'),
      label(X(0.9), Y(0.26), 'AD', 'curve-label', 'start'),
      label(X(0.84), Y(0.9), '短期 AS', 'curve-label', 'start'),
      label(X(0.63), Y(0.96), '长期 AS', 'curve-label', 'start'),
    ].join(''),
  )
}

// ------------------------------------------------------------
// 7. 外汇市场：汇率由外币资产供求决定
// ------------------------------------------------------------
function fxMarket() {
  const eqY = Y(0.44)
  return figure(
    [
      frame({
        yLabel: '汇率 E（本币/外币）',
        xLabel: '外币资产数量',
        yTicks: [{ at: 0.44, text: 'E₁' }],
      }),
      path(`M${X(0.14).toFixed(1)},${Y(0.8).toFixed(1)} L${X(0.9).toFixed(1)},${Y(0.16).toFixed(1)}`, 'curve'),
      line(X(0.6), Y(0.1), X(0.6), Y(0.9), 'vertical'),
      path(`M${X(0.32).toFixed(1)},${Y(0.92).toFixed(1)} L${X(0.97).toFixed(1)},${Y(0.34).toFixed(1)}`, 'shift'),
      hguide(eqY, 0, 0.6),
      dot(X(0.6), eqY),
      label(X(0.16), Y(0.86), 'D', 'curve-label', 'start'),
      label(X(0.575), Y(0.96), 'S', 'curve-label', 'end'),
      label(X(0.97), Y(0.4), "D′", 'shift-label', 'start'),
    ].join(''),
  )
}

const CHARTS = {
  'bond-market': bondMarket,
  'liquidity-pref': liquidityPref,
  'yield-curve': yieldCurve,
  'reserve-market': reserveMarket,
  'is-curve': isCurve,
  'ad-as': adAs,
  'fx-market': fxMarket,
}

export const CHART_NAMES = Object.keys(CHARTS)

export function hasChart(name) {
  return Boolean(CHARTS[name])
}

export function chart(name, caption) {
  const draw = CHARTS[name]
  if (!draw) return ''
  const cap = caption ? `<figcaption class="chart__caption">${caption}</figcaption>` : ''
  return `<figure class="chart">${draw()}${cap}</figure>`
}
