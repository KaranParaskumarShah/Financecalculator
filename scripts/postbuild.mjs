// After `vite build`: write a real HTML file (own <title>, description, canonical, OG tags, JSON-LD)
// for every live calculator, plus sitemap.xml. Search engines get per-URL meta without running JS.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { SITE, CALCULATOR_META } from '../src/calculators/meta.js'

const dist = new URL('../dist/', import.meta.url)
const html = readFileSync(new URL('index.html', dist), 'utf8')
const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
const live = CALCULATOR_META.filter((c) => c.status === 'live')

for (const c of live) {
  const url = `${SITE.url}/${c.slug}`
  const title = `${c.title} | ${SITE.name}`
  const ld = { '@context': 'https://schema.org', '@type': 'WebApplication', name: `${c.name} Calculator`, url, description: c.description, applicationCategory: 'FinanceApplication', operatingSystem: 'Any', offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' } }
  let out = html
    .replace(/<title>.*?<\/title>/, `<title>${esc(title)}</title>`)
    .replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${esc(c.description)}" />`)
    .replace(/<link rel="canonical"[^>]*>/, `<link rel="canonical" href="${url}" />`)
    .replace('</head>', `    <meta name="keywords" content="${esc((c.keywords || []).join(', '))}" />\n    <meta property="og:title" content="${esc(title)}" />\n    <meta property="og:description" content="${esc(c.description)}" />\n    <meta property="og:url" content="${url}" />\n    <meta property="og:type" content="website" />\n    <meta name="twitter:card" content="summary_large_image" />\n    <script type="application/ld+json" id="ld-json">${JSON.stringify(ld)}</script>\n  </head>`)
  mkdirSync(new URL(`${c.slug}/`, dist), { recursive: true })
  writeFileSync(new URL(`${c.slug}/index.html`, dist), out)
}

const today = new Date().toISOString().slice(0, 10)
const urls = [SITE.url + '/', ...live.map((c) => `${SITE.url}/${c.slug}`)]
writeFileSync(new URL('sitemap.xml', dist), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${u}</loc><lastmod>${today}</lastmod></url>`).join('\n')}\n</urlset>\n`)
writeFileSync(new URL('robots.txt', dist), `User-agent: *\nAllow: /\nSitemap: ${SITE.url}/sitemap.xml\n`)
console.log(`postbuild: ${live.length} calculator pages + sitemap.xml`)
