// Field specs are written for the INR profile; `profiles.usd` overrides apply to every
// other currency. Money fields therefore get sensible ranges in every currency.

export const resolveField = (f, profile) => ({ ...f, ...(f.profiles?.[profile] || {}) })
export const resolveFields = (config, profile) => config.fields.map((f) => resolveField(f, profile))

export const defaultsFor = (config, profile) =>
  Object.fromEntries(resolveFields(config, profile).map((f) => [f.key, f.def]))

export function fieldText(f, value, fmt) {
  switch (f.kind) {
    case 'money': return fmt.money(value)
    case 'pct': return `${Number(value).toFixed(f.step < 1 ? (f.step < 0.1 ? 2 : 1) : 0)}%`
    case 'years': return f.unit === 'months' ? `${value} ${value === 1 ? 'month' : 'months'}` : `${value} ${value === 1 ? 'yr' : 'yrs'}`
    case 'age': return `${value}`
    case 'text': return String(value).slice(0, 40)
    default: return String(value)
  }
}

export const clampField = (f, x) => Math.min(f.max, Math.max(f.min, x))

/** Merge a partial patch (e.g. from the NL bar or a URL) over defaults, clamping to ranges. */
export function mergeValues(config, profile, patch = {}) {
  const base = defaultsFor(config, profile)
  const fs = Object.fromEntries(resolveFields(config, profile).map((f) => [f.key, f]))
  for (const [k, v] of Object.entries(patch)) {
    if (!(k in base)) continue
    if (fs[k].kind === 'text') { base[k] = String(v).slice(0, 4000); continue }
    if (!Number.isFinite(+v)) continue
    if (fs[k].kind === 'select') { base[k] = +v; continue }
    // widen the range instead of clamping silently when a user types a big number
    base[k] = Math.min(fs[k].max * 1000, Math.max(fs[k].min, +v))
  }
  return base
}
