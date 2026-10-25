import { SITE } from '../calculators/meta.js'

function setTag(selector, create, attrs) {
  let el = document.head.querySelector(selector)
  if (!el) {
    el = document.createElement(create)
    document.head.appendChild(el)
  }
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v))
}

export function applySeo({ title, description, path = '/', jsonLd }) {
  const url = SITE.url + path
  document.title = title
  setTag('meta[name="description"]', 'meta', { name: 'description', content: description })
  setTag('link[rel="canonical"]', 'link', { rel: 'canonical', href: url })
  setTag('meta[property="og:title"]', 'meta', { property: 'og:title', content: title })
  setTag('meta[property="og:description"]', 'meta', { property: 'og:description', content: description })
  setTag('meta[property="og:url"]', 'meta', { property: 'og:url', content: url })
  setTag('meta[property="og:type"]', 'meta', { property: 'og:type', content: 'website' })
  setTag('meta[name="twitter:card"]', 'meta', { name: 'twitter:card', content: 'summary_large_image' })
  setTag('meta[name="twitter:title"]', 'meta', { name: 'twitter:title', content: title })
  setTag('meta[name="twitter:description"]', 'meta', { name: 'twitter:description', content: description })
  const old = document.getElementById('ld-json')
  if (old) old.remove()
  if (jsonLd) {
    const s = document.createElement('script')
    s.type = 'application/ld+json'
    s.id = 'ld-json'
    s.textContent = JSON.stringify(jsonLd)
    document.head.appendChild(s)
  }
}
