import React from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CreditCard, ReceiptText, Route } from 'lucide-react'
import ChartTip from '../../components/calc/ChartTip.jsx'
import { useCountUp } from '../../lib/useTypewriter.js'

const axis = { stroke: 'var(--axis)', tick: { fill: 'var(--muted)', fontSize: 12 }, tickLine: false }
const yrs = (m) => (m >= 24 ? `${(m / 12).toFixed(1)} years` : `${m} months`)

export default function TrueCostLab({ ctx, onApply }) {
  const { v, model, f } = ctx
  const tc = model.tc
  const shown = useCountUp(tc.paidMore)
  const b = model.base
  const data = React.useMemo(() => {
    const N = Math.min(240, Math.max(b.months, model.mine.months)) + 1
    return Array.from({ length: Math.ceil(N / 3) }, (_, i) => { const m = i * 3; return { m, minimum: b.path[m] ?? 0, plan: model.mine.path[m] ?? 0 } })
  }, [b, model])
  const first = v.balance * (v.apr / 1200)
  return (
    <div className="lab">
      <section>
        <header className="sec-head"><h3><ReceiptText size={17} /> The true cost revealer</h3></header>
        <p className="big-quote">A <em>{f.money(v.purchase)}</em> purchase on this card really costs <em>{f.money(shown)}</em></p>
        <div className="kv-grid">
          <div className="kv"><span>Price tag</span><b>{f.money(v.purchase)}</b></div>
          <div className="kv"><span>You actually pay</span><b className="c-rose">{f.money(tc.paidMore)}</b></div>
          <div className="kv"><span>Of which interest</span><b>{f.money(tc.interestMore)}</b></div>
          <div className="kv"><span>Multiple</span><b>{tc.multiple.toFixed(1)}×</b></div>
        </div>
        <p className="note-box">If you pay only the minimum, it also keeps you in debt {tc.monthsMore} months longer. Change the purchase amount under “Advanced” on the left.</p>
        <p className="lead">This month, <b>{f.money(first)}</b> of your first payment is pure interest. At the minimum of {f.money(model.min0)}, only {f.money(Math.max(0, model.min0 - first))} reduces the debt.</p>
      </section>

      <section>
        <header className="sec-head"><h3><Route size={17} /> The minimum-payment trap</h3></header>
        <p className="lead">Minimums only: <b className="c-rose">{b.never ? 'never' : yrs(b.months)}</b> · Your plan: <b className="c-green">{model.mine.never ? 'never' : yrs(model.mine.months)}</b></p>
        <div className="chart-box" style={{ height: 250 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 14, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="var(--grid)" strokeDasharray="3 4" vertical={false} />
              <XAxis dataKey="m" tickFormatter={(m) => `${Math.round(m / 12)}y`} interval={Math.max(1, Math.floor(data.length / 8))} {...axis} />
              <YAxis tickFormatter={(n) => f.money(n)} {...axis} axisLine={false} width={74} />
              <Tooltip content={<ChartTip xFmt={(m) => `Month ${m}`} f={f} />} />
              <Line dataKey="minimum" name="Minimums only" stroke="var(--rose)" strokeWidth={2.6} dot={false} />
              <Line dataKey="plan" name="Your plan" stroke="var(--green)" strokeWidth={2.6} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section>
        <header className="sec-head"><h3><CreditCard size={17} /> Payoff plans</h3></header>
        <div className="mini-table">
          <div className="tr th cols4"><span>Debt-free in</span><span>Pay monthly</span><span>Interest saved</span><span /></div>
          {model.plans.map((p) => (
            <div key={p.months} className="tr cols4">
              <b>{yrs(p.months)}</b><span>{f.money(p.pay)}</span><span className="c-green">{f.money(Math.max(0, p.saved))}</span>
              <button className="btn-mini" style={{ margin: 0 }} onClick={() => onApply({ extra: Math.round(p.extraOverMin / 100) * 100, targetMonths: p.months })}>Apply</button>
            </div>
          ))}
        </div>
        <p className="note-box" style={{ marginTop: 10 }}>Plans assume you stop adding new spending to the card. A fixed payment beats a shrinking minimum because the balance falls at a steady pace.</p>
      </section>
    </div>
  )
}
