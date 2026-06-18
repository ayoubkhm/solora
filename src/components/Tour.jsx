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

  // Action déclenchée à l'entrée d'une étape (ex. animation de la surface / des mois).
  useEffect(() => {
    steps[i]?.onEnter?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i])

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

  // Placement de la bulle : on évite de recouvrir la cible. Pour une grande cible
  // (ex. la carte plein écran), on bascule sur le côté plutôt que dessus.
  const W = 340
  const BH = 210 // hauteur estimée de la bulle (pour le clamp)
  let bubble = { top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: W }
  if (spot) {
    const vw = window.innerWidth
    const vh = window.innerHeight
    const m = 14
    const clampX = (x) => Math.max(m, Math.min(x, vw - W - m))
    const clampY = (y) => Math.max(m, Math.min(y, vh - BH - m))
    const spaceBelow = vh - (spot.top + spot.height)
    const spaceAbove = spot.top
    const spaceRight = vw - (spot.left + spot.width)
    const spaceLeft = spot.left
    if (spaceBelow >= BH + m) {
      bubble = { top: spot.top + spot.height + m, left: clampX(spot.left + spot.width / 2 - W / 2), width: W }
    } else if (spaceAbove >= BH + m) {
      // Ancrage par le bas : la bulle ne recouvre jamais la cible, quelle que soit sa hauteur.
      bubble = { bottom: vh - spot.top + m, left: clampX(spot.left + spot.width / 2 - W / 2), width: W }
    } else if (spaceRight >= W + m) {
      bubble = { top: clampY(spot.top + spot.height / 2 - BH / 2), left: spot.left + spot.width + m, width: W }
    } else if (spaceLeft >= W + m) {
      bubble = { top: clampY(spot.top + spot.height / 2 - BH / 2), left: spot.left - m - W, width: W }
    } else {
      bubble = { top: clampY(spot.top + spot.height / 2 - BH / 2), left: clampX(spot.left + spot.width / 2 - W / 2), width: W }
    }
  }

  // Étape interactive : on laisse un « trou » cliquable sur la cible (4 bandes autour)
  // pour que l'utilisateur manipule l'élément (ex. le curseur des mois).
  const interactive = step.interactive && spot

  return (
    <div className="fixed inset-0 z-[90] pointer-events-none">
      {/* Bloqueur de clics : plein écran, ou 4 bandes laissant la cible cliquable.
          (La racine est pointer-events-none ; seuls ces bloqueurs captent les clics.) */}
      {interactive ? (
        <>
          <div className="absolute left-0 right-0 top-0 pointer-events-auto" style={{ height: Math.max(0, spot.top) }} />
          <div className="absolute left-0 right-0 bottom-0 pointer-events-auto" style={{ top: spot.top + spot.height }} />
          <div className="absolute left-0 pointer-events-auto" style={{ top: spot.top, height: spot.height, width: Math.max(0, spot.left) }} />
          <div className="absolute right-0 pointer-events-auto" style={{ top: spot.top, height: spot.height, left: spot.left + spot.width }} />
        </>
      ) : (
        <div className="absolute inset-0 pointer-events-auto" />
      )}

      {/* Surbrillance */}
      {spot && (
        <div
          className={
            'absolute rounded-xl ring-2 ring-primary pointer-events-none transition-all duration-300 ' +
            (interactive ? 'animate-pulse' : '')
          }
          style={{ ...spot, boxShadow: '0 0 0 9999px rgba(11,28,48,0.6)' }}
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
