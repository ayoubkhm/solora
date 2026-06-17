import { formatNumber, kgToTonnes, co2ToTrees, subsidyLink } from '../services/geoUtils.js'
import InfoTooltip from './InfoTooltip.jsx'

const SUBSIDY_INFO =
  "Estimation indicative des aides publiques de votre pays (crédit d'impôt, prime à l'autoconsommation, TVA réduite…). Le montant réel dépend de votre région, de vos revenus et des dispositifs en vigueur."

// Détaille comment le montant d'économies est obtenu (autoconsommation + revente surplus).
export function SavingsBreakdown({ metrics }) {
  const retailC = Math.round((metrics.pricePerKwh || 0) * 100)
  const feedC = Math.round((metrics.feedInTariff || 0) * 100 * 10) / 10
  return (
    <div className="bg-surface-container-lowest rounded-xl p-6 card-shadow border border-outline-variant/30">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <h3 className="font-headline-md text-headline-md text-on-surface">D'où viennent vos économies ?</h3>
        <span className="bg-secondary-container text-on-secondary-container font-label-sm text-label-sm px-3 py-1.5 rounded-full">
          {metrics.energyCoveredPct >= 100
            ? 'Couvre 100% de votre consommation'
            : `Couvre ${metrics.energyCoveredPct}% de votre consommation`}
        </span>
      </div>

      <p className="font-body-sm text-body-sm text-on-surface-variant mb-5">
        Sur une consommation estimée de <strong>{formatNumber(metrics.consumptionKwh)} kWh/an</strong>, votre
        installation produit <strong>{formatNumber(metrics.yearlyProductionKwh)} kWh/an</strong>. On distingue
        l'énergie consommée sur place (économisée au prix de détail) du surplus revendu au réseau — en supposant{' '}
        <strong>{Math.round((metrics.selfConsumptionRate || 0) * 100)}%</strong> d'autoconsommation
        {metrics.selfConsumptionRate >= 0.7 ? ' (avec batterie)' : ' (sans batterie)'}.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-gutter">
        <BreakdownRow
          icon="home"
          iconColor="text-secondary"
          title="Autoconsommation"
          detail={`${formatNumber(metrics.selfConsumedKwh)} kWh × ${retailC} c€ (prix détail)`}
          amount={metrics.savingsSelf}
        />
        <BreakdownRow
          icon="sync_alt"
          iconColor="text-tertiary"
          title="Surplus revendu"
          detail={`${formatNumber(metrics.exportedKwh)} kWh × ${feedC} c€ (rachat)`}
          amount={metrics.revenueExport}
        />
      </div>

      <div className="flex items-center justify-between mt-5 pt-4 border-t border-outline-variant/40">
        <span className="font-label-md text-label-md text-on-surface uppercase tracking-wider">Économies totales</span>
        <span className="font-headline-md text-headline-md text-secondary">
          {formatNumber(metrics.annualSavings)} €/an
        </span>
      </div>
    </div>
  )
}

function BreakdownRow({ icon, iconColor, title, detail, amount }) {
  return (
    <div className="bg-surface-container-low rounded-xl p-5 flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <span className={`material-symbols-outlined text-[20px] ${iconColor}`} style={{ fontVariationSettings: "'FILL' 1" }}>
          {icon}
        </span>
        <span className="font-label-md text-label-md text-on-surface">{title}</span>
      </div>
      <p className="font-headline-lg text-headline-lg-mobile text-on-surface whitespace-nowrap tabular-nums">
        {formatNumber(amount)} €
      </p>
      <p className="font-label-sm text-label-sm text-on-surface-variant">{detail}</p>
    </div>
  )
}

// Une carte KPI individuelle.
function MetricCard({ icon, iconBg, iconColor, label, value, unit, badge, badgeClass, footer }) {
  return (
    <div className="bg-surface-container-lowest rounded-xl p-6 card-shadow border border-outline-variant/30 flex flex-col justify-between">
      <div className="flex justify-between items-start mb-4">
        <div className={`${iconBg} p-3 rounded-full`}>
          <span className={`material-symbols-outlined ${iconColor} text-2xl`} style={{ fontVariationSettings: "'FILL' 1" }}>
            {icon}
          </span>
        </div>
        {badge && (
          <span className={`${badgeClass} font-label-sm text-label-sm px-2 py-1 rounded-full flex items-center gap-1`}>
            {badge}
          </span>
        )}
      </div>
      <div>
        <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-1">{label}</p>
        <div className="flex items-baseline gap-2">
          <h2 className="font-headline-lg text-headline-lg text-on-surface">{value}</h2>
          <span className="font-body-sm text-body-sm text-on-surface-variant">{unit}</span>
        </div>
        {footer && <p className="font-label-sm text-label-sm text-secondary mt-2 flex items-center gap-1">{footer}</p>}
      </div>
    </div>
  )
}

