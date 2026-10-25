import test from 'node:test'
import assert from 'node:assert/strict'
import { netWorth, loanAfter, project, healthScore, simulateNetWorth } from '../src/calculators/math/networth.js'
const v = { age: 32, income: 100000, expenses: 45000, cash: 250000, investments: 1200000, property: 4500000, otherAssets: 150000, homeLoan: 3000000, otherDebt: 150000, monthlySave: 20000, years: 10, nwTarget: 14000000, rate: 11, propGrowth: 5, vol: 14, loanRate: 8.5, loanEmi: 28000 }
test('net worth, loan amortisation, projection', () => {
  assert.equal(netWorth(v), 250000 + 1200000 + 4500000 + 150000 - 3150000)
  assert.ok(loanAfter(v, 10) < loanAfter(v, 5) && loanAfter(v, 5) < v.homeLoan)
  const p = project(v)
  assert.equal(p[0].nw, netWorth(v))
  assert.ok(p[10].nw > p[0].nw)
})
test('health score bounds and weakest', () => {
  const h = healthScore(v)
  assert.ok(h.total > 0 && h.total < 100)
  assert.ok(h.items.every((i) => i.score >= 0 && i.score <= 100))
  assert.equal(h.items.reduce((s, i) => s + i.weight, 0), 100)
  assert.ok(healthScore({ ...v, cash: 0 }).total < h.total)
})
test('MC median near deterministic, prob in range', () => {
  const mc = simulateNetWorth(v)
  assert.ok(mc.p5 < mc.p50 && mc.p50 < mc.p95)
  assert.ok(mc.successProb > 0.2 && mc.successProb < 0.85, String(mc.successProb))
})
