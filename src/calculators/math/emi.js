import { normals } from '../../lib/rng.js'
import { bandsFromMatrix, share } from '../../lib/stats.js'

export const emiFor = (P, annualRatePct, months) => {
  const i = annualRatePct / 1200
  if (months <= 0) return P
  return i === 0 ? P / months : (P * i) / (1 - Math.pow(1 + i, -months))
}

/** Largest loan a given EMI supports. */
export const loanFor = (emi, annualRatePct, months) => {
  const i = annualRatePct / 1200
  return i === 0 ? emi * months : (emi * (1 - Math.pow(1 + i, -months))) / i
}

/**
 * Month-by-month amortisation.
 *  extra         – extra principal every month (after `delayExtra` months)
 *  lumpEvery12   – extra principal at every 12th month
 *  lumpAtStart   – one-off prepayment at month 0
 *  stepUpPct     – EMI grows by this % every year
 *  rates         – optional per-year rate path (floating loans)
 */
export function amortize({
  principal,
  rate,
  emi,
  extra = 0,
  lumpEvery12 = 0,
  lumpAtStart = 0,
  delayExtra = 0,
  stepUpPct = 0,
  rates = null,
  maxMonths = 1200
}) {
  let bal = Math.max(0, principal - lumpAtStart)
  let totalInterest = 0
  let extraPaid = lumpAtStart
  let paid = lumpAtStart
  let m = 0
  const yearly = []
  let yi = 0
  let yp = 0
  let cumI = 0
  let cumP = lumpAtStart
  while (bal > 0.005 && m < maxMonths) {
    m++
    const yr = Math.floor((m - 1) / 12)
    const r = rates ? rates[Math.min(yr, rates.length - 1)] : rate
    const interest = bal * (r / 1200)
    const sched = emi * Math.pow(1 + stepUpPct / 100, yr)
    let pay = sched
    if (m > delayExtra) pay += extra
    if (m % 12 === 0) pay += lumpEvery12
    let princ = pay - interest
    if (princ < 0) princ = 0 // rate spike: EMI no longer covers interest
    if (princ > bal) princ = bal
    const actual = princ + interest
    bal -= princ
    totalInterest += interest
    paid += actual
    extraPaid += Math.max(0, actual - emi)
    yi += interest
    yp += princ
    cumI += interest
    cumP += princ
    if (m % 12 === 0 || bal <= 0.005) {
      yearly.push({ year: Math.ceil(m / 12), interest: yi, principal: yp, balance: Math.max(0, bal), cumInterest: cumI, cumPrincipal: cumP })
      yi = 0
      yp = 0
    }
  }
  return { months: m, totalInterest, totalPaid: paid, extraPaid, yearly, finished: bal <= 0.005 }
}

export function baseLoan(v) {
  const N = Math.round(v.years * 12)
  const emi = emiFor(v.principal, v.rate, N)
  const base = amortize({ principal: v.principal, rate: v.rate, emi })
  const mine = amortize({ principal: v.principal, rate: v.rate, emi, extra: v.extra })
  return { N, emi, base, mine }
}

