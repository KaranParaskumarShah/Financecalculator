import React from 'react'
import { Hourglass } from 'lucide-react'

export default function RegretMeter({ rg, f }) {
  const max = Math.max(1, ...rg.bars.map((b) => b.cost))
  return (
    <section className="regret">
      <header className="sec-head"><h3><Hourglass size={17} /> Regret Meter</h3></header>
      <div className="regret-big">
        <b>{rg.headline}</b>
        <span>{rg.sub}</span>
      </div>
      <div className="regret-bars">
        {rg.bars.map((b) => (
          <div key={b.label} className="rb">
            <div className="rb-top"><span>{b.label}</span><b>−{f.money(b.cost)}</b></div>
            <div className="rb-track"><i style={{ width: `${(b.cost / max) * 100}%` }} /></div>
            <small>{b.note}</small>
          </div>
        ))}
      </div>
      <div className="optimal">
        <h4>{rg.optimal.title}</h4>
        <p>{rg.optimal.text}</p>
        {rg.optimal.gap > 0 && <div className="gap-pill">Left on the table: <b>{f.money(rg.optimal.gap)}</b></div>}
      </div>
    </section>
  )
}
