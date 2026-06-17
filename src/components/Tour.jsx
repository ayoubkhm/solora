import { useCallback, useEffect, useState } from 'react'

// Tutoriel guidé (coach marks) : met en surbrillance un élément (data-tour="…")
// et affiche une bulle explicative. Navigation Précédent / Suivant / Passer.
export default function Tour({ steps, onClose }) {
  const [i, setI] = useState(0)
  const [rect, setRect] = useState(null)
  const step = steps[i]
  const isLast = i === steps.length - 1

  const measure = useCallback(() => {
    const el = document.querySelector(`[data-tour="${step.target}"]`)
    if (!el) {
      setRect(null)
      return
    }
    const r = el.getBoundingClientRect()
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height })
  }, [step])

  // Amène l'élément à l'écran puis mesure sa position (recalcul au scroll/resize).
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

  const next = useCallback(() => {
    if (isLast) {
      onClose()
      // Dernière étape : on déclenche réellement le bouton ciblé (ex. « Calculer »).
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

  // Cadre de surbrillance (avec marge) et position de la bulle.
  const pad = 8
  const spot = rect && {
    top: rect.top - pad,
    left: rect.left - pad,
    width: rect.width + pad * 2,
    height: rect.height + pad * 2,
  }

  const W = 340
  let bubble = { top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: W }
  if (spot) {
    const vw = window.innerWidth
    const vh = window.innerHeight
    const below = spot.top + spot.height + 14
    const placeBelow = below + 200 < vh
    const top = placeBelow ? below : Math.max(14, spot.top - 14 - 196)
    let left = spot.left + spot.width / 2 - W / 2
    left = Math.max(14, Math.min(left, vw - W - 14))
    bubble = { top, left, width: W }
  }

  return (
    <div className="fixed inset-0 z-[90]">
      {/* Bloqueur de clics plein écran (l'utilisateur suit le tuto) */}
      <div className="absolute inset-0" />

      {/* Surbrillance */}
      {spot && (
        <div
          className="absolute rounded-xl ring-2 ring-primary pointer-events-none transition-all duration-300"
          style={{ ...spot, boxShadow: '0 0 0 9999px rgba(11,28,48,0.6)' }}
        />
      )}

      {/* Bulle explicative */}
      <div
        className="absolute bg-surface rounded-2xl p-5 card-shadow-lifted border border-outline-variant/40 flex flex-col gap-3"
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

        <div className="flex items-center justify-between mt-1">
          <div className="flex gap-1.5">
            {steps.map((_, k) => (
              <span key={k} className={`w-1.5 h-1.5 rounded-full ${k === i ? 'bg-primary' : 'bg-outline-variant'}`} />
            ))}
          </div>
          <div className="flex items-center gap-2">
            {i > 0 && (
              <button
                type="button"
                onClick={() => setI((v) => v - 1)}
                className="font-label-md text-label-md text-on-surface-variant hover:text-on-surface px-3 py-2"
              >
                Précédent
              </button>
            )}
            <button
              type="button"
              onClick={next}
              className="bg-primary-container text-on-primary-fixed font-label-md text-label-md px-4 py-2 rounded-xl hover:brightness-95 transition flex items-center gap-1"
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
