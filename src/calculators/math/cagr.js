import { normals } from '../../lib/rng.js'
import { bandsFromMatrix, share } from '../../lib/stats.js'

export const STREAM = 18
const DAY = 86400000
const MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 }
const utc = (y, m, d) => { const t = Date.UTC(y, m, d); const x = new Date(t); return x.getUTCFullYear() === y && x.getUTCMonth() === m && x.getUTCDate() === d ? t : null }

function takeDate(s) {
  let m
  if ((m = s.match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/))) return { t: utc(+m[1], +m[2] - 1, +m[3]), rest: s.replace(m[0], ' ') }
  if ((m = s.match(/(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/))) return { t: utc(+m[3], +m[2] - 1, +m[1]), rest: s.replace(m[0], ' ') } // day first
  if ((m = s.match(/(\d{1,2})(?:st|nd|rd|th)?[\s-]+([A-Za-z]{3,9})\.?,?[\s-]+(\d{4})/)) && MONTHS[m[2].slice(0, 3).toLowerCase()] != null) return { t: utc(+m[3], MONTHS[m[2].slice(0, 3).toLowerCase()], +m[1]), rest: s.replace(m[0], ' ') }
  if ((m = s.match(/([A-Za-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})/)) && MONTHS[m[1].slice(0, 3).toLowerCase()] != null) return { t: utc(+m[3], MONTHS[m[1].slice(0, 3).toLowerCase()], +m[2]), rest: s.replace(m[0], ' ') }
  return null
}

const SUF = { k: 1e3, l: 1e5, lac: 1e5, lakh: 1e5, lakhs: 1e5, cr: 1e7, crore: 1e7, m: 1e6, mn: 1e6, million: 1e6 }
function takeAmount(s) {
  let t = s.replace(/[₹$€£]|rs\.?|inr|usd|eur|gbp/gi, ' ').replace(/,/g, '').replace(/\s+/g, ' ').trim()
  if (!t) return null
  let neg = false
  if (/^\(.*\)$/.test(t)) { neg = true; t = t.slice(1, -1).trim() }
  const m = t.match(/^([+\-−–]?)\s*(\d+(?:\.\d+)?)\s*([a-z]*)$/i)
  if (!m) return null
  let n = parseFloat(m[2])
  const suf = m[3].toLowerCase()
  if (suf) { if (SUF[suf] == null) return null; n *= SUF[suf] }
  if (m[1] === '-' || m[1] === '−' || m[1] === '–') neg = !neg
  return neg ? -n : n
}

