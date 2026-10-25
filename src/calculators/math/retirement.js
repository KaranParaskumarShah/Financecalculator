import { normals } from '../../lib/rng.js'
import { bandsFromMatrix, quantile } from '../../lib/stats.js'

/** Make the inputs internally consistent. */
export function norm(v) {
  const age = Math.round(v.age)
  const retireAge = Math.max(age + 1, Math.round(v.retireAge))
  const lifeExp = Math.max(retireAge + 2, Math.round(v.lifeExp))
  return { ...v, age, retireAge, lifeExp }
}

/**
 * Deterministic model. Annual steps; contributions mid-year; withdrawals at the
 * start of each retirement year.
 *  ov.delaySave   – skip contributions for the first N years
 *  ov.shock       – array of equity returns applied to the first retirement years (60/40 mix)
 *  ov.inflExtra   – {years, pp}: extra inflation for the first N retirement years
 *  ov.returnPenalty – {years, pp}: lower returns for the first N retirement years
 */
export function retireModel(input, ov = {}) {
  const v = norm(input)
  const pre = v.preReturn / 100
  const post = v.postReturn / 100
  const infl = v.inflation / 100
  const Y = v.retireAge - v.age
  let bal = v.currentCorpus
  let invested = v.currentCorpus
  const series = []
  for (let y = 0; y < Y; y++) {
    series.push({ age: v.age + y, balance: bal, real: bal / Math.pow(1 + infl, y), phase: 'save' })
    const S = y >= (ov.delaySave || 0) ? v.monthlySave * 12 * Math.pow(1 + v.stepUp / 100, y) : 0
    bal = bal * (1 + pre) + S * Math.sqrt(1 + pre)
    invested += S
  }
  const corpusAtRetire = bal
  // retirement phase
  const net0 = Math.max(0, v.monthlyExpense - v.otherIncome) * 12
  let price = Math.pow(1 + infl, Y)
  const expenses = []
  let p = price
  for (let k = 0; k < v.lifeExp - v.retireAge; k++) {
    expenses.push(net0 * p)
    const extra = ov.inflExtra && k < ov.inflExtra.years ? ov.inflExtra.pp / 100 : 0
    p *= 1 + infl + extra
  }
  const rets = expenses.map((_, k) => {
    let r = post
    if (ov.shock && k < ov.shock.length) {
      const bond = Math.max(0, post - 0.02)
      r = 0.6 * ov.shock[k] + 0.4 * bond
    }
    if (ov.returnPenalty && k < ov.returnPenalty.years) r -= ov.returnPenalty.pp / 100
    return r
  })
  // required corpus at retirement (backward recursion, ends at 0 at life expectancy)
  let req = 0
  for (let k = expenses.length - 1; k >= 0; k--) req = req / (1 + rets[k]) + expenses[k]
  let depletedAge = null
  let b = corpusAtRetire
  for (let k = 0; k < expenses.length; k++) {
    series.push({ age: v.retireAge + k, balance: Math.max(0, b), real: Math.max(0, b) / Math.pow(1 + infl, Y + k), phase: 'spend' })
    b = (b - expenses[k]) * (1 + rets[k])
    if (b < -1e-6 * Math.max(1, req) && depletedAge == null) {
      depletedAge = v.retireAge + k
      b = 0
    }
  }
  series.push({ age: v.lifeExp, balance: Math.max(0, b), real: Math.max(0, b) / Math.pow(1 + infl, v.lifeExp - v.age), phase: 'spend' })
  return {
    v,
    yearsToRetire: Y,
    corpusAtRetire,
    corpusReal: corpusAtRetire / Math.pow(1 + infl, Y),
    invested,
    required: req,
    readiness: req > 0 ? corpusAtRetire / req : 1,
    expenseAtRetire: expenses[0] ?? 0,
    swr: corpusAtRetire > 0 ? (expenses[0] ?? 0) / corpusAtRetire : 1,
    depletedAge,
    endBalance: Math.max(0, b),
    series
  }
}

