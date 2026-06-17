// Appel de la Google Solar API + dérivation des indicateurs financiers/environnementaux.

import {
  GOOGLE_API_KEY,
  PRICE_BY_COUNTRY,
  DEFAULT_PRICE,
  COST_PER_KWP,
  CONFIG_RATIO,
  SYSTEM_LIFESPAN_YEARS,
  FEED_IN_BY_COUNTRY,
  DEFAULT_FEED_IN,
  DEFAULT_ANNUAL_CONSUMPTION_KWH,
  DEFAULT_SELF_CONSUMPTION_RATE,
  SELF_CONSUMPTION_NO_BATTERY,
  SELF_CONSUMPTION_WITH_BATTERY,
  BATTERY_COST,
  SUBSIDY_RATE_BY_COUNTRY,
  DEFAULT_SUBSIDY_RATE,
  ELEC_PRICE_INFLATION,
  PANEL_DEGRADATION,
} from '../config/constants.js'

const SOLAR_BASE = 'https://solar.googleapis.com/v1'

// Facteurs de rendement appliqués lors d'un ajustement manuel des paramètres du toit.
// Référence : orientation plein sud + inclinaison ~30° = optimum (facteur 1).
const ORIENTATION_FACTORS = { S: 1.0, E: 0.87, O: 0.87 }
const TILT_FACTORS = { 30: 1.0, 15: 0.96, 45: 0.97, flat: 0.9 }
const FALLBACK_PANEL_AREA_M2 = 1.9 // surface moyenne d'un panneau si non dérivable

// Modèle d'économies : sépare l'autoconsommation (valorisée au prix de détail) du
// surplus réinjecté (valorisé au tarif de rachat, plus bas). La consommation provient
// de la facture mensuelle saisie, ou d'une valeur par défaut.
function computeEconomics({ production, retail, feedIn, monthlyBill, selfConsumptionRate, defaultConsumptionKwh }) {
  const consumptionKwh = monthlyBill > 0 ? (monthlyBill * 12) / retail : defaultConsumptionKwh
  const rate = Math.min(1, Math.max(0, selfConsumptionRate ?? DEFAULT_SELF_CONSUMPTION_RATE))
  // On ne peut pas autoconsommer plus que ce qu'on consomme.
  const selfConsumedKwh = Math.min(production * rate, consumptionKwh)
  const exportedKwh = Math.max(0, production - selfConsumedKwh)
  const savingsSelf = selfConsumedKwh * retail // achat évité au prix fort
  const revenueExport = exportedKwh * feedIn // surplus revendu
  const annualSavings = Math.round(savingsSelf + revenueExport)
  return {
    consumptionKwh: Math.round(consumptionKwh),
    selfConsumedKwh: Math.round(selfConsumedKwh),
    exportedKwh: Math.round(exportedKwh),
    savingsSelf: Math.round(savingsSelf),
    revenueExport: Math.round(revenueExport),
    annualSavings,
    // Part de la consommation que la production pourrait couvrir (peut dépasser 100 %).
    energyCoveredPct: consumptionKwh > 0 ? Math.round((production / consumptionKwh) * 100) : 0,
    // Part de la facture réellement effacée par l'autoconsommation.
    billOffsetPct:
      consumptionKwh > 0 ? Math.round(Math.min(100, (savingsSelf / (consumptionKwh * retail)) * 100)) : 0,
    selfConsumptionRate: rate,
    monthlyBill: monthlyBill > 0 ? Math.round(monthlyBill) : Math.round((defaultConsumptionKwh * retail) / 12),
  }
}

// Coût de l'installation : système PV (au kWc) + batterie éventuelle, moins les aides.
function computeCost(systemCapacityKw, hasBattery, subsidyRate) {
  const panelsCost = Math.round(systemCapacityKw * COST_PER_KWP)
  const batteryCost = hasBattery ? BATTERY_COST : 0
  const grossCost = panelsCost + batteryCost
  const subsidy = Math.round(grossCost * (subsidyRate ?? DEFAULT_SUBSIDY_RATE))
  const netCost = Math.max(0, grossCost - subsidy)
  return { panelsCost, batteryCost, grossCost, subsidy, installationCost: netCost }
}

// Erreurs métier typées pour un affichage clair côté UI.
export class SolarError extends Error {
  constructor(code, message) {
    super(message)
    this.code = code
  }
}

