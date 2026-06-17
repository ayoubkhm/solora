import { useEffect, useMemo, useState } from 'react'
import Map from './Map.jsx'
import { adjustMetrics } from '../services/solarApi.js'
import { formatNumber, subsidyLink } from '../services/geoUtils.js'
import InfoTooltip from './InfoTooltip.jsx'

const SUBSIDY_INFO =
  "Estimation indicative des aides publiques de votre pays (crédit d'impôt, prime à l'autoconsommation, TVA réduite…). Le montant réel dépend de votre région, de vos revenus et des dispositifs en vigueur."

const MONTHS = ['Janv.', 'Févr.', 'Mars', 'Avr.', 'Mai', 'Juin', 'Juil.', 'Août', 'Sept.', 'Oct.', 'Nov.', 'Déc.']
const FLUX_GRADIENT = 'linear-gradient(90deg,#0d0835,#7b0f72,#e85532,#fcdc50)'

const TILT_OPTIONS = [
  { value: 30, label: '30° (standard)' },
  { value: 15, label: '15° (faible)' },
  { value: 45, label: '45° (forte)' },
  { value: 'flat', label: 'Toit plat' },
]
const ORIENTATIONS = [
  { value: 'E', label: 'Est' },
  { value: 'S', label: 'Sud' },
  { value: 'O', label: 'Ouest' },
]

