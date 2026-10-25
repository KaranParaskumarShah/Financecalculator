import React from 'react'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Scale, Wand2 } from 'lucide-react'

const axis = { stroke: 'var(--axis)', tick: { fill: 'var(--muted)', fontSize: 12 }, tickLine: false }

export default function DeductionOptimizer({ ctx, onApply }) {
  const { v, model, f } = ctx
  const rows = [
    { k: 'Income', a: model.gross, b: model.gross },
    { k: 'Standard deduction', a: 50000, b: 75000 },
    { k: 'HRA exemption', a: model.ded.hra, b: 0 },
    { k: '80C', a: model.ded.c80, b: 0 },
    { k: 'NPS 80CCD(1B)', a: model.ded.nps, b: 0 },
    { k: '80D health', a: model.ded.d80, b: 0 },
    { k: '24(b) interest', a: model.ded.int24, b: 0 },
    { k: 'Employer NPS', a: model.ded.emp, b: Math.min(v.empNps, ((v.gross * v.basicPct) / 100) * 0.14) }
  ]
  const chart = [{ n: 'Old', tax: model.taxOld }, { n: 'New', tax: model.taxNew }]
  return (
    <div className="lab">
      <section>
        <header className="sec-head"><h3><Scale size={17} /> Old versus new, line by line</h3></header>
        <p className="big-quote"><em>{model.best === 'old' ? 'Old' : 'New'} regime</em> wins by {f.money(model.saving)}</p>
        <div className="mini-table">
          <div className="tr th cols3"><span>Step</span><span>Old regime</span><span>New regime</span></div>
          {rows.map((r, i) => <div key={r.k} className="tr cols3"><span>{r.k}</span><b>{i === 0 ? f.money(r.a) : r.a ? `− ${f.money(r.a)}` : '–'}</b><b>{i === 0 ? f.money(r.b) : r.b ? `− ${f.money(r.b)}` : '–'}</b></div>)}
          <div className="tr cols3"><span>Taxable income</span><b>{f.money(model.oldTaxable)}</b><b>{f.money(model.newTaxable)}</b></div>
          <div className="tr cols3"><span>Tax with cess</span><b className={model.best === 'old' ? 'c-green' : ''}>{f.money(model.taxOld)}</b><b className={model.best === 'new' ? 'c-green' : ''}>{f.money(model.taxNew)}</b></div>
        </div>
        <div className="chart-box" style={{ height: 150 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart} layout="vertical" margin={{ top: 4, right: 14, bottom: 0, left: 10 }}>
              <CartesianGrid stroke="var(--grid)" horizontal={false} strokeDasharray="3 4" />
              <XAxis type="number" tickFormatter={(n) => f.money(n)} {...axis} />
              <YAxis type="category" dataKey="n" {...axis} axisLine={false} width={44} />
              <Tooltip cursor={{ fill: 'rgba(125,140,200,.12)' }} content={({ active, payload }) => active && payload?.length ? <div className="chart-tip"><b>{payload[0].payload.n} regime</b><div><span>{f.money(payload[0].value)}</span></div></div> : null} />
              <Bar dataKey="tax" radius={[0, 5, 5, 0]} isAnimationActive={false}>{chart.map((c) => <Cell key={c.n} fill={(c.n === 'Old') === (model.best === 'old') ? 'var(--green)' : 'var(--violet)'} />)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section>
        <header className="sec-head"><h3><Wand2 size={17} /> Best moves to cut your tax</h3></header>
        {model.sugg.length === 0 ? <p className="lead">You are using every deduction limit modelled here. Nothing left to optimise.</p> : (
          <div className="mini-table">
            <div className="tr th cols4"><span>Deduction</span><span>Room</span><span>Old-regime tax saved</span><span /></div>
            {model.sugg.map((s) => (
              <div key={s.id} className="tr cols4">
                <span>{s.label}{s.flipsToOld ? ' ★' : ''}</span><b>{f.money(s.room)}</b><span className="c-green">{f.money(s.saved)}</span>
                <button className="btn-mini" style={{ margin: 0 }} onClick={() => onApply({ [s.key]: s.to })}>Apply</button>
              </div>
            ))}
          </div>
        )}
        <p className="note-box">★ means using this limit flips the winner to the old regime. {model.best === 'new' && model.toWin != null && model.toWin > 0 ? `You need ${f.money(model.toWin)} more of total deductions for the old regime to win.` : ''}</p>
        <p className="note-box dim-note">Based on FY 2026-27 slabs, standard deduction, 87A rebate with marginal relief, surcharge and 4% cess for a salaried resident individual. Capital gains and special-rate income are not included. These are estimates, not tax advice.</p>
      </section>
    </div>
  )
}
