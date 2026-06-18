import { useState, useEffect, useRef, useMemo } from 'react'
import SearchBar from './components/SearchBar.jsx'
import Map from './components/Map.jsx'
import SolarCard, { SolarCardSkeleton, SavingsBreakdown, CostBreakdown } from './components/SolarCard.jsx'
import RoiChart from './components/RoiChart.jsx'
import RoofAnalysis from './components/RoofAnalysis.jsx'
import EuContextPage from './components/EuContextPage.jsx'
import AboutPage from './components/AboutPage.jsx'
import Splash from './components/Splash.jsx'
import SunLogo from './components/SunLogo.jsx'
import Tour from './components/Tour.jsx'
import { getSolarPotential } from './services/solarApi.js'
import { getElectricityPrice } from './services/eurostatApi.js'
import { installerDirectoryForCountry } from './services/geoUtils.js'
import { GOOGLE_API_KEY, COUNTRY_NAMES, ISO_TO_EUROSTAT } from './config/constants.js'

// Routing minimal par hash (sans librairie). Chaque entrée = une vue.
const ROUTES = {
  home: '',
  analyse: '#analyse',
  dashboard: '#tableau-de-bord',
  context: '#contexte-ue',
  about: '#a-propos',
}
const HASH_TO_VIEW = {
  '#analyse': 'analyse',
  '#tableau-de-bord': 'dashboard',
  '#contexte-ue': 'context',
  '#a-propos': 'about',
}
function viewFromHash(hash) {
  return HASH_TO_VIEW[hash] || 'home'
}

// Image hébergée localement (public/) ; BASE_URL gère le sous-chemin en prod (/solora/).
const HERO_IMG = `${import.meta.env.BASE_URL}hero-house.png`
const HERO_VIDEO = `${import.meta.env.BASE_URL}hero.mp4`

// Adresse de démonstration (coordonnées en dur, toit couvert par la Solar API vérifié) :
// permet de lancer une analyse en un clic, sans géocodage — fiable pour une démo live.
const EXAMPLE_PLACE = {
  address: '151 Avenue des Druides, 56340 Carnac',
  lat: 47.5747015,
  lng: -3.0609878,
  countryCode: 'FR',
}

// Étapes du tutoriel guidé (page Analyse), déclenché après la démo « Voir un exemple ».
// `roofRef` permet aux étapes interactives de piloter les animations de la carte.
function buildTourSteps(roofRef) {
  return [
    {
      target: 'map',
      title: 'Votre toit, vu du ciel 🛰️',
      text: "La couche colorée, c'est l'ensoleillement de votre toiture calculé par Google ; les rectangles bleus sont les panneaux placés automatiquement.",
    },
    {
      target: 'surface',
      title: 'Surface exploitable',
      text: 'La surface détectée sur votre toit. Le système est pré-dimensionné pour couvrir votre consommation — ajustez librement.',
    },
    {
      target: 'map',
      extra: ['surface'],
      title: 'Plus de surface, plus de panneaux ☀️',
      text: "Regardez : quand la surface augmente, les panneaux se multiplient sur votre toit jusqu'au maximum exploitable.",
      onEnter: () => roofRef.current?.animateSurface(),
    },
    {
      target: 'months',
      title: 'À toi de jouer 🎚️',
      text: "Glisse le curseur pour voir l'ensoleillement de ton toit mois par mois — sombre en hiver, éclatant en été. Reviens sur « Année » pour le bilan annuel.",
      interactive: true,
      onEnter: () => roofRef.current?.focusMonths(),
    },
    {
      target: 'tilt',
      title: 'Inclinaison du toit',
      text: "L'angle de la toiture influe sur la production ; ~30° est l'optimum sous nos latitudes.",
    },
    {
      target: 'orientation',
      title: 'Orientation',
      text: 'Plein sud = production maximale. Est / Ouest produisent un peu moins.',
    },
    {
      target: 'bill',
      title: 'Votre facture',
      text: 'Indiquez votre facture mensuelle : on en déduit votre consommation annuelle pour des économies réalistes.',
    },
    {
      target: 'battery',
      title: 'Avec ou sans batterie ?',
      text: "Une batterie augmente la part d'énergie consommée chez vous (activée par défaut), au lieu de revendre le surplus moins cher.",
    },
    {
      target: 'estimate',
      title: 'Estimation en direct',
      text: 'Capacité, panneaux, production et économies se recalculent instantanément à chaque réglage.',
    },
    {
      target: 'compute',
      title: 'Place au tableau de bord 🚀',
      text: 'Cliquez pour le détail complet : économies, coût net, rentabilité sur 25 ans et impact CO₂.',
      finishLabel: 'Voir mes économies',
      clickOnFinish: true,
    },
  ]
}

