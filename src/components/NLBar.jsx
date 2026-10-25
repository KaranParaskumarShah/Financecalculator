import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Sparkles } from 'lucide-react'
import { useCurrency } from '../lib/currency.jsx'
import { EXAMPLES, parseIntent } from '../lib/nlp.js'
import { aiParse } from '../lib/ai.js'
import { byId } from '../calculators/meta.js'
import { encodeState } from '../lib/share.js'

export default function NLBar({ compact = false }) {
  const nav = useNavigate()
  const { cur } = useCurrency()
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [ph, setPh] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setPh((p) => (p + 1) % EXAMPLES.length), 3800)
    return () => clearInterval(id)
  }, [])

  const run = async (raw) => {
    const q = (raw ?? text).trim()
    if (!q) { setErr('Tell me what you are trying to do, in your own words.'); return }
    setBusy(true)
    setErr('')
    const res = (await aiParse(q, cur)) || parseIntent(q, cur)
    setBusy(false)
    if (!res.ok) {
      setErr('I could not tell which calculator you need. Mention a SIP / investing, a loan or EMI, or retirement. For example: “' + EXAMPLES[1] + '”')
      return
    }
    const meta = byId(res.calc)
    nav(`/${meta.slug}?s=${encodeState({ c: res.currency || cur, v: res.patch })}`, {
      state: { nl: { text: q, patch: res.patch, reverse: res.reverse, notes: res.notes } }
    })
  }

  return (
    <div className={`nl ${compact ? 'compact' : ''}`}>
      <form className="nl-form glass" onSubmit={(e) => { e.preventDefault(); run() }} role="search">
        <Sparkles size={compact ? 16 : 20} className="nl-spark" aria-hidden="true" />
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={EXAMPLES[ph]}
          aria-label="Describe your money question in plain language"
          autoComplete="off"
        />
        <button className="btn-primary" disabled={busy} type="submit">
          {busy ? 'Thinking…' : compact ? 'Ask' : <>Ask the SI <ArrowRight size={16} /></>}
        </button>
      </form>
      {err && <p className="nl-err" role="alert">{err}</p>}
      {!compact && (
        <div className="nl-chips" aria-label="Examples">
          {EXAMPLES.map((e) => (
            <button key={e} type="button" onClick={() => { setText(e); run(e) }}>{e}</button>
          ))}
        </div>
      )}
    </div>
  )
}
