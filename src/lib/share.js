// Shareable links (state in the URL) and the share-card image (canvas, no deps).

export function encodeState(obj) {
  const json = JSON.stringify(obj)
  return btoa(unescape(encodeURIComponent(json))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function decodeState(str) {
  try {
    const b = str.replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(decodeURIComponent(escape(atob(b))))
  } catch {
    return null
  }
}

export function shareUrl(slug, cur, values) {
  return `${location.origin}/${slug}?s=${encodeState({ c: cur, v: values })}`
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function wrap(ctx, text, x, y, maxW, lh, maxLines = 3) {
  const words = text.split(' ')
  let line = ''
  let n = 0
  for (const w of words) {
    const test = line ? `${line} ${w}` : w
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, y)
      y += lh
      line = w
      if (++n >= maxLines - 1) { /* last line gets the rest */ }
    } else line = test
  }
  ctx.fillText(n >= maxLines ? line.slice(0, 60) + '…' : line, x, y)
  return y
}

/**
 * card: { title, bigLabel, big, lines:[string], chart?:{labels,p5,p50,p95}, verdict?, gauge? }
 * Returns a PNG Blob.
 */
export async function renderShareCard(card) {
  const W = 1200
  const H = 630
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')
  const bg = ctx.createLinearGradient(0, 0, W, H)
  bg.addColorStop(0, '#070b18')
  bg.addColorStop(1, '#101a3a')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)
  // glows
  const g1 = ctx.createRadialGradient(1000, 80, 0, 1000, 80, 420)
  g1.addColorStop(0, 'rgba(34,211,238,.28)')
  g1.addColorStop(1, 'rgba(34,211,238,0)')
  ctx.fillStyle = g1
  ctx.fillRect(0, 0, W, H)
  const g2 = ctx.createRadialGradient(120, 600, 0, 120, 600, 420)
  g2.addColorStop(0, 'rgba(139,92,246,.30)')
  g2.addColorStop(1, 'rgba(139,92,246,0)')
  ctx.fillStyle = g2
  ctx.fillRect(0, 0, W, H)
  // neural dots
  ctx.fillStyle = 'rgba(148,180,255,.18)'
  for (let i = 0; i < 46; i++) {
    const x = (i * 137.5) % W
    const y = (i * 91.7 + 40) % H
    ctx.beginPath()
    ctx.arc(x, y, 2, 0, 7)
    ctx.fill()
  }
  // panel
  ctx.fillStyle = 'rgba(255,255,255,.05)'
  roundRect(ctx, 48, 48, W - 96, H - 96, 28)
  ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,.12)'
  ctx.lineWidth = 1.5
  ctx.stroke()

  ctx.fillStyle = '#22d3ee'
  ctx.font = '700 22px Space Grotesk, Inter, system-ui, sans-serif'
  ctx.fillText('FINANCECALCULATOR.SI', 88, 104)
  ctx.fillStyle = '#9fb0d6'
  ctx.font = '500 24px Inter, system-ui, sans-serif'
  ctx.fillText(card.title, 88, 146)

  ctx.fillStyle = '#9fb0d6'
  ctx.font = '500 22px Inter, system-ui, sans-serif'
  ctx.fillText(card.bigLabel, 88, 218)
  const tg = ctx.createLinearGradient(88, 0, 640, 0)
  tg.addColorStop(0, '#22d3ee')
  tg.addColorStop(1, '#a78bfa')
  ctx.fillStyle = tg
  ctx.font = '700 92px Space Grotesk, Inter, system-ui, sans-serif'
  ctx.fillText(card.big, 88, 312)

  ctx.fillStyle = '#e6ecff'
  ctx.font = '500 25px Inter, system-ui, sans-serif'
  let y = 372
  for (const line of card.lines.slice(0, 4)) {
    ctx.fillStyle = '#22d3ee'
    ctx.fillText('›', 88, y)
    ctx.fillStyle = '#e6ecff'
    y = wrap(ctx, line, 116, y, 560, 32, 2) + 44
  }

  // mini cone
  if (card.chart) {
    const { p5, p50, p95 } = card.chart
    const x0 = 720
    const y0 = 150
    const w = 400
    const h = 300
    const max = Math.max(...p95) || 1
    const px = (i) => x0 + (i / (p50.length - 1)) * w
    const py = (v) => y0 + h - (v / max) * h
    ctx.beginPath()
    p95.forEach((v, i) => (i ? ctx.lineTo(px(i), py(v)) : ctx.moveTo(px(i), py(v))))
    for (let i = p5.length - 1; i >= 0; i--) ctx.lineTo(px(i), py(p5[i]))
    ctx.closePath()
    const cg = ctx.createLinearGradient(0, y0, 0, y0 + h)
    cg.addColorStop(0, 'rgba(34,211,238,.35)')
    cg.addColorStop(1, 'rgba(139,92,246,.10)')
    ctx.fillStyle = cg
    ctx.fill()
    ctx.beginPath()
    p50.forEach((v, i) => (i ? ctx.lineTo(px(i), py(v)) : ctx.moveTo(px(i), py(v))))
    ctx.strokeStyle = '#22d3ee'
    ctx.lineWidth = 4
    ctx.stroke()
    ctx.fillStyle = '#9fb0d6'
    ctx.font = '500 18px Inter, system-ui, sans-serif'
    ctx.fillText(card.chartLabel || '5,000 simulated futures', x0, y0 + h + 34)
  }

  ctx.fillStyle = '#9fb0d6'
  ctx.font = '500 19px Inter, system-ui, sans-serif'
  ctx.fillText('Analyzed by FinanceCalculator Super Intelligence · Estimates, not financial advice', 88, H - 72)

  return new Promise((res) => c.toBlob((b) => res(b), 'image/png'))
}
