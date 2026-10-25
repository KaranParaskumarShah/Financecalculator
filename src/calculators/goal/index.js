import { goalNominal, goalPath, goalFinal, monthlyStraight, simulateGoal, monthlyForProb, probOf, yearsForProb, goalForProb } from '../math/goal.js'
import { confidenceFromBands } from '../../lib/stats.js'
import WillIMakeIt from './Lab.jsx'

const usd = (o) => ({ usd: o })
const PROB = { key: 'prob', label: 'Confidence you want', kind: 'pct', min: 50, max: 99, step: 1, def: 85 }

export default {
  id: 'goal',
  flagship: { label: '“Will I make it?” Lab', component: WillIMakeIt },

  fields: [
    { key: 'goal', label: 'Goal amount', kind: 'money', min: 10000, max: 1000000000, step: 50000, def: 3500000, log: true, group: 'main', sens: { rel: 0.2 }, profiles: usd({ min: 500, max: 20000000, step: 1000, def: 95000 }) },
    { key: 'years', label: 'Years to the goal', kind: 'years', min: 1, max: 40, step: 1, def: 10, group: 'main', sens: { abs: 3 } },
    { key: 'saved', label: 'Saved so far', kind: 'money', min: 0, max: 100000000, step: 10000, def: 300000, group: 'main', sens: { rel: 0.3 }, profiles: usd({ max: 5000000, step: 500, def: 10000 }) },
    { key: 'monthly', label: 'Your monthly saving', kind: 'money', min: 0, max: 500000, step: 500, def: 25000, group: 'main', sens: { rel: 0.2 }, profiles: usd({ max: 20000, step: 25, def: 600 }) },
    { key: 'rate', label: 'Expected return (p.a.)', kind: 'pct', min: 1, max: 25, step: 0.5, def: 11, group: 'main', sens: { abs: 2 }, profiles: usd({ def: 7 }) },
    { key: 'inflAdj', label: 'Goal amount is in', kind: 'select', def: 1, group: 'main', options: [{ value: 1, label: 'Today’s money' }, { value: 0, label: 'Future money' }] },
    { key: 'vol', label: 'Return volatility', kind: 'pct', min: 0, max: 40, step: 1, def: 14, group: 'advanced', profiles: usd({ def: 12 }) },
    { key: 'inflation', label: 'Inflation', kind: 'pct', min: 0, max: 15, step: 0.5, def: 6, group: 'advanced', profiles: usd({ def: 3 }) }
  ],

  compute(v) {
    const path = goalPath(v)
    const G = goalNominal(v)
    const fin = path[v.years]
    return { path, G, final: fin, straightMonthly: monthlyStraight(v), funded: G > 0 ? fin / G : 0, shortfall: Math.max(0, G - fin), invested: v.saved + v.monthly * v.years * 12 }
  },
  simulate: (v) => simulateGoal(v),

  analyze(v, model, mc) {
    const ladder = [0.5, 0.7, 0.85, 0.95].map((c) => ({ conf: c, monthly: monthlyForProb(v, c) }))
    const p = mc.successProb
    const levers = [
      { id: 'save10', label: 'Save 10% more every month', patch: { monthly: Math.round(v.monthly * 1.1) }, prob: probOf({ ...v, monthly: v.monthly * 1.1 }) },
      { id: 'save25', label: 'Save 25% more every month', patch: { monthly: Math.round(v.monthly * 1.25) }, prob: probOf({ ...v, monthly: v.monthly * 1.25 }) },
      { id: 'year', label: 'Give yourself 1 more year', patch: { years: Math.min(40, v.years + 1) }, prob: probOf({ ...v, years: Math.min(40, v.years + 1) }) },
      { id: 'goal10', label: 'Lower the goal by 10%', patch: { goal: Math.round(v.goal * 0.9) }, prob: probOf({ ...v, goal: v.goal * 0.9 }) },
      { id: 'ret2', label: 'Earn 2 points more', patch: { rate: v.rate + 2 }, prob: probOf({ ...v, rate: v.rate + 2 }) }
    ].map((l) => ({ ...l, gain: l.prob - p })).sort((a, b) => b.gain - a.gain)
    return { ladder, levers }
  },

  hero(ctx) {
    const { v, model, mc, f } = ctx
    return {
      label: `Likely savings in ${v.years} years`, value: f.money(mc.p50), raw: mc.p50,
      sub: `Goal ${f.money(model.G)}${v.inflAdj ? ` in future money (${f.money(v.goal)} today)` : ''} · straight line ${f.money(model.final)}`,
      stats: [
        { label: 'Straight-line funded', value: `${Math.round(model.funded * 100)}%`, tone: model.funded >= 1 ? 'good' : 'bad' },
        { label: 'Needed monthly (straight line)', value: f.money(model.straightMonthly) },
        { label: 'You will pay in', value: f.money(model.invested) },
        { label: model.shortfall > 0 ? 'Shortfall (straight line)' : 'Surplus (straight line)', value: f.money(model.shortfall > 0 ? model.shortfall : model.final - model.G), tone: model.shortfall > 0 ? 'bad' : 'good' }
      ],
      gauge: { value: mc.successProb, label: 'Chance you reach the goal' }
    }
  },

  insights(ctx) {
    const { v, model, mc, an, f } = ctx
    const p = Math.round(mc.successProb * 100)
    const l85 = an.ladder[2].monthly
    const b = []
    b.push({ tone: p >= 85 ? 'good' : p >= 60 ? 'warn' : 'bad', text: `${p}% chance of making it.` + (l85 != null && l85 > v.monthly ? ` For 85% confidence save ${f.money(l85)} a month: ${f.money(l85 - v.monthly)} (+${Math.round((l85 / Math.max(1, v.monthly) - 1) * 100)}%) more than today.` : p >= 85 ? ' You are comfortably ahead.' : '') })
    const top = an.levers[0]
    if (top && top.gain > 0.005) b.push({ tone: 'tip', text: `The biggest single lever: “${top.label.toLowerCase()}” lifts your odds from ${p}% to ${Math.round(top.prob * 100)}%.` })
    b.push({ tone: 'info', text: model.funded >= 1 ? `On a straight line you already clear the goal by ${f.money(model.final - model.G)}, but markets wobble: only ${p}% of simulated futures do.` : `On a straight line you fall ${f.money(model.shortfall)} short. Closing that needs ${f.money(model.straightMonthly)} a month, versus your ${f.money(v.monthly)}.` })
    if (v.inflAdj) b.push({ tone: 'info', text: `Inflation turns your ${f.money(v.goal)} goal into ${f.money(model.G)} by year ${v.years}. Goals set in today’s money are the honest way to plan.` })
    const t1 = mc.track[Math.min(2, v.years)]
    b.push({ tone: 'info', text: `Checkpoint: after ${Math.min(2, v.years)} years you are on or ahead of the glide path in ${Math.round(t1 * 100)}% of futures. Check in then and adjust early.` })
    return {
      headline: `To reach ${f.money(model.G)} in ${v.years} years you are saving ${f.money(v.monthly)} a month on top of ${f.money(v.saved)} already set aside, at an expected ${v.rate}%. On a straight line that grows to ${f.money(model.final)}. Across 5,000 simulated futures the likely result is ${f.money(mc.p50)}, with a realistic range of ${f.money(mc.p5)} to ${f.money(mc.p95)}, so the honest answer to “will I make it?” is ${p}%.`,
      bullets: b, confidence: confidenceFromBands(mc.p5, mc.p50, mc.p95),
      facts: { calculator: 'Savings goal', goal: model.G, years: v.years, monthly: v.monthly, probability: mc.successProb, monthlyFor85: l85 }
    }
  },

  cone(ctx) {
    const { v, mc, model, f } = ctx
    return {
      title: 'Your savings, 5,000 simulated futures', xName: 'Year', xFmt: (x) => `Year ${x}`,
      rows: mc.labels.map((x, i) => ({ x, p5: mc.bands.p5[i], p25: mc.bands.p25[i], p50: mc.bands.p50[i], p75: mc.bands.p75[i], p95: mc.bands.p95[i], glide: mc.glide[i], det: mc.det[i] })),
      lines: [{ key: 'glide', label: 'Glide path to goal', color: 'var(--violet)', dash: '5 3' }, { key: 'det', label: 'Straight line', color: 'var(--amber)', dash: '2 3' }],
      goal: model.G, goalLabel: 'Goal',
      legend: { best: 'Best case (95th pct)', likely: 'Likely (median)', worst: 'Worst case (5th pct)' },
      successLabel: 'chance of reaching the goal', endpoints: { best: mc.p95, likely: mc.p50, worst: mc.p5 },
      histTitle: 'Where your savings land (all 5,000 futures)', histGoal: model.G
    }
  },

  sensitivity: { metric: 'funding level', outcome: (v) => (goalFinal(v) / goalNominal(v)) * 100, higherIsBetter: true, format: (n) => `${Math.round(n)}%` },

  timeline(ctx) {
    const { model, mc, f } = ctx
    const rows = model.path.map((b, y) => ({ x: y, balance: b, likely: mc.bands.p50[y], glide: mc.glide[y] }))
    return {
      xName: 'Year', xFmt: (x) => `Year ${x}`, rows,
      series: [{ key: 'balance', label: 'Straight line', color: 'var(--cyan)' }, { key: 'likely', label: 'Likely (median)', color: 'var(--green)' }, { key: 'glide', label: 'Needed glide path', color: 'var(--violet)' }],
      caption: (r) => `Year ${r.x}: you should be at about ${f.money(r.glide)} to stay on course. The likely path has ${f.money(r.likely)}, which is ${r.likely >= r.glide ? 'ahead of' : 'behind'} the glide path. You are on or ahead of it in ${Math.round(mc.track[r.x] * 100)}% of futures.`
    }
  },

  regret(ctx) {
    const { v, an, f } = ctx
    const base = an.ladder[2].monthly
    const bars = [1, 2, 3, 5].filter((d) => d < v.years).map((d) => {
      const m = monthlyForProb({ ...v, years: v.years - d }, 0.85)
      return { label: `Wait ${d} year${d > 1 ? 's' : ''} to start`, cost: m == null || base == null ? 0 : Math.max(0, m - base), note: m == null ? 'Out of reach at any realistic saving' : `Need ${f.money(m)} a month for 85% confidence` }
    })
    return {
      headline: bars[0] ? `Waiting 1 year means saving ${f.money(bars[0].cost)} more every month` : 'Start now',
      sub: `Extra monthly saving needed to keep 85% confidence. Today that is ${base != null ? f.money(base) : 'out of reach'}.`,
      bars,
      optimal: { title: 'Versus the optimal move', gap: base != null ? Math.max(0, base - v.monthly) : 0, text: base != null && base > v.monthly ? `Starting at ${f.money(base)} a month today gives 85% confidence. You are ${f.money(base - v.monthly)} short each month.` : 'Your plan already clears 85% confidence. Keep going.' }
    }
  },

  reverse: {
    modes: [
      { id: 'monthly', label: 'Saving needed', target: PROB, solve(v, t, f) { const m = monthlyForProb(v, t / 100); return m == null ? { answer: { label: 'Monthly saving', value: 'Out of reach' }, patch: null, text: 'No realistic monthly saving gives that confidence. Extend the time or lower the goal.' } : { answer: { label: `Monthly saving for ${t}% confidence`, value: f.money(m) }, patch: { monthly: Math.round(m / 100) * 100 }, text: `Saving ${f.money(m)} a month gives a ${t}% chance of reaching ${f.money(goalNominal(v))}.` } } },
      { id: 'years', label: 'Time needed', target: PROB, solve(v, t, f) { const y = yearsForProb(v, t / 100); return y == null ? { answer: { label: 'Years needed', value: '40+ yrs' }, patch: null, text: 'Not within 40 years at this saving.' } : { answer: { label: `Years for ${t}% confidence`, value: `${y} yrs` }, patch: { years: y }, text: `With ${f.money(v.monthly)} a month it takes about ${y} years to be ${t}% sure of ${f.money(v.goal)}.` } } },
      { id: 'goal', label: 'Goal you can reach', target: PROB, solve(v, t, f) { const g = goalForProb(v, t / 100); return { answer: { label: `Goal you can hit with ${t}% confidence`, value: f.money(g) }, patch: { goal: Math.round(g / 1000) * 1000 }, text: `With today’s saving you can be ${t}% sure of reaching ${f.money(g)}${v.inflAdj ? ' in today’s money' : ''}.` } } }
    ]
  },

  compare: {
    preset: (v) => ({ monthly: Math.round((v.monthly * 1.2) / 100) * 100 || 500 }),
    rows: [
      { label: 'Chance of reaching goal', get: (c) => c.mc.successProb * 100, fmt: (n) => `${Math.round(n)}%`, better: 'high', headline: true, prob: true },
      { label: 'Likely savings', get: (c) => c.mc.p50, fmt: (n, f) => f.money(n), better: 'high' },
      { label: 'Worst case (5th pct)', get: (c) => c.mc.p5, fmt: (n, f) => f.money(n), better: 'high', risk: true },
      { label: 'Straight-line funded', get: (c) => c.model.funded * 100, fmt: (n) => `${Math.round(n)}%`, better: 'high' },
      { label: 'You will pay in', get: (c) => c.model.invested, fmt: (n, f) => f.money(n), better: 'low' }
    ]
  },

  share(ctx) {
    const { v, model, mc, an, f } = ctx
    return {
      title: `Goal ${f.money(model.G)} in ${v.years} years`, bigLabel: 'Chance I make it', big: `${Math.round(mc.successProb * 100)}%`,
      lines: [`Saving ${f.money(v.monthly)} a month`, `Likely ${f.money(mc.p50)} · range ${f.money(mc.p5)} to ${f.money(mc.p95)}`, an.ladder[2].monthly != null ? `${f.money(an.ladder[2].monthly)} a month gives 85% confidence` : 'Needs a longer horizon'],
      chart: { p5: mc.bands.p5, p50: mc.bands.p50, p95: mc.bands.p95 }, chartLabel: '5,000 simulated futures'
    }
  }
}
