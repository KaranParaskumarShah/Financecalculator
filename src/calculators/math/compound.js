import { normals } from '../../lib/rng.js'
import { bandsFromMatrix, quantile, share } from '../../lib/stats.js'

// ---------------------------------------------------------------------------
// Compound interest maths (pure, node-testable).
// Conventions: `rate` is the NOMINAL annual rate in %, compounded `freq` times a
// year. It is converted to an effective annual rate, then to a monthly rate, so the
// deterministic engine and the Monte Carlo engine share the same expected growth.
// Monthly contributions are made at the START of each month.
// ---------------------------------------------------------------------------

export const STREAM = 10

/** Effective annual rate (decimal) for a nominal % rate compounded `freq` times a year. */
export const effAnnual = (ratePct, freq = 12) => Math.pow(1 + ratePct / 100 / Math.max(1, freq), Math.max(1, freq)) - 1

export const monthlyFromEff = (re) => Math.pow(1 + re, 1 / 12) - 1

/** Year-by-year schedule. */
export function compoundSchedule({ principal = 0, monthly = 0, years, rate, freq = 12 }) {
  const n = Math.max(0, Math.round(years * 12))
  const i = monthlyFromEff(effAnnual(rate, freq))
  let bal = principal
  let contrib = 0
  const yearly = [{ year: 0, balance: bal, principal, contrib: 0, growth: 0 }]
  for (let m = 1; m <= n; m++) {
    bal = (bal + monthly) * (1 + i)
    contrib += monthly
    if (m % 12 === 0 || m === n) {
      const y = m / 12
      if (m % 12 !== 0 && yearly.some((r) => r.year === y)) continue
      yearly.push({ year: y, balance: bal, principal, contrib, growth: bal - principal - contrib })
    }
  }
  const invested = principal + contrib
  return { final: bal, invested, gain: bal - invested, yearly, months: n, re: effAnnual(rate, freq) }
}

export const compoundFinal = (v) => compoundSchedule(v).final

/** Exact years for money to double at this nominal rate / compounding. */
export const doublingYears = (ratePct, freq = 12) => {
  const re = effAnnual(ratePct, freq)
  return re > 0 ? Math.log(2) / Math.log(1 + re) : Infinity
}
/** The Rule of 72 shortcut. */
export const rule72 = (ratePct) => (ratePct > 0 ? 72 / ratePct : Infinity)

/** Years until balance first reaches target (months resolution), or null (> 100 yrs). */
export function monthsToTarget({ principal = 0, monthly = 0, rate, freq = 12, target }) {
  const i = monthlyFromEff(effAnnual(rate, freq))
  let bal = principal
  if (bal >= target) return 0
  for (let m = 1; m <= 1200; m++) {
    bal = (bal + monthly) * (1 + i)
    if (bal >= target) return m
  }
  return null
}

/** Monthly contribution needed (straight line) to reach `target`. Closed form via linearity. */
export function monthlyForTarget(v, target) {
  const unit = compoundSchedule({ ...v, principal: 0, monthly: 1 }).final
  const fromP = compoundSchedule({ ...v, monthly: 0 }).final
  return unit > 0 ? Math.max(0, (target - fromP) / unit) : 0
}

/** Return needed (nominal %, at the given compounding) to reach target. Bisection. */
export function rateForTarget(v, target) {
  let lo = 0
  let hi = 60
  if (compoundFinal({ ...v, rate: hi }) < target) return null
  if (compoundFinal({ ...v, rate: lo }) >= target) return 0
  for (let k = 0; k < 50; k++) {
    const mid = (lo + hi) / 2
    compoundFinal({ ...v, rate: mid }) >= target ? (hi = mid) : (lo = mid)
  }
  return hi
}

// ----- the "start earlier / later" counterfactual -----------------------------

/** Final value if you had started `n` years earlier (n>0) or later (n<0) and finished on the same date. */
export const shiftFinal = (v, n) => compoundFinal({ ...v, years: Math.max(0, v.years + n) })

/**
 * Full counterfactual breakdown. n>0: started n years earlier; n<0: started |n| years later.
 * `diff` is the exact money difference at the finish. `extraContrib` is the extra (or lost) money
 * you would have paid in; `extraGrowth` is the rest (pure compounding).
 */
