import test from 'node:test'
import assert from 'node:assert/strict'
import { runwayMonths, savingsForMonths, targetMonths, budgetSplit, simulateRunway, monthsToBuild } from '../src/calculators/math/emergency.js'
const v = { income: 100000, essential: 45000, debtPay: 10000, savings: 250000, otherLiquid: 0, dependents: 1, jobRisk: 1, fallback: 0, inflation: 6 }
test('runway and its inverse agree', () => {
  const r = runwayMonths(v)
  assert.ok(Math.abs(savingsForMonths(v, r) - 250000) < 1)
  assert.ok(r > 4 && r < 4.6)
  assert.equal(runwayMonths({ ...v, fallback: 60000 }), Infinity)
})
test('target months and 50/30/20', () => {
  assert.equal(targetMonths(v), 5.5)
  const s = budgetSplit(v)
  assert.ok(Math.abs(s.needs + s.wants + s.save - 100000) < 1)
  const rich = budgetSplit({ ...v, essential: 30000, debtPay: 0 })
  assert.ok(rich.save > 20000 - 1)
})
test('MC survival: median near straight line, monotone', () => {
  const mc = simulateRunway(v)
  assert.ok(mc.monthsP5 <= mc.monthsP50 && mc.monthsP50 <= mc.monthsP95)
  assert.ok(Math.abs(mc.monthsP50 - runwayMonths(v)) < 1.2, String(mc.monthsP50))
  assert.ok(mc.probFor(2) >= mc.probFor(6))
  assert.ok(monthsToBuild(v, 20000) > 0)
})
