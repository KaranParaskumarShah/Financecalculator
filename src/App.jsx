import React, { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Header from './components/Header.jsx'
import Footer from './components/Footer.jsx'
import NeuralBackground from './components/NeuralBackground.jsx'
import { CalculatorRoute, Home, NotFound } from './pages.jsx'
import { LIVE, REDIRECTS } from './calculators/meta.js'

function ScrollTop() {
  const { pathname, hash } = useLocation()
  useEffect(() => { if (!hash) window.scrollTo(0, 0) }, [pathname, hash])
  return null
}

export default function App() {
  return (
    <>
      <NeuralBackground />
      <ScrollTop />
      <Header />
      <div className="page">
        <Routes>
          <Route path="/" element={<Home />} />
          {LIVE.map((c) => <Route key={c.id} path={`/${c.slug}`} element={<CalculatorRoute id={c.id} />} />)}
          {Object.entries(REDIRECTS).map(([from, to]) => <Route key={from} path={from} element={<Navigate to={to} replace />} />)}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
      <Footer />
    </>
  )
}
