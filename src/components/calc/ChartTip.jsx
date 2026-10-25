import React from 'react'

// Shared tooltip body for Recharts.
export default function ChartTip({ active, payload, label, xFmt, f, skip = [] }) {
  if (!active || !payload?.length) return null
  const rows = payload.filter((p) => p.value != null && !Array.isArray(p.value) && !skip.includes(p.dataKey))
  return (
    <div className="chart-tip">
      <b>{xFmt ? xFmt(label) : label}</b>
      {rows.map((p) => (
        <div key={p.dataKey}>
          <i style={{ background: p.color || p.stroke }} />
          <span>{p.name}</span>
          <em>{f.money(p.value)}</em>
        </div>
      ))}
    </div>
  )
}