// Grille des 4 indicateurs principaux + carte de détails d'installation.
export default function SolarCard({ metrics }) {
  const tonnes = kgToTonnes(metrics.co2OffsetKgPerYear)
  const trees = co2ToTrees(metrics.co2OffsetKgPerYear)
  const lifetimeTonnes = kgToTonnes(metrics.co2OffsetKgPerYear * (metrics.lifespanYears || 25))

  return (
    <div className="flex flex-col gap-gutter">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-gutter">
        <MetricCard
          icon="solar_power"
          iconBg="bg-primary-container/30"
          iconColor="text-primary"
          label="Panneaux recommandés"
          value={formatNumber(metrics.panelsCount)}
          unit="panneaux"
          badge="Haut potentiel"
          badgeClass="bg-primary-container text-on-primary-fixed"
        />
        <MetricCard
          icon="bolt"
          iconBg="bg-primary-container/30"
          iconColor="text-primary"
          label="Production annuelle"
          value={formatNumber(metrics.yearlyProductionKwh)}
          unit="kWh/an"
        />
        <MetricCard
          icon="euro"
          iconBg="bg-secondary-container/40"
          iconColor="text-secondary"
          label="Économies annuelles"
          value={formatNumber(metrics.annualSavings)}
          unit="€/an"
        />
        <MetricCard
          icon="eco"
          iconBg="bg-secondary-container/40"
          iconColor="text-secondary"
          label="CO₂ évité par an"
          value={formatNumber(tonnes, 1)}
          unit="t CO₂/an"
          badge="Éco-responsable"
          badgeClass="bg-secondary text-on-secondary"
          footer={
            <>
              <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                forest
              </span>
              ~{formatNumber(trees)} arbres · {formatNumber(lifetimeTonnes, 1)} t sur {metrics.lifespanYears || 25} ans
            </>
          }
        />
      </div>

      {/* Détails de l'installation */}
      <div className="bg-surface-container-lowest rounded-xl p-6 card-shadow border border-outline-variant/30">
        <h4 className="font-label-md text-label-md text-on-surface uppercase tracking-wider mb-4 border-b border-outline-variant/30 pb-2">
          Détails de l'installation
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <Detail label="Puissance installée" value={`${formatNumber(metrics.systemCapacityKw, 1)} kWc`} />
          <Detail label="Surface exploitable" value={`${formatNumber(metrics.roofAreaM2)} m²`} />
          <Detail label="Ensoleillement" value={`${formatNumber(metrics.sunshineHoursPerYear)} h/an`} />
          <Detail label="Coût net (aides déduites)" value={`${formatNumber(metrics.installationCost)} €`} />
        </div>
      </div>
    </div>
  )
}

// Détaille le coût de l'installation : panneaux + batterie − aides = net.
export function CostBreakdown({ metrics }) {
  const subsidyPct = metrics.grossCost ? Math.round((metrics.subsidy / metrics.grossCost) * 100) : 0
  return (
    <div className="bg-surface-container-lowest rounded-xl p-6 card-shadow border border-outline-variant/30">
      <h3 className="font-headline-md text-headline-md text-on-surface mb-5">Coût de l'installation</h3>
      <ul className="flex flex-col gap-3">
        <CostRow
          label={`Panneaux & pose (${formatNumber(metrics.systemCapacityKw, 1)} kWc)`}
          value={metrics.panelsCost}
        />
        {metrics.batteryCost > 0 && <CostRow label="Batterie de stockage" value={metrics.batteryCost} />}
        <CostRow
          label={
            <>
              Aides &amp; subventions (≈ {subsidyPct}%, indicatif)
              <InfoTooltip text={SUBSIDY_INFO} href={subsidyLink(metrics.countryCode)} align="left" />
            </>
          }
          value={-metrics.subsidy}
          positive
        />
      </ul>
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-outline-variant/40">
        <span className="font-label-md text-label-md text-on-surface uppercase tracking-wider">Coût net</span>
        <span className="font-headline-md text-headline-md text-on-surface">
          {formatNumber(metrics.installationCost)} €
        </span>
      </div>
      <p className="font-label-sm text-label-sm text-on-surface-variant mt-3">
        Les aides sont une estimation indicative et varient selon votre pays, votre région et vos revenus.
      </p>
    </div>
  )
}

function CostRow({ label, value, positive }) {
  return (
    <li className="flex items-center justify-between">
      <span className="font-body-sm text-body-sm text-on-surface-variant">{label}</span>
      <span className={'font-label-md text-label-md ' + (positive ? 'text-secondary' : 'text-on-surface')}>
        {value < 0 ? '− ' : ''}
        {formatNumber(Math.abs(value))} €
      </span>
    </li>
  )
}

function Detail({ label, value }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-body-sm text-body-sm text-on-surface-variant">{label}</span>
      <span className="font-headline-md text-headline-md text-on-surface">{value}</span>
    </div>
  )
}

// Skeleton affiché pendant le chargement des données solaires.
export function SolarCardSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-gutter">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="bg-surface-container-lowest rounded-xl p-6 card-shadow border border-outline-variant/30">
          <div className="skeleton w-12 h-12 rounded-full mb-6" />
          <div className="skeleton h-3 w-2/3 rounded mb-3" />
          <div className="skeleton h-8 w-1/2 rounded" />
        </div>
      ))}
    </div>
  )
}
