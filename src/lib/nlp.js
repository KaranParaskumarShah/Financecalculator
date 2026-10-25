// Local, rule-based natural-language understanding. Works offline, no API needed.
// "I want to retire at 50 with 2 Cr, I earn 80k/month" -> retirement calculator, pre-filled.

const MULT = {
  k: 1e3, thousand: 1e3,
  l: 1e5, lac: 1e5, lacs: 1e5, lakh: 1e5, lakhs: 1e5,
  cr: 1e7, crore: 1e7, crores: 1e7,
  m: 1e6, mn: 1e6, mil: 1e6, million: 1e6,
  b: 1e9, bn: 1e9, billion: 1e9
}

const AMOUNT_RE = /(₹|rs\.?|inr|\$|usd|€|eur|£|gbp)?\s*(\d[\d,]*(?:\.\d+)?)\s*(thousand|lakhs?|lacs?|crores?|cr|million|mil|mn|billion|bn|k|l|m|b)?(?![\w%])/gi

const toNum = (s) => parseFloat(String(s).replace(/,/g, ''))
const SEP = /[,;.—–]|\s-\s|\bbut\b|\band\b/
// context words on the left/right of a number, cut at the clause boundary
const left = (t, i, n = 34) => {
  const chunk = t.slice(Math.max(0, i - n), i)
  const parts = chunk.split(new RegExp(SEP.source, 'g'))
  return parts[parts.length - 1]
}
const right = (t, i, n = 26) => t.slice(i, i + n).split(SEP)[0]

function detectCurrency(t) {
  if (/₹|\brs\b|\binr\b|lakh|lac\b|lacs\b|crore|\bcr\b|rupee/.test(t)) return 'INR'
  if (/\$|\busd\b|dollar/.test(t)) return 'USD'
  if (/€|\beur\b|euro/.test(t)) return 'EUR'
  if (/£|\bgbp\b|pound/.test(t)) return 'GBP'
  return null
}

function detectIntent(t) {
  const s = { retirement: 0, emi: 0, sip: 0, goal: 0, inflation: 0, compound: 0, rentvsbuy: 0, tax: 0, card: 0, networth: 0, emergency: 0, cagr: 0 }
  if (/retire|retirement|\bfire\b|financial independence|pension|nest egg/.test(t)) s.retirement += 4
  if (/\bemi\b|loan|mortgage|borrow|prepay|debt[- ]free|interest rate/.test(t)) s.emi += 3
  if (/\bsip\b|mutual fund|invest|monthly investment|wealth|corpus|step[- ]?up|compound/.test(t)) s.sip += 2
  if (/how much (do i need )?(to )?(save|invest)/.test(t)) s.sip += 1
  if (/savings? goal|save up|saving for|down ?payment|house fund|fund for|goal of|\bsave\b[^.]*\bin\b\s*\d+\s*(years?|yrs?)|reach [^.]*\bin\b\s*\d+\s*(years?|yrs?)/.test(t)) s.goal += 4
  if (/purchasing power|will be worth|worth in \d+|what will [^.]*(cost|buy)|inflation (impact|effect)|buy(s)? what/.test(t)) s.inflation += 5
  else if (/inflation/.test(t)) s.inflation += 1
  if (/compound|rule of 72|doubl(e|ing)|start(ed)? (\d+ )?years? earlier/.test(t)) s.compound += 4
  if (/\brent(ing|ed)?\b/.test(t) && /(buy|house|home|flat|apartment|property)/.test(t)) s.rentvsbuy += 6
  if (/\btax\b|regime|\b80c\b|\bhra\b|\bitr\b/.test(t)) s.tax += 6
  if (/credit card|card (balance|debt|bill)|minimum (payment|due)|min(imum)? due/.test(t)) s.card += 7
  if (/net ?worth|financial health/.test(t)) s.networth += 6
  if (/emergency fund|runway|without (an )?income|lose my job|job loss|months? of (expenses|cover)|rainy day/.test(t)) s.emergency += 6
  if (/xirr|cagr|my returns?|now worth|currently worth|how much did (my|it)|(invested|put) [^.]*(ago|in \d{4})/.test(t)) s.cagr += 6
  const best = Object.entries(s).sort((a, b) => b[1] - a[1])[0]
  return best[1] > 0 ? best[0] : null
}

export const EXAMPLES = [
  'I want to retire at 50 with 2 Cr, I earn 80k/month',
  'Invest ₹25,000 a month for 15 years at 12%',
  'Home loan 50 lakh at 8.75% for 20 years, can prepay 5k extra',
  'I need 1 crore in 10 years — how much SIP?',
  'Will I reach 50 lakh in 8 years saving 30k a month?',
  'What will 1 crore be worth in 20 years at 6% inflation?',
  'Old vs new tax regime on a 18 lakh salary',
  'Credit card 1.5 lakh at 36%, I can pay 5k extra',
  'I invested 1 lakh 5 years ago, now worth 2 lakh'
]

