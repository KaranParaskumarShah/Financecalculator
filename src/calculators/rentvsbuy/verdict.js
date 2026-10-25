// Honest verdict written from the numbers. It says "rent" when renting wins and "too close" when it is.
export function buyRentVerdict({ v, adv, mc, be, bApp, bRent, f }) {
  const p = mc.successProb
  const pct = Math.round(p * 100)
  const gap = f.money(Math.abs(adv))
  let tag, tone, text
  if (adv > 0 && p >= 0.65) {
    tag = 'Buying wins'; tone = 'good'
    text = `On these numbers buying leaves you ${gap} ahead after ${v.horizon} years, and it wins in ${pct}% of simulated futures. That holds only if you really stay ${be ? `past year ${Math.ceil(be / 12)}` : 'that long'}: selling early burns the buying and selling costs.`
  } else if (adv < 0 && p <= 0.35) {
    tag = 'Renting wins'; tone = 'warn'
    text = `Renting and investing the difference leaves you ${gap} ahead after ${v.horizon} years, and renting wins in ${100 - pct}% of simulated futures. Buying here means paying a lot for interest, upkeep and fees while the home has to appreciate faster than ${bApp != null ? `${bApp.toFixed(1)}%` : 'is realistic'} a year just to break even.`
  } else {
    tag = 'Too close to call'; tone = 'info'
    text = `${adv >= 0 ? 'Buying' : 'Renting'} is ahead by ${gap} after ${v.horizon} years, but buying wins in only ${pct}% of simulated futures, which is close to a coin flip. Decide on things the model can't price: stability, freedom to move, and how you would feel if prices fell.`
  }
  const truths = []
  if (bApp != null) truths.push(`Home prices need to rise about ${bApp.toFixed(1)}% a year for buying to break even (you assumed ${v.appreciation}%).`)
  if (bRent != null) truths.push(`Buying breaks even if your rent today is about ${f.money(bRent)} a month (it is ${f.money(v.rent)}).`)
  else truths.push('Buying wins at any rent you could realistically pay.')
  return { tag, tone, text, truths }
}
