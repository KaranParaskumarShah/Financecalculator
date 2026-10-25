import React, { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { BrainCircuit, Menu, Moon, Sun, X } from 'lucide-react'
import { useCurrency, useTheme } from '../lib/currency.jsx'
import { CURRENCIES } from '../lib/format.js'
import { LIVE } from '../calculators/meta.js'

export default function Header() {
  const { cur, setCur } = useCurrency()
  const [theme, setTheme] = useTheme()
  const [open, setOpen] = useState(false)
  return (
    <header className="site-header">
      <div className="container bar">
        <Link to="/" className="brand" onClick={() => setOpen(false)} aria-label="FinanceCalculator.si home">
          <span className="logo"><BrainCircuit size={18} /></span>
          <span>FinanceCalculator<i>.si</i></span>
        </Link>
        <nav className={`nav ${open ? 'open' : ''}`} aria-label="Main">
          {LIVE.slice(0, 3).map((c) => (
            <NavLink key={c.id} to={`/${c.slug}`} onClick={() => setOpen(false)}>{c.name.split(' / ')[0]}</NavLink>
          ))}
          <Link to="/#calculators" onClick={() => setOpen(false)}>All calculators</Link>
          <Link to="/#how" onClick={() => setOpen(false)}>How it thinks</Link>
        </nav>
        <div className="head-actions">
          <label className="cur-select" title="Currency & number format">
            <span className="sr">Currency</span>
            <select value={cur} onChange={(e) => setCur(e.target.value)}>
              {Object.entries(CURRENCIES).map(([k, c]) => <option key={k} value={k}>{k} {c.symbol.trim()}</option>)}
            </select>
          </label>
          <button className="icon-btn" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </button>
          <button className="icon-btn menu" onClick={() => setOpen((o) => !o)} aria-label="Menu" aria-expanded={open}>{open ? <X size={18} /> : <Menu size={18} />}</button>
        </div>
      </div>
    </header>
  )
}
