export function prepayVerdict(p, v, f) {
  const wins = Math.round(p.probInvestWins * 100)
  if (v.rate >= v.investReturn - 1)
    return { tag: 'Prepay', tone: 'good', text: `Prepay. Your loan costs ${v.rate}% — a guaranteed, risk-free return — and investing at ${v.investReturn}% beats it in only ${wins}% of simulations.` }
  if (p.probInvestWins >= 0.7 && p.medianDiff > 0)
    return { tag: 'Invest', tone: 'info', text: `Invest the extra. Markets beat your ${v.rate}% loan in ${wins}% of simulations, with a median edge of ${f.money(p.medianDiff)} — but the worst 5% of outcomes trail prepaying by ${f.money(Math.abs(Math.min(0, p.p5)))}.` }
  return { tag: 'Split / prepay', tone: 'warn', text: `A close call: investing wins in ${wins}% of simulations. Prepaying is a certain ${v.rate}% return, so unless you can stomach the downside, prepay — or split the extra 50/50.` }
}
