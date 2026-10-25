// Optional Cloudflare Worker that lets the browser use Claude without exposing your key.
//   wrangler secret put ANTHROPIC_API_KEY
//   wrangler deploy worker/ai-proxy.js --name fc-si-ai --compatibility-date 2026-10-05
// Then set  VITE_AI_ENDPOINT=https://fc-si-ai.<you>.workers.dev  and rebuild the site.
//
// Lock ALLOWED_ORIGIN down to your own domain before going live.
const ALLOWED_ORIGIN = '*'
const MODEL = 'claude-sonnet-5-5'

const cors = {
  'access-control-allow-origin': ALLOWED_ORIGIN,
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers': 'content-type'
}

const SYSTEM = {
  parse: `You turn a person's plain-language money question into JSON for a calculator.
Return ONLY JSON: {"calc":"sip"|"emi"|"retirement","patch":{...},"reverse":null|{"mode":string,"target":number},"notes":[string],"currency":"INR"|"USD"|"EUR"|"GBP"|null}.
Field keys — sip: monthly, years, rate, stepUp, lump, goal, inflation, volatility. emi: principal, rate, years, extra, investReturn. retirement: age, retireAge, lifeExp, currentCorpus, monthlySave, monthlyExpense, inflation, preReturn, postReturn.
Reverse modes — sip:"sip" (target corpus) | "years"; emi:"afford" (EMI) | "debtfree" (years); retirement:"goal" (corpus) | "savings85" | "spend85".
Money in absolute units (2 Cr = 20000000). Only include what the user said or a clearly stated assumption (explain it in notes).`,
  narrate: `You are the voice of a finance calculator. Using ONLY the numbers in the JSON facts, write 2-3 plain-English sentences (max 90 words) explaining the result like a brilliant, calm financial mind. Never invent or change numbers. No advice beyond what the facts contain. No markdown.`
}

export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors })
    if (req.method !== 'POST') return new Response('POST only', { status: 405, headers: cors })
    const body = await req.json().catch(() => null)
    if (!body || !SYSTEM[body.task]) return new Response('bad request', { status: 400, headers: cors })
    const user = body.task === 'parse' ? `Currency hint: ${body.currency}\nText: ${String(body.text).slice(0, 500)}` : JSON.stringify(body.facts).slice(0, 4000)
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: MODEL, max_tokens: 500, system: SYSTEM[body.task], messages: [{ role: 'user', content: user }] })
    })
    if (!r.ok) return new Response('upstream error', { status: 502, headers: cors })
    const data = await r.json()
    const text = data?.content?.[0]?.text ?? ''
    let out
    if (body.task === 'parse') {
      try { out = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)) } catch { return new Response('bad model output', { status: 502, headers: cors }) }
    } else out = { text: text.trim() }
    return new Response(JSON.stringify(out), { headers: { ...cors, 'content-type': 'application/json' } })
  }
}
