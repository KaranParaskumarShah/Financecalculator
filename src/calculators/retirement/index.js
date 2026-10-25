import {
  retireModel, simulateRetirement, earliestRetirementAge, stressTests, savingsForCorpus,
  savingsForProbability, sustainableSpend, norm
} from '../math/retirement.js'
import { confidenceFromBands } from '../../lib/stats.js'
import StressLab from './StressLab.jsx'

const usd = (o) => ({ usd: o })

export default {
  id: 'retirement',
  flagship: { label: 'Stress Lab', component: StressLab },

  fields: [
    { key: 'age', label: 'Your age today', kind: 'age', min: 18, max: 70, step: 1, def: 32, group: 'main' },
    { key: 'retireAge', label: 'Retire at', kind: 'age', min: 30, max: 75, step: 1, def: 50, group: 'main', sens: { abs: 3 } },
    { key: 'currentCorpus', label: 'Saved so far', kind: 'money', min: 0, max: 1000000000, step: 100000, def: 2500000, group: 'main', sens: { rel: 0.2 }, profiles: usd({ max: 20000000, step: 5000, def: 150000 }) },
    { key: 'monthlySave', label: 'Monthly saving', kind: 'money', min: 0, max: 1000000, step: 1000, def: 60000, group: 'main', sens: { rel: 0.2 }, profiles: usd({ max: 50000, step: 100, def: 3000 }) },
    { key: 'stepUp', label: 'Yearly saving step-up', kind: 'pct', min: 0, max: 20, step: 1, def: 7, group: 'main', sens: { abs: 3 }, profiles: usd({ def: 3 }) },
    { key: 'monthlyExpense', label: 'Monthly spend (today’s money)', kind: 'money', min: 5000, max: 1000000, step: 1000, def: 50000, group: 'main', sens: { rel: 0.2 }, hint: 'What you expect to live on in retirement', profiles: usd({ min: 500, max: 50000, step: 100, def: 4000 }) },
    { key: 'lifeExp', label: 'Plan until age', kind: 'age', min: 60, max: 105, step: 1, def: 90, group: 'advanced', sens: { abs: 3 } },
    { key: 'otherIncome', label: 'Pension / other income (today’s money)', kind: 'money', min: 0, max: 500000, step: 1000, def: 0, group: 'advanced', profiles: usd({ max: 20000, step: 100 }) },
    { key: 'inflation', label: 'Inflation', kind: 'pct', min: 0, max: 15, step: 0.5, def: 6, group: 'advanced', sens: { abs: 1.5 }, profiles: usd({ def: 3 }) },
    { key: 'preReturn', label: 'Return while saving', kind: 'pct', min: 2, max: 25, step: 0.5, def: 12, group: 'advanced', sens: { abs: 2 }, profiles: usd({ def: 8 }) },
    { key: 'postReturn', label: 'Return in retirement', kind: 'pct', min: 1, max: 20, step: 0.5, def: 8, group: 'advanced', sens: { abs: 1.5 }, profiles: usd({ def: 5 }) },
    { key: 'volatility', label: 'Market volatility', kind: 'pct', min: 3, max: 35, step: 1, def: 15, group: 'advanced', hint: 'Retirement-phase volatility is 75% of this' }
  ],

  compute: (v) => retireModel(v),
  simulate: (v) => simulateRetirement(v),

  analyze(v, model, mc) {
    const n = norm(v)
    const earliest = earliestRetirementAge(v)
    const stress = stressTests(v)
    const need85 = mc.successProb < 0.85 ? savingsForProbability(v, 0.85) : null
    const lo = Math.max(n.age + 1, n.retireAge - 8)
    const hi = Math.min(n.lifeExp - 5, n.retireAge + 8)
    const ageCurve = []
    for (let a = lo; a <= hi; a++) ageCurve.push({ age: a, prob: simulateRetirement({ ...v, retireAge: a }, { n: 700 }).successProb * 100 })
    const delay1 = model.corpusAtRetire - retireModel(v, { delaySave: 1 }).corpusAtRetire
    return { earliest, stress, need85, ageCurve, delay1 }
  },

  hero(ctx) {
    const { v, model, mc, f } = ctx
    const n = model.v
    return {
      label: `Likely corpus at ${n.retireAge}`,
      value: f.money(mc.corpusP50),
      raw: mc.corpusP50,
      sub: `Straight line: ${f.money(model.corpusAtRetire)} · ${f.money(model.corpusReal)} in today’s money`,
      stats: [
        { label: 'Needed on a straight line', value: f.money(model.required) },
        { label: 'Funded (straight line)', value: `${Math.round(model.readiness * 100)}%`, tone: model.readiness >= 1 ? 'good' : 'bad' },
        { label: 'First-year withdrawal', value: `${(model.swr * 100).toFixed(1)}%` },
        { label: 'Monthly spend then', value: f.money(model.expenseAtRetire / 12) }
      ],
      gauge: { value: mc.successProb, label: `Chance your money lasts to ${n.lifeExp}` }
    }
  },

  insights(ctx) {
    const { v, model, mc, an, f } = ctx
    const n = model.v
    const p = Math.round(mc.successProb * 100)
    const bullets = []
    bullets.push({
      tone: p >= 85 ? 'good' : p >= 65 ? 'warn' : 'bad',
      text: `Your money lasts to ${n.lifeExp} in ${p}% of simulated futures. ` + (an.earliest == null ? 'At this savings rate even a late retirement is shaky — savings need to rise.' : an.earliest > n.retireAge ? `The earliest age that reaches 85% confidence is ${an.earliest}, ${an.earliest - n.retireAge} year${an.earliest - n.retireAge > 1 ? 's' : ''} later than planned.` : `You could retire as early as ${an.earliest} and still clear 85% confidence.`)
    })
    if (an.need85) bullets.push({ tone: 'tip', text: `Saving ${f.money(an.need85)} a month (${an.need85 > v.monthlySave ? '+' : ''}${Math.round((an.need85 / Math.max(1, v.monthlySave) - 1) * 100)}%) would put an 85% success rate within reach.` })
    const worst = [...an.stress].filter((s) => s.id !== 'base').sort((a, b) => (a.depletedAge ?? 999) - (b.depletedAge ?? 999))[0]
    if (worst)
      bullets.push({ tone: worst.survives ? 'good' : 'bad', text: worst.survives ? `Your plan survives even the “${worst.label}” stress test, ending with ${f.money(worst.endBalance)}.` : `The “${worst.label}” stress test breaks the plan: money runs out at ${worst.depletedAge}.` })
    bullets.push({ tone: model.swr <= 0.04 ? 'good' : 'warn', text: `You would withdraw ${(model.swr * 100).toFixed(1)}% of the pot in year one. Sustainable rates for 40-year retirements usually sit near 3–4%.` })
    bullets.push({ tone: 'warn', text: `Every year you delay saving costs ${f.money(an.delay1)} of retirement corpus (${Math.round((an.delay1 / model.required) * 100)}% of what you need).` })
    bullets.push({ tone: 'info', text: `Inflation turns ${f.money(v.monthlyExpense)} a month today into ${f.money(model.expenseAtRetire / 12)} a month at ${n.retireAge}.` })
    const gap = model.readiness >= 1 && p < 85
    return {
      headline:
        `You are ${n.age} and saving ${f.money(v.monthlySave)} a month (rising ${v.stepUp}% a year) toward retiring at ${n.retireAge}. On a straight line that builds ${f.money(model.corpusAtRetire)} — ${model.readiness >= 1 ? 'more than' : 'short of'} the ${f.money(model.required)} needed to fund ${f.money(model.expenseAtRetire / 12)} a month (today’s ${f.money(v.monthlyExpense)}, inflated) until ${n.lifeExp}. ` +
        (gap ? `Yet across 5,000 simulated futures your money lasts in only ${p}% of them: a straight line hides the danger of crashes early in retirement.` : `Across 5,000 simulated futures your money lasts in ${p}% of them.`),
      bullets,
      confidence: confidenceFromBands(mc.corpusP5, mc.corpusP50, mc.corpusP95),
      facts: { calculator: 'Retirement', age: n.age, retireAge: n.retireAge, lifeExp: n.lifeExp, straightLineCorpus: model.corpusAtRetire, required: model.required, probabilityLasts: mc.successProb, earliestAge85: an.earliest }
    }
  },

  cone(ctx) {
    const { v, model, mc, f } = ctx
    const n = model.v
    const detByAge = Object.fromEntries(model.series.map((s) => [s.age, s.balance]))
    return {
      title: 'Your money across 5,000 futures',
      xName: 'Age',
      xFmt: (x) => `Age ${x}`,
      rows: mc.labels.map((x, i) => ({ x, p5: mc.bands.p5[i], p25: mc.bands.p25[i], p50: mc.bands.p50[i], p75: mc.bands.p75[i], p95: mc.bands.p95[i], det: detByAge[x] ?? 0 })),
      lines: [{ key: 'det', label: 'Straight line', color: 'var(--amber)', dash: '2 3' }],
      yMax: Math.max(1, ...mc.bands.p75) * 1.7,
      marker: n.retireAge,
      markerLabel: 'Retire',
      legend: { best: 'Best case (95th pct)', likely: 'Likely (median)', worst: 'Worst case (5th pct)' },
      successLabel: `chance your money lasts to ${n.lifeExp}`,
      histTitle: `Money left at ${n.lifeExp} across 5,000 futures (the left bar is “ran out”)`,
      endpoints: { best: mc.corpusP95, likely: mc.corpusP50, worst: mc.corpusP5, atLabel: `at ${n.retireAge}` }
    }
  },

  sensitivity: { metric: 'funding level', outcome: (v) => retireModel(v).readiness * 100, higherIsBetter: true, format: (n) => `${Math.round(n)}%` },

  timeline(ctx) {
    const { model, mc, f } = ctx
    const n = model.v
    const rows = model.series.map((s, i) => ({ x: s.age, balance: s.balance, likely: mc.bands.p50[i] ?? 0, real: s.real, phase: s.phase }))
    return {
      xName: 'Age', xFmt: (x) => `Age ${x}`, rows,
      series: [
        { key: 'balance', label: 'Straight line', color: 'var(--cyan)' },
        { key: 'likely', label: 'Likely (median)', color: 'var(--green)' },
        { key: 'real', label: 'In today’s money', color: 'var(--amber)' }
      ],
      caption: (row) =>
        row.x < n.retireAge
          ? `Age ${row.x}: still saving. The pot is ${f.money(row.balance)} on a straight line, ${f.money(row.likely)} in the median simulation.`
          : row.balance <= 0
            ? `Age ${row.x}: on a straight line the money has run out.`
            : `Age ${row.x}: spending phase. The straight-line pot is ${f.money(row.balance)}, worth ${f.money(row.real)} in today’s money.`
    }
  },

  regret(ctx) {
    const { v, model, an, f } = ctx
    const bars = [1, 2, 3, 5].filter((d) => d < model.yearsToRetire).map((d) => {
      const c = model.corpusAtRetire - retireModel(v, { delaySave: d }).corpusAtRetire
      return { label: `Start saving ${d} yr${d > 1 ? 's' : ''} later`, cost: c, note: `${Math.round((c / model.required) * 100)}% of the corpus you need` }
    })
    return {
      headline: bars[0] ? `Waiting 1 year costs you ${f.money(bars[0].cost)}` : 'Start now',
      sub: 'Measured as retirement corpus lost, keeping the same retirement date.',
      bars,
      optimal: {
        title: 'Versus the optimal move',
        gap: an.need85 ? Math.max(0, an.need85 - v.monthlySave) : 0,
        text: an.need85 ? `The cheapest way to reach 85% confidence is ${f.money(an.need85)} a month, or retiring at ${an.earliest ?? 'a later age'}. Your current plan leaves ${f.money(Math.max(0, an.need85 - v.monthlySave))} a month on the table.` : 'You already clear 85% confidence. Your plan is at or beyond the optimum.'
      }
    }
  },

  reverse: {
    modes: [
      {
        id: 'goal', label: 'Corpus → saving', target: { key: 'goal', label: 'Target corpus at retirement', kind: 'money', min: 1000000, max: 5000000000, step: 500000, def: 50000000, log: true, profiles: usd({ min: 50000, max: 50000000, step: 25000, def: 2000000 }) },
        solve(v, target, f) {
          const s = savingsForCorpus(v, target)
          return { answer: { label: 'Monthly saving needed', value: f.money(s) }, patch: { monthlySave: Math.round(s / 100) * 100 }, text: `To build ${f.money(target)} by ${v.retireAge}, save ${f.money(s)} a month, rising ${v.stepUp}% a year (straight line, before market risk).` }
        }
      },
      {
        id: 'savings', label: 'Confidence → saving', target: { key: 'prob', label: 'Success probability', kind: 'pct', min: 50, max: 99, step: 1, def: 85 },
        solve(v, target, f) {
          const s = savingsForProbability(v, target / 100)
          if (s == null) return { answer: { label: 'Monthly saving needed', value: 'Out of reach' }, patch: null, text: 'No realistic saving rate reaches that confidence. Retire later or spend less.' }
          return { answer: { label: 'Monthly saving needed', value: f.money(s) }, patch: { monthlySave: Math.round(s / 100) * 100 }, text: `Saving ${f.money(s)} a month gives a ${target}% chance your money lasts to ${v.lifeExp}.` }
        }
      },
      {
        id: 'spend', label: 'Confidence → spending', target: { key: 'prob', label: 'Success probability', kind: 'pct', min: 50, max: 99, step: 1, def: 85 },
        solve(v, target, f) {
          const e = sustainableSpend(v, target / 100) * 0.99
          return { answer: { label: 'Sustainable monthly spend', value: f.money(e) }, patch: { monthlyExpense: Math.round(e / 100) * 100 }, text: `With your current plan you can spend up to ${f.money(e)} a month (today’s money) and keep a ${target}% chance of never running out.` }
        }
      }
    ]
  },

  compare: {
    preset: (v) => ({ retireAge: Math.min(75, v.retireAge + 3) }),
    rows: [
      { label: 'Chance money lasts', get: (c) => c.mc.successProb * 100, fmt: (n) => `${Math.round(n)}%`, better: 'high', headline: true, prob: true },
      { label: 'Likely corpus at retirement', get: (c) => c.mc.corpusP50, fmt: (n, f) => f.money(n), better: 'high' },
      { label: 'Corpus needed (straight line)', get: (c) => c.model.required, fmt: (n, f) => f.money(n), better: 'low' },
      { label: 'Worst-case corpus (5th pct)', get: (c) => c.mc.corpusP5, fmt: (n, f) => f.money(n), better: 'high', risk: true },
      { label: 'Earliest age (85% confidence)', get: (c) => c.an.earliest ?? 99, fmt: (n) => (n >= 99 ? 'n/a' : `${n}`), better: 'low' }
    ]
  },

  share(ctx) {
    const { v, model, mc, an, f } = ctx
    const n = model.v
    return {
      title: `Retire at ${n.retireAge} · saving ${f.money(v.monthlySave)}/month`,
      bigLabel: `Chance your money lasts to ${n.lifeExp}`,
      big: `${Math.round(mc.successProb * 100)}%`,
      lines: [
        `Likely corpus at ${n.retireAge}: ${f.money(mc.corpusP50)}`,
        an.earliest ? `Earliest retirement at 85% confidence: age ${an.earliest}` : 'Savings need to rise to retire safely',
        `Straight line says ${Math.round(model.readiness * 100)}% funded — markets say otherwise`
      ],
      chart: { p5: mc.bands.p5, p50: mc.bands.p50, p95: mc.bands.p95 },
      chartLabel: 'Your money across 5,000 futures'
    }
  }
}
