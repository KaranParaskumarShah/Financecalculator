// Buy-vs-rent engine. Both paths are modelled fairly, month by month:
//  * BUYER  pays EMI + maintenance/property tax (a % of the current home value) and ends with
//           home value - loan balance - selling costs (+ any surplus invested when rent > owning cost).
//  * RENTER invests the down payment + one-off buying costs on day one, then invests every month's
//           (owning cost - rent) gap, if owning is dearer.
// Both portfolios earn the same return, so the "advantage of buying" is exactly
//   (home equity after selling costs) - (renter's portfolio - buyer's surplus portfolio).
import { normals } from '../../lib/rng.js'
import { bandsFromMatrix, quantile, share } from '../../lib/stats.js'
import { emiFor } from './emi.js'

export const mr = (annualPct) => Math.pow(1 + annualPct / 100, 1 / 12) - 1
export const MAXM = 240 // Monte Carlo months (20 years)
export const DETM = 360 // deterministic search window for breakeven (30 years)

/** Deterministic month-by-month schedules shared by the path model and the simulator. */
export function schedules(v, months) {
  const L = v.price * (1 - v.down / 100)
  const N = Math.round(v.tenure * 12)
  const emi = emiFor(L, v.rate, N)
  const bal = new Float64Array(months + 1)
  const pay = new Float64Array(months + 1)
  const interest = new Float64Array(months + 1)
  const rent = new Float64Array(months + 1)
  bal[0] = L
  for (let m = 1; m <= months; m++) {
    const it = bal[m - 1] * (v.rate / 1200)
    interest[m] = m <= N ? it : 0
    pay[m] = m <= N ? emi : 0
    bal[m] = m < N ? Math.max(0, bal[m - 1] - (emi - it)) : m === N ? 0 : 0
    rent[m] = v.rent * Math.pow(1 + v.rentGrowth / 100, Math.floor((m - 1) / 12))
  }
  return { L, N, emi, bal, pay, interest, rent }
}

/** One deterministic path. months defaults to the horizon. */
export function pathBuyRent(v, months = Math.round(v.horizon * 12)) {
  const S = schedules(v, months)
  const gh = 1 + mr(v.appreciation)
  const gi = 1 + mr(v.investReturn)
  const ri = mr(v.investReturn)
  const down = (v.price * v.down) / 100
  const buyFee = (v.price * v.buyCost) / 100
  let H = v.price
  let B = 0
  let R = down + buyFee
  const home = new Float64Array(months + 1)
  const buyer = new Float64Array(months + 1)
  const renter = new Float64Array(months + 1)
  const adv = new Float64Array(months + 1)
  home[0] = H
  buyer[0] = H * (1 - v.sellCost / 100) - S.bal[0]
  renter[0] = R
  adv[0] = buyer[0] - renter[0]
  const t = { interest: 0, maint: 0, rentPaid: 0, emiPaid: 0, principal: 0, opp: 0 }
  for (let m = 1; m <= months; m++) {
    const maint = (H * v.maintenance) / 1200
    const own = S.pay[m] + maint
    const rent = S.rent[m]
    t.opp += (down + buyFee + t.principal) * ri
    R *= gi
    B *= gi
    if (own > rent) R += own - rent
    else B += rent - own
    H *= gh
    t.interest += S.interest[m]
    t.maint += maint
    t.rentPaid += rent
    t.emiPaid += S.pay[m]
    t.principal += S.pay[m] - S.interest[m]
    home[m] = H
    buyer[m] = H * (1 - v.sellCost / 100) - S.bal[m] + B
    renter[m] = R
    adv[m] = buyer[m] - renter[m]
  }
  return { S, home, buyer, renter, adv, totals: t, down, buyFee, months }
}

/** Advantage of buying (>0 means buying wins) if you sell at `months`. */
export const advantageAt = (v, months = Math.round(v.horizon * 12)) => {
  const p = pathBuyRent(v, months)
  return p.adv[months]
}

/** First month at which buying pulls ahead (null if never within `limit` months). */
export function breakevenMonth(v, limit = DETM) {
  const p = pathBuyRent(v, limit)
  for (let m = 1; m <= limit; m++) if (p.adv[m] >= 0) return m
  return null
}

