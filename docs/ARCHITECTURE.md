# Architecture — how to add the next calculator

**One calculator = one config.** The page shell (inputs, hero, insight panel, Monte Carlo cone,
tornado, Time Machine, Regret Meter, Reverse mode, Compare mode, share card, SEO, routing, sitemap)
is generic. A calculator only supplies data and a few functions.

```
src/
  calculators/
    meta.js            ← names, slugs, SEO text, status 'live' | 'soon' (pure data; also read by scripts/postbuild.mjs)
    index.js           ← registry: CONFIGS = { sip, emi, retirement }
    fields.js          ← field helpers (per-currency ranges, clamping, URL/NL merge)
    math/              ← pure, unit-tested maths (no React). sip.js emi.js retirement.js
    sip/ emi/ retirement/
      index.js         ← the config
      *Lab.jsx         ← the calculator's flagship tab ("SIP Lab", "Debt Destroyer", "Stress Lab")
  components/calc/     ← the shared "super-intelligence" UI (do not fork per calculator)
  lib/
    nlp.js             ← offline natural-language parser          ai.js ← optional Claude layer
    rng.js stats.js    ← seeded normals, quantiles, histogram     share.js ← link + PNG card
    format.js          ← INR lakh/crore vs K/M/B, currency detect currency.jsx ← context + theme
worker/ai-proxy.js     ← optional Cloudflare Worker that keeps your Anthropic key server-side
scripts/               ← postbuild.mjs (per-route HTML + sitemap), new-calculator.mjs (scaffold)
```

## Add a calculator in 5 steps

1. `npm run new:calc -- compound "Compound Interest"` scaffolds `src/calculators/compound/`.
2. Put the maths in `src/calculators/math/compound.js` and unit-test it in `tests/`.
3. Fill in the config (contract below). `sip/index.js` is the shortest worked example.
4. In `meta.js` set the calculator's `status: 'live'`. In `index.js` import it and add it to `CONFIGS`.
5. `npm run build`. The route, header link, landing card, `<title>`/meta/JSON-LD page and sitemap entry appear automatically.

## Config contract

| key | returns | notes |
|---|---|---|
| `id` | string | matches `meta.js` |
| `fields[]` | `{key,label,kind,min,max,step,def,group,sens?,log?,hint?,profiles?}` | `kind`: money · pct · years · age. Written for INR; `profiles.usd` overrides apply to every other currency. `sens: {rel}` or `{abs}` puts the field in the tornado chart. `group: 'advanced'` tucks it under "Assumptions". |
| `compute(v)` | model | Fast, deterministic. Runs on every change. |
| `simulate(v)` | `{n,labels,bands:{p5,p25,p50,p75,p95},sorted,successProb,p5,p50,p95}` | Monte Carlo. Use `lib/rng.normals(stream, T)` so results stay smooth as sliders move. |
| `analyze(v,model,mc)` | object | Heavier extras reused by insights + the flagship tab. Optional. |
| `hero(ctx)` | `{label,value,raw,sub,stats[],gauge:{value,label}}` | `raw` is animated with a count-up. |
| `insights(ctx)` | `{headline,bullets:[{tone,text}],confidence,facts}` | `headline` is typed out; `facts` goes to the optional Claude narrator. Tones: good warn bad tip info. |
| `cone(ctx)` | chart spec | `rows` of `{x,p5..p95}`, optional `lines`, `goal`, `marker`, `yMax`, legend text, histogram title. |
| `sensitivity` | `{metric,outcome(v),higherIsBetter,format}` | Drives the "What matters most" tornado. |
| `timeline(ctx)` | `{xName,xFmt,rows,series,caption(row)}` | Drives the Time Machine. |
| `regret(ctx)` | `{headline,sub,bars:[{label,cost,note}],optimal:{title,text,gap}}` | Cost of delay vs the optimal move. |
| `reverse.modes[]` | `{id,label,target:field,solve(v,target,f)→{answer,patch,text}}` | `patch` is applied to the inputs by the "Apply" button. |
| `compare` | `{preset(v), rows:[{label,get(ctx),fmt,better,headline?,risk?}]}` | The verdict text is generated from the rows. |
| `share(ctx)` | `{title,bigLabel,big,lines[],chart,chartLabel}` | Rendered to the PNG card. |
| `flagship` | `{label, component}` | Your signature feature as a React tab. |

`ctx = { v, model, mc, an, f }` where `f` is the currency formatter (`f.money`, `f.duration`).

## Natural-language bar
`lib/nlp.js` maps free text to `{calc, patch, reverse, notes}`. To teach it a new calculator add
a keyword to `detectIntent` and a branch in "assemble per calculator". `reverse: {mode,target}`
must match a `reverse.modes[].id`. With `VITE_AI_ENDPOINT` set, Claude parses first and the local
parser is the fallback.

## Modelling conventions (keep these so calculators agree)
- Deterministic and Monte Carlo share the same expected growth (`ln(1+r)` minus half-variance drag).
- Common random numbers: one fixed normal matrix per stream, so sliders don't make the cone jitter.
- Success probability is always a share of simulated paths, never a formula.
- Stress tests are stylised, labelled as illustrations, never forecasts.
