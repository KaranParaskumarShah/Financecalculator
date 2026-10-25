import React from 'react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Scale, Scissors, Target } from 'lucide-react'
import ChartTip from '../../components/calc/ChartTip.jsx'
import { buyRentVerdict } from './verdict.js'

const axis = { stroke: 'var(--axis)', tick: { fill: 'var(--muted)', fontSize: 12 }, tickLine: false }

export default function BreakevenLab({ ctx }) {
  const { v, model, mc, an, f } = ctx
  const p = model.path
  const verdict = buyRentVerdict({ v, adv: model.adv, mc, be: model.be, bApp: an.bApp, bRent: an.bRent, f })
  const data = []
  for (let y = 0; y * 12 <= model.months; y++) data.push({ year: y, buyer: p.buyer[y * 12], renter: p.renter[y * 12], buyerMed: mc.bands.p50[y], renterMed: mc.renterBands.p50[y] })
  const ahead = mc.pAhead.slice(0, v.horizon + 1).map((x, y) => ({ year: y, pct: Math.round(x * 100) }))
  const beData = mc.beHist.slice(1).map((c, i) => ({ year: i + 1, pct: +((c / mc.n) * 100).toFixed(1) }))
  const a = model.anat
  const buyTotal = a.interest + a.maint + a.fees + a.opp
  const parts = [['Loan interest', a.interest, 'bg-rose'], ['Upkeep + property tax', a.maint, 'bg-amber'], ['Buying + selling fees', a.fees, 'bg-violet'], ['Growth you give up', a.opp, 'bg-cyan']]

  return (
    <div className="lab">
      <section>
        <div className={`verdict-card tone-${verdict.tone}`}>
          <span className="vtag">{verdict.tag}</span>
          <p>{verdict.text}</p>
          <ul className="truths">{verdict.truths.map((t) => <li key={t}>{t}</li>)}</ul>
        </div>
        <div className="note-box">The renter’s side is not a straw man: they invest the down payment, buying fees and every month’s difference at {v.investReturn}%. Returns here are pre-tax; tax rules (home-loan deductions, capital-gains tax) differ by country and are not included.</div>
      </section>

      <section>
        <header className="sec-head"><h3><Scale size={17} /> Net worth, year by year</h3></header>
        <div className="chart-box" style={{ height: 270 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 14, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="var(--grid)" strokeDasharray="3 4" vertical={false} />
              <XAxis dataKey="year" {...axis} />
              <YAxis tickFormatter={(n) => f.money(n)} {...axis} axisLine={false} width={74} />
              <Tooltip content={<ChartTip xFmt={(x) => `Year ${x}`} f={f} />} />
              <Line dataKey="buyer" name="Buyer (straight line)" stroke="var(--cyan)" strokeWidth={3} dot={false} isAnimationActive={false} />
              <Line dataKey="renter" name="Renter (straight line)" stroke="var(--amber)" strokeWidth={3} dot={false} isAnimationActive={false} />
              <Line dataKey="buyerMed" name="Buyer (median)" stroke="var(--cyan)" strokeDasharray="4 4" strokeWidth={1.6} dot={false} isAnimationActive={false} />
              <Line dataKey="renterMed" name="Renter (median)" stroke="var(--amber)" strokeDasharray="4 4" strokeWidth={1.6} dot={false} isAnimationActive={false} />
              {model.be && model.be <= model.months && <ReferenceLine x={Math.ceil(model.be / 12)} stroke="var(--green)" strokeDasharray="6 4" label={{ value: 'Breakeven', fill: 'var(--green)', fontSize: 12, position: 'top' }} />}
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="legend-row"><span><i style={{ background: 'var(--cyan)' }} />Buyer</span><span><i style={{ background: 'var(--amber)' }} />Renter</span><span>Dashed = median of 5,000 futures</span></div>
      </section>

      <section>
        <header className="sec-head"><h3><Target size={17} /> How sure is the breakeven?</h3></header>
        <p className="lead">Chance that buying is ahead if you sell in each year. It starts low (fees!) and climbs only if the home keeps up.</p>
        <div className="chart-box" style={{ height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={ahead} margin={{ top: 8, right: 14, bottom: 0, left: 0 }}>
              <defs><linearGradient id="gah" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--cyan)" stopOpacity=".4" /><stop offset="1" stopColor="var(--cyan)" stopOpacity=".03" /></linearGradient></defs>
              <CartesianGrid stroke="var(--grid)" strokeDasharray="3 4" vertical={false} />
              <XAxis dataKey="year" {...axis} />
              <YAxis domain={[0, 100]} tickFormatter={(x) => `${x}%`} {...axis} axisLine={false} width={44} />
              <Tooltip content={({ active, payload, label }) => active && payload?.length ? <div className="chart-tip"><b>Sell in year {label}</b><div><span>Buying ahead in {payload[0].value}% of futures</span></div></div> : null} />
              <ReferenceLine y={50} stroke="var(--muted)" strokeDasharray="5 4" />
              <Area dataKey="pct" stroke="var(--cyan)" strokeWidth={2.5} fill="url(#gah)" isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <h4 className="sub-h">When does buying finally stay ahead? (share of futures by year)</h4>
        <div className="chart-box" style={{ height: 150 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={beData} margin={{ top: 4, right: 14, bottom: 0, left: 0 }} barCategoryGap={2}>
              <XAxis dataKey="year" {...axis} />
              <YAxis tickFormatter={(x) => `${x}%`} {...axis} axisLine={false} width={40} />
              <Tooltip cursor={{ fill: 'rgba(125,140,200,.12)' }} content={({ active, payload, label }) => active && payload?.length ? <div className="chart-tip"><b>Year {label}</b><div><span>{payload[0].value}% of futures</span></div></div> : null} />
              <Bar dataKey="pct" fill="var(--violet)" radius={[3, 3, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="tiny">In {Math.round(mc.beNever * 100)}% of futures buying never stays ahead within 20 years.</p>
      </section>

      <section>
        <header className="sec-head"><h3><Scissors size={17} /> Where the money goes</h3></header>
        <div className="mini-table">
          <div className="tr th cols2"><span>Owning costs over {v.horizon} years</span><span>Amount</span></div>
          {parts.map(([l, x]) => <div className="tr cols2" key={l}><span>{l}</span><b>{f.money(x)}</b></div>)}
          <div className="tr cols2"><span>Less: the home’s price growth</span><b className="c-green">−{f.money(a.appreciation)}</b></div>
          <div className="tr cols2 on"><span>Net cost of owning</span><b>{f.money(a.netOwning)}</b></div>
          <div className="tr cols2 on"><span>Rent paid instead</span><b>{f.money(a.rentPaid)}</b></div>
        </div>
        <div className="stackbar" aria-hidden="true">{parts.map(([l, x, c]) => <i key={l} className={c} style={{ width: `${(x / buyTotal) * 100}%` }} title={l} />)}</div>
        <div className="legend-row">{parts.map(([l, , c]) => <span key={l}><i className={c} />{l}</span>)}</div>
      </section>
    </div>
  )
}
