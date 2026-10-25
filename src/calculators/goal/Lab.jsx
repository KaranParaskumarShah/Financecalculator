import React from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Bar, BarChart } from 'recharts'
import { Footprints, Gauge, Lightbulb } from 'lucide-react'
import ChartTip from '../../components/calc/ChartTip.jsx'

const axis = { stroke: 'var(--axis)', tick: { fill: 'var(--muted)', fontSize: 12 }, tickLine: false }

export default function WillIMakeIt({ ctx, onApply }) {
  const { v, model, mc, an, f } = ctx
  const p = Math.round(mc.successProb * 100)
  const data = mc.labels.map((x, i) => ({ year: x, p25: mc.bands.p25[i], p50: mc.bands.p50[i], p75: mc.bands.p75[i], glide: mc.glide[i] }))
  const track = mc.track.map((t, y) => ({ year: y, pct: Math.round(t * 100) })).slice(1)
  return (
    <div className="lab">
      <section>
        <header className="sec-head"><h3><Gauge size={17} /> The confidence ladder</h3></header>
        <p className="big-quote">You have a <em>{p}%</em> chance of reaching {f.money(model.G)}</p>
        <p className="lead">How much you would need to save each month for a given level of confidence, after market swings are included.</p>
        <div className="mini-table">
          <div className="tr th cols4"><span>Confidence</span><span>Monthly saving</span><span>vs your plan</span><span /></div>
          {an.ladder.map((l) => {
            const d = l.monthly == null ? null : l.monthly - v.monthly
            return (
              <div key={l.conf} className={`tr cols4 ${Math.abs(l.conf - mc.successProb) < 0.1 ? 'on' : ''}`}>
                <b>{Math.round(l.conf * 100)}%</b>
                <span>{l.monthly == null ? 'Out of reach' : f.money(l.monthly)}</span>
                <span className={d == null ? '' : d > 0 ? 'c-rose' : 'c-green'}>{d == null ? '-' : `${d > 0 ? '+' : '−'}${f.money(Math.abs(d))}`}</span>
                {l.monthly != null ? <button className="btn-mini" style={{ margin: 0 }} onClick={() => onApply({ monthly: Math.round(l.monthly / 100) * 100 })}>Apply</button> : <span />}
              </div>
            )
          })}
        </div>
      </section>

      <section>
        <header className="sec-head"><h3><Footprints size={17} /> Checkpoints along the way</h3></header>
        <p className="lead">The glide path is the balance you need each year to stay on course. The bands show where simulations put you.</p>
        <div className="chart-box" style={{ height: 250 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 14, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="var(--grid)" strokeDasharray="3 4" vertical={false} />
              <XAxis dataKey="year" {...axis} />
              <YAxis tickFormatter={(n) => f.money(n)} {...axis} axisLine={false} width={74} />
              <Tooltip content={<ChartTip xFmt={(x) => `Year ${x}`} f={f} />} />
              <Line dataKey="glide" name="Glide path" stroke="var(--violet)" strokeDasharray="5 3" strokeWidth={2.4} dot={false} isAnimationActive={false} />
              <Line dataKey="p75" name="Good luck (75th)" stroke="var(--cyan)" strokeWidth={1.4} dot={false} isAnimationActive={false} />
              <Line dataKey="p50" name="Likely" stroke="var(--green)" strokeWidth={3} dot={false} isAnimationActive={false} />
              <Line dataKey="p25" name="Bad luck (25th)" stroke="var(--rose)" strokeWidth={1.4} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <h4 className="sub-h">Chance you are on or ahead of the glide path</h4>
        <div className="chart-box" style={{ height: 130 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={track} margin={{ top: 4, right: 14, bottom: 0, left: 0 }} barCategoryGap={2}>
              <XAxis dataKey="year" {...axis} />
              <YAxis domain={[0, 100]} tickFormatter={(x) => `${x}%`} {...axis} axisLine={false} width={40} />
              <Tooltip cursor={{ fill: 'rgba(125,140,200,.12)' }} content={({ active, payload, label }) => active && payload?.length ? <div className="chart-tip"><b>Year {label}</b><div><span>{payload[0].value}% on track</span></div></div> : null} />
              <Bar dataKey="pct" fill="var(--cyan)" radius={[3, 3, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section>
        <header className="sec-head"><h3><Lightbulb size={17} /> What moves the gauge most</h3></header>
        <div className="mini-table">
          <div className="tr th cols4"><span>Change</span><span>New odds</span><span>Gain</span><span /></div>
          {an.levers.map((l) => (
            <div key={l.id} className="tr cols4">
              <span>{l.label}</span><b>{Math.round(l.prob * 100)}%</b>
              <span className={l.gain > 0 ? 'c-green' : ''}>{l.gain >= 0 ? '+' : '−'}{Math.abs(Math.round(l.gain * 100))} pts</span>
              <button className="btn-mini" style={{ margin: 0 }} onClick={() => onApply(l.patch)}>Apply</button>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
