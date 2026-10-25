import { normals } from '../../lib/rng.js'
import { bandsFromMatrix, share } from '../../lib/stats.js'

/*
 * Indian individual income tax, FY 2026-27 (AY 2027-28), salaried resident individual.
 * Sources checked Oct 2026: ClearTax "Income tax slabs" and BankBazaar "Income tax slabs FY 2026-27"
 * (Budget 2026 left slabs and basic exemption unchanged versus FY 2025-26):
 *  - New regime slabs: 0-4L nil, 4-8L 5%, 8-12L 10%, 12-16L 15%, 16-20L 20%, 20-24L 25%, >24L 30%.
 *  - Old regime slabs: 0-2.5L nil (3L for 60-79, 5L for 80+), 5% to 5L, 20% to 10L, 30% above.
 *  - Standard deduction: 75,000 new regime, 50,000 old regime.
 *  - 87A rebate: new regime up to 60,000 for taxable income <= 12L (with marginal relief above);
 *    old regime up to 12,500 for taxable income <= 5L.
 *  - Surcharge: 10% (50L-1Cr), 15% (1-2Cr), 25% (2-5Cr), 37% above 5Cr in the old regime only
 *    (new regime capped at 25%). Cess 4%.
 *  - Old-regime deductions modelled: 80C (1.5L), 80CCD(1B) NPS (50k), 80D, 24(b) self-occupied interest (2L),
 *    HRA exemption (least of HRA received, rent - 10% basic, 50%/40% of basic).
 *  - Employer NPS 80CCD(2): up to 14% of basic in the new regime, 10% in the old regime.
 * These are estimates, not tax advice. Capital gains, special-rate income and other deductions are not modelled.
 */
export const STREAM = 12
export const LIMITS = { c80: 150000, nps: 50000, interest24: 200000 }
export const d80dLimit = (v) => (v.age >= 1 ? 50000 : 25000)

const NEW = [[400000, 0], [800000, 0.05], [1200000, 0.1], [1600000, 0.15], [2000000, 0.2], [2400000, 0.25], [Infinity, 0.3]]
const oldSlabs = (age) => {
  const nil = age >= 2 ? 500000 : age === 1 ? 300000 : 250000
  return age >= 2 ? [[500000, 0], [1000000, 0.2], [Infinity, 0.3]] : [[nil, 0], [500000, 0.05], [1000000, 0.2], [Infinity, 0.3]]
}

function slabTax(income, slabs) {
  let tax = 0, prev = 0
  for (const [cap, r] of slabs) {
    if (income > prev) tax += (Math.min(income, cap) - prev) * r
    prev = cap
    if (income <= cap) break
  }
  return tax
}

const SURCH = [[5000000, 0], [10000000, 0.1], [20000000, 0.15], [50000000, 0.25], [Infinity, null]]
const surchRate = (inc, isNew) => { for (const [cap, r] of SURCH) if (inc <= cap) return r === null ? (isNew ? 0.25 : 0.37) : r; return 0 }

/** Tax (incl. surcharge with marginal relief and 4% cess) on a taxable income. */
export function taxOn(taxable, regime, age = 0) {
  const isNew = regime === 'new'
  const slabs = isNew ? NEW : oldSlabs(age)
  const base = (x) => {
    let t = slabTax(x, slabs)
    if (isNew) { if (x <= 1200000) t = Math.max(0, t - 60000); else t = Math.min(t, x - 1200000) }
    else if (x <= 500000) t = Math.max(0, t - 12500)
    return t
  }
  let tax = base(taxable)
  const r = surchRate(taxable, isNew)
  if (r > 0) {
    let withS = tax * (1 + r)
    // marginal relief: never pay more than (tax at the surcharge threshold + income above it)
    const thr = SURCH.map(([c]) => c).filter((c) => Number.isFinite(c) && c < taxable).pop()
    if (thr != null) {
      const rPrev = surchRate(thr, isNew)
      const cap = base(thr) * (1 + rPrev) + (taxable - thr)
      withS = Math.min(withS, cap)
    }
    tax = withS
  }
  return tax * 1.04
}

export function hraExemption(v) {
  const basic = (v.gross * v.basicPct) / 100
  if (v.hra <= 0 || v.rent <= 0) return 0
  return Math.max(0, Math.min(v.hra, v.rent - 0.1 * basic, basic * (v.metro === 1 ? 0.5 : 0.4)))
}

/** Full breakdown for both regimes. */
export function compareRegimes(v) {
  const basic = (v.gross * v.basicPct) / 100
  const empNew = Math.min(v.empNps, basic * 0.14)
  const empOld = Math.min(v.empNps, basic * 0.1)
  const gross = v.gross + v.otherIncome
  const hra = hraExemption(v)
  const ded = {
    hra,
    c80: Math.min(v.d80c, LIMITS.c80),
    nps: Math.min(v.nps, LIMITS.nps),
    d80: Math.min(v.d80d, d80dLimit(v) + 25000), // self + parents headroom shown to user; cap generously
    int24: Math.min(v.homeInt, LIMITS.interest24),
    emp: empOld
  }
  const oldTaxable = Math.max(0, gross - 50000 - ded.hra - ded.c80 - ded.nps - ded.d80 - ded.int24 - ded.emp)
  const newTaxable = Math.max(0, gross - 75000 - empNew)
  const taxOld = taxOn(oldTaxable, 'old', v.age)
  const taxNew = taxOn(newTaxable, 'new')
  const best = taxOld < taxNew ? 'old' : 'new'
  const tax = Math.min(taxOld, taxNew)
  return { gross, ded, oldTaxable, newTaxable, taxOld, taxNew, best, tax, saving: Math.abs(taxOld - taxNew), totalOldDed: 50000 + ded.hra + ded.c80 + ded.nps + ded.d80 + ded.int24 + ded.emp, takeHome: (gross - tax) / 12, effective: gross > 0 ? tax / gross : 0 }
}

