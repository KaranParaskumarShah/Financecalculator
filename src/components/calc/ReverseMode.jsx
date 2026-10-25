import React, { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { ArrowLeftRight, Check, Wand2 } from 'lucide-react'
import { NumberBox } from './Field.jsx'
import { resolveField } from '../../calculators/fields.js'

export default function ReverseMode({ config, v, f, profile, onApply, initial }) {
  const modes = config.reverse.modes
  const startMode = modes.find((m) => m.id === initial?.mode) || modes[0]
  const [modeId, setModeId] = useState(startMode.id)
  const mode = modes.find((m) => m.id === modeId)
  const field = useMemo(() => resolveField(mode.target, profile), [mode, profile])
  const [targets, setTargets] = useState(() => (initial ? { [startMode.id]: initial.target } : {}))
  const target = targets[modeId] ?? field.def
  const [applied, setApplied] = useState(false)

  const dv = useDeferredValue(v)
  const dt = useDeferredValue(target)
  const res = useMemo(() => mode.solve(dv, dt, f), [mode, dv, dt, f.cur])

  useEffect(() => setApplied(false), [modeId, target])

  const apply = () => {
    if (!res.patch) return
    onApply(res.patch)
    setApplied(true)
  }

  return (
    <section className="reverse">
      <header className="sec-head"><h3><ArrowLeftRight size={17} /> Reverse mode</h3></header>
      <p className="lead">Tell the calculator the goal. It solves for what you need to do.</p>
      <div className="seg" role="tablist">
        {modes.map((m) => (
          <button key={m.id} role="tab" aria-selected={m.id === modeId} className={m.id === modeId ? 'on' : ''} onClick={() => setModeId(m.id)}>{m.label}</button>
        ))}
      </div>
      <div className="rev-target">
        <label>{field.label}</label>
        <NumberBox f={field} value={target} onChange={(x) => setTargets((t) => ({ ...t, [modeId]: x }))} />
        {field.kind === 'money' && <span className="tiny">= {f.money(target)}</span>}
      </div>
      <div className="rev-answer glass-in">
        <span>{res.answer.label}</span>
        <b>{res.answer.value}</b>
        <p>{res.text}</p>
        {res.patch && (
          <button className={`btn-primary ${applied ? 'done' : ''}`} onClick={apply}>
            {applied ? <><Check size={15} /> Applied to your plan</> : <><Wand2 size={15} /> Apply to my plan</>}
          </button>
        )}
      </div>
    </section>
  )
}
