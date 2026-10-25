// Currency + number formatting. INR uses lakh/crore, everything else uses K/M/B.

export const CURRENCIES = {
  INR: { symbol: '₹', locale: 'en-IN', profile: 'inr', name: 'Indian Rupee' },
  USD: { symbol: '$', locale: 'en-US', profile: 'usd', name: 'US Dollar' },
  EUR: { symbol: '€', locale: 'en-IE', profile: 'usd', name: 'Euro' },
  GBP: { symbol: '£', locale: 'en-GB', profile: 'usd', name: 'British Pound' },
  AED: { symbol: 'AED ', locale: 'en-AE', profile: 'usd', name: 'UAE Dirham' },
  CAD: { symbol: 'C$', locale: 'en-CA', profile: 'usd', name: 'Canadian Dollar' },
  AUD: { symbol: 'A$', locale: 'en-AU', profile: 'usd', name: 'Australian Dollar' },
  SGD: { symbol: 'S$', locale: 'en-SG', profile: 'usd', name: 'Singapore Dollar' }
}

export const profileOf = (cur) => (CURRENCIES[cur] || CURRENCIES.USD).profile

const trim = (n, d = 2) => {
  const s = Number(n).toFixed(d)
  return s.includes('.') ? s.replace(/0+$/, '').replace(/\.$/, '') : s
}

export function money(n, cur = 'USD', { short = true } = {}) {
  const c = CURRENCIES[cur] || CURRENCIES.USD
  if (!Number.isFinite(n)) return `${c.symbol}0`
  const neg = n < 0
  const a = Math.abs(n)
  let body
  if (short && c.profile === 'inr') {
    if (a >= 1e7) body = `${trim(a / 1e7)} Cr`
    else if (a >= 1e5) body = `${trim(a / 1e5)} lakh`
  } else if (short) {
    if (a >= 1e9) body = `${trim(a / 1e9)}B`
    else if (a >= 1e6) body = `${trim(a / 1e6)}M`
  }
  if (!body) body = new Intl.NumberFormat(c.locale, { maximumFractionDigits: a < 100 ? 2 : 0 }).format(a)
  return `${neg ? '−' : ''}${c.symbol}${body}`
}

export const moneyFull = (n, cur = 'USD') => money(n, cur, { short: false })

export const pct = (n, d = 1) => `${trim(Number(n) || 0, d)}%`

export function duration(months) {
  const m = Math.max(0, Math.round(months))
  const y = Math.floor(m / 12)
  const r = m % 12
  if (y === 0) return `${r} mo`
  if (r === 0) return `${y} yr${y > 1 ? 's' : ''}`
  return `${y} yr${y > 1 ? 's' : ''} ${r} mo`
}

export const num = (n, d = 0) =>
  new Intl.NumberFormat('en-US', { maximumFractionDigits: d }).format(Number.isFinite(n) ? n : 0)

export const clamp = (n, a, b) => Math.min(b, Math.max(a, n))

// Make a formatter bundle bound to a currency.
export function makeFmt(cur) {
  return {
    cur,
    money: (n) => money(n, cur),
    full: (n) => moneyFull(n, cur),
    pct,
    duration,
    num
  }
}

// Detect a sensible default currency from timezone / locale.
export function detectCurrency() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''
    const lang = (navigator.language || 'en-US').toLowerCase()
    if (/Kolkata|Calcutta/.test(tz) || lang.endsWith('-in')) return 'INR'
    if (/Dubai/.test(tz) || lang.endsWith('-ae')) return 'AED'
    if (/Singapore/.test(tz) || lang.endsWith('-sg')) return 'SGD'
    if (lang.endsWith('-gb') || /London/.test(tz)) return 'GBP'
    if (lang.endsWith('-ca')) return 'CAD'
    if (lang.endsWith('-au') || /Australia/.test(tz)) return 'AUD'
    if (/^(de|fr|es|it|nl|pt|fi|el|ga)\b/.test(lang) || /Europe\//.test(tz)) return 'EUR'
  } catch {}
  return 'USD'
}
