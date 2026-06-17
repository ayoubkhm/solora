import { useEffect, useRef, useState } from 'react'
import {
  getAllEuRenewables,
  getAllElectricityPrices,
  getRenewablesTrend,
  getElectricityMix,
} from '../services/eurostatApi.js'
import { formatNumber } from '../services/geoUtils.js'
import { EU_2030_TARGET } from '../config/constants.js'

// Page « Contexte UE » : bandeau pays, mix électrique, évolution, et classement
// à bascule (part renouvelable / prix de l'électricité). `highlightCode` = pays analysé.
export default function EuContextPage({ highlightCode }) {
  const [data, setData] = useState(null)
  const [prices, setPrices] = useState(null)
  const [trend, setTrend] = useState(null)
  const [mix, setMix] = useState(null)
  const [error, setError] = useState(null)
  const [metric, setMetric] = useState('ren') // 'ren' | 'price'

  useEffect(() => {
    let cancelled = false
    getAllEuRenewables().then((d) => !cancelled && setData(d)).catch((e) => !cancelled && setError(e.message))
    getAllElectricityPrices().then((d) => !cancelled && setPrices(d)).catch(() => {})
    getRenewablesTrend(highlightCode).then((d) => !cancelled && setTrend(d)).catch(() => {})
    getElectricityMix(highlightCode).then((d) => !cancelled && setMix(d)).catch(() => {})
    return () => {
      cancelled = true
    }
  }, [highlightCode])

  const euGeo = highlightCode === 'GR' ? 'EL' : highlightCode
  const myCountry = data && euGeo ? data.countries.find((c) => c.code === euGeo) : null
  const myPrice = prices && euGeo ? prices.prices.find((c) => c.code === euGeo) : null

  return (
    <div className="w-full max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-12 flex flex-col gap-10">
      <header className="max-w-3xl">
        <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
          Données Eurostat {data ? `· ${data.year}` : ''}
        </span>
        <h1 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface mt-1">
          Le contexte énergétique européen
        </h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant mt-3">
          Part d'énergies renouvelables, mix de production et prix de l'électricité dans l'UE. L'objectif commun est de{' '}
          {EU_2030_TARGET}% de renouvelables d'ici 2030 — et plus l'électricité est chère, plus le solaire est rentable.
        </p>
      </header>

      {error && (
        <div className="bg-error-container text-on-error-container rounded-xl p-6 flex items-start gap-3">
          <span className="material-symbols-outlined">public_off</span>
          <p className="font-body-sm text-body-sm">Données Eurostat indisponibles pour le moment.</p>
        </div>
      )}

      {!data && !error && <SkeletonList />}

      {data && (
        <>
          {/* Bandeau personnalisé du pays analysé */}
          {myCountry && (
            <CountryBanner country={myCountry} total={data.totalCountries} price={myPrice} />
          )}

          {/* Mix électrique + évolution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-gutter">
            <MixDonut mix={mix} />
            <TrendCard trend={trend} />
          </div>

          {/* Cartouches synthèse */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-gutter">
            <SummaryCard label="Moyenne UE-27" value={data.euAverage != null ? `${formatNumber(data.euAverage, 1)}%` : '—'} icon="public" />
            <SummaryCard label="Objectif 2030" value={`${EU_2030_TARGET}%`} icon="flag" />
            <SummaryCard
              label="Prix élec. moyen UE"
              value={prices ? `${formatNumber(avg(prices.prices.map((p) => p.price)) * 100, 1)} c€/kWh` : '—'}
              icon="bolt"
            />
          </div>

          {/* Classement à bascule */}
          <div className="bg-surface-container-lowest rounded-xl p-6 md:p-8 card-shadow border border-outline-variant/30">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <h2 className="font-headline-md text-headline-md text-on-surface">Classement des 27 États membres</h2>
              <div className="flex bg-surface-container rounded-full p-1">
                <Toggle active={metric === 'ren'} onClick={() => setMetric('ren')}>Part renouvelable</Toggle>
                <Toggle active={metric === 'price'} onClick={() => setMetric('price')} disabled={!prices}>
                  Prix de l'électricité
                </Toggle>
              </div>
            </div>

            <Ranking metric={metric} data={data} prices={prices} highlight={euGeo} />

            <div className="flex flex-wrap items-center gap-4 mt-6 pt-4 border-t border-outline-variant/30">
              {metric === 'ren' ? (
                <>
                  <Legend color="bg-secondary" label="Part renouvelable" />
                  <Legend bar label={`Objectif 2030 (${EU_2030_TARGET}%)`} />
                  <Legend color="bg-secondary-fixed-dim" label="Objectif déjà atteint" />
                </>
              ) : (
                <Legend color="bg-primary-container" label="Prix de l'électricité (toutes taxes)" />
              )}
            </div>
          </div>

          <p className="font-label-sm text-label-sm text-on-surface-variant">
            Source :{' '}
            <a
              href="https://ec.europa.eu/eurostat/databrowser/product/page/nrg_ind_ren"
              target="_blank"
              rel="noopener noreferrer"
              className="text-secondary hover:underline"
            >
              Eurostat
            </a>{' '}
            — part renouvelable (nrg_ind_ren), prix de l'électricité (nrg_pc_204), mix de production (nrg_bal_peh).
          </p>
        </>
      )}
    </div>
  )
}

function avg(arr) {
  if (!arr || !arr.length) return 0
  return arr.reduce((a, b) => a + b, 0) / arr.length
}

/* ---------- Bandeau pays ---------- */
function CountryBanner({ country, total, price }) {
  const reached = country.value >= EU_2030_TARGET
  const gap = Math.max(0, EU_2030_TARGET - country.value)
  return (
    <div className="bg-tertiary-fixed text-on-tertiary-fixed rounded-xl p-6 md:p-8 flex flex-col md:flex-row md:items-center gap-6">
      <div className="flex items-center gap-3 md:w-64 flex-shrink-0">
        <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>person_pin_circle</span>
        <div>
          <p className="font-label-sm text-label-sm text-on-tertiary-fixed-variant uppercase tracking-wider">Votre pays</p>
          <p className="font-headline-md text-headline-md">{country.name}</p>
        </div>
      </div>
      <div className="flex-grow grid grid-cols-2 sm:grid-cols-3 gap-4">
        <BannerStat value={`${formatNumber(country.value, 1)}%`} label="renouvelable" />
        <BannerStat value={`${country.rank}ᵉ`} label={`sur ${total} pays`} />
        <BannerStat
          value={reached ? '✓' : `${formatNumber(gap, 1)} pts`}
          label={reached ? 'objectif 2030 atteint' : "jusqu'à l'objectif 2030"}
        />
        {price && <BannerStat value={`${formatNumber(price.price * 100, 1)} c€`} label="le kWh (toutes taxes)" />}
      </div>
    </div>
  )
}

function BannerStat({ value, label }) {
  return (
    <div>
      <p className="font-headline-md text-headline-md text-on-tertiary-fixed tabular-nums">{value}</p>
      <p className="font-label-sm text-label-sm text-on-tertiary-fixed-variant">{label}</p>
    </div>
  )
}

/* ---------- Donut mix électrique ---------- */
function MixDonut({ mix }) {
  return (
    <div className="bg-surface-container-lowest rounded-xl p-6 md:p-8 card-shadow border border-outline-variant/30">
      <h2 className="font-headline-md text-headline-md text-on-surface mb-1">Mix de production électrique</h2>
      <p className="font-label-sm text-label-sm text-on-surface-variant mb-6">
        {mix ? `${mix.label} · ${mix.period}` : 'Chargement…'}
      </p>
      {!mix ? (
        <div className="skeleton h-48 rounded-xl" />
      ) : (
        <div className="flex flex-col sm:flex-row items-center gap-8">
          <div className="relative w-44 h-44 flex-shrink-0">
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: `conic-gradient(#006e1c 0% ${mix.renewable}%, #545f73 ${mix.renewable}% ${mix.renewable + mix.nuclear}%, #705d00 ${mix.renewable + mix.nuclear}% 100%)`,
              }}
            />
            <div className="absolute inset-[22%] bg-surface-container-lowest rounded-full flex flex-col items-center justify-center">
              <span className="font-headline-md text-headline-md text-secondary">{mix.renewable}%</span>
              <span className="font-label-sm text-label-sm text-on-surface-variant">renouvelable</span>
            </div>
          </div>
          <div className="flex flex-col gap-3 w-full">
            <MixLegend color="bg-secondary" label="Renouvelable" value={mix.renewable} />
            <MixLegend color="bg-tertiary" label="Nucléaire" value={mix.nuclear} />
            <MixLegend color="bg-primary" label="Fossile" value={mix.fossil} />
          </div>
        </div>
      )}
    </div>
  )
}