export function parseIntent(text, defaultCur = 'USD') {
  const raw = (text || '').trim()
  const t = raw.toLowerCase()
  if (!raw) return { ok: false, reason: 'empty' }
  const calc = detectIntent(t)
  const cur = detectCurrency(t)
  if (!calc) return { ok: false, reason: 'intent', currency: cur }

  const used = []
  const claim = (s, e) => used.push([s, e])
  const taken = (s, e) => used.some(([a, b]) => s < b && e > a)
  const p = {} // loose facts
  const notes = []

  const scan = (re, fn) => {
    for (const m of t.matchAll(re)) {
      const s = m.index
      const e = s + m[0].length
      if (taken(s, e)) continue
      if (fn(m, s, e) !== false) claim(s, e)
    }
  }

  // ages
  scan(/retire(?:ment)?\s*(?:at|by|around|when i(?:'m| am)?)?\s*(?:the age of\s*|age\s*)?(\d{2})\b/g, (m) => { p.retireAge = +m[1] })
  scan(/\bfire\s*(?:at|by)\s*(\d{2})\b/g, (m) => { p.retireAge = +m[1] })
  scan(/(?:i am|i'm|im|aged?|currently)\s*(\d{2})\b(?!\s*(?:%|k\b|l\b|cr))/g, (m) => { p.age = +m[1] })
  scan(/\b(\d{2})\s*(?:years?\s*old|yo|y\/o)\b/g, (m) => { p.age = +m[1] })
  scan(/(?:live (?:till|until|to)|till age|until age|life expectancy (?:of )?)\s*(\d{2,3})\b/g, (m) => { p.lifeExp = +m[1] })

  // percentages
  scan(/(\d+(?:\.\d+)?)\s*(?:%|percent|per cent)/g, (m, s) => {
    const ctx = left(t, s, 36) + ' ' + right(t, s + m[0].length, 18)
    const v = +m[1]
    if (/inflation/.test(ctx)) p.inflation = v
    else if (/step[- ]?up|increase.*(year|annual)|raise/.test(ctx)) p.stepUp = v
    else if (/down ?payment|\bdown\b/.test(ctx)) p.down = v
    else if (/vol/.test(ctx)) p.volatility = v
    else p.rate = v
  })

  // durations
  scan(/(\d+(?:\.\d+)?)\s*(years?|yrs?|yr|months?|mos?)\b/g, (m, s) => {
    let v = +m[1]
    if (/^mo/.test(m[2])) v = v / 12
    const ctx = left(t, s, 24)
    if (calc === 'retirement' && /retire\w*\s*in|in\s*$/.test(ctx) && /retire/.test(left(t, s, 40))) p.retireIn = v
    else p.years = v
  })

  // money amounts
  const amounts = []
  for (const m of t.matchAll(AMOUNT_RE)) {
    const s = m.index
    const e = s + m[0].length
    if (taken(s, e)) continue
    let v = toNum(m[2])
    if (!Number.isFinite(v)) continue
    const suf = (m[3] || '').toLowerCase()
    if (suf) v *= MULT[suf] || 1
    const hasMarker = !!(m[1] || suf)
    // bare small numbers with no marker are probably not money (e.g. "5 years" handled above)
    if (!hasMarker && v < 1000) continue
    amounts.push({ v, s, e, L: left(t, s), R: right(t, e) })
  }

  const out = { monthly: [], once: [] }
  for (const a of amounts) {
    const perMonth = /^\s*(?:\/|per|a|every|each|p\.?m\.?)\s*(?:month|mo|mth|m)\b/.test(a.R) || /^\s*(?:monthly|pm|a month|per month)\b/.test(a.R) || /(?:monthly|every month|each month)\s*(?:\w+\s*){0,3}$/.test(a.L)
    ;(perMonth ? out.monthly : out.once).push(a)
  }

  const patch = {}
  let reverse = null
  const say = (s) => notes.push(s)
  const roleOf = (a) => {
    const c = a.L
    const r = a.R
    if (/(earn|income|salary|make|ctc|take[- ]?home|paid)\s*(?:of|is|about|around)?\s*$/.test(c) || /(earn|income|salary)/.test(c + ' ' + r)) return 'income'
    if (/(spend|expense|cost|live on|burn)\s*(?:of|is|about|around)?\s*$/.test(c) || /expens|spending/.test(r)) return 'expense'
    if (/(extra|prepay|prepayment|overpay)/.test(c + ' ' + r)) return 'extra'
    if (/(emi|pay|afford|instal?lment)\s*(?:of|is|upto|up to)?\s*$/.test(c) || /\bemi\b/.test(r)) return 'emi'
    if (/(save|saving|invest|sip|put|contribut)/.test(c) || /(sip|invest)/.test(r)) return 'save'
    if (/(loan|borrow|mortgage|principal|home loan|car loan)\s*(?:of|for|is|worth)?\s*$/.test(c) || /\bloan\b/.test(r)) return 'loan'
    if (/(have|saved|savings of|already|current|portfolio|corpus of|worth)\s*(?:of|is|about)?\s*$/.test(c)) return 'have'
    if (/(want|goal|target|reach|build|achieve|become|need|get|with|corpus|crore|retire.*with)\s*(?:of|is|a|an|about|around|worth)?\s*$/.test(c)) return 'goal'
    return null
  }

  let income = null
  for (const a of out.monthly) {
    const r = roleOf(a)
    if (r === 'income') income = a.v
    else if (r === 'expense') (patch.monthlyExpense = a.v)
    else if (r === 'extra') (patch.extra = a.v)
    else if (r === 'emi') reverse = { mode: 'afford', target: a.v }
    else if (calc === 'sip') patch.monthly = a.v
    else if (calc === 'retirement') patch.monthlySave = a.v
    else if (calc === 'emi') patch.extra = patch.extra ?? a.v
    else if (patch.monthlySave == null) patch.monthlySave = a.v
  }
  for (const a of out.once) {
    const r = roleOf(a)
    if (calc === 'emi') {
      if (r === 'extra') patch.extra = a.v
      else if (r === 'emi') reverse = { mode: 'afford', target: a.v }
      else if (patch.principal == null) patch.principal = a.v
      continue
    }
    if (r === 'have') calc === 'sip' ? (patch.lump = a.v) : (patch.currentCorpus = a.v)
    else if (r === 'save') calc === 'sip' ? (patch.monthly = a.v) : (patch.monthlySave = a.v)
    else if (r === 'goal' || r === null) {
      if (calc === 'sip') patch.goal = a.v
      else if (calc === 'retirement') reverse = reverse || { mode: 'goal', target: a.v }
    }
  }

  // assemble per calculator
  if (calc === 'retirement') {
    if (p.age) patch.age = p.age
    if (p.retireAge) patch.retireAge = p.retireAge
    else if (p.retireIn) patch.retireAge = (patch.age || 32) + Math.round(p.retireIn)
    if (p.lifeExp) patch.lifeExp = p.lifeExp
    if (p.inflation != null) patch.inflation = p.inflation
    if (p.rate != null) patch.preReturn = p.rate
    if (income) {
      if (patch.monthlySave == null) { patch.monthlySave = Math.round(income * 0.3); say(`Assumed you save 30% of income (${Math.round(income * 0.3).toLocaleString()}/month).`) }
      if (patch.monthlyExpense == null) { patch.monthlyExpense = Math.round(income * 0.5); say(`Assumed you spend 50% of income (${Math.round(income * 0.5).toLocaleString()}/month) and plan to keep that lifestyle.`) }
    }
    if (reverse?.mode === 'goal') say(`Treated ${reverse.target.toLocaleString()} as your target corpus, so the Reverse tab solves the monthly saving you need.`)
  } else if (calc === 'sip') {
    if (p.years) patch.years = p.years
    if (p.rate != null) patch.rate = p.rate
    if (p.stepUp != null) patch.stepUp = p.stepUp
    if (p.inflation != null) patch.inflation = p.inflation
    if (p.volatility != null) patch.volatility = p.volatility
    if (patch.goal && patch.monthly == null) {
      reverse = { mode: 'sip', target: patch.goal }
      say('You gave a goal but no SIP amount, so I solved the SIP you need in the Reverse tab.')
    }
    if (patch.goal && patch.monthly != null) say('Used your goal to calculate the probability of reaching it.')
  } else if (calc === 'emi') {
    if (p.years) patch.years = p.years
    if (p.rate != null) patch.rate = p.rate
    if (/debt[- ]?free|pay (?:it )?off|clear (?:the )?loan/.test(t) && p.years) {
      reverse = { mode: 'debtfree', target: p.years }
      delete patch.years
      say(`Solving the extra payment that makes you debt-free in ${p.years} years. Set the loan's own tenure above.`)
    }
  }

  else if (['goal', 'inflation', 'compound', 'rentvsbuy', 'tax', 'card', 'networth', 'emergency', 'cagr'].includes(calc)) {
    const once = out.once.map((a) => ({ ...a, role: roleOf(a) }))
    const mon = out.monthly.map((a) => ({ ...a, role: roleOf(a) }))
    const firstOnce = (pred = () => true) => once.find(pred)
    if (calc === 'goal') {
      const have = firstOnce((a) => a.role === 'have')
      const goal = firstOnce((a) => a !== have)
      if (goal) patch.goal = goal.v
      if (have) patch.saved = have.v
      if (mon[0]) patch.monthly = mon[0].v
      if (p.years) patch.years = p.years
      if (p.rate != null) patch.rate = p.rate
      if (p.inflation != null) patch.inflation = p.inflation
      if (patch.goal && patch.monthly == null) { reverse = { mode: 'monthly', target: 85 }; say('No monthly saving given, so the Reverse tab solves what you need for 85% confidence.') }
      else if (patch.goal) say('Treated the goal as today’s money, adjusted for inflation.')
    } else if (calc === 'inflation') {
      const a = firstOnce()
      if (a) patch.amount = a.v
      if (p.years) patch.years = p.years
      if (p.inflation != null) patch.inflation = p.inflation
      else if (p.rate != null) patch.inflation = p.rate
    } else if (calc === 'compound') {
      const a = firstOnce()
      if (a) patch.principal = a.v
      if (mon[0]) patch.monthly = mon[0].v
      if (p.years) patch.years = p.years
      if (p.rate != null) patch.rate = p.rate
    } else if (calc === 'rentvsbuy') {
      const rentA = mon.find((a) => /rent/.test(a.L + ' ' + a.R)) || mon[0] || once.find((a) => /rent/.test(a.L + ' ' + a.R) && a.v < 1000000)
      const priceA = once.find((a) => a !== rentA)
      if (priceA) patch.price = priceA.v
      if (rentA) patch.rent = rentA.v
      if (p.years) patch.horizon = Math.min(20, Math.round(p.years))
      if (p.down != null) patch.down = p.down
      if (p.rate != null) patch.rate = p.rate
    } else if (calc === 'tax') {
      const m = mon.find((a) => a.role === 'income') || mon[0]
      const o = once.find((a) => a.role === 'income') || once[0]
      if (m) { patch.gross = m.v * 12; say('Converted your monthly figure to an annual salary.') }
      else if (o) { patch.gross = o.v; say('Treated your figure as an annual gross salary.') }
      if (p.age) patch.age = p.age >= 80 ? 2 : p.age >= 60 ? 1 : 0
    } else if (calc === 'card') {
      const bal = firstOnce((a) => a.role === 'loan' || a.role === null || a.role === 'have') || once[0]
      if (bal) patch.balance = bal.v
      if (p.rate != null) patch.apr = p.rate
      const ex = mon.find((a) => a.role === 'extra') || mon[0] || once.find((a) => a.role === 'extra')
      if (ex) patch.extra = ex.v
      if (p.years) patch.targetMonths = Math.round(p.years * 12)
    } else if (calc === 'networth') {
      if (p.age) patch.age = p.age
      const m = mon.find((a) => a.role === 'income') || mon[0]
      if (m) patch.income = m.v
      say('Add your assets and debts in the panel to complete the picture.')
    } else if (calc === 'emergency') {
      const inc = mon.find((a) => a.role === 'income')
      if (inc) patch.income = inc.v
      const ex = mon.find((a) => a.role === 'expense') || mon.find((a) => a !== inc)
      if (ex) patch.essential = ex.v
      const sv = firstOnce((a) => a.role === 'have' || a.role === 'save') || once[0]
      if (sv) patch.savings = sv.v
    } else if (calc === 'cagr') {
      const a = once[0], b = once[1]
      if (a && b && p.years) {
        const now = new Date()
        const d0 = new Date(Date.UTC(now.getUTCFullYear() - Math.floor(p.years), now.getUTCMonth(), Math.min(now.getUTCDate(), 28)))
        const iso = (d) => d.toISOString().slice(0, 10)
        patch.flows = `${iso(d0)}, -${a.v}\n${iso(now)}, ${b.v}`
        say(`Built two cash flows from your sentence: ${a.v.toLocaleString()} invested ${p.years} years ago, now worth ${b.v.toLocaleString()}.`)
      }
    }
  }

  const matched = Object.keys(patch).length + (reverse ? 1 : 0)
  return {
    ok: true,
    calc,
    patch,
    reverse,
    notes,
    currency: cur,
    matched,
    confidence: Math.min(0.98, 0.45 + matched * 0.12)
  }
}