export function simulateRetirement(input, { n = 5000, stream = 4 } = {}) {
  const v = norm(input)
  const Y = v.retireAge - v.age
  const cols = v.lifeExp - v.age + 1
  const sigPre = v.volatility / 100
  const sigPost = sigPre * 0.75
  const muPre = Math.log(1 + v.preReturn / 100) - 0.5 * sigPre * sigPre
  const muPost = Math.log(1 + v.postReturn / 100) - 0.5 * sigPost * sigPost
  const net0 = Math.max(0, v.monthlyExpense - v.otherIncome) * 12
  const { data: Z, stride } = normals(stream, 200) // 0..99 returns, 100..199 inflation
  const mat = new Float64Array(n * cols)
  let ok = 0
  const ruin = new Float64Array(n).fill(-1)
  const finals = new Float64Array(n)
  for (let i = 0; i < n; i++) {
    let bal = v.currentCorpus
    let price = 1
    let dead = false
    const row = i * stride
    for (let t = 0; t < cols; t++) {
      mat[i * cols + t] = dead ? 0 : bal
      if (t === cols - 1) break
      const z = Z[row + t]
      const zi = Z[row + 100 + t]
      if (t < Y) {
        const g = Math.exp(muPre + sigPre * z)
        const S = v.monthlySave * 12 * Math.pow(1 + v.stepUp / 100, t)
        bal = bal * g + S * Math.sqrt(g)
      } else if (!dead) {
        const E = net0 * price
        const g = Math.exp(muPost + sigPost * z)
        bal = (bal - E) * g
        if (bal <= 0) {
          dead = true
          bal = 0
          ruin[i] = v.age + t
        }
      }
      price *= Math.max(0.9, 1 + v.inflation / 100 + 0.012 * zi)
    }
    if (!dead) ok++
    finals[i] = dead ? 0 : bal
  }
  const bands = bandsFromMatrix(mat, n, cols)
  const retIdx = Y
  const atRet = new Float64Array(n)
  for (let i = 0; i < n; i++) atRet[i] = mat[i * cols + retIdx]
  atRet.sort()
  let early = 0
  for (let i = 0; i < n; i++) if (ruin[i] >= 0 && ruin[i] < 80) early++
  return {
    n,
    labels: Array.from({ length: cols }, (_, k) => v.age + k),
    retireIndex: retIdx,
    bands,
    sorted: Float64Array.from(finals).sort(),
    successProb: ok / n,
    earlyRuinProb: early / n,
    corpusP5: quantile(atRet, 0.05),
    corpusP50: quantile(atRet, 0.5),
    corpusP95: quantile(atRet, 0.95),
    p5: bands.p5[retIdx],
    p50: bands.p50[retIdx],
    p95: bands.p95[retIdx]
  }
}

/** Earliest retirement age whose success probability ≥ target (bisection). */
export function earliestRetirementAge(input, { target = 0.85, n = 1200 } = {}) {
  const v = norm(input)
  const lo0 = v.age + 1
  const hi0 = Math.min(v.lifeExp - 5, 80)
  const prob = (ra) => simulateRetirement({ ...v, retireAge: ra }, { n, stream: 4 }).successProb
  if (prob(hi0) < target) return null
  if (prob(lo0) >= target) return lo0
  let lo = lo0
  let hi = hi0
  while (hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2)
    if (prob(mid) >= target) hi = mid
    else lo = mid
  }
  return hi
}

export const STRESS = [
  { id: 'base', label: 'Your base case', note: 'Assumptions exactly as entered', ov: {} },
  { id: 'gfc', label: '2008-style crash', note: 'Equities −37%, then +26%, +15%, +2% (60/40 portfolio)', ov: { shock: [-0.37, 0.26, 0.15, 0.02] } },
  { id: 'covid', label: '2020-style crash & V-recovery', note: 'Equities −30% then +30% (60/40 portfolio)', ov: { shock: [-0.3, 0.3] } },
  { id: 'dotcom', label: 'Lost decade start (2000-style)', note: 'Equities −9%, −12%, −22%, +28% (60/40 portfolio)', ov: { shock: [-0.09, -0.12, -0.22, 0.28] } },
  { id: 'stag', label: 'Stagflation decade', note: 'Inflation +4pp and returns −3pp for 8 years', ov: { inflExtra: { years: 8, pp: 4 }, returnPenalty: { years: 8, pp: 3 } } }
]

export function stressTests(v) {
  return STRESS.map((s) => {
    const m = retireModel(v, s.ov)
    return { ...s, depletedAge: m.depletedAge, endBalance: m.endBalance, survives: m.depletedAge == null }
  })
}

/** Closed form: monthly saving needed to reach `goal` at retirement (deterministic). */
export function savingsForCorpus(v, goal) {
  const zero = retireModel({ ...v, monthlySave: 0 }).corpusAtRetire
  const one = retireModel({ ...v, monthlySave: 1 }).corpusAtRetire - zero
  return one > 0 ? Math.max(0, (goal - zero) / one) : 0
}

function bisect(fn, lo, hi, iters = 14) {
  for (let k = 0; k < iters; k++) {
    const mid = (lo + hi) / 2
    if (fn(mid)) hi = mid
    else lo = mid
  }
  return hi
}

/** Monthly saving that reaches `target` success probability. */
export function savingsForProbability(v, target = 0.85) {
  const prob = (s) => simulateRetirement({ ...v, monthlySave: s }, { n: 1000 }).successProb >= target
  let hi = Math.max(v.monthlySave * 2, v.monthlyExpense)
  let guard = 0
  while (!prob(hi) && guard++ < 8) hi *= 2
  if (!prob(hi)) return null
  return bisect(prob, 0, hi)
}

/** Highest monthly spending (today's money) that still meets `target` success probability. */
export function sustainableSpend(v, target = 0.85) {
  const prob = (e) => simulateRetirement({ ...v, monthlyExpense: e }, { n: 1000 }).successProb < target
  const hi = Math.max(v.monthlyExpense * 4, 1000)
  if (!prob(hi)) return hi
  return bisect(prob, 0, hi) // first spend level that fails; step back slightly
}
