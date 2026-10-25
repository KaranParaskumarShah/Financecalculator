import React, { useDeferredValue, useMemo, useState } from 'react'
import { Columns2, RotateCcw, Trophy } from 'lucide-react'
import { NumberBox } from './Field.jsx'

function verdictOf(rows, a, b, f) {
  let wa = 0
  let wb = 0
  const lines = rows.map((r) => {
    const va = r.get(a)
    const vb = r.get(b)
    const tie = Math.abs(va - vb) <= Math.max(1e-9, Math.abs(va) * 0.004)
    const bWins = !tie && (r.better === 'high' ? vb > va : vb < va)
    if (!tie) bWins ? wb++ : wa++
    return { r, va, vb, tie, bWins }
  })
  const head = lines.find((l) => l.r.headline) || lines[0]
  const total = lines.filter((l) => !l.tie).length
  let text
  if (wa === wb) text = 'These two scenarios are a close call: each wins on as many measures as it loses.'
  else {
    const w = wb > wa ? 'Scenario B' : 'Your plan'
    text = `${w} comes out ahead on ${Math.max(wa, wb)} of ${total} measures. `
  }
  const hd = head.tie ? '' : `On ${head.r.label.toLowerCase()}, ${head.bWins ? 'B' : 'A'} is better: ${head.r.fmt(head.bWins ? head.vb : head.va, f)} vs ${head.r.fmt(head.bWins ? head.va : head.vb, f)}. `
  const risk = lines.find((l) => l.r.risk && !l.tie)
  const rk = risk ? `On downside risk, ${risk.bWins ? 'B' : 'A'} holds up better (${risk.r.label.toLowerCase()}: ${risk.r.fmt(risk.bWins ? risk.vb : risk.va, f)}). ` : ''
  return { winner: wa === wb ? null : wb > wa ? 'B' : 'A', text: text + hd + rk, lines }
}

export default function CompareMode({ config, fields, v, f, ctxA }) {
  const main = fields.filter((x) => x.group !== 'advanced' && x.kind !== 'text' && x.kind !== 'select')
  const preset = () => ({ ...v, ...config.compare.preset(v) })
  const [b, setB] = useState(preset)
  const db = useDeferredValue(b)
  const modelB = useMemo(() => config.compute(db), [db])
  const mcB = useMemo(() => config.simulate(db), [db])
  const anB = useMemo(() => (config.analyze ? config.analyze(db, modelB, mcB) : {}), [db, modelB, mcB])
  const A = { model: ctxA.model, mc: ctxA.mc, an: ctxA.an, v: ctxA.v }
  const B = { model: modelB, mc: mcB, an: anB, v: db }
  const vd = useMemo(() => verdictOf(config.compare.rows, A, B, f), [ctxA, db, f.cur])

  return (
    <section className="compare">
      <header className="sec-head">
        <h3><Columns2 size={17} /> Compare two scenarios</h3>
        <button className="chip-btn" onClick={() => setB(preset())}><RotateCcw size={14} /> Suggest a variation</button>
      </header>
      <p className="lead">Scenario A is your current plan. Edit B to test an idea; the verdict updates live.</p>
      <div className="cmp-inputs">
        {main.map((fl) => (
          <div key={fl.key} className="cmp-row">
            <span>{fl.label}</span>
            <em>{fl.kind === 'money' ? f.money(v[fl.key]) : `${v[fl.key]}${fl.kind === 'pct' ? '%' : ''}`}</em>
            <NumberBox compact f={fl} value={b[fl.key]} onChange={(x) => setB((p) => ({ ...p, [fl.key]: x }))} />
          </div>
        ))}
      </div>
      <div className="cmp-table">
        <div className="cmp-th"><span /><b>A · Your plan</b><b>B · Scenario</b></div>
        {vd.lines.map(({ r, va, vb, tie, bWins }) => (
          <div key={r.label} className="cmp-tr">
            <span>{r.label}</span>
            <b className={!tie && !bWins ? 'win' : ''}>{r.fmt(va, f)}</b>
            <b className={!tie && bWins ? 'win' : ''}>{r.fmt(vb, f)}</b>
          </div>
        ))}
      </div>
      <div className="verdict">
        <Trophy size={18} />
        <div>
          <h4>SI verdict{vd.winner ? `: ${vd.winner === 'B' ? 'Scenario B' : 'Your current plan'}` : ''}</h4>
          <p>{vd.text}</p>
        </div>
      </div>
    </section>
  )
}
