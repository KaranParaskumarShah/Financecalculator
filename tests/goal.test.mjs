import test from 'node:test'
import assert from 'node:assert/strict'
import { goalFinal, monthlyStraight, goalNominal, simulateGoal, monthlyForProb } from '../src/calculators/math/goal.js'
const v = { goal: 1000000, years: 10, saved: 50000, monthly: 5000, rate: 8, vol: 14, inflAdj: 1, inflation: 5 }
test('straight-line solve hits the goal exactly', () => {
  const m = monthlyStraight(v)
  assert.ok(Math.abs(goalFinal(v, m) - goalNominal(v)) < 1)
})
test('probability rises with confidence-ladder saving', () => {
  const m50 = monthlyForProb(v, 0.5), m85 = monthlyForProb(v, 0.85), m95 = monthlyForProb(v, 0.95)
  assert.ok(m50 < m85 && m85 < m95)
  const p = simulateGoal({ ...v, monthly: m85 }).successProb
  assert.ok(p >= 0.84 && p <= 0.88, String(p))
})
test('track probability ~50% for glide-path plan at the end, bands ordered', () => {
  const mc = simulateGoal({ ...v, monthly: monthlyStraight(v) })
  assert.ok(mc.bands.p5[10] < mc.bands.p50[10] && mc.bands.p50[10] < mc.bands.p95[10])
  assert.ok(mc.track[10] > 0.35 && mc.track[10] < 0.65)
})
