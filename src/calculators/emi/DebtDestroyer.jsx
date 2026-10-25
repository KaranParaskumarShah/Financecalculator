import React, { useMemo, useState } from 'react'
import { Flame, RefreshCw, Scale, Trophy } from 'lucide-react'
import { prepayVerdict } from './verdict.js'

function Waterfall({ yearly, f }) {
  const [run, setRun] = useState(0)
  const max = Math.max(1, ...yearly.map((y) => y.interest + y.principal))
  const cross = yearly.find((y) => y.principal > y.interest)
  return (
    <div className="waterfall">
      <div className="wf-head">
        <div className="legend-row">
          <span><i style={{ background: 'var(--rose)' }} />Interest</span>
          <span><i style={{ background: 'var(--cyan)' }} />Principal</span>
        </div>
        <button className="chip-btn" onClick={() => setRun((r) => r + 1)}><RefreshCw size={14} /> Replay</button>
      </div>
      <div className="wf-bars" key={run} role="img" aria-label="Yearly split of your payments between interest and principal">
        {yearly.map((y, i) => {
          const total = y.interest + y.principal
          return (
            <div key={y.year} className="wf-col" title={`Year ${y.year}: ${f.money(y.interest)} interest, ${f.money(y.principal)} principal`}>
              <div className="wf-stack" style={{ height: `${(total / max) * 100}%` }}>
                <i className="wf-int" style={{ height: `${(y.interest / total) * 100}%`, animationDelay: `${i * 45}ms` }} />
                <i className="wf-prin" style={{ height: `${(y.principal / total) * 100}%`, animationDelay: `${i * 45 + 120}ms` }} />
              </div>
              <span>{y.year % 5 === 0 || yearly.length <= 10 ? y.year : ''}</span>
            </div>
          )
        })}
      </div>
      <p className="tiny center">Years →  {cross ? `From year ${cross.year}, more of each payment reduces the loan than feeds the bank.` : 'Interest dominates for the entire loan.'}</p>
    </div>
  )
}

export default function DebtDestroyer({ ctx }) {
  const { v, model, an, f } = ctx
  const { s, p } = an
  const [withExtra, setWithExtra] = useState(v.extra > 0)
  const yearly = (withExtra ? model.mine : model.base).yearly
  const maxSaved = Math.max(1, ...s.rows.map((r) => r.interestSaved))
  const verdict = useMemo(() => prepayVerdict(p, v, f), [p, v, f.cur])

  return (
    <div className="lab">
      <section>
        <header className="sec-head"><h3><Flame size={17} /> Debt Destroyer: the fastest way out</h3></header>
        <p className="lead">Same loan, different payoff paths. Ranked by interest saved, with the extra cash each path needs.</p>
        <div className="strat">
          {[...s.rows].sort((a, b) => b.interestSaved - a.interestSaved).map((r) => (
            <div key={r.id} className={`strat-row ${s.best && r.id === s.best.id ? 'best' : ''}`}>
              <div className="strat-top">
                <b>{r.label}{s.best && r.id === s.best.id && <em><Trophy size={12} /> fastest</em>}</b>
                <span>{r.id === 'base' ? `Debt-free in ${f.duration(r.months)}` : `${f.duration(r.monthsSaved)} sooner · saves ${f.money(r.interestSaved)}`}</span>
              </div>
              <div className="rb-track"><i className="good" style={{ width: `${(r.interestSaved / maxSaved) * 100}%` }} /></div>
              {r.id !== 'base' && <small>Extra cash paid: {f.money(r.extraPaid)} · returns {r.efficiency.toFixed(2)} in interest saved per 1 paid</small>}
            </div>
          ))}
        </div>
      </section>

      <section>
        <header className="sec-head">
          <h3>Where every payment goes</h3>
          <div className="seg small">
            <button className={!withExtra ? 'on' : ''} onClick={() => setWithExtra(false)}>EMI only</button>
            <button className={withExtra ? 'on' : ''} onClick={() => setWithExtra(true)} disabled={v.extra <= 0}>With my extra</button>
          </div>
        </header>
        <Waterfall yearly={yearly} f={f} />
      </section>

      <section>
        <header className="sec-head"><h3><Scale size={17} /> Prepay or invest?</h3></header>
        <div className={`verdict-card tone-${verdict.tone}`}>
          <span className="vtag">{verdict.tag}</span>
          <p>{verdict.text}</p>
        </div>
        <div className="pvi">
          <div className="pvi-bar" aria-label={`Investing wins in ${Math.round(p.probInvestWins * 100)}% of simulations`}>
            <i className="inv" style={{ width: `${p.probInvestWins * 100}%` }}>Invest wins {Math.round(p.probInvestWins * 100)}%</i>
            <i className="pre" style={{ width: `${(1 - p.probInvestWins) * 100}%` }}>Prepay wins {Math.round((1 - p.probInvestWins) * 100)}%</i>
          </div>
          <div className="pvi-stats">
            <div><span>If prepaid ({f.money(p.M)}/mo), then invest the freed EMI</span><b>{f.money(p.detPrepay)}</b></div>
            <div><span>If you invest {f.money(p.M)}/mo instead</span><b>{f.money(p.detInvest)}</b></div>
            <div><span>Median edge of investing</span><b className={p.medianDiff >= 0 ? 'c-green' : 'c-rose'}>{p.medianDiff >= 0 ? '+' : '−'}{f.money(Math.abs(p.medianDiff))}</b></div>
            <div><span>Bad luck (5th pct) / good luck (95th)</span><b>{f.money(p.p5)} / {f.money(p.p95)}</b></div>
          </div>
          <p className="tiny">Both choices face the same simulated market, compared at the original loan end date. Returns are pre-tax; prepaying is risk-free, investing is not.</p>
        </div>
      </section>
    </div>
  )
}
