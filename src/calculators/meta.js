// Pure data — imported by the app AND by scripts/postbuild.mjs (sitemap + per-route HTML),
// so keep this file free of React/JSX.

export const SITE = {
  name: 'FinanceCalculator.si',
  url: 'https://financecalculator.si',
  tagline: 'Calculators are dumb. This one thinks.',
  description:
    'Finance calculators with a Super Intelligence layer: live answers, plain-English explanations, 5,000 Monte Carlo simulations and quantified next moves. SIP, EMI, retirement and more.'
}

// status: 'live' calculators have a config in src/calculators/index.js; 'soon' ones are the queue.
export const CALCULATOR_META = [
  {
    id: 'sip', slug: 'sip-calculator', status: 'live', icon: 'TrendingUp',
    name: 'SIP / Mutual Fund', short: 'Monte Carlo wealth cone',
    title: 'SIP Calculator with Monte Carlo Simulation, Step-up & Goal Probability',
    description: 'Plan your SIP with 5,000 simulated market paths. See best, likely and worst-case corpus, the probability of hitting your goal, the best step-up and the cost of missing a single SIP month.',
    feature: 'Wealth cone · step-up optimizer · cost of a missed SIP',
    keywords: ['SIP calculator', 'mutual fund calculator', 'step-up SIP calculator', 'SIP return calculator', 'Monte Carlo SIP']
  },
  {
    id: 'emi', slug: 'emi-calculator', status: 'live', icon: 'Landmark',
    name: 'EMI / Loan', short: 'Debt Destroyer',
    title: 'EMI Calculator with Prepayment Strategy & Prepay-or-Invest Verdict',
    description: 'Calculate your loan EMI, then find the fastest payoff path. Compare prepayment strategies, watch interest vs principal over time, and get a probability-based prepay-or-invest verdict.',
    feature: 'Debt Destroyer · interest/principal waterfall · prepay-or-invest',
    keywords: ['EMI calculator', 'loan calculator', 'home loan EMI', 'loan prepayment calculator', 'prepay or invest']
  },
  {
    id: 'retirement', slug: 'retirement-calculator', status: 'live', icon: 'Sunset',
    name: 'Retirement / FIRE', short: 'Will your money last?',
    title: 'Retirement & FIRE Calculator — Probability Your Money Lasts, Crash Stress Tests',
    description: 'Find the probability you never run out of money, the earliest age you can retire, and how your plan survives 2008-style and 2020-style crashes and high inflation.',
    feature: 'Probability of success · earliest retirement age · crash stress tests',
    keywords: ['retirement calculator', 'FIRE calculator', 'early retirement calculator', 'retirement corpus calculator', 'will my money last']
  },
  { id: 'compound', slug: 'compound-interest-calculator', status: 'live', icon: 'Clock', name: 'Compound Interest', short: 'Time Machine + Rule of 72', title: 'Compound Interest Calculator', description: 'See compound interest through time, with the Rule of 72 and the cost of starting 5 years late.', feature: 'Time Machine · Rule of 72 · "start 5 years earlier"' },
  { id: 'rentvsbuy', slug: 'home-loan-vs-rent-calculator', status: 'live', icon: 'Home', name: 'Home Loan vs Rent', short: 'Honest breakeven year', title: 'Buy vs Rent Calculator', description: 'Full buy-vs-rent breakeven with opportunity cost, and an honest verdict.', feature: 'Breakeven year · opportunity cost · AI verdict' },
  { id: 'tax', slug: 'income-tax-calculator', status: 'live', icon: 'Receipt', name: 'Income Tax', short: 'Old vs new regime', title: 'Income Tax Calculator', description: 'Compare the old and new Indian tax regimes line by line, see which saves you more, and get ranked deduction suggestions (80C, NPS, 80D, HRA) with the exact tax each one saves.', feature: 'Regime comparison · deduction finder' },
  { id: 'card', slug: 'credit-card-calculator', status: 'live', icon: 'CreditCard', name: 'Credit Card', short: 'The 15-year trap', title: 'Credit Card Payoff Calculator', description: 'See how paying only the minimum on a credit card becomes a 15-year trap, the true cost of any purchase, and a payoff plan that clears the balance faster.', feature: 'True Cost revealer · payoff plan' },
  { id: 'networth', slug: 'net-worth-calculator', status: 'live', icon: 'Gauge', name: 'Net Worth Tracker', short: 'Health score /100', title: 'Net Worth Calculator', description: 'Work out your net worth, project it with 5,000 simulated futures, and get a financial health score out of 100 with your weakest link and the exact fix.', feature: 'Health score · weakest link' },
  { id: 'emergency', slug: 'emergency-fund-calculator', status: 'live', icon: 'LifeBuoy', name: 'Emergency Fund & Budget', short: 'Your safe runway', title: 'Emergency Fund & Budget Calculator', description: 'How many months can you survive without income? Plus an automatic 50/30/20 split.', feature: 'Safe runway · 50/30/20' },
  { id: 'goal', slug: 'savings-goal-calculator', status: 'live', icon: 'Target', name: 'Savings Goal', short: '"Will I make it?" gauge', title: 'Savings Goal Calculator', description: 'Turn a savings goal into a monthly plan and see the real probability that you make it, with the saving needed for 50, 70, 85 and 95% confidence.', feature: 'Goal-to-monthly plan · probability gauge' },
  { id: 'inflation', slug: 'inflation-calculator', status: 'live', icon: 'Flame', name: 'Inflation Impact', short: 'What money really buys', title: 'Inflation Calculator', description: 'See what today’s money will really be worth after inflation, with relatable examples, the money you need to stay even, and the return needed to beat rising prices.', feature: 'Purchasing-power examples' },
  { id: 'cagr', slug: 'cagr-xirr-calculator', status: 'live', icon: 'LineChart', name: 'CAGR / XIRR', short: 'Paste cash flows', title: 'CAGR & XIRR Calculator', description: 'Paste dated cash flows and get your XIRR and CAGR explained in plain English, compared with a benchmark and inflation, with a forward projection.', feature: 'Paste cash flows · plain-English result' }
]

export const LIVE = CALCULATOR_META.filter((c) => c.status === 'live')
export const bySlug = (slug) => CALCULATOR_META.find((c) => c.slug === slug)
export const byId = (id) => CALCULATOR_META.find((c) => c.id === id)

// Old URLs from the previous version of the site → new flagship pages.
export const REDIRECTS = {
  '/in/sip-calculator': '/sip-calculator',
  '/in/loan-emi-calculator': '/emi-calculator',
  '/us/mortgage-calculator': '/emi-calculator',
  '/us/auto-loan-calculator': '/emi-calculator',
  '/us/401k-retirement-calculator': '/retirement-calculator'
}
