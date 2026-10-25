import React from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { BookOpenText, ListChecks } from 'lucide-react'
import ChartTip from '../../components/calc/ChartTip.jsx'

const axis = { stroke: 'var(--axis)', tick: { fill: 'var(--muted)', fontSize: 12 }, tickLine: false }
const pct = (x, d = 1) => `${(x * 100).toFixed(d)}%`
const day = (t) => new Date(t).toISOString().slice(0, 10)

export default function PlainEnglishLab({ ctx }) {
  const { v, model, f } = ctx
  const a = model.a
  const parsed = a.parsed
  return (
    <div className="lab">
      <section>
        <header className="sec-head"><h3><BookOpenText size={17} /> What this means, in plain English</h3></header>
        {!model.valid ? <p className="note-box">{a.reason}</p> : (
          <>
            <p className="big-quote">Your money grew about <em>{pct(model.xirr)}</em> a year</p>
            <ul className="truths">
              <li>You put in {f.money(a.invested)} and ended with {f.money(a.returned)}: {a.multiple.toFixed(2)} times your money, a {a.gain >= 0 ? 'gain' : 'loss'} of {f.money(Math.abs(a.gain))}.</li>
              <li>XIRR is the single yearly rate that explains all your dated deposits and withdrawals. Money that stayed longer counts for more.</li>
              <li>{a.single ? `Because there was one deposit and one payout, the simple CAGR is the same: ${pct(a.cagr)}.` : 'A plain CAGR would be wrong here because you invested at different times. That is why XIRR is the honest number.'}</li>
              <li>After {v.inflation}% inflation, each year your buying power {model.real >= 0 ? 'grew' : 'shrank'} by about {pct(Math.abs(model.real))}.</li>
              <li>Against a {v.benchmark}% benchmark you are {model.vsBench >= 0 ? 'ahead' : 'behind'} by {f.money(Math.abs(model.vsBench))}.</li>
            </ul>
          </>
        )}
      </section>

      <section>
        <header className="sec-head"><h3><ListChecks size={17} /> What I understood from your paste</h3></header>
        <div className="mini-table">
          <div className="tr th cols3"><span>Line</span><span>Date</span><span>Amount</span></div>
          {parsed.rows.map((r) => (
            <div key={r.line} className="tr cols3">
              <span className={r.ok ? '' : 'flag-bad'}>{r.ok ? `#${r.line}` : `#${r.line} skipped`}</span>
              <span>{r.ok ? day(r.t) : r.error}</span>
              <b className={r.ok ? (r.amount < 0 ? 'c-rose' : 'c-green') : 'flag-bad'}>{r.ok ? `${r.amount < 0 ? '−' : '+'}${f.money(Math.abs(r.amount))}` : r.raw.slice(0, 22)}</b>
            </div>
          ))}
        </div>
        <p className="note-box">Accepted: 2024-03-15, 15/03/2024 (day first), 15 Mar 2024, Mar 15 2024. Amounts can include commas, ₹/$, brackets for negatives, and k / lakh / cr / m suffixes. Lines starting with # are ignored.</p>
      </section>

      {model.valid && (
        <section>
          <header className="sec-head"><h3>Your deposits versus a {v.benchmark}% benchmark</h3></header>
          <div className="chart-box" style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={model.rows} margin={{ top: 8, right: 14, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="var(--grid)" strokeDasharray="3 4" vertical={false} />
                <XAxis dataKey="x" tickFormatter={(m) => `${Math.round(m / 12 * 10) / 10}y`} interval={Math.max(1, Math.floor(model.rows.length / 8))} {...axis} />
                <YAxis tickFormatter={(n) => f.money(n)} {...axis} axisLine={false} width={74} />
                <Tooltip content={<ChartTip xFmt={(m) => `Month ${m}`} f={f} />} />
                <Area dataKey="benchmark" name={`At ${v.benchmark}%`} stroke="var(--violet)" fill="var(--violet)" fillOpacity={0.15} strokeWidth={2.2} isAnimationActive={false} />
                <Area dataKey="invested" name="Net money in" stroke="var(--cyan)" fill="var(--cyan)" fillOpacity={0.15} strokeWidth={2.2} isAnimationActive={false} type="stepAfter" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}
    </div>
  )
}
