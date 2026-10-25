// Optional Claude layer. Everything works without it: if VITE_AI_ENDPOINT is not set
// (or the call fails), the local rule-based engine produces the text instead.
//
// The endpoint is a tiny proxy you deploy yourself (see worker/ai-proxy.js) so your
// Anthropic API key never reaches the browser.
const ENDPOINT = import.meta.env.VITE_AI_ENDPOINT

export const aiEnabled = Boolean(ENDPOINT)

async function post(body, ms = 7000) {
  const ctl = new AbortController()
  const t = setTimeout(() => ctl.abort(), ms)
  try {
    const r = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctl.signal
    })
    if (!r.ok) throw new Error(String(r.status))
    return await r.json()
  } finally {
    clearTimeout(t)
  }
}

/** Ask Claude to map free text onto a calculator. Returns the same shape as lib/nlp.parseIntent, or null. */
export async function aiParse(text, currency) {
  if (!ENDPOINT) return null
  try {
    const j = await post({ task: 'parse', text, currency })
    if (j && j.calc && j.patch) return { ok: true, notes: [], reverse: null, ...j, ai: true }
  } catch {}
  return null
}

/** Ask Claude to narrate the facts we computed. Returns a string or null. Never invents numbers: facts are passed in. */
export async function aiNarrate(facts) {
  if (!ENDPOINT) return null
  try {
    const j = await post({ task: 'narrate', facts })
    return typeof j?.text === 'string' ? j.text : null
  } catch {
    return null
  }
}
