import { useEffect, useRef, useState } from 'react'
import { loadGoogleMaps } from '../services/geoUtils.js'

// Carte Google Maps satellite centrée sur le toit, avec en option :
//  - un overlay de flux solaire (heatmap) via GroundOverlay,
//  - les panneaux solaires dessinés en polygones orientés.
export default function Map({
  lat,
  lng,
  address,
  zoom = 18,
  panels = null,        // tableau de panneaux {center, orientation, segmentIndex} (déjà tronqué)
  segments = null,      // roofSegmentStats (pour l'azimut)
  panelDims = null,     // { width, height } en mètres
  showPanels = false,
  flux = null,          // { dataUrl, bounds }
  showFlux = false,
  onViewChange = null,  // ({ lat, lng, radius }) émis à l'arrêt d'un déplacement/zoom
}) {
  const containerRef = useRef(null)
  const mapsRef = useRef(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)
  const polygonsRef = useRef([])
  const overlayRef = useRef(null)
  const onViewChangeRef = useRef(onViewChange)
  onViewChangeRef.current = onViewChange
  const [ready, setReady] = useState(false)

  // Init carte + marqueur.
  useEffect(() => {
    let cancelled = false
    loadGoogleMaps()
      .then((maps) => {
        if (cancelled || !containerRef.current) return
        mapsRef.current = maps
        const position = { lat, lng }
        if (!mapRef.current) {
          mapRef.current = new maps.Map(containerRef.current, {
            center: position,
            zoom,
            mapTypeId: 'satellite',
            tilt: 0,
            disableDefaultUI: true,
            zoomControl: true,
            gestureHandling: 'cooperative',
          })
          markerRef.current = new maps.Marker({ position, map: mapRef.current, title: address })
          // À l'arrêt d'un déplacement/zoom : signale la zone visible (centre + rayon en mètres).
          mapRef.current.addListener('idle', () => {
            const cb = onViewChangeRef.current
            if (!cb) return
            const map = mapRef.current
            const c = map.getCenter()
            const b = map.getBounds()
            let radius = 60
            try {
              if (b && maps.geometry) {
                radius = maps.geometry.spherical.computeDistanceBetween(c, b.getNorthEast())
              }
            } catch { /* géométrie indisponible : rayon par défaut */ }
            cb({ lat: c.lat(), lng: c.lng(), radius })
          })
        } else {
          mapRef.current.setCenter(position)
          mapRef.current.setZoom(zoom)
          markerRef.current.setPosition(position)
        }
        setReady(true)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [lat, lng, address, zoom])

  // Overlay de flux solaire.
  useEffect(() => {
    const maps = mapsRef.current
    if (!ready || !maps) return
    if (overlayRef.current) {
      overlayRef.current.setMap(null)
      overlayRef.current = null
    }
    if (flux && showFlux) {
      const bounds = new maps.LatLngBounds(
        { lat: flux.bounds.south, lng: flux.bounds.west },
        { lat: flux.bounds.north, lng: flux.bounds.east }
      )
      overlayRef.current = new maps.GroundOverlay(flux.dataUrl, bounds, { opacity: 0.75, clickable: false })
      overlayRef.current.setMap(mapRef.current)
    }
  }, [ready, flux, showFlux])

  // Panneaux solaires.
  useEffect(() => {
    const maps = mapsRef.current
    if (!ready || !maps) return
    // Nettoie les anciens polygones.
    polygonsRef.current.forEach((p) => p.setMap(null))
    polygonsRef.current = []

    if (showPanels && panels && panels.length && maps.geometry) {
      const w = panelDims?.width || 1.045
      const h = panelDims?.height || 1.879
      panels.forEach((panel) => {
        const orientation = panel.orientation === 'PORTRAIT' ? 90 : 0
        const azimuth = segments?.[panel.segmentIndex]?.azimuthDegrees ?? 0
        const center = { lat: panel.center.latitude, lng: panel.center.longitude }
        const corners = [
          [w / 2, h / 2], [w / 2, -h / 2], [-w / 2, -h / 2], [-w / 2, h / 2], [w / 2, h / 2],
        ]
        const path = corners.map(([x, y]) =>
          maps.geometry.spherical.computeOffset(
            center,
            Math.hypot(x, y),
            (Math.atan2(x, y) * 180) / Math.PI + orientation + azimuth
          )
        )
        const poly = new maps.Polygon({
          paths: path,
          map: mapRef.current,
          strokeColor: '#9ec3ff',
          strokeWeight: 0.6,
          fillColor: '#13335c',
          fillOpacity: 0.85,
          clickable: false,
        })
        polygonsRef.current.push(poly)
      })
    }
  }, [ready, showPanels, panels, segments, panelDims])

  // Nettoyage au démontage.
  useEffect(() => {
    return () => {
      polygonsRef.current.forEach((p) => p.setMap(null))
      if (overlayRef.current) overlayRef.current.setMap(null)
    }
  }, [])

  return (
    <div className="relative w-full h-full min-h-[320px]">
      <div ref={containerRef} className="absolute inset-0 w-full h-full bg-surface-container-high" />
      <div className="absolute top-4 right-4 bg-secondary-container text-on-secondary-container px-4 py-2 rounded-full font-label-sm text-label-sm flex items-center gap-2 shadow-sm pointer-events-none">
        <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>
          location_on
        </span>
        Vue satellite du toit
      </div>
    </div>
  )
}
