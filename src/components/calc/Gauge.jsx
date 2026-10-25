import React from 'react'

export default function Gauge({ value, label, size = 190 }) {
  const v = Math.max(0, Math.min(1, value ?? 0))
  const r = 70
  const c = Math.PI * r
  const color = v >= 0.75 ? 'var(--green)' : v >= 0.5 ? 'var(--amber)' : 'var(--rose)'
  const verdict = v >= 0.85 ? 'Strong' : v >= 0.7 ? 'Good' : v >= 0.5 ? 'Shaky' : 'At risk'
  return (
    <figure className="gauge" style={{ width: size }} aria-label={`${label}: ${Math.round(v * 100)}%`}>
      <svg viewBox="0 0 180 108" role="img" aria-hidden="true">
        <path d="M 20 90 A 70 70 0 0 1 160 90" fill="none" stroke="var(--track)" strokeWidth="13" strokeLinecap="round" />
        <path
          d="M 20 90 A 70 70 0 0 1 160 90"
          fill="none"
          stroke={color}
          strokeWidth="13"
          strokeLinecap="round"
          strokeDasharray={`${c * v} ${c}`}
          style={{ transition: 'stroke-dasharray .7s cubic-bezier(.2,.8,.2,1), stroke .4s', filter: `drop-shadow(0 0 8px ${color})` }}
        />
        <text x="90" y="80" textAnchor="middle" className="gauge-num">{Math.round(v * 100)}%</text>
        <text x="90" y="100" textAnchor="middle" className="gauge-verdict" fill={color}>{verdict}</text>
      </svg>
      <figcaption>{label}</figcaption>
    </figure>
  )
}
