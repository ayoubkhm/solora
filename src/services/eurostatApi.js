// Appel de l'API Eurostat (open data, sans clé) : part de renouvelables par pays.

import { COUNTRY_NAMES, ISO_TO_EUROSTAT, EU_2030_TARGET, EU27_CODES } from '../config/constants.js'

const BASE = 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data'
const EUROSTAT_BASE = `${BASE}/nrg_ind_ren`
const PRICE_BASE = `${BASE}/nrg_pc_204` // prix électricité ménages

// Ensemble des 27 États membres : seuls eux entrent dans le classement « rang dans l'UE ».
const EU27 = new Set(EU27_CODES)

// Prix de l'électricité des ménages, en direct (mis en cache pour la session).
// Bande DC (2500-4999 kWh/an), toutes taxes incluses, en EUR/kWh.
let pricesPromise = null
function fetchPrices() {
  if (pricesPromise) return pricesPromise
  const params = new URLSearchParams({
    format: 'JSON',
    lang: 'FR',
    siec: 'E7000',
    nrg_cons: 'KWH2500-4999',
    unit: 'KWH',
    tax: 'I_TAX',
    currency: 'EUR',
    lastTimePeriod: '1',
  })
  pricesPromise = (async () => {
    const controller = new AbortController()
    const t = setTimeout(() => controller.abort(), 12000)
    const res = await fetch(`${PRICE_BASE}?${params.toString()}`, { signal: controller.signal })
    clearTimeout(t)
    if (!res.ok) throw new EurostatError('API_ERROR', `Erreur Eurostat prix (${res.status}).`)
    const data = await res.json()
    const geoIndex = data.dimension.geo.category.index
    const values = data.value
    const period = Object.keys(data.dimension.time.category.index)[0]
    const prices = {}
    for (const [code, idx] of Object.entries(geoIndex)) {
      if (typeof values[idx] === 'number') prices[code] = values[idx]
    }
    return { prices, period }
  })().catch((e) => {
    pricesPromise = null // permet de réessayer plus tard
    throw e
  })
  return pricesPromise
}

// Prix réel du kWh pour un pays (code Google), ou null si indisponible.
export async function getElectricityPrice(isoCode) {
  const geoCode = ISO_TO_EUROSTAT[isoCode] || isoCode
  try {
    const { prices, period } = await fetchPrices()
    const price = prices[geoCode]
    return typeof price === 'number' ? { price, period } : null
  } catch {
    return null
  }
}

// Classement des prix de l'électricité des 27 États membres (décroissant).
export async function getAllElectricityPrices() {
  const { prices, period } = await fetchPrices()
  const list = EU27_CODES.map((code) => ({ code, name: COUNTRY_NAMES[code] || code, price: prices[code] }))
    .filter((c) => typeof c.price === 'number')
    .sort((a, b) => b.price - a.price)
    .map((c, i) => ({ ...c, rank: i + 1, price: Math.round(c.price * 1000) / 1000 }))
  return { prices: list, period }
}

// Calcule l'index linéaire d'une cellule JSON-stat à partir d'une sélection de catégories.
function linearIndex(data, sel) {
  let lin = 0
  for (let k = 0; k < data.id.length; k++) {
    const dim = data.id[k]
    const cat = data.dimension[dim].category.index
    lin = lin * data.size[k] + (dim in sel ? cat[sel[dim]] : 0)
  }
  return lin
}

async function fetchJson(url) {
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), 12000)
  let res
  try {
    res = await fetch(url, { signal: controller.signal })
  } finally {
    clearTimeout(t)
  }
  if (!res.ok) throw new EurostatError('API_ERROR', `Erreur Eurostat (${res.status}).`)
  return res.json()
}

// Évolution de la part de renouvelables (moyenne UE + pays sélectionné) sur ~10 ans.
export async function getRenewablesTrend(isoCode) {
  const params = new URLSearchParams({
    format: 'JSON',
    lang: 'FR',
    unit: 'PC',
    nrg_bal: 'REN',
    sinceTimePeriod: '2014',
    geo: 'EU27_2020',
  })
  const countryGeo = isoCode ? ISO_TO_EUROSTAT[isoCode] || isoCode : null
  if (countryGeo) params.append('geo', countryGeo)

  const data = await fetchJson(`${EUROSTAT_BASE}?${params.toString()}`)
  const years = Object.keys(data.dimension.time.category.index)
  const seriesFor = (geo) =>
    years.map((y) => {
      const v = data.value[linearIndex(data, { geo, time: y })]
      return typeof v === 'number' ? Math.round(v * 10) / 10 : null
    })
  return {
    years,
    eu: seriesFor('EU27_2020'),
    country: countryGeo ? seriesFor(countryGeo) : null,
    countryLabel: countryGeo ? COUNTRY_NAMES[countryGeo] || isoCode : null,
  }
}

