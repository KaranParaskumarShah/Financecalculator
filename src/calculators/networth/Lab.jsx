import React from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Activity, Link2, Scale } from 'lucide-react'
import ChartTip from '../../components/calc/ChartTip.jsx'
import { fixFor } from '../math/networth.js'
import { useCountUp } from '../../lib/useTypewriter.js'

const axis = { stroke: 'var(--axis)', tick: { fill: 'var(--muted)', fontSize: 12 }, tickLine: false }
const tone = (s) => (s >= 70 ? 'var(--green)' : s >= 45 ? 'var(--amber)' : 'var(--rose)')

export default function HealthScoreLab({ ctx, onApply }) {
  const { v, model, f } = ctx
  const h = model.health
  const shown = useCountUp(h.total)
  const sorted = [...h.items].sort((a, b) => b.lost - a.lost)
  const fix = fixFor(v, h.weakest, f)
  const data = model.path.map((r) => ({ year: r.year, assets: r.assets, debts: r.debts }))
  return (
    <div className="lab">
      <section>
        <header className="sec-head"><h3><Activity size={17} /> Financial health score</h3></header>
        <div className="score-ring" style={{ background: `conic-gradient(${tone(h.total)} ${h.total * 3.6}deg, var(--track) 0)` }}>
          <div style={{ position: 'absolute', inset: 10, borderRadius: '50%', background: 'var(--bg-card, var(--bg))' }} />
          <b style={{ position: 'relative' }}>{Math.round(shown)}</b><span style={{ zIndex: 1 }}>out of 100</span>
        </div>
        <div className="mini-table">
          <div className="tr th cols4"><span>Area</span><span>You</span><span>Benchmark</span><span>Score</span></div>
          {h.items.map((i) => (
            <div key={i.id} className="tr cols4">
              <span>{i.label}</span><b>{i.shown}</b><span>{i.bench}</span><b style={{ color: tone(i.score) }}>{Math.round(i.score)}</b>
            </div>
          ))}
        </div>
        <p className="note-box">Benchmarks are common rules of thumb (20% savings rate, 6 months of cash, debt payments under 20% of income, net worth ≈ age × annual income ÷ 10), not guarantees. Treat the score as a conversation starter.</p>
      </section>

      <section>
        <header className="sec-head"><h3><Link2 size={17} /> Weakest link</h3></header>
        <p className="big-quote">Your weakest link is <em>{h.weakest.label.toLowerCase()}</em></p>
        <p className="lead">It costs you <b>{h.weakest.lost.toFixed(1)} points</b>. {fix.text}.</p>
        {fix.patch && <button className="btn-mini" onClick={() => onApply(fix.patch)}>Try this fix</button>}
        <h4 className="sub-h">Where the points are being lost</h4>
        <div className="mini-table">
          {sorted.map((i) => (
            <div key={i.id} className="tr cols3"><span>{i.label}</span><div className="stackbar" aria-hidden="true"><i className="bg-rose" style={{ width: `${(i.lost / 20) * 100}%` }} /></div><b>−{i.lost.toFixed(1)}</b></div>
          ))}
        </div>
      </section>

      <section>
        <header className="sec-head"><h3><Scale size={17} /> Assets versus liabilities</h3></header>
        <div className="chart-box" style={{ height: 240 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 14, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="var(--grid)" strokeDasharray="3 4" vertical={false} />
              <XAxis dataKey="year" {...axis} />
              <YAxis tickFormatter={(n) => f.money(n)} {...axis} axisLine={false} width={74} />
              <Tooltip content={<ChartTip xFmt={(x) => `Year ${x}`} f={f} />} />
              <Area dataKey="assets" name="Assets" stroke="var(--cyan)" fill="var(--cyan)" fillOpacity={0.18} strokeWidth={2.2} isAnimationActive={false} />
              <Area dataKey="debts" name="Debts" stroke="var(--rose)" fill="var(--rose)" fillOpacity={0.22} strokeWidth={2.2} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <p className="lead">The gap between the lines is your net worth. Debts fall as the loan amortises (other debts are assumed repaid over three years); assets grow with your investing and the return you set.</p>
      </section>
    </div>
  )
}
