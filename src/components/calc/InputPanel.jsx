import React from 'react'
import { RotateCcw, SlidersHorizontal } from 'lucide-react'
import Field from './Field.jsx'

export default function InputPanel({ fields, values, setValue, onReset, name }) {
  const main = fields.filter((f) => f.group !== 'advanced')
  const adv = fields.filter((f) => f.group === 'advanced')
  return (
    <aside className="panel inputs glass" aria-label={`${name} inputs`}>
      <div className="panel-head">
        <h2><SlidersHorizontal size={16} /> Your numbers</h2>
        <button className="chip-btn" onClick={onReset} title="Reset to defaults"><RotateCcw size={14} /> Reset</button>
      </div>
      {main.map((f) => <Field key={f.key} f={f} value={values[f.key]} onChange={(x) => setValue(f.key, x)} />)}
      {adv.length > 0 && (
        <details className="adv">
          <summary>Assumptions &amp; advanced</summary>
          {adv.map((f) => <Field key={f.key} f={f} value={values[f.key]} onChange={(x) => setValue(f.key, x)} />)}
        </details>
      )}
      <p className="tiny">Everything updates live as you type. Nothing leaves your browser.</p>
    </aside>
  )
}
