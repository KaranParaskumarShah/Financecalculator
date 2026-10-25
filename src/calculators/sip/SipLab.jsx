import React from 'react'
import { Area, AreaChart, CartesianGrid, Line, LineChart, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CalendarX2, Layers } from 'lucide-react'
import ChartTip from '../../components/calc/ChartTip.jsx'
import { sipSchedule } from '../math/sip.js'

export default function SipLab({ ctx, onApply }) {
  const { v, model, an, f } = ctx
  const tiers = [0, 5, 10, 15, 20]
  const need = an.stepNeeded
  const missedPick = [1, 12, Math.round(an.missed.length / 2), an.missed.length].filter((m, i, a) => m >= 1 && a.indexOf(m) === i)
  const curStep = an.stepCurve.find((s) => s.stepUp === v.stepUp)

  return (
    <div className="lab">
      <section>
        <header className="sec-head"><h3><Layers size={17} /> Step-up optimizer</h3></header>
        <p className="lead">Raising your SIP a little each year is the cheapest way to grow the pot. Here is the corpus for every step-up rate.</p>
        <div className="chart-box" style={{ height: 250 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={an.stepCurve} margin={{ top: 10, right: 14, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="var(--grid)" strokeDasharray="3 4" vertical={false} />
              <XAxis dataKey="stepUp" tickFormatter={(x) => `${x}%`} stroke="var(--axis)" tick={{ fill: 'var(--muted)', fontSize: 12 }} tickLine={false} />
              <YAxis tickFormatter={(n) => f.money(n)} stroke="var(--axis)" tick={{ fill: 'var(--muted)', fontSize: 12 }} tickLine={false} axisLine={false} width={74} />
              <Tooltip content={<ChartTip xFmt={(x) => `${x}% yearly step-up`} f={f} />} />
              <Line type="monotone" dataKey="corpus" name="Corpus" stroke="var(--cyan)" strokeWidth={3} dot={false} isAnimationActive={false} />
              {v.goal > 0 && <ReferenceLine y={v.goal} stroke="var(--amber)" strokeDasharray="6 4" label={{ value: 'Goal', fill: 'var(--amber)', fontSize: 12, position: 'insideTopLeft' }} />}
              {curStep && <ReferenceDot x={v.stepUp} y={curStep.corpus} r={6} fill="var(--green)" stroke="var(--bg)" strokeWidth={2} />}
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="tier-table">
          <div className="tier-th"><span>Step-up</span><span>Corpus</span><span>Your SIP in the final year</span></div>
          {tiers.map((s) => {
            const r = sipSchedule({ ...v, stepUp: s })
            return (
              <div key={s} className={`tier-tr ${s === v.stepUp ? 'on' : ''}`}>
                <b>{s}%</b><span>{f.money(r.final)}</span><span>{f.money(r.lastSip)} / month</span>
              </div>
            )
          })}
        </div>
        <div className="callout">
          {need == null
            ? `No step-up up to 40% reaches ${f.money(v.goal)} with today’s SIP. Raise the starting SIP or the horizon.`
            : need <= v.stepUp
              ? `You already clear ${f.money(v.goal)} on a straight line. A ${need}% step-up would be enough.`
              : `The smallest step-up that gets a straight-line plan to ${f.money(v.goal)} is ${need}% a year.`}
          {need != null && need > v.stepUp && need <= 30 && (
            <button className="btn-mini" onClick={() => onApply({ stepUp: need })}>Apply {need}%</button>
          )}
        </div>
      </section>

      <section>
        <header className="sec-head"><h3><CalendarX2 size={17} /> The cost of missing a single SIP</h3></header>
        <p className="lead">One skipped instalment is not just that month’s money. It is that money, compounded to the end. Early misses hurt most.</p>
        <div className="miss-cards">
          {missedPick.map((m) => {
            const c = an.missed[m - 1]
            return (
              <div key={m} className="miss-card">
                <span>{m === 1 ? 'Skip the first SIP' : m === an.missed.length ? 'Skip the last SIP' : `Skip SIP #${m}`}</span>
                <b>−{f.money(c.cost)}</b>
                <small>{(c.cost / c.amount).toFixed(1)}× the {f.money(c.amount)} you skipped</small>
              </div>
            )
          })}
        </div>
        <div className="chart-box" style={{ height: 210 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={an.missed} margin={{ top: 8, right: 14, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="gm" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--rose)" stopOpacity="0.45" /><stop offset="100%" stopColor="var(--rose)" stopOpacity="0.02" /></linearGradient>
              </defs>
              <CartesianGrid stroke="var(--grid)" strokeDasharray="3 4" vertical={false} />
              <XAxis dataKey="month" tickFormatter={(m) => `M${m}`} stroke="var(--axis)" tick={{ fill: 'var(--muted)', fontSize: 12 }} tickLine={false} minTickGap={40} />
              <YAxis tickFormatter={(n) => f.money(n)} stroke="var(--axis)" tick={{ fill: 'var(--muted)', fontSize: 12 }} tickLine={false} axisLine={false} width={74} />
              <Tooltip content={<ChartTip xFmt={(m) => `Skipping SIP #${m}`} f={f} />} />
              <Area type="monotone" dataKey="cost" name="Cost at maturity" stroke="var(--rose)" strokeWidth={2.4} fill="url(#gm)" isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  )
}
