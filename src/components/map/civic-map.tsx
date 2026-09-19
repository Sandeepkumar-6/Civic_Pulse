import { useEffect, useRef } from 'react'
import L from 'leaflet'
import Supercluster from 'supercluster'
import type { MapReport } from '@/types'

export type MapViewport = {
  west: number
  south: number
  east: number
  north: number
  latitude: number
  longitude: number
  zoom: number
}

type CivicMapProps = {
  reports?: MapReport[]
  center?: [number, number]
  zoom?: number
  selectedLocation?: { latitude: number; longitude: number }
  mode?: 'browse' | 'pick'
  onLocationSelect?: (location: { latitude: number; longitude: number }) => void
  onViewportChange?: (viewport: MapViewport) => void
  onReportSelect?: (report: MapReport) => void
  onTileError?: () => void
  className?: string
  ariaLabel?: string
}

const categoryClass: Record<string, string> = {
  Pothole: 'roads',
  'Road damage': 'roads',
  'Garbage accumulation': 'waste',
  'Damaged streetlight': 'lighting',
  'Blocked drainage': 'water',
  'Water infrastructure': 'water',
  'Public sanitation': 'sanitation',
  'Signage issue': 'signage',
}

const DEFAULT_CENTER: [number, number] = [18.559, 73.807]

const OSM_MAP_TILE = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'

function viewportFromMap(map: L.Map): MapViewport {
  const bounds = map.getBounds()
  const center = map.getCenter()
  return {
    west: bounds.getWest(), south: bounds.getSouth(), east: bounds.getEast(), north: bounds.getNorth(),
    latitude: center.lat, longitude: center.lng, zoom: map.getZoom(),
  }
}

export function CivicMap({
  reports = [],
  center = DEFAULT_CENTER,
  zoom = 12,
  selectedLocation,
  mode = 'browse',
  onLocationSelect,
  onViewportChange,
  onReportSelect,
  onTileError,
  className = '',
  ariaLabel = 'Interactive civic report map',
}: CivicMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const reportLayerRef = useRef<L.LayerGroup | null>(null)
  const selectionLayerRef = useRef<L.LayerGroup | null>(null)
  const reportsRef = useRef(reports)
  const callbacksRef = useRef({ onLocationSelect, onViewportChange, onReportSelect, onTileError })
  const renderRef = useRef<() => void>(() => undefined)
  reportsRef.current = reports
  callbacksRef.current = { onLocationSelect, onViewportChange, onReportSelect, onTileError }
  const centerRef = useRef(center)
  centerRef.current = center

  renderRef.current = () => {
    const map = mapRef.current
    const layer = reportLayerRef.current
    if (!map || !layer || mode === 'pick') return
    layer.clearLayers()
    const pointReports = reportsRef.current.filter((report) => report.location.coordinates)
    const index = new Supercluster<{ report: MapReport }>({ radius: 64, maxZoom: 17 })
    index.load(pointReports.map((report) => ({
      type: 'Feature' as const,
      properties: { report },
      geometry: { type: 'Point' as const, coordinates: [report.location.coordinates!.longitude, report.location.coordinates!.latitude] },
    })))
    const bounds = map.getBounds()
    const clusters = index.getClusters([bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()], Math.round(map.getZoom()))
    clusters.forEach((feature) => {
      const [longitude, latitude] = feature.geometry.coordinates
      const properties = feature.properties
      if ('cluster' in properties && properties.cluster) {
        const count = properties.point_count
        const marker = L.marker([latitude, longitude], {
          icon: L.divIcon({ className: '', html: `<span class="civic-cluster-marker" aria-hidden="true">${count}</span>`, iconSize: [46, 46], iconAnchor: [23, 23] }),
          keyboard: true,
          title: `${count} reports in this area`,
          alt: `${count} clustered civic reports`,
        })
        marker.on('click', () => map.setView([latitude, longitude], Math.min(index.getClusterExpansionZoom(properties.cluster_id), 18)))
        marker.addTo(layer)
      } else {
        const report = (properties as { report: MapReport }).report
        const tone = categoryClass[report.category] ?? 'default'
        const marker = L.marker([latitude, longitude], {
          icon: L.divIcon({ className: '', html: `<span class="civic-report-marker civic-report-marker--${tone}" aria-hidden="true"><span></span></span>`, iconSize: [34, 42], iconAnchor: [17, 38] }),
          keyboard: true,
          title: `${report.category}: ${report.location.address}`,
          alt: `${report.category} report marker`,
        })
        const popup = document.createElement('div')
        popup.className = 'min-w-48'
        const label = document.createElement('p')
        label.className = 'text-xs font-bold text-primary'
        label.textContent = report.status
        const heading = document.createElement('p')
        heading.className = 'mt-1 font-bold'
        heading.textContent = report.category
        const address = document.createElement('p')
        address.className = 'mt-1 text-xs text-muted-foreground'
        address.textContent = `${report.location.address}, ${report.location.city}`
        const reference = document.createElement('p')
        reference.className = 'mt-3 font-mono text-xs font-bold text-primary'
        reference.textContent = report.reference
        popup.append(label, heading, address, reference)
        marker.bindPopup(popup)
        marker.on('click', () => callbacksRef.current.onReportSelect?.(report))
        marker.addTo(layer)
      }
    })
  }

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const initialCenter = centerRef.current
    const map = L.map(containerRef.current, { center: initialCenter, zoom, zoomControl: true, attributionControl: true })
    mapRef.current = map
    reportLayerRef.current = L.layerGroup().addTo(map)
    selectionLayerRef.current = L.layerGroup().addTo(map)
    L.tileLayer(OSM_MAP_TILE, {
      maxZoom: 19,
      minZoom: 2,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).on('tileerror', () => callbacksRef.current.onTileError?.()).addTo(map)
    const updateViewport = () => {
      renderRef.current()
      callbacksRef.current.onViewportChange?.(viewportFromMap(map))
    }
    map.on('moveend', updateViewport)
    map.on('click', (event: L.LeafletMouseEvent) => {
      if (mode === 'pick') callbacksRef.current.onLocationSelect?.({ latitude: event.latlng.lat, longitude: event.latlng.lng })
    })
    const initialFrame = requestAnimationFrame(() => {
      if (mapRef.current !== map) return
      map.invalidateSize()
      updateViewport()
    })
    return () => {
      cancelAnimationFrame(initialFrame)
      map.off()
      map.remove()
      if (mapRef.current === map) {
        mapRef.current = null
        reportLayerRef.current = null
        selectionLayerRef.current = null
      }
    }
  }, [mode, zoom])

  useEffect(() => {
    if (!mapRef.current) return
    mapRef.current.setView(center, zoom)
  }, [center, zoom])

  useEffect(() => { renderRef.current() }, [reports])

  useEffect(() => {
    const layer = selectionLayerRef.current
    if (!layer || mode !== 'pick') return
    layer.clearLayers()
    if (!selectedLocation) return
    L.marker([selectedLocation.latitude, selectedLocation.longitude], {
      icon: L.divIcon({ className: '', html: '<span class="civic-location-marker" aria-hidden="true"></span>', iconSize: [38, 46], iconAnchor: [19, 42] }),
      keyboard: false,
    }).addTo(layer)
    mapRef.current?.panTo([selectedLocation.latitude, selectedLocation.longitude])
  }, [mode, selectedLocation])

  return <div ref={containerRef} className={`civic-map ${className}`} role="region" aria-label={ariaLabel} />
}