/** The "Debt Destroyer": equal-ish budgets, different payoff paths. */
export function strategies(v) {
  const { N, emi, base } = baseLoan(v)
  const X = v.extra > 0 ? v.extra : emi * 0.08
  const defs = [
    { id: 'base', label: 'Just the EMI', opts: {} },
    { id: 'eight', label: '8% extra every month', opts: { extra: emi * 0.08 } },
    { id: 'steady', label: `${v.extra > 0 ? 'Your extra' : '8% extra'} every month`, opts: { extra: X } },
    { id: 'lump', label: 'Same cash as one yearly bonus payment', opts: { lumpEvery12: X * 12 } },
    { id: 'front', label: 'Same total cash, paid upfront', opts: { lumpAtStart: 'FRONT' } },
    { id: 'stepup', label: 'EMI +5% every year', opts: { stepUpPct: 5 } }
  ]
  const seen = new Set()
  const steadyCash = amortize({ principal: v.principal, rate: v.rate, emi, extra: X }).extraPaid
  const rows = defs
    .map((d) => {
      if (d.opts.lumpAtStart === 'FRONT') d.opts = { lumpAtStart: Math.min(steadyCash, v.principal) }
      const r = amortize({ principal: v.principal, rate: v.rate, emi, ...d.opts })
      return {
        id: d.id,
        label: d.label,
        months: r.months,
        monthsSaved: base.months - r.months,
        interest: r.totalInterest,
        interestSaved: base.totalInterest - r.totalInterest,
        extraPaid: r.extraPaid,
        efficiency: r.extraPaid > 0 ? (base.totalInterest - r.totalInterest) / r.extraPaid : 0
      }
    })
    .filter((r) => {
      const key = `${Math.round(r.months)}-${Math.round(r.interest)}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  const best = rows.filter((r) => r.id !== 'base').sort((a, b) => b.interestSaved - a.interestSaved)[0]
  return { rows, best, N }
}

/** Prepay vs invest: same random market path for both arms. */
export function simulatePrepayVsInvest(v, { n = 3000 } = {}) {
  const { N, emi } = baseLoan(v)
  const M = v.extra > 0 ? v.extra : emi * 0.1
  const payoff = amortize({ principal: v.principal, rate: v.rate, emi, extra: M }).months
  const sig = v.volatility / 100 / Math.sqrt(12)
  const mu = Math.log(1 + v.investReturn / 100) / 12 - 0.5 * sig * sig
  const { data, stride } = normals(2, 480)
  const diffs = new Float64Array(n)
  for (let i = 0; i < n; i++) {
    let a = 0
    let b = 0
    const row = i * stride
    for (let m = 1; m <= N; m++) {
      const g = Math.exp(mu + sig * data[row + m - 1])
      a = m > payoff ? (a + emi + M) * g : a
      b = (b + M) * g
    }
    diffs[i] = b - a // >0 => investing wins
  }
  // deterministic expected-return comparison
  const gi = Math.pow(1 + v.investReturn / 100, 1 / 12)
  let a = 0
  let b = 0
  for (let m = 1; m <= N; m++) {
    a = m > payoff ? (a + emi + M) * gi : a
    b = (b + M) * gi
  }
  const sorted = Float64Array.from(diffs).sort()
  return {
    M,
    payoff,
    probInvestWins: share(diffs, (d) => d > 0),
    medianDiff: sorted[Math.floor(n / 2)],
    p5: sorted[Math.floor(n * 0.05)],
    p95: sorted[Math.floor(n * 0.95)],
    detPrepay: a,
    detInvest: b
  }
}

/** Floating-rate Monte Carlo: EMI is fixed, the rate wanders, tenure stretches or shrinks. */
export function simulateRates(v, { n = 5000 } = {}) {
  const { N, emi } = baseLoan(v)
  const Y = Math.ceil(v.years)
  const cols = Y + 1
  const maxM = N * 2
  const { data, stride } = normals(3, 60)
  const mat = new Float64Array(n * cols)
  const months = new Float64Array(n)
  const interest = new Float64Array(n)
  const kappa = 0.15
  for (let i = 0; i < n; i++) {
    let bal = v.principal
    let r = v.rate
    let m = 0
    let ti = 0
    mat[i * cols] = bal
    let yr = -1
    while (bal > 0.005 && m < maxM) {
      m++
      const y = Math.floor((m - 1) / 12)
      if (y !== yr) {
        yr = y
        if (y > 0) r = Math.max(1, r + kappa * (v.rate - r) + v.rateVol * data[i * stride + Math.min(y, 59)])
      }
      const it = bal * (r / 1200)
      let princ = emi + v.extra - it
      if (princ < 0) princ = 0
      if (princ > bal) princ = bal
      bal -= princ
      ti += it
      if (m % 12 === 0 && m / 12 <= Y) mat[i * cols + m / 12] = Math.max(0, bal)
    }
    // fill years after payoff with 0, and the final partial year
    for (let y = Math.floor(m / 12) + 1; y <= Y; y++) mat[i * cols + y] = 0
    months[i] = m
    interest[i] = ti
  }
  const bands = bandsFromMatrix(mat, n, cols)
  const ms = Float64Array.from(months).sort()
  const is = Float64Array.from(interest).sort()
  const at = (a, q) => a[Math.floor((a.length - 1) * q)]
  return {
    n,
    labels: Array.from({ length: cols }, (_, k) => k),
    bands,
    sorted: is,
    successProb: share(months, (x) => x <= N + 0.5),
    p5: at(is, 0.05),
    p50: at(is, 0.5),
    p95: at(is, 0.95),
    monthsP5: at(ms, 0.05),
    monthsP50: at(ms, 0.5),
    monthsP95: at(ms, 0.95)
  }
}
