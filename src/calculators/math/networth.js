import { normals } from '../../lib/rng.js'
import { bandsFromMatrix, share } from '../../lib/stats.js'

export const STREAM = 14
const OTHER_DEBT_YEARS = 3 // other debts are assumed repaid in equal steps over 3 years
const PROP_VOL = 0.08

export const assetsOf = (v) => v.cash + v.investments + v.property + v.otherAssets
export const debtsOf = (v) => v.homeLoan + v.otherDebt
export const netWorth = (v) => assetsOf(v) - debtsOf(v)

/** Home-loan balance after `y` whole years (monthly amortisation). */
export function loanAfter(v, y) {
  let bal = v.homeLoan
  const r = v.loanRate / 1200
  for (let m = 0; m < y * 12 && bal > 0; m++) bal = Math.max(0, bal * (1 + r) - v.loanEmi)
  return bal
}
const otherDebtAfter = (v, y) => Math.max(0, v.otherDebt * (1 - y / OTHER_DEBT_YEARS))

/** Deterministic projection, one row per year. */
export function project(v) {
  const rows = []
  let inv = v.investments
  let prop = v.property
  for (let y = 0; y <= v.years; y++) {
    const loan = loanAfter(v, y), od = otherDebtAfter(v, y)
    const assets = v.cash + inv + prop + v.otherAssets
    rows.push({ year: y, assets, debts: loan + od, nw: assets - loan - od, inv, prop })
    const g = 1 + v.rate / 100
    inv = inv * g + v.monthlySave * 12 * Math.sqrt(g)
    prop *= 1 + v.propGrowth / 100
  }
  return rows
}

/** Six sub-scores (0-100) and a weighted total. Benchmarks are rules of thumb, labelled as such in the UI. */
export function healthScore(v) {
  const inc = Math.max(1, v.income)
  const debtService = v.loanEmi * (v.homeLoan > 0 ? 1 : 0) + v.otherDebt * 0.03
  const nw = netWorth(v)
  const annual = inc * 12
  const expectedNW = Math.max(1, (v.age * annual) / 10)
  const assets = Math.max(1, assetsOf(v))
  const lin = (x, lo, hi) => Math.max(0, Math.min(100, ((x - lo) / (hi - lo)) * 100))
  const items = [
    { id: 'saving', label: 'Savings rate', weight: 20, value: v.monthlySave / inc, shown: `${Math.round((v.monthlySave / inc) * 100)}% of income`, bench: '20%+ of income', score: lin(v.monthlySave / inc, 0, 0.2) },
    { id: 'emergency', label: 'Emergency cash', weight: 20, value: v.cash / Math.max(1, v.expenses + v.loanEmi), shown: `${(v.cash / Math.max(1, v.expenses + v.loanEmi)).toFixed(1)} months`, bench: '6 months of outgoings', score: lin(v.cash / Math.max(1, v.expenses + v.loanEmi), 0, 6) },
    { id: 'debt', label: 'Debt burden', weight: 20, value: debtService / inc, shown: `${Math.round((debtService / inc) * 100)}% of income`, bench: 'under 20% of income', score: 100 - lin(debtService / inc, 0.2, 0.5) },
    { id: 'networth', label: 'Net worth for your age', weight: 20, value: nw / expectedNW, shown: `${(nw / expectedNW).toFixed(1)}× the age rule`, bench: 'age × annual income ÷ 10', score: lin(nw / expectedNW, 0, 1) },
    { id: 'mix', label: 'Investing mix', weight: 10, value: v.investments / assets, shown: `${Math.round((v.investments / assets) * 100)}% of assets invested`, bench: '30%+ in investments', score: lin(v.investments / assets, 0, 0.3) },
    { id: 'leverage', label: 'Leverage', weight: 10, value: debtsOf(v) / assets, shown: `${Math.round((debtsOf(v) / assets) * 100)}% of assets owed`, bench: 'under 30% of assets', score: 100 - lin(debtsOf(v) / assets, 0.3, 0.8) }
  ]
  const total = items.reduce((s, i) => s + (i.score * i.weight) / 100, 0)
  items.forEach((i) => { i.lost = ((100 - i.score) * i.weight) / 100 })
  const weakest = [...items].sort((a, b) => b.lost - a.lost)[0]
  return { items, total, weakest, expectedNW }
}

