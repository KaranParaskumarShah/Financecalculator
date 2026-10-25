import React, { useEffect, useMemo } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ArrowRight, BrainCircuit, Calculator, Dices, FileText, Lightbulb, Lock, Zap } from 'lucide-react'
import NLBar from './components/NLBar.jsx'
import CalculatorPage from './components/calc/CalculatorPage.jsx'
import { iconFor } from './components/icons.js'
import { CALCULATOR_META, SITE } from './calculators/meta.js'
import { CONFIGS } from './calculators/index.js'
import { applySeo } from './lib/seo.js'
import { useCurrency, CurrencyLock } from './lib/currency.jsx'
import { defaultsFor } from './calculators/fields.js'
import { useTypewriter } from './lib/useTypewriter.js'

function HeroDemo() {
  const { fmt, profile } = useCurrency()
  const cfg = CONFIGS.sip
  const demo = useMemo(() => {
    const v = defaultsFor(cfg, profile)
    const model = cfg.compute(v)
    const mc = cfg.simulate(v)
    const an = cfg.analyze(v, model, mc)
    return { v, mc, ins: cfg.insights({ v, model, mc, an, f: fmt }) }
  }, [profile, fmt])
  const { shown } = useTypewriter(demo.ins.bullets[0].text, { speed: 18 })
  const { bands, labels } = demo.mc
  const W = 360, H = 170
  const max = Math.max(...bands.p95)
  const px = (i) => (i / (labels.length - 1)) * W
  const py = (x) => H - (x / max) * (H - 8)
  const area = bands.p95.map((x, i) => `${i ? 'L' : 'M'}${px(i)},${py(x)}`).join('') + [...bands.p5].reverse().map((x, i) => `L${px(labels.length - 1 - i)},${py(x)}`).join('') + 'Z'
  const line = bands.p50.map((x, i) => `${i ? 'L' : 'M'}${px(i)},${py(x)}`).join('')
  return (
    <div className="demo glass" aria-label="Live example from the engine">
      <div className="demo-top"><span className="orb"><BrainCircuit size={14} /></span><b>Live from the engine</b><em>5,000 simulations</em></div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Wealth cone">
        <defs><linearGradient id="dg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--cyan)" stopOpacity=".4" /><stop offset="1" stopColor="var(--violet)" stopOpacity=".08" /></linearGradient></defs>
        <path d={area} fill="url(#dg)" />
        <path d={line} fill="none" stroke="var(--green)" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <p className="demo-text">{shown}<span className="caret" /></p>
    </div>
  )
}

const PILLARS = [
  { icon: Zap, t: 'Compute', d: 'Instant, live answers. No submit button, ever.' },
  { icon: FileText, t: 'Explain', d: 'Plain-language reasoning, like a brilliant financial mind talking to you.' },
  { icon: Dices, t: 'Simulate', d: '5,000 futures in your browser: best, likely and worst case with a probability of success.' },
  { icon: Lightbulb, t: 'Advise', d: 'Specific, quantified next moves, not generic tips.' }
]
const FEATURES = [
  ['Ask in plain English', 'Type “retire at 50 with 2 Cr, I earn 80k/month” and the right calculator fills itself in.'],
  ['Monte Carlo engine', 'Thousands of market paths, with best, likely and worst bands and the probability you succeed.'],
  ['What matters most', 'A tornado chart ranks which input moves your outcome the most.'],
  ['Time Machine', 'Drag through the years and watch money, debt and net worth evolve.'],
  ['Regret Meter', 'See what waiting costs, and how far you are from the optimal move.'],
  ['Reverse mode', 'State the goal. The app solves for the saving, SIP or payment you need.'],
  ['Compare mode', 'Two scenarios side by side with a plain-English verdict.'],
  ['Share card', 'A clean image and a link that re-creates your exact numbers.'],
  ['Your currency', 'INR, USD, EUR, GBP and more, with lakh/crore or million/billion formatting.']
]

export function Home() {
  useEffect(() => {
    applySeo({
      title: `${SITE.name} — ${SITE.tagline}`,
      description: SITE.description,
      path: '/',
      jsonLd: { '@context': 'https://schema.org', '@type': 'WebSite', name: SITE.name, url: SITE.url, description: SITE.description }
    })
  }, [])
  const loc = useLocation()
  useEffect(() => {
    if (loc.hash) setTimeout(() => document.querySelector(loc.hash)?.scrollIntoView({ behavior: 'smooth' }), 50)
  }, [loc.hash])
  return (
    <>
      <section className="container hero">
        <div className="hero-copy">
          <span className="eyebrow"><BrainCircuit size={14} /> Super Intelligence for your money</span>
          <h1>Calculators are dumb.<br /><span className="grad">This one thinks.</span></h1>
          <p className="sub">Every calculator here computes, explains, simulates thousands of futures and tells you exactly what to do next. Start by just saying what you want.</p>
          <NLBar />
        </div>
        <HeroDemo />
      </section>

      <section className="container pillars" aria-label="What every calculator does">
        {PILLARS.map((p) => (
          <div key={p.t} className="pillar glass"><p.icon size={20} /><b>{p.t}</b><span>{p.d}</span></div>
        ))}
      </section>

      <section className="container" id="calculators">
        <div className="sec-title"><h2>Pick a calculator</h2><p>Twelve calculators, one engine. Each one computes, explains, simulates 5,000 futures and advises.</p></div>
        <div className="grid">
          {CALCULATOR_META.map((c) => {
            const Icon = iconFor(c.icon)
            const live = c.status === 'live'
            const inner = (
              <>
                <div className="card-top"><span className="card-ic"><Icon size={20} /></span><span className={`badge ${live ? 'live' : ''}`}>{live ? 'Live' : 'Queued'}</span></div>
                <h3>{c.name}</h3>
                <p>{c.feature}</p>
                {live && <span className="go">Open <ArrowRight size={15} /></span>}
              </>
            )
            return live ? (
              <Link key={c.id} to={`/${c.slug}`} className="card glass live">{inner}</Link>
            ) : (
              <div key={c.id} className="card glass soon" aria-disabled="true">{inner}</div>
            )
          })}
        </div>
      </section>

      <section className="container" id="how">
        <div className="sec-title"><h2>How it thinks</h2><p>The same super-intelligence layer sits on every calculator.</p></div>
        <div className="features">
          {FEATURES.map(([t, d]) => (
            <div key={t} className="feat glass"><b>{t}</b><span>{d}</span></div>
          ))}
        </div>
        <p className="privacy"><Lock size={15} /> All maths and simulations run in your browser. No login. Nothing you enter is stored.</p>
      </section>
    </>
  )
}

export function CalculatorRoute({ id }) {
  const loc = useLocation()
  const meta = CALCULATOR_META.find((m) => m.id === id)
  const page = <CalculatorPage key={loc.key} config={CONFIGS[id]} meta={meta} />
  const lock = CONFIGS[id].currencyLock
  return lock ? <CurrencyLock code={lock}>{page}</CurrencyLock> : page
}

export function NotFound() {
  useEffect(() => applySeo({ title: `Page not found | ${SITE.name}`, description: SITE.description, path: '/' }), [])
  return (
    <div className="container nf">
      <Calculator size={40} />
      <h1>That page does not compute.</h1>
      <p>Try one of the calculators instead.</p>
      <Link className="btn-primary" to="/">Back home</Link>
    </div>
  )
}
