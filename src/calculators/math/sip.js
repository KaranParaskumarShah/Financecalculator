import { normals } from '../../lib/rng.js'
import { bandsFromMatrix, share } from '../../lib/stats.js'

// Effective-annual rate -> monthly rate, so the deterministic and Monte Carlo
// engines agree on the expected growth.
export const monthlyRate = (annualPct) => Math.pow(1 + annualPct / 100, 1 / 12) - 1

/** Monthly SIP (debited at start of month) with optional annual step-up and lump sum. */
export function sipSchedule({ monthly, years, rate, stepUp = 0, lump = 0 }) {
  const n = Math.round(years * 12)
  const i = monthlyRate(rate)
  let bal = lump
  let inv = lump
  let contrib = monthly
  const yearly = [{ year: 0, balance: bal, invested: inv }]
  for (let m = 1; m <= n; m++) {
    if (m > 1 && (m - 1) % 12 === 0) contrib *= 1 + stepUp / 100
    bal = (bal + contrib) * (1 + i)
    inv += contrib
    if (m % 12 === 0) yearly.push({ year: m / 12, balance: bal, invested: inv })
  }
  return { final: bal, invested: inv, gain: bal - inv, yearly, lastSip: contrib, months: n }
}

export const sipFinal = (v) => sipSchedule(v).final

/** FV of a ₹1/month SIP — the model is linear in `monthly`. */
export const sipFactor = ({ years, rate, stepUp = 0 }) =>
  sipSchedule({ monthly: 1, years, rate, stepUp, lump: 0 }).final

/** Months until the corpus first reaches `target` (null if > 60 yrs). */
export function monthsToTarget({ monthly, rate, stepUp = 0, lump = 0, target }) {
  const i = monthlyRate(rate)
  let bal = lump
  let contrib = monthly
  for (let m = 1; m <= 720; m++) {
    if (m > 1 && (m - 1) % 12 === 0) contrib *= 1 + stepUp / 100
    bal = (bal + contrib) * (1 + i)
    if (bal >= target) return m
  }
  return null
}

/** What skipping the SIP in month k costs at maturity. */
export function missedMonthCosts({ monthly, years, rate, stepUp = 0 }) {
  const n = Math.round(years * 12)
  const i = monthlyRate(rate)
  const out = []
  let contrib = monthly
  for (let k = 1; k <= n; k++) {
    if (k > 1 && (k - 1) % 12 === 0) contrib *= 1 + stepUp / 100
    out.push({ month: k, amount: contrib, cost: contrib * Math.pow(1 + i, n - k + 1) })
  }
  return out
}

/** Corpus for step-up 0..max%. */
export function stepUpCurve(v, max = 25) {
  const out = []
  for (let s = 0; s <= max; s++) out.push({ stepUp: s, corpus: sipFinal({ ...v, stepUp: s }) })
  return out
}

/** Smallest annual step-up (0.5% grid) reaching goal, or null. */
export function stepUpForGoal(v, goal, max = 40) {
  for (let s = 0; s <= max; s += 0.5) if (sipFinal({ ...v, stepUp: s }) >= goal) return s
  return null
}

export function simulateSip(v, { n = 5000 } = {}) {
  const Y = Math.round(v.years)
  const T = Y * 12
  const sigm = v.volatility / 100 / Math.sqrt(12)
  const mu = Math.log(1 + v.rate / 100) / 12 - 0.5 * sigm * sigm
  const { data, stride } = normals(1, 480)
  const cols = Y + 1
  const mat = new Float64Array(n * cols)
  const finals = new Float64Array(n)
  const det = sipSchedule(v)
  for (let i = 0; i < n; i++) {
    let bal = v.lump
    let contrib = v.monthly
    const row = i * stride
    mat[i * cols] = bal
    for (let m = 1; m <= T; m++) {
      if (m > 1 && (m - 1) % 12 === 0) contrib *= 1 + v.stepUp / 100
      bal = (bal + contrib) * Math.exp(mu + sigm * data[row + m - 1])
      if (m % 12 === 0) mat[i * cols + m / 12] = bal
    }
    finals[i] = bal
  }
  const bands = bandsFromMatrix(mat, n, cols)
  const sorted = Float64Array.from(finals).sort()
  return {
    n,
    labels: Array.from({ length: cols }, (_, k) => k),
    bands,
    sorted,
    invested: det.yearly.map((y) => y.invested),
    deterministic: det.yearly.map((y) => y.balance),
    successProb: v.goal > 0 ? share(finals, (x) => x >= v.goal) : null,
    lossProb: share(finals, (x) => x < det.invested),
    p5: bands.p5[Y],
    p50: bands.p50[Y],
    p95: bands.p95[Y]
  }
}