function MixLegend({ color, label, value }) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 font-body-sm text-body-sm text-on-surface">
        <span className={`w-3 h-3 rounded-full ${color}`} /> {label}
      </span>
      <span className="font-label-md text-label-md text-on-surface tabular-nums">{value}%</span>
    </div>
  )
}

/* ---------- Graphe d'évolution ---------- */
function TrendCard({ trend }) {
  const canvasRef = useRef(null)
  const chartRef = useRef(null)

  useEffect(() => {
    if (!trend || !window.Chart || !canvasRef.current) return
    const datasets = [
      {
        label: 'Moyenne UE-27',
        data: trend.eu,
        borderColor: '#545f73',
        backgroundColor: 'transparent',
        borderWidth: 2,
        tension: 0.3,
        pointRadius: 0,
      },
    ]
    if (trend.country) {
      datasets.push({
        label: trend.countryLabel,
        data: trend.country,
        borderColor: '#006e1c',
        backgroundColor: 'rgba(0,110,28,0.08)',
        borderWidth: 3,
        fill: true,
        tension: 0.3,
        pointRadius: 0,
      })
    }
    if (chartRef.current) chartRef.current.destroy()
    chartRef.current = new window.Chart(canvasRef.current.getContext('2d'), {
      type: 'line',
      data: { labels: trend.years, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true, labels: { color: '#46506a', font: { family: 'Inter', size: 11 }, boxWidth: 12 } },
          tooltip: { callbacks: { label: (c) => `${c.dataset.label} : ${c.parsed.y}%` } },
          annotation: undefined,
        },
        scales: {
          y: {
            grid: { color: 'rgba(70,80,106,0.12)' },
            ticks: { color: '#46506a', font: { family: 'Inter', size: 11 }, callback: (v) => `${v}%` },
          },
          x: { grid: { display: false }, ticks: { color: '#46506a', font: { family: 'Inter', size: 10 }, autoSkipPadding: 12 } },
        },
      },
    })
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy()
        chartRef.current = null
      }
    }
  }, [trend])

  return (
    <div className="bg-surface-container-lowest rounded-xl p-6 md:p-8 card-shadow border border-outline-variant/30">
      <h2 className="font-headline-md text-headline-md text-on-surface mb-1">Progression vers 2030</h2>
      <p className="font-label-sm text-label-sm text-on-surface-variant mb-6">Part de renouvelables depuis 2014</p>
      {!trend ? (
        <div className="skeleton h-48 rounded-xl" />
      ) : (
        <div className="relative w-full h-48">
          <canvas ref={canvasRef} />
        </div>
      )}
    </div>
  )
}

