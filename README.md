# Solora ☀️

Application web qui estime le **potentiel solaire de n'importe quel toit en Europe** à partir d'une simple adresse : nombre de panneaux, production annuelle, économies sur la facture, CO₂ évité et retour sur investissement — le tout remis en contexte avec les **données énergétiques réelles du pays** (Eurostat).

Stack : **Vite + React**, Tailwind & Chart.js (via CDN), **Google Solar API + Google Maps**, **Eurostat** (open data, sans clé). 100 % client-side, aucun backend.

## Prérequis

- Node.js ≥ 18
- Une clé Google Cloud avec ces APIs activées :
  - **Maps JavaScript API**
  - **Places API**
  - **Solar API**

## Démarrage

```bash
npm install
cp .env.example .env          # puis renseignez votre clé
echo "VITE_GOOGLE_API_KEY=VOTRE_CLE" > .env
npm run dev
```

L'app s'ouvre sur http://localhost:5173.

> Sans clé, le site se lance quand même : un bandeau d'avertissement s'affiche et le contexte Eurostat reste fonctionnel, mais la recherche d'adresse, la carte et l'analyse solaire nécessitent la clé.

## Build de production

```bash
npm run build      # génère dist/ (statique)
npm run preview    # prévisualise le build
```

`dist/` est déployable tel quel sur Vercel, Netlify, GitHub Pages, etc.

## Structure

```
index.html                 Entrée Vite + tokens du design system (Tailwind config inline)
src/
  main.jsx                 Montage React
  App.jsx                  Orchestration : recherche → Solar + Eurostat → résultats
  config/constants.js      Prix kWh par pays, coût/panneau, libellés pays, UE-27, objectif 2030
  services/
    geoUtils.js            Chargement Google Maps, extraction pays, conversions
    solarApi.js            Google Solar API + calcul KPI (production, économies, CO₂, ROI)
    eurostatApi.js         Eurostat nrg_ind_ren : % renouvelable + rang dans l'UE-27
  components/
    SearchBar.jsx          Google Places Autocomplete
    Map.jsx                Carte satellite Google Maps (zoom 18)
    SolarCard.jsx          4 metric cards + détails d'installation
    RoiChart.jsx           Graphe Chart.js des économies cumulées vs coût
    CountryContext.jsx     Bloc contexte énergétique national (Eurostat)
```

## Méthodologie de calcul

- **Config solaire** : configuration retenue à ~80 % du nombre maximum de panneaux possibles (compromis surface/coût).
- **Production** : `yearlyEnergyDcKwh` de la config retenue (Google Solar API).
- **Économies** : `production × prix kWh du pays` (table Eurostat 2024, défaut 0,25 €).
- **CO₂ évité** : `(production / 1000) × carbonOffsetFactorKgPerMwh` (facteur local de la Solar API).
- **ROI** : `nb panneaux × 300 € / économies annuelles` → année de rentabilité.
- **Contexte pays** : part de renouvelables (Eurostat `nrg_ind_ren`, dernière année dispo), rang parmi les 27 États membres, objectif commun UE 42,5 % en 2030.

## Données

- **Google Solar API** — potentiel solaire du toit (panneaux, surface, ensoleillement, facteur CO₂).
- **Eurostat** — part d'énergies renouvelables dans la consommation finale brute, par pays.
