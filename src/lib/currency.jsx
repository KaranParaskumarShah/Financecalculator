import React, { createContext, useContext, useMemo, useState, useCallback, useEffect } from 'react'
import { CURRENCIES, detectCurrency, makeFmt, profileOf } from './format.js'

const Ctx = createContext(null)

/** Pin a subtree to one currency (e.g. India-only tax rules). */
export function CurrencyLock({ code, children }) {
  const outer = useContext(Ctx)
  const value = useMemo(() => ({ ...outer, cur: code, fmt: makeFmt(code), profile: profileOf(code), locked: true }), [outer, code])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

const read = (k) => {
  try { return localStorage.getItem(k) } catch { return null }
}
const write = (k, v) => {
  try { localStorage.setItem(k, v) } catch {}
}

export function CurrencyProvider({ children }) {
  const [cur, setCurState] = useState(() => {
    const saved = read('fc-currency')
    return saved && CURRENCIES[saved] ? saved : detectCurrency()
  })
  const setCur = useCallback((c) => {
    if (!CURRENCIES[c]) return
    setCurState(c)
    write('fc-currency', c)
  }, [])
  const value = useMemo(() => ({ cur, setCur, fmt: makeFmt(cur), profile: profileOf(cur) }), [cur, setCur])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const useCurrency = () => useContext(Ctx)

export function useTheme() {
  const [theme, setThemeState] = useState(() => document.documentElement.getAttribute('data-theme') || 'dark')
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#070b18' : '#f4f7fd')
    write('fc-theme', theme)
  }, [theme])
  return [theme, setThemeState]
}
