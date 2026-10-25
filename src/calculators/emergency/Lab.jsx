import React from 'react'
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { LifeBuoy, PieChart, Hourglass } from 'lucide-react'
import { survivalCurve } from '../math/emergency.js'

const axis = { stroke: 'var(--axis)', tick: { fill: 'var(--muted)', fontSize: 12 }, tickLine: false }

export default function RunwayLab({ ctx, onApply }) {
  const { v, model, mc, f } = ctx
  const curve = React.useMemo(() => survivalCurve(mc), [mc])
  const s = model.split
  const rows = [
    { k: 'needs', label: 'Needs (essentials + debt)', now: s.needs, ideal: s.ideal.needs, cls: 'bg-rose' },
    { k: 'wants', label: 'Wants', now: s.wants, ideal: s.ideal.wants, cls: 'bg-amber' },
    { k: 'save', label: 'Savings', now: s.save, ideal: s.ideal.save, cls: 'bg-green' }
  ]
  return (
    <div className="lab">
      <section>
        <header className="sec-head"><h3><LifeBuoy size={17} /> Your safe runway</h3></header>
        <p className="big-quote">You can survive <em>{model.runway >= 100 ? '100+' : model.runway.toFixed(1)} months</em> without income</p>
        <div className="kv-grid">
          <div className="kv"><span>Liquid money</span><b>{f.money(model.liquid)}</b></div>
          <div className="kv"><span>Monthly burn</span><b>{f.money(model.burn)}</b></div>
          <div className="kv"><span>Recommended cover</span><b>{model.target.toFixed(1)} mo</b></div>
          <div className="kv"><span>Recommended fund</span><b>{f.money(model.need)}</b></div>
        </div>
        <p className="note-box">The recommended cover is a rule of thumb: 3 months, plus 1 per dependent, plus 1.5 for normal job risk (3 if volatile), plus 1 if debt payments exceed 30% of essentials. It is a guideline, not a guarantee.</p>
      </section>

      <section>
        <header className="sec-head"><h3><Hourglass size={17} /> How long a job loss can you survive?</h3></header>
        <p className="lead">Chance your cash lasts at least this many months, with spending swings and surprise bills simulated.</p>
        <div className="chart-box" style={{ height: 230 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={curve} margin={{ top: 10, right: 14, bottom: 0, left: 0 }}>
              <defs><linearGradient id="surv" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--green)" stopOpacity=".5" /><stop offset="100%" stopColor="var(--green)" stopOpacity=".05" /></linearGradient></defs>
              <CartesianGrid stroke="var(--grid)" strokeDasharray="3 4" vertical={false} />
              <XAxis dataKey="month" {...axis} />
              <YAxis domain={[0, 100]} tickFormatter={(n) => `${n}%`} {...axis} axisLine={false} width={44} />
              <ReferenceLine x={Math.min(18, Math.round(model.target))} stroke="var(--violet)" strokeDasharray="6 4" label={{ value: 'Target', fill: 'var(--violet)', fontSize: 12, position: 'top' }} />
              <Tooltip content={({ active, payload, label }) => active && payload?.length ? <div className="chart-tip"><b>Job loss of {label} months</b><div><span>{payload[0].value}% chance you are still covered</span></div></div> : null} />
              <Area dataKey="prob" stroke="var(--green)" strokeWidth={2.5} fill="url(#surv)" isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section>
        <header className="sec-head"><h3><PieChart size={17} /> 50/30/20, applied to you</h3></header>
        <p className="lead">Your essentials and debt take <b>{Math.round(s.needsPct * 100)}%</b> of income. {s.needsPct <= 0.5 ? 'You are inside the 50% guideline.' : `That is ${f.money(s.needs - s.ideal.needs)} above the 50% guideline, so the split below scales your leftover ${f.money(Math.max(0, s.left))} 60/40 between wants and savings.`}</p>
        <div className="mini-table">
          <div className="tr th cols4"><span>Bucket</span><span>You (possible)</span><span>50/30/20</span><span>Share</span></div>
          {rows.map((r) => (
            <div key={r.k} className="tr cols4">
              <span>{r.label}</span><b>{f.money(Math.max(0, r.now))}</b><span>{f.money(r.ideal)}</span>
              <span>{Math.round(Math.max(0, r.now) / s.inc * 100)}%</span>
            </div>
          ))}
        </div>
        <div className="stackbar" aria-hidden="true">
          {rows.map((r) => <i key={r.k} className={r.cls} style={{ width: `${Math.max(0, Math.min(100, r.now / s.inc * 100))}%` }} />)}
        </div>
        {model.gap > 0 && (
          <p className="note-box" style={{ marginTop: 10 }}>
            {model.build == null ? 'There is no monthly surplus to build the fund. Cutting spending or raising income comes first.' : <>Putting the {f.money(Math.max(0, s.save))} savings slice here builds the missing {f.money(model.gap)} in <b>{model.build} months</b>. </>}
            {model.build != null && <button className="btn-mini" onClick={() => onApply({ savings: Math.round(model.need / 1000) * 1000 })}>See with full fund</button>}
          </p>
        )}
      </section>
    </div>
  )
}
