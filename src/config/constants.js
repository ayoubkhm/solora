// Configuration centrale : prix de l'électricité, coûts d'installation, libellés pays.

export const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || ''

// Prix moyen du kWh résidentiel par pays (€/kWh). FALLBACK uniquement : en temps normal
// l'app récupère les prix réels en direct via Eurostat (nrg_pc_204). Cette table sert si
// l'appel échoue. Valeurs indicatives ~2024.
export const PRICE_BY_COUNTRY = {
  FR: 0.2062,
  PT: 0.2234,
  DE: 0.3181,
  ES: 0.1889,
  IT: 0.2668,
  BE: 0.3142,
  NL: 0.2980,
  AT: 0.2345,
  SE: 0.1823,
  DK: 0.3412,
  IE: 0.3025,
  PL: 0.1798,
  GR: 0.1936,
  FI: 0.2010,
  CZ: 0.1820,
  RO: 0.1680,
  HU: 0.1090,
  LU: 0.2050,
}
export const DEFAULT_PRICE = 0.25

// Coût moyen d'une installation photovoltaïque résidentielle, au kWc, pose comprise
// (fourchette UE ~1 300-2 000 €/kWc ; on retient une valeur médiane). Standard du métier.
export const COST_PER_KWP = 1500

// Coût moyen d'une batterie de stockage résidentielle (~5-10 kWh, pose comprise).
export const BATTERY_COST = 7000

// Aides / subventions publiques, en part du coût d'installation (ordres de grandeur
// INDICATIFS 2024 — varient fortement selon la région, les revenus et les dispositifs).
export const SUBSIDY_RATE_BY_COUNTRY = {
  FR: 0.10, DE: 0.05, IT: 0.50, ES: 0.30, BE: 0.10, NL: 0.15, PT: 0.15,
  AT: 0.20, SE: 0.15, DK: 0.10, IE: 0.20, PL: 0.20, GR: 0.30, FI: 0.05, CZ: 0.30,
}
export const DEFAULT_SUBSIDY_RATE = 0.10

// Ressources OFFICIELLES par pays pour les aides au photovoltaïque (codes ISO Google).
// Pour les pays absents, on bascule sur une recherche web ciblée (voir subsidyLink()).
export const SUBSIDY_LINK_BY_COUNTRY = {
  FR: 'https://france-renov.gouv.fr',
  IE: 'https://www.seai.ie',
  NL: 'https://www.rvo.nl',
  ES: 'https://www.idae.es',
  IT: 'https://www.gse.it',
  DE: 'https://www.kfw.de',
  PT: 'https://www.dgeg.gov.pt',
}

// Tarif de rachat du surplus réinjecté dans le réseau (€/kWh, ordres de grandeur 2024).
// Bien inférieur au prix de détail : le surplus est valorisé moins cher que l'autoconsommation.
export const FEED_IN_BY_COUNTRY = {
  FR: 0.1276, DE: 0.082, ES: 0.10, IT: 0.10, BE: 0.04, NL: 0.09, PT: 0.10,
  AT: 0.10, SE: 0.06, DK: 0.05, IE: 0.20, PL: 0.05, GR: 0.06, FI: 0.05, CZ: 0.05,
}
export const DEFAULT_FEED_IN = 0.10

// Consommation annuelle moyenne d'un foyer européen (kWh) — valeur par défaut si
// l'utilisateur ne renseigne pas sa facture.
export const DEFAULT_ANNUAL_CONSUMPTION_KWH = 3500

// Taux d'autoconsommation (part de la production consommée sur place). On ne le demande
// PAS à l'utilisateur (métrique d'expert) : on le déduit de la présence d'une batterie.
//  - sans batterie : ~35 % (on consomme surtout en journée quand le solaire produit)
//  - avec batterie : ~75 % (le stockage permet de consommer le soir)
export const SELF_CONSUMPTION_NO_BATTERY = 0.35
export const SELF_CONSUMPTION_WITH_BATTERY = 0.75
export const DEFAULT_SELF_CONSUMPTION_RATE = SELF_CONSUMPTION_NO_BATTERY

// Cible commune de l'UE pour la part de renouvelables en 2030 (%).
export const EU_2030_TARGET = 42.5

// Durée de vie estimée d'une installation photovoltaïque (années) — horizon du graphe ROI.
export const SYSTEM_LIFESPAN_YEARS = 25

// Projection financière : hausse annuelle du prix de l'électricité (augmente les économies
// futures) et dégradation annuelle du rendement des panneaux (les baisse légèrement).
export const ELEC_PRICE_INFLATION = 0.04
export const PANEL_DEGRADATION = 0.005

// Sélectionner une config réaliste : 80 % du nombre maximum de panneaux possibles.
export const CONFIG_RATIO = 0.8

// Libellés FR des pays de l'UE (codes ISO-3166 alpha-2, version « geo » Eurostat).
export const COUNTRY_NAMES = {
  AT: 'Autriche', BE: 'Belgique', BG: 'Bulgarie', HR: 'Croatie', CY: 'Chypre',
  CZ: 'Tchéquie', DK: 'Danemark', EE: 'Estonie', FI: 'Finlande', FR: 'France',
  DE: 'Allemagne', GR: 'Grèce', EL: 'Grèce', HU: 'Hongrie', IE: 'Irlande',
  IT: 'Italie', LV: 'Lettonie', LT: 'Lituanie', LU: 'Luxembourg', MT: 'Malte',
  NL: 'Pays-Bas', PL: 'Pologne', PT: 'Portugal', RO: 'Roumanie', SK: 'Slovaquie',
  SI: 'Slovénie', ES: 'Espagne', SE: 'Suède',
}

// Eurostat utilise « EL » pour la Grèce ; Google renvoie « GR ». Table de correspondance.
export const ISO_TO_EUROSTAT = { GR: 'EL', GB: 'UK' }

// Les 27 États membres de l'UE (codes « geo » Eurostat). Eurostat publie aussi des pays
// hors UE (AELE, pays candidats) ; on s'y limite pour un classement « rang dans l'UE » exact.
export const EU27_CODES = [
  'BE', 'BG', 'CZ', 'DK', 'DE', 'EE', 'IE', 'EL', 'ES', 'FR', 'HR', 'IT', 'CY', 'LV',
  'LT', 'LU', 'HU', 'MT', 'NL', 'AT', 'PL', 'PT', 'RO', 'SI', 'SK', 'FI', 'SE',
]

// Mêmes 27 pays mais en codes ISO Google (Grèce = GR, pas EL) — pour valider l'adresse saisie.
export const EU_ISO_CODES = [
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE',
  'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
]
