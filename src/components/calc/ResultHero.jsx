import React from 'react'
import { Share2 } from 'lucide-react'
import Gauge from './Gauge.jsx'
import { useCountUp } from '../../lib/useTypewriter.js'

export default function ResultHero({ hero, f, onShare }) {
  const anim = useCountUp(hero.raw ?? 0)
  return (
    <section className="hero-result glass" aria-live="polite">
      <div className="hr-main">
        <div className="hr-label">{hero.label}</div>
        <div className="hr-value">{hero.raw != null ? f.money(anim) : hero.value}</div>
        <div className="hr-sub">{hero.sub}</div>
        <div className="hr-stats">
          {hero.stats.map((s) => (
            <div key={s.label} className={`stat ${s.tone || ''}`}>
              <span>{s.label}</span>
              <b>{s.value}</b>
            </div>
          ))}
        </div>
      </div>
      <div className="hr-side">
        <Gauge value={hero.gauge.value} label={hero.gauge.label} />
        <button className="btn-ghost" onClick={onShare}><Share2 size={15} /> Share result</button>
      </div>
    </section>
  )
}
