export function quantile(sorted, q) {
  const pos = (sorted.length - 1) * q
  const lo = Math.floor(pos)
  const hi = Math.ceil(pos)
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo)
}

/** mat is row-major n×cols. Returns percentile bands per column. */
export function bandsFromMatrix(mat, n, cols) {
  const out = { p5: [], p25: [], p50: [], p75: [], p95: [] }
  const col = new Float64Array(n)
  for (let c = 0; c < cols; c++) {
    for (let i = 0; i < n; i++) col[i] = mat[i * cols + c]
    col.sort()
    out.p5.push(quantile(col, 0.05))
    out.p25.push(quantile(col, 0.25))
    out.p50.push(quantile(col, 0.5))
    out.p75.push(quantile(col, 0.75))
    out.p95.push(quantile(col, 0.95))
  }
  return out
}

export function histogram(sorted, bins = 28) {
  const lo = sorted[0]
  const hi = quantile(sorted, 0.995)
  const w = (hi - lo) / bins || 1
  const counts = new Array(bins).fill(0)
  for (const v of sorted) {
    const b = Math.min(bins - 1, Math.max(0, Math.floor((v - lo) / w)))
    counts[b]++
  }
  return counts.map((c, i) => ({ x: lo + i * w, x1: lo + (i + 1) * w, count: c }))
}

/** Share of values satisfying predicate. */
export const share = (arr, pred) => {
  let k = 0
  for (let i = 0; i < arr.length; i++) if (pred(arr[i])) k++
  return k / arr.length
}

/** Confidence in the central estimate, from how wide the simulated band is. */
export function confidenceFromBands(p5, p50, p95) {
  if (!(p50 > 0)) return 40
  const spread = (p95 - p5) / (2 * p50)
  return Math.round(Math.min(97, Math.max(35, 97 - spread * 45)))
}
