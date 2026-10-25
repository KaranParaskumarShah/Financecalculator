import React, { useEffect, useState } from 'react'
import { clampField, fieldText } from '../../calculators/fields.js'
import { CURRENCIES } from '../../lib/format.js'
import { useCurrency } from '../../lib/currency.jsx'

const useLog = (f) => f.log && f.min > 0

const toPos = (f, v) => {
  const x = Math.min(f.max, Math.max(f.min, v))
  return useLog(f) ? (Math.log(x) - Math.log(f.min)) / (Math.log(f.max) - Math.log(f.min)) : (x - f.min) / (f.max - f.min)
}

const snap = (f, v) => {
  let x = v
  if (useLog(f)) {
    // keep ~2 significant digits on a log slider so values look human
    const mag = Math.pow(10, Math.floor(Math.log10(x)) - 1)
    x = Math.round(x / mag) * mag
  }
  x = Math.round(x / f.step) * f.step
  return clampField(f, +x.toFixed(6))
}

const fromPos = (f, t) => {
  const raw = useLog(f) ? Math.exp(Math.log(f.min) + t * (Math.log(f.max) - Math.log(f.min))) : f.min + t * (f.max - f.min)
  return snap(f, raw)
}

const unitOf = (f, sym) => (f.unit ? (f.unit === 'months' ? 'mo' : f.unit) : f.kind === 'money' ? sym : f.kind === 'pct' ? '%' : f.kind === 'years' ? 'yrs' : f.kind === 'age' ? 'yrs' : '')

/** Number box: edits freely, commits on blur / Enter. */
export function NumberBox({ f, value, onChange, id, compact }) {
  const { cur } = useCurrency()
  const sym = CURRENCIES[cur].symbol.trim()
  const [text, setText] = useState(String(value))
  const [focus, setFocus] = useState(false)
  useEffect(() => { if (!focus) setText(String(+Number(value).toFixed(4))) }, [value, focus])
  const commit = () => {
    const n = parseFloat(text.replace(/,/g, ''))
    if (Number.isFinite(n)) onChange(Math.min(f.max * 10, Math.max(f.min, n)))
    else setText(String(value))
    setFocus(false)
  }
  const unit = unitOf(f, sym)
  return (
    <span className={`numbox ${compact ? 'compact' : ''}`}>
      {f.kind === 'money' && <i>{unit}</i>}
      <input
        id={id}
        inputMode="decimal"
        value={focus ? text : f.kind === 'money' ? new Intl.NumberFormat(CURRENCIES[cur].locale, { maximumFractionDigits: 2 }).format(value) : text}
        onFocus={(e) => { setFocus(true); setText(String(value)); e.target.select() }}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
        aria-label={f.label}
      />
      {f.kind !== 'money' && unit && <i>{unit}</i>}
    </span>
  )
}

export default function Field({ f, value, onChange }) {
  const { fmt } = useCurrency()
  if (f.kind === 'text')
    return (
      <div className="field">
        <label htmlFor={`fld-${f.key}`}>{f.label}</label>
        <textarea id={`fld-${f.key}`} className="textbox" rows={f.rows || 7} value={value} spellCheck={false} onChange={(e) => onChange(e.target.value)} placeholder={f.placeholder} />
        {f.hint && <div className="field-sub"><span className="hint">{f.hint}</span></div>}
      </div>
    )
  if (f.kind === 'select')
    return (
      <div className="field">
        <div className="field-top"><label htmlFor={`fld-${f.key}`}>{f.label}</label>
          <select id={`fld-${f.key}`} className="selectbox" value={value} onChange={(e) => onChange(+e.target.value)}>
            {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select></div>
        {f.hint && <div className="field-sub"><span className="hint">{f.hint}</span></div>}
      </div>
    )
  const id = `fld-${f.key}`
  const pos = toPos(f, value)
  return (
    <div className="field">
      <div className="field-top">
        <label htmlFor={id}>{f.label}</label>
        <NumberBox f={f} value={value} onChange={onChange} id={id} />
      </div>
      <input
        className="range"
        type="range"
        min={0}
        max={1000}
        step={1}
        value={Math.round(pos * 1000)}
        onChange={(e) => onChange(fromPos(f, +e.target.value / 1000))}
        style={{ '--p': `${pos * 100}%` }}
        aria-label={`${f.label} slider`}
        aria-valuetext={fieldText(f, value, fmt)}
      />
      <div className="field-sub">
        <span>{f.kind === 'money' ? `= ${fmt.money(value)}` : fieldText(f, value, fmt)}</span>
        {f.hint && <span className="hint">{f.hint}</span>}
      </div>
    </div>
  )
}
