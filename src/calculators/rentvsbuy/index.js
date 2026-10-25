import { pathBuyRent, advantageAt, breakevenMonth, breakevenRent, breakevenAppreciation, breakevenPrice, sensitivities, anatomy, simulateBuyRent } from '../math/rentvsbuy.js'
import { emiFor } from '../math/emi.js'
import { confidenceFromBands } from '../../lib/stats.js'
import { buyRentVerdict } from './verdict.js'
import BreakevenLab from './Lab.jsx'

const usd = (o) => ({ usd: o })
const STAY = { key: 'horizon', label: 'Years you will stay', kind: 'years', min: 1, max: 20, step: 1, def: 10 }

const yrIdx = (path, y) => Math.min(path.months, y * 12)

export default {
  id: 'rentvsbuy',
  flagship: { label: 'Breakeven Lab', component: BreakevenLab },

  fields: [
    { key: 'price', label: 'Home price', kind: 'money', min: 500000, max: 500000000, step: 100000, def: 10000000, log: true, group: 'main', sens: { rel: 0.2 }, profiles: usd({ min: 50000, max: 5000000, step: 5000, def: 400000 }) },
    { key: 'down', label: 'Down payment', kind: 'pct', min: 5, max: 90, step: 1, def: 20, group: 'main' },
    { key: 'rate', label: 'Loan interest rate', kind: 'pct', min: 1, max: 20, step: 0.05, def: 8.75, group: 'main', sens: { abs: 1.5 }, profiles: usd({ def: 6.5 }) },
    { key: 'tenure', label: 'Loan tenure', kind: 'years', min: 5, max: 30, step: 1, def: 20, group: 'main', profiles: usd({ def: 30 }) },
    { key: 'rent', label: 'Rent today (per month)', kind: 'money', min: 1000, max: 1000000, step: 500, def: 28000, log: true, group: 'main', sens: { rel: 0.2 }, profiles: usd({ min: 200, max: 20000, step: 50, def: 2200 }) },
    { key: 'appreciation', label: 'Home price growth (p.a.)', kind: 'pct', min: -3, max: 15, step: 0.5, def: 6, group: 'main', sens: { abs: 2 }, profiles: usd({ def: 4 }) },
    { key: 'investReturn', label: 'Investment return if you rent', kind: 'pct', min: 1, max: 20, step: 0.5, def: 10, group: 'main', sens: { abs: 2 }, hint: 'Opportunity cost of your money', profiles: usd({ def: 7 }) },
    { key: 'horizon', label: 'Years you will stay', kind: 'years', min: 1, max: 20, step: 1, def: 10, group: 'main', sens: { abs: 3 } },
    { key: 'rentGrowth', label: 'Rent growth (p.a.)', kind: 'pct', min: 0, max: 15, step: 0.5, def: 5, group: 'advanced', sens: { abs: 2 }, profiles: usd({ def: 3.5 }) },
    { key: 'maintenance', label: 'Upkeep + property tax (% of value p.a.)', kind: 'pct', min: 0, max: 5, step: 0.1, def: 1, group: 'advanced', profiles: usd({ def: 1.8 }) },
    { key: 'buyCost', label: 'Buying costs (stamp duty, fees)', kind: 'pct', min: 0, max: 12, step: 0.5, def: 6, group: 'advanced', profiles: usd({ def: 3 }) },
    { key: 'sellCost', label: 'Selling costs', kind: 'pct', min: 0, max: 10, step: 0.5, def: 2, group: 'advanced', profiles: usd({ def: 6 }) },
    { key: 'homeVol', label: 'Home price volatility', kind: 'pct', min: 0, max: 30, step: 1, def: 8, group: 'advanced' },
    { key: 'investVol', label: 'Investment volatility', kind: 'pct', min: 0, max: 40, step: 1, def: 15, group: 'advanced' }
  ],

  compute(v) {
    const months = Math.round(v.horizon * 12)
    const path = pathBuyRent(v, months)
    const adv = path.adv[months]
    const be = breakevenMonth(v)
    return { path, months, adv, be, emi: path.S.emi, loan: path.S.L, anat: anatomy(v, path), buyerNW: path.buyer[months], renterNW: path.renter[months], homeEnd: path.home[months] }
  },

  simulate: (v) => simulateBuyRent(v),

  analyze(v, model, mc) {
    const bApp = breakevenAppreciation(v, model.months)
    const bRent = breakevenRent(v)
    const bPrice = breakevenPrice(v)
    const sens = sensitivities(v)
    return { bApp, bRent, bPrice, sens }
  },

  hero(ctx) {
    const { v, model, mc, f } = ctx
    const buy = model.adv >= 0
    return {
      label: `${buy ? 'Buying' : 'Renting'} is ahead after ${v.horizon} years by`,
      value: f.money(Math.abs(model.adv)),
      raw: Math.abs(model.adv),
      sub: `Straight-line estimate · likely gap ${f.money(Math.abs(mc.p50))} in favour of ${mc.p50 >= 0 ? 'buying' : 'renting'}`,
      stats: [
        { label: 'Breakeven', value: model.be ? `Year ${Math.ceil(model.be / 12)}` : 'Never (30 yrs)', tone: model.be && model.be <= model.months ? 'good' : 'bad' },
        { label: 'Monthly EMI', value: f.money(model.emi) },
        { label: 'Buyer’s net worth', value: f.money(model.buyerNW) },
        { label: 'Renter’s portfolio', value: f.money(model.renterNW) }
      ],
      gauge: { value: mc.successProb, label: `Chance buying beats renting by year ${v.horizon}` }
    }
  },

  insights(ctx) {
    const { v, model, mc, an, f } = ctx
    const verdict = buyRentVerdict({ v, adv: model.adv, mc, be: model.be, bApp: an.bApp, bRent: an.bRent, f })
    const b = []
    b.push({ tone: verdict.tone, text: `${verdict.tag}. ${verdict.text}` })
    b.push({ tone: 'info', text: model.be ? `Straight-line breakeven is year ${Math.ceil(model.be / 12)}. Across simulations the typical breakeven is ${mc.beP50 ? `year ${Math.ceil(mc.beP50 / 12)}` : 'beyond 20 years'}, and in ${Math.round(mc.beNever * 100)}% of futures buying never stays ahead within 20 years.` : `Buying never pulls ahead within 30 years on the straight-line path, and in ${Math.round(mc.beNever * 100)}% of simulated futures it never does within 20.` })
    for (const t of verdict.truths) b.push({ tone: 'tip', text: t })
    const a = model.anat
    b.push({ tone: 'warn', text: `Cost anatomy over ${v.horizon} years: ${f.money(a.interest)} of loan interest, ${f.money(a.maint)} of upkeep and property tax, ${f.money(a.fees)} of buying and selling fees, and ${f.money(a.opp)} of investment growth you give up, against ${f.money(a.rentPaid)} of rent.` })
    if (an.sens[0]) b.push({ tone: 'info', text: `The assumption that matters most is ${an.sens[0].label.toLowerCase()}: moving it from ${an.sens[0].fmt === 'pct' ? an.sens[0].loV.toFixed(1) + '%' : f.money(an.sens[0].loV)} to ${an.sens[0].fmt === 'pct' ? an.sens[0].hiV.toFixed(1) + '%' : f.money(an.sens[0].hiV)} swings the outcome by ${f.money(an.sens[0].swing)}.` })
    return {
      headline: `Buying a ${f.money(v.price)} home with ${v.down}% down at ${v.rate}% means an EMI of ${f.money(model.emi)} versus ${f.money(v.rent)} of rent. The renter invests the down payment, the fees and every month’s saving at ${v.investReturn}%, so the real contest is home equity against a growing portfolio. After ${v.horizon} years the buyer is worth ${f.money(model.buyerNW)} and the renter ${f.money(model.renterNW)}. ${verdict.tag}: buying wins in ${Math.round(mc.successProb * 100)}% of 5,000 simulated futures.`,
      bullets: b,
      confidence: confidenceFromBands(mc.buyerEnd.p5, mc.buyerEnd.p50, mc.buyerEnd.p95),
      facts: { calculator: 'Buy vs rent', price: v.price, rent: v.rent, horizon: v.horizon, advantageStraightLine: model.adv, probBuyWins: mc.successProb, breakevenMonths: model.be }
    }
  },

  cone(ctx) {
    const { v, mc, model, f } = ctx
    const p = model.path
    return {
      title: 'The buyer’s net worth, 5,000 simulated futures',
      xName: 'Year', xFmt: (x) => `Year ${x}`,
      rows: mc.labels.map((x, i) => ({ x, p5: mc.bands.p5[i], p25: mc.bands.p25[i], p50: mc.bands.p50[i], p75: mc.bands.p75[i], p95: mc.bands.p95[i], rent: mc.renterBands.p50[i], det: p.buyer[Math.min(p.months, i * 12)] })),
      lines: [{ key: 'rent', label: 'Renter’s portfolio (median)', color: 'var(--amber)', dash: '5 3' }],
      legend: { best: 'Buyer, best case', likely: 'Buyer, likely', worst: 'Buyer, worst case' },
      successLabel: 'chance buying beats renting',
      endpoints: { best: mc.buyerEnd.p95, likely: mc.buyerEnd.p50, worst: mc.buyerEnd.p5, atLabel: `after ${v.horizon} yrs` },
      note: `Renter’s median portfolio after ${v.horizon} years: ${f.money(mc.renterEnd.p50)}.`,
      histTitle: 'Buyer minus renter at the end (right of zero = buying wins)', histGoal: 0
    }
  },

  sensitivity: { metric: 'buy-vs-rent gap', outcome: (v) => advantageAt(v), higherIsBetter: true, format: (n, f) => f.money(n) },

  timeline(ctx) {
    const { model, v, f } = ctx
    const p = model.path
    const rows = []
    for (let y = 0; y * 12 <= model.months; y++) { const m = y * 12; rows.push({ x: y, buyer: p.buyer[m], renter: p.renter[m], home: p.home[m], loan: p.S.bal[m] }) }
    return {
      xName: 'Year', xFmt: (x) => `Year ${x}`, rows,
      series: [
        { key: 'buyer', label: 'Buyer’s net worth', color: 'var(--cyan)' },
        { key: 'renter', label: 'Renter’s portfolio', color: 'var(--amber)' },
        { key: 'home', label: 'Home value', color: 'var(--green)' },
        { key: 'loan', label: 'Loan outstanding', color: 'var(--rose)' }
      ],
      caption: (r) => `Year ${r.x}: buyer ${f.money(r.buyer)} vs renter ${f.money(r.renter)}. ${r.buyer >= r.renter ? `Buying leads by ${f.money(r.buyer - r.renter)}.` : `Renting leads by ${f.money(r.renter - r.buyer)}.`} The home is worth ${f.money(r.home)} and ${f.money(r.loan)} is still owed.`
    }
  },

  regret(ctx) {
    const { v, model, an, f } = ctx
    const p = model.path
    const bars = [2, 3, 5, 7, 10].filter((y) => y * 12 <= p.months).map((y) => {
      const a = p.adv[y * 12]
      return { label: `Move after ${y} years`, cost: Math.max(0, -a), note: a >= 0 ? `Buying would be ahead by ${f.money(a)}` : `Renting would be ahead by ${f.money(-a)}` }
    })
    return {
      headline: model.adv >= 0 ? `Renting instead would cost you ${f.money(model.adv)}` : `Buying instead would cost you ${f.money(-model.adv)}`,
      sub: `Measured at year ${v.horizon}. The bars show how much buying lags renting if life makes you move earlier.`,
      bars,
      optimal: { title: 'Versus the optimal move', gap: an.bPrice != null && an.bPrice < v.price ? v.price - an.bPrice : 0, text: an.bPrice != null && an.bPrice < v.price ? `Buying breaks even at a price of about ${f.money(an.bPrice)}. Negotiating down ${f.money(v.price - an.bPrice)} turns this into a fair deal.` : model.be ? `Plan to stay at least until year ${Math.ceil(model.be / 12)}; before that renting is cheaper.` : 'On these inputs the price is not the issue: rent is simply cheap relative to what owning costs.' }
    }
  },

  reverse: {
    modes: [
      { id: 'rent', label: 'Rent that breaks even', target: STAY, solve(v, t, f) { const r = breakevenRent({ ...v, horizon: t }); return r == null ? { answer: { label: 'Breakeven rent', value: 'Buying always wins' }, patch: null, text: `Even at a rent of zero, buying is ahead after ${t} years.` } : { answer: { label: 'Rent at which buying = renting', value: f.money(r) }, patch: { horizon: t }, text: `If you stay ${t} years, buying only pays off when you would otherwise pay more than ${f.money(r)} a month in rent (today it is ${f.money(v.rent)}).` } } },
      { id: 'app', label: 'Price growth needed', target: STAY, solve(v, t, f) { const a = breakevenAppreciation({ ...v, horizon: t }, t * 12); return a == null ? { answer: { label: 'Price growth needed', value: '30%+ a year' }, patch: null, text: 'No realistic price growth makes buying break even here.' } : { answer: { label: 'Price growth needed to break even', value: `${a.toFixed(1)}% a year` }, patch: { horizon: t, appreciation: Math.round(a * 2) / 2 }, text: `Staying ${t} years, the home must rise about ${a.toFixed(1)}% a year for buying to match renting (you assumed ${v.appreciation}%).` } } },
      { id: 'price', label: 'Price that breaks even', target: STAY, solve(v, t, f) { const p = breakevenPrice({ ...v, horizon: t }); return p == null ? { answer: { label: 'Break-even price', value: 'None found' }, patch: null, text: 'Buying loses at every price tested against this rent.' } : { answer: { label: 'Highest price that still breaks even', value: f.money(p) }, patch: { horizon: t, price: Math.round(p / 10000) * 10000 }, text: `Staying ${t} years against today’s rent, ${f.money(p)} is the most a home can cost before renting is better.` } } }
    ]
  },

  compare: {
    preset: (v) => ({ price: Math.round((v.price * 0.9) / 10000) * 10000 }),
    rows: [
      { label: 'Buy minus rent at horizon', get: (c) => c.model.adv, fmt: (n, f) => `${n >= 0 ? '' : '−'}${f.money(Math.abs(n))}`, better: 'high', headline: true },
      { label: 'Chance buying wins', get: (c) => c.mc.successProb * 100, fmt: (n) => `${Math.round(n)}%`, better: 'high', prob: true },
      { label: 'Worst case gap (5th pct)', get: (c) => c.mc.p5, fmt: (n, f) => `${n >= 0 ? '' : '−'}${f.money(Math.abs(n))}`, better: 'high', risk: true },
      { label: 'Breakeven month', get: (c) => c.model.be ?? 361, fmt: (n) => (n > 360 ? 'never' : `year ${Math.ceil(n / 12)}`), better: 'low' },
      { label: 'Monthly EMI', get: (c) => c.model.emi, fmt: (n, f) => f.money(n), better: 'low' }
    ]
  },

  share(ctx) {
    const { v, model, mc, f } = ctx
    return {
      title: `Buy vs rent · ${f.money(v.price)} home · ${v.horizon} years`,
      bigLabel: model.adv >= 0 ? 'Buying is ahead by' : 'Renting is ahead by',
      big: f.money(Math.abs(model.adv)),
      lines: [`Buying wins in ${Math.round(mc.successProb * 100)}% of 5,000 simulated futures`, model.be ? `Straight-line breakeven: year ${Math.ceil(model.be / 12)}` : 'Buying never breaks even within 30 years', `EMI ${f.money(model.emi)} vs rent ${f.money(v.rent)}`],
      chart: { p5: mc.bands.p5, p50: mc.bands.p50, p95: mc.bands.p95 }, chartLabel: 'Buyer’s net worth, 5,000 futures'
    }
  }
}