// Récupère le potentiel solaire d'un toit à partir de coordonnées.
// `countryCode` sert au calcul des économies ; `priceOverride` = prix kWh réel (Eurostat live).
export async function getSolarPotential(lat, lng, countryCode, priceOverride) {
  if (!GOOGLE_API_KEY) throw new SolarError('NO_API_KEY', 'Clé Google API manquante.')

  const params = new URLSearchParams({
    'location.latitude': lat,
    'location.longitude': lng,
    requiredQuality: 'LOW', // accepte aussi les toits couverts en basse résolution
    key: GOOGLE_API_KEY,
  })

  let res
  try {
    res = await fetch(`${SOLAR_BASE}/buildingInsights:findClosest?${params.toString()}`)
  } catch {
    throw new SolarError('NETWORK', 'Impossible de joindre la Solar API.')
  }

  if (res.status === 404) {
    throw new SolarError('NOT_COVERED', "Ce toit n'est pas encore couvert par la Solar API de Google.")
  }
  if (!res.ok) {
    throw new SolarError('API_ERROR', `Erreur Solar API (${res.status}).`)
  }

  const data = await res.json()
  const sp = data.solarPotential
  if (!sp || !sp.solarPanelConfigs || sp.solarPanelConfigs.length === 0) {
    throw new SolarError('NO_POTENTIAL', "Aucune configuration solaire exploitable pour ce toit.")
  }

  return computeMetrics(sp, countryCode, data.center, data.imageryDate, priceOverride)
}

// Transforme la réponse brute Solar API en indicateurs prêts à afficher.
function computeMetrics(sp, countryCode, center, imageryDate, priceOverride) {
  const configs = sp.solarPanelConfigs
  const maxPanels = sp.maxArrayPanelsCount || configs[configs.length - 1].panelsCount

  // Compromis réaliste surface/coût : config la plus proche de 80 % du max de panneaux.
  const targetPanels = maxPanels * CONFIG_RATIO
  const config = configs.reduce((best, c) =>
    Math.abs(c.panelsCount - targetPanels) < Math.abs(best.panelsCount - targetPanels) ? c : best
  )

  const panelsCount = config.panelsCount
  const yearlyProductionKwh = Math.round(config.yearlyEnergyDcKwh)

  // Prix du kWh : prix réel Eurostat (priceOverride) sinon table de secours.
  const pricePerKwh =
    typeof priceOverride === 'number' && priceOverride > 0 ? priceOverride : PRICE_BY_COUNTRY[countryCode] ?? DEFAULT_PRICE
  const feedInTariff = FEED_IN_BY_COUNTRY[countryCode] ?? DEFAULT_FEED_IN
  const subsidyRate = SUBSIDY_RATE_BY_COUNTRY[countryCode] ?? DEFAULT_SUBSIDY_RATE

  // Économies par défaut (hypothèses : conso moyenne + autoconsommation sans batterie).
  const econ = computeEconomics({
    production: yearlyProductionKwh,
    retail: pricePerKwh,
    feedIn: feedInTariff,
    monthlyBill: 0,
    selfConsumptionRate: DEFAULT_SELF_CONSUMPTION_RATE,
    defaultConsumptionKwh: DEFAULT_ANNUAL_CONSUMPTION_KWH,
  })

  // Facteur CO₂ local fourni par l'API (kg/MWh) ; valeur UE moyenne par défaut.
  const carbonFactor = sp.carbonOffsetFactorKgPerMwh || 300
  const co2OffsetKgPerYear = Math.round((yearlyProductionKwh / 1000) * carbonFactor)

  const panelCapacityWatts = sp.panelCapacityWatts || 400
  const systemCapacityKw = Math.round(((panelsCount * panelCapacityWatts) / 1000) * 10) / 10
  const cost = computeCost(systemCapacityKw, false, subsidyRate)
  const paybackYears = econ.annualSavings > 0
    ? Math.round((cost.installationCost / econ.annualSavings) * 10) / 10
    : null

  return {
    panelsCount,
    maxPanels,
    yearlyProductionKwh,
    countryCode: countryCode || null,
    pricePerKwh,
    feedInTariff,
    subsidyRate,
    hasBattery: false,
    ...econ,
    co2OffsetKgPerYear,
    ...cost,
    paybackYears,
    panelCapacityWatts,
    systemCapacityKw,
    roofAreaM2: Math.round(sp.maxArrayAreaMeters2 || 0),
    sunshineHoursPerYear: Math.round(sp.maxSunshineHoursPerYear || 0),
    carbonFactorKgPerMwh: carbonFactor,
    lifespanYears: SYSTEM_LIFESPAN_YEARS,
    // Date de l'imagerie satellite utilisée par l'API (confiance/fraîcheur).
    imageryDate: imageryDate || null,
    // Données géométriques brutes pour la visualisation sur la carte.
    center: center || null,
    solarPanels: sp.solarPanels || [], // triés par énergie décroissante par l'API
    roofSegmentStats: sp.roofSegmentStats || [],
    panelWidthMeters: sp.panelWidthMeters || 1.045,
    panelHeightMeters: sp.panelHeightMeters || 1.879,
  }
}

