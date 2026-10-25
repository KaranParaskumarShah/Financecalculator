import { normals } from '../../lib/rng.js'
import { bandsFromMatrix } from '../../lib/stats.js'

export const STREAM = 15
export const T = 36 // months simulated

export const burnOf = (v) => v.essential + v.debtPay
export const netBurn = (v) => Math.max(0, burnOf(v) - v.fallback)
export const liquidOf = (v) => v.savings + v.otherLiquid

/** Rule-of-thumb months of cover. Labelled as a guideline in the UI. */
export function targetMonths(v) {
  const dep = Math.min(3, Math.round(v.dependents))
  const job = [0, 1.5, 3][Math.round(v.jobRisk)] ?? 1.5
  const debtHeavy = v.essential > 0 && v.debtPay / v.essential > 0.3 ? 1 : 0
  return 3 + dep + job + debtHeavy
}

/** Straight-line runway with prices rising `inflation`% a year. Returns months (fractional). */
export function runwayMonths(v, liquid = liquidOf(v), burn = netBurn(v)) {
  if (burn <= 0) return Infinity
  const g = Math.pow(1 + v.inflation / 100, 1 / 12)
  let bal = liquid
  for (let m = 0; m < 600; m++) {
    const spend = burn * Math.pow(g, m)
    if (bal < spend) return m + bal / spend
    bal -= spend
  }
  return 600
}

/** Savings needed to cover `months` months (inverse of runwayMonths). */
export function savingsForMonths(v, months) {
  const g = Math.pow(1 + v.inflation / 100, 1 / 12)
  const burn = netBurn(v)
  let need = 0
  const whole = Math.floor(months)
  for (let m = 0; m < whole; m++) need += burn * Math.pow(g, m)
  need += (months - whole) * burn * Math.pow(g, whole)
  return need
}

/** 50/30/20 benchmark vs what is actually possible. */
export function budgetSplit(v) {
  const inc = Math.max(1, v.income)
  const needs = burnOf(v)
  const left = inc - needs
  const ideal = { needs: inc * 0.5, wants: inc * 0.3, save: inc * 0.2 }
  let wants = 0, save = 0
  if (left > 0) { wants = left * 0.6; save = left * 0.4 }
  if (needs <= ideal.needs) { wants = inc * 0.3 + (ideal.needs - needs) * 0.5; save = inc - needs - wants }
  return { inc, needs, left, ideal, wants, save, needsPct: needs / inc }
}

export function monthsToBuild(v, perMonth, months = targetMonths(v)) {
  const gap = savingsForMonths(v, months) - liquidOf(v)
  if (gap <= 0) return 0
  return perMonth > 0 ? Math.ceil(gap / perMonth) : null
}

/**
 * Monte Carlo of a job loss starting today: spending is noisy month to month,
 * inflation drifts, and a one-off bill (medical, repair) arrives ~3% of months.
 */
export function simulateRunway(v, { n = 5000 } = {}) {
  const burn = netBurn(v)
  const liquid = liquidOf(v)
  const g = Math.pow(1 + v.inflation / 100, 1 / 12)
  const sig = 0.2
  const target = targetMonths(v)
  const { data, stride } = normals(STREAM, 108)
  const cols = T + 1
  const mat = new Float64Array(n * cols)
  const surv = new Float64Array(n)
  const atTarget = new Float64Array(n)
  const tm = Math.ceil(target)
  for (let i = 0; i < n; i++) {
    let bal = liquid
    let s = T
    let dead = false
    const row = i * stride
    mat[i * cols] = bal
    atTarget[i] = 0
    for (let m = 1; m <= T; m++) {
      let spend = burn * Math.pow(g, m - 1) * Math.exp(sig * data[row + m - 1] - 0.5 * sig * sig)
      if (data[row + 35 + m] > 1.64) spend += burn * 0.8 * Math.exp(0.5 * data[row + 71 + m])
      if (!dead) {
        if (bal < spend) { dead = true; s = m - 1 + (spend > 0 ? bal / spend : 0); bal = 0 } else bal -= spend
      }
      mat[i * cols + m] = bal
    }
    surv[i] = s
  }
  // balance when the target cover period ends (for the histogram)
  const hist = new Float64Array(n)
  for (let i = 0; i < n; i++) hist[i] = mat[i * cols + Math.min(T, tm)]
  const bands = bandsFromMatrix(mat, n, cols)
  const ss = Float64Array.from(surv).sort()
  const q = (a, p) => a[Math.floor((a.length - 1) * p)]
  let ok = 0
  for (let i = 0; i < n; i++) if (surv[i] >= target) ok++
  const probFor = (d) => { let k = 0; for (let i = 0; i < n; i++) if (surv[i] >= d) k++; return k / n }
  return {
    n, labels: Array.from({ length: cols }, (_, k) => k), bands, sorted: Float64Array.from(hist).sort(),
    surv: ss, successProb: ok / n, target,
    p5: bands.p5[Math.min(T, tm)], p50: bands.p50[Math.min(T, tm)], p95: bands.p95[Math.min(T, tm)],
    monthsP5: q(ss, 0.05), monthsP50: q(ss, 0.5), monthsP95: q(ss, 0.95), probFor
  }
}

/** Survival curve P(runway >= d) for d = 1..18 months. */
export const survivalCurve = (mc) => Array.from({ length: 18 }, (_, k) => ({ month: k + 1, prob: Math.round(mc.probFor(k + 1) * 100) }))
