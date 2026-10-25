import { normals } from '../../lib/rng.js'
import { bandsFromMatrix, share } from '../../lib/stats.js'
import { emiFor } from './emi.js'

export const STREAM = 13
export const H = 120 // months simulated in the Monte Carlo
export const MAXM = 720

export const minPay = (v, bal) => Math.min(bal, Math.max(v.minFloor, (v.minPct / 100) * bal))

/**
 * Month-by-month card. Interest accrues on the balance, new spending is added,
 * then the payment (minimum + extra, minimum shrinking with the balance) is made.
 *  opts.extra   – extra every month (default v.extra), opts.delay – months before extra starts
 *  opts.fixed   – fixed payment instead of min+extra, opts.spend – new monthly spend (default v.newSpend)
 */
export function cardRun(v, opts = {}) {
  const extra = opts.extra ?? v.extra
  const delay = opts.delay ?? 0
  const spend = opts.spend ?? v.newSpend
  let bal = opts.balance ?? v.balance
  const apr = opts.apr ?? v.apr
  let interest = 0
  let paid = 0
  const path = [bal]
  let m = 0
  let first = null
  while (bal > 0.005 && m < MAXM) {
    m++
    const it = bal * (apr / 1200)
    interest += it
    bal += it + spend
    let pay = opts.fixed != null ? opts.fixed : minPay(v, bal) + (m > delay ? extra : 0)
    if (first == null) first = pay
    pay = Math.min(pay, bal)
    bal -= pay
    paid += pay
    path.push(bal)
    if (m > 12 && bal > path[m - 12] * 1.0001 && bal > v.balance * 3) break // spiralling
  }
  return { months: m, interest, paid, never: bal > 0.005, path, firstPay: first ?? 0, left: Math.max(0, bal) }
}

export const minOnly = (v) => cardRun(v, { extra: 0, spend: 0 })

/** What a purchase really costs if it goes on the card and you pay only minimums. */
export function trueCost(v, price = v.purchase) {
  const a = cardRun({ ...v, balance: v.balance }, { extra: 0, spend: 0 })
  const b = cardRun({ ...v, balance: v.balance + price }, { extra: 0, spend: 0 })
  return { price, paidMore: b.paid - a.paid, interestMore: b.interest - a.interest, monthsMore: b.months - a.months, multiple: price > 0 ? (b.paid - a.paid) / price : 1, never: b.never }
}

/** Fixed payment that clears the balance in `months` (no new spending). */
export const planPayment = (v, months) => emiFor(v.balance, v.apr, months)

export function plans(v) {
  const base = minOnly(v)
  return [12, 24, 36, 60].map((N) => {
    const pay = planPayment(v, N)
    const r = cardRun(v, { fixed: pay, spend: 0 })
    return { months: N, pay, interest: r.interest, saved: base.interest - r.interest, extraOverMin: Math.max(0, pay - minPay(v, v.balance)) }
  })
}

/** Highest APR at which the current payments still clear the card within `months`. */
export function maxAprFor(v, months) {
  const ok = (a) => { const r = cardRun(v, { apr: a }); return !r.never && r.months <= months }
  if (!ok(0)) return null
  let lo = 0, hi = 80
  if (ok(hi)) return hi
  for (let k = 0; k < 30; k++) { const mid = (lo + hi) / 2; ok(mid) ? (lo = mid) : (hi = mid) }
  return lo
}

export function simulateCard(v, { n = 5000 } = {}) {
  const cols = H / 12 + 1
  const { data, stride } = normals(STREAM, 132)
  const mat = new Float64Array(n * cols)
  const intr = new Float64Array(n)
  const months = new Float64Array(n)
  for (let i = 0; i < n; i++) {
    const row = i * stride
    let bal = v.balance, apr = v.apr, ti = 0, m = 0
    mat[i * cols] = bal
    while (bal > 0.005 && m < H) {
      m++
      if ((m - 1) % 12 === 0 && m > 1) apr = Math.min(60, Math.max(5, apr + v.aprVol * data[row + 119 + (m - 1) / 12]))
      const it = bal * (apr / 1200)
      ti += it
      const sp = v.newSpend * Math.exp(0.35 * data[row + m - 1] - 0.06)
      bal += it + sp
      bal -= Math.min(bal, minPay(v, bal) + v.extra)
      if (m % 12 === 0) mat[i * cols + m / 12] = bal
    }
    for (let y = Math.floor(m / 12) + 1; y < cols; y++) mat[i * cols + y] = Math.max(0, bal)
    intr[i] = ti
    months[i] = bal > 0.005 ? 9999 : m
  }
  const bands = bandsFromMatrix(mat, n, cols)
  const ss = Float64Array.from(intr).sort()
  const ms = Float64Array.from(months).sort()
  const at = (a, q) => a[Math.floor((a.length - 1) * q)]
  return {
    n, labels: Array.from({ length: cols }, (_, k) => k), bands, sorted: ss,
    successProb: share(months, (x) => x <= v.targetMonths),
    p5: at(ss, 0.05), p50: at(ss, 0.5), p95: at(ss, 0.95),
    monthsP50: at(ms, 0.5), monthsP95: at(ms, 0.95), stuckProb: share(months, (x) => x > H)
  }
}

/** Extra monthly payment so the card clears within `months` (deterministic, current spending). */
export function extraForMonths(v, months) {
  const ok = (x) => { const r = cardRun(v, { extra: x }); return !r.never && r.months <= months }
  let hi = Math.max(v.balance, 1)
  if (!ok(hi)) return null
  let lo = 0
  if (ok(0)) return 0
  for (let k = 0; k < 40; k++) { const mid = (lo + hi) / 2; ok(mid) ? (hi = mid) : (lo = mid) }
  return hi
}
