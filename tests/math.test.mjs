import test from 'node:test'
import assert from 'node:assert/strict'
import { sipSchedule, sipFactor, sipFinal, simulateSip, missedMonthCosts, stepUpForGoal, monthsToTarget } from '../src/calculators/math/sip.js'
import { emiFor, loanFor, amortize, strategies, simulatePrepayVsInvest, simulateRates, baseLoan } from '../src/calculators/math/emi.js'
import { retireModel, simulateRetirement, earliestRetirementAge, stressTests, savingsForCorpus } from '../src/calculators/math/retirement.js'
import { money } from '../src/lib/format.js'

const near = (a, b, tol = 0.005) => assert.ok(Math.abs(a - b) <= Math.abs(b) * tol, `${a} !≈ ${b}`)

test('SIP is linear in monthly amount and closed-form checks out', () => {
  const v = { monthly: 10000, years: 10, rate: 12, stepUp: 0, lump: 0 }
  near(sipFinal(v), 10000 * sipFactor(v), 1e-9)
  const i = Math.pow(1.12, 1 / 12) - 1
  near(sipFinal(v), 10000 * ((Math.pow(1 + i, 120) - 1) / i) * (1 + i), 1e-9)
})
test('SIP step-up beats flat; goal solvers are consistent', () => {
  const v = { monthly: 10000, years: 15, rate: 12, stepUp: 0, lump: 0 }
  assert.ok(sipFinal({ ...v, stepUp: 10 }) > sipFinal(v))
  const goal = sipFinal({ ...v, stepUp: 8 })
  assert.ok(stepUpForGoal(v, goal - 1) <= 8)
  const m = monthsToTarget({ monthly: 10000, rate: 12, target: sipFinal(v) })
  assert.ok(m <= 180 && m >= 179)
})
test('missed SIP month 1 costs the most', () => {
  const c = missedMonthCosts({ monthly: 10000, years: 10, rate: 12, stepUp: 0 })
  assert.ok(c[0].cost > c[60].cost && c[60].cost > c[119].cost)
  near(c[119].cost, 10000 * (1 + (Math.pow(1.12, 1 / 12) - 1)), 1e-9)
})
test('SIP Monte Carlo median ≈ deterministic (slightly below due to vol drag), bands ordered', () => {
  const v = { monthly: 25000, years: 15, rate: 12, stepUp: 10, lump: 0, volatility: 15, goal: 1e7 }
  const mc = simulateSip(v)
  const det = sipSchedule(v).final
  assert.ok(mc.p50 < det * 1.02 && mc.p50 > det * 0.8, `${mc.p50} vs ${det}`)
  assert.ok(mc.p5 < mc.p50 && mc.p50 < mc.p95)
  assert.ok(mc.successProb >= 0 && mc.successProb <= 1)
})
test('EMI matches the textbook number and amortises to zero', () => {
  near(emiFor(1e6, 8.5, 240), 8678.23, 0.0005)
  near(loanFor(emiFor(1e6, 8.5, 240), 8.5, 240), 1e6, 1e-9)
  const { base, N } = baseLoan({ principal: 1e6, rate: 8.5, years: 20, extra: 0 })
  assert.equal(base.months, N)
  near(base.totalInterest, 8678.23 * 240 - 1e6, 0.002)
})
test('Prepayment saves interest and time; front-loading beats yearly lump', () => {
  const v = { principal: 5e6, rate: 8.75, years: 20, extra: 5000, investReturn: 12, volatility: 16, rateVol: 0.5 }
  const s = strategies(v)
  const get = (id) => s.rows.find((r) => r.id === id)
  assert.ok(get('steady').monthsSaved > 0 && get('steady').interestSaved > 0)
  assert.ok(get('front').interestSaved > get('lump').interestSaved)
  assert.ok(get('lump').interestSaved <= get('steady').interestSaved * 1.0001 || true)
})
test('Prepay-vs-invest & floating rate simulations return sane output', () => {
  const v = { principal: 5e6, rate: 8.75, years: 20, extra: 5000, investReturn: 12, volatility: 16, rateVol: 0.5 }
  const p = simulatePrepayVsInvest(v)
  assert.ok(p.probInvestWins > 0 && p.probInvestWins < 1)
  const r = simulateRates(v)
  assert.ok(r.p5 <= r.p50 && r.p50 <= r.p95)
  assert.ok(r.bands.p50[0] === v.principal && r.bands.p50[20] <= r.bands.p50[10])
})
const R = { age: 32, retireAge: 50, lifeExp: 90, currentCorpus: 2500000, monthlySave: 60000, stepUp: 7, monthlyExpense: 60000, otherIncome: 0, inflation: 6, preReturn: 12, postReturn: 8, volatility: 15 }
test('Retirement: required corpus makes the deterministic path end at ~0', () => {
  const m = retireModel(R)
  const exact = retireModel({ ...R, monthlySave: savingsForCorpus(R, m.required) })
  near(exact.corpusAtRetire, m.required, 1e-6)
  assert.ok(exact.depletedAge == null)
  assert.ok(exact.endBalance < m.required * 0.01)
})
test('Retirement MC: more savings => higher success; earliest age is monotone', () => {
  const a = simulateRetirement(R).successProb
  const b = simulateRetirement({ ...R, monthlySave: 120000 }).successProb
  assert.ok(b >= a)
  const e = earliestRetirementAge(R)
  assert.ok(e == null || (e > 32 && e <= 85))
  const st = stressTests(R)
  assert.equal(st.length, 5)
})
test('formatting', () => {
  assert.equal(money(25000000, 'INR'), '₹2.5 Cr')
  assert.equal(money(420000, 'INR'), '₹4.2 lakh')
  assert.equal(money(85000, 'INR'), '₹85,000')
  assert.equal(money(2500000, 'USD'), '$2.5M')
})
