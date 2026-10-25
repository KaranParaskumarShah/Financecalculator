import test from 'node:test'
import assert from 'node:assert/strict'
import { cardRun, minOnly, planPayment, trueCost, extraForMonths, simulateCard } from '../src/calculators/math/card.js'
const v = { balance: 150000, apr: 36, minPct: 5, minFloor: 200, extra: 3000, newSpend: 0, aprVol: 3, targetMonths: 36, purchase: 30000 }
test('minimum trap is long and costly', () => {
  const m = minOnly(v)
  assert.ok(m.months > 150 && !m.never)
  assert.ok(m.interest > v.balance)
})
test('fixed plan payment clears in N months', () => {
  const r = cardRun(v, { fixed: planPayment(v, 24), spend: 0 })
  assert.ok(r.months === 24 || r.months === 25)
  assert.ok(Math.abs(r.paid - planPayment(v, 24) * 24) < 5 * planPayment(v, 24))
})
test('true cost > price; extraForMonths consistent; MC bounded', () => {
  assert.ok(trueCost(v).paidMore > v.purchase)
  const x = extraForMonths(v, 24)
  assert.ok(cardRun(v, { extra: x }).months <= 24)
  const mc = simulateCard(v)
  assert.ok(mc.successProb > 0.3 && mc.successProb <= 1)
})