export function shiftReport(v, n) {
  const base = compoundSchedule(v)
  const yrs = Math.max(0, v.years + n)
  const alt = compoundSchedule({ ...v, years: yrs })
  const diff = alt.final - base.final
  const extraContrib = alt.invested - base.invested
  const extraGrowth = diff - extraContrib
  // same total money, spread over the longer/shorter window
  const sameTotalMonthly = yrs > 0 ? (v.monthly * v.years) / yrs : 0
  const sameTotal = compoundSchedule({ ...v, years: yrs, monthly: sameTotalMonthly })
  return {
    n, years: yrs, base: base.final, alt: alt.final, diff, extraContrib, extraGrowth,
    sameTotalMonthly, sameTotalFinal: sameTotal.final, sameTotalDiff: sameTotal.final - base.final,
    // every rupee you already hold gets this much extra growth
    liftMultiple: Math.pow(1 + base.re, n)
  }
}

/** Final value for a sweep of shifts. */
export function shiftCurve(v, from = -10, to = 10) {
  const out = []
  for (let n = from; n <= to; n++) {
    if (v.years + n < 0) continue
    out.push({ n, final: shiftFinal(v, n) })
  }
  return out
}

// ----- Monte Carlo (annual steps, closed-form monthly contributions) ----------

/**
 * Simulates annual lognormal returns. Because final value is linear in principal and monthly
 * contribution for a given return path, we also return the per-path factors A (growth of 1 of principal)
 * and B (future value of 1 a month), which makes "what monthly do I need for X% confidence" exact.
 */
export function annualPaths({ principal = 0, monthly = 0, reEff, vol, years, n = 5000, stream = STREAM, keepMatrix = false }) {
  const Y = Math.min(240, Math.max(0, Math.round(years)))
  const { data, stride } = normals(stream, 240)
  const sig = vol / 100
  const mu = Math.log(1 + reEff) - 0.5 * sig * sig
  const cols = Y + 1
  const A = new Float64Array(n)
  const B = new Float64Array(n)
  const mat = keepMatrix ? new Float64Array(n * cols) : null
  for (let i = 0; i < n; i++) {
    let a = 1
    let b = 0
    const row = i * stride
    if (mat) mat[i * cols] = principal
    for (let y = 0; y < Y; y++) {
      const x = mu + sig * data[row + y]
      const G = Math.exp(x)
      const g = Math.exp(x / 12)
      const ann = Math.abs(g - 1) < 1e-12 ? 12 : (g * (G - 1)) / (g - 1)
      a *= G
      b = b * G + ann
      if (mat) mat[i * cols + y + 1] = principal * a + monthly * b
    }
    A[i] = a
    B[i] = b
  }
  const finals = new Float64Array(n)
  for (let i = 0; i < n; i++) finals[i] = principal * A[i] + monthly * B[i]
  return { Y, cols, A, B, finals, mat, n }
}

export function simulateCompound(v, { n = 5000 } = {}) {
  const re = effAnnual(v.rate, v.freq)
  const det = compoundSchedule(v)
  const P = annualPaths({ principal: v.principal, monthly: v.monthly, reEff: re, vol: v.volatility, years: v.years, n, keepMatrix: true })
  const bands = bandsFromMatrix(P.mat, n, P.cols)
  const sorted = Float64Array.from(P.finals).sort()
  const infl = Math.pow(1 + v.inflation / 100, P.Y)
  return {
    n,
    labels: Array.from({ length: P.cols }, (_, k) => k),
    bands,
    sorted,
    invested: det.yearly.map((y) => y.principal + y.contrib),
    deterministic: det.yearly.map((y) => y.balance),
    successProb: v.target > 0 ? share(P.finals, (x) => x >= v.target) : null,
    // share of futures where, after inflation, you end with less than you put in
    lossProb: share(P.finals, (x) => x / infl < det.invested),
    beatInflationProb: share(P.finals, (x) => x / infl >= det.invested),
    p5: bands.p5[P.Y],
    p50: bands.p50[P.Y],
    p95: bands.p95[P.Y]
  }
}

/** Monthly contribution for a given probability of reaching target (exact per-path solve + bisection check). */
export function monthlyForConfidence(v, target, conf, { n = 5000 } = {}) {
  const re = effAnnual(v.rate, v.freq)
  const P = annualPaths({ principal: v.principal, monthly: 0, reEff: re, vol: v.volatility, years: v.years, n })
  // bisection on the share of paths that succeed (A, B are per-path factors, so each probe is O(n))
  const prob = (m) => {
    let k = 0
    for (let i = 0; i < n; i++) if (v.principal * P.A[i] + m * P.B[i] >= target) k++
    return k / n
  }
  let lo = 0
  let hi = Math.max(1, monthlyForTarget(v, target) * 4 + 1)
  if (prob(hi) < conf) return null
  if (prob(0) >= conf) return 0
  for (let k = 0; k < 40; k++) {
    const mid = (lo + hi) / 2
    prob(mid) >= conf ? (hi = mid) : (lo = mid)
  }
  return hi
}

export { quantile }