const bisect = (f, lo, hi, iters = 50) => {
  const flo = f(lo)
  const fhi = f(hi)
  if (flo === 0) return lo
  if (flo * fhi > 0) return null
  let a = lo
  let b = hi
  let fa = flo
  for (let k = 0; k < iters; k++) {
    const mid = (a + b) / 2
    const fm = f(mid)
    if (fm * fa <= 0) b = mid
    else { a = mid; fa = fm }
  }
  return (a + b) / 2
}

/** Monthly rent today that makes buying and renting exactly equal at the horizon (null if buying wins even at zero rent).
 *  The advantage of buying rises with rent, so bisection is exact (it is NOT linear once the sign of own-cost minus rent flips). */
export function breakevenRent(v) {
  if (advantageAt({ ...v, rent: 0 }) >= 0) return null
  let hi = Math.max(v.rent * 2, 1)
  for (let k = 0; k < 40 && advantageAt({ ...v, rent: hi }) < 0; k++) hi *= 2
  return bisect((r) => advantageAt({ ...v, rent: r }), 0, hi, 60)
}

/** Annual home appreciation (%) at which buying breaks even at the horizon. */
export function breakevenAppreciation(v, months) {
  const f = (a) => advantageAt({ ...v, appreciation: a }, months)
  if (f(-8) >= 0) return -8
  if (f(30) < 0) return null
  return bisect(f, -8, 30)
}

/** Highest home price at which buying still breaks even given today's rent (null if buying loses at every price tried). */
export function breakevenPrice(v) {
  const f = (p) => advantageAt({ ...v, price: p })
  const grid = []
  for (let k = 0; k <= 60; k++) grid.push(v.price * (0.2 + (k * 2.8) / 60))
  let best = null
  for (let k = 0; k < grid.length - 1; k++) {
    const a = f(grid[k])
    const b = f(grid[k + 1])
    if (a >= 0 && b < 0) best = bisect(f, grid[k], grid[k + 1], 40) // last crossing from win to loss as price rises
  }
  if (best != null) return best
  return f(grid[grid.length - 1]) >= 0 ? grid[grid.length - 1] : null
}

/** Annual investment return (%) at which renting stops beating buying. */
export function breakevenInvestReturn(v) {
  const f = (r) => advantageAt({ ...v, investReturn: r })
  if (f(0) < 0) return null // buying loses even with 0% on invested money (can't happen normally)
  if (f(30) >= 0) return null
  return bisect(f, 0, 30)
}

/** What the net-worth gap at the horizon does when one assumption moves down / up. Sorted by swing. */
export function sensitivities(v) {
  const base = advantageAt(v)
  const defs = [
    { key: 'appreciation', label: 'Home appreciation', d: 2, fmt: 'pct' },
    { key: 'investReturn', label: 'Investment return', d: 2, fmt: 'pct' },
    { key: 'rentGrowth', label: 'Rent growth', d: 2, fmt: 'pct' },
    { key: 'maintenance', label: 'Maintenance + property tax', d: 0.5, fmt: 'pct' },
    { key: 'rate', label: 'Loan rate', d: 1.5, fmt: 'pct' },
    { key: 'rent', label: 'Rent today', d: v.rent * 0.2, fmt: 'money' }
  ]
  return defs
    .map((d) => {
      const loV = d.key === 'appreciation' ? v[d.key] - d.d : Math.max(0, v[d.key] - d.d)
      const hiV = v[d.key] + d.d
      const lo = advantageAt({ ...v, [d.key]: loV }) - base
      const hi = advantageAt({ ...v, [d.key]: hiV }) - base
      return { ...d, loV, hiV, lo, hi, swing: Math.abs(hi - lo) }
    })
    .sort((a, b) => b.swing - a.swing)
}

/** Grid of advantage under appreciation x investment-return (the "what would have to be true" map). */
export function winnerGrid(v, apps, rets) {
  return rets.map((r) => apps.map((a) => advantageAt({ ...v, appreciation: a, investReturn: r })))
}

/** Approximate cost anatomy at the horizon (simple, non-compounded sums). */
export function anatomy(v, path) {
  const t = path.totals
  const n = path.months
  const sell = path.home[n] * (v.sellCost / 100)
  const appreciation = path.home[n] - v.price
  const owning = t.interest + t.maint + path.buyFee + sell + t.opp
  return {
    interest: t.interest,
    maint: t.maint,
    fees: path.buyFee + sell,
    buyFee: path.buyFee,
    sellFee: sell,
    opp: t.opp,
    appreciation,
    netOwning: owning - appreciation,
    rentPaid: t.rentPaid,
    grossOwning: owning
  }
}