/** Tolerant parser: returns every line with a status so the UI can show what was understood. */
export function parseFlows(text) {
  const lines = String(text || '').split(/\r?\n/).flatMap((l) => (/^\s*(#|\/\/)/.test(l) ? [l] : l.split(';')))
  const rows = []
  lines.forEach((raw, i) => {
    const line = raw.trim()
    if (!line || line.startsWith('#') || line.startsWith('//')) return
    const d = takeDate(line)
    if (!d || d.t == null) { if (/date|amount|flow/i.test(line) && !/\d{3}/.test(line)) return; rows.push({ line: i + 1, raw: line, ok: false, error: 'No date found' }); return }
    const amt = takeAmount(d.rest.replace(/^[\s,:|\t]+|[\s,:|\t]+$/g, '').replace(/^[-–−]\s+/, ''))
    if (amt == null || amt === 0) { rows.push({ line: i + 1, raw: line, ok: false, error: amt === 0 ? 'Amount is zero' : 'No amount found' }); return }
    rows.push({ line: i + 1, raw: line, ok: true, t: d.t, amount: amt })
  })
  const good = rows.filter((r) => r.ok).sort((a, b) => a.t - b.t)
  return { rows, good, bad: rows.filter((r) => !r.ok) }
}

const yrs = (t0, t) => (t - t0) / DAY / 365
export const npv = (flows, r) => { const t0 = flows[0].t; return flows.reduce((s, f) => s + f.amount * Math.pow(1 + r, -yrs(t0, f.t)), 0) }

/** XIRR via bracketing + bisection (robust for any sign pattern with a root). */
export function xirr(flows) {
  if (flows.length < 2 || !flows.some((f) => f.amount > 0) || !flows.some((f) => f.amount < 0)) return null
  let lo = -0.9999, hi = 1
  let fl = npv(flows, lo), fh = npv(flows, hi)
  let guard = 0
  while (Math.sign(fl) === Math.sign(fh) && guard++ < 40) { hi *= 2; fh = npv(flows, hi) }
  if (Math.sign(fl) === Math.sign(fh)) return null
  for (let k = 0; k < 200; k++) {
    const mid = (lo + hi) / 2
    const fm = npv(flows, mid)
    if (Math.abs(fm) < 1e-9 * Math.abs(flows[0].amount || 1)) return mid
    if (Math.sign(fm) === Math.sign(fl)) { lo = mid; fl = fm } else hi = mid
  }
  return (lo + hi) / 2
}

/** Future value at the last date of every outflow (minus withdrawals) compounding at `rate` (excl. the final value flow). */
export function benchmarkValue(flows, rate) {
  const T = flows[flows.length - 1].t
  return flows.slice(0, -1).reduce((s, f) => s - f.amount * Math.pow(1 + rate, yrs(f.t, T)), 0)
}

export function analyzeFlows(text) {
  const p = parseFlows(text)
  const out = { parsed: p, valid: false, reason: '' }
  const g = p.good
  if (g.length < 2) { out.reason = 'Need at least two dated cash flows (money in as negative, money out/current value as positive).'; return out }
  if (!g.some((f) => f.amount < 0) || !g.some((f) => f.amount > 0)) { out.reason = 'Include both money you invested (negative) and what you got back or hold now (positive).'; return out }
  const last = g[g.length - 1]
  const first = g[0]
  const invested = g.filter((f) => f.amount < 0).reduce((s, f) => s - f.amount, 0)
  const returned = g.filter((f) => f.amount > 0).reduce((s, f) => s + f.amount, 0)
  const x = xirr(g)
  if (x == null) { out.reason = 'These cash flows have no single annual return that explains them.'; return out }
  const years = Math.max(1 / 365, yrs(first.t, last.t))
  const currentValue = last.amount > 0 ? last.amount : 0
  const single = g.filter((f) => f.amount < 0).length === 1 && g.filter((f) => f.amount > 0).length === 1
  const cagr = single ? Math.pow(returned / invested, 1 / years) - 1 : Math.pow(returned / invested, 1 / Math.max(years / 2, 1 / 365)) - 1
  return { ...out, valid: true, flows: g, first, last, invested, returned, gain: returned - invested, multiple: returned / invested, xirr: x, years, currentValue, single, cagr: single ? cagr : null, lastFlowIsValue: last.amount > 0 }
}

/** Value needed on the last date for the flows to produce `target` XIRR. */
export function valueForXirr(flows, target) {
  const rest = flows.slice(0, -1)
  const T = flows[flows.length - 1].t
  const pv = rest.reduce((s, f) => s + f.amount * Math.pow(1 + target, -yrs(flows[0].t, f.t)), 0)
  return -pv * Math.pow(1 + target, yrs(flows[0].t, T))
}

/** Forward projection of the current value (no further contributions) with lognormal annual returns. */
export function simulateForward(v, a, { n = 5000 } = {}) {
  const Y = Math.round(v.projYears)
  const cols = Y + 1
  const V0 = a.valid ? Math.max(1, a.currentValue || a.returned) : 1
  const { data, stride } = normals(STREAM, 60)
  const sig = v.vol / 100
  const mu = Math.log(1 + v.projRate / 100) - 0.5 * sig * sig
  const mat = new Float64Array(n * cols)
  const finals = new Float64Array(n)
  for (let i = 0; i < n; i++) {
    let bal = V0
    mat[i * cols] = bal
    for (let y = 1; y <= Y; y++) { bal *= Math.exp(mu + sig * data[i * stride + y - 1]); mat[i * cols + y] = bal }
    finals[i] = bal
  }
  const bands = bandsFromMatrix(mat, n, cols)
  const hurdle = V0 * Math.pow(1 + v.inflation / 100, Y)
  return {
    n, V0, hurdle, labels: Array.from({ length: cols }, (_, k) => k), bands, sorted: Float64Array.from(finals).sort(),
    successProb: share(finals, (x) => x >= hurdle), p5: bands.p5[Y], p50: bands.p50[Y], p95: bands.p95[Y]
  }
}

/** Cumulative invested vs the same outflows at a benchmark rate, monthly, for the time machine. */
export function timelineRows(a, bench) {
  if (!a.valid) return []
  const t0 = a.first.t, T = a.last.t
  const months = Math.max(1, Math.round((T - t0) / DAY / 30.44))
  const rows = []
  for (let m = 0; m <= months; m++) {
    const t = t0 + (m / months) * (T - t0)
    let inv = 0, b = 0
    for (const f of a.flows.slice(0, -1)) if (f.t <= t) { inv -= f.amount; b -= f.amount * Math.pow(1 + bench, (t - f.t) / DAY / 365) }
    rows.push({ x: m, t, invested: inv, benchmark: b })
  }
  return rows
}
