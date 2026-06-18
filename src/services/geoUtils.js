// Utilitaires : chargement de l'API Google Maps, extraction du pays, conversions.

import {
  GOOGLE_API_KEY,
  EU_ISO_CODES,
  COUNTRY_NAMES,
  SUBSIDY_LINK_BY_COUNTRY,
  INSTALLER_DIRECTORY_BY_COUNTRY,
} from '../config/constants.js'

const EU_SET = new Set(EU_ISO_CODES)

// Vrai si le code pays (ISO Google, ex: FR) appartient à l'UE-27.
export function isEuCountry(code) {
  return !!code && EU_SET.has(code)
}

// Lien « en savoir plus » sur les aides : ressource officielle si connue,
// sinon recherche web ciblée sur le pays.
export function subsidyLink(code) {
  if (SUBSIDY_LINK_BY_COUNTRY[code]) return SUBSIDY_LINK_BY_COUNTRY[code]
  const name = COUNTRY_NAMES[code] || ''
  return `https://www.google.com/search?q=${encodeURIComponent(`aides panneaux solaires résidentiel ${name}`)}`
}

// Ressource locale pour identifier ou vérifier des installateurs photovoltaïques.
export function installerDirectoryForCountry(code) {
  if (INSTALLER_DIRECTORY_BY_COUNTRY[code]) return INSTALLER_DIRECTORY_BY_COUNTRY[code]
  const name = COUNTRY_NAMES[code] || 'Union européenne'
  return {
    label: `Recherche ${name}`,
    url: `https://www.google.com/search?q=${encodeURIComponent(`installateur photovoltaïque résidentiel ${name}`)}`,
  }
}

let mapsPromise = null

// Charge l'API Google Maps JS (librairie Places) une seule fois, à la demande.
// Résout quand `window.google.maps` est prêt ; rejette si pas de clé ou échec réseau.
export function loadGoogleMaps() {
  if (!GOOGLE_API_KEY) {
    return Promise.reject(new Error('NO_API_KEY'))
  }
  if (window.google && window.google.maps) {
    return Promise.resolve(window.google.maps)
  }
  if (mapsPromise) return mapsPromise

  mapsPromise = new Promise((resolve, reject) => {
    const callbackName = '__initGoogleMaps__'
    window[callbackName] = () => {
      resolve(window.google.maps)
      delete window[callbackName]
    }
    const script = document.createElement('script')
    const params = new URLSearchParams({
      key: GOOGLE_API_KEY,
      libraries: 'places,geometry', // geometry = computeOffset pour dessiner les panneaux
      callback: callbackName,
      loading: 'async',
      language: 'fr',
      region: 'EU',
    })
    script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`
    script.async = true
    script.defer = true
    script.onerror = () => {
      mapsPromise = null
      reject(new Error('MAPS_LOAD_FAILED'))
    }
    document.head.appendChild(script)
  })
  return mapsPromise
}

// Extrait le code pays ISO (alpha-2) depuis les address_components d'un résultat Google Places.
export function extractCountryCode(place) {
  if (!place || !place.address_components) return null
  const country = place.address_components.find((c) => c.types.includes('country'))
  return country ? country.short_name : null
}

// Conversion lisible : kg de CO₂ → tonnes (1 décimale).
export function kgToTonnes(kg) {
  return Math.round((kg / 1000) * 10) / 10
}

// Équivalence pédagogique : un arbre absorbe ~21 kg de CO₂ par an.
export function co2ToTrees(kgPerYear) {
  return Math.round(kgPerYear / 21)
}

// Formatage nombre à la française (espaces comme séparateurs de milliers).
export function formatNumber(value, decimals = 0) {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}
