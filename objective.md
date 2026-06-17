# Clearergy Solar — Prompt Codex

## Concept

Application web qui permet à n'importe qui d'entrer une adresse en Europe et de découvrir en quelques secondes le potentiel solaire de son toit : nombre de panneaux, production annuelle estimée, économies sur la facture, CO2 évité, et retour sur investissement.

Le tout contextualisé avec les données énergétiques réelles du pays (% renouvelable, mix électrique, objectif 2030) via l'API Eurostat.

---

## Stack

- **Frontend** : React + Tailwind CSS (via CDN)
- **APIs** :
  - Google Maps JavaScript API (autocomplete adresse + carte)
  - Google Solar API (potentiel solaire du toit)
  - Eurostat API REST (données renouvelables par pays, open data, no key required)
- **Pas de backend** : tout en client-side, clés API en variables d'environnement

---

## APIs et endpoints

### Google Solar API

```
Base URL: https://solar.googleapis.com/v1

Endpoint principal:
GET /buildingInsights:findClosest
  ?location.latitude={lat}
  &location.longitude={lng}
  &key={GOOGLE_API_KEY}

Champs utiles dans la réponse:
- solarPotential.maxArrayPanelsCount         → nombre max de panneaux
- solarPotential.maxArrayAreaMeters2         → surface disponible
- solarPotential.maxSunshineHoursPerYear     → heures d'ensoleillement/an
- solarPotential.carbonOffsetFactorKgPerMwh  → facteur CO2 local
- solarPotential.solarPanelConfigs[]         → configs par nb de panneaux
  - panelsCount
  - yearlyEnergyDcKwh                        → production annuelle estimée
```

### Eurostat API

```
Base URL: https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data

Endpoint renouvelables par pays:
GET /nrg_ind_ren
  ?format=JSON
  &lang=FR
  &unit=PC
  &nrg_bal=REN
  &time=2024

Pas de clé requise — open data public.
Retourne le % d'énergie renouvelable dans la conso finale brute pour chaque pays UE.
```

### Google Maps JavaScript API

```
Utiliser la librairie Places Autocomplete pour la recherche d'adresse.
Après sélection, récupérer lat/lng via place.geometry.location.
Afficher un marqueur sur la carte avec le toit sélectionné.
```

---

## Structure du projet

```
index.html
src/
  App.jsx                  ← composant racine
  components/
    SearchBar.jsx          ← input adresse avec Google Places Autocomplete
    SolarCard.jsx          ← résultats solaires (panneaux, kWh, €, CO2)
    CountryContext.jsx     ← données Eurostat du pays détecté
    RoiChart.jsx           ← graphique retour sur investissement (Chart.js)
    Map.jsx                ← carte Google Maps avec marqueur
  services/
    solarApi.js            ← appels Google Solar API
    eurostatApi.js         ← appels Eurostat API
    geoUtils.js            ← détection pays depuis lat/lng, conversions
  config/
    constants.js           ← prix kWh par pays, coût installation moyen, CO2 par pays
```

---

## Logique de calcul

### Détection du pays
Après geocoding de l'adresse, extraire le code pays ISO (ex: FR, PT, DE) depuis les `address_components` de la réponse Google Maps.

### Sélection de la config solaire
Utiliser `solarPanelConfigs` et sélectionner la config à 80% du max de panneaux (compromis réaliste surface/coût).

### Calcul production
```
yearlyProductionKwh = solarPanelConfigs[selectedConfig].yearlyEnergyDcKwh
```

### Calcul économies annuelles
```
electricityPricePerKwh = constants.priceByCountry[countryCode]  // €/kWh
annualSavings = yearlyProductionKwh * electricityPricePerKwh
```

Prix kWh de référence à mettre dans constants.js (données Eurostat 2024) :
- FR: 0.2062
- PT: 0.2234
- DE: 0.3181
- ES: 0.1889
- IT: 0.2668
- BE: 0.3142
- NL: 0.2980
- AT: 0.2345
- SE: 0.1823
- DK: 0.3412
- Default: 0.25

