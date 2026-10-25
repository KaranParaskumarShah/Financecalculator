# FinanceCalculator.si — Super Intelligence

> Calculators are dumb. This one thinks.

A client-side React + Vite app. Every calculator **computes** live, **explains** in plain language,
**simulates** 5,000 futures in your browser and **advises** with quantified next moves. No login,
no backend, nothing stored.

**Built:** landing page · natural-language bar · **12 calculators** — SIP, EMI/Loan, Retirement/FIRE, Compound Interest,
Home Loan vs Rent, Income Tax (India, old vs new regime, FY 2026-27), Credit Card, Net Worth, Emergency Fund & Budget,
Savings Goal, Inflation Impact and CAGR/XIRR. Each has every super-intelligence feature (live insight with typewriter +
confidence, Monte Carlo cone, tornado sensitivity, Time Machine, Regret Meter, Reverse mode, Compare mode, share card,
currency switcher with lakh/crore ↔ million/billion) plus its own flagship lab tab.

## Run
```bash
npm install
npm run dev        # http://localhost:5173
npm test           # maths + NL parser unit tests
npm run build      # dist/ with a pre-rendered HTML page, meta tags and JSON-LD per calculator + sitemap.xml
```

## URLs
`/` · `/sip-calculator` · `/emi-calculator` · `/retirement-calculator` · `/compound-interest-calculator` · `/home-loan-vs-rent-calculator` · `/income-tax-calculator` · `/credit-card-calculator` · `/net-worth-calculator` · `/emergency-fund-calculator` · `/savings-goal-calculator` · `/inflation-calculator` · `/cagr-xirr-calculator`.
Old URLs (`/in/sip-calculator`, `/in/loan-emi-calculator`, `/us/mortgage-calculator`, …) redirect to the nearest new page (see `REDIRECTS` in `src/calculators/meta.js`).
Share links carry the scenario in `?s=…`.

## Deploy
Cloudflare Workers static assets (`wrangler.jsonc`, `npm run deploy`) or Vercel (`vercel.json`) — both keep SPA fallback.
Build command `npm run build`, output `dist`.

## Optional: Claude
Works fully offline with the built-in parser and rule-based insight text. To let Claude read the natural-language bar and
narrate insights, deploy `worker/ai-proxy.js` (your Anthropic key stays a Worker secret), then set `VITE_AI_ENDPOINT`
(see `.env.example`) and rebuild. If the call fails the app silently falls back to local text. Claude is only given
numbers the engine already computed.

## Add the rest
See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md). `npm run new:calc -- compound "Compound Interest"` scaffolds one.

## Honest notes
- Simulations use lognormal returns with your volatility input. They are illustrations of risk, not forecasts.
- Retirement stress tests are stylised shocks on a 60/40 portfolio, not exact historical replays.
- EMI "prepay vs invest" is pre-tax and compares both arms on the same simulated market.
- Fonts load from Google Fonts; swap for self-hosted files if you need zero third-party requests.
- Estimates only, not financial advice (also shown in the footer).

## Caveats worth knowing
- **Income tax** models a salaried resident individual under FY 2026-27 rules (slabs, standard deduction, 87A rebate with marginal relief, surcharge, 4% cess; old-regime 80C/80CCD(1B)/80D/24(b)/HRA). Capital gains and special-rate income are not modelled. Re-check the constants at the top of `src/calculators/math/tax.js` every Budget. Estimates, not tax advice.
- **Inflation** everyday prices are indicative, not live data.
- **Net worth** health-score benchmarks (20% savings rate, 6 months of cash, etc.) are rules of thumb.
- **Emergency fund** months-of-cover is a guideline built from dependents, job stability and debt load.
