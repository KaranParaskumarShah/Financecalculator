import React, { useEffect, useRef, useState } from 'react'
import { BrainCircuit, Lightbulb, AlertTriangle, CheckCircle2, Info, XOctagon } from 'lucide-react'
import { useTypewriter } from '../../lib/useTypewriter.js'
import { aiEnabled, aiNarrate } from '../../lib/ai.js'

const ICON = { good: CheckCircle2, warn: AlertTriangle, bad: XOctagon, tip: Lightbulb, info: Info }

export default function InsightPanel({ insight }) {
  const [text, setText] = useState(insight.headline)
  const [thinking, setThinking] = useState(true)
  const [ai, setAi] = useState(false)
  const first = useRef(true)

  // Debounce: while the user is still dragging we show "thinking…", then re-type the story.
  useEffect(() => {
    setThinking(true)
    let alive = true
    const t = setTimeout(
      () => {
        if (!alive) return
        setText(insight.headline)
        setAi(false)
        setThinking(false)
        if (aiEnabled) {
          aiNarrate(insight.facts).then((r) => {
            if (alive && r) { setText(r); setAi(true) }
          })
        }
      },
      first.current ? 650 : 450
    )
    first.current = false
    return () => { alive = false; clearTimeout(t) }
  }, [insight.headline])

  const { shown, done } = useTypewriter(text, { speed: 12, enabled: !thinking })
  const c = insight.confidence

  return (
    <section className="insight glass" aria-label="SI insight">
      <header>
        <div className="insight-title">
          <span className={`orb ${thinking ? 'busy' : ''}`} aria-hidden="true"><BrainCircuit size={16} /></span>
          <b>SI Insight</b>
          <em>{thinking ? 'thinking…' : ai ? 'narrated by Claude' : 'local engine'}</em>
        </div>
        <div className="confidence" title="How tightly the 5,000 simulations agree. Wider spread = lower confidence in any single number.">
          <span>Confidence</span>
          <div className="conf-bar"><i style={{ width: `${c}%` }} /></div>
          <b>{c}%</b>
        </div>
      </header>
      <p className="story" aria-live="polite">
        {thinking ? <span className="dots"><i /><i /><i /></span> : <>{shown}{!done && <span className="caret" />}</>}
      </p>
      <ul className={`advice ${thinking ? 'dim' : ''}`}>
        {insight.bullets.map((b, i) => {
          const I = ICON[b.tone] || Info
          return (
            <li key={i} className={`tone-${b.tone}`} style={{ animationDelay: `${i * 60}ms` }}>
              <I size={16} aria-hidden="true" />
              <span>{b.text}</span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
