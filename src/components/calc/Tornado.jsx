import React, { useMemo } from 'react'
import { Crosshair } from 'lucide-react'
import { fieldText } from '../../calculators/fields.js'

export default function Tornado({ config, fields, v, f }) {
  const s = config.sensitivity
  const base = useMemo(() => s.outcome(v), [v])
  const rows = useMemo(() => {
    return fields
      .filter((fl) => fl.sens)
      .map((fl) => {
        const d = fl.sens.rel != null ? Math.max(v[fl.key] * fl.sens.rel, fl.step) : fl.sens.abs
        const lo = Math.max(fl.min, v[fl.key] - d)
        const hi = Math.min(fl.max * 10, v[fl.key] + d)
        const oLo = s.outcome({ ...v, [fl.key]: lo })
        const oHi = s.outcome({ ...v, [fl.key]: hi })
        return { fl, lo, hi, dLo: oLo - base, dHi: oHi - base, swing: Math.abs(oHi - oLo) }
      })
      .sort((a, b) => b.swing - a.swing)
  }, [v])
  const max = Math.max(1e-9, ...rows.map((r) => Math.max(Math.abs(r.dLo), Math.abs(r.dHi))))
  const top = rows[0]
  const good = (d) => (s.higherIsBetter ? d >= 0 : d <= 0)

  return (
    <section className="tornado">
      <header className="sec-head"><h3><Crosshair size={17} /> What would change the outcome most?</h3></header>
      <p className="lead">Each input is nudged down and up while everything else stays put. The longer the bar, the more that input matters to your {s.metric}.</p>
      {top && (
        <div className="callout">
          <b>Biggest lever: {top.fl.label}.</b> Moving it from {fieldText(top.fl, top.lo, f)} to {fieldText(top.fl, top.hi, f)} swings your {s.metric} by {s.format(top.swing, f)}.
        </div>
      )}
      <div className="torn-rows">
        {rows.map((r) => (
          <div key={r.fl.key} className="torn-row">
            <div className="torn-label"><b>{r.fl.label}</b><span>{fieldText(r.fl, r.lo, f)} ⟷ {fieldText(r.fl, r.hi, f)}</span></div>
            <div className="torn-bars" role="img" aria-label={`${r.fl.label}: ${s.format(r.dLo, f)} at the low end, ${s.format(r.dHi, f)} at the high end`}>
              <div className="torn-half left">
                <i className={good(r.dLo) ? 'good' : 'bad'} style={{ width: `${(Math.abs(r.dLo) / max) * 100}%` }} />
                <em>{r.dLo >= 0 ? '+' : '−'}{s.format(Math.abs(r.dLo), f)}</em>
              </div>
              <div className="torn-axis" />
              <div className="torn-half right">
                <i className={good(r.dHi) ? 'good' : 'bad'} style={{ width: `${(Math.abs(r.dHi) / max) * 100}%` }} />
                <em>{r.dHi >= 0 ? '+' : '−'}{s.format(Math.abs(r.dHi), f)}</em>
              </div>
            </div>
          </div>
        ))}
      </div>
      <p className="tiny">Base {s.metric}: {s.format(base, f)}. Left = input lowered, right = input raised. Green helps you, red hurts.</p>
    </section>
  )
}
