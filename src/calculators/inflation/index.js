import { inflationPath, simulateInflation, priceIndex, realReturn, futureNeeded, inflForShare, halvingYears, investForProb } from '../math/inflation.js'
import { confidenceFromBands } from '../../lib/stats.js'
import Lab from './Lab.jsx'

const usd = (o) => ({ usd: o })

export default {
  id: 'inflation',
  flagship: { label: 'Purchasing Power Lab', component: Lab },

  fields: [
    { key: 'amount', label: 'Amount (today’s money)', kind: 'money', min: 1000, max: 1000000000, step: 10000, def: 10000000, log: true, group: 'main', sens: { rel: 0.2 }, profiles: usd({ min: 100, max: 50000000, step: 500, def: 100000 }) },
    { key: 'years', label: 'Years from now', kind: 'years', min: 1, max: 50, step: 1, def: 20, group: 'main', sens: { abs: 5 } },
    { key: 'inflation', label: 'Average inflation', kind: 'pct', min: 0, max: 20, step: 0.5, def: 6, group: 'main', sens: { abs: 1.5 }, profiles: usd({ def: 3 }) },
    { key: 'invest', label: 'Return you earn on it', kind: 'pct', min: 0, max: 25, step: 0.5, def: 7, group: 'main', sens: { abs: 2 }, profiles: usd({ def: 5 }) },
    { key: 'vol', label: 'Inflation volatility', kind: 'pct', min: 0, max: 6, step: 0.25, def: 2, group: 'advanced', profiles: usd({ def: 2 }) }
  ],

  compute(v) {
    const path = inflationPath(v)
    const end = path[v.years]
    return { path, idx: end.index, cash: end.cash, real: end.real, loss: 1 - end.cash / v.amount, needed: futureNeeded(v.amount, v.inflation, v.years), rr: realReturn(v.invest, v.inflation), halving: halvingYears(v.inflation) }
  },
  simulate: (v) => simulateInflation(v),
  analyze(v, model, mc) {
    return { need85: investForProb(v, 0.85) }
  },

  hero(ctx) {
    const { v, model, mc, f } = ctx
    return {
      label: `${f.money(v.amount)} in ${v.years} years buys only`, value: f.money(model.cash), raw: model.cash,
      sub: `of today’s buying power if it just sits there (${Math.round(model.loss * 100)}% lost)`,
      stats: [
        { label: 'To match it you’ll need', value: f.money(model.needed) },
        { label: 'Prices multiply by', value: `${model.idx.toFixed(2)}×` },
        { label: 'Real return', value: `${model.rr >= 0 ? '+' : ''}${model.rr.toFixed(1)}% a year`, tone: model.rr >= 0 ? 'good' : 'bad' },
        { label: 'Invested, in today’s money', value: f.money(model.real), tone: model.real >= v.amount ? 'good' : 'bad' }
      ],
      gauge: { value: mc.successProb, label: 'Chance your money keeps its value' }
    }
  },

  insights(ctx) {
    const { v, model, mc, an, f } = ctx
    const p = Math.round(mc.successProb * 100)
    const b = []
    b.push({ tone: 'bad', text: `Left as cash, ${f.money(v.amount)} buys what ${f.money(model.cash)} buys today by year ${v.years}. Buying power halves roughly every ${Number.isFinite(model.halving) ? model.halving.toFixed(1) : '∞'} years at ${v.inflation}% inflation.` })
    b.push({ tone: model.rr >= 0 ? 'good' : 'warn', text: model.rr >= 0 ? `Earning ${v.invest}% against ${v.inflation}% inflation is a real return of ${model.rr.toFixed(1)}% a year, so your money grows in buying power to ${f.money(model.real)}.` : `Earning ${v.invest}% while prices rise ${v.inflation}% is a real return of ${model.rr.toFixed(1)}% a year. You are slowly getting poorer even though the balance grows.` })
    b.push({ tone: p >= 70 ? 'good' : 'warn', text: `Inflation is not constant. In 5,000 simulated futures your money keeps its value only ${p}% of the time at ${v.invest}%.` + (an.need85 != null ? ` For 85% you need to earn about ${an.need85.toFixed(1)}% a year.` : '') })
    b.push({ tone: 'info', text: `Bad-luck case (5% of futures): prices rise ${mc.idxP95.toFixed(2)}×, so cash would buy just ${f.money(mc.cashP5)}.` })
    return {
      headline: `At ${v.inflation}% average inflation, prices rise ${model.idx.toFixed(2)}× in ${v.years} years. ${f.money(v.amount)} kept as cash would feel like ${f.money(model.cash)} in today’s money, and you would need ${f.money(model.needed)} just to stand still. Earning ${v.invest}% turns that into ${f.money(model.real)} of real buying power on the straight-line path, and ${f.money(mc.p50)} as the likely simulated result (range ${f.money(mc.p5)} to ${f.money(mc.p95)}).`,
      bullets: b, confidence: confidenceFromBands(mc.p5, mc.p50, mc.p95),
      facts: { calculator: 'Inflation impact', amount: v.amount, years: v.years, inflation: v.inflation, cashValue: model.cash, needed: model.needed, probability: mc.successProb }
    }
  },

  cone(ctx) {
    const { v, mc, model, f } = ctx
    return {
      title: 'Real value of your money (today’s buying power)', xName: 'Year', xFmt: (x) => `Year ${x}`,
      rows: mc.labels.map((x, i) => ({ x, p5: mc.bands.p5[i], p25: mc.bands.p25[i], p50: mc.bands.p50[i], p75: mc.bands.p75[i], p95: mc.bands.p95[i], cash: model.path[i].cash })),
      lines: [{ key: 'cash', label: 'Kept as cash', color: 'var(--rose)', dash: '5 3' }],
      goal: v.amount, goalLabel: 'Keeps its value',
      legend: { best: 'Best case (95th pct)', likely: 'Likely (median)', worst: 'Worst case (5th pct)' },
      successLabel: 'chance it keeps its buying power', endpoints: { best: mc.p95, likely: mc.p50, worst: mc.p5 },
      histTitle: 'Real value after the period (all 5,000 futures)', histGoal: v.amount
    }
  },

  sensitivity: { metric: 'cash left in buying power', outcome: (v) => v.amount / priceIndex(v.inflation, v.years), higherIsBetter: true, format: (n, f) => f.money(n) },

  timeline(ctx) {
    const { model, f } = ctx
    return {
      xName: 'Year', xFmt: (x) => `Year ${x}`, rows: model.path.map((r) => ({ x: r.year, cash: r.cash, real: r.real })),
      series: [{ key: 'real', label: 'Invested (real)', color: 'var(--green)' }, { key: 'cash', label: 'Kept as cash (real)', color: 'var(--rose)' }],
      caption: (r) => `Year ${r.x}: cash buys what ${f.money(r.cash)} buys today; invested money is worth ${f.money(r.real)} in today’s terms.`
    }
  },

  regret(ctx) {
    const { v, model, f } = ctx
    const bars = [1, 3, 5, 10].map((d) => {
      const after = v.amount / priceIndex(v.inflation, d)
      return { label: `Let it sit ${d} year${d > 1 ? 's' : ''} as cash`, cost: v.amount - after, note: `Loses ${Math.round((1 - after / v.amount) * 100)}% of its buying power` }
    })
    return {
      headline: `Idle cash loses ${f.money(bars[0].cost)} of buying power in the first year`,
      sub: `Every year of waiting at ${v.inflation}% inflation, before any return.`, bars,
      optimal: { title: 'Versus the optimal move', gap: Math.max(0, v.amount - model.real), text: model.real >= v.amount ? `Earning ${v.invest}% already beats inflation. Keep it invested.` : `Earning ${v.invest}% falls short of inflation by ${f.money(v.amount - model.real)} of buying power. You need more than ${v.inflation}% to grow.` }
    }
  },

  reverse: {
    modes: [
      { id: 'future', label: 'Money needed later', target: { key: 'target', label: 'Years from now', kind: 'years', min: 1, max: 50, step: 1, def: 20 }, solve(v, t, f) { const m = futureNeeded(v.amount, v.inflation, t); return { answer: { label: `To match ${f.money(v.amount)} today, in ${t} years`, value: f.money(m) }, patch: { years: t }, text: `You will need ${f.money(m)} in ${t} years to buy what ${f.money(v.amount)} buys now.` } } },
      { id: 'rate', label: 'Return to beat it', target: { key: 'target', label: 'Confidence', kind: 'pct', min: 50, max: 99, step: 1, def: 85 }, solve(v, t, f) { const r = investForProb(v, t / 100); return r == null ? { answer: { label: 'Return needed', value: 'Out of reach' }, patch: null, text: 'No realistic return gives that confidence.' } : { answer: { label: `Return for ${t}% confidence`, value: `${r.toFixed(1)}%` }, patch: { invest: Math.round(r * 2) / 2 }, text: `Earning about ${r.toFixed(1)}% a year gives you a ${t}% chance of keeping your buying power.` } } },
      { id: 'inflation', label: 'Inflation that halves it', target: { key: 'target', label: 'Buying power left', kind: 'pct', min: 10, max: 95, step: 5, def: 50 }, solve(v, t, f) { const i = inflForShare(t / 100, v.years); return { answer: { label: `Inflation that leaves ${t}% in ${v.years} yrs`, value: `${i.toFixed(1)}%` }, patch: { inflation: Math.round(i * 2) / 2 }, text: `Average inflation of ${i.toFixed(1)}% would leave cash with just ${t}% of its buying power after ${v.years} years.` } } }
    ]
  },

  compare: {
    preset: (v) => ({ invest: Math.min(25, v.invest + 3) }),
    rows: [
      { label: 'Chance it keeps its value', get: (c) => c.mc.successProb * 100, fmt: (n) => `${Math.round(n)}%`, better: 'high', headline: true, prob: true },
      { label: 'Likely real value', get: (c) => c.mc.p50, fmt: (n, f) => f.money(n), better: 'high' },
      { label: 'Worst case (5th pct)', get: (c) => c.mc.p5, fmt: (n, f) => f.money(n), better: 'high', risk: true },
      { label: 'Real return', get: (c) => c.model.rr, fmt: (n) => `${n.toFixed(1)}%`, better: 'high' },
      { label: 'Money needed to match', get: (c) => c.model.needed, fmt: (n, f) => f.money(n), better: 'low' }
    ]
  },

  share(ctx) {
    const { v, model, mc, f } = ctx
    return {
      title: `${f.money(v.amount)} in ${v.years} years`, bigLabel: 'Buys only', big: f.money(model.cash),
      lines: [`at ${v.inflation}% inflation, as cash`, `Need ${f.money(model.needed)} to stand still`, `${Math.round(mc.successProb * 100)}% chance ${v.invest}% beats inflation`],
      chart: { p5: mc.bands.p5, p50: mc.bands.p50, p95: mc.bands.p95 }, chartLabel: 'Real value, 5,000 futures'
    }
  }
}
