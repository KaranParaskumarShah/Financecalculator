import React, { useEffect, useRef, useState } from 'react'
import { Copy, Download, Link2, X, Check } from 'lucide-react'
import { renderShareCard } from '../../lib/share.js'

export default function ShareModal({ card, url, onClose, name }) {
  const [blobUrl, setBlobUrl] = useState(null)
  const [blob, setBlob] = useState(null)
  const [copied, setCopied] = useState(false)
  const closeRef = useRef()

  useEffect(() => {
    let alive = true
    let u
    renderShareCard(card).then((b) => {
      if (!alive) return
      setBlob(b)
      u = URL.createObjectURL(b)
      setBlobUrl(u)
    })
    return () => { alive = false; if (u) URL.revokeObjectURL(u) }
  }, [card])

  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1800) } catch { window.prompt('Copy this link', url) }
  }
  const nativeShare = async () => {
    try {
      const file = blob && new File([blob], 'financecalculator-si.png', { type: 'image/png' })
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: card.title, text: card.lines[0], url })
      else if (navigator.share) await navigator.share({ title: card.title, text: card.lines[0], url })
      else copy()
    } catch {}
  }

  return (
    <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal glass" role="dialog" aria-modal="true" aria-label="Share your result">
        <button ref={closeRef} className="modal-x" onClick={onClose} aria-label="Close"><X size={18} /></button>
        <h3>Share your {name} result</h3>
        <div className="share-preview">{blobUrl ? <img src={blobUrl} alt={`${card.title}: ${card.big}`} /> : <div className="skeleton" />}</div>
        <div className="share-actions">
          {blobUrl && <a className="btn-primary" href={blobUrl} download="financecalculator-si-result.png"><Download size={15} /> Download image</a>}
          <button className="btn-ghost" onClick={copy}>{copied ? <><Check size={15} /> Link copied</> : <><Link2 size={15} /> Copy link with my numbers</>}</button>
          {navigator.share && <button className="btn-ghost" onClick={nativeShare}><Copy size={15} /> Share…</button>}
        </div>
        <p className="tiny">The link re-creates this exact scenario for anyone who opens it. Your numbers are in the link itself, not on a server.</p>
      </div>
    </div>
  )
}
