import test from 'node:test'
import assert from 'node:assert/strict'
import { parseIntent, EXAMPLES } from '../src/lib/nlp.js'

test('retirement example from the brief', () => {
  const r = parseIntent(EXAMPLES[0])
  assert.equal(r.calc, 'retirement')
  assert.equal(r.currency, 'INR')
  assert.equal(r.patch.retireAge, 50)
  assert.equal(r.patch.monthlySave, 24000)
  assert.equal(r.patch.monthlyExpense, 40000)
  assert.deepEqual(r.reverse, { mode: 'goal', target: 2e7 })
})
test('SIP forward', () => {
  const r = parseIntent(EXAMPLES[1])
  assert.equal(r.calc, 'sip')
  assert.equal(r.patch.monthly, 25000)
  assert.equal(r.patch.years, 15)
  assert.equal(r.patch.rate, 12)
})
test('EMI', () => {
  const r = parseIntent(EXAMPLES[2])
  assert.equal(r.calc, 'emi')
  assert.equal(r.patch.principal, 5e6)
  assert.equal(r.patch.rate, 8.75)
  assert.equal(r.patch.years, 20)
  assert.equal(r.patch.extra, 5000)
})
test('SIP reverse', () => {
  const r = parseIntent(EXAMPLES[3])
  assert.equal(r.calc, 'sip')
  assert.equal(r.patch.years, 10)
  assert.deepEqual(r.reverse, { mode: 'sip', target: 1e7 })
})
test('USD + unknown', () => {
  const r = parseIntent('retire at 55, I am 35, have $150k saved, save $2,000 a month', 'USD')
  assert.equal(r.patch.retireAge, 55)
  assert.equal(r.patch.age, 35)
  assert.equal(r.patch.currentCorpus, 150000)
  assert.equal(r.patch.monthlySave, 2000)
  assert.equal(parseIntent('what is the weather').ok, false)
})

test('new calculators route and fill', () => {
  const g = parseIntent('Will I reach 50 lakh in 8 years saving 30k a month?')
  assert.equal(g.calc, 'goal'); assert.equal(g.patch.goal, 5e6); assert.equal(g.patch.years, 8); assert.equal(g.patch.monthly, 30000)
  const i = parseIntent('What will 1 crore be worth in 20 years at 6% inflation?')
  assert.equal(i.calc, 'inflation'); assert.equal(i.patch.amount, 1e7); assert.equal(i.patch.years, 20); assert.equal(i.patch.inflation, 6)
  const t = parseIntent('Old vs new tax regime on a 18 lakh salary')
  assert.equal(t.calc, 'tax'); assert.equal(t.patch.gross, 1.8e6)
  const c = parseIntent('Credit card 1.5 lakh at 36%, I can pay 5k extra')
  assert.equal(c.calc, 'card'); assert.equal(c.patch.balance, 150000); assert.equal(c.patch.apr, 36); assert.equal(c.patch.extra, 5000)
  const x = parseIntent('I invested 1 lakh 5 years ago, now worth 2 lakh')
  assert.equal(x.calc, 'cagr'); assert.ok(/-100000/.test(x.patch.flows) && /200000/.test(x.patch.flows))
  const r = parseIntent('Should I rent or buy a 80 lakh flat, rent is 25k a month, 10 years')
  assert.equal(r.calc, 'rentvsbuy'); assert.equal(r.patch.price, 8e6); assert.equal(r.patch.rent, 25000)
})