// Page « Analyse du toit » : carte + paramètres éditables (surface, inclinaison,
// orientation) pré-remplis depuis la Solar API. L'estimation se recalcule en direct ;
// « Calculer mes économies » envoie les métriques ajustées au tableau de bord.
export default function RoofAnalysis({ selected, baseMetrics, loading, error, onCompute }) {
  const [surface, setSurface] = useState(0)
  const [tilt, setTilt] = useState(30)
  const [orientation, setOrientation] = useState('S')

  // Profil de consommation (pour des économies réalistes).
  const [monthlyBill, setMonthlyBill] = useState(0)
  const [hasBattery, setHasBattery] = useState(false) // pilote le taux d'autoconsommation

  // Visualisation carte.
  const [fluxData, setFluxData] = useState(null) // { bounds, annual, months[], monthRange }
  const [fluxLoading, setFluxLoading] = useState(false)
  const [monthIndex, setMonthIndex] = useState(null) // null = vue annuelle ; 0-11 = mois
  const [showPanels, setShowPanels] = useState(true)
  const [showFlux, setShowFlux] = useState(true)

  // Dès que les données réelles arrivent : facture estimée + surface dimensionnée
  // pour couvrir ~la consommation (réaliste), bornée par la surface max du toit.
  // Ainsi la production ≈ la conso, et la batterie influe réellement sur les économies.
  useEffect(() => {
    if (!baseMetrics) return
    if (baseMetrics.monthlyBill) setMonthlyBill(baseMetrics.monthlyBill)

    const perPanel = baseMetrics.panelsCount
      ? baseMetrics.yearlyProductionKwh / baseMetrics.panelsCount
      : 0
    const areaPerPanel =
      baseMetrics.maxPanels && baseMetrics.roofAreaM2
        ? baseMetrics.roofAreaM2 / baseMetrics.maxPanels
        : 1.9
    const targetProduction = (baseMetrics.consumptionKwh || 3500) * 1.1 // léger surdimensionnement
    let targetPanels = perPanel > 0 ? Math.ceil(targetProduction / perPanel) : baseMetrics.panelsCount
    targetPanels = Math.max(1, Math.min(targetPanels, baseMetrics.maxPanels || targetPanels))
    setSurface(Math.min(Math.round(targetPanels * areaPerPanel), baseMetrics.roofAreaM2))
  }, [baseMetrics])

  // Récupère les heatmaps de flux solaire (annuel + 12 mois) pour cette adresse.
  useEffect(() => {
    let cancelled = false
    setFluxData(null)
    setMonthIndex(null)
    setFluxLoading(true)
    // Import dynamique : geotiff/proj4 ne sont chargés que sur la page Analyse.
    import('../services/dataLayersApi.js')
      .then(({ getFluxOverlays }) => getFluxOverlays(selected.lat, selected.lng))
      .then((f) => !cancelled && setFluxData(f))
      .catch(() => !cancelled && setFluxData(null))
      .finally(() => !cancelled && setFluxLoading(false))
    return () => {
      cancelled = true
    }
  }, [selected.lat, selected.lng])

  // Overlay actif (annuel ou mois sélectionné), mémoïsé pour éviter de recréer l'overlay à chaque frappe.
  const activeFlux = useMemo(() => {
    if (!fluxData) return null
    const src = monthIndex == null ? fluxData.annual : fluxData.months[monthIndex]
    return { dataUrl: src.dataUrl, bounds: fluxData.bounds }
  }, [fluxData, monthIndex])

  const legend =
    fluxData &&
    (monthIndex == null
      ? { ...fluxData.annual.range, unit: fluxData.annual.unit }
      : { ...fluxData.monthRange })

  // Estimation live à partir des paramètres courants (toit + profil de conso).
  const estimate =
    baseMetrics && surface > 0
      ? adjustMetrics(baseMetrics, { surfaceM2: surface, tilt, orientation, monthlyBill, hasBattery })
      : null

  // Panneaux à dessiner : les N premiers (triés par énergie) selon le nombre estimé.
  const panelsToDraw =
    baseMetrics?.solarPanels && estimate
      ? baseMetrics.solarPanels.slice(0, Math.min(estimate.panelsCount, baseMetrics.solarPanels.length))
      : []

  return (
    <div className="flex flex-col lg:flex-row w-full h-[calc(100vh-80px)] min-h-[600px]">
      {/* Carte + visualisation */}
      <section data-tour="map" className="relative w-full lg:w-[60%] h-72 lg:h-full bg-surface-container-high border-b lg:border-b-0 lg:border-r border-outline-variant">
        <Map
          lat={selected.lat}
          lng={selected.lng}
          address={selected.address}
          zoom={20}
          panels={panelsToDraw}
          segments={baseMetrics?.roofSegmentStats}
          panelDims={baseMetrics ? { width: baseMetrics.panelWidthMeters, height: baseMetrics.panelHeightMeters } : null}
          showPanels={showPanels}
          flux={activeFlux}
          showFlux={showFlux}
        />

        {/* Toggles de visualisation */}
        <div className="absolute bottom-4 left-4 flex flex-col gap-2 z-10">
          <MapToggle
            active={showFlux}
            onClick={() => setShowFlux((v) => !v)}
            icon="wb_sunny"
            label={fluxLoading ? 'Ensoleillement…' : 'Ensoleillement'}
            loading={fluxLoading}
            disabled={!fluxData && !fluxLoading}
          />
          <MapToggle
            active={showPanels}
            onClick={() => setShowPanels((v) => !v)}
            icon="grid_on"
            label={`Panneaux (${panelsToDraw.length})`}
            disabled={!panelsToDraw.length}
          />
        </div>

        {/* Légende du flux */}
        {showFlux && legend && (
          <div className="absolute top-4 left-4 bg-surface/90 backdrop-blur rounded-lg px-3 py-2 z-10 shadow-sm">
            <p className="font-label-sm text-label-sm text-on-surface-variant mb-1">Ensoleillement ({legend.unit})</p>
            <div className="flex items-center gap-2">
              <span className="font-label-sm text-label-sm text-on-surface">{formatNumber(legend.min)}</span>
              <div className="h-2 w-28 rounded-full" style={{ background: FLUX_GRADIENT }} />
              <span className="font-label-sm text-label-sm text-on-surface">{formatNumber(legend.max)}</span>
            </div>
          </div>
        )}

        {/* Curseur mensuel */}
        {showFlux && fluxData && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[min(90%,360px)] bg-surface/95 backdrop-blur rounded-full px-4 py-2 z-10 shadow-sm flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMonthIndex(null)}
              className={
                'font-label-sm text-label-sm px-2 py-1 rounded-full transition flex-shrink-0 ' +
                (monthIndex == null ? 'bg-primary-container text-on-primary-fixed' : 'text-on-surface-variant hover:text-on-surface')
              }
            >
              Année
            </button>
            <input
              type="range"
              min="0"
              max="11"
              value={monthIndex ?? 0}
              onChange={(e) => setMonthIndex(Number(e.target.value))}
              aria-label="Mois"
              className="flex-grow accent-primary cursor-pointer"
            />
            <span className="font-label-md text-label-md text-on-surface w-12 text-right flex-shrink-0">
              {monthIndex == null ? '—' : MONTHS[monthIndex]}
            </span>
          </div>
        )}
      </section>

      {/* Paramètres */}
      <section className="w-full lg:w-[40%] h-full bg-surface overflow-y-auto p-margin-mobile lg:p-margin-desktop flex flex-col gap-gutter">
        <div className="shrink-0">
          <h1 className="font-headline-lg text-headline-lg-mobile lg:text-headline-lg text-on-surface mb-2">
            Paramètres de votre toit
          </h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
              location_on
            </span>
            {selected.address}
          </p>
        </div>

        {error && (
          <div className="bg-error-container text-on-error-container rounded-xl p-5 flex items-start gap-3">
            <span className="material-symbols-outlined">wb_cloudy</span>
            <div>
              <p className="font-label-md text-label-md mb-1">Analyse indisponible</p>
              <p className="font-body-sm text-body-sm">
                {error === 'NOT_COVERED'
                  ? "Ce toit n'est pas encore couvert par la Solar API. Essayez une adresse en zone urbaine."
                  : 'Impossible de récupérer les données solaires pour cette adresse.'}
              </p>
            </div>
          </div>
        )}

        {loading && !baseMetrics && <ParamsSkeleton />}

        {baseMetrics && (
          <>
            <div className="flex flex-col gap-4 shrink-0">
              {/* Surface */}
              <Field tour="surface" icon="straighten" label="Surface exploitable (m²)">
                <input
                  type="number"
                  min="1"
                  max={baseMetrics.roofAreaM2 || undefined}
                  value={surface}
                  onChange={(e) => setSurface(Math.max(0, Number(e.target.value)))}
                  className="w-full bg-transparent border-none font-body-lg text-body-lg text-on-surface focus:ring-0 p-0"
                />
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  Maximum détecté : {formatNumber(baseMetrics.roofAreaM2)} m²
                </span>
              </Field>

              {/* Inclinaison */}
              <Field tour="tilt" icon="architecture" label="Inclinaison du toit">
                <select
                  value={tilt}
                  onChange={(e) => setTilt(e.target.value === 'flat' ? 'flat' : Number(e.target.value))}
                  className="w-full bg-transparent border-none font-body-lg text-body-lg text-on-surface focus:ring-0 p-0 cursor-pointer"
                >
                  {TILT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </Field>

              {/* Orientation */}
              <Field tour="orientation" icon="explore" label="Orientation">
                <div className="flex gap-2 mt-2">
                  {ORIENTATIONS.map((o) => (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => setOrientation(o.value)}
                      className={
                        'flex-1 py-2 rounded-lg font-label-md text-label-md transition-colors ' +
                        (orientation === o.value
                          ? 'bg-primary-container text-on-primary-container border border-primary shadow-sm'
                          : 'bg-surface-variant text-on-surface hover:bg-surface-container-high')
                      }
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </Field>

              {/* Facture mensuelle moyenne → consommation estimée */}
              <Field tour="bill" icon="receipt_long" label="Facture d'électricité mensuelle (€)">
                <input
                  type="number"
                  min="0"
                  value={monthlyBill}
                  onChange={(e) => setMonthlyBill(Math.max(0, Number(e.target.value)))}
                  className="w-full bg-transparent border-none font-body-lg text-body-lg text-on-surface focus:ring-0 p-0"
                />
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  ≈ {formatNumber(estimate?.consumptionKwh || 0)} kWh/an de consommation
                </span>
              </Field>

              {/* Batterie de stockage (pilote l'autoconsommation, sans jargon) */}
              <Field tour="battery" icon="battery_charging_full" label="Batterie de stockage ?">
                <div className="flex gap-2 mt-2">
                  {[
                    { value: false, label: 'Non' },
                    { value: true, label: 'Oui' },
                  ].map((o) => (
                    <button
                      key={o.label}
                      type="button"
                      onClick={() => setHasBattery(o.value)}
                      className={
                        'flex-1 py-2 rounded-lg font-label-md text-label-md transition-colors ' +
                        (hasBattery === o.value
                          ? 'bg-primary-container text-on-primary-fixed border border-primary shadow-sm'
                          : 'bg-surface-variant text-on-surface hover:bg-surface-container-high')
                      }
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  Une batterie augmente la part d'énergie consommée chez vous ; le surplus est revendu à{' '}
                  {formatNumber((baseMetrics.feedInTariff || 0) * 100, 1)} c€/kWh.
                </span>
              </Field>
            </div>

            {/* Widget estimation live (overflow visible pour laisser passer l'infobulle ;
                l'icône décorative est clipée par son propre conteneur) */}
            <div data-tour="estimate" className="shrink-0 bg-tertiary-fixed text-on-tertiary-fixed rounded-xl p-6 relative">
              <div className="absolute inset-0 overflow-hidden rounded-xl pointer-events-none">
                <span
                  className="material-symbols-outlined text-[120px] opacity-10 absolute -right-4 -top-4"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  solar_power
                </span>
              </div>
              <h3 className="font-headline-md text-headline-md mb-6 relative z-10">Estimation du système</h3>
              <div className="grid grid-cols-3 gap-4 relative z-10">
                <Stat label="Capacité" value={estimate ? formatNumber(estimate.systemCapacityKw, 1) : '—'} unit="kWc" />
                <Stat label="Panneaux" value={estimate ? formatNumber(estimate.panelsCount) : '—'} />
                <Stat label="Production/an" value={estimate ? formatNumber(estimate.yearlyProductionKwh) : '—'} unit="kWh" />
              </div>
              <div className="mt-5 pt-4 border-t border-on-tertiary-fixed/15 flex justify-between items-end relative z-10">
                <div>
                  <p className="font-label-sm text-label-sm text-on-tertiary-fixed-variant mb-1">Économies estimées</p>
                  <p className="font-headline-md text-headline-md font-bold text-on-tertiary-fixed">
                    {estimate ? formatNumber(estimate.annualSavings) : '—'}{' '}
                    <span className="font-body-sm text-body-sm">€/an</span>
                  </p>
                </div>
                <p className="font-label-sm text-label-sm text-on-tertiary-fixed-variant text-right">
                  {estimate ? `${estimate.billOffsetPct}% de la facture` : ''}
                </p>
              </div>
              <div className="mt-3 flex justify-between items-baseline relative z-10">
                <span className="font-label-sm text-label-sm text-on-tertiary-fixed-variant">
                  Coût net{estimate?.batteryCost ? ' (panneaux + batterie)' : ''}
                </span>
                <span className="font-label-md text-label-md text-on-tertiary-fixed">
                  {estimate ? formatNumber(estimate.installationCost) : '—'} €
                  {estimate?.subsidy ? (
                    <span className="font-label-sm text-label-sm text-on-tertiary-fixed-variant">
                      {' '}· aides −{formatNumber(estimate.subsidy)} €
                      <InfoTooltip text={SUBSIDY_INFO} href={subsidyLink(selected.countryCode)} align="right" />
                    </span>
                  ) : null}
                </span>
              </div>
            </div>

            <button
              type="button"
              data-tour="compute"
              disabled={!estimate}
              onClick={() => onCompute(estimate)}
              className="shrink-0 w-full bg-primary-container text-on-primary-fixed font-label-md text-label-md py-4 rounded-xl shadow-md hover:brightness-95 transition flex justify-center items-center gap-2 disabled:opacity-60"
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                calculate
              </span>
              Calculer mes économies
            </button>
          </>
        )}
      </section>
    </div>
  )
}

function MapToggle({ active, onClick, icon, label, loading, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={
        'flex items-center gap-2 px-3 py-2 rounded-full font-label-sm text-label-sm shadow-sm transition disabled:opacity-50 ' +
        (active && !disabled
          ? 'bg-primary-container text-on-primary-fixed'
          : 'bg-surface/90 backdrop-blur text-on-surface-variant hover:text-on-surface')
      }
    >
      <span className={'material-symbols-outlined text-[18px] ' + (loading ? 'animate-spin' : '')}>
        {loading ? 'progress_activity' : icon}
      </span>
      {label}
    </button>
  )
}

function Field({ icon, label, children, tour }) {
  return (
    <div data-tour={tour} className="bg-surface-container-lowest rounded-xl p-4 card-shadow border border-surface-variant focus-within:card-shadow-lifted transition-all">
      <label className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-2 mb-2">
        <span className="material-symbols-outlined text-[18px]">{icon}</span>
        {label}
      </label>
      {children}
    </div>
  )
}

function Stat({ label, value, unit }) {
  return (
    <div>
      <p className="font-label-sm text-label-sm text-on-tertiary-fixed-variant mb-1">{label}</p>
      <p className="font-headline-md text-[20px] leading-tight font-bold text-on-tertiary-fixed tabular-nums">
        {value}
        {unit && <span className="block font-body-sm text-body-sm font-normal">{unit}</span>}
      </p>
    </div>
  )
}

function ParamsSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {[0, 1, 2].map((i) => (
        <div key={i} className="skeleton h-20 rounded-xl" />
      ))}
      <div className="skeleton h-32 rounded-xl mt-2" />
    </div>
  )
}
