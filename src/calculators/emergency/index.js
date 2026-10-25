import { burnOf, netBurn, liquidOf, targetMonths, runwayMonths, savingsForMonths, budgetSplit, monthsToBuild, simulateRunway } from '../math/emergency.js'
import { confidenceFromBands } from '../../lib/stats.js'
import Lab from './Lab.jsx'

const usd = (o) => ({ usd: o })
const mo = (n) => `${n >= 100 ? '100+' : n.toFixed(1)} months`

export default {
  id: 'emergency',
  flagship: { label: 'Runway Lab', component: Lab },

  fields: [
    { key: 'income', label: 'Monthly take-home income', kind: 'money', min: 5000, max: 5000000, step: 5000, def: 100000, log: true, group: 'main', sens: { rel: 0.2 }, profiles: usd({ min: 500, max: 100000, step: 100, def: 5000 }) },
    { key: 'essential', label: 'Essential monthly expenses', kind: 'money', min: 2000, max: 3000000, step: 2500, def: 45000, log: true, group: 'main', sens: { rel: 0.2 }, profiles: usd({ min: 300, max: 60000, step: 50, def: 2200 }) },
    { key: 'debtPay', label: 'Monthly debt payments (EMIs, cards)', kind: 'money', min: 0, max: 1000000, step: 1000, def: 10000, group: 'main', sens: { rel: 0.3 }, profiles: usd({ max: 30000, step: 25, def: 400 }) },
    { key: 'savings', label: 'Emergency savings (liquid)', kind: 'money', min: 0, max: 50000000, step: 10000, def: 250000, group: 'main', sens: { rel: 0.3 }, profiles: usd({ max: 1000000, step: 250, def: 9000 }) },
    { key: 'otherLiquid', label: 'Other liquid assets', kind: 'money', min: 0, max: 50000000, step: 10000, def: 0, group: 'main', profiles: usd({ max: 1000000, step: 250, def: 0 }) },
    { key: 'dependents', label: 'People who depend on you', kind: 'select', def: 1, group: 'main', options: [{ value: 0, label: 'Just me' }, { value: 1, label: '1 person' }, { value: 2, label: '2 people' }, { value: 3, label: '3 or more' }] },
    { key: 'jobRisk', label: 'Job / income stability', kind: 'select', def: 1, group: 'main', options: [{ value: 0, label: 'Very stable' }, { value: 1, label: 'Normal' }, { value: 2, label: 'Volatile / freelance' }] },
    { key: 'fallback', label: 'Income you would still have', kind: 'money', min: 0, max: 1000000, step: 1000, def: 0, group: 'advanced', hint: 'Rent, benefits, a partner’s pay if you lose your job', profiles: usd({ max: 20000, step: 50, def: 0 }) },
    { key: 'inflation', label: 'Inflation', kind: 'pct', min: 0, max: 15, step: 0.5, def: 6, group: 'advanced', profiles: usd({ def: 3 }) }
  ],

  compute(v) {
    const burn = netBurn(v), target = targetMonths(v)
    const runway = runwayMonths(v)
    const need = savingsForMonths(v, target)
    const split = budgetSplit(v)
    return { burn, gross: burnOf(v), liquid: liquidOf(v), target, runway, need, gap: Math.max(0, need - liquidOf(v)), funded: need > 0 ? liquidOf(v) / need : 1, split, build: monthsToBuild(v, split.save) }
  },
  simulate: (v) => simulateRunway(v),
  analyze() { return {} },

  hero(ctx) {
    const { v, model, mc, f } = ctx
    return {
      label: 'You can survive without income for', value: mo(model.runway),
      sub: `Straight line at ${f.money(model.burn)} a month · recommended cover ${model.target.toFixed(1)} months`,
      stats: [
        { label: 'Recommended fund', value: f.money(model.need) },
        { label: 'You have', value: f.money(model.liquid), tone: model.funded >= 1 ? 'good' : 'warn' },
        { label: model.gap > 0 ? 'Gap to close' : 'Above target', value: f.money(model.gap > 0 ? model.gap : model.liquid - model.need), tone: model.gap > 0 ? 'bad' : 'good' },
        { label: 'Unlucky runway (5%)', value: mo(mc.monthsP5), tone: mc.monthsP5 < model.target ? 'bad' : 'good' }
      ],
      gauge: { value: mc.successProb, label: `Chance you last ${model.target.toFixed(1)} months` }
    }
  },

  insights(ctx) {
    const { v, model, mc, f } = ctx
    const p = Math.round(mc.successProb * 100)
    const b = []
    b.push({ tone: model.funded >= 1 ? 'good' : model.funded >= 0.6 ? 'warn' : 'bad', text: model.funded >= 1 ? `You hold ${Math.round(model.funded * 100)}% of the recommended fund. The cushion is in place.` : `You hold ${Math.round(model.funded * 100)}% of the recommended ${f.money(model.need)}. The gap is ${f.money(model.gap)}.` })
    b.push({ tone: 'info', text: `Real bills are lumpy: with random spending swings and surprise costs, your cover is ${mo(mc.monthsP50)} typically and just ${mo(mc.monthsP5)} in a bad run.` })
    if (model.gap > 0) b.push({ tone: 'tip', text: model.build == null ? 'You have no monthly surplus right now, so first cut spending or raise income.' : `Saving ${f.money(model.split.save)} a month (the 50/30/20 saving slice of your leftover) closes the gap in ${model.build} months.` })
    b.push({ tone: model.split.needsPct > 0.5 ? 'warn' : 'good', text: `Essentials plus debt take ${Math.round(model.split.needsPct * 100)}% of income (the 50/30/20 guideline is 50%).` })
    return {
      headline: `With ${f.money(model.liquid)} liquid and ${f.money(model.burn)} of unavoidable spending each month, you can last ${mo(model.runway)} on a straight line, ${mo(mc.monthsP50)} once surprise bills are added. Your situation suggests holding about ${model.target.toFixed(1)} months (${f.money(model.need)}), and you have a ${p}% chance of lasting that long.`,
      bullets: b, confidence: confidenceFromBands(mc.monthsP5, mc.monthsP50, mc.monthsP95),
      facts: { calculator: 'Emergency fund', runwayMonths: model.runway, targetMonths: model.target, fundNeeded: model.need, probability: mc.successProb }
    }
  },

  cone(ctx) {
    const { v, mc, model, f } = ctx
    return {
      title: 'Your cash cushion if income stops today', xName: 'Month', xFmt: (x) => `Month ${x}`,
      rows: mc.labels.map((x, i) => ({ x, p5: mc.bands.p5[i], p25: mc.bands.p25[i], p50: mc.bands.p50[i], p75: mc.bands.p75[i], p95: mc.bands.p95[i] })),
      lines: [], marker: Math.ceil(model.target), markerLabel: 'Target cover',
      legend: { best: 'Lucky (95th pct)', likely: 'Likely (median)', worst: 'Unlucky (5th pct)' },
      successLabel: 'chance the cushion lasts the target', endpoints: { best: mc.p95, likely: mc.p50, worst: mc.p5, atLabel: `at month ${Math.ceil(model.target)}` },
      histTitle: `Cash left at month ${Math.ceil(model.target)} (all 5,000 futures)`, histGoal: 1
    }
  },

  sensitivity: { metric: 'months of runway', outcome: (v) => Math.min(120, runwayMonths(v)), higherIsBetter: true, format: (n) => `${n.toFixed(1)} mo` },

  timeline(ctx) {
    const { v, mc, model, f } = ctx
    const g = Math.pow(1 + v.inflation / 100, 1 / 12)
    let bal = model.liquid
    const rows = [{ x: 0, plan: bal, likely: mc.bands.p50[0] }]
    for (let m = 1; m <= 36; m++) { bal = Math.max(0, bal - model.burn * Math.pow(g, m - 1)); rows.push({ x: m, plan: bal, likely: mc.bands.p50[m] }) }
    return {
      xName: 'Month', xFmt: (x) => `Month ${x}`, rows,
      series: [{ key: 'plan', label: 'Straight line', color: 'var(--cyan)' }, { key: 'likely', label: 'Likely (median)', color: 'var(--green)' }],
      caption: (r) => `Month ${r.x}: you would have about ${f.money(r.plan)} left on a straight line, and ${f.money(r.likely)} in the likely case.`
    }
  },

  regret(ctx) {
    const { v, model, f } = ctx
    const bars = [3, 6, 9, 12].map((d) => ({ label: `A ${d}-month job loss`, cost: Math.max(0, savingsForMonths(v, d) - model.liquid), note: model.liquid >= savingsForMonths(v, d) ? 'Fully covered' : 'Uncovered: loans, credit cards or family' }))
    return {
      headline: bars[1].cost > 0 ? `A 6-month job loss leaves ${f.money(bars[1].cost)} uncovered` : 'A 6-month job loss is fully covered',
      sub: 'The amount you would have to borrow or cut to bridge it.', bars,
      optimal: { title: 'Versus the optimal move', gap: model.gap, text: model.gap > 0 ? `Building to ${f.money(model.need)} removes the exposure. You are ${f.money(model.gap)} short.` : 'You are at or above your recommended cover.' }
    }
  },

  reverse: {
    modes: [
      { id: 'fund', label: 'Fund for N months', target: { key: 'target', label: 'Months of cover', kind: 'years', min: 1, max: 24, step: 0.5, def: 6 }, solve(v, t, f) { const need = savingsForMonths(v, t); const s = Math.max(0, need - v.otherLiquid); return { answer: { label: `Savings for ${t} months`, value: f.money(need) }, patch: { savings: Math.round(s / 1000) * 1000 }, text: `Covering ${t} months of ${f.money(netBurn(v))} spending needs ${f.money(need)} in liquid money. You hold ${f.money(liquidOf(v))}.` } } },
      { id: 'cut', label: 'Spending cut needed', target: { key: 'target', label: 'Months of runway', kind: 'years', min: 1, max: 24, step: 0.5, def: 6 }, solve(v, t, f) { const burn = (liquidOf(v) / t); const cut = Math.max(0, netBurn(v) - burn * 0.97); const ess = Math.max(0, v.essential - cut); return { answer: { label: `Cut needed for ${t} months`, value: `${f.money(cut)} / month` }, patch: { essential: Math.round(ess / 500) * 500 }, text: cut > 0 ? `Trim ${f.money(cut)} a month from essentials and your current savings last about ${t} months.` : `You already last ${t} months or more.` } } },
      { id: 'build', label: 'Time to build', target: { key: 'target', label: 'Monthly saving', kind: 'money', min: 500, max: 1000000, step: 500, def: 15000, profiles: usd({ min: 25, max: 20000, step: 25, def: 400 }) }, solve(v, t, f) { const m = monthsToBuild(v, t); return { answer: { label: `Saving ${f.money(t)} a month`, value: m === 0 ? 'Done' : `${m} months` }, patch: null, text: m === 0 ? 'Your fund already meets the recommended cover.' : `At ${f.money(t)} a month you reach the recommended ${f.money(savingsForMonths(v, targetMonths(v)))} in ${m} months (${(m / 12).toFixed(1)} years).` } } }
    ]
  },

  compare: {
    preset: (v) => ({ savings: Math.round(v.savings * 1.5 / 1000) * 1000 || 10000 }),
    rows: [
      { label: 'Chance you last the target', get: (c) => c.mc.successProb * 100, fmt: (n) => `${Math.round(n)}%`, better: 'high', headline: true, prob: true },
      { label: 'Straight-line runway', get: (c) => Math.min(120, c.model.runway), fmt: (n) => `${n.toFixed(1)} mo`, better: 'high' },
      { label: 'Unlucky runway (5%)', get: (c) => c.mc.monthsP5, fmt: (n) => `${n.toFixed(1)} mo`, better: 'high', risk: true },
      { label: 'Fund gap', get: (c) => c.model.gap, fmt: (n, f) => f.money(n), better: 'low' }
    ]
  },

  share(ctx) {
    const { model, mc, f } = ctx
    return {
      title: 'My financial runway', bigLabel: 'I can survive', big: `${Math.min(99, model.runway).toFixed(1)} months`,
      lines: [`without any income`, `Recommended cover ${model.target.toFixed(1)} months (${f.money(model.need)})`, `${Math.round(mc.successProb * 100)}% chance I last that long`],
      chart: { p5: mc.bands.p5, p50: mc.bands.p50, p95: mc.bands.p95 }, chartLabel: 'Cash cushion, 5,000 futures'
    }
  }
}
