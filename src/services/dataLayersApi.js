// Solar API « Data Layers » : récupère le flux solaire (annuel + mensuel) en GeoTIFF,
// le décode, le géoréférence et le rend en heatmaps (canvas) pour overlay sur la carte.

import * as GeoTIFF from 'geotiff'
import proj4 from 'proj4'
import geokeys from 'geotiff-geokeys-to-proj4'
import { GOOGLE_API_KEY } from '../config/constants.js'

const SOLAR_BASE = 'https://solar.googleapis.com/v1'

// Palette « magma » (violet → magenta → orange → jaune), proche de la démo Google.
const PALETTE_STOPS = [
  [13, 8, 53], [60, 9, 101], [123, 15, 114], [190, 40, 90],
  [232, 85, 50], [250, 150, 30], [252, 220, 80],
]
const PALETTE = buildPalette(PALETTE_STOPS)

export const PALETTE_CSS = 'linear-gradient(90deg,#0d0835,#7b0f72,#e85532,#fcdc50)'

function buildPalette(stops) {
  const out = []
  for (let i = 0; i < 256; i++) {
    const seg = (i / 255) * (stops.length - 1)
    const k = Math.floor(seg)
    const f = seg - k
    const a = stops[k]
    const b = stops[Math.min(k + 1, stops.length - 1)]
    out.push([
      Math.round(a[0] + (b[0] - a[0]) * f),
      Math.round(a[1] + (b[1] - a[1]) * f),
      Math.round(a[2] + (b[2] - a[2]) * f),
    ])
  }
  return out
}

// Télécharge un GeoTIFF de la Solar API, le décode et reprojette ses limites en WGS84.
async function downloadGeoTiff(url) {
  const sep = url.includes('?') ? '&' : '?'
  const res = await fetch(`${url}${sep}key=${GOOGLE_API_KEY}`)
  if (!res.ok) throw new Error(`GeoTIFF ${res.status}`)
  const buffer = await res.arrayBuffer()
  const tiff = await GeoTIFF.fromArrayBuffer(buffer)
  const image = await tiff.getImage()
  const rasters = await image.readRasters()

  const geoKeys = image.getGeoKeys()
  const projObj = geokeys.toProj4(geoKeys)
  const projection = proj4(projObj.proj4, 'WGS84')
  const box = image.getBoundingBox()
  const sw = projection.forward({
    x: box[0] * projObj.coordinatesConversionParameters.x,
    y: box[1] * projObj.coordinatesConversionParameters.y,
  })
  const ne = projection.forward({
    x: box[2] * projObj.coordinatesConversionParameters.x,
    y: box[3] * projObj.coordinatesConversionParameters.y,
  })

  return {
    width: image.getWidth(),
    height: image.getHeight(),
    bands: rasters, // tableau de bandes (1 pour le masque, 12 pour le flux mensuel)
    bounds: { north: ne.y, south: sw.y, east: ne.x, west: sw.x },
  }
}

// Rend une bande de flux en PNG : couleur via palette si sur le toit (masque), sinon transparent.
function renderBand(band, width, height, mask, min, max) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  const img = ctx.createImageData(width, height)
  const maskRatioX = mask ? mask.width / width : 1
  const maskRatioY = mask ? mask.height / height : 1
  const span = max > min ? max - min : 1

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x
      const o = i * 4
      let onRoof = true
      if (mask) {
        const mx = Math.min(mask.width - 1, Math.floor(x * maskRatioX))
        const my = Math.min(mask.height - 1, Math.floor(y * maskRatioY))
        onRoof = mask.bands[0][my * mask.width + mx] > 0
      }
      const v = band[i]
      if (!onRoof || !Number.isFinite(v) || v <= 0) {
        img.data[o + 3] = 0
        continue
      }
      const t = Math.max(0, Math.min(1, (v - min) / span))
      const [r, g, b] = PALETTE[Math.round(t * 255)]
      img.data[o] = r
      img.data[o + 1] = g
      img.data[o + 2] = b
      img.data[o + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  return canvas.toDataURL('image/png')
}

// Récupère le flux mensuel + masque et produit : l'overlay annuel + 12 overlays mensuels.
export async function getFluxOverlays(lat, lng, radiusMeters = 50, pixelSizeMeters = 0.5) {
  if (!GOOGLE_API_KEY) throw new Error('NO_API_KEY')

  const params = new URLSearchParams({
    'location.latitude': lat,
    'location.longitude': lng,
    radiusMeters: String(Math.round(radiusMeters)),
    view: 'IMAGERY_AND_ALL_FLUX_LAYERS',
    requiredQuality: 'LOW',
    pixelSizeMeters: String(pixelSizeMeters),
    key: GOOGLE_API_KEY,
  })

  const res = await fetch(`${SOLAR_BASE}/dataLayers:get?${params.toString()}`)
  if (res.status === 404) throw new Error('NOT_COVERED')
  if (!res.ok) throw new Error(`dataLayers ${res.status}`)
  const layers = await res.json()
  if (!layers.monthlyFluxUrl) throw new Error('NO_FLUX')

  const [monthly, mask] = await Promise.all([
    downloadGeoTiff(layers.monthlyFluxUrl),
    layers.maskUrl ? downloadGeoTiff(layers.maskUrl) : Promise.resolve(null),
  ])

  const { width, height, bands, bounds } = monthly
  const px = width * height

  // Flux annuel = somme des 12 mois (évite un téléchargement supplémentaire).
  const annual = new Float32Array(px)
  for (let m = 0; m < bands.length; m++) {
    const band = bands[m]
    for (let i = 0; i < px; i++) {
      const v = band[i]
      if (Number.isFinite(v) && v > 0) annual[i] += v
    }
  }

  // Échelles : annuel sur sa propre étendue ; mensuel sur une étendue globale (contraste saisonnier).
  let annualMin = Infinity
  let annualMax = -Infinity
  let monthMax = 0
  for (let i = 0; i < px; i++) {
    const a = annual[i]
    if (a > 0) {
      if (a < annualMin) annualMin = a
      if (a > annualMax) annualMax = a
    }
  }
  for (let m = 0; m < bands.length; m++) {
    const band = bands[m]
    for (let i = 0; i < px; i++) {
      const v = band[i]
      if (Number.isFinite(v) && v > monthMax) monthMax = v
    }
  }
  if (!Number.isFinite(annualMin)) annualMin = 0
  if (annualMax <= annualMin) annualMax = annualMin + 1
  if (monthMax <= 0) monthMax = 1

  const annualOverlay = {
    dataUrl: renderBand(annual, width, height, mask, annualMin, annualMax),
    range: { min: Math.round(annualMin), max: Math.round(annualMax) },
    unit: 'kWh/kWc/an',
  }
  const months = bands.map((band) => ({
    dataUrl: renderBand(band, width, height, mask, 0, monthMax),
  }))

  return {
    bounds,
    annual: annualOverlay,
    months, // 12 overlays (index 0 = janvier)
    monthRange: { min: 0, max: Math.round(monthMax), unit: 'kWh/kWc/mois' },
    imageryDate: layers.imageryDate,
  }
}
