import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { loadGoogleMaps, extractCountryCode, isEuCountry } from '../services/geoUtils.js'

// Barre de recherche d'adresse avec Google Places Autocomplete.
// Façons de lancer l'analyse :
//   1. choisir une suggestion dans la liste (fast path) ;
//   2. taper une adresse puis cliquer « Calculer » / appuyer sur Entrée (géocodage) ;
//   3. démo guidée : playDemo() tape l'adresse puis « clique » sur Calculer (via ref).
// Remonte { address, lat, lng, countryCode } via onSelect.
const SearchBar = forwardRef(function SearchBar({ onSelect, onError, variant = 'hero', loading = false }, ref) {
  const inputRef = useRef(null)
  const geocoderRef = useRef(null)
  const [ready, setReady] = useState(false)
  const [typed, setTyped] = useState('')
  const [geocoding, setGeocoding] = useState(false)
  const [demoing, setDemoing] = useState(false) // saisie automatique en cours
  const [pressing, setPressing] = useState(false) // « clic » simulé sur Calculer
  const timers = useRef([])

  useEffect(() => {
    let cancelled = false
    loadGoogleMaps()
      .then((maps) => {
        if (cancelled || !inputRef.current) return
        // Biais des suggestions vers l'Europe (la restriction stricte par pays est
        // limitée à 5 pays par l'API → on valide précisément à la sélection).
        const europeBounds = new maps.LatLngBounds({ lat: 34, lng: -25 }, { lat: 72, lng: 45 })
        const ac = new maps.places.Autocomplete(inputRef.current, {
          types: ['address'],
          fields: ['address_components', 'geometry', 'formatted_address'],
          bounds: europeBounds,
        })
        ac.addListener('place_changed', () => {
          const place = ac.getPlace()
          if (!place.geometry || !place.geometry.location) return // l'utilisateur a tapé sans choisir → géré au submit
          emitPlace(place)
        })
        geocoderRef.current = new maps.Geocoder()
        setReady(true)
      })
      .catch((err) => onError?.({ code: err.message, message: keyMessage(err.message) }))
    return () => {
      cancelled = true
    }
  }, [])

  // Nettoyage des minuteries de la démo au démontage.
  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  // Démo guidée : tape `text` lettre par lettre, puis simule le clic sur Calculer.
  // On utilise l'adresse en dur (`place`) → pas de géocodage, fiable pour une démo live.
  useImperativeHandle(ref, () => ({
    playDemo(text, place) {
      timers.current.forEach(clearTimeout)
      timers.current = []
      if (!ready) {
        onSelect(place)
        return
      }
      setDemoing(true)
      setPressing(false)
      setTyped('')
      inputRef.current?.focus()
      let i = 0
      const typeNext = () => {
        i += 1
        setTyped(text.slice(0, i))
        if (i < text.length) {
          timers.current.push(setTimeout(typeNext, 55))
        } else {
          // Petite pause, puis « appui » sur Calculer, puis lancement.
          timers.current.push(setTimeout(() => setPressing(true), 450))
          timers.current.push(
            setTimeout(() => {
              setPressing(false)
              setDemoing(false)
              onSelect(place)
            }, 1050)
          )
        }
      }
      timers.current.push(setTimeout(typeNext, 350))
    },
  }), [ready, onSelect])

  function emitPlace(place) {
    const countryCode = extractCountryCode(place)
    // Garde-fou : on ne couvre que l'Union européenne.
    if (!isEuCountry(countryCode)) {
      onError?.({
        code: 'OUTSIDE_EU',
        message: "Solora couvre uniquement l'Union européenne. Choisissez une adresse dans un pays de l'UE.",
      })
      return
    }
    onSelect({
      address: place.formatted_address,
      lat: place.geometry.location.lat(),
      lng: place.geometry.location.lng(),
      countryCode,
    })
  }

  // Lancé par le bouton « Calculer » ou la touche Entrée : géocode le texte saisi.
  function handleSubmit() {
    const query = typed.trim()
    if (!query || !geocoderRef.current || geocoding || loading || demoing) return
    setGeocoding(true)
    geocoderRef.current.geocode({ address: query }, (results, status) => {
      setGeocoding(false)
      if (status === 'OK' && results && results[0]) {
        emitPlace(results[0])
      } else {
        onError?.({ code: 'ADDRESS_NOT_FOUND', message: 'Adresse introuvable. Précisez ou choisissez une suggestion.' })
      }
    })
  }

  const isHero = variant === 'hero'
  const busy = loading || geocoding || pressing
  const disabled = !ready || busy

  return (
    <div
      className={
        isHero
          ? 'w-full max-w-2xl bg-surface rounded-2xl p-2 flex items-center card-shadow-lifted border border-outline-variant/30'
          : 'w-full bg-surface rounded-xl p-1.5 flex items-center card-shadow border border-outline-variant/30'
      }
    >
      <span className="material-symbols-outlined text-on-surface-variant pl-4" style={{ fontVariationSettings: "'FILL' 0" }}>
        search
      </span>
      <input
        ref={inputRef}
        type="text"
        aria-label="Adresse en Europe"
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            handleSubmit()
          }
        }}
        placeholder={ready ? 'Entrez une adresse en Europe…' : 'Chargement de la recherche…'}
        disabled={!ready || loading || demoing}
        className={
          (isHero ? 'px-4 py-3 font-body-md' : 'px-3 py-2 font-body-sm') +
          ' flex-grow bg-transparent border-none focus:ring-0 text-on-surface placeholder:text-on-surface-variant/50 outline-none disabled:opacity-100'
        }
      />
      <button
        type="button"
        onClick={handleSubmit}
        disabled={disabled || !typed.trim()}
        aria-label="Calculer le potentiel solaire"
        className={
          (isHero ? 'px-8 py-3 text-label-md' : 'px-5 py-2 text-label-sm') +
          ' bg-primary-container text-on-primary-fixed font-label-md rounded-xl flex items-center gap-2 transition hover:brightness-95 disabled:opacity-60 disabled:cursor-not-allowed ' +
          (pressing ? 'scale-95 brightness-90' : '')
        }
      >
        {busy ? (
          <>
            <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
            Analyse…
          </>
        ) : (
          'Calculer'
        )}
      </button>
    </div>
  )
})

export default SearchBar

function keyMessage(code) {
  if (code === 'NO_API_KEY') return 'Clé Google API non configurée.'
  if (code === 'MAPS_LOAD_FAILED') return "Échec du chargement de Google Maps (clé invalide ou APIs non activées)."
  return 'Erreur de chargement de la recherche.'
}
