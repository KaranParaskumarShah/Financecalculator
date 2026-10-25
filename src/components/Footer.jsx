import React from 'react'
import { Link } from 'react-router-dom'
import { LIVE } from '../calculators/meta.js'

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container foot">
        <div>
          <b className="foot-brand">FinanceCalculator<i>.si</i></b>
          <p>Calculators that compute, explain, simulate and advise.</p>
        </div>
        <nav aria-label="Calculators" className="foot-links">
          {LIVE.map((c) => <Link key={c.id} to={`/${c.slug}`}>{c.name}</Link>)}
        </nav>
        <p className="disclaimer-foot">
          <b>Disclaimer.</b> All results are estimates built from the assumptions you provide. Simulations show a range of possible outcomes, not predictions or guarantees. Nothing here is financial, investment, tax or legal advice; speak to a qualified professional before making decisions. All calculations run in your browser and nothing you enter is stored or sent anywhere.
        </p>
      </div>
    </footer>
  )
}
