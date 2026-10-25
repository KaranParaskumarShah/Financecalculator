import React from 'react'
import { CartesianGrid, Line, LineChart, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Flame, ShieldAlert, Timer } from 'lucide-react'

const ProbTip = ({ active, payload, label }) =>
  active && payload?.length ? (
    <div className="chart-tip"><b>Retire at {label}</b><div><span>{Math.round(payload[0].value)}% chance money lasts</span></div></div>
  ) : null

export default function StressLab({ ctx, onApply }) {
  const { v, model, mc, an, f } = ctx
  const n = model.v
  const baseEnd = Math.max(1, an.stress[0].endBalance)
  const e = an.earliest

  return (
    <div className="lab">
      <section>
        <header className="sec-head"><h3><Timer size={17} /> Earliest possible retirement age</h3></header>
        <div className="earliest">
          <div className="earliest-num">
            <b>{e ?? '—'}</b>
            <span>{e == null ? 'not reachable at this savings rate' : e <= n.retireAge ? `age you could retire with ≥85% confidence (you planned ${n.retireAge})` : `earliest age with ≥85% confidence (you planned ${n.retireAge})`}</span>
          </div>
          {e != null && e !== n.retireAge && e >= n.age + 1 && e <= 75 && (
            <button className="btn-mini" onClick={() => onApply({ retireAge: e })}>Set retire age to {e}</button>
          )}
        </div>
        <div className="chart-box" style={{ height: 240 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={an.ageCurve} margin={{ top: 10, right: 14, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="var(--grid)" strokeDasharray="3 4" vertical={false} />
              <XAxis dataKey="age" stroke="var(--axis)" tick={{ fill: 'var(--muted)', fontSize: 12 }} tickLine={false} />
              <YAxis domain={[0, 100]} tickFormatter={(x) => `${x}%`} stroke="var(--axis)" tick={{ fill: 'var(--muted)', fontSize: 12 }} tickLine={false} axisLine={false} width={44} />
              <Tooltip content={<ProbTip />} />
              <ReferenceLine y={85} stroke="var(--green)" strokeDasharray="6 4" label={{ value: '85% confident', fill: 'var(--green)', fontSize: 12, position: 'insideBottomRight' }} />
              <ReferenceLine x={n.retireAge} stroke="var(--violet)" strokeDasharray="6 4" label={{ value: 'Your plan', fill: 'var(--violet)', fontSize: 12, position: 'top' }} />
              <Line type="monotone" dataKey="prob" stroke="var(--cyan)" strokeWidth={3} dot={false} isAnimationActive={false} />
              <ReferenceDot x={n.retireAge} y={Math.round(mc.successProb * 100)} r={6} fill="var(--violet)" stroke="var(--bg)" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="tiny">Each extra working year adds savings, shortens retirement and lets markets recover. Chance of success vs. the age you retire.</p>
      </section>

      <section>
        <header className="sec-head"><h3><ShieldAlert size={17} /> Stress tests</h3></header>
        <p className="lead">Your plan, hit with stylised historical shocks right as you retire. These are illustrations of sequence risk, not forecasts.</p>
        <div className="stress">
          {an.stress.map((s) => (
            <div key={s.id} className={`stress-row ${s.survives ? 'ok' : 'fail'}`}>
              <div className="stress-top">
                <b><Flame size={14} />{s.label}</b>
                <span className="out">{s.survives ? `Survives · ${f.money(s.endBalance)} left at ${n.lifeExp}` : `Runs out at age ${s.depletedAge}`}</span>
              </div>
              <div className="rb-track"><i className={s.survives ? 'good' : 'bad'} style={{ width: `${s.survives ? Math.max(4, Math.min(100, (s.endBalance / baseEnd) * 100)) : Math.max(4, ((s.depletedAge - n.retireAge) / (n.lifeExp - n.retireAge)) * 100)}%` }} /></div>
              <small>{s.note}</small>
            </div>
          ))}
        </div>
        <div className="callout">Markets are random, so success is a probability: <b>{Math.round(mc.successProb * 100)}%</b> of 5,000 simulated futures last to {n.lifeExp}, and <b>{Math.round(mc.earlyRuinProb * 100)}%</b> run dry before age 80.</div>
      </section>
    </div>
  )
}
