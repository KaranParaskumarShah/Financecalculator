import React, { useMemo } from 'react'
import { Area, Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Dices } from 'lucide-react'
import ChartTip from './ChartTip.jsx'
import { histogram } from '../../lib/stats.js'

export default function ConeChart({ cone, mc, f }) {
  const rows = useMemo(() => cone.rows.map((r) => ({ ...r, r90: [r.p5, r.p95], r50: [r.p25, r.p75] })), [cone])
  const hist = useMemo(() => histogram(mc.sorted, 30), [mc])
  const histGoal = cone.histGoal
  const pct = mc.successProb != null ? Math.round(mc.successProb * 100) : null

  return (
    <section className="cone glass" aria-label={cone.title}>
      <header className="sec-head">
        <h3><Dices size={17} /> {cone.title}</h3>
        {pct != null && <span className="prob-pill">{pct}% <small>{cone.successLabel}</small></span>}
      </header>

      <div className="chart-box" style={{ height: 330 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={{ top: 10, right: 14, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="g90" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--cyan)" stopOpacity="0.30" />
                <stop offset="100%" stopColor="var(--violet)" stopOpacity="0.08" />
              </linearGradient>
              <linearGradient id="g50" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--cyan)" stopOpacity="0.38" />
                <stop offset="100%" stopColor="var(--violet)" stopOpacity="0.18" />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--grid)" strokeDasharray="3 4" vertical={false} />
            <XAxis dataKey="x" tickFormatter={(x) => (cone.xName === 'Age' ? x : x)} stroke="var(--axis)" tick={{ fill: 'var(--muted)', fontSize: 12 }} tickLine={false} minTickGap={24} />
            <YAxis domain={cone.yMax ? [0, cone.yMax] : [0, 'auto']} allowDataOverflow={Boolean(cone.yMax)} tickFormatter={(n) => f.money(n)} stroke="var(--axis)" tick={{ fill: 'var(--muted)', fontSize: 12 }} tickLine={false} axisLine={false} width={74} />
            <Tooltip content={<ChartTip xFmt={cone.xFmt} f={f} />} />
            <Area type="monotone" dataKey="r90" name="90% range" stroke="none" fill="url(#g90)" isAnimationActive={false} activeDot={false} />
            <Area type="monotone" dataKey="r50" name="50% range" stroke="none" fill="url(#g50)" isAnimationActive={false} activeDot={false} />
            <Line type="monotone" dataKey="p95" name="Best case" stroke="var(--cyan)" strokeOpacity={0.55} strokeWidth={1.2} dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="p5" name="Worst case" stroke="var(--rose)" strokeOpacity={0.7} strokeWidth={1.2} dot={false} isAnimationActive={false} />
            {cone.lines.map((l) => (
              <Line key={l.key} type="monotone" dataKey={l.key} name={l.label} stroke={l.color} strokeDasharray={l.dash} strokeWidth={1.8} dot={false} isAnimationActive={false} />
            ))}
            <Line type="monotone" dataKey="p50" name="Likely" stroke="var(--green)" strokeWidth={3} dot={false} isAnimationActive={false} />
            {cone.goal > 0 && <ReferenceLine y={cone.goal} stroke="var(--amber)" strokeDasharray="6 4" label={{ value: cone.goalLabel, fill: 'var(--amber)', fontSize: 12, position: 'insideTopLeft' }} />}
            {cone.marker != null && <ReferenceLine x={cone.marker} stroke="var(--violet)" strokeDasharray="6 4" label={{ value: cone.markerLabel, fill: 'var(--violet)', fontSize: 12, position: 'top' }} />}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="legend-row">
        <span><i style={{ background: 'var(--cyan)' }} />{cone.legend.best}</span>
        <span><i style={{ background: 'var(--green)' }} />{cone.legend.likely}</span>
        <span><i style={{ background: 'var(--rose)' }} />{cone.legend.worst}</span>
      </div>

      {cone.endpoints && (
        <div className="endpoints">
          <div><span>Best case{cone.endpoints.atLabel ? ` ${cone.endpoints.atLabel}` : ''}</span><b className="c-cyan">{f.money(cone.endpoints.best)}</b></div>
          <div><span>Likely</span><b className="c-green">{f.money(cone.endpoints.likely)}</b></div>
          <div><span>Worst case</span><b className="c-rose">{f.money(cone.endpoints.worst)}</b></div>
        </div>
      )}
      {cone.yMax && <p className="tiny center">Chart is zoomed to the likely range; the best-case tail runs off the top.</p>}
      {cone.note && <p className="tiny center">{cone.note}</p>}

      <div className="hist">
        <h4>{cone.histTitle}</h4>
        <div style={{ height: 120 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={hist} margin={{ top: 4, right: 14, left: 0, bottom: 0 }} barCategoryGap={1}>
              <XAxis dataKey="x" tickFormatter={(n) => f.money(n)} tick={{ fill: 'var(--muted)', fontSize: 11 }} tickLine={false} axisLine={false} interval={Math.floor(hist.length / 4)} padding={{ left: 28, right: 10 }} />
              <Tooltip cursor={{ fill: 'rgba(125,140,200,.12)' }} content={({ active, payload }) => active && payload?.length ? (
                <div className="chart-tip"><b>{f.money(payload[0].payload.x)} – {f.money(payload[0].payload.x1)}</b><div><span>{(payload[0].value / mc.n * 100).toFixed(1)}% of futures</span></div></div>
              ) : null} />
              <Bar dataKey="count" isAnimationActive={false} radius={[3, 3, 0, 0]}>
                {hist.map((h, i) => (
                  <Cell key={i} fill={histGoal != null ? (h.x1 >= histGoal ? 'var(--green)' : 'var(--rose)') : 'var(--violet)'} fillOpacity={0.8} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  )
}
