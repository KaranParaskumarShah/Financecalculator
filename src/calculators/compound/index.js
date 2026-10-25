import { compoundSchedule, compoundFinal, doublingYears, rule72, shiftReport, shiftFinal, monthlyForTarget, rateForTarget, monthsToTarget, monthlyForConfidence, simulateCompound } from '../math/compound.js'
import { confidenceFromBands } from '../../lib/stats.js'
import TimeMachineLab from './Lab.jsx'

const usd = (o) => ({ usd: o })
const TARGET = { key: 'target', label: 'Target amount', kind: 'money', min: 1000, max: 2000000000, step: 100000, def: 15000000, log: true, profiles: usd({ min: 1000, max: 200000000, step: 5000, def: 250000 }) }

export default {
  id: 'compound',
  flagship: { label: 'Time Machine Lab', component: TimeMachineLab },

  fields: [
    { key: 'principal', label: 'Starting amount', kind: 'money', min: 0, max: 100000000, step: 10000, def: 100000, group: 'main', sens: { rel: 0.3 }, profiles: usd({ max: 10000000, step: 500, def: 10000 }) },
    { key: 'monthly', label: 'Monthly contribution', kind: 'money', min: 0, max: 500000, step: 500, def: 10000, group: 'main', sens: { rel: 0.2 }, profiles: usd({ max: 20000, step: 25, def: 300 }) },
    { key: 'rate', label: 'Annual return (nominal)', kind: 'pct', min: 0.5, max: 30, step: 0.5, def: 10, group: 'main', sens: { abs: 2 }, profiles: usd({ def: 7 }) },
    { key: 'years', label: 'Time horizon', kind: 'years', min: 1, max: 60, step: 1, def: 25, group: 'main', sens: { abs: 3 } },
    { key: 'freq', label: 'Compounding', kind: 'select', def: 12, group: 'main', options: [{ value: 1, label: 'Yearly' }, { value: 4, label: 'Quarterly' }, { value: 12, label: 'Monthly' }, { value: 365, label: 'Daily' }] },
    { key: 'target', label: 'Target amount', kind: 'money', min: 1000, max: 2000000000, step: 100000, def: 15000000, log: true, group: 'advanced', profiles: usd({ min: 1000, max: 200000000, step: 5000, def: 250000 }) },
    { key: 'inflation', label: 'Inflation', kind: 'pct', min: 0, max: 15, step: 0.5, def: 6, group: 'advanced', profiles: usd({ def: 3 }) },
    { key: 'volatility', label: 'Return volatility', kind: 'pct', min: 0, max: 40, step: 1, def: 12, group: 'advanced', hint: 'Set 0 for a guaranteed rate' }
  ],

  compute(v) {
    const s = compoundSchedule(v)
    const d = doublingYears(v.rate, v.freq)
    return { ...s, multiple: s.invested > 0 ? s.final / s.invested : 0, real: s.final / Math.pow(1 + v.inflation / 100, v.years), doubling: d, rule72: rule72(v.rate), doublings: v.years / d, growthShare: s.final > 0 ? s.gain / s.final : 0 }
  },

  simulate: (v) => simulateCompound(v),

  analyze(v, model, mc) {
    const early5 = shiftReport(v, 5)
    const late5 = shiftReport(v, -5)
    const m80 = v.target > 0 && mc.successProb < 0.8 ? monthlyForConfidence(v, v.target, 0.8, { n: 2000 }) : null
    const plusTwo = compoundFinal({ ...v, rate: v.rate + 2 }) - model.final
    const plus25 = compoundFinal({ ...v, monthly: v.monthly * 1.25 }) - model.final
    return { early5, late5, m80, plusTwo, plus25 }
  },

  hero(ctx) {
    const { v, model, mc, f } = ctx
    return {
      label: `Value after ${v.years} years`,
      value: f.money(model.final),
      raw: model.final,
      sub: `Straight-line estimate · likely outcome ${f.money(mc.p50)}`,
      stats: [
        { label: 'You put in', value: f.money(model.invested) },
        { label: 'Interest earned', value: f.money(model.gain), tone: 'good' },
        { label: 'Money multiple', value: `${model.multiple.toFixed(1)}×` },
        { label: 'Doubles every', value: `${model.doubling.toFixed(1)} yrs` }
      ],
      gauge: { value: mc.successProb ?? 0, label: `Chance of reaching ${f.money(v.target)}` }
    }
  },

  insights(ctx) {
    const { v, model, mc, an, f } = ctx
    const p = Math.round((mc.successProb ?? 0) * 100)
    const b = []
    b.push({ tone: 'tip', text: `Starting 5 years earlier would have left you ${f.money(an.early5.diff)} richer (+${Math.round((an.early5.diff / model.final) * 100)}%): only ${f.money(an.early5.extraContrib)} of that is extra money you put in. The other ${f.money(an.early5.extraGrowth)} is pure compounding.` })
    b.push({ tone: 'warn', text: `Starting 5 years later costs you ${f.money(-an.late5.diff)} at the finish line, even though you would have paid in only ${f.money(-an.late5.extraContrib)} less.` })
    b.push({ tone: p >= 75 ? 'good' : p >= 50 ? 'warn' : 'bad', text: `You have a ${p}% chance of reaching ${f.money(v.target)}.` + (an.m80 ? ` Contributing ${f.money(an.m80)} a month would lift that to 80%.` : '') })
    b.push({ tone: 'tip', text: `Two extra points of return add ${f.money(an.plusTwo)}; a 25% bigger monthly contribution adds ${f.money(an.plus25)}. ${an.plusTwo > an.plus25 ? 'Return matters more here.' : 'Saving more is the stronger lever here.'}` })
    b.push({ tone: 'info', text: `Rule of 72: ${v.rate}% doubles money roughly every ${model.rule72.toFixed(1)} years (exactly ${model.doubling.toFixed(1)} at this compounding), so your pot doubles about ${model.doublings.toFixed(1)} times in ${v.years} years.` })
    b.push({ tone: 'info', text: `After inflation the ${f.money(model.final)} is worth ${f.money(model.real)} in today’s money. ${Math.round(mc.beatInflationProb * 100)}% of simulated futures end above what you put in, after inflation.` })
    return {
      headline: `Starting with ${f.money(v.principal)} and adding ${f.money(v.monthly)} a month at ${v.rate}% turns ${f.money(model.invested)} of your own money into ${f.money(model.final)} on a straight line, ${model.multiple.toFixed(1)}× what you paid in. ${Math.round(model.growthShare * 100)}% of the final pot is interest earning interest. Across 5,000 simulated futures the likely result is ${f.money(mc.p50)}, with a realistic range of ${f.money(mc.p5)} to ${f.money(mc.p95)}.`,
      bullets: b,
      confidence: v.volatility === 0 ? 97 : confidenceFromBands(mc.p5, mc.p50, mc.p95),
      facts: { calculator: 'Compound interest', principal: v.principal, monthly: v.monthly, rate: v.rate, years: v.years, final: model.final, invested: model.invested, likely: mc.p50, range: [mc.p5, mc.p95], startFiveYearsEarlierDiff: an.early5.diff }
    }
  },

  cone(ctx) {
    const { v, mc, f } = ctx
    return {
      title: 'Growth cone, 5,000 simulated futures',
      xName: 'Year', xFmt: (x) => `Yr ${x}`,
      rows: mc.labels.map((x, i) => ({ x, p5: mc.bands.p5[i], p25: mc.bands.p25[i], p50: mc.bands.p50[i], p75: mc.bands.p75[i], p95: mc.bands.p95[i], det: mc.deterministic[i], inv: mc.invested[i] })),
      lines: [{ key: 'inv', label: 'You put in', color: 'var(--violet)', dash: '4 4' }, { key: 'det', label: 'Straight line', color: 'var(--amber)', dash: '2 3' }],
      goal: v.target, goalLabel: 'Target',
      legend: { best: 'Best case (95th pct)', likely: 'Likely (median)', worst: 'Worst case (5th pct)' },
      successLabel: `chance of reaching ${f.money(v.target)}`,
      endpoints: { best: mc.p95, likely: mc.p50, worst: mc.p5 },
      histTitle: `Where ${v.years}-year outcomes land (all 5,000 futures)`, histGoal: v.target
    }
  },

  sensitivity: { metric: 'final value', outcome: (v) => compoundFinal(v), higherIsBetter: true, format: (n, f) => f.money(n) },

  timeline(ctx) {
    const { model, mc, v, f } = ctx
    const rows = model.yearly.map((y, i) => ({ x: y.year, invested: y.principal + y.contrib, balance: y.balance, likely: mc.bands.p50[i], real: y.balance / Math.pow(1 + v.inflation / 100, y.year) }))
    const cross = rows.find((r) => r.balance - r.invested > r.invested)
    return {
      xName: 'Year', xFmt: (x) => `Year ${x}`, rows,
      series: [
        { key: 'invested', label: 'You put in', color: 'var(--violet)' },
        { key: 'balance', label: 'Balance (straight line)', color: 'var(--cyan)' },
        { key: 'likely', label: 'Likely outcome', color: 'var(--green)' },
        { key: 'real', label: 'In today’s money', color: 'var(--amber)' }
      ],
      caption: (r) => r.x === 0 ? 'Day one: only your starting amount.' : `Year ${r.x}: ${f.money(r.invested)} paid in has become ${f.money(r.balance)}. ${r.balance > 0 ? Math.round(((r.balance - r.invested) / r.balance) * 100) : 0}% is interest.` + (cross ? (r.x >= cross.x ? ` Interest passed your deposits in year ${cross.x}.` : ` Interest passes your deposits in year ${cross.x}.`) : '')
    }
  },

  regret(ctx) {
    const { v, model, an, f } = ctx
    const bars = [1, 2, 3, 5, 10].filter((d) => d < v.years).map((d) => ({ label: `Start ${d} year${d > 1 ? 's' : ''} later`, cost: model.final - shiftFinal(v, -d), note: `${f.money(model.final - shiftFinal(v, -d))} lost to ${d} year${d > 1 ? 's' : ''} less compounding` }))
    return {
      headline: bars[0] ? `Waiting 1 year costs you ${f.money(bars[0].cost)}` : 'Start now',
      sub: 'Same contributions, same finish date, fewer years of compounding.',
      bars,
      optimal: { title: 'Versus the optimal move', gap: an.plus25, text: `You cannot go back 5 years (that would have added ${f.money(an.early5.diff)}). The best lever left is contributing 25% more from today, worth ${f.money(an.plus25)}.` }
    }
  },

  reverse: {
    modes: [
      { id: 'monthly', label: 'Monthly needed', target: TARGET, solve(v, t, f) { const m = monthlyForTarget(v, t); return { answer: { label: 'Monthly contribution needed', value: f.money(m) }, patch: { monthly: Math.round(m / 100) * 100, target: t }, text: `To reach ${f.money(t)} in ${v.years} years at ${v.rate}% you need ${f.money(m)} a month on a straight line.` } } },
      { id: 'rate', label: 'Return needed', target: TARGET, solve(v, t, f) { const r = rateForTarget(v, t); return r == null ? { answer: { label: 'Return needed', value: '60%+' }, patch: null, text: 'No realistic return reaches that target with these contributions.' } : { answer: { label: 'Annual return needed', value: `${r.toFixed(1)}%` }, patch: { rate: Math.min(30, Math.round(r * 2) / 2), target: t }, text: `You would need about ${r.toFixed(1)}% a year to reach ${f.money(t)} with today’s contributions.` } } },
      { id: 'years', label: 'Time needed', target: TARGET, solve(v, t, f) { const m = monthsToTarget({ ...v, target: t }); return m == null ? { answer: { label: 'Time needed', value: '100+ yrs' }, patch: null, text: 'This target is out of reach at these settings.' } : { answer: { label: 'Time needed', value: f.duration(m) }, patch: { years: Math.min(60, Math.ceil(m / 12)), target: t }, text: `You reach ${f.money(t)} in ${f.duration(m)}.` } } }
    ]
  },

  compare: {
    preset: (v) => ({ monthly: Math.round((v.monthly * 1.25) / 100) * 100 || 500 }),
    rows: [
      { label: 'Straight-line value', get: (c) => c.model.final, fmt: (n, f) => f.money(n), better: 'high', headline: true },
      { label: 'Likely outcome', get: (c) => c.mc.p50, fmt: (n, f) => f.money(n), better: 'high' },
      { label: 'Worst case (5th pct)', get: (c) => c.mc.p5, fmt: (n, f) => f.money(n), better: 'high', risk: true },
      { label: 'Chance of target', get: (c) => (c.mc.successProb ?? 0) * 100, fmt: (n) => `${Math.round(n)}%`, better: 'high' },
      { label: 'You put in', get: (c) => c.model.invested, fmt: (n, f) => f.money(n), better: 'low' }
    ]
  },

  share(ctx) {
    const { v, model, mc, an, f } = ctx
    return {
      title: `${f.money(v.monthly)}/month at ${v.rate}% for ${v.years} years`,
      bigLabel: 'Likely value',
      big: f.money(mc.p50),
      lines: [`Straight line ${f.money(model.final)} · ${model.multiple.toFixed(1)}× what you put in`, `Money doubles about every ${model.doubling.toFixed(1)} years`, `Starting 5 years earlier: +${f.money(an.early5.diff)}`],
      chart: { p5: mc.bands.p5, p50: mc.bands.p50, p95: mc.bands.p95 }, chartLabel: '5,000 simulated futures'
    }
  }
}