/* ---------- Classement (renouvelable ou prix) ---------- */
function Ranking({ metric, data, prices, highlight }) {
  if (metric === 'price') {
    if (!prices) return <SkeletonList rows={6} />
    const max = prices.prices[0]?.price || 1
    return (
      <ul className="flex flex-col gap-3">
        {prices.prices.map((c) => (
          <Row
            key={c.code}
            rank={c.rank}
            name={c.name}
            width={Math.max(2, (c.price / max) * 100)}
            display={`${formatNumber(c.price * 100, 1)} c€`}
            barClass="bg-primary-container"
            highlight={c.code === highlight}
          />
        ))}
      </ul>
    )
  }
  const max = data.countries[0].value
  return (
    <ul className="flex flex-col gap-3">
      {data.countries.map((c) => (
        <Row
          key={c.code}
          rank={c.rank}
          name={c.name}
          width={Math.max(2, (c.value / max) * 100)}
          display={`${formatNumber(c.value, 1)}%`}
          barClass={c.value >= EU_2030_TARGET ? 'bg-secondary-fixed-dim' : 'bg-secondary'}
          targetPos={(EU_2030_TARGET / max) * 100}
          highlight={c.code === highlight}
        />
      ))}
    </ul>
  )
}

function Row({ rank, name, width, display, barClass, targetPos, highlight }) {
  return (
    <li className={`flex items-center gap-4 rounded-lg px-3 py-2 ${highlight ? 'bg-primary-container/30 ring-1 ring-primary' : ''}`}>
      <span className="font-label-sm text-label-sm text-on-surface-variant w-7 text-right tabular-nums">{rank}</span>
      <span className="font-label-md text-label-md text-on-surface w-28 md:w-40 truncate flex items-center gap-2">
        {name}
        {highlight && (
          <span className="material-symbols-outlined text-[16px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
            person_pin_circle
          </span>
        )}
      </span>
      <div className="relative flex-grow h-5 bg-surface-variant rounded-full overflow-hidden">
        <div className={`absolute top-0 left-0 h-full rounded-full transition-all duration-700 ${barClass}`} style={{ width: `${width}%` }} />
        {targetPos != null && <div className="absolute top-0 bottom-0 w-0.5 bg-primary z-10" style={{ left: `${targetPos}%` }} />}
      </div>
      <span className="font-label-md text-label-md text-on-surface w-16 text-right tabular-nums">{display}</span>
    </li>
  )
}

function Toggle({ active, onClick, disabled, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={
        'font-label-sm text-label-sm px-4 py-2 rounded-full transition disabled:opacity-40 ' +
        (active ? 'bg-primary-container text-on-primary-fixed shadow-sm' : 'text-on-surface-variant hover:text-on-surface')
      }
    >
      {children}
    </button>
  )
}

function Legend({ color, bar, label }) {
  return (
    <span className="flex items-center gap-2 font-label-sm text-label-sm text-on-surface-variant">
      {bar ? <span className="w-0.5 h-3 bg-primary" /> : <span className={`w-3 h-3 rounded-full ${color}`} />}
      {label}
    </span>
  )
}

function SummaryCard({ label, value, icon }) {
  return (
    <div className="bg-surface-container-lowest rounded-xl p-6 card-shadow border border-outline-variant/30 flex items-center gap-4">
      <div className="bg-secondary-container/40 p-3 rounded-full">
        <span className="material-symbols-outlined text-secondary text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
      </div>
      <div>
        <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">{label}</p>
        <p className="font-headline-md text-headline-md text-on-surface">{value}</p>
      </div>
    </div>
  )
}

function SkeletonList({ rows = 12 }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton h-5 rounded-full" />
      ))}
    </div>
  )
}
