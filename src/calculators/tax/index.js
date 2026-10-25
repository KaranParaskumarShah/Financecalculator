import { compareRegimes, suggestions, extraDeductionsToWin, tieIncome, simulateTax, growthPath, taxOn, LIMITS, d80dLimit } from '../math/tax.js'
import { confidenceFromBands } from '../../lib/stats.js'
import Lab from './Lab.jsx'

const reg = (b) => (b === 'old' ? 'Old regime' : 'New regime')

export default {
  id: 'tax',
  currencyLock: 'INR',
  lockReason: 'Indian income-tax rules (FY 2026-27)',
  flagship: { label: 'Deduction Optimizer', component: Lab },

  fields: [
    { key: 'gross', label: 'Annual salary (gross)', kind: 'money', min: 300000, max: 100000000, step: 50000, def: 1500000, log: true, group: 'main', sens: { rel: 0.15 } },
    { key: 'otherIncome', label: 'Other income (interest, rent)', kind: 'money', min: 0, max: 20000000, step: 10000, def: 0, group: 'main' },
    { key: 'age', label: 'Your age group', kind: 'select', def: 0, group: 'main', options: [{ value: 0, label: 'Below 60' }, { value: 1, label: '60 to 79' }, { value: 2, label: '80 or above' }] },
    { key: 'basicPct', label: 'Basic pay (% of gross)', kind: 'pct', min: 20, max: 80, step: 5, def: 50, group: 'main' },
    { key: 'hra', label: 'HRA received (yearly)', kind: 'money', min: 0, max: 5000000, step: 10000, def: 330000, group: 'main' },
    { key: 'rent', label: 'Rent you pay (yearly)', kind: 'money', min: 0, max: 5000000, step: 10000, def: 540000, group: 'main', sens: { rel: 0.2 } },
    { key: 'metro', label: 'City', kind: 'select', def: 1, group: 'main', options: [{ value: 1, label: 'Delhi, Mumbai, Kolkata, Chennai (50%)' }, { value: 0, label: 'Other city (40%)' }] },
    { key: 'd80c', label: '80C invested (limit 1.5L)', kind: 'money', min: 0, max: 300000, step: 5000, def: 150000, group: 'main', sens: { rel: 0.4 } },
    { key: 'nps', label: 'NPS own, 80CCD(1B) (limit 50k)', kind: 'money', min: 0, max: 200000, step: 5000, def: 50000, group: 'main' },
    { key: 'd80d', label: 'Health insurance, 80D', kind: 'money', min: 0, max: 100000, step: 1000, def: 25000, group: 'main' },
    { key: 'homeInt', label: 'Home-loan interest, 24(b) (limit 2L)', kind: 'money', min: 0, max: 1000000, step: 10000, def: 0, group: 'advanced' },
    { key: 'empNps', label: 'Employer NPS, 80CCD(2)', kind: 'money', min: 0, max: 1000000, step: 5000, def: 0, group: 'advanced' },
    { key: 'years', label: 'Look ahead', kind: 'years', min: 1, max: 20, step: 1, def: 10, group: 'advanced' },
    { key: 'growth', label: 'Yearly pay growth', kind: 'pct', min: 0, max: 20, step: 0.5, def: 8, group: 'advanced' },
    { key: 'gvol', label: 'Pay-growth volatility', kind: 'pct', min: 0, max: 15, step: 0.5, def: 4, group: 'advanced' }
  ],

  compute(v) { return { ...compareRegimes(v), sugg: suggestions(v), path: growthPath(v), toWin: extraDeductionsToWin(v) } },
  simulate: (v) => simulateTax(v),
  analyze: () => ({}),

  hero(ctx) {
    const { v, model, mc, f } = ctx
    return {
      label: `${reg(model.best)} saves you`, value: f.money(model.saving), raw: model.saving,
      sub: `Tax ${f.money(model.tax)} a year · effective rate ${(model.effective * 100).toFixed(1)}% · take-home ${f.money(model.takeHome)} a month`,
      stats: [
        { label: 'New regime tax', value: f.money(model.taxNew), tone: model.best === 'new' ? 'good' : '' },
        { label: 'Old regime tax', value: f.money(model.taxOld), tone: model.best === 'old' ? 'good' : '' },
        { label: 'Old-regime deductions', value: f.money(model.totalOldDed) },
        { label: 'Unused deduction room', value: f.money(model.sugg.reduce((s, x) => s + x.room, 0)) }
      ],
      gauge: { value: mc.successProb, label: 'Chance the old regime wins this year' }
    }
  },

  insights(ctx) {
    const { v, model, mc, f } = ctx
    const b = []
    const p = Math.round(mc.successProb * 100)
    b.push({ tone: 'good', text: `${reg(model.best)} is cheaper by ${f.money(model.saving)} a year. Old: ${f.money(model.taxOld)} vs new: ${f.money(model.taxNew)}.` })
    if (model.best === 'new' && model.toWin != null && model.toWin > 0) b.push({ tone: 'tip', text: `The old regime would win if you claimed ${f.money(model.toWin)} more in deductions (HRA, 80C, NPS, 80D, home-loan interest).` })
    const top = model.sugg[0]
    if (top) b.push({ tone: 'tip', text: `Best unused deduction: ${top.label}, worth ${f.money(top.saved)} of tax in the old regime for ${f.money(top.room)} more invested.` })
    b.push({ tone: 'info', text: `Allowing for a ±8% pay swing, the old regime wins in ${p}% of simulated futures. Pay growth later pushes more income into higher slabs.` })
    b.push({ tone: 'warn', text: 'Estimates only. Capital gains, special-rate income and other deductions are not modelled, so check with a tax professional before filing.' })
    return {
      headline: `On ${f.money(v.gross + v.otherIncome)} of income the ${model.best} regime is better: you would pay ${f.money(model.tax)} instead of ${f.money(Math.max(model.taxOld, model.taxNew))}. That is ${f.money(model.saving)} saved, and about ${(model.effective * 100).toFixed(1)}% of income as tax. In ${v.years} years, at ${v.growth}% pay growth, the likely yearly tax is ${f.money(mc.p50)} (range ${f.money(mc.p5)} to ${f.money(mc.p95)}).`,
      bullets: b, confidence: confidenceFromBands(mc.p5, mc.p50, mc.p95),
      facts: { calculator: 'Income tax (India)', best: model.best, taxOld: model.taxOld, taxNew: model.taxNew, saving: model.saving, probabilityOldWins: mc.successProb }
    }
  },

  cone(ctx) {
    const { v, mc, model, f } = ctx
    return {
      title: `Your yearly tax over the next ${v.years} years (best regime)`, xName: 'Year', xFmt: (x) => `Year ${x}`,
      rows: mc.labels.map((x, i) => ({ x, p5: mc.bands.p5[i], p25: mc.bands.p25[i], p50: mc.bands.p50[i], p75: mc.bands.p75[i], p95: mc.bands.p95[i], oldOnly: model.path[i]?.taxOld, newOnly: model.path[i]?.taxNew })),
      lines: [{ key: 'oldOnly', label: 'Old regime only', color: 'var(--amber)', dash: '5 3' }, { key: 'newOnly', label: 'New regime only', color: 'var(--violet)', dash: '2 3' }],
      legend: { best: 'High pay growth (95th pct)', likely: 'Likely (median)', worst: 'Low pay growth (5th pct)' },
      successLabel: 'chance the old regime wins this year', endpoints: { best: mc.p95, likely: mc.p50, worst: mc.p5, atLabel: `in year ${v.years}` },
      histTitle: `Yearly tax in year ${v.years} (all 5,000 futures)`
    }
  },

  sensitivity: { metric: 'yearly tax', outcome: (v) => compareRegimes(v).tax, higherIsBetter: false, format: (n, f) => f.money(n) },

  timeline(ctx) {
    const { model, f } = ctx
    return {
      xName: 'Year', xFmt: (x) => `Year ${x}`, rows: model.path.map((r) => ({ x: r.year, old: r.taxOld, new: r.taxNew, best: r.best, gross: r.gross })),
      series: [{ key: 'old', label: 'Old regime', color: 'var(--amber)' }, { key: 'new', label: 'New regime', color: 'var(--violet)' }],
      caption: (r) => `Year ${r.x} (income ${f.money(r.gross)}): old ${f.money(r.old)}, new ${f.money(r.new)}. The ${r.best} regime is cheaper.`
    }
  },

  regret(ctx) {
    const { v, model, f } = ctx
    const bars = model.sugg.slice(0, 4).map((s) => ({ label: `Skip ${s.label.split(',')[0].toLowerCase()}`, cost: model.best === 'old' ? s.saved : 0, note: model.best === 'old' ? `Leaves ${f.money(s.saved)} of tax on the table` : 'Only matters if you pick the old regime' }))
    return { headline: model.best === 'old' ? `Unused deductions cost you ${f.money(model.sugg.reduce((s, x) => s + x.saved, 0))} a year` : 'Under the new regime, deduction room does not matter', sub: 'Tax you would save with the old regime by using each remaining limit.', bars, optimal: { title: 'Versus the optimal move', gap: Math.abs(model.taxOld - model.taxNew) * (model.best === 'old' ? 0 : 0), text: `Choosing the ${model.best} regime already gives your lowest tax.` } }
  },

  reverse: {
    modes: [
      { id: 'win', label: 'Deductions for old to win', target: { key: 'target', label: 'Extra saving wanted (₹ a year)', kind: 'money', min: 0, max: 500000, step: 1000, def: 0 }, solve(v, t, f) { const x = extraDeductionsToWin(v, t); return x == null ? { answer: { label: 'Extra deductions', value: 'Not possible' }, patch: null, text: 'Even with every rupee deducted the old regime does not win by that margin.' } : { answer: { label: `Extra deductions needed${t ? ` to save ${f.money(t)}` : ''}`, value: f.money(x) }, patch: null, text: x === 0 ? 'The old regime already wins by that margin.' : `Claim another ${f.money(x)} in old-regime deductions (HRA, 80C, NPS, 80D, home-loan interest) and the old regime beats the new by ${f.money(t)}.` } } },
      { id: 'tie', label: 'Income where they tie', target: { key: 'target', label: 'Total old-regime deductions (₹)', kind: 'money', min: 100000, max: 2000000, step: 10000, def: 500000 }, solve(v, t, f) { const g = tieIncome(v, t); return g == null ? { answer: { label: 'Tie income', value: 'None found' }, patch: null, text: 'The regimes never tie up to ₹2 crore with these deductions.' } : { answer: { label: `Regimes tie near`, value: f.money(g) }, patch: { gross: g }, text: `With ${f.money(t)} of old-regime deductions both regimes cost the same near ${f.money(g)} of income. Below it the old regime tends to win, above it the new one does (or the reverse, depending on slabs).` } } }
    ]
  },

  compare: {
    preset: (v) => ({ d80c: LIMITS.c80, nps: LIMITS.nps, d80d: Math.max(v.d80d, d80dLimit(v)) }),
    rows: [
      { label: 'Best-regime tax', get: (c) => c.model.tax, fmt: (n, f) => f.money(n), better: 'low', headline: true },
      { label: 'Old regime tax', get: (c) => c.model.taxOld, fmt: (n, f) => f.money(n), better: 'low' },
      { label: 'New regime tax', get: (c) => c.model.taxNew, fmt: (n, f) => f.money(n), better: 'low' },
      { label: 'Chance old regime wins', get: (c) => c.mc.successProb * 100, fmt: (n) => `${Math.round(n)}%`, better: 'high', prob: true },
      { label: 'Monthly take-home', get: (c) => c.model.takeHome, fmt: (n, f) => f.money(n), better: 'high' }
    ]
  },

  share(ctx) {
    const { model, mc, f } = ctx
    return {
      title: 'Old vs new tax regime', bigLabel: `${reg(model.best)} saves me`, big: f.money(model.saving),
      lines: [`Old ${f.money(model.taxOld)} · New ${f.money(model.taxNew)}`, `Effective rate ${(model.effective * 100).toFixed(1)}%`, `${Math.round(mc.successProb * 100)}% chance the old regime wins`],
      chart: { p5: mc.bands.p5, p50: mc.bands.p50, p95: mc.bands.p95 }, chartLabel: 'Yearly tax outlook, 5,000 futures'
    }
  }
}
