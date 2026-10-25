import { assetsOf, debtsOf, netWorth, project, healthScore, fixFor, simulateNetWorth, savingForTarget } from '../math/networth.js'
import { confidenceFromBands } from '../../lib/stats.js'
import Lab from './Lab.jsx'

const usd = (o) => ({ usd: o })

export default {
  id: 'networth',
  flagship: { label: 'Health Score Lab', component: Lab },

  fields: [
    { key: 'age', label: 'Your age', kind: 'age', min: 18, max: 80, step: 1, def: 32, group: 'main' },
    { key: 'income', label: 'Monthly income', kind: 'money', min: 5000, max: 5000000, step: 5000, def: 100000, log: true, group: 'main', profiles: usd({ min: 500, max: 100000, step: 100, def: 5000 }) },
    { key: 'expenses', label: 'Monthly expenses (excluding loan EMI)', kind: 'money', min: 2000, max: 3000000, step: 2500, def: 45000, log: true, group: 'main', profiles: usd({ min: 300, max: 60000, step: 50, def: 2400 }) },
    { key: 'cash', label: 'Cash & savings', kind: 'money', min: 0, max: 50000000, step: 10000, def: 250000, group: 'main', sens: { rel: 0.3 }, profiles: usd({ max: 1000000, step: 250, def: 12000 }) },
    { key: 'investments', label: 'Investments', kind: 'money', min: 0, max: 200000000, step: 25000, def: 1200000, group: 'main', sens: { rel: 0.3 }, profiles: usd({ max: 5000000, step: 500, def: 60000 }) },
    { key: 'property', label: 'Property value', kind: 'money', min: 0, max: 500000000, step: 100000, def: 4500000, group: 'main', profiles: usd({ max: 10000000, step: 5000, def: 250000 }) },
    { key: 'otherAssets', label: 'Other assets (gold, vehicle…)', kind: 'money', min: 0, max: 100000000, step: 10000, def: 150000, group: 'main', profiles: usd({ max: 2000000, step: 500, def: 15000 }) },
    { key: 'homeLoan', label: 'Home loan outstanding', kind: 'money', min: 0, max: 200000000, step: 50000, def: 3000000, group: 'main', profiles: usd({ max: 5000000, step: 2000, def: 180000 }) },
    { key: 'otherDebt', label: 'Other debts (cards, personal)', kind: 'money', min: 0, max: 50000000, step: 5000, def: 150000, group: 'main', profiles: usd({ max: 500000, step: 250, def: 8000 }) },
    { key: 'monthlySave', label: 'You invest each month', kind: 'money', min: 0, max: 1000000, step: 1000, def: 20000, group: 'main', sens: { rel: 0.3 }, profiles: usd({ max: 30000, step: 25, def: 800 }) },
    { key: 'years', label: 'Look ahead', kind: 'years', min: 1, max: 40, step: 1, def: 10, group: 'main', sens: { abs: 3 } },
    { key: 'nwTarget', label: 'Net-worth goal', kind: 'money', min: 100000, max: 2000000000, step: 100000, def: 14000000, log: true, group: 'main', profiles: usd({ min: 5000, max: 50000000, step: 5000, def: 400000 }) },
    { key: 'rate', label: 'Investment return', kind: 'pct', min: 1, max: 25, step: 0.5, def: 11, group: 'advanced', sens: { abs: 2 }, profiles: usd({ def: 7 }) },
    { key: 'propGrowth', label: 'Property growth', kind: 'pct', min: 0, max: 15, step: 0.5, def: 5, group: 'advanced', profiles: usd({ def: 3.5 }) },
    { key: 'vol', label: 'Investment volatility', kind: 'pct', min: 0, max: 40, step: 1, def: 14, group: 'advanced', profiles: usd({ def: 15 }) },
    { key: 'loanRate', label: 'Home-loan rate', kind: 'pct', min: 0, max: 20, step: 0.25, def: 8.5, group: 'advanced', profiles: usd({ def: 6.5 }) },
    { key: 'loanEmi', label: 'Home-loan EMI', kind: 'money', min: 0, max: 1000000, step: 500, def: 28000, group: 'advanced', profiles: usd({ max: 20000, step: 25, def: 1200 }) }
  ],

  compute(v) {
    const h = healthScore(v)
    return { assets: assetsOf(v), debts: debtsOf(v), nw: netWorth(v), path: project(v), health: h, fix: fixFor(v, h.weakest, { money: (n) => Math.round(n).toLocaleString() }) }
  },
  simulate: (v) => simulateNetWorth(v),
  analyze(v, model, mc) {
    return { need85: mc.successProb < 0.85 ? savingForTarget(v, 0.85) : null }
  },

  hero(ctx) {
    const { v, model, mc, f } = ctx
    const h = model.health
    return {
      label: 'Your net worth today', value: f.money(model.nw), raw: model.nw,
      sub: `Assets ${f.money(model.assets)} − debts ${f.money(model.debts)}`,
      stats: [
        { label: `Likely in ${v.years} years`, value: f.money(mc.p50), tone: 'good' },
        { label: 'Financial health', value: `${Math.round(h.total)} / 100`, tone: h.total >= 70 ? 'good' : h.total >= 45 ? 'warn' : 'bad' },
        { label: 'Weakest link', value: h.weakest.label, tone: 'warn' },
        { label: 'Debt share of assets', value: `${Math.round((model.debts / Math.max(1, model.assets)) * 100)}%` }
      ],
      gauge: { value: mc.successProb, label: `Chance net worth reaches ${f.money(v.nwTarget)}` }
    }
  },

  insights(ctx) {
    const { v, model, mc, an, f } = ctx
    const h = model.health
    const p = Math.round(mc.successProb * 100)
    const w = h.weakest
    const fix = fixFor(v, w, f)
    const b = []
    b.push({ tone: h.total >= 70 ? 'good' : h.total >= 45 ? 'warn' : 'bad', text: `Financial health ${Math.round(h.total)}/100. The weakest link is “${w.label.toLowerCase()}” (${w.shown}; benchmark ${w.bench}), costing ${w.lost.toFixed(1)} points.` })
    b.push({ tone: 'tip', text: `Fastest fix: ${fix.text.toLowerCase()}. That alone adds up to ${w.lost.toFixed(1)} points.` })
    b.push({ tone: p >= 70 ? 'good' : 'warn', text: `${p}% chance of reaching ${f.money(v.nwTarget)} in ${v.years} years.` + (an.need85 != null ? ` For 85% you would invest ${f.money(an.need85)} a month.` : '') })
    b.push({ tone: 'info', text: `Property is ${Math.round((v.property / Math.max(1, model.assets)) * 100)}% of your assets, and it is not liquid. Investments are ${Math.round((v.investments / Math.max(1, model.assets)) * 100)}%.` })
    return {
      headline: `You are worth ${f.money(model.nw)} today (assets ${f.money(model.assets)}, debts ${f.money(model.debts)}). Investing ${f.money(v.monthlySave)} a month and paying down loans, the likely result in ${v.years} years is ${f.money(mc.p50)}, with a range of ${f.money(mc.p5)} to ${f.money(mc.p95)}. Your financial health score is ${Math.round(h.total)}/100.`,
      bullets: b, confidence: confidenceFromBands(mc.p5, mc.p50, mc.p95),
      facts: { calculator: 'Net worth', netWorth: model.nw, healthScore: h.total, weakestLink: w.label, probability: mc.successProb }
    }
  },

  cone(ctx) {
    const { v, mc, model, f } = ctx
    return {
      title: 'Your net worth, 5,000 simulated futures', xName: 'Year', xFmt: (x) => `Year ${x}`,
      rows: mc.labels.map((x, i) => ({ x, p5: mc.bands.p5[i], p25: mc.bands.p25[i], p50: mc.bands.p50[i], p75: mc.bands.p75[i], p95: mc.bands.p95[i], det: model.path[i]?.nw })),
      lines: [{ key: 'det', label: 'Straight line', color: 'var(--amber)', dash: '2 3' }],
      goal: v.nwTarget, goalLabel: 'Goal',
      legend: { best: 'Best case (95th pct)', likely: 'Likely (median)', worst: 'Worst case (5th pct)' },
      successLabel: 'chance of reaching the goal', endpoints: { best: mc.p95, likely: mc.p50, worst: mc.p5 },
      histTitle: 'Net worth at the horizon (all 5,000 futures)', histGoal: v.nwTarget
    }
  },

  sensitivity: { metric: 'net worth at horizon', outcome: (v) => project(v)[v.years].nw, higherIsBetter: true, format: (n, f) => f.money(n) },

  timeline(ctx) {
    const { model, mc, f } = ctx
    return {
      xName: 'Year', xFmt: (x) => `Year ${x}`, rows: model.path.map((r) => ({ x: r.year, nw: r.nw, assets: r.assets, debts: r.debts })),
      series: [{ key: 'nw', label: 'Net worth', color: 'var(--green)' }, { key: 'assets', label: 'Assets', color: 'var(--cyan)' }, { key: 'debts', label: 'Debts', color: 'var(--rose)' }],
      caption: (r) => `Year ${r.x}: assets ${f.money(r.assets)}, debts ${f.money(r.debts)}, so net worth ${f.money(r.nw)}.`
    }
  },

  regret(ctx) {
    const { v, model, f } = ctx
    const bars = [1, 2, 3].filter((d) => d < v.years).map((d) => ({ label: `Delay investing ${d} year${d > 1 ? 's' : ''}`, cost: v.monthlySave * 12 * d * Math.pow(1 + v.rate / 100, Math.max(0, v.years - d) / 2), note: 'Skipped contributions plus the growth they would have earned' }))
    return { headline: bars[0] ? `Skipping a year of investing costs about ${f.money(bars[0].cost)} by year ${v.years}` : 'Invest from today', sub: 'Contributions you skip plus the growth they would have earned.', bars, optimal: { title: 'Versus the optimal move', gap: model.health.weakest.lost, text: `Fixing your weakest link (${model.health.weakest.label.toLowerCase()}) adds up to ${model.health.weakest.lost.toFixed(1)} health points.` } }
  },

  reverse: {
    modes: [
      { id: 'save', label: 'Saving needed', target: { key: 'target', label: 'Confidence', kind: 'pct', min: 50, max: 99, step: 1, def: 85 }, solve(v, t, f) { const s = savingForTarget(v, t / 100); return s == null ? { answer: { label: 'Monthly investment', value: 'Out of reach' }, patch: null, text: 'No realistic saving reaches the goal with that confidence.' } : { answer: { label: `Invest monthly for ${t}% confidence`, value: f.money(s) }, patch: { monthlySave: Math.round(s / 500) * 500 }, text: `Investing ${f.money(s)} a month gives a ${t}% chance of reaching ${f.money(v.nwTarget)} in ${v.years} years.` } } },
      { id: 'score', label: 'Reach a score', target: { key: 'target', label: 'Health score', kind: 'pct', min: 30, max: 100, step: 5, def: 80 }, solve(v, t, f) { const h = healthScore(v); const gap = t - h.total; const order = [...h.items].sort((a, b) => b.lost - a.lost); const top = order.slice(0, 2).map((i) => i.label.toLowerCase()).join(' and '); return { answer: { label: `Points to reach ${t}`, value: gap > 0 ? `+${gap.toFixed(0)}` : 'Already there' }, patch: null, text: gap > 0 ? `You need ${gap.toFixed(0)} more points. The biggest gains are in ${top}.` : `Your score is already ${h.total.toFixed(0)}.` } } }
    ]
  },

  compare: {
    preset: (v) => ({ monthlySave: Math.round((v.monthlySave * 1.5) / 500) * 500 || 1000 }),
    rows: [
      { label: 'Chance of reaching goal', get: (c) => c.mc.successProb * 100, fmt: (n) => `${Math.round(n)}%`, better: 'high', headline: true, prob: true },
      { label: 'Likely net worth at horizon', get: (c) => c.mc.p50, fmt: (n, f) => f.money(n), better: 'high' },
      { label: 'Worst case (5th pct)', get: (c) => c.mc.p5, fmt: (n, f) => f.money(n), better: 'high', risk: true },
      { label: 'Health score', get: (c) => c.model.health.total, fmt: (n) => `${Math.round(n)}`, better: 'high' }
    ]
  },

  share(ctx) {
    const { v, model, mc, f } = ctx
    return {
      title: 'My net worth', bigLabel: 'Financial health', big: `${Math.round(model.health.total)}/100`,
      lines: [`Net worth ${f.money(model.nw)}`, `Weakest link: ${model.health.weakest.label}`, `${Math.round(mc.successProb * 100)}% chance of ${f.money(v.nwTarget)} in ${v.years} years`],
      chart: { p5: mc.bands.p5, p50: mc.bands.p50, p95: mc.bands.p95 }, chartLabel: 'Net worth, 5,000 futures'
    }
  }
}
