import { annualPaths, effAnnual } from './compound.js'
import { bandsFromMatrix } from '../../lib/stats.js'
import { share } from '../../lib/stats.js'

export const STREAM = 16

/** Goal in future money (optionally inflated from today's money). */
export const goalNominal = (v) => (v.inflAdj ? v.goal * Math.pow(1 + v.inflation / 100, v.years) : v.goal)

/** Straight-line path (annual steps; contributions monthly, start of month, effective annual rate). */
export function goalPath(v, monthly = v.monthly) {
  const i = Math.pow(1 + v.rate / 100, 1 / 12) - 1
  let bal = v.saved
  const out = [bal]
  for (let m = 1; m <= v.years * 12; m++) {
    bal = (bal + monthly) * (1 + i)
    if (m % 12 === 0) out.push(bal)
  }
  return out
}
export const goalFinal = (v, monthly = v.monthly) => goalPath(v, monthly)[v.years]

/** Monthly saving that reaches the goal exactly on a straight line (linear in monthly). */
export function monthlyStraight(v) {
  const zero = goalFinal(v, 0)
  const one = goalFinal(v, 1) - zero
  return one > 0 ? Math.max(0, (goalNominal(v) - zero) / one) : 0
}

const paths = (v, keep = false, n = 5000) =>
  annualPaths({ principal: v.saved, monthly: v.monthly, reEff: v.rate / 100, vol: v.vol, years: v.years, n, stream: STREAM, keepMatrix: keep })

export function simulateGoal(v, { n = 5000 } = {}) {
  const P = paths(v, true, n)
  const G = goalNominal(v)
  const bands = bandsFromMatrix(P.mat, n, P.cols)
  const glide = goalPath(v, monthlyStraight(v)) // plan that exactly hits the goal on a straight line
  const track = glide.map((g, y) => { let k = 0; for (let i = 0; i < n; i++) if (P.mat[i * P.cols + y] >= g * 0.999) k++; return k / n })
  const sorted = Float64Array.from(P.finals).sort()
  return {
    n, labels: Array.from({ length: P.cols }, (_, k) => k), bands, sorted,
    successProb: share(P.finals, (x) => x >= G), glide, track, goal: G,
    p5: bands.p5[P.Y], p50: bands.p50[P.Y], p95: bands.p95[P.Y], det: goalPath(v)
  }
}

/** Monthly saving for a given success probability (bisection over per-path linear factors). */
export function monthlyForProb(v, conf, n = 5000) {
  const P = paths({ ...v, monthly: 0 }, false, n)
  const G = goalNominal(v)
  const prob = (m) => { let k = 0; for (let i = 0; i < n; i++) if (v.saved * P.A[i] + m * P.B[i] >= G) k++; return k / n }
  if (prob(0) >= conf) return 0
  let hi = Math.max(1, monthlyStraight(v) * 5 + 1)
  if (prob(hi) < conf) return null
  let lo = 0
  for (let k = 0; k < 45; k++) { const mid = (lo + hi) / 2; prob(mid) >= conf ? (hi = mid) : (lo = mid) }
  return hi
}

export const probOf = (v, n = 1500) => simulateGoal(v, { n }).successProb

/** Fewest whole years reaching `conf` probability, or null. */
export function yearsForProb(v, conf) {
  for (let y = 1; y <= 40; y++) if (probOf({ ...v, years: y }) >= conf) return y
  return null
}

/** Largest goal (today's money if inflAdj) reachable at probability `conf`. */
export function goalForProb(v, conf) {
  const P = paths(v, false, 5000)
  const s = Float64Array.from(P.finals).sort()
  const q = s[Math.floor((1 - conf) * (s.length - 1))]
  return v.inflAdj ? q / Math.pow(1 + v.inflation / 100, v.years) : q
}
export { effAnnual }
