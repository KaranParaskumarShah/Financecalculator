import test from 'node:test'
import assert from 'node:assert/strict'
import { taxOn, compareRegimes, hraExemption, simulateTax, suggestions, extraDeductionsToWin } from '../src/calculators/math/tax.js'
const v = { gross: 1500000, otherIncome: 0, age: 0, basicPct: 50, hra: 330000, rent: 540000, metro: 1, d80c: 150000, nps: 50000, d80d: 25000, homeInt: 0, empNps: 0, years: 10, growth: 8, gvol: 4 }
test('new regime: rebate, marginal relief, slabs, surcharge', () => {
  assert.equal(taxOn(1200000, 'new'), 0)
  assert.equal(Math.round(taxOn(1225000, 'new')), 26000) // marginal relief: 25,000 + 4% cess
  assert.equal(Math.round(taxOn(2400000, 'new')), Math.round((20000 + 40000 + 60000 + 80000 + 100000) * 1.04))
  assert.equal(Math.round(taxOn(6000000, 'new')), 1578720)
})
test('old regime: rebate and slabs, senior thresholds', () => {
  assert.equal(taxOn(500000, 'old'), 0)
  assert.equal(Math.round(taxOn(1000000, 'old')), 117000)
  assert.ok(taxOn(800000, 'old', 1) < taxOn(800000, 'old', 0))
})
test('HRA and regime comparison', () => {
  assert.equal(hraExemption(v), 330000 > 540000 - 75000 ? 465000 : Math.min(330000, 465000, 375000))
  const c = compareRegimes(v)
  assert.equal(c.best, 'old')
  assert.ok(c.taxOld < c.taxNew)
  assert.ok(compareRegimes({ ...v, d80c: 0, nps: 0, d80d: 0 }).best === 'new')
})
test('simulation and suggestions', () => {
  const mc = simulateTax(v)
  assert.ok(mc.successProb > 0.3 && mc.successProb < 0.98)
  assert.ok(mc.p5 < mc.p50 && mc.p50 < mc.p95)
  const s = suggestions({ ...v, d80c: 50000 })
  assert.equal(s[0].id, 'c80')
  assert.ok(extraDeductionsToWin({ ...v, d80c: 0, nps: 0, d80d: 0 }) > 0)
})
