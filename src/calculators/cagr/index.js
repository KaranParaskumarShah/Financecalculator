import { analyzeFlows, simulateForward, benchmarkValue, valueForXirr, timelineRows } from '../math/cagr.js'
import { confidenceFromBands } from '../../lib/stats.js'
import Lab from './Lab.jsx'


const SAMPLE_INR = `# date, amount  (money you put in is negative; what you hold or took out is positive)
2021-01-10, -100000
2022-01-10, -50000
2023-03-15, -50000
2024-06-01, -25000
2026-10-01, 365000`
const SAMPLE_USD = `# date, amount  (money you put in is negative; what you hold or took out is positive)
2021-01-10, -10000
2022-01-10, -5000
2023-03-15, -5000
2024-06-01, -2500
2026-10-01, 28000`

const pct = (x, d = 1) => `${(x * 100).toFixed(d)}%`
const yrs = (y) => (y >= 1.5 ? `${y.toFixed(1)} years` : `${Math.max(1, Math.round(y * 12))} months`)
// Cached per text, because several config functions need the parse.
const cache = new Map()
const flowsOf = (v) => { const k = v.flows; if (!cache.has(k)) { if (cache.size > 40) cache.clear(); cache.set(k, analyzeFlows(k)) } return cache.get(k) }

export default {
  id: 'cagr',
  flagship: { label: 'Plain-English Lab', component: Lab },

  fields: [
    { key: 'flows', label: 'Paste your cash flows', kind: 'text', rows: 8, def: SAMPLE_INR, group: 'main', placeholder: '2021-01-10, -100000\n2026-10-01, 365000', hint: 'One per line: date, amount. Negative = you invested. Positive = you took out or hold now (last line).', profiles: { usd: { def: SAMPLE_USD } } },
    { key: 'benchmark', label: 'Compare with (a benchmark return)', kind: 'pct', min: 0, max: 25, step: 0.5, def: 12, group: 'main', sens: { abs: 2 }, profiles: { usd: { def: 9 } } },
    { key: 'inflation', label: 'Inflation', kind: 'pct', min: 0, max: 15, step: 0.5, def: 6, group: 'main', sens: { abs: 1.5 }, profiles: { usd: { def: 3 } } },
    { key: 'projRate', label: 'Expected return going forward', kind: 'pct', min: 0, max: 25, step: 0.5, def: 11, group: 'main', sens: { abs: 2 }, profiles: { usd: { def: 7 } } },
    { key: 'projYears', label: 'Project forward', kind: 'years', min: 1, max: 40, step: 1, def: 10, group: 'main', sens: { abs: 3 } },
    { key: 'vol', label: 'Return volatility', kind: 'pct', min: 0, max: 40, step: 1, def: 15, group: 'advanced' }
  ],

  compute(v) {
    const a = flowsOf(v)
    if (!a.valid) return { a, valid: false, xirr: 0, real: 0, bench: 0, benchValue: 0, vsBench: 0, value: 0, rows: [] }
    const bv = benchmarkValue(a.flows, v.benchmark / 100)
    return { a, valid: true, xirr: a.xirr, real: (1 + a.xirr) / (1 + v.inflation / 100) - 1, benchValue: bv, vsBench: a.returned - bv, value: a.currentValue || a.returned, rows: timelineRows(a, v.benchmark / 100) }
  },
  simulate: (v) => simulateForward(v, flowsOf(v)),
  analyze: () => ({}),

  hero(ctx) {
    const { v, model, mc, f } = ctx
    const a = model.a
    if (!model.valid) return { label: 'Your annualised return (XIRR)', value: '–', sub: a.reason || 'Paste dated cash flows to begin.', stats: [{ label: 'Lines understood', value: String(a.parsed.good.length) }, { label: 'Lines skipped', value: String(a.parsed.bad.length), tone: a.parsed.bad.length ? 'warn' : '' }, { label: 'Money in', value: '–' }, { label: 'Money out', value: '–' }], gauge: { value: 0, label: 'Chance it beats inflation' } }
    return {
      label: 'Your annualised return (XIRR)', value: pct(model.xirr),
      sub: `${f.money(a.invested)} put in became ${f.money(a.returned)} over ${yrs(a.years)}`,
      stats: [
        { label: 'Money multiple', value: `${a.multiple.toFixed(2)}×`, tone: a.multiple >= 1 ? 'good' : 'bad' },
        { label: 'Gain', value: f.money(a.gain), tone: a.gain >= 0 ? 'good' : 'bad' },
        { label: 'After inflation', value: pct(model.real), tone: model.real >= 0 ? 'good' : 'bad' },
        { label: `vs ${v.benchmark}% benchmark`, value: `${model.vsBench >= 0 ? '+' : '−'}${f.money(Math.abs(model.vsBench))}`, tone: model.vsBench >= 0 ? 'good' : 'bad' }
      ],
      gauge: { value: mc.successProb, label: `Chance it beats inflation over ${v.projYears} yrs` }
    }
  },

  insights(ctx) {
    const { v, model, mc, f } = ctx
    const a = model.a
    if (!model.valid) return { headline: `I could not compute a return yet. ${a.reason}`, bullets: a.parsed.bad.slice(0, 4).map((r) => ({ tone: 'warn', text: `Line ${r.line}, “${r.raw}”: ${r.error}.` })), confidence: 30, facts: { calculator: 'XIRR', error: a.reason } }
    const b = []
    b.push({ tone: model.xirr >= v.benchmark / 100 ? 'good' : 'warn', text: `Your money-weighted return is ${pct(model.xirr)} a year. The same deposits at ${v.benchmark}% would be worth ${f.money(model.benchValue)}, so you are ${model.vsBench >= 0 ? 'ahead by' : 'behind by'} ${f.money(Math.abs(model.vsBench))}.` })
    b.push({ tone: model.real >= 0 ? 'good' : 'bad', text: `After ${v.inflation}% inflation the real return is ${pct(model.real)}, so your buying power ${model.real >= 0 ? 'grew' : 'shrank'}.` })
    b.push({ tone: 'info', text: a.single ? `With a single deposit and a single payout, CAGR equals XIRR (${pct(a.cagr)}).` : `You made several deposits, so a plain CAGR would mislead. XIRR weights each rupee by how long it was invested.` })
    if (a.parsed.bad.length) b.push({ tone: 'warn', text: `${a.parsed.bad.length} line${a.parsed.bad.length > 1 ? 's were' : ' was'} skipped (see the Plain-English Lab).` })
    b.push({ tone: 'info', text: `Looking ahead ${v.projYears} years at ${v.projRate}%, it keeps up with inflation in ${Math.round(mc.successProb * 100)}% of simulated futures.` })
    return {
      headline: `You put in ${f.money(a.invested)} between ${new Date(a.first.t).toISOString().slice(0, 10)} and ${new Date(a.last.t).toISOString().slice(0, 10)} and ${a.lastFlowIsValue ? 'it is now worth' : 'got back'} ${f.money(a.returned)}. In plain English: your money grew about ${pct(model.xirr)} a year, ${a.multiple.toFixed(2)} times what you put in. After inflation that is ${pct(model.real)} a year.`,
      bullets: b, confidence: Math.round(Math.min(95, 55 + a.parsed.good.length * 5 + (a.years > 3 ? 15 : 0))),
      facts: { calculator: 'XIRR', xirr: model.xirr, multiple: a.multiple, years: a.years, realReturn: model.real }
    }
  },

  cone(ctx) {
    const { v, mc, model, f } = ctx
    return {
      title: `Where today’s ${f.money(mc.V0)} could go`, xName: 'Year', xFmt: (x) => `Year ${x}`,
      rows: mc.labels.map((x, i) => ({ x, p5: mc.bands.p5[i], p25: mc.bands.p25[i], p50: mc.bands.p50[i], p75: mc.bands.p75[i], p95: mc.bands.p95[i], infl: mc.V0 * Math.pow(1 + v.inflation / 100, x) })),
      lines: [{ key: 'infl', label: 'Keeps up with inflation', color: 'var(--amber)', dash: '5 3' }],
      goal: mc.hurdle, goalLabel: 'Inflation hurdle',
      legend: { best: 'Best case (95th pct)', likely: 'Likely (median)', worst: 'Worst case (5th pct)' },
      successLabel: 'chance it beats inflation', endpoints: { best: mc.p95, likely: mc.p50, worst: mc.p5 },
      histTitle: 'Value after the projection (all 5,000 futures)', histGoal: mc.hurdle
    }
  },

  sensitivity: { metric: 'real value after projection', outcome: (v) => { const a = flowsOf(v); const V0 = a.valid ? Math.max(1, a.currentValue || a.returned) : 1; return V0 * Math.pow((1 + v.projRate / 100) / (1 + v.inflation / 100), v.projYears) }, higherIsBetter: true, format: (n, f) => f.money(n) },

  timeline(ctx) {
    const { model, v, f } = ctx
    return {
      xName: 'Month', xFmt: (x) => `Month ${x}`, rows: model.rows,
      series: [{ key: 'invested', label: 'Net money in', color: 'var(--cyan)' }, { key: 'benchmark', label: `Same deposits at ${v.benchmark}%`, color: 'var(--violet)' }],
      caption: (r) => `${new Date(r.t).toISOString().slice(0, 10)}: you had put in ${f.money(r.invested)}. At ${v.benchmark}% that money would have been ${f.money(r.benchmark)}.`
    }
  },

  regret(ctx) {
    const { v, model, f } = ctx
    if (!model.valid) return { headline: 'Add valid cash flows first', sub: '', bars: [], optimal: { title: 'Versus the optimal move', gap: 0, text: '' } }
    const a = model.a
    const bars = [{ n: 'a fixed deposit (6.5%)', r: 0.065 }, { n: `inflation (${v.inflation}%)`, r: v.inflation / 100 }, { n: `your ${v.benchmark}% benchmark`, r: v.benchmark / 100 }, { n: 'a strong 15% year-in year-out', r: 0.15 }].map((x) => ({ label: `If it had earned ${x.n}`, cost: Math.max(0, benchmarkValue(a.flows, x.r) - a.returned), note: benchmarkValue(a.flows, x.r) > a.returned ? 'More than you made' : 'You did better than this' }))
    return { headline: model.vsBench >= 0 ? `You beat your ${v.benchmark}% benchmark by ${f.money(model.vsBench)}` : `You trail your ${v.benchmark}% benchmark by ${f.money(-model.vsBench)}`, sub: 'Extra money you would hold had the same deposits earned these returns.', bars, optimal: { title: 'Versus the optimal move', gap: Math.max(0, -model.vsBench), text: model.vsBench >= 0 ? 'You are ahead of the benchmark.' : `Matching the benchmark would have given you ${f.money(-model.vsBench)} more.` } }
  },

  reverse: {
    modes: [
      { id: 'value', label: 'Value for a target return', target: { key: 'target', label: 'Annual return wanted', kind: 'pct', min: 1, max: 40, step: 0.5, def: 15 }, solve(v, t, f) { const a = flowsOf(v); if (!a.valid) return { answer: { label: 'Value needed', value: '–' }, patch: null, text: a.reason }; const x = valueForXirr(a.flows, t / 100); return { answer: { label: `Final value for ${t}% a year`, value: f.money(x) }, patch: null, text: `To have earned ${t}% a year your last cash flow would need to be ${f.money(x)}. It is ${f.money(a.last.amount)}.` } } },
      { id: 'years', label: 'Years to a multiple', target: { key: 'target', label: 'Multiple (×)', kind: 'pct', min: 110, max: 1000, step: 10, def: 200, unit: '%' }, solve(v, t, f) { const y = Math.log(t / 100) / Math.log(1 + v.projRate / 100); return { answer: { label: `Years to ${(t / 100).toFixed(1)}×`, value: `${y.toFixed(1)} yrs` }, patch: { projYears: Math.min(40, Math.max(1, Math.round(y))) }, text: `At ${v.projRate}% a year your money takes about ${y.toFixed(1)} years to reach ${(t / 100).toFixed(1)}× its value.` } } },
      { id: 'rate', label: 'Return needed', target: { key: 'target', label: 'Multiple wanted (%)', kind: 'pct', min: 110, max: 1000, step: 10, def: 200 }, solve(v, t, f) { const r = (Math.pow(t / 100, 1 / v.projYears) - 1) * 100; return { answer: { label: `Return for ${(t / 100).toFixed(1)}× in ${v.projYears} yrs`, value: `${r.toFixed(1)}%` }, patch: { projRate: Math.min(25, Math.round(r * 2) / 2) }, text: `You need about ${r.toFixed(1)}% a year to turn your money into ${(t / 100).toFixed(1)}× in ${v.projYears} years.` } } }
    ]
  },

  compare: {
    preset: (v) => ({ projRate: Math.min(25, v.projRate + 2), vol: Math.max(0, v.vol - 3) }),
    rows: [
      { label: 'Chance it beats inflation', get: (c) => c.mc.successProb * 100, fmt: (n) => `${Math.round(n)}%`, better: 'high', headline: true, prob: true },
      { label: 'Likely value', get: (c) => c.mc.p50, fmt: (n, f) => f.money(n), better: 'high' },
      { label: 'Worst case (5th pct)', get: (c) => c.mc.p5, fmt: (n, f) => f.money(n), better: 'high', risk: true },
      { label: 'Your XIRR so far', get: (c) => c.model.xirr * 100, fmt: (n) => `${n.toFixed(1)}%`, better: 'high' }
    ]
  },

  share(ctx) {
    const { v, model, mc, f } = ctx
    const a = model.a
    return {
      title: 'My investment return', bigLabel: 'Annual return (XIRR)', big: model.valid ? pct(model.xirr) : '–',
      lines: model.valid ? [`${f.money(a.invested)} became ${f.money(a.returned)}`, `${a.multiple.toFixed(2)}× in ${yrs(a.years)}`, `After inflation ${pct(model.real)} a year`] : ['Paste cash flows to see your return'],
      chart: { p5: mc.bands.p5, p50: mc.bands.p50, p95: mc.bands.p95 }, chartLabel: 'Next years, 5,000 futures'
    }
  }
}