/** Ranked unused-deduction opportunities, valued with the exact old-regime tax. */
export function suggestions(v) {
  const cur = compareRegimes(v)
  const items = [
    { id: 'c80', label: 'Section 80C (PPF, ELSS, EPF, life insurance)', room: LIMITS.c80 - Math.min(v.d80c, LIMITS.c80), key: 'd80c', now: v.d80c, to: LIMITS.c80 },
    { id: 'nps', label: 'NPS own contribution, 80CCD(1B)', room: LIMITS.nps - Math.min(v.nps, LIMITS.nps), key: 'nps', now: v.nps, to: LIMITS.nps },
    { id: 'd80d', label: 'Health insurance, 80D', room: Math.max(0, d80dLimit(v) - v.d80d), key: 'd80d', now: v.d80d, to: Math.max(v.d80d, d80dLimit(v)) },
    { id: 'int24', label: 'Home-loan interest, 24(b)', room: v.homeInt > 0 ? Math.max(0, LIMITS.interest24 - v.homeInt) : 0, key: 'homeInt', now: v.homeInt, to: LIMITS.interest24 }
  ]
  return items.filter((i) => i.room > 0).map((i) => {
    const after = compareRegimes({ ...v, [i.key]: i.to })
    return { ...i, saved: cur.taxOld - after.taxOld, perUnit: i.room > 0 ? (cur.taxOld - after.taxOld) / i.room : 0, flipsToOld: cur.best === 'new' && after.best === 'old' }
  }).sort((a, b) => b.saved - a.saved)
}

/** Extra old-regime deductions (beyond current) needed for the old regime to equal the new one. */
export function extraDeductionsToWin(v, margin = 0) {
  const cur = compareRegimes(v)
  const target = cur.taxNew - margin
  if (cur.taxOld <= target) return 0
  const taxAt = (x) => taxOn(Math.max(0, cur.oldTaxable - x), 'old', v.age)
  if (taxAt(cur.oldTaxable) > target) return null
  let lo = 0, hi = cur.oldTaxable
  for (let k = 0; k < 50; k++) { const mid = (lo + hi) / 2; taxAt(mid) <= target ? (hi = mid) : (lo = mid) }
  return hi
}

/** Gross salary at which both regimes cost the same, holding deductions fixed (scan). */
export function tieIncome(v, deductions) {
  const advantage = (g) => { const w = { ...v, gross: g, otherIncome: 0 }; const taxable = Math.max(0, g - deductions); return taxOn(taxable, 'old', v.age) - taxOn(Math.max(0, g - 75000), 'new') }
  let prev = advantage(500000)
  for (let g = 500000; g <= 20000000; g += 25000) {
    const a = advantage(g)
    if (a !== 0 && Math.sign(a) !== Math.sign(prev) && prev !== 0) return g
    prev = a
  }
  return null
}

/** 10-year outlook with income growth. Year 0 carries bonus noise; deductions held constant in rupees. */
export function simulateTax(v, { n = 5000 } = {}) {
  const Y = Math.round(v.years)
  const cols = Y + 1
  const { data, stride } = normals(STREAM, 40)
  const mat = new Float64Array(n * cols)
  const finals = new Float64Array(n)
  const oldWins = new Float64Array(n)
  for (let i = 0; i < n; i++) {
    const row = i * stride
    let g = v.gross * Math.exp(0.08 * data[row] - 0.0032)
    for (let y = 0; y <= Y; y++) {
      if (y > 0) g *= 1 + (v.growth + v.gvol * data[row + y]) / 100
      const r = compareRegimes({ ...v, gross: g, hra: v.hra * (g / v.gross), rent: v.rent })
      mat[i * cols + y] = r.tax
      if (y === 0) oldWins[i] = r.best === 'old' ? 1 : 0
    }
    finals[i] = mat[i * cols + Y]
  }
  const bands = bandsFromMatrix(mat, n, cols)
  return {
    n, labels: Array.from({ length: cols }, (_, k) => k), bands, sorted: Float64Array.from(finals).sort(),
    successProb: share(oldWins, (x) => x === 1), p5: bands.p5[Y], p50: bands.p50[Y], p95: bands.p95[Y]
  }
}

/** Year-by-year deterministic tax for both regimes under income growth (time machine). */
export function growthPath(v) {
  const rows = []
  let g = v.gross
  for (let y = 0; y <= v.years; y++) {
    const r = compareRegimes({ ...v, gross: g, hra: v.hra * (g / v.gross) })
    rows.push({ year: y, gross: g, taxOld: r.taxOld, taxNew: r.taxNew, best: r.best, tax: r.tax })
    g *= 1 + v.growth / 100
  }
  return rows
}
