// Deterministic random numbers. Standard-normal matrices are generated once per
// "stream" and reused (common random numbers), so Monte Carlo results move
// smoothly as sliders move instead of jittering.

export function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const cache = new Map()
export const MAX_SIMS = 5000

/** Returns {data, stride}; element (i, t) is data[i*stride + t]. Dimensions are fixed per stream. */
export function normals(stream, T) {
  let c = cache.get(stream)
  if (!c) {
    const data = new Float32Array(MAX_SIMS * T)
    const rng = mulberry32(1337 + stream * 7919)
    for (let i = 0; i < data.length; i += 2) {
      const u = rng() || 1e-12
      const v = rng()
      const r = Math.sqrt(-2 * Math.log(u))
      data[i] = r * Math.cos(2 * Math.PI * v)
      if (i + 1 < data.length) data[i + 1] = r * Math.sin(2 * Math.PI * v)
    }
    c = { data, stride: T }
    cache.set(stream, c)
  }
  return c
}
