import { baseLoan, amortize, strategies, simulatePrepayVsInvest, simulateRates, emiFor, loanFor } from '../math/emi.js'
import { confidenceFromBands } from '../../lib/stats.js'
import DebtDestroyer from './DebtDestroyer.jsx'
import { prepayVerdict } from './verdict.js'

const usd = (o) => ({ usd: o })

export default {
  id: 'emi',
  flagship: { label: 'Debt Destroyer', component: DebtDestroyer },

  fields: [
    { key: 'principal', label: 'Loan amount', kind: 'money', min: 100000, max: 500000000, step: 50000, def: 5000000, log: true, group: 'main', sens: { rel: 0.2 }, profiles: usd({ min: 5000, max: 5000000, step: 5000, def: 300000 }) },
    { key: 'rate', label: 'Interest rate (p.a.)', kind: 'pct', min: 1, max: 25, step: 0.05, def: 8.75, group: 'main', sens: { abs: 1 }, profiles: usd({ def: 6.5 }) },
    { key: 'years', label: 'Loan tenure', kind: 'years', min: 1, max: 40, step: 1, def: 20, group: 'main', sens: { abs: 5 } },
    { key: 'extra', label: 'Extra payment / month', kind: 'money', min: 0, max: 500000, step: 500, def: 5000, group: 'main', sens: { rel: 0.5 }, hint: 'Goes straight to principal', profiles: usd({ max: 10000, step: 25, def: 200 }) },
    { key: 'investReturn', label: 'Alternative investment return', kind: 'pct', min: 1, max: 25, step: 0.5, def: 12, group: 'advanced', hint: 'Used for the prepay-or-invest verdict', profiles: usd({ def: 8 }) },
    { key: 'volatility', label: 'Investment volatility', kind: 'pct', min: 3, max: 40, step: 1, def: 16, group: 'advanced', profiles: usd({ def: 15 }) },
    { key: 'rateVol', label: 'Rate drift (floating loan)', kind: 'pct', min: 0, max: 3, step: 0.1, def: 0.5, group: 'advanced', hint: 'Yearly wobble in your interest rate, in points' }
  ],

  compute(v) {
    const { N, emi, base, mine } = baseLoan(v)
    return {
      N, emi, base, mine,
      interestPct: (base.totalInterest / v.principal) * 100,
      year1InterestShare: base.yearly[0] ? base.yearly[0].interest / (emi * 12) : 0,
      monthsSaved: base.months - mine.months,
      interestSaved: base.totalInterest - mine.totalInterest
    }
  },

  simulate: (v) => simulateRates(v),

  analyze(v, model) {
    const s = strategies(v)
    const p = simulatePrepayVsInvest(v)
    return { s, p, eight: s.rows.find((r) => r.id === 'eight'), verdict: null }
  },

  hero(ctx) {
    const { v, model, mc, f } = ctx
    return {
      label: 'Monthly EMI',
      value: f.money(model.emi),
      raw: model.emi,
      sub: v.extra > 0 ? `With ${f.money(v.extra)} extra you pay ${f.money(model.emi + v.extra)} a month` : 'Fixed for the life of the loan',
      stats: [
        { label: 'Total interest', value: f.money(model.base.totalInterest), tone: 'bad' },
        { label: 'Total payment', value: f.money(model.base.totalPaid) },
        { label: 'Debt-free in', value: f.duration(model.mine.months) },
        { label: 'Interest saved', value: f.money(model.interestSaved), tone: 'good' }
      ],
      gauge: { value: mc.successProb, label: `Chance you’re debt-free within ${v.years} years` }
    }
  },

  insights(ctx) {
    const { v, model, mc, an, f } = ctx
    const bullets = []
    const e8 = an.eight
    if (e8) bullets.push({ tone: 'tip', text: `Paying 8% extra (${f.money(model.emi * 0.08)}) every month saves you ${f.duration(e8.monthsSaved)} and ${f.money(e8.interestSaved)} in interest.` })
    const best = an.s.best
    if (best) bullets.push({ tone: 'tip', text: `Fastest path to freedom: “${best.label}” — debt-free ${f.duration(best.monthsSaved)} sooner, ${f.money(best.interestSaved)} less interest.` })
    const verdict = prepayVerdict(an.p, v, f)
    bullets.push({ tone: verdict.tone, text: `Prepay or invest? ${verdict.text}` })
    bullets.push({ tone: 'warn', text: `In year one, ${Math.round(model.year1InterestShare * 100)}% of every EMI is interest. That is why early prepayment is so powerful.` })
    bullets.push({ tone: 'info', text: `If your rate drifts (±${v.rateVol} points a year), total interest is likely ${f.money(mc.p50)} and could reach ${f.money(mc.p95)} in a bad stretch.` })
    return {
      headline:
        `A ${f.money(v.principal)} loan at ${v.rate}% for ${v.years} years means an EMI of ${f.money(model.emi)}. Over the full term you pay ${f.money(model.base.totalInterest)} in interest — ${Math.round(model.interestPct)}% on top of what you borrowed. ` +
        (v.extra > 0
          ? `Adding ${f.money(v.extra)} a month clears the loan in ${f.duration(model.mine.months)} and keeps ${f.money(model.interestSaved)} in your pocket.`
          : 'Even a small monthly extra payment changes this dramatically — try it on the left.'),
      bullets,
      confidence: confidenceFromBands(mc.p5, mc.p50, mc.p95),
      facts: { calculator: 'EMI', principal: v.principal, rate: v.rate, years: v.years, emi: model.emi, totalInterest: model.base.totalInterest, extra: v.extra, monthsWithExtra: model.mine.months, interestSaved: model.interestSaved, probOnSchedule: mc.successProb }
    }
  },

  cone(ctx) {
    const { v, mc, f } = ctx
    return {
      title: 'Loan balance — 5,000 floating-rate futures',
      xName: 'Year',
      xFmt: (x) => `Yr ${x}`,
      rows: mc.labels.map((x, i) => ({ x, p5: mc.bands.p5[i], p25: mc.bands.p25[i], p50: mc.bands.p50[i], p75: mc.bands.p75[i], p95: mc.bands.p95[i] })),
      lines: [],
      legend: { best: 'Slow payoff (95th pct)', likely: 'Likely (median)', worst: 'Fast payoff (5th pct)' },
      successLabel: `chance of being debt-free within ${v.years} years`,
      histTitle: 'Total interest you could end up paying (all 5,000 futures)',
      endpoints: null,
      note: `Total interest: likely ${f.money(mc.p50)}, range ${f.money(mc.p5)} – ${f.money(mc.p95)}`
    }
  },

  sensitivity: { metric: 'total interest', outcome: (v) => baseLoan(v).mine.totalInterest, higherIsBetter: false, format: (n, f) => f.money(n) },

  timeline(ctx) {
    const { model, v, f } = ctx
    const rows = [{ x: 0, balance: v.principal, interest: 0, principal: 0 }].concat(
      model.mine.yearly.map((y) => ({ x: y.year, balance: y.balance, interest: y.cumInterest, principal: y.cumPrincipal }))
    )
    return {
      xName: 'Year', xFmt: (x) => `Year ${x}`, rows,
      series: [
        { key: 'balance', label: 'Still owed', color: 'var(--violet)' },
        { key: 'principal', label: 'Principal repaid (equity)', color: 'var(--cyan)' },
        { key: 'interest', label: 'Interest paid so far', color: 'var(--rose)' }
      ],
      caption: (row) =>
        row.x === 0
          ? `Day one: you owe ${f.money(v.principal)}.`
          : `Year ${row.x}: you have repaid ${f.money(row.principal)} but paid ${f.money(row.interest)} in interest. You still owe ${f.money(row.balance)}.`
    }
  },

  regret(ctx) {
    const { v, model, an, f } = ctx
    const emi = model.emi
    const X = v.extra > 0 ? v.extra : emi * 0.08
    const now = amortize({ principal: v.principal, rate: v.rate, emi, extra: X })
    const bars = [1, 2, 3, 5].filter((d) => d * 12 < model.N).map((d) => {
      const late = amortize({ principal: v.principal, rate: v.rate, emi, extra: X, delayExtra: d * 12 })
      return { label: `Start prepaying in ${d} yr${d > 1 ? 's' : ''}`, cost: late.totalInterest - now.totalInterest, note: `${f.duration(late.months - now.months)} longer in debt` }
    })
    const front = an.s.rows.find((r) => r.id === 'front')
    const steady = an.s.rows.find((r) => r.id === 'steady')
    return {
      headline: bars[0] ? `Waiting 1 year to prepay costs you ${f.money(bars[0].cost)}` : 'Start prepaying now',
      sub: `Based on ${f.money(X)} extra every month${v.extra > 0 ? '' : ' (8% of your EMI)'}.`,
      bars,
      optimal: {
        title: 'Versus the optimal move',
        gap: front && steady ? Math.max(0, front.interestSaved - steady.interestSaved) : 0,
        text: front && steady && front.interestSaved > steady.interestSaved
          ? `If you could pay the same total cash upfront instead of drip-feeding it, you would save a further ${f.money(front.interestSaved - steady.interestSaved)}. Earlier money beats later money.`
          : 'Paying monthly is already close to optimal for your numbers.'
      }
    }
  },

  reverse: {
    modes: [
      {
        id: 'afford', label: 'What can I borrow?', target: { key: 'emi', label: 'EMI I can afford', kind: 'money', min: 1000, max: 2000000, step: 500, def: 40000, log: true, profiles: usd({ min: 100, max: 50000, step: 50, def: 1800 }) },
        solve(v, target, f) {
          const L = loanFor(target, v.rate, Math.round(v.years * 12))
          return { answer: { label: 'Maximum loan', value: f.money(L) }, patch: { principal: Math.max(100000 > L ? 1000 : 100000, Math.round(L / 1000) * 1000) }, text: `An EMI of ${f.money(target)} supports a loan of about ${f.money(L)} at ${v.rate}% over ${v.years} years.` }
        }
      },
      {
        id: 'debtfree', label: 'Debt-free by…', target: { key: 'years', label: 'Debt-free in (years)', kind: 'years', min: 1, max: 40, step: 1, def: 10 },
        solve(v, target, f) {
          const need = emiFor(v.principal, v.rate, Math.round(target * 12))
          const base = emiFor(v.principal, v.rate, Math.round(v.years * 12))
          const extra = Math.max(0, need - base)
          return { answer: { label: 'Extra needed every month', value: f.money(extra) }, patch: { extra: Math.round(extra / 100) * 100 }, text: `To be debt-free in ${target} years instead of ${v.years}, pay ${f.money(extra)} extra every month on top of your ${f.money(base)} EMI (total ${f.money(need)}).` }
        }
      }
    ]
  },

  compare: {
    preset: (v) => ({ extra: Math.round((v.extra > 0 ? v.extra * 2 : emiFor(v.principal, v.rate, v.years * 12) * 0.1) / 100) * 100 }),
    rows: [
      { label: 'Monthly EMI', get: (c) => c.model.emi, fmt: (n, f) => f.money(n), better: 'low' },
      { label: 'Total interest (with extra)', get: (c) => c.model.mine.totalInterest, fmt: (n, f) => f.money(n), better: 'low', headline: true },
      { label: 'Debt-free in', get: (c) => c.model.mine.months, fmt: (n, f) => f.duration(n), better: 'low' },
      { label: 'Interest saved', get: (c) => c.model.interestSaved, fmt: (n, f) => f.money(n), better: 'high' },
      { label: 'Debt-free within tenure', get: (c) => c.mc.successProb * 100, fmt: (n) => `${Math.round(n)}%`, better: 'high', prob: true }
    ]
  },

  share(ctx) {
    const { v, model, mc, an, f } = ctx
    return {
      title: `${f.money(v.principal)} loan · ${v.rate}% · ${v.years} years`,
      bigLabel: 'Monthly EMI',
      big: f.money(model.emi),
      lines: [
        `Total interest ${f.money(model.base.totalInterest)} without prepaying`,
        v.extra > 0 ? `${f.money(v.extra)} extra a month: debt-free ${f.duration(model.monthsSaved)} sooner, ${f.money(model.interestSaved)} saved` : 'A small extra payment could save lakhs',
        `Prepay or invest: ${prepayVerdict(an.p, v, f).tag}`
      ],
      chart: { p5: mc.bands.p5, p50: mc.bands.p50, p95: mc.bands.p95 },
      chartLabel: 'Remaining balance, 5,000 rate paths'
    }
  }
}
