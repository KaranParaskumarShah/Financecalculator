import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { CurrencyProvider } from './lib/currency.jsx'
import './styles/tokens.css'
import './styles/base.css'
import './styles/components.css'
import './styles/labs.css'

class Boundary extends React.Component {
  state = { err: null }
  static getDerivedStateFromError(err) { return { err } }
  render() {
    if (this.state.err) return <div className="container nf"><h1>Something broke.</h1><pre>{String(this.state.err)}</pre><button className="btn-primary" onClick={() => location.reload()}>Reload</button></div>
    return this.props.children
  }
}

createRoot(document.getElementById('root')).render(
  <Boundary>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <CurrencyProvider>
        <App />
      </CurrencyProvider>
    </BrowserRouter>
  </Boundary>
)
