import test from 'node:test'
import assert from 'node:assert/strict'
import { priceIndex, realReturn, futureNeeded, inflForShare, simulateInflation, investForProb } from '../src/calculators/math/inflation.js'
const v = { amount: 1e7, years: 20, inflation: 6, invest: 7, vol: 1.5 }
test('index, need and inverse', () => {
  assert.ok(Math.abs(priceIndex(6, 20) - 3.2071) < 1e-3)
  assert.ok(Math.abs(futureNeeded(100, 6, 20) - 320.71) < 0.01)
  assert.ok(Math.abs(inflForShare(1 / priceIndex(6, 20), 20) - 6) < 1e-9)
  assert.ok(Math.abs(realReturn(7, 6) - 0.9434) < 1e-3)
})
test('MC: zero vol equals deterministic, prob monotone in return', () => {
  const mc = simulateInflation({ ...v, vol: 0 })
  assert.ok(Math.abs(mc.p50 - v.amount * Math.pow(1.07 / 1.06, 20)) < 1)
  const a = simulateInflation({ ...v, invest: 6.3 }).successProb, b = simulateInflation({ ...v, invest: 7.5 }).successProb
  assert.ok(a < b && a > 0.3)
  const r = investForProb(v, 0.85)
  assert.ok(r > 6 && r < 12)
})
