import { useEffect, useState } from 'react'

/** Types `text` out character by character. Restarts when text changes. */
export function useTypewriter(text, { speed = 14, enabled = true } = {}) {
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!enabled) return
    const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) { setN(text.length); return }
    setN(0)
    let i = 0
    const id = setInterval(() => {
      i += 2
      setN(Math.min(i, text.length))
      if (i >= text.length) clearInterval(id)
    }, speed)
    return () => clearInterval(id)
  }, [text, speed, enabled])
  return { shown: enabled ? text.slice(0, n) : '', done: enabled && n >= text.length }
}

/** Animated number: eases toward `target`. */
export function useCountUp(target, duration = 600) {
  const [val, setVal] = useState(target)
  useEffect(() => {
    if (!Number.isFinite(target)) return
    const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) { setVal(target); return }
    let raf
    const from = val
    const t0 = performance.now()
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / duration)
      const e = 1 - Math.pow(1 - p, 3)
      setVal(from + (target - from) * e)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration])
  return val
}
