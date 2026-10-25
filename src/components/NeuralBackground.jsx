import React, { useEffect, useRef } from 'react'

// Subtle animated neural grid. Pauses when the tab is hidden, honours reduced-motion.
export default function NeuralBackground() {
  const ref = useRef(null)
  useEffect(() => {
    const cv = ref.current
    const ctx = cv.getContext('2d')
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    let w = 0
    let h = 0
    let nodes = []
    let raf
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const colors = () => {
      const dark = document.documentElement.getAttribute('data-theme') !== 'light'
      return dark ? { dot: '120,160,255', line: '90,140,255', a: 0.5 } : { dot: '70,90,200', line: '80,100,210', a: 0.3 }
    }
    const resize = () => {
      w = innerWidth
      h = innerHeight
      cv.width = w * dpr
      cv.height = h * dpr
      cv.style.width = w + 'px'
      cv.style.height = h + 'px'
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const n = Math.max(28, Math.min(70, Math.floor((w * h) / 24000)))
      nodes = Array.from({ length: n }, () => ({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - 0.5) * 0.18, vy: (Math.random() - 0.5) * 0.18 }))
    }
    const draw = () => {
      const c = colors()
      ctx.clearRect(0, 0, w, h)
      for (const p of nodes) {
        if (!reduce) {
          p.x += p.vx
          p.y += p.vy
          if (p.x < 0 || p.x > w) p.vx *= -1
          if (p.y < 0 || p.y > h) p.vy *= -1
        }
      }
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x
          const dy = nodes[i].y - nodes[j].y
          const d = dx * dx + dy * dy
          if (d < 150 * 150) {
            ctx.strokeStyle = `rgba(${c.line},${(1 - Math.sqrt(d) / 150) * 0.22 * c.a * 2})`
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.moveTo(nodes[i].x, nodes[i].y)
            ctx.lineTo(nodes[j].x, nodes[j].y)
            ctx.stroke()
          }
        }
      }
      ctx.fillStyle = `rgba(${c.dot},${c.a})`
      for (const p of nodes) {
        ctx.beginPath()
        ctx.arc(p.x, p.y, 1.6, 0, 7)
        ctx.fill()
      }
      if (!reduce && !document.hidden) raf = requestAnimationFrame(draw)
    }
    const onVis = () => { cancelAnimationFrame(raf); if (!document.hidden) draw() }
    resize()
    draw()
    addEventListener('resize', resize)
    document.addEventListener('visibilitychange', onVis)
    const mo = new MutationObserver(() => draw())
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => {
      cancelAnimationFrame(raf)
      removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', onVis)
      mo.disconnect()
    }
  }, [])
  return <canvas ref={ref} className="neural" aria-hidden="true" />
}