export default function App() {
  const [selected, setSelected] = useState(null) // { address, lat, lng, countryCode }
  const [baseMetrics, setBaseMetrics] = useState(null) // données brutes Solar API
  const [metrics, setMetrics] = useState(null) // métriques affichées au dashboard (ajustables)
  const [loadingSolar, setLoadingSolar] = useState(false)
  const [solarError, setSolarError] = useState(null)
  const [globalError, setGlobalError] = useState(null)

  const [view, setView] = useState(viewFromHash(window.location.hash))

  // Écran de lancement animé (sauf si l'utilisateur préfère moins d'animations).
  const reducedMotion =
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const [splash, setSplash] = useState(!reducedMotion)
  useEffect(() => {
    if (!splash) return
    const t = setTimeout(() => setSplash(false), 2300)
    return () => clearTimeout(t)
  }, [splash])

  // Synchronise la vue avec le hash (deep-link + boutons précédent/suivant) et remonte en haut.
  useEffect(() => {
    const onHash = () => {
      setView(viewFromHash(window.location.hash))
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  // Navigation déclenchée par la nav / le footer / le logo.
  function navigate(target) {
    const hash = ROUTES[target] ?? target
    if (window.location.hash === hash) {
      setView(viewFromHash(hash))
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      window.location.hash = hash
    }
  }

  async function handleSelect(place) {
    setGlobalError(null)
    setSolarError(null)
    setBaseMetrics(null)
    setMetrics(null)
    setSelected(place)
    setLoadingSolar(true)
    navigate('analyse') // une adresse choisie → page Analyse du toit

    // Prix de l'électricité réel (Eurostat live) ; null si indispo → fallback table.
    const priceInfo = await getElectricityPrice(place.countryCode)

    getSolarPotential(place.lat, place.lng, place.countryCode, priceInfo?.price)
      .then((m) => {
        const enriched = {
          ...m,
          priceSource: priceInfo ? 'eurostat' : 'estimation',
          pricePeriod: priceInfo?.period || null,
        }
        setBaseMetrics(enriched)
        setMetrics(enriched) // valeur par défaut si l'utilisateur ne tune pas
      })
      .catch((err) => setSolarError(err.message || 'Erreur lors de l\'analyse solaire.'))
      .finally(() => setLoadingSolar(false))
  }

  // L'utilisateur a ajusté son toit → métriques recalculées, direction le tableau de bord.
  function handleCompute(adjusted) {
    setMetrics(adjusted)
    navigate('dashboard')
  }

  // Démo guidée : on fait « taper » l'adresse d'exemple dans la barre du hero, puis
  // elle simule le clic sur Calculer. Repli direct si la barre n'est pas dispo.
  const heroSearchRef = useRef(null)
  const roofRef = useRef(null)
  const tourSteps = useMemo(() => buildTourSteps(roofRef), [])
  const [tour, setTour] = useState(false)
  const [pendingTour, setPendingTour] = useState(false)
  function runExample() {
    setPendingTour(true) // le tutoriel démarrera une fois sur la page Analyse
    if (heroSearchRef.current?.playDemo) {
      heroSearchRef.current.playDemo(EXAMPLE_PLACE.address, EXAMPLE_PLACE)
    } else {
      handleSelect(EXAMPLE_PLACE)
    }
  }

  // Lance le tutoriel une fois la page Analyse affichée ET les données chargées.
  useEffect(() => {
    if (pendingTour && view === 'analyse' && baseMetrics) {
      const t = setTimeout(() => {
        setTour(true)
        setPendingTour(false)
      }, 700)
      return () => clearTimeout(t)
    }
  }, [pendingTour, view, baseMetrics])

  // Sécurité : si on quitte la page Analyse, on ferme le tutoriel.
  useEffect(() => {
    if (tour && view !== 'analyse') setTour(false)
  }, [tour, view])

  return (
    <div className="min-h-screen flex flex-col">
      {splash && <Splash />}
      {tour && <Tour steps={tourSteps} onClose={() => setTour(false)} />}
      <Header
        view={view}
        hasSelection={selected != null}
        compact={view === 'analyse' || view === 'dashboard'}
        onSelect={handleSelect}
        loading={loadingSolar}
        onError={(e) => setGlobalError(e.message)}
        onNavigate={navigate}
      />

      {!GOOGLE_API_KEY && <ApiKeyBanner />}

      <main className="flex-grow w-full">
        {view === 'home' && (
          <Landing
            onSelect={handleSelect}
            onError={(e) => setGlobalError(e.message)}
            globalError={globalError}
            onExample={runExample}
            searchRef={heroSearchRef}
          />
        )}

        {view === 'analyse' &&
          (selected ? (
            <RoofAnalysis
              ref={roofRef}
              selected={selected}
              baseMetrics={baseMetrics}
              loading={loadingSolar}
              error={solarError}
              onCompute={handleCompute}
              onReplayTour={() => setTour(true)}
            />
          ) : (
            <EmptyState
              icon="travel_explore"
              title="Aucune adresse analysée"
              text="Lancez d'abord une recherche d'adresse pour analyser votre toit."
              actionLabel="Rechercher une adresse"
              onAction={() => navigate('home')}
            />
          ))}

        {view === 'dashboard' &&
          (selected ? (
            <Results
              selected={selected}
              metrics={metrics}
              loadingSolar={loadingSolar}
              solarError={solarError}
              onAdjust={() => navigate('analyse')}
              onSeeContext={() => navigate('context')}
            />
          ) : (
            <EmptyState
              icon="dashboard"
              title="Aucun résultat"
              text="Analysez d'abord un toit pour afficher votre tableau de bord."
              actionLabel="Rechercher une adresse"
              onAction={() => navigate('home')}
            />
          ))}

        {view === 'context' && <EuContextPage highlightCode={selected?.countryCode} />}
        {view === 'about' && <AboutPage onStart={() => navigate('home')} />}
      </main>

      <Footer onNavigate={navigate} />
    </div>
  )
}

/* ---------- État vide (vue sans données) ---------- */
function EmptyState({ icon, title, text, actionLabel, onAction }) {
  return (
    <div className="w-full max-w-xl mx-auto px-margin-mobile py-24 flex flex-col items-center text-center gap-4">
      <div className="bg-surface-container-high w-16 h-16 rounded-full flex items-center justify-center">
        <span className="material-symbols-outlined text-primary text-3xl">{icon}</span>
      </div>
      <h2 className="font-headline-md text-headline-md text-on-surface">{title}</h2>
      <p className="font-body-md text-body-md text-on-surface-variant">{text}</p>
      <button
        type="button"
        onClick={onAction}
        className="mt-2 bg-primary-container text-on-primary-fixed font-label-md text-label-md px-6 py-3 rounded-xl hover:brightness-95 transition shadow-sm"
      >
        {actionLabel}
      </button>
    </div>
  )
}

/* ---------- Header / Nav ---------- */
function Header({ view, hasSelection, compact, onSelect, loading, onError, onNavigate }) {
  const [menuOpen, setMenuOpen] = useState(false)
  // « Analyse » et « Tableau de bord » n'apparaissent qu'une fois une adresse analysée
  // (sinon ils mèneraient à une page vide).
  const links = [
    ...(hasSelection
      ? [
          { label: 'Analyse', target: 'analyse', active: view === 'analyse' },
          { label: 'Tableau de bord', target: 'dashboard', active: view === 'dashboard' },
        ]
      : []),
    { label: 'Contexte UE', target: 'context', active: view === 'context' },
    { label: 'À propos', target: 'about', active: view === 'about' },
  ]

  // Navigue puis ferme le menu mobile.
  const go = (target) => {
    onNavigate(target)
    setMenuOpen(false)
  }
  // En sélectionnant une adresse depuis le menu mobile, on le referme.
  const handleMobileSelect = (place) => {
    onSelect(place)
    setMenuOpen(false)
  }

  return (
    <header className="no-print bg-surface w-full z-50 sticky top-0 shadow-sm">
      <div className="flex justify-between items-center gap-6 w-full px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto h-20">
        <button
          type="button"
          onClick={() => go('home')}
          className="font-headline-md text-headline-md font-bold text-on-surface flex items-center gap-2 flex-shrink-0"
        >
          <SunLogo className="w-7 h-7" />
          Solora
        </button>

        {/* En mode analyse/résultats, une barre de recherche compacte s'insère dans la nav (desktop ≥ lg).
            Sur mobile/tablette, la recherche est accessible via le menu hamburger. */}
        {compact && (
          <div className="hidden lg:block flex-grow max-w-md">
            <SearchBar variant="compact" onSelect={onSelect} loading={loading} onError={onError} />
          </div>
        )}

        {/* Liens desktop */}
        <nav className="hidden lg:flex space-x-8 items-center flex-shrink-0">
          {links.map((l) => (
            <button
              key={l.label}
              type="button"
              onClick={() => go(l.target)}
              className={
                'font-label-md text-label-md transition-colors ' +
                (l.active ? 'text-primary border-b-2 border-primary pb-1' : 'text-on-surface-variant hover:text-primary')
              }
            >
              {l.label}
            </button>
          ))}
        </nav>

        {/* Bouton hamburger (mobile/tablette) */}
        <button
          type="button"
          aria-label="Menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((o) => !o)}
          className="lg:hidden text-on-surface p-2 -mr-2"
        >
          <span className="material-symbols-outlined text-3xl">{menuOpen ? 'close' : 'menu'}</span>
        </button>
      </div>

      {/* Panneau mobile déroulant */}
      {menuOpen && (
        <div className="lg:hidden border-t border-outline-variant bg-surface px-margin-mobile py-4 flex flex-col gap-4 shadow-sm">
          {compact && (
            <SearchBar variant="compact" onSelect={handleMobileSelect} loading={loading} onError={onError} />
          )}
          <nav className="flex flex-col">
            {links.map((l) => (
              <button
                key={l.label}
                type="button"
                onClick={() => go(l.target)}
                className={
                  'text-left font-label-md text-label-md py-3 border-b border-outline-variant/30 transition-colors ' +
                  (l.active ? 'text-primary' : 'text-on-surface-variant hover:text-primary')
                }
              >
                {l.label}
              </button>
            ))}
          </nav>
        </div>
      )}
    </header>
  )
}

/* ---------- Bandeau clé manquante ---------- */
function ApiKeyBanner() {
  return (
    <div className="no-print bg-error-container text-on-error-container w-full px-margin-mobile md:px-margin-desktop py-3">
      <div className="max-w-container-max mx-auto flex items-center gap-3 font-body-sm text-body-sm">
        <span className="material-symbols-outlined">key_off</span>
        <span>
          Clé Google API non configurée. Renseignez <code className="font-mono">VITE_GOOGLE_API_KEY</code> dans un fichier{' '}
          <code className="font-mono">.env</code> (voir <code className="font-mono">.env.example</code>) pour activer la recherche, la carte et l'analyse solaire.
        </span>
      </div>
    </div>
  )
}

/* ---------- Page d'accueil (hero + recherche + comment ça marche) ---------- */
function Landing({ onSelect, onError, globalError, onExample, searchRef }) {
  const scrollToHow = () => document.getElementById('comment')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  return (
    <>
      <section
        id="recherche"
        className="relative w-full min-h-[calc(100vh-80px)] flex items-center justify-center px-margin-mobile md:px-margin-desktop py-10 lg:py-16 bg-surface-container-highest overflow-hidden"
      >
        {/* Vidéo de fond plein écran (autoplay, muette, en boucle) ; image en poster de secours */}
        <video
          className="absolute inset-0 w-full h-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          poster={HERO_IMG}
          aria-hidden="true"
        >
          <source src={HERO_VIDEO} type="video/mp4" />
        </video>
        {/* Dégradé pour garder le texte lisible par-dessus la vidéo */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/90 via-background/80 to-background/92" />

        <div className="relative z-10 max-w-4xl mx-auto text-center flex flex-col items-center gap-5 lg:gap-8 animate-fade-up">
          <div className="space-y-4">
            <h1 className="font-headline-xl font-bold tracking-tight text-on-surface text-[clamp(34px,7vw,42px)] md:text-[clamp(44px,5vw,60px)] leading-[1.05]">
              Le futur de votre énergie<br className="hidden sm:block" /> commence sur votre toit.
            </h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mx-auto">
              Entrez une adresse en Europe et découvrez votre potentiel solaire en quelques secondes : panneaux,
              production, économies, CO₂ évité et rentabilité.
            </p>
          </div>

          <SearchBar ref={searchRef} variant="hero" onSelect={onSelect} onError={onError} />

          <button
            type="button"
            onClick={onExample}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-surface/80 backdrop-blur border border-outline-variant/40 text-on-surface font-label-md text-label-md hover:bg-surface transition-colors -mt-2"
          >
            <span className="material-symbols-outlined text-[18px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
              play_circle
            </span>
            Pas d'adresse sous la main ? Voir un exemple
          </button>

          {globalError && (
            <p className="font-body-sm text-body-sm text-error flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">error</span>
              {globalError}
            </p>
          )}

          {/* Bande de chiffres-clés */}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 pt-2">
            <HeroStat icon="public" text="27 pays de l'UE" />
            <HeroDot />
            <HeroStat icon="bolt" text="Données en direct" />
            <HeroDot />
            <HeroStat icon="timer" text="Résultat en 2 min" />
          </div>
        </div>

        {/* Indice de défilement */}
        <button
          type="button"
          onClick={scrollToHow}
          aria-label="Découvrir comment ça marche"
          className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10 text-on-surface-variant hover:text-on-surface transition-colors animate-bounce"
        >
          <span className="material-symbols-outlined text-3xl">expand_more</span>
        </button>

        {/* Carte d'invitation à la démo (glisse depuis la droite) */}
        <DemoHint onExample={onExample} />
      </section>

      {/* Comment ça marche */}
      <section id="comment" className="w-full max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-24 flex flex-col gap-12">
        <div className="text-center max-w-2xl mx-auto space-y-4">
          <h2 className="font-headline-lg-mobile text-headline-lg-mobile md:text-headline-lg text-on-surface">
            Comment ça marche ?
          </h2>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Une analyse en trois étapes pour révéler le potentiel énergétique de votre toiture.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
          <Step n="1" color="bg-primary-container text-on-primary-container" icon="location_on" iconColor="text-primary" title="Localisez votre toit"
            text="Saisissez votre adresse : les données satellites haute résolution de Google modélisent la surface disponible." />
          <Step n="2" color="bg-secondary-container text-on-secondary-container" icon="solar_power" iconColor="text-secondary" title="Simulez l'installation" up
            text="Production estimée selon l'ensoleillement, l'inclinaison et l'orientation réels de votre toiture." />
          <Step n="3" color="bg-tertiary-container text-on-tertiary-container" icon="query_stats" iconColor="text-tertiary" title="Économisez durablement"
            text="Visualisez vos économies, votre retour sur investissement et votre impact carbone, en contexte national." />
        </div>
      </section>
    </>
  )
}

function DemoHint({ onExample }) {
  const [open, setOpen] = useState(true)
  if (!open) return null
  return (
    <div className="hidden 2xl:block absolute right-10 bottom-12 z-20 w-72 animate-slide-in-right">
      <div className="relative bg-surface/95 backdrop-blur rounded-2xl p-5 card-shadow-lifted border border-outline-variant/40 flex flex-col gap-3">
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Fermer"
          className="absolute top-3 right-3 text-on-surface-variant hover:text-on-surface"
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>

        <span className="inline-flex items-center gap-1.5 self-start bg-secondary-container text-on-secondary-container font-label-sm text-label-sm px-2.5 py-1 rounded-full">
          <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
          Démo en 1 clic
        </span>

        <h3 className="font-headline-md text-headline-md text-on-surface leading-tight pr-4">
          Pas d'adresse sous la main ?
        </h3>
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          Lancez une démo guidée sur un vrai toit et découvrez Solora en action : analyse, économies et contexte européen.
        </p>

        <button
          type="button"
          onClick={() => {
            setOpen(false)
            onExample()
          }}
          className="mt-1 bg-primary-container text-on-primary-fixed font-label-md text-label-md px-4 py-2.5 rounded-xl hover:brightness-95 transition flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>play_circle</span>
          Voir un exemple
        </button>
      </div>
    </div>
  )
}

function HeroStat({ icon, text }) {
  return (
    <span className="flex items-center gap-2 font-label-md text-label-md text-on-surface">
      <span className="material-symbols-outlined text-[18px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
        {icon}
      </span>
      {text}
    </span>
  )
}

function HeroDot() {
  return <span className="hidden sm:block w-1 h-1 rounded-full bg-on-surface-variant/50" />
}

function Chip({ icon, className, children }) {
  return (
    <span className={`flex items-center gap-2 px-4 py-1.5 rounded-full font-label-sm text-label-sm ${className}`}>
      <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
      {children}
    </span>
  )
}

function Step({ n, color, icon, iconColor, title, text, up }) {
  return (
    <div className={`bg-surface rounded-2xl p-8 flex flex-col gap-6 card-shadow border border-outline-variant/20 hover:card-shadow-lifted transition-shadow duration-300 ${up ? 'md:-translate-y-4' : ''}`}>
      <div className={`w-12 h-12 rounded-full flex items-center justify-center font-headline-md text-headline-md ${color}`}>{n}</div>
      <div>
        <h3 className="font-headline-md text-headline-md text-on-surface mb-2">{title}</h3>
        <p className="font-body-md text-body-md text-on-surface-variant">{text}</p>
      </div>
      <div className="mt-auto pt-6 flex justify-end">
        <span className={`material-symbols-outlined text-[32px] ${iconColor}`}>{icon}</span>
      </div>
    </div>
  )
}

/* ---------- Page de résultats / tableau de bord ---------- */
function Results({ selected, metrics, loadingSolar, solarError, onAdjust, onSeeContext }) {
  const countryName = COUNTRY_NAMES[selected.countryCode] || COUNTRY_NAMES[ISO_TO_EUROSTAT[selected.countryCode]] || null
  return (
    <div id="tableau-de-bord" className="w-full max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-12 flex flex-col gap-12">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Votre potentiel solaire</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-2 flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>location_on</span>
            {selected.address}
          </p>
          {metrics?.imageryDate?.year && (
            <p className="font-label-sm text-label-sm text-on-surface-variant mt-1 flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">satellite_alt</span>
              Analyse basée sur l'imagerie satellite de{' '}
              {String(metrics.imageryDate.month || '').padStart(2, '0')}/{metrics.imageryDate.year}
            </p>
          )}
        </div>
        {onAdjust && metrics && (
          <button
            type="button"
            onClick={onAdjust}
            className="no-print self-start md:self-auto bg-surface text-on-surface font-label-md text-label-md px-5 py-3 rounded-xl border border-outline hover:bg-surface-container-low transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">tune</span>
            Ajuster mon toit
          </button>
        )}
      </header>

      {/* Carte + KPI */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter">
        <div className="lg:col-span-1 rounded-xl overflow-hidden card-shadow border border-outline-variant/30 min-h-[320px]">
          <Map
            lat={metrics?.center?.latitude ?? selected.lat}
            lng={metrics?.center?.longitude ?? selected.lng}
            address={selected.address}
            zoom={20}
            panels={metrics ? metrics.solarPanels?.slice(0, metrics.panelsCount) : null}
            segments={metrics?.roofSegmentStats}
            panelDims={metrics ? { width: metrics.panelWidthMeters, height: metrics.panelHeightMeters } : null}
            showPanels={!!metrics}
          />
        </div>
        <div className="lg:col-span-2 flex flex-col gap-gutter">
          {loadingSolar && <SolarCardSkeleton />}
          {!loadingSolar && solarError && <ErrorCard code={solarError} context="solar" />}
          {!loadingSolar && metrics && <SolarCard metrics={metrics} />}
        </div>
      </div>

      {/* Détail transparent des économies et du coût */}
      {!loadingSolar && metrics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-gutter">
          <SavingsBreakdown metrics={metrics} />
          <CostBreakdown metrics={metrics} />
        </div>
      )}

      {/* Graphe ROI */}
      {!loadingSolar && metrics && <RoiChart metrics={metrics} />}

      {/* Renvoi vers la page Contexte UE (le détail du contexte vit là-bas) */}
      {!loadingSolar && metrics && (
        <button
          type="button"
          onClick={onSeeContext}
          className="no-print w-full text-left bg-surface-container-low rounded-xl p-6 border border-outline-variant/30 flex items-center gap-4 hover:bg-surface-container transition-colors"
        >
          <span className="bg-secondary-container text-on-secondary-container p-3 rounded-full flex-shrink-0">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>public</span>
          </span>
          <span className="flex-grow">
            <span className="block font-label-md text-label-md text-on-surface">
              {countryName ? `Et à l'échelle de ${countryName} ?` : 'Et à l\'échelle de votre pays ?'}
            </span>
            <span className="block font-body-sm text-body-sm text-on-surface-variant">
              Voyez où se situe votre pays dans la transition énergétique européenne.
            </span>
          </span>
          <span className="material-symbols-outlined text-on-surface-variant flex-shrink-0">arrow_forward</span>
        </button>
      )}

      {/* CTA */}
      {!loadingSolar && metrics && <CtaBlock countryCode={selected.countryCode} countryName={countryName} />}
    </div>
  )
}

function CtaBlock({ countryCode, countryName }) {
  const directory = installerDirectoryForCountry(countryCode)
  const countryLabel = countryName ? `en ${countryName}` : 'dans ce pays'

  return (
    <div className="no-print bg-tertiary-fixed text-on-tertiary-fixed rounded-xl p-8 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div className="absolute -right-4 -top-4 opacity-10 pointer-events-none">
        <span className="material-symbols-outlined text-[140px]" style={{ fontVariationSettings: "'FILL' 1" }}>solar_power</span>
      </div>
      <div className="relative z-10 max-w-xl">
        <h3 className="font-headline-md text-headline-md mb-2">Identifier des installateurs qualifiés</h3>
        <p className="font-body-sm text-body-sm text-on-tertiary-fixed-variant">
          Consultez une ressource locale pour trouver ou vérifier des acteurs photovoltaïques {countryLabel}. Selon les pays, il peut s'agir d'un registre officiel, d'une agence énergie ou d'une association du secteur.
        </p>
      </div>
      <div className="relative z-10 flex flex-col sm:flex-row gap-3 flex-shrink-0">
        <a
          href={directory.url}
          target="_blank"
          rel="noreferrer"
          className="bg-primary-container text-on-primary-fixed font-label-md text-label-md px-6 py-4 rounded-xl hover:brightness-95 transition flex items-center justify-center gap-2 shadow-sm"
        >
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>travel_explore</span>
          Ouvrir {directory.label}
        </a>
        <button
          type="button"
          onClick={() => window.print()}
          className="bg-surface text-on-surface font-label-md text-label-md px-6 py-4 rounded-xl border border-outline hover:bg-surface-container-low transition-colors flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined">download</span>
          Exporter la simulation
        </button>
      </div>
    </div>
  )
}

/* ---------- Carte d'erreur ---------- */
function ErrorCard({ code, context }) {
  const messages = {
    NO_API_KEY: 'Clé Google API manquante. Configurez VITE_GOOGLE_API_KEY.',
    NOT_COVERED: "Ce toit n'est pas encore couvert par la Solar API de Google. Essayez une adresse en zone urbaine.",
    NO_POTENTIAL: "Aucune configuration solaire exploitable pour ce toit.",
    NETWORK: 'Impossible de joindre la Solar API. Vérifiez votre connexion.',
    API_ERROR: 'Erreur de la Solar API.',
    TIMEOUT: 'Données Eurostat indisponibles (délai dépassé).',
    NO_DATA: 'Pas de données Eurostat pour ce pays.',
  }
  const msg = messages[code] || code
  return (
    <div className="bg-error-container text-on-error-container rounded-xl p-6 border border-error/20 flex items-start gap-3">
      <span className="material-symbols-outlined">{context === 'country' ? 'public_off' : 'wb_cloudy'}</span>
      <div>
        <p className="font-label-md text-label-md mb-1">
          {context === 'country' ? 'Contexte pays indisponible' : 'Analyse solaire indisponible'}
        </p>
        <p className="font-body-sm text-body-sm">{msg}</p>
      </div>
    </div>
  )
}

/* ---------- Footer ---------- */
function Footer({ onNavigate }) {
  // Liens internes câblés vers les vues ; les pages légales restent des placeholders.
  const links = [
    { label: 'Contexte UE', target: 'context' },
    { label: 'À propos', target: 'about' },
    { label: 'Méthodologie', target: 'about' },
  ]
  return (
    <footer className="no-print bg-surface-container-low w-full mt-auto border-t border-outline-variant">
      <div className="w-full py-12 px-margin-mobile md:px-margin-desktop flex flex-col md:flex-row justify-between items-center max-w-container-max mx-auto gap-8 md:gap-0">
        <div className="flex flex-col items-center md:items-start gap-2">
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="font-headline-md text-headline-md font-bold text-on-surface flex items-center gap-2"
          >
            <SunLogo className="w-7 h-7" />
            Solora
          </button>
          <span className="font-body-sm text-body-sm text-on-surface-variant">
            Réalisé lors du hackathon <strong>DEFEND HACK × OpenAI 2026</strong> — Données : Google Solar API & Eurostat.
          </span>
        </div>
        <nav className="flex flex-wrap justify-center gap-6">
          {links.map((l) => (
            <button
              key={l.label}
              type="button"
              onClick={() => onNavigate(l.target)}
              className="font-label-sm text-label-sm text-on-surface-variant hover:text-secondary opacity-80 hover:opacity-100 transition-colors"
            >
              {l.label}
            </button>
          ))}
        </nav>
      </div>
    </footer>
  )
}
