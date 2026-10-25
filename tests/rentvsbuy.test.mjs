import test from 'node:test'
import assert from 'node:assert/strict'
import { schedules, pathBuyRent, advantageAt, breakevenMonth, breakevenRent, breakevenAppreciation, breakevenPrice, sensitivities, simulateBuyRent, anatomy } from '../src/calculators/math/rentvsbuy.js'

const near = (a, b, tol = 0.005) => assert.ok(Math.abs(a - b) <= Math.max(1e-9, Math.abs(b) * tol), `${a} !≈ ${b}`)
const base = { price: 8000000, down: 20, rate: 8.75, tenure: 20, rent: 24000, rentGrowth: 6, appreciation: 7, maintenance: 1, buyCost: 7, sellCost: 2, investReturn: 10.5, horizon: 10, homeVol: 8, investVol: 15, inflation: 6 }
// every rate, growth and cost at zero: EMI (53,333) > rent (30,000), so the renter invests the gap
const flat = { ...base, rate: 0, appreciation: 0, investReturn: 0, maintenance: 0, buyCost: 0, sellCost: 0, rentGrowth: 0, homeVol: 0, investVol: 0, tenure: 10, rent: 30000, horizon: 10 }

test('loan schedule: textbook EMI, balance reaches zero, principal sums to the loan', () => {
  const S = schedules({ ...base, price: 1250000, down: 20, rate: 8.5, tenure: 20 }, 300)
  near(S.emi, 8678.23, 0.0005)
  assert.equal(S.bal[240], 0)
  assert.equal(S.pay[241], 0)
  let p = 0
  for (let m = 1; m <= 240; m++) p += S.pay[m] - S.interest[m]
  near(p, S.L, 1e-9)
  near(S.bal[1], S.L - (S.emi - (S.L * 0.085) / 12), 1e-9)
})

test('zero rates/growth/costs: advantage of buying equals total rent paid (hand-derived)', () => {
  // buyer = down + T*own ; renter = down + T*(own-rent)  =>  advantage = T*rent
  for (const T of [12, 60, 120]) near(advantageAt(flat, T), T * 30000, 1e-9)
})

test('fees and selling costs hit the buyer on day one', () => {
  const p = pathBuyRent({ ...base, horizon: 1 })
  // buyer starts with price*(1-sell) - loan ; renter starts with down + buying costs
  near(p.adv[0], 8000000 * 0.98 - 6400000 - (1600000 + 560000), 1e-9)
})

test('renter invests the gap when owning is dearer (compounding checks)', () => {
  const v = { ...flat, investReturn: 12 }
  const p = pathBuyRent(v, 12)
  const i = Math.pow(1.12, 1 / 12) - 1
  // renter month 1: (down)*(1+i) + (53333.33-30000)
  near(p.renter[1], 1600000 * (1 + i) + (6400000 / 120 - 30000), 1e-9)
})

test('monotonic: more rent / appreciation helps buying, higher loan rate hurts it', () => {
  const a = advantageAt(base)
  assert.ok(advantageAt({ ...base, rent: 30000 }) > a)
  assert.ok(advantageAt({ ...base, appreciation: 9 }) > a)
  assert.ok(advantageAt({ ...base, rate: 10 }) < a)
  assert.ok(advantageAt({ ...base, investReturn: 14 }) < a)
})

test('breakeven solvers land on zero advantage', () => {
  const r = breakevenRent(base)
  near(advantageAt({ ...base, rent: r }), 0, 1e-6) // tolerance relative to 1e-9 floor -> use abs check below
  assert.ok(Math.abs(advantageAt({ ...base, rent: r })) < 5)
  const a = breakevenAppreciation(base, 120)
  assert.ok(Math.abs(advantageAt({ ...base, appreciation: a })) < 5)
  assert.ok(a > base.appreciation) // renting wins on the defaults, so buying needs more appreciation
  const P = breakevenPrice(base)
  assert.ok(Math.abs(advantageAt({ ...base, price: P })) < 50)
  assert.ok(P < base.price)
  // rent too low for buying even at zero rent? a free place to live is not 'breakeven'
  assert.equal(breakevenRent({ ...base, appreciation: 30, investReturn: 0 }), null)
})

test('breakeven month is the first month the advantage turns non-negative', () => {
  const v = { ...base, rent: 40000 }
  const m = breakevenMonth(v)
  assert.ok(m > 12 && m < 360)
  const p = pathBuyRent(v, 360)
  assert.ok(p.adv[m] >= 0 && p.adv[m - 1] < 0)
  assert.equal(breakevenMonth({ ...base, rent: 1000 }), null)
})

test('sensitivities are ranked by swing', () => {
  const s = sensitivities(base)
  for (let i = 1; i < s.length; i++) assert.ok(s[i - 1].swing >= s[i].swing)
  assert.ok(s[0].swing > 0)
})

test('Monte Carlo: deterministic, bands ordered, collapses to the deterministic path at zero volatility', () => {
  const a = simulateBuyRent(base)
  const b = simulateBuyRent(base)
  assert.equal(a.p50, b.p50)
  assert.equal(a.successProb, b.successProb)
  assert.ok(a.successProb > 0.05 && a.successProb < 0.95)
  assert.ok(a.p5 < a.p50 && a.p50 < a.p95)
  assert.equal(a.bands.p50.length, a.labels.length)
  assert.equal(a.sorted.length, 5000)
  for (let k = 1; k < a.sorted.length; k++) assert.ok(a.sorted[k] >= a.sorted[k - 1])
  // zero vol -> every path equals the deterministic one
  const z = simulateBuyRent({ ...base, homeVol: 0, investVol: 0 })
  near(z.p5, advantageAt(base), 1e-6)
  near(z.p95, advantageAt(base), 1e-6)
  assert.ok(z.successProb === 0 || z.successProb === 1)
  // a higher rent can only raise the chance that buying wins (same random draws)
  assert.ok(simulateBuyRent({ ...base, rent: 40000 }).successProb > a.successProb)
  // probabilities and histogram bookkeeping
  assert.ok(a.pAhead.every((p) => p >= 0 && p <= 1))
  const tot = a.beHist.reduce((s, x) => s + x, 0) / 5000 + a.beNever
  near(tot, 1, 1e-9)
})

test('cost anatomy: interest + maintenance + fees reconcile with the path totals', () => {
  const p = pathBuyRent(base)
  const an = anatomy(base, p)
  near(an.buyFee, 8000000 * 0.07, 1e-9)
  near(an.fees, an.buyFee + an.sellFee, 1e-9)
  assert.ok(an.interest > 0 && an.maint > 0 && an.opp > 0 && an.rentPaid > 0)
  // rent paid over 10y: 24000*12 per year growing 6%
  let r = 0
  for (let y = 0; y < 10; y++) r += 24000 * 12 * Math.pow(1.06, y)
  near(an.rentPaid, r, 1e-9)
})
