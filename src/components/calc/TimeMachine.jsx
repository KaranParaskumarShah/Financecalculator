import React, { useEffect, useMemo, useRef, useState } from 'react'
import { CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { History, Pause, Play } from 'lucide-react'
import ChartTip from './ChartTip.jsx'

export default function TimeMachine({ tl, f }) {
  const rows = tl.rows
  const [i, setI] = useState(Math.min(rows.length - 1, Math.max(0, Math.round(rows.length / 2))))
  const [playing, setPlaying] = useState(false)
  const idx = Math.min(i, rows.length - 1)
  const row = rows[idx]
  const timer = useRef()

  useEffect(() => {
    if (!playing) return
    timer.current = setInterval(() => {
      setI((p) => {
        if (p >= rows.length - 1) { setPlaying(false); return p }
        return p + 1
      })
    }, 260)
    return () => clearInterval(timer.current)
  }, [playing, rows.length])

  const data = useMemo(() => rows, [rows])
  return (
    <section className="timemachine">
      <header className="sec-head"><h3><History size={17} /> Time Machine</h3></header>
      <p className="lead">Drag through the years and watch the numbers evolve.</p>
      <div className="tm-controls">
        <button className="btn-icon" onClick={() => { if (idx >= rows.length - 1) setI(0); setPlaying((p) => !p) }} aria-label={playing ? 'Pause' : 'Play'}>
          {playing ? <Pause size={16} /> : <Play size={16} />}
        </button>
        <input
          className="range"
          type="range"
          min={0}
          max={rows.length - 1}
          value={idx}
          onChange={(e) => { setPlaying(false); setI(+e.target.value) }}
          style={{ '--p': `${(idx / Math.max(1, rows.length - 1)) * 100}%` }}
          aria-label={tl.xName}
        />
        <b className="tm-x">{tl.xFmt(row.x)}</b>
      </div>
      <div className="tm-cards">
        {tl.series.map((s) => (
          <div key={s.key} className="tm-card" style={{ '--c': s.color }}>
            <span><i />{s.label}</span>
            <b>{f.money(row[s.key] ?? 0)}</b>
          </div>
        ))}
      </div>
      <p className="callout">{tl.caption(row, rows)}</p>
      <div className="chart-box" style={{ height: 290 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 14, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="var(--grid)" strokeDasharray="3 4" vertical={false} />
            <XAxis dataKey="x" stroke="var(--axis)" tick={{ fill: 'var(--muted)', fontSize: 12 }} tickLine={false} minTickGap={24} />
            <YAxis tickFormatter={(n) => f.money(n)} stroke="var(--axis)" tick={{ fill: 'var(--muted)', fontSize: 12 }} tickLine={false} axisLine={false} width={74} />
            <Tooltip content={<ChartTip xFmt={tl.xFmt} f={f} />} />
            {tl.series.map((s) => (
              <Line key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={s.color} strokeWidth={2.4} dot={false} isAnimationActive={false} />
            ))}
            <ReferenceLine x={row.x} stroke="var(--text)" strokeOpacity={0.6} strokeDasharray="4 3" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}
