import { EU_2030_TARGET, COST_PER_KWP, SYSTEM_LIFESPAN_YEARS } from '../config/constants.js'

// Page « À propos » : explique la méthodologie et les sources de données.
export default function AboutPage({ onStart }) {
  return (
    <div className="w-full max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-12 flex flex-col gap-12">
      <header className="max-w-3xl">
        <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">À propos</span>
        <h1 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface mt-1">
          Comment Solora estime votre potentiel
        </h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant mt-3">
          Une estimation transparente, basée sur des données satellites et des sources publiques. Aucune donnée
          personnelle stockée : tout est calculé dans votre navigateur.
        </p>
      </header>

      {/* Sources */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
        <SourceCard
          icon="satellite_alt"
          title="Google Solar API"
          text="Analyse la toiture à partir d'imagerie aérienne : surface exploitable, nombre de panneaux, ensoleillement annuel et facteur d'émissions CO₂ local."
        />
        <SourceCard
          icon="bar_chart"
          title="Eurostat (en direct)"
          text="Deux indicateurs officiels récupérés en live : la part de renouvelables par pays (nrg_ind_ren) et le prix réel de l'électricité des ménages (nrg_pc_204, toutes taxes)."
        />
        <SourceCard
          icon="calculate"
          title="Hypothèses & calculs"
          text="Coût au kWc, tarifs de rachat et aides par pays, autoconsommation, inflation et dégradation : des hypothèses assumées (détaillées ci-dessous), combinées côté client."
        />
      </section>

      {/* Méthodologie détaillée */}
      <section className="bg-surface-container-lowest rounded-xl p-6 md:p-8 card-shadow border border-outline-variant/30">
        <h2 className="font-headline-md text-headline-md text-on-surface mb-6">Méthodologie de calcul</h2>
        <ol className="flex flex-col gap-5">
          <Step n="1" title="Dimensionnement">
            Le système est dimensionné par défaut pour couvrir ~votre consommation (déduite de votre facture), borné par
            la surface de toit détectée. Vous pouvez l'ajuster manuellement.
          </Step>
          <Step n="2" title="Production annuelle">
            Issue directement de la Solar API (<code className="font-mono text-body-sm">yearlyEnergyDcKwh</code>), selon
            l'ensoleillement, l'orientation et l'inclinaison réels du toit.
          </Step>
          <Step n="3" title="Économies (autoconsommation + surplus)">
            On sépare l'énergie consommée sur place — économisée au <strong>prix réel Eurostat</strong> de votre pays — du
            surplus réinjecté, valorisé au <strong>tarif de rachat</strong> (plus bas). La part autoconsommée dépend de la
            présence d'une batterie (~35 % sans, ~75 % avec).
          </Step>
          <Step n="4" title="Coût net">
            ≈ {COST_PER_KWP} €/kWc installé (+ batterie si choisie) <strong>moins les aides</strong> publiques estimées du
            pays.
          </Step>
          <Step n="5" title="CO₂ évité">
            Production (MWh) × facteur d'émissions local fourni par la Solar API, converti en tonnes par an puis cumulé
            sur la durée de vie.
          </Step>
          <Step n="6" title="Retour sur investissement">
            Économies projetées sur {SYSTEM_LIFESPAN_YEARS} ans avec hausse du prix de l'électricité (+4 %/an) et
            dégradation des panneaux (−0,5 %/an), confrontées au coût net → année de rentabilité et gain total.
          </Step>
        </ol>
      </section>

      {/* Avertissement */}
      <section className="bg-surface-container-low rounded-xl p-6 border border-outline-variant/30 flex items-start gap-4">
        <span className="material-symbols-outlined text-tertiary">info</span>
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          Ces résultats sont des <strong>estimations indicatives</strong> et ne remplacent pas une étude technique sur
          site. Les aides locales, l'autoconsommation et la revente de surplus peuvent sensiblement améliorer la
          rentabilité réelle. L'objectif UE de {EU_2030_TARGET}% de renouvelables en 2030 est une cible commune.
        </p>
      </section>

      <div className="flex justify-center">
        <button
          type="button"
          onClick={onStart}
          className="bg-primary-container text-on-primary-fixed font-label-md text-label-md px-8 py-4 rounded-xl hover:brightness-95 transition flex items-center gap-2 shadow-sm"
        >
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>solar_power</span>
          Analyser mon toit
        </button>
      </div>
    </div>
  )
}

function SourceCard({ icon, title, text }) {
  return (
    <div className="bg-surface-container-lowest rounded-xl p-6 card-shadow border border-outline-variant/30 flex flex-col gap-4">
      <div className="bg-primary-container/30 w-12 h-12 rounded-full flex items-center justify-center">
        <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
      </div>
      <h3 className="font-headline-md text-headline-md text-on-surface">{title}</h3>
      <p className="font-body-md text-body-md text-on-surface-variant">{text}</p>
    </div>
  )
}

function Step({ n, title, children }) {
  return (
    <li className="flex gap-4">
      <span className="bg-primary-container text-on-primary-container font-label-md text-label-md w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0">
        {n}
      </span>
      <div>
        <h4 className="font-label-md text-label-md text-on-surface mb-1">{title}</h4>
        <p className="font-body-md text-body-md text-on-surface-variant">{children}</p>
      </div>
    </li>
  )
}
