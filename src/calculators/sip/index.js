import { sipSchedule, sipFinal, sipFactor, monthsToTarget, missedMonthCosts, stepUpCurve, stepUpForGoal, simulateSip, monthlyRate } from '../math/sip.js'
import { confidenceFromBands } from '../../lib/stats.js'
import SipLab from './SipLab.jsx'

const profileUsd = (o) => ({ usd: o })

export default {
  id: 'sip',
  flagship: { label: 'SIP Lab', component: SipLab },

  fields: [
    { key: 'monthly', label: 'Monthly SIP', kind: 'money', min: 500, max: 500000, step: 500, def: 25000, log: true, group: 'main', sens: { rel: 0.2 }, profiles: profileUsd({ min: 25, max: 25000, step: 25, def: 500 }) },
    { key: 'years', label: 'Investment period', kind: 'years', min: 1, max: 40, step: 1, def: 15, group: 'main', sens: { abs: 3 } },
    { key: 'rate', label: 'Expected return (p.a.)', kind: 'pct', min: 1, max: 30, step: 0.5, def: 12, group: 'main', sens: { abs: 2 }, profiles: profileUsd({ def: 9 }) },
    { key: 'stepUp', label: 'Annual step-up', kind: 'pct', min: 0, max: 30, step: 1, def: 10, group: 'main', sens: { abs: 3 }, hint: 'Raise your SIP by this % every year', profiles: profileUsd({ def: 5 }) },
    { key: 'goal', label: 'Goal corpus', kind: 'money', min: 100000, max: 1000000000, step: 100000, def: 20000000, log: true, group: 'main', profiles: profileUsd({ min: 5000, max: 100000000, step: 5000, def: 250000 }) },
    { key: 'lump', label: 'Starting lump sum', kind: 'money', min: 0, max: 100000000, step: 10000, def: 0, group: 'advanced', sens: { rel: 0.2 }, profiles: profileUsd({ max: 10000000, step: 1000 }) },
    { key: 'inflation', label: 'Inflation', kind: 'pct', min: 0, max: 15, step: 0.5, def: 6, group: 'advanced', profiles: profileUsd({ def: 3 }) },
    { key: 'volatility', label: 'Market volatility', kind: 'pct', min: 3, max: 40, step: 1, def: 15, group: 'advanced', hint: 'Typical equity funds: 12–18%' }
  ],

  compute(v) {
    const s = sipSchedule(v)
    const real = s.final / Math.pow(1 + v.inflation / 100, v.years)
    return { ...s, real, multiple: s.invested > 0 ? s.final / s.invested : 0, monthsToGoal: monthsToTarget({ ...v, target: v.goal }) }
  },

  simulate: (v) => simulateSip(v),

  analyze(v, model, mc) {
    const missed = missedMonthCosts(v)
    const stepCurve = stepUpCurve(v, 25)
    const stepNeeded = v.goal > 0 ? stepUpForGoal(v, v.goal) : null
    const more5 = sipFinal({ ...v, stepUp: Math.min(40, v.stepUp + 5) }) - model.final
    const plus10 = sipFinal({ ...v, monthly: v.monthly * 1.1 }) - model.final
    let monthlyFor80 = null
    if (v.goal > 0 && mc.successProb < 0.8) {
      let lo = v.monthly
      let hi = v.monthly * 5
      const ok = (m) => (simulateSip({ ...v, monthly: m }, { n: 800 }).successProb ?? 0) >= 0.8
      if (ok(hi)) {
        for (let k = 0; k < 11; k++) {
          const mid = (lo + hi) / 2
          if (ok(mid)) hi = mid
          else lo = mid
        }
        monthlyFor80 = hi
      }
    }
    return { missed, stepCurve, stepNeeded, more5, plus10, monthlyFor80 }
  },

  hero(ctx) {
    const { v, model, mc, f } = ctx
    return {
      label: `Projected corpus in ${v.years} years`,
      value: f.money(model.final),
      raw: model.final,
      sub: `Straight-line estimate · likely outcome ${f.money(mc.p50)}`,
      stats: [
        { label: 'You invest', value: f.money(model.invested) },
        { label: 'Wealth gained', value: f.money(model.gain), tone: 'good' },
        { label: 'Growth multiple', value: `${model.multiple.toFixed(1)}×` },
        { label: 'In today’s money', value: f.money(model.real) }
      ],
      gauge: { value: mc.successProb, label: `Chance of reaching ${f.money(v.goal)}` }
    }
  },

  insights(ctx) {
    const { v, model, mc, an, f } = ctx
    const p = Math.round(mc.successProb * 100)
    const bullets = []
    bullets.push({
      tone: p >= 75 ? 'good' : p >= 50 ? 'warn' : 'bad',
      text: `You have a ${p}% chance of reaching ${f.money(v.goal)}.` +
        (an.monthlyFor80 ? ` Raising your SIP to ${f.money(an.monthlyFor80)} (+${Math.round((an.monthlyFor80 / v.monthly - 1) * 100)}%) lifts the odds to 80%.` : p >= 80 ? ' That is a comfortable margin.' : '')
    })
    if (an.more5 > 0)
      bullets.push({ tone: 'tip', text: `Raising your annual step-up by 5 points (to ${v.stepUp + 5}%) adds ${f.money(an.more5)} (+${((an.more5 / model.final) * 100).toFixed(0)}%) to the final corpus.` })
    if (an.stepNeeded != null && an.stepNeeded > v.stepUp)
      bullets.push({ tone: 'tip', text: `A ${an.stepNeeded}% yearly step-up would get a straight-line plan to ${f.money(v.goal)} without changing today’s SIP.` })
    const m1 = an.missed[0]
    if (m1) bullets.push({ tone: 'warn', text: `Missing just the very first SIP costs ${f.money(m1.cost)} at the end — ${(m1.cost / m1.amount).toFixed(1)}× the instalment you skipped.` })
    bullets.push({ tone: 'info', text: `Inflation quietly eats ${Math.round((1 - model.real / model.final) * 100)}% of that corpus: in today’s money it is worth ${f.money(model.real)}.` })
    const loss = Math.round(mc.lossProb * 100)
    bullets.push(
      loss >= 5
        ? { tone: 'warn', text: `${loss}% of simulated futures end below what you put in. ${v.years < 5 ? 'Equity SIPs under 5 years are a gamble — consider debt funds for short goals.' : 'A longer horizon shrinks this risk.'}` }
        : { tone: 'good', text: `Only ${loss}% of simulated futures end below what you invested — time in the market is doing its job.` }
    )
    return {
      headline:
        `Investing ${f.money(v.monthly)} a month${v.stepUp > 0 ? `, stepping it up ${v.stepUp}% every year,` : ''} for ${v.years} years at an expected ${v.rate}% turns ${f.money(model.invested)} of your own money into ${f.money(model.final)} on a straight line. ` +
        `Markets are not straight lines, though: across 5,000 simulated futures the likely result is ${f.money(mc.p50)}, with a realistic range of ${f.money(mc.p5)} to ${f.money(mc.p95)}.`,
      bullets,
      confidence: confidenceFromBands(mc.p5, mc.p50, mc.p95),
      facts: { calculator: 'SIP', monthly: v.monthly, years: v.years, rate: v.rate, invested: model.invested, straightLine: model.final, likely: mc.p50, worst5: mc.p5, best95: mc.p95, goal: v.goal, probGoal: mc.successProb }
    }
  },

  cone(ctx) {
    const { v, mc } = ctx
    return {
      title: 'Wealth cone — 5,000 simulated futures',
      xName: 'Year',
      xFmt: (x) => `Yr ${x}`,
      rows: mc.labels.map((x, i) => ({
        x, p5: mc.bands.p5[i], p25: mc.bands.p25[i], p50: mc.bands.p50[i], p75: mc.bands.p75[i], p95: mc.bands.p95[i],
        det: mc.deterministic[i], inv: mc.invested[i]
      })),
      lines: [{ key: 'inv', label: 'You invested', color: 'var(--violet)', dash: '4 4' }, { key: 'det', label: 'Straight line', color: 'var(--amber)', dash: '2 3' }],
      goal: v.goal,
      goalLabel: 'Goal',
      legend: { best: 'Best case (95th pct)', likely: 'Likely (median)', worst: 'Worst case (5th pct)' },
      successLabel: `chance of reaching ${ctx.f.money(v.goal)}`,
      histTitle: `Where ${v.years}-year outcomes land (all 5,000 futures)`,
      histGoal: v.goal,
      endpoints: { best: mc.p95, likely: mc.p50, worst: mc.p5 }
    }
  },

  sensitivity: { metric: 'final corpus', outcome: (v) => sipFinal(v), higherIsBetter: true, format: (n, f) => f.money(n) },

  timeline(ctx) {
    const { model, mc, v, f } = ctx
    const rows = model.yearly.map((y, i) => ({
      x: y.year, invested: y.invested, balance: y.balance, likely: mc.bands.p50[i],
      real: y.balance / Math.pow(1 + v.inflation / 100, y.year)
    }))
    const cross = rows.find((r) => r.balance - r.invested > r.invested)
    return {
      xName: 'Year', xFmt: (x) => `Year ${x}`,
      rows,
      series: [
        { key: 'invested', label: 'You invested', color: 'var(--violet)' },
        { key: 'balance', label: 'Portfolio (straight line)', color: 'var(--cyan)' },
        { key: 'likely', label: 'Likely outcome', color: 'var(--green)' },
        { key: 'real', label: 'In today’s money', color: 'var(--amber)' }
      ],
      caption: (row) => {
        const share = row.balance > 0 ? Math.round(((row.balance - row.invested) / row.balance) * 100) : 0
        return row.x === 0
          ? 'Day one. Everything is still ahead of you.'
          : `Year ${row.x}: ${f.money(row.invested)} of your money has become ${f.money(row.balance)}. ${share}% of the pot is growth.` +
            (cross ? (row.x >= cross.x ? ` Growth overtook your deposits in year ${cross.x}.` : ` Growth overtakes your deposits in year ${cross.x}.`) : '')
      }
    }
  },

  regret(ctx) {
    const { v, model, f } = ctx
    const bars = [1, 2, 3, 5]
      .filter((d) => d < v.years)
      .map((d) => ({ label: `Wait ${d} year${d > 1 ? 's' : ''}`, cost: model.final - sipFinal({ ...v, years: v.years - d }), note: `Same SIP, same end date, ${d} fewer year${d > 1 ? 's' : ''} invested` }))
    const best = sipFinal({ ...v, stepUp: Math.max(v.stepUp, 10) })
    const perMonth = bars[0] ? bars[0].cost / 12 : 0
    return {
      headline: bars[0] ? `Waiting 1 year costs you ${f.money(bars[0].cost)}` : 'Start now',
      sub: bars[0] ? `Every month of procrastination is worth roughly ${f.money(perMonth)} at the finish line.` : '',
      bars,
      optimal: {
        title: 'Versus the optimal move',
        gap: Math.max(0, best - model.final),
        text: best > model.final
          ? `Starting today with a ${Math.max(v.stepUp, 10)}% yearly step-up would finish ${f.money(best - model.final)} higher than your current plan.`
          : 'You are already starting today with a strong step-up. There is little regret to find here.'
      }
    }
  },

  reverse: {
    modes: [
      {
        id: 'sip', label: 'Required SIP', target: { key: 'goal', label: 'Goal corpus', kind: 'money', min: 100000, max: 1000000000, step: 100000, def: 20000000, log: true, profiles: profileUsd({ min: 5000, max: 100000000, step: 5000, def: 250000 }) },
        solve(v, target, f) {
          const grown = v.lump * Math.pow(1 + v.rate / 100, v.years)
          const need = Math.max(0, (target - grown) / sipFactor(v))
          let p80 = null
          let lo = need
          let hi = need * 3
          const ok = (m) => simulateSip({ ...v, monthly: m, goal: target }, { n: 800 }).successProb >= 0.8
          if (need > 0 && ok(hi)) {
            for (let k = 0; k < 11; k++) { const mid = (lo + hi) / 2; ok(mid) ? (hi = mid) : (lo = mid) }
            p80 = hi
          }
          return {
            answer: { label: 'SIP needed (straight line)', value: f.money(need) },
            patch: { monthly: Math.max(1, Math.round(need / 100) * 100 || Math.round(need)), goal: target },
            text: `To reach ${f.money(target)} in ${v.years} years at ${v.rate}% with a ${v.stepUp}% yearly step-up you need ${f.money(need)} a month on a straight line.` + (p80 ? ` For an 80% chance once market swings are included, plan on ${f.money(p80)} a month.` : '')
          }
        }
      },
      {
        id: 'years', label: 'Years needed', target: { key: 'goal', label: 'Goal corpus', kind: 'money', min: 100000, max: 1000000000, step: 100000, def: 20000000, log: true, profiles: profileUsd({ min: 5000, max: 100000000, step: 5000, def: 250000 }) },
        solve(v, target, f) {
          const m = monthsToTarget({ ...v, target })
          if (m == null) return { answer: { label: 'Years needed', value: '60+ yrs' }, patch: null, text: 'With this SIP the goal is out of reach inside 60 years. Raise the SIP or the step-up.' }
          const y = Math.min(40, Math.ceil(m / 12))
          return {
            answer: { label: 'Time needed', value: `${Math.floor(m / 12)} yrs ${m % 12} mo` },
            patch: { years: y, goal: target },
            text: `At ${f.money(v.monthly)} a month (stepping up ${v.stepUp}%) you reach ${f.money(target)} in about ${Math.floor(m / 12)} years and ${m % 12} months.`
          }
        }
      },
      {
        id: 'stepup', label: 'Step-up needed', target: { key: 'goal', label: 'Goal corpus', kind: 'money', min: 100000, max: 1000000000, step: 100000, def: 20000000, log: true, profiles: profileUsd({ min: 5000, max: 100000000, step: 5000, def: 250000 }) },
        solve(v, target, f) {
          const s = stepUpForGoal(v, target)
          if (s == null) return { answer: { label: 'Step-up needed', value: '40%+' }, patch: null, text: 'Even a 40% yearly step-up will not get there. Increase the starting SIP or the horizon.' }
          return { answer: { label: 'Yearly step-up needed', value: `${s}%` }, patch: { stepUp: Math.min(30, s), goal: target }, text: `Keep today’s ${f.money(v.monthly)} SIP but raise it ${s}% every year to reach ${f.money(target)} on a straight line.` }
        }
      }
    ]
  },

  compare: {
    preset: (v) => ({ stepUp: Math.min(30, v.stepUp + 5) }),
    rows: [
      { label: 'Straight-line corpus', get: (c) => c.model.final, fmt: (n, f) => f.money(n), better: 'high', headline: true },
      { label: 'Likely outcome (median)', get: (c) => c.mc.p50, fmt: (n, f) => f.money(n), better: 'high' },
      { label: 'Worst case (5th pct)', get: (c) => c.mc.p5, fmt: (n, f) => f.money(n), better: 'high', risk: true },
      { label: 'Chance of hitting goal', get: (c) => c.mc.successProb * 100, fmt: (n) => `${Math.round(n)}%`, better: 'high', prob: true },
      { label: 'You invest', get: (c) => c.model.invested, fmt: (n, f) => f.money(n), better: 'low' }
    ]
  },

  share(ctx) {
    const { v, model, mc, f } = ctx
    return {
      title: `SIP plan · ${f.money(v.monthly)}/month for ${v.years} years`,
      bigLabel: 'Likely corpus',
      big: f.money(mc.p50),
      lines: [
        `Realistic range ${f.money(mc.p5)} – ${f.money(mc.p95)}`,
        `${Math.round(mc.successProb * 100)}% chance of reaching ${f.money(v.goal)}`,
        `You invest ${f.money(model.invested)}; growth adds ${f.money(model.gain)} on a straight line`
      ],
      chart: { p5: mc.bands.p5, p50: mc.bands.p50, p95: mc.bands.p95 },
      chartLabel: '5,000 simulated futures'
    }
  }
}
