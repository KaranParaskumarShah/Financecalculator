# FinanceCalculator.si — SI Super Intelligence

Frontend-only React/Vite finance calculator platform.

## Run locally

1. Delete any older FinanceCalculator.si project folder.
2. Extract this project so `package.json` is in the project root.
3. Run:

```bash
npm install
npm run dev
```

Open `http://localhost:5173/`.

## Routes

Universal:
- `/compound-interest-calculator`
- `/inflation-calculator`

US:
- `/us/mortgage-calculator`
- `/us/auto-loan-calculator`
- `/us/paycheck-calculator`
- `/us/401k-retirement-calculator`
- `/us/credit-card-payoff-calculator`
- `/us/student-loan-payoff-calculator`
- `/us/home-equity-loan-heloc-calculator`
- `/us/debt-to-income-ratio-calculator`
- `/us/cd-calculator`

India:
- `/in/sip-calculator`
- `/in/loan-emi-calculator`
- `/in/income-tax-calculator`
- `/in/ppf-calculator`
- `/in/fd-calculator`
- `/in/gst-calculator`
- `/in/in-hand-salary-calculator`
- `/in/epf-gratuity-calculator`
- `/in/sukanya-samriddhi-yojana-calculator`
- `/in/swp-calculator`

## Routing stability

Calculator pages are resolved from the current pathname inside the app instead of relying on a generated React Router route for every calculator. This prevents regional calculator pages from falling through to `No routes matched location` when a route list changes.

Vercel and Cloudflare Pages SPA fallbacks are included.

## Privacy

The SI Financial Twin and scenario features use browser-local storage. No backend is required.
