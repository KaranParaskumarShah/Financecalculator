import React, { useEffect, useState } from 'react'
import { Bar, BarChart, Cell, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { History, Pause, Play, Rewind, Timer } from 'lucide-react'
import { doublingYears, shiftReport } from '../math/compound.js'

const Tip = ({ active, payload, label, f }) => active && payload?.length ? (
  <div className="chart-tip"><b>Year {label}</b>{payload.map((p) => <div key={p.dataKey}><i style={{ background: p.fill }} /><span>{p.name}</span><em>{f.money(p.value)}</em></div>)}</div>
) : null

export default function TimeMachineLab({ ctx }) {
  const { v, model, f } = ctx
  const rows = model.yearly
  const [i, setI] = useState(rows.length - 1)
  const [play, setPlay] = useState(false)
  const [dir, setDir] = useState(1)
  const [n, setN] = useState(5)
  const idx = Math.min(i, rows.length - 1)
  const r = rows[idx]

  useEffect(() => {
    if (!play) return
    const t = setInterval(() => setI((p) => { if (p >= rows.length - 1) { setPlay(false); return p } return p + 1 }), 180)
    return () => clearInterval(t)
  }, [play, rows.length])

  const data = rows.map((y, k) => ({ year: y.year, principal: y.principal, contrib: y.contrib, growth: Math.max(0, y.growth), on: k <= idx }))
  const rep = shiftReport(v, dir * n)
  const d72 = model.rule72
  const dEx = model.doubling
  const unit = v.principal > 0 ? v.principal : Math.max(v.monthly * 12, 1)
  const miles = []
  for (let k = 1; k <= 6; k++) { const yrs = dEx * k; if (yrs <= v.years + dEx) miles.push({ k, yrs, amt: unit * Math.pow(2, k) }) }
  const rates = [-2, 0, 2, 4].map((d) => v.rate + d).filter((x) => x > 0)
  const maxAlt = Math.max(rep.base, rep.alt)

  return (
    <div className="lab">
      <section>
        <header className="sec-head"><h3><History size={17} /> Watch it compound</h3></header>
        <p className="lead">Press play or drag the slider. Violet is your starting money, cyan is what you add, green is interest doing the work.</p>
        <div className="tm-controls">
          <button className="btn-icon" onClick={() => { if (idx >= rows.length - 1) setI(0); setPlay((p) => !p) }} aria-label={play ? 'Pause' : 'Play'}>{play ? <Pause size={16} /> : <Play size={16} />}</button>
          <button className="btn-icon" onClick={() => { setPlay(false); setI(0) }} aria-label="Back to start"><Rewind size={16} /></button>
          <input className="range" type="range" min={0} max={rows.length - 1} value={idx} onChange={(e) => { setPlay(false); setI(+e.target.value) }} style={{ '--p': `${(idx / Math.max(1, rows.length - 1)) * 100}%` }} aria-label="Year" />
          <b className="tm-x">Year {r.year}</b>
        </div>
        <div className="chart-box" style={{ height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 6, right: 12, bottom: 0, left: 0 }} barCategoryGap={1}>
              <CartesianGrid stroke="var(--grid)" strokeDasharray="3 4" vertical={false} />
              <XAxis dataKey="year" stroke="var(--axis)" tick={{ fill: 'var(--muted)', fontSize: 12 }} tickLine={false} minTickGap={20} />
              <YAxis tickFormatter={(x) => f.money(x)} stroke="var(--axis)" tick={{ fill: 'var(--muted)', fontSize: 12 }} tickLine={false} axisLine={false} width={74} />
              <Tooltip content={<Tip f={f} />} cursor={{ fill: 'rgba(125,140,200,.1)' }} />
              <Bar dataKey="principal" name="Starting money" stackId="a" isAnimationActive={false}>{data.map((d, k) => <Cell key={k} fill="var(--violet)" fillOpacity={d.on ? 0.95 : 0.15} />)}</Bar>
              <Bar dataKey="contrib" name="Your contributions" stackId="a" isAnimationActive={false}>{data.map((d, k) => <Cell key={k} fill="var(--cyan)" fillOpacity={d.on ? 0.95 : 0.15} />)}</Bar>
              <Bar dataKey="growth" name="Interest" stackId="a" isAnimationActive={false}>{data.map((d, k) => <Cell key={k} fill="var(--green)" fillOpacity={d.on ? 0.95 : 0.15} />)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="kv-grid">
          <div className="kv"><span>Balance</span><b>{f.money(r.balance)}</b></div>
          <div className="kv"><span>You put in</span><b>{f.money(r.principal + r.contrib)}</b></div>
          <div className="kv good"><span>Interest</span><b>{f.money(r.growth)}</b></div>
          <div className="kv"><span>Doublings so far</span><b>{(r.year / dEx).toFixed(1)}</b></div>
        </div>
      </section>

      <section>
        <header className="sec-head"><h3><Timer size={17} /> Rule of 72</h3></header>
        <p className="big-quote"><em>72 ÷ {v.rate}</em> = {d72.toFixed(1)} years to double</p>
        <p className="lead">The shortcut says {d72.toFixed(1)}; the exact answer at {v.freq === 365 ? 'daily' : v.freq === 12 ? 'monthly' : v.freq === 4 ? 'quarterly' : 'yearly'} compounding is {dEx.toFixed(2)} years. Close enough to do in your head.</p>
        <div className="pill-row">
          {miles.map((m) => <span className="pill" key={m.k}><b>{f.money(m.amt)}</b> at year {m.yrs.toFixed(1)}</span>)}
        </div>
        <p className="tiny">Milestones show {v.principal > 0 ? 'your starting amount' : 'a year of your contributions'} doubling again and again.</p>
        <div className="mini-table">
          <div className="tr th cols3"><span>Return</span><span>Rule of 72</span><span>Exact doubling</span></div>
          {rates.map((x) => (
            <div key={x} className={`tr cols3 ${x === v.rate ? 'on' : ''}`}><b>{x}%</b><span>{(72 / x).toFixed(1)} yrs</span><span>{doublingYears(x, v.freq).toFixed(2)} yrs</span></div>
          ))}
        </div>
      </section>

      <section>
        <header className="sec-head">
          <h3>What if you started earlier or later?</h3>
          <div className="seg small">
            <button className={dir === 1 ? 'on' : ''} onClick={() => setDir(1)}>Earlier</button>
            <button className={dir === -1 ? 'on' : ''} onClick={() => setDir(-1)}>Later</button>
          </div>
        </header>
        <div className="seg small" role="group" aria-label="Years">
          {[1, 2, 3, 5, 10].map((y) => <button key={y} className={n === y ? 'on' : ''} onClick={() => setN(y)}>{y} yr{y > 1 ? 's' : ''}</button>)}
        </div>
        {rep.years <= 0 ? <p className="callout">You would not have any time left to invest.</p> : (
          <>
            <p className="big-quote">Starting <em>{n} year{n > 1 ? 's' : ''} {dir === 1 ? 'earlier' : 'later'}</em> {dir === 1 ? 'adds' : 'costs'} <em>{f.money(Math.abs(rep.diff))}</em></p>
            <div className="mini-table">
              <div className="tr th cols3"><span /><span>Your plan ({v.years} yrs)</span><span>{dir === 1 ? 'Earlier' : 'Later'} ({rep.years} yrs)</span></div>
              <div className="tr cols3"><span>Final value</span><b>{f.money(rep.base)}</b><b className={rep.diff >= 0 ? 'c-green' : 'c-rose'}>{f.money(rep.alt)}</b></div>
              <div className="tr cols3"><span>Extra you pay in</span><span>-</span><span>{rep.extraContrib >= 0 ? '+' : '−'}{f.money(Math.abs(rep.extraContrib))}</span></div>
              <div className="tr cols3"><span>Extra from compounding</span><span>-</span><span>{rep.extraGrowth >= 0 ? '+' : '−'}{f.money(Math.abs(rep.extraGrowth))}</span></div>
            </div>
            <div className="stackbar" aria-hidden="true"><i className="bg-violet" style={{ width: `${(Math.min(rep.base, rep.alt) / maxAlt) * 100}%` }}>smaller</i><i className={rep.diff >= 0 ? 'bg-green' : 'bg-rose'} style={{ width: `${(Math.abs(rep.diff) / maxAlt) * 100}%` }}>{dir === 1 ? 'extra' : 'lost'}</i></div>
            <p className="callout">If you paid in the same total money but spread it over {rep.years} years instead, you would finish with {f.money(rep.sameTotalFinal)} ({rep.sameTotalDiff >= 0 ? '+' : '−'}{f.money(Math.abs(rep.sameTotalDiff))}). Time, not just amount, is what compounding pays for.</p>
          </>
        )}
      </section>
    </div>
  )
}