/** Exact action that lifts a sub-score to 100, with the points it would add. */
export function fixFor(v, item, f) {
  const inc = v.income
  switch (item.id) {
    case 'saving': { const to = Math.round(inc * 0.2); return { text: `Raise monthly saving to ${f.money(to)} (20% of income)`, patch: { monthlySave: to } } }
    case 'emergency': { const to = Math.round((v.expenses + v.loanEmi) * 6); return { text: `Build cash to ${f.money(to)} (6 months of outgoings)`, patch: { cash: to } } }
    case 'debt': { const target = inc * 0.2; const od = Math.max(0, v.otherDebt - Math.max(0, target - v.loanEmi) / 0.03); return { text: v.otherDebt > 0 ? `Clear ${f.money(v.otherDebt - od)} of other debt first (highest rate)` : `Prepay the home loan: EMI is ${Math.round((v.loanEmi / inc) * 100)}% of income`, patch: v.otherDebt > 0 ? { otherDebt: Math.round(od) } : null } }
    case 'networth': return { text: 'Net worth catches up by saving more and keeping returns above inflation', patch: { monthlySave: Math.round(Math.max(v.monthlySave, inc * 0.25)) } }
    case 'mix': { const to = Math.round(assetsOf(v) * 0.3); const move = Math.max(0, to - v.investments); return { text: `Move ${f.money(move)} into investments to reach 30% of assets`, patch: null } }
    default: return { text: 'Reduce debt or grow assets to bring owed amounts under 30% of assets', patch: null }
  }
}

/** Points gained if an item is fixed to full marks. */
export const gainFor = (item) => item.lost

export function simulateNetWorth(v, { n = 5000 } = {}) {
  const Y = Math.round(v.years)
  const cols = Y + 1
  const { data, stride } = normals(STREAM, 100)
  const sigI = v.vol / 100
  const muI = Math.log(1 + v.rate / 100) - 0.5 * sigI * sigI
  const muP = Math.log(1 + v.propGrowth / 100) - 0.5 * PROP_VOL * PROP_VOL
  const loans = Array.from({ length: cols }, (_, y) => loanAfter(v, y) + otherDebtAfter(v, y))
  const mat = new Float64Array(n * cols)
  const finals = new Float64Array(n)
  for (let i = 0; i < n; i++) {
    let inv = v.investments, prop = v.property
    const row = i * stride
    mat[i * cols] = v.cash + inv + prop + v.otherAssets - loans[0]
    for (let y = 1; y <= Y; y++) {
      const g = Math.exp(muI + sigI * data[row + y - 1])
      inv = inv * g + v.monthlySave * 12 * Math.sqrt(g)
      prop *= Math.exp(muP + PROP_VOL * data[row + 50 + y - 1])
      mat[i * cols + y] = v.cash + inv + prop + v.otherAssets - loans[y]
    }
    finals[i] = mat[i * cols + Y]
  }
  const bands = bandsFromMatrix(mat, n, cols)
  const sorted = Float64Array.from(finals).sort()
  return {
    n, labels: Array.from({ length: cols }, (_, k) => k), bands, sorted,
    successProb: share(finals, (x) => x >= v.nwTarget),
    p5: bands.p5[Y], p50: bands.p50[Y], p95: bands.p95[Y]
  }
}

/** Monthly saving that reaches `nwTarget` with probability `conf` (linear in saving per path -> bisection). */
export function savingForTarget(v, conf, n = 2000) {
  const prob = (s) => simulateNetWorth({ ...v, monthlySave: s }, { n }).successProb
  let hi = Math.max(1000, v.income * 2)
  if (prob(hi) < conf) return null
  if (prob(0) >= conf) return 0
  let lo = 0
  for (let k = 0; k < 24; k++) { const mid = (lo + hi) / 2; prob(mid) >= conf ? (hi = mid) : (lo = mid) }
  return hi
}