### Calcul CO2 évité
```
co2OffsetKgPerYear = (yearlyProductionKwh / 1000) * carbonOffsetFactorKgPerMwh
```
(utiliser `solarPotential.carbonOffsetFactorKgPerMwh` de la réponse Solar API)

### Calcul ROI
```
installationCostEur = panelsCount * constants.costPerPanel  // ~300€/panneau en moyenne EU
paybackYears = installationCostEur / annualSavings
```

### Données Eurostat à afficher
- % renouvelable actuel du pays (2024)
- Objectif 2030 : 42.5% (cible UE commune)
- Rang du pays dans l'UE (calculé côté client)

---

## UI — ce qui doit s'afficher

### Header
Logo + nom "Clearergy Solar" + tagline : "Découvrez le potentiel solaire de n'importe quel toit en Europe"

### Barre de recherche (centre de l'écran au départ)
Input Google Places Autocomplete, placeholder : "Entrez une adresse en Europe..."
Au submit : déclenche les appels API et affiche les résultats en dessous.

### Carte (après recherche)
Google Map centrée sur l'adresse, marqueur, zoom 18 (niveau toit).

### Panneau résultats — 4 metric cards
```
┌─────────────────┬─────────────────┬─────────────────┬─────────────────┐
│  🌞 Panneaux    │  ⚡ Production   │  💶 Économies   │  🌱 CO2 évité   │
│  24 panneaux    │  8 400 kWh/an   │  1 730 €/an     │  3.2 t CO2/an   │
└─────────────────┴─────────────────┴─────────────────┴─────────────────┘
```

### Graphique ROI (Chart.js bar chart)
Axe X : années 1 à 25
Axe Y : économies cumulées en €
Ligne horizontale : coût d'installation
Point d'intersection visible = année de rentabilité
Label : "Rentable en X ans"

### Bloc contexte pays
```
Portugal — 36,4% d'énergie renouvelable (2024)
Objectif UE 2030 : 42,5%  ████████░░░░ 86% de l'objectif atteint
Rang dans l'UE : 7ème / 27
```

---

## Contraintes techniques

- Toutes les clés API via variables d'environnement : `VITE_GOOGLE_API_KEY`
- Gérer les erreurs API proprement : adresse non trouvée, pays non couvert par Solar API, Eurostat timeout
- Afficher un état de chargement pendant les appels API (skeleton cards)
- Mobile-responsive (Tailwind)
- Pas de backend, pas de serveur, `vite build` → fichiers statiques déployables sur Vercel/Netlify en 2 minutes

---

## Palette visuelle

- Background : `#0d1117` (sombre)
- Cards : `#161b22`
- Accent principal : `#F59E0B` (ambre — solaire)
- Accent secondaire : `#10B981` (vert — écologie)
- Texte primaire : `#F0F6FC`
- Texte secondaire : `#8B949E`

---

## Génère dans cet ordre

1. `constants.js` — prix kWh, coût/panneau, noms pays
2. `geoUtils.js` — extraction code pays, conversions
3. `solarApi.js` — appel Solar API + parsing réponse
4. `eurostatApi.js` — appel Eurostat + parsing, retourne % renouvelable par pays
5. `Map.jsx` — composant Google Maps
6. `SearchBar.jsx` — Places Autocomplete
7. `SolarCard.jsx` — 4 metric cards
8. `RoiChart.jsx` — graphique Chart.js
9. `CountryContext.jsx` — bloc données Eurostat
10. `App.jsx` — assemblage complet, state management, orchestration des appels
11. `index.html` — chargement Google Maps JS API, Vite entry point

**Règles :**
- Code complet pour chaque fichier, aucun placeholder
- Commentaires uniquement sur les calculs non évidents
- Gestion d'erreur sur chaque appel API
- Pas de librairie externe sauf Chart.js et les APIs Google