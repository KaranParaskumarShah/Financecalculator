import test from 'node:test'
import assert from 'node:assert/strict'
import { parseFlows, xirr, analyzeFlows, valueForXirr, simulateForward } from '../src/calculators/math/cagr.js'
test('tolerant parsing', () => {
  const p = parseFlows('2021-01-10, -100000\n10/01/2022  -50,000\n15 Mar 2023, ₹-50k\nnonsense\nJun 1, 2024, (20000)\n2026-10-01, 3.2 lakh')
  assert.equal(p.good.length, 5)
  assert.deepEqual(p.good.map((g) => g.amount), [-100000, -50000, -50000, -20000, 320000])
  assert.equal(p.bad.length, 1)
})
test('xirr matches closed form and round-trips', () => {
  const a = analyzeFlows('2020-01-01, -100000\n2025-01-01, 200000')
  const years = (Date.UTC(2025, 0, 1) - Date.UTC(2020, 0, 1)) / 86400000 / 365
  assert.ok(Math.abs(a.xirr - (Math.pow(2, 1 / years) - 1)) < 1e-6)
  assert.ok(Math.abs(valueForXirr(a.flows, a.xirr) - 200000) < 1)
  assert.equal(a.single, true)
})
test('invalid inputs, losses, MC', () => {
  assert.equal(analyzeFlows('2020-01-01, -100').valid, false)
  assert.equal(analyzeFlows('2020-01-01, 100\n2021-01-01, 200').valid, false)
  const loss = analyzeFlows('2020-01-01, -100\n2022-01-01, 64')
  assert.ok(Math.abs(loss.xirr + 0.2) < 1e-3)
  const mc = simulateForward({ projYears: 10, projRate: 11, vol: 15, inflation: 6 }, analyzeFlows('2020-01-01, -100\n2025-01-01, 200'))
  assert.ok(mc.successProb > 0.5 && mc.successProb < 0.95 && mc.p5 < mc.p50)
})
