import React from 'react'
import { Coins, ShoppingBasket } from 'lucide-react'
import { EXAMPLES, priceIndex } from '../math/inflation.js'

export default function PurchasingPowerLab({ ctx }) {
  const { v, model, mc, f } = ctx
  const list = EXAMPLES[f.cur === 'INR' ? 'inr' : 'usd']
  const [mode, setMode] = React.useState('past')
  const idx = model.idx
  return (
    <div className="lab">
      <section>
        <header className="sec-head"><h3><Coins size={17} /> Both directions</h3></header>
        <p className="big-quote">Your <em>{f.money(v.amount)}</em> in {v.years} years buys what <em>{f.money(model.cash)}</em> buys today</p>
        <div className="cols2">
          <div className="note-box"><b>If you hold it</b><p>{f.money(v.amount)} later = {f.money(model.cash)} now. That is {Math.round(model.loss * 100)}% of its buying power gone.</p></div>
          <div className="note-box"><b>To stay even</b><p>You need {f.money(model.needed)} in {v.years} years to buy what {f.money(v.amount)} buys today.</p></div>
        </div>
        <div className="kv-grid">
          <div className="kv"><span>Prices multiply by</span><b>{idx.toFixed(2)}×</b></div>
          <div className="kv"><span>Cash halves in</span><b>{Number.isFinite(model.halving) ? `${model.halving.toFixed(1)} yrs` : 'never'}</b></div>
          <div className="kv"><span>Bad luck (5%)</span><b>{mc.idxP95.toFixed(2)}×</b></div>
          <div className="kv"><span>Good luck (5%)</span><b>{mc.idxP5.toFixed(2)}×</b></div>
        </div>
      </section>

      <section>
        <header className="sec-head"><h3><ShoppingBasket size={17} /> What it means in real life</h3></header>
        <div className="pill-row">
          <button className={`pill ${mode === 'past' ? 'on' : ''}`} onClick={() => setMode('past')}>Your money, future prices</button>
          <button className={`pill ${mode === 'cost' ? 'on' : ''}`} onClick={() => setMode('cost')}>Future price of today’s items</button>
        </div>
        <div className="mini-table">
          {mode === 'past' ? (
            <>
              <div className="tr th cols3"><span>You could buy</span><span>Today</span><span>In {v.years} yrs</span></div>
              {list.map((e) => {
                const now = v.amount / e.price
                const later = v.amount / (e.price * idx)
                return <div key={e.label} className="tr cols3"><span>{e.label}</span><b>{Math.round(now).toLocaleString()}</b><span className="c-rose">{Math.round(later).toLocaleString()}</span></div>
              })}
            </>
          ) : (
            <>
              <div className="tr th cols3"><span>One {''}item</span><span>Today</span><span>In {v.years} yrs</span></div>
              {list.map((e) => <div key={e.label} className="tr cols3"><span>1 {e.unit}</span><b>{f.money(e.price)}</b><span className="c-rose">{f.money(e.price * idx)}</span></div>)}
            </>
          )}
        </div>
        <p className="note-box" style={{ marginTop: 10 }}>These prices are rough, indicative figures to make the idea tangible, not live data. Your city will differ. The multiplier ({idx.toFixed(2)}×) is what matters.</p>
      </section>

      <section>
        <header className="sec-head"><h3>Real return, honestly</h3></header>
        <p className="lead">A {v.invest}% return with {v.inflation}% inflation is a real return of <b>{model.rr.toFixed(2)}%</b>. {model.rr > 0 ? `Your buying power grows by about ${Math.round((model.real / v.amount - 1) * 100)}% over ${v.years} years.` : 'The balance rises, but it buys less every year.'} Across simulations, inflation surprises leave you ahead in {Math.round(mc.successProb * 100)}% of futures.</p>
      </section>
    </div>
  )
}
