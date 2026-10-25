// npm run new:calc -- <id> "<Display Name>"
// Scaffolds src/calculators/<id>/ from the template and prints the two lines to add.
import { mkdirSync, writeFileSync, existsSync } from 'node:fs'
const [id, ...rest] = process.argv.slice(2)
const name = rest.join(' ') || id
if (!id || !/^[a-z][a-z0-9]*$/.test(id)) { console.error('usage: npm run new:calc -- <id> "<Display Name>"   (id: lowercase letters/digits)'); process.exit(1) }
const dir = new URL(`../src/calculators/${id}/`, import.meta.url)
if (existsSync(dir)) { console.error(`src/calculators/${id} already exists`); process.exit(1) }
mkdirSync(dir, { recursive: true })
writeFileSync(new URL('index.js', dir), `import { confidenceFromBands } from '../../lib/stats.js'
import Lab from './Lab.jsx'

// See docs/ARCHITECTURE.md for what each key must return. Copy sip/index.js for a worked example.
export default {
  id: '${id}',
  flagship: { label: '${name} Lab', component: Lab },
  fields: [
    // { key: 'amount', label: 'Amount', kind: 'money', min: 1000, max: 1e7, step: 1000, def: 100000, group: 'main', sens: { rel: 0.2 }, profiles: { usd: { min: 50, max: 1e5, step: 50, def: 5000 } } },
  ],
  compute: (v) => ({}),            // fast, deterministic model
  simulate: (v) => { throw new Error('return { n, labels, bands:{p5,p25,p50,p75,p95}, sorted, successProb, p5, p50, p95 }') },
  analyze: (v, model, mc) => ({}), // heavier extras shared by insights + flagship tab
  hero: (ctx) => { throw new Error('return { label, value, raw, sub, stats:[], gauge:{ value, label } }') },
  insights: (ctx) => { throw new Error('return { headline, bullets:[{tone,text}], confidence, facts }') },
  cone: (ctx) => { throw new Error('return { title, xName, xFmt, rows, lines, legend, successLabel, endpoints, histTitle }') },
  sensitivity: { metric: 'result', outcome: (v) => 0, higherIsBetter: true, format: (n, f) => f.money(n) },
  timeline: (ctx) => { throw new Error('return { xName, xFmt, rows, series, caption }') },
  regret: (ctx) => { throw new Error('return { headline, sub, bars, optimal }') },
  reverse: { modes: [] },
  compare: { preset: (v) => ({}), rows: [] },
  share: (ctx) => { throw new Error('return { title, bigLabel, big, lines, chart, chartLabel }') }
}
`)
writeFileSync(new URL('Lab.jsx', dir), `import React from 'react'

export default function Lab({ ctx, onApply }) {
  return <div className="lab"><p className="lead">${name}: your flagship feature goes here. ctx has v, model, mc, an, f.</p></div>
}
`)
console.log(`\nCreated src/calculators/${id}/\n\n1) src/calculators/meta.js  → set this calculator's status to 'live' (or add an entry with id '${id}')\n2) src/calculators/index.js → import ${id} from './${id}/index.js' and add it to CONFIGS\n\nThe route, nav link, sitemap entry, SEO page and landing card appear automatically.`)
