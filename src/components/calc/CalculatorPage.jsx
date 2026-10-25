import React, { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ArrowLeftRight, ChevronRight, Columns2, Crosshair, History, Hourglass, Sparkles, X } from 'lucide-react'
import { useCurrency } from '../../lib/currency.jsx'
import { applySeo } from '../../lib/seo.js'
import { decodeState, encodeState, shareUrl } from '../../lib/share.js'
import { profileOf } from '../../lib/format.js'
import { SITE } from '../../calculators/meta.js'
import { clampField, defaultsFor, mergeValues, resolveFields } from '../../calculators/fields.js'
import InputPanel from './InputPanel.jsx'
import ResultHero from './ResultHero.jsx'
import InsightPanel from './InsightPanel.jsx'
import ConeChart from './ConeChart.jsx'
import Tornado from './Tornado.jsx'
import TimeMachine from './TimeMachine.jsx'
import RegretMeter from './RegretMeter.jsx'
import ReverseMode from './ReverseMode.jsx'
import CompareMode from './CompareMode.jsx'
import ShareModal from './ShareModal.jsx'
import NLBar from '../NLBar.jsx'

export default function CalculatorPage({ config, meta }) {
  const { cur, setCur, fmt, profile } = useCurrency()
  const loc = useLocation()
  const urlState = useMemo(() => decodeState(new URLSearchParams(loc.search).get('s') || ''), []) // read once
  const initProfile = profileOf(urlState?.c || cur)
  const [values, setValues] = useState(() => mergeValues(config, initProfile, urlState?.v))
  const nl = loc.state?.nl
  const [banner, setBanner] = useState(Boolean(nl))
  const [tab, setTab] = useState(nl?.reverse ? 'reverse' : 'flagship')
  const [sharing, setSharing] = useState(false)
  const profRef = useRef(initProfile)

  useEffect(() => { if (urlState?.c && urlState.c !== cur) setCur(urlState.c) }, []) // eslint-disable-line
  useEffect(() => {
    if (profRef.current !== profile) {
      profRef.current = profile
      setValues(defaultsFor(config, profile))
    }
  }, [profile, config])

  const fields = useMemo(() => resolveFields(config, profile), [config, profile])
  const setValue = (k, x) => setValues((p) => ({ ...p, [k]: x }))
  const applyPatch = (patch) =>
    setValues((p) => {
      const out = { ...p }
      for (const [k, x] of Object.entries(patch)) {
        const fl = fields.find((q) => q.key === k)
        if (fl?.kind === 'text') out[k] = String(x)
        else if (fl?.kind === 'select') out[k] = +x
        else if (fl && Number.isFinite(+x)) out[k] = Math.min(fl.max * 10, Math.max(fl.min, +x))
      }
      return out
    })

  // Heavy work runs on the deferred copy so typing & dragging stay instant.
  const v = useDeferredValue(values)
  const model = useMemo(() => config.compute(v), [config, v])
  const mc = useMemo(() => config.simulate(v), [config, v])
  const an = useMemo(() => (config.analyze ? config.analyze(v, model, mc) : {}), [config, v, model, mc])
  const ctx = useMemo(() => ({ v, model, mc, an, f: fmt }), [v, model, mc, an, fmt])
  const hero = useMemo(() => config.hero(ctx), [config, ctx])
  const insight = useMemo(() => config.insights(ctx), [config, ctx])
  const cone = useMemo(() => config.cone(ctx), [config, ctx])
  const timeline = useMemo(() => (tab === 'time' ? config.timeline(ctx) : null), [config, ctx, tab])

  // SEO
  useEffect(() => {
    applySeo({
      title: `${meta.title} | ${SITE.name}`,
      description: meta.description,
      path: `/${meta.slug}`,
      jsonLd: { '@context': 'https://schema.org', '@type': 'WebApplication', name: meta.name + ' Calculator', url: `${SITE.url}/${meta.slug}`, description: meta.description, applicationCategory: 'FinanceApplication', operatingSystem: 'Any', offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' } }
    })
  }, [meta])

  // keep the URL shareable
  useEffect(() => {
    const t = setTimeout(() => {
      try { history.replaceState(history.state, '', `${loc.pathname}?s=${encodeState({ c: cur, v: values })}`) } catch {}
    }, 600)
    return () => clearTimeout(t)
  }, [values, cur, loc.pathname])

  const Flag = config.flagship.component
  const tabs = [
    { id: 'flagship', label: config.flagship.label, icon: Sparkles },
    { id: 'sens', label: 'What matters most', icon: Crosshair },
    { id: 'time', label: 'Time Machine', icon: History },
    { id: 'regret', label: 'Regret Meter', icon: Hourglass },
    { id: 'reverse', label: 'Reverse mode', icon: ArrowLeftRight },
    { id: 'compare', label: 'Compare', icon: Columns2 }
  ]

  return (
    <div className="container calc-page">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to="/">Home</Link><ChevronRight size={13} /><span>{meta.name}</span>
      </nav>
      <header className="calc-head">
        <div>
          <h1>{meta.name} Calculator</h1>
          <p>{meta.feature}</p>
        </div>
        <NLBar compact />
      </header>

      {config.currencyLock && <p className="lock-note">This calculator uses {config.currencyLock} because it follows {config.lockReason || 'country-specific rules'}.</p>}

      {banner && nl && (
        <div className="nl-banner glass" role="status">
          <Sparkles size={16} />
          <div>
            <b>I read: “{nl.text}”</b>
            <span>Filled {Object.keys(nl.patch).length} field{Object.keys(nl.patch).length === 1 ? '' : 's'} for you.{nl.notes?.length ? ' ' + nl.notes.join(' ') : ''}</span>
          </div>
          <button onClick={() => setBanner(false)} aria-label="Dismiss"><X size={15} /></button>
        </div>
      )}

      <div className="calc-layout">
        <InputPanel fields={fields} values={values} setValue={setValue} onReset={() => setValues(defaultsFor(config, profile))} name={meta.name} />

        <main className="results" id="results">
          <ResultHero hero={hero} f={fmt} onShare={() => setSharing(true)} />
          <InsightPanel insight={insight} />
          <ConeChart cone={cone} mc={mc} f={fmt} />

          <section className="tabs-card glass">
            <div className="tabs" role="tablist" aria-label="Super intelligence tools">
              {tabs.map((t) => (
                <button key={t.id} role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)}>
                  <t.icon size={15} /> <span>{t.label}</span>
                </button>
              ))}
            </div>
            <div className="tab-body" role="tabpanel">
              {tab === 'flagship' && <Flag ctx={ctx} onApply={applyPatch} />}
              {tab === 'sens' && <Tornado config={config} fields={fields} v={v} f={fmt} />}
              {tab === 'time' && timeline && <TimeMachine tl={timeline} f={fmt} />}
              {tab === 'regret' && <RegretMeter rg={config.regret(ctx)} f={fmt} />}
              {tab === 'reverse' && <ReverseMode config={config} v={v} f={fmt} profile={profile} onApply={applyPatch} initial={nl?.reverse} />}
              {tab === 'compare' && <CompareMode config={config} fields={fields} v={v} f={fmt} ctxA={ctx} />}
            </div>
          </section>

          <p className="disclaimer">Results are estimates based on the assumptions you enter, not financial advice. Simulated outcomes are not predictions.</p>
        </main>
      </div>

      <div className="peek" aria-hidden="true">
        <span>{hero.label}</span><b>{hero.value}</b><em>{Math.round(hero.gauge.value * 100)}%</em>
      </div>

      {sharing && <ShareModal name={meta.name} card={config.share(ctx)} url={shareUrl(meta.slug, cur, values)} onClose={() => setSharing(false)} />}
    </div>
  )
}