// Projection des économies sur la durée de vie, avec hausse du prix de l'électricité
// (augmente les économies) et dégradation des panneaux (les réduit légèrement).
// Renvoie le cumul par année, l'année de rentabilité (interpolée) et le gain net total.
export function projectSavings({ annualSavings, installationCost, lifespanYears }) {
  const cumulative = []
  let total = 0
  let breakEvenYear = null
  for (let y = 1; y <= lifespanYears; y++) {
    const yearSavings =
      annualSavings * Math.pow(1 + ELEC_PRICE_INFLATION, y - 1) * Math.pow(1 - PANEL_DEGRADATION, y - 1)
    const prev = total
    total += yearSavings
    cumulative.push(Math.round(total))
    if (breakEvenYear === null && total >= installationCost && yearSavings > 0) {
      breakEvenYear = Math.round((y - 1 + (installationCost - prev) / yearSavings) * 10) / 10
    }
  }
  return {
    cumulative,
    breakEvenYear,
    lifetimeSavings: Math.round(total),
    lifetimeGain: Math.round(total - installationCost),
  }
}

// Recalcule les indicateurs quand l'utilisateur ajuste son toit ET son profil de conso.
// `params` : { surfaceM2, tilt, orientation, monthlyBill, hasBattery }.
// La batterie pilote à la fois le taux d'autoconsommation ET le coût.
export function adjustMetrics(base, { surfaceM2, tilt, orientation, monthlyBill, hasBattery }) {
  // Production de référence par panneau (conditions optimales détectées par l'API).
  const perPanel = base.panelsCount ? base.yearlyProductionKwh / base.panelsCount : 0

  // Surface saisie → nombre de panneaux, borné par le maximum physique du toit.
  const areaPerPanel =
    base.maxPanels && base.roofAreaM2 ? base.roofAreaM2 / base.maxPanels : FALLBACK_PANEL_AREA_M2
  let panels = Math.round(surfaceM2 / areaPerPanel)
  panels = Math.max(1, Math.min(panels, base.maxPanels || panels))

  const oFactor = ORIENTATION_FACTORS[orientation] ?? 1
  const tFactor = TILT_FACTORS[tilt] ?? 1
  const yearlyProductionKwh = Math.round(perPanel * panels * oFactor * tFactor)

  const carbonFactor = base.carbonFactorKgPerMwh || 300
  const co2OffsetKgPerYear = Math.round((yearlyProductionKwh / 1000) * carbonFactor)

  const econ = computeEconomics({
    production: yearlyProductionKwh,
    retail: base.pricePerKwh,
    feedIn: base.feedInTariff ?? DEFAULT_FEED_IN,
    monthlyBill: monthlyBill || 0,
    selfConsumptionRate: hasBattery ? SELF_CONSUMPTION_WITH_BATTERY : SELF_CONSUMPTION_NO_BATTERY,
    defaultConsumptionKwh: DEFAULT_ANNUAL_CONSUMPTION_KWH,
  })

  const systemCapacityKw = Math.round(((panels * base.panelCapacityWatts) / 1000) * 10) / 10
  const cost = computeCost(systemCapacityKw, hasBattery, base.subsidyRate)
  const paybackYears =
    econ.annualSavings > 0 ? Math.round((cost.installationCost / econ.annualSavings) * 10) / 10 : null

  return {
    ...base,
    panelsCount: panels,
    yearlyProductionKwh,
    hasBattery: !!hasBattery,
    ...econ,
    co2OffsetKgPerYear,
    ...cost,
    paybackYears,
    systemCapacityKw,
    roofAreaM2: Math.round(surfaceM2),
    tilt,
    orientation,
  }
}
