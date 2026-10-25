import { cardRun, minOnly, minPay, trueCost, plans, planPayment, maxAprFor, simulateCard, extraForMonths } from '../math/card.js'
import { confidenceFromBands } from '../../lib/stats.js'
import Lab from './Lab.jsx'

const usd = (o) => ({ usd: o })
const yrs = (m) => (m >= 24 ? `${(m / 12).toFixed(1)} years` : `${m} months`)

export default {
  id: 'card',
  flagship: { label: 'True Cost Lab', component: Lab },

  fields: [
    { key: 'balance', label: 'Card balance', kind: 'money', min: 1000, max: 10000000, step: 5000, def: 150000, log: true, group: 'main', sens: { rel: 0.2 }, profiles: usd({ min: 100, max: 200000, step: 100, def: 6000 }) },
    { key: 'apr', label: 'Interest rate (APR)', kind: 'pct', min: 5, max: 60, step: 0.5, def: 36, group: 'main', sens: { abs: 4 }, profiles: usd({ def: 22 }) },
    { key: 'minPct', label: 'Minimum payment (% of balance)', kind: 'pct', min: 1, max: 10, step: 0.5, def: 5, group: 'main', profiles: usd({ def: 3 }) },
    { key: 'minFloor', label: 'Minimum payment floor', kind: 'money', min: 0, max: 5000, step: 50, def: 200, group: 'main', profiles: usd({ max: 200, step: 5, def: 25 }) },
    { key: 'extra', label: 'Extra you pay each month', kind: 'money', min: 0, max: 500000, step: 500, def: 3000, group: 'main', sens: { rel: 0.5 }, profiles: usd({ max: 10000, step: 10, def: 90 }) },
    { key: 'targetMonths', label: 'Be debt-free within', kind: 'years', unit: 'months', min: 3, max: 120, step: 1, def: 34, group: 'main', profiles: usd({ def: 48 }) },
    { key: 'purchase', label: 'A purchase you’re considering', kind: 'money', min: 0, max: 5000000, step: 1000, def: 30000, group: 'advanced', profiles: usd({ max: 100000, step: 50, def: 500 }) },
    { key: 'newSpend', label: 'New spending still added monthly', kind: 'money', min: 0, max: 500000, step: 500, def: 0, group: 'advanced', profiles: usd({ max: 10000, step: 10, def: 0 }) },
    { key: 'aprVol', label: 'APR change per year (± points)', kind: 'pct', min: 0, max: 10, step: 0.5, def: 3, group: 'advanced', profiles: usd({ def: 2 }) }
  ],

  compute(v) {
    const base = minOnly(v), mine = cardRun(v)
    return { base, mine, tc: trueCost(v), plans: plans(v), min0: minPay(v, v.balance), saved: base.interest - mine.interest, ratio: v.balance > 0 ? base.paid / v.balance : 1 }
  },
  simulate: (v) => simulateCard(v),
  analyze: () => ({}),

  hero(ctx) {
    const { v, model, mc, f } = ctx
    const b = model.base
    return {
      label: 'Paying only the minimum keeps you in debt for', value: b.never ? 'Forever' : yrs(b.months),
      sub: `${f.money(v.balance)} turns into ${f.money(b.paid)} paid. Every ${f.money(1)} borrowed costs ${f.money(model.ratio)}`,
      stats: [
        { label: 'Interest at minimums', value: f.money(b.interest), tone: 'bad' },
        { label: 'Your plan: debt-free in', value: model.mine.never ? 'Never' : yrs(model.mine.months), tone: model.mine.never ? 'bad' : 'good' },
        { label: 'Interest on your plan', value: f.money(model.mine.interest) },
        { label: 'Interest saved', value: f.money(Math.max(0, model.saved)), tone: 'good' }
      ],
      gauge: { value: mc.successProb, label: `Chance of debt-free within ${v.targetMonths} months` }
    }
  },

  insights(ctx) {
    const { v, model, mc, f } = ctx
    const p = Math.round(mc.successProb * 100)
    const b = []
    b.push({ tone: 'bad', text: `The minimum shrinks as the balance does, so it never really bites: ${model.base.never ? 'the card would never clear' : `${yrs(model.base.months)} to clear`} and ${f.money(model.base.interest)} of interest, ${(model.base.interest / v.balance).toFixed(1)}× the original balance.` })
    b.push({ tone: 'tip', text: v.extra > 0 ? `Your extra ${f.money(v.extra)} a month clears it in ${yrs(model.mine.months)} and saves ${f.money(model.saved)} of interest.` : 'You are paying only the minimum. Even a small extra amount changes the picture dramatically.' })
    b.push({ tone: 'info', text: `A ${f.money(v.purchase)} purchase left on the card at minimums really costs ${f.money(model.tc.paidMore)} (${model.tc.multiple.toFixed(1)}×).` })
    b.push({ tone: p >= 70 ? 'good' : 'warn', text: `Rates move and spending slips: you clear the card within ${v.targetMonths} months in ${p}% of simulated futures.` })
    return {
      headline: `At ${v.apr}% APR a ${f.money(v.balance)} balance paid at minimums takes ${model.base.never ? 'forever' : yrs(model.base.months)} and costs ${f.money(model.base.paid)} in total. On your plan (minimum plus ${f.money(v.extra)}) it ends in ${yrs(model.mine.months)} with ${f.money(model.mine.interest)} of interest, and you have a ${p}% chance of finishing within ${v.targetMonths} months.`,
      bullets: b, confidence: confidenceFromBands(mc.p5, mc.p50, mc.p95),
      facts: { calculator: 'Credit card payoff', balance: v.balance, apr: v.apr, minimumMonths: model.base.months, minimumInterest: model.base.interest, planMonths: model.mine.months, probability: mc.successProb }
    }
  },

  cone(ctx) {
    const { v, mc, model, f } = ctx
    const minY = model.base.path.filter((_, i) => i % 12 === 0)
    return {
      title: 'Your card balance over the next 10 years', xName: 'Year', xFmt: (x) => `Year ${x}`,
      rows: mc.labels.map((x, i) => ({ x, p5: mc.bands.p5[i], p25: mc.bands.p25[i], p50: mc.bands.p50[i], p75: mc.bands.p75[i], p95: mc.bands.p95[i], minimum: minY[i] ?? 0 })),
      lines: [{ key: 'minimum', label: 'Minimums only', color: 'var(--rose)', dash: '5 3' }],
      legend: { best: 'Lucky (5th pct)', likely: 'Likely (median)', worst: 'Unlucky (95th pct)' },
      successLabel: `chance debt-free within ${v.targetMonths} months`,
      endpoints: { best: mc.bands.p5[mc.labels.length - 1], likely: mc.bands.p50[mc.labels.length - 1], worst: mc.bands.p95[mc.labels.length - 1], atLabel: 'at year 10' },
      histTitle: 'Interest you pay (all 5,000 futures, first 10 years)'
    }
  },

  sensitivity: { metric: 'total interest on your plan', outcome: (v) => cardRun(v).interest, higherIsBetter: false, format: (n, f) => f.money(n) },

  timeline(ctx) {
    const { v, model, f } = ctx
    const Y = Math.min(40, Math.ceil(Math.max(model.base.months, model.mine.months) / 12))
    const at = (p, y) => p[Math.min(p.length - 1, y * 12)] ?? 0
    const rows = Array.from({ length: Y + 1 }, (_, y) => ({ x: y, minimum: at(model.base.path, y), plan: model.mine.path.length - 1 < y * 12 ? 0 : at(model.mine.path, y) }))
    return {
      xName: 'Year', xFmt: (x) => `Year ${x}`, rows,
      series: [{ key: 'minimum', label: 'Minimums only', color: 'var(--rose)' }, { key: 'plan', label: 'Your plan', color: 'var(--green)' }],
      caption: (r) => `Year ${r.x}: minimum payments still owe ${f.money(r.minimum)}; on your plan you owe ${f.money(r.plan)}.`
    }
  },

  regret(ctx) {
    const { v, model, f } = ctx
    const now = model.mine.interest
    const bars = [1, 3, 6, 12].map((d) => { const r = cardRun(v, { delay: d }); return { label: `Start extra payments ${d} month${d > 1 ? 's' : ''} late`, cost: Math.max(0, r.interest - now), note: `Debt-free ${Math.max(0, r.months - model.mine.months)} months later` } })
    return { headline: `Waiting 6 months to start costs ${f.money(bars[2].cost)} in extra interest`, sub: 'Extra interest versus starting your plan today.', bars, optimal: { title: 'Versus the optimal move', gap: Math.max(0, model.mine.interest - model.plans[0].interest), text: `Paying ${f.money(model.plans[0].pay)} a month clears it in 12 months with only ${f.money(model.plans[0].interest)} of interest.` } }
  },

  reverse: {
    modes: [
      { id: 'clear', label: 'Payment to clear it', target: { key: 'target', label: 'Debt-free in (months)', kind: 'years', unit: 'months', min: 3, max: 120, step: 1, def: 24 }, solve(v, t, f) { const p = planPayment(v, t); const ex = Math.max(0, p - minPay(v, v.balance)); return { answer: { label: `Fixed payment for ${t} months`, value: f.money(p) }, patch: { extra: Math.round(ex / 100) * 100, targetMonths: t }, text: `Pay ${f.money(p)} every month (about ${f.money(ex)} above today’s minimum) to be debt-free in ${t} months.` } } },
      { id: 'extra', label: 'Extra needed', target: { key: 'target', label: 'Debt-free in (months)', kind: 'years', unit: 'months', min: 3, max: 120, step: 1, def: 24 }, solve(v, t, f) { const x = extraForMonths(v, t); return x == null ? { answer: { label: 'Extra needed', value: 'Out of reach' }, patch: null, text: 'No extra payment clears it that fast.' } : { answer: { label: `Extra for ${t} months`, value: f.money(x) }, patch: { extra: Math.round(x / 100) * 100, targetMonths: t }, text: `Adding ${f.money(x)} on top of the minimum each month clears the card in ${t} months.` } } },
      { id: 'apr', label: 'Rate you can survive', target: { key: 'target', label: 'Debt-free in (months)', kind: 'years', unit: 'months', min: 6, max: 120, step: 1, def: 36 }, solve(v, t, f) { const a = maxAprFor(v, t); return a == null ? { answer: { label: 'Max APR', value: 'None' }, patch: null, text: 'Even at 0% your payments are too low.' } : { answer: { label: `Highest APR that still works in ${t} mo`, value: `${a.toFixed(1)}%` }, patch: null, text: `With your payments the card clears in ${t} months as long as APR stays under ${a.toFixed(1)}%. A balance transfer below that helps.` } } }
    ]
  },

  compare: {
    preset: (v) => ({ extra: Math.round(Math.max(v.extra * 2, 1000) / 100) * 100 }),
    rows: [
      { label: 'Chance of finishing on time', get: (c) => c.mc.successProb * 100, fmt: (n) => `${Math.round(n)}%`, better: 'high', headline: true, prob: true },
      { label: 'Months to clear', get: (c) => c.model.mine.months, fmt: (n) => `${Math.round(n)}`, better: 'low' },
      { label: 'Interest paid', get: (c) => c.model.mine.interest, fmt: (n, f) => f.money(n), better: 'low' },
      { label: 'Unlucky interest (95th)', get: (c) => c.mc.p95, fmt: (n, f) => f.money(n), better: 'low', risk: true }
    ]
  },

  share(ctx) {
    const { v, model, mc, f } = ctx
    return {
      title: 'The true cost of my card', bigLabel: 'Minimums keep me in debt for', big: model.base.never ? 'Forever' : yrs(model.base.months),
      lines: [`${f.money(v.balance)} would cost ${f.money(model.base.paid)}`, `My plan: ${yrs(model.mine.months)}, saving ${f.money(Math.max(0, model.saved))}`, `${Math.round(mc.successProb * 100)}% chance to finish within ${v.targetMonths} months`],
      chart: { p5: mc.bands.p5, p50: mc.bands.p50, p95: mc.bands.p95 }, chartLabel: 'Card balance, 5,000 futures'
    }
  }
}
