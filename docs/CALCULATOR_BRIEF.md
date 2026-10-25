# Brief for building a calculator on the FinanceCalculator.si engine

Product idea: "Calculators are dumb. This one thinks." Every calculator must
1. COMPUTE live (no submit button), 2. EXPLAIN in plain language, 3. SIMULATE the future with thousands of scenarios (Monte Carlo, 5,000 paths, client-side), 4. ADVISE with specific quantified next moves (e.g. "Paying 8% extra monthly saves you 6 years and 4.2 lakh in interest").
Plus on every calculator: live insight (typewriter story + bullets + confidence), Monte Carlo cone with best/likely/worst + probability of success, tornado sensitivity, Time Machine, Regret Meter (cost of delay vs optimal), Reverse mode (state the goal → solve inputs), Compare mode (two scenarios + verdict), share card, currency/format switching. These shared UI pieces already exist; you only supply a CONFIG.

## Read first (in /home/claude/fcsi)
- docs/ARCHITECTURE.md  — the config contract (every key).
- src/calculators/sip/index.js, sip/SipLab.jsx, math/sip.js — the shortest worked example. Also emi/ and retirement/ for variety.
- src/calculators/fields.js, src/lib/{rng,stats,format}.js, src/components/calc/CalculatorPage.jsx (how ctx = {v, model, mc, an, f} is consumed), ConeChart.jsx, TimeMachine.jsx, Tornado.jsx, ReverseMode.jsx, CompareMode.jsx.
- tests/math.test.mjs for the testing style.
- src/calculators/meta.js — your calculator's entry (id, slug, name, feature line). Do NOT edit it.

## You create (and ONLY these; stubs already exist and are already registered)
- src/calculators/math/<id>.js   pure maths, no React, node-testable
- src/calculators/<id>/index.js  the config (replace the scaffold stub)
- src/calculators/<id>/<Lab>.jsx the flagship tab (replace stub Lab.jsx; may add more files in that folder, incl. a .css you import)
- tests/<id>.test.mjs            unit tests (node --test)
Do NOT edit any shared file (meta.js, calculators/index.js, fields.js, components/, lib/, styles/, scripts/, docs/). If you believe a shared file needs a change, say so in your final report instead. Other agents are working in sibling folders at the same time.

## Rules
- Every config key in the contract must be real and meaningful, not a placeholder. `simulate` needs genuine uncertainty relevant to the calculator (returns, inflation, rates, income, expenses, house prices...). Use `normals(stream, T)` from lib/rng.js with YOUR assigned stream id (below) and keep T ≤ 240. Results must be deterministic for the same inputs (common random numbers). `bands` arrays have one entry per `labels` entry. `sorted` is an ascending Float64Array of final outcomes (used for the histogram).
- Money fields: write ranges for the INR profile and give `profiles: { usd: {...} }` for all other currencies (see sip/index.js). `kind` is money|pct|years|age|select|text (select: `options:[{value,label}]`, numeric values; text: string field with `rows`, `placeholder`). `group: 'advanced'` for assumptions. `sens` on fields that should appear in the tornado. Defaults must produce an interesting, believable, non-degenerate result (probabilities not stuck at 0%/100%) in BOTH the inr and usd profiles.
- Insight text must be numerate and specific (quote computed numbers via ctx.f.money / f.duration), honest about uncertainty, never salesy. Tone arrays: good warn bad tip info. Quantified advice must be computed, not hard-coded.
- Honesty over flattery: where the answer is unfavourable (e.g. renting beats buying, the old tax regime loses), say so plainly.
- Each calculator has an extraordinary FLAGSHIP feature (below) built as the flagship tab component. Charts: use Recharts (already installed) or plain SVG/CSS; reuse existing CSS classes (.lab .sec-head .lead .callout .chart-box .rb-track .seg .btn-mini .tiny etc. — see src/styles/components.css) and CSS variables (--cyan --violet --green --amber --rose --muted --line --glass-in --text) so dark & light themes both work. Use `ChartTip` from components/calc/ChartTip.jsx for tooltips. The flagship component receives `{ ctx, onApply }`; `onApply(patchObject)` sets input values.
- Unique rng streams: compound=10 rentvsbuy=11 tax=12 card=13 networth=14 emergency=15 goal=16 inflation=17 cagr=18 (sip=1 emi=2,3 retirement=4 are taken).
- Accessibility: buttons/labels, no colour-only meaning, works at 390px width.

## Verify before reporting done
1. `cd /home/claude/fcsi && node --test tests/<id>.test.mjs` passes (test the maths against hand-computed or textbook values, plus invariants).
2. Browser test with your own dev server on your own port (do NOT run `npm run build` or touch dist/): `npx vite --port <PORT>` in the background (ports: agent A 5201, agent B 5202, agent C 5203; kill only your own process by PID, never `pkill -f`). Use Python Playwright with `executable_path='/opt/pw-browsers/chromium'`, visit http://localhost:<PORT>/<slug>, wait ~4s, capture console errors + pageerrors (ignore ERR_TUNNEL_CONNECTION_FAILED font failures), take screenshots (desktop 1360px, and 390px mobile), click every tab (flagship, What matters most, Time Machine, Regret Meter, Reverse mode, Compare) and check each renders without errors; look at the screenshots yourself and fix visual problems. Also switch currency to USD (select in header) and check the numbers look sensible, and check light theme once.
3. Final report (short): files created, what the flagship feature does, key modelling assumptions/caveats, anything in shared files you wish were different.