// Mix de production d'électricité (renouvelable / nucléaire / fossile) d'un pays
// (ou de l'UE par défaut), en % de la production brute.
export async function getElectricityMix(isoCode) {
  const geo = isoCode ? ISO_TO_EUROSTAT[isoCode] || isoCode : 'EU27_2020'
  const params = new URLSearchParams({
    format: 'JSON',
    lang: 'FR',
    nrg_bal: 'GEP',
    unit: 'GWH',
    lastTimePeriod: '1',
    geo,
  })
  for (const s of ['TOTAL', 'RA000', 'N900H']) params.append('siec', s)

  const data = await fetchJson(`${BASE}/nrg_bal_peh?${params.toString()}`)
  const total = data.value[linearIndex(data, { siec: 'TOTAL' })]
  if (!total) throw new EurostatError('NO_DATA', 'Mix électrique indisponible.')
  const renewable = data.value[linearIndex(data, { siec: 'RA000' })] || 0
  const nuclear = data.value[linearIndex(data, { siec: 'N900H' })] || 0
  const fossil = Math.max(0, total - renewable - nuclear)
  const pct = (v) => Math.round((v / total) * 100)
  return {
    label: geo === 'EU27_2020' ? 'UE-27' : COUNTRY_NAMES[geo] || isoCode,
    period: Object.keys(data.dimension.time.category.index)[0],
    renewable: pct(renewable),
    nuclear: pct(nuclear),
    fossil: pct(fossil),
  }
}

export class EurostatError extends Error {
  constructor(code, message) {
    super(message)
    this.code = code
  }
}

// Récupère le dataset nrg_ind_ren (dernière année) et renvoie une vue normalisée :
// classement des 27 États membres trié décroissant, moyenne UE-27, année.
async function fetchDataset() {
  const params = new URLSearchParams({
    format: 'JSON',
    lang: 'FR',
    unit: 'PC',
    nrg_bal: 'REN',
    lastTimePeriod: '1',
  })

  let res
  try {
    // Timeout manuel : Eurostat peut être lent.
    const controller = new AbortController()
    const t = setTimeout(() => controller.abort(), 12000)
    res = await fetch(`${EUROSTAT_BASE}?${params.toString()}`, { signal: controller.signal })
    clearTimeout(t)
  } catch {
    throw new EurostatError('TIMEOUT', 'Données Eurostat indisponibles (délai dépassé).')
  }
  if (!res.ok) throw new EurostatError('API_ERROR', `Erreur Eurostat (${res.status}).`)

  const data = await res.json()
  const geoIndex = data.dimension.geo.category.index
  const values = data.value
  const year = Object.keys(data.dimension.time.category.index)[0]

  // Toutes les dimensions hors geo valent 1 → value[indexGeo] = pourcentage du pays.
  const euAverage = values[geoIndex['EU27_2020']] ?? null

  // Classement limité aux 27 États membres ayant une valeur définie.
  const countries = Object.entries(geoIndex)
    .filter(([code]) => EU27.has(code))
    .map(([code, idx]) => ({
      code,
      name: COUNTRY_NAMES[code] || code,
      value: Math.round(values[idx] * 10) / 10,
    }))
    .filter((c) => typeof c.value === 'number' && !Number.isNaN(c.value))
    .sort((a, b) => b.value - a.value)
    .map((c, i) => ({ ...c, rank: i + 1 }))

  return { geoIndex, values, year, euAverage, countries }
}

// Récupère, pour le pays demandé, sa part de renouvelables (dernière année dispo),
// son rang dans l'UE, le total de pays classés, l'année, et la moyenne UE.
// `isoCode` est le code Google (ex: FR, GR) ; on le mappe vers la nomenclature Eurostat.
export async function getCountryRenewables(isoCode) {
  const geoCode = ISO_TO_EUROSTAT[isoCode] || isoCode
  const { values, geoIndex, year, euAverage, countries } = await fetchDataset()

  const percentage = values[geoIndex[geoCode]]
  if (typeof percentage !== 'number') {
    throw new EurostatError('NO_DATA', `Pas de données Eurostat pour ${isoCode}.`)
  }

  const entry = countries.find((c) => c.code === geoCode)
  const rounded = Math.round(percentage * 10) / 10

  return {
    isoCode,
    countryName: COUNTRY_NAMES[geoCode] || COUNTRY_NAMES[isoCode] || isoCode,
    percentage: rounded,
    rank: entry ? entry.rank : null,
    totalCountries: countries.length,
    euAverage: euAverage != null ? Math.round(euAverage * 10) / 10 : null,
    target2030: EU_2030_TARGET,
    progressToTarget: Math.round((rounded / EU_2030_TARGET) * 100),
    year,
  }
}

// Classement complet des 27 États membres, pour la page « Contexte UE ».
export async function getAllEuRenewables() {
  const { year, euAverage, countries } = await fetchDataset()
  return {
    countries,
    euAverage: euAverage != null ? Math.round(euAverage * 10) / 10 : null,
    target2030: EU_2030_TARGET,
    year,
    totalCountries: countries.length,
  }
}
