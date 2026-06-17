import { useEffect, useRef } from 'react'
import { formatNumber } from '../services/geoUtils.js'
import { projectSavings } from '../services/solarApi.js'
import { ELEC_PRICE_INFLATION, PANEL_DEGRADATION } from '../config/constants.js'

// Graphique de retour sur investissement : économies cumulées (avec hausse du prix de
// l'électricité et dégradation des panneaux) confrontées au coût. Croisement = rentabilité.
export default function RoiChart({ metrics }) {
  const canvasRef = useRef(null)
  const chartRef = useRef(null)

  const { installationCost, lifespanYears, pricePerKwh, feedInTariff, priceSource, pricePeriod } = metrics
  const projection = projectSavings(metrics)
  const priceLabel =
    priceSource === 'eurostat' ? `Eurostat ${pricePeriod || ''}`.trim() : 'estimation'

  useEffect(() => {
    if (!window.Chart || !canvasRef.current) return

    const years = Array.from({ length: lifespanYears }, (_, i) => i + 1)
    const costLine = years.map(() => installationCost)

    if (chartRef.current) chartRef.current.destroy()

    chartRef.current = new window.Chart(canvasRef.current.getContext('2d'), {
      type: 'line',
      data: {
        labels: years.map((y) => `An ${y}`),
        datasets: [
          {
            label: 'Économies cumulées',
            data: projection.cumulative,
            borderColor: '#006e1c',
            backgroundColor: 'rgba(0, 110, 28, 0.08)',
            borderWidth: 3,
            fill: true,
            tension: 0.35,
            pointRadius: 0,
            pointHoverRadius: 5,
            pointBackgroundColor: '#006e1c',
          },
          {
            label: "Coût d'installation",
            data: costLine,
            borderColor: '#705d00',
            borderWidth: 2,
            borderDash: [6, 6],
            fill: false,
            pointRadius: 0,
            pointHoverRadius: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: '#0b1c30',
            titleFont: { family: 'Inter', size: 13 },
            bodyFont: { family: 'Inter', size: 12 },
            padding: 12,
            cornerRadius: 8,
            callbacks: {
              label: (ctx) => `${ctx.dataset.label} : ${formatNumber(ctx.parsed.y)} €`,
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(70, 80, 106, 0.15)' },
            ticks: {
              color: '#46506a',
              font: { family: 'Inter', size: 12 },
              callback: (v) => `${formatNumber(v)} €`,
            },
          },
          x: {
            grid: { display: false },
            ticks: { color: '#46506a', font: { family: 'Inter', size: 11 }, maxRotation: 0, autoSkipPadding: 16 },
          },
        },
        interaction: { mode: 'nearest', axis: 'x', intersect: false },
      },
    })

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy()
        chartRef.current = null
      }
    }
  }, [projection, installationCost, lifespanYears])

  return (
    <div className="bg-surface-container-lowest rounded-xl p-6 card-shadow border border-outline-variant/30">
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
        <div>
          <h3 className="font-headline-md text-headline-md text-on-surface">Retour sur investissement</h3>
          <p className="font-body-sm text-body-sm text-on-surface-variant">Économies cumulées sur {lifespanYears} ans</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {projection.breakEvenYear && (
            <span className="bg-secondary-container text-on-secondary-container px-4 py-2 rounded-full font-label-md text-label-md flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                trending_up
              </span>
              Rentable en {formatNumber(projection.breakEvenYear, 1)} ans
            </span>
          )}
          <span className="bg-primary-container text-on-primary-fixed px-4 py-2 rounded-full font-label-md text-label-md flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              savings
            </span>
            +{formatNumber(projection.lifetimeGain)} € sur {lifespanYears} ans
          </span>
        </div>
      </div>
      <div className="flex gap-4 mb-4">
        <span className="flex items-center gap-2 font-label-sm text-label-sm text-on-surface-variant">
          <span className="w-3 h-3 rounded-full bg-secondary" /> Économies cumulées
        </span>
        <span className="flex items-center gap-2 font-label-sm text-label-sm text-on-surface-variant">
          <span className="w-3 h-3 rounded-full bg-primary" /> Coût d'installation
        </span>
      </div>
      <div className="relative w-full h-[320px]">
        <canvas ref={canvasRef} />
      </div>
      <p className="font-label-sm text-label-sm text-on-surface-variant mt-4 pt-3 border-t border-outline-variant/30">
        Hypothèses : prix de l'électricité {formatNumber((pricePerKwh || 0) * 100, 1)} c€/kWh ({priceLabel}, +
        {Math.round(ELEC_PRICE_INFLATION * 100)} %/an), rachat du surplus {formatNumber((feedInTariff || 0) * 100, 1)} c€/kWh,
        durée de vie {lifespanYears} ans, dégradation des panneaux {String(PANEL_DEGRADATION * 100).replace('.', ',')} %/an.
      </p>
    </div>
  )
}
