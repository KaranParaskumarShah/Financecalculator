import test from 'node:test'
import assert from 'node:assert/strict'
import { compoundSchedule, doublingYears, shiftReport, monthlyForTarget, simulateCompound, effAnnual } from '../src/calculators/math/compound.js'
const near = (a, b, t = 1e-6) => assert.ok(Math.abs(a - b) <= Math.abs(b) * t + 1e-9, `${a} !≈ ${b}`)
test('lump sum yearly compounding is P(1+r)^n', () => near(compoundSchedule({ principal: 1000, monthly: 0, years: 10, rate: 8, freq: 1 }).final, 1000 * Math.pow(1.08, 10)))
test('doubling: exact vs rule of 72 close at 8%', () => { assert.ok(Math.abs(doublingYears(8, 1) - 9.006) < 0.01); assert.ok(Math.abs(72 / 8 - doublingYears(8, 1)) < 0.1) })
test('earlier start gives more; monthlyForTarget closes the loop', () => {
  const v = { principal: 0, monthly: 1000, years: 20, rate: 9, freq: 12 }
  assert.ok(shiftReport(v, 5).diff > 0 && shiftReport(v, -5).diff < 0)
  const m = monthlyForTarget(v, 500000)
  near(compoundSchedule({ ...v, monthly: m }).final, 500000, 1e-9)
})
test('MC median near straight line when vol is 0, bands ordered otherwise', () => {
  const v = { principal: 1000, monthly: 100, years: 15, rate: 8, freq: 12, volatility: 0, inflation: 3, target: 50000 }
  near(simulateCompound(v).p50, compoundSchedule(v).final, 1e-3)
  const w = simulateCompound({ ...v, volatility: 15 })
  assert.ok(w.p5 < w.p50 && w.p50 < w.p95)
})
