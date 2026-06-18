import { useCallback, useEffect, useState } from 'react'

// Tutoriel guidé (coach marks) : assombrit la page sauf la/les zone(s) ciblée(s),
// avec une bulle explicative. Navigation Précédent / Suivant / Passer.
export default function Tour({ steps, onClose }) {
  const [i, setI] = useState(0)
  const [rects, setRects] = useState({ primary: null, extra: [] })
  const step = steps[i]
  const isLast = i === steps.length - 1

  const rectOf = (el) => {
    const r = el.getBoundingClientRect()
    return { top: r.top, left: r.left, width: r.width, height: r.height }
  }

  const measure = useCallback(() => {
    const el = document.querySelector(`[data-tour="${step.target}"]`)
    const extra = (step.extra || [])
      .map((t) => document.querySelector(`[data-tour="${t}"]`))
      .filter(Boolean)
      .map(rectOf)
    setRects({ primary: el ? rectOf(el) : null, extra })
  }, [step])

  useEffect(() => {
    const el = document.querySelector(`[data-tour="${step.target}"]`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    const t = setTimeout(measure, 380)
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => {
      clearTimeout(t)
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [step, measure])

  // Action à l'entrée d'une étape (ex. animation surface / préparation des mois).
  useEffect(() => {
    steps[i]?.onEnter?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i])

  const next = useCallback(() => {
    if (isLast) {
      onClose()
      if (step.clickOnFinish) {
        setTimeout(() => document.querySelector(`[data-tour="${step.target}"]`)?.click(), 60)
      }
    } else {
      setI((v) => v + 1)
    }
  }, [isLast, onClose, step])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowRight' || e.key === 'Enter') next()
      else if (e.key === 'ArrowLeft' && i > 0) setI((v) => v - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [next, onClose, i])

  const vw = typeof window !== 'undefined' ? window.innerWidth : 1280
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800
  const pad = 8
  // Le header (sticky) doit rester assombri : aucun trou ne remonte au-dessus de lui.
  const headerH = (typeof document !== 'undefined' && document.querySelector('header')?.offsetHeight) || 80

  const spotOf = (r) =>
    r && { top: r.top - pad, left: r.left - pad, width: r.width + pad * 2, height: r.height + pad * 2 }

  // Déborde au-delà des bords d'écran (sauf le haut, réservé au header) → bords nets.
  const bleed = (s, b = 28) => {
    let l = s.left
    let t = s.top
    let r = s.left + s.width
    let bo = s.top + s.height
    if (l <= b) l = -b
    if (r >= vw - b) r = vw + b
    if (bo >= vh - b) bo = vh + b
    if (t < headerH) t = headerH // ne jamais empiéter sur le header
    return { left: l, top: t, width: r - l, height: Math.max(0, bo - t) }
  }

  const primary = spotOf(rects.primary)
  const holes = [primary, ...rects.extra.map(spotOf)].filter(Boolean).map((h) => bleed(h))
  const interactive = step.interactive && primary
  const ringSpot = primary ? bleed(primary) : null

  // Position de la bulle (basée sur la cible principale), sans recouvrir la cible.
  const W = 340
  const BH = 210
  let bubble = { top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: W }
  if (primary) {
    const m = 14
    const clampX = (x) => Math.max(m, Math.min(x, vw - W - m))
    const clampY = (y) => Math.max(m, Math.min(y, vh - BH - m))
    const spaceBelow = vh - (primary.top + primary.height)
    const spaceAbove = primary.top
    const spaceRight = vw - (primary.left + primary.width)
    const spaceLeft = primary.left
    if (spaceBelow >= BH + m) {
      bubble = { top: primary.top + primary.height + m, left: clampX(primary.left + primary.width / 2 - W / 2), width: W }
    } else if (spaceAbove >= BH + m) {
      bubble = { bottom: vh - primary.top + m, left: clampX(primary.left + primary.width / 2 - W / 2), width: W }
    } else if (spaceRight >= W + m) {
      bubble = { top: clampY(primary.top + primary.height / 2 - BH / 2), left: primary.left + primary.width + m, width: W }
    } else if (spaceLeft >= W + m) {
      bubble = { top: clampY(primary.top + primary.height / 2 - BH / 2), left: primary.left - m - W, width: W }
    } else {
      bubble = { top: clampY(primary.top + primary.height / 2 - BH / 2), left: clampX(primary.left + primary.width / 2 - W / 2), width: W }
    }
  }

  return (
    <div className="fixed inset-0 z-[90] pointer-events-none">
      {/* Bloqueur de clics (la racine est pointer-events-none) */}
      {interactive ? (
        <>
          <div className="absolute left-0 right-0 top-0 pointer-events-auto" style={{ height: Math.max(0, primary.top) }} />
          <div className="absolute left-0 right-0 bottom-0 pointer-events-auto" style={{ top: primary.top + primary.height }} />
          <div className="absolute left-0 pointer-events-auto" style={{ top: primary.top, height: primary.height, width: Math.max(0, primary.left) }} />
          <div className="absolute right-0 pointer-events-auto" style={{ top: primary.top, height: primary.height, left: primary.left + primary.width }} />
        </>
      ) : (
        <div className="absolute inset-0 pointer-events-auto" />
      )}

      {/* Assombrissement via masque SVG (trous nets, plusieurs zones possibles) */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <defs>
          <mask id="tour-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {holes.map((h, k) => (
              <rect key={k} x={h.left} y={h.top} width={h.width} height={h.height} rx="14" ry="14" fill="black" />
            ))}
          </mask>
        </defs>
        <rect x="0" y="0" width="100%" height="100%" fill="rgba(11,28,48,0.6)" mask="url(#tour-mask)" />
      </svg>

      {/* Anneau de surbrillance sur la cible principale */}
      {ringSpot && (
        <div
          className={'absolute rounded-xl ring-2 ring-primary pointer-events-none transition-all duration-300 ' + (interactive ? 'animate-pulse' : '')}
          style={{ top: ringSpot.top, left: ringSpot.left, width: ringSpot.width, height: ringSpot.height }}
        />
      )}

      {/* Bulle explicative */}
      <div
        className="absolute bg-surface rounded-2xl p-5 card-shadow-lifted border border-outline-variant/40 flex flex-col gap-3 pointer-events-auto"
        style={bubble}
      >
        <div className="flex items-center justify-between">
          <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
            Étape {i + 1} / {steps.length}
          </span>
          <button type="button" onClick={onClose} className="text-on-surface-variant hover:text-on-surface" aria-label="Passer le tutoriel">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <h4 className="font-headline-md text-headline-md text-on-surface leading-tight">{step.title}</h4>
        <p className="font-body-sm text-body-sm text-on-surface-variant">{step.text}</p>

        <div className="flex flex-col gap-3 mt-1">
          <div className="flex gap-1.5 justify-center">
            {steps.map((_, k) => (
              <span key={k} className={`w-1.5 h-1.5 rounded-full ${k === i ? 'bg-primary' : 'bg-outline-variant'}`} />
            ))}
          </div>
          <div className="flex items-center justify-end gap-2">
            {i > 0 && (
              <button
                type="button"
                onClick={() => setI((v) => v - 1)}
                className="font-label-md text-label-md text-on-surface-variant hover:text-on-surface px-3 py-2 whitespace-nowrap"
              >
                Précédent
              </button>
            )}
            <button
              type="button"
              onClick={next}
              className="bg-primary-container text-on-primary-fixed font-label-md text-label-md px-4 py-2 rounded-xl hover:brightness-95 transition flex items-center gap-1 whitespace-nowrap"
            >
              {isLast ? step.finishLabel || 'Terminer' : 'Suivant'}
              <span className="material-symbols-outlined text-[18px]">{isLast ? 'check' : 'arrow_forward'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
