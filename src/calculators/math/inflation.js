import { normals } from '../../lib/rng.js'
import { bandsFromMatrix, share } from '../../lib/stats.js'

export const STREAM = 17
export const PHI = 0.5 // year-to-year persistence of inflation shocks

export const priceIndex = (infl, years) => Math.pow(1 + infl / 100, years)
export const realReturn = (nominal, infl) => ((1 + nominal / 100) / (1 + infl / 100) - 1) * 100

/** Deterministic: cash purchasing power and the invested amount in today's money, per year. */
export function inflationPath(v) {
  const rows = []
  for (let y = 0; y <= v.years; y++) {
    const idx = priceIndex(v.inflation, y)
    const nominal = v.amount * Math.pow(1 + v.invest / 100, y)
    rows.push({ year: y, index: idx, cash: v.amount / idx, nominal, real: nominal / idx })
  }
  return rows
}

/** Future money needed to match `amount` of today's buying power. */
export const futureNeeded = (amount, infl, years) => amount * priceIndex(infl, years)
/** Inflation rate at which `amount` buys only `share` of today's value after `years`. */
export const inflForShare = (share_, years) => (Math.pow(1 / share_, 1 / years) - 1) * 100
/** Years for the price level to double / for cash to halve. */
export const halvingYears = (infl) => (infl > 0 ? Math.log(2) / Math.log(1 + infl / 100) : Infinity)

/** Mean-reverting annual inflation with stationary sd = vol. Returns price-index paths. */
export function simulateInflation(v, { n = 5000 } = {}) {
  const Y = Math.round(v.years)
  const cols = Y + 1
  const { data, stride } = normals(STREAM, 60)
  const sd = v.vol * Math.sqrt(1 - PHI * PHI)
  const mat = new Float64Array(n * cols)
  const finals = new Float64Array(n)
  const idxFinal = new Float64Array(n)
  for (let i = 0; i < n; i++) {
    let idx = 1
    let nominal = v.amount
    let infl = v.inflation
    mat[i * cols] = nominal
    for (let t = 1; t <= Y; t++) {
      infl = Math.max(-2, v.inflation + PHI * (infl - v.inflation) + sd * data[i * stride + Math.min(t - 1, 59)])
      idx *= 1 + infl / 100
      nominal *= 1 + v.invest / 100
      mat[i * cols + t] = nominal / idx
    }
    finals[i] = mat[i * cols + Y]
    idxFinal[i] = idx
  }
  const bands = bandsFromMatrix(mat, n, cols)
  const sorted = Float64Array.from(finals).sort()
  const si = Float64Array.from(idxFinal).sort()
  const at = (a, q) => a[Math.floor((a.length - 1) * q)]
  const cashShare = (q) => 1 / at(si, q)
  return {
    n, labels: Array.from({ length: cols }, (_, k) => k), bands, sorted,
    successProb: share(finals, (x) => x >= v.amount),
    p5: bands.p5[Y], p50: bands.p50[Y], p95: bands.p95[Y],
    cashP5: v.amount * cashShare(0.95), cashP50: v.amount * cashShare(0.5), cashP95: v.amount * cashShare(0.05),
    idxP50: at(si, 0.5), idxP95: at(si, 0.95), idxP5: at(si, 0.05)
  }
}

/** Nominal return needed so that real value ≥ amount with `conf` probability (bisection). */
export function investForProb(v, conf, n = 2000) {
  const prob = (r) => simulateInflation({ ...v, invest: r }, { n }).successProb
  let hi = 40
  if (prob(hi) < conf) return null
  let lo = -5
  if (prob(lo) >= conf) return lo
  for (let k = 0; k < 24; k++) { const mid = (lo + hi) / 2; prob(mid) >= conf ? (hi = mid) : (lo = mid) }
  return hi
}

/** Indicative everyday prices (today). Clearly illustrative, not live data. */
export const EXAMPLES = {
  inr: [
    { label: 'Cups of coffee', unit: 'cup', price: 150 },
    { label: 'Cinema tickets', unit: 'ticket', price: 300 },
    { label: 'Months of groceries (couple)', unit: 'month', price: 12000 },
    { label: 'Months of 1-BHK rent', unit: 'month', price: 22000 }
  ],
  usd: [
    { label: 'Cups of coffee', unit: 'cup', price: 4.5 },
    { label: 'Cinema tickets', unit: 'ticket', price: 15 },
    { label: 'Months of groceries (couple)', unit: 'month', price: 650 },
    { label: 'Months of 1-bed rent', unit: 'month', price: 1800 }
  ]
}