/** Monte Carlo: both assets random; same random draws for every call (stream 11). */
export function simulateBuyRent(v, { n = 5000 } = {}) {
  const Hy = Math.max(1, Math.round(v.horizon))
  const hm = Hy * 12
  const S = schedules(v, MAXM)
  const { data, stride } = normals(11, 480)
  const sI = v.investVol / 100 / Math.sqrt(12)
  const muI = Math.log(1 + v.investReturn / 100) / 12 - 0.5 * sI * sI
  const sH = v.homeVol / 100 / Math.sqrt(12)
  const muH = Math.log(1 + v.appreciation / 100) / 12 - 0.5 * sH * sH
  const rho = 0.25
  const rho2 = Math.sqrt(1 - rho * rho)
  const down = (v.price * v.down) / 100
  const buyFee = (v.price * v.buyCost) / 100
  const cols = Hy + 1
  const buyerMat = new Float64Array(n * cols)
  const renterMat = new Float64Array(n * cols)
  const advH = new Float64Array(n)
  const buyerH = new Float64Array(n)
  const renterH = new Float64Array(n)
  const be = new Float64Array(n)
  const ahead = new Float64Array(21)
  const sellK = 1 - v.sellCost / 100
  for (let i = 0; i < n; i++) {
    let H = v.price
    let B = 0
    let R = down + buyFee
    let lastNeg = 0
    const row = i * stride
    buyerMat[i * cols] = H * sellK - S.bal[0]
    renterMat[i * cols] = R
    if (buyerMat[i * cols] - R >= 0) ahead[0]++
    for (let m = 1; m <= MAXM; m++) {
      const zi = data[row + m - 1]
      const zh = rho * zi + rho2 * data[row + 240 + m - 1]
      const own = S.pay[m] + (H * v.maintenance) / 1200
      const g = Math.exp(muI + sI * zi)
      R *= g
      B *= g
      if (own > S.rent[m]) R += own - S.rent[m]
      else B += S.rent[m] - own
      H *= Math.exp(muH + sH * zh)
      const bw = H * sellK - S.bal[m] + B
      const adv = bw - R
      if (adv < 0) lastNeg = m
      if (m % 12 === 0) {
        if (adv >= 0) ahead[m / 12]++
        if (m <= hm) {
          buyerMat[i * cols + m / 12] = bw
          renterMat[i * cols + m / 12] = R
        }
      }
      if (m === hm) { advH[i] = adv; buyerH[i] = bw; renterH[i] = R }
    }
    // breakeven = the month after which buying STAYS ahead through year 20 (never if it ends behind)
    be[i] = lastNeg >= MAXM ? 9999 : lastNeg + 1
  }
  const bands = bandsFromMatrix(buyerMat, n, cols)
  const renterBands = bandsFromMatrix(renterMat, n, cols)
  const sorted = Float64Array.from(advH).sort()
  const beSorted = Float64Array.from(be).sort()
  const beHist = new Array(21).fill(0) // index y = breakeven in year y (1..20); 0 = never within 20y
  let never = 0
  for (let i = 0; i < n; i++) {
    if (be[i] >= 9999) never++
    else beHist[Math.min(20, Math.ceil(be[i] / 12))]++
  }
  const beQ = (q) => { const x = quantile(beSorted, q); return x >= 9999 ? null : x }
  return {
    n,
    labels: Array.from({ length: cols }, (_, k) => k),
    bands,
    renterBands,
    sorted,
    successProb: share(advH, (x) => x >= 0),
    p5: quantile(sorted, 0.05),
    p50: quantile(sorted, 0.5),
    p95: quantile(sorted, 0.95),
    buyerEnd: { p5: bands.p5[Hy], p50: bands.p50[Hy], p95: bands.p95[Hy] },
    renterEnd: { p5: renterBands.p5[Hy], p50: renterBands.p50[Hy], p95: renterBands.p95[Hy] },
    pAhead: Array.from(ahead, (c) => c / n),
    beHist,
    beNever: never / n,
    beP25: beQ(0.25),
    beP50: beQ(0.5),
    beP75: beQ(0.75)
  }
}
