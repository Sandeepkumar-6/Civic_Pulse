import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Crosshair, Layers3, Loader2, LocateFixed, MapPin, RefreshCw, SlidersHorizontal } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { CivicMap, type MapViewport } from '@/components/map/civic-map'
import { Header } from '@/components/layout/header'
import { ReportStatusBadge } from '@/components/reports/report-status'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ApiError, api } from '@/lib/api'
import type { MapReport, ReportStatus } from '@/types'

const categories = ['All categories', 'Pothole', 'Garbage accumulation', 'Damaged streetlight', 'Blocked drainage', 'Road damage', 'Water infrastructure', 'Public sanitation', 'Signage issue']
const statuses = ['All statuses', 'Submitted', 'Acknowledged', 'Assigned', 'In Progress', 'Resolved', 'Closed']

function viewportFromCenter(latitude: number, longitude: number, zoom = 12): MapViewport {
  const latSpan = 0.12
  const lngSpan = 0.15
  return {
    west: longitude - lngSpan,
    south: latitude - latSpan,
    east: longitude + lngSpan,
    north: latitude + latSpan,
    latitude,
    longitude,
    zoom,
  }
}

function filterQuery(viewport: MapViewport, category: string, status: string) {
  const params = new URLSearchParams({
    west: String(viewport.west), south: String(viewport.south), east: String(viewport.east), north: String(viewport.north),
  })
  if (category !== categories[0]) params.set('category', category)
  if (status !== statuses[0]) params.set('status', status)
  return params
}

export function CivicMapPage() {
  const reduceMotion = useReducedMotion()
  const [reports, setReports] = useState<MapReport[]>([])
  const [nearby, setNearby] = useState<MapReport[] | null>(null)
  const [category, setCategory] = useState(categories[0])
  const [status, setStatus] = useState(statuses[0])
  const [viewport, setViewport] = useState<MapViewport | null>(null)
  const [mapCenter, setMapCenter] = useState<[number, number]>([18.559, 73.807])
  const [loading, setLoading] = useState(true)
  const [nearbyLoading, setNearbyLoading] = useState(false)
  const [error, setError] = useState('')
  const [permissionMessage, setPermissionMessage] = useState('')
  const [tileError, setTileError] = useState(false)
  const requestRef = useRef(0)

  const loadReports = useCallback(async (nextViewport: MapViewport, nextCategory = category, nextStatus = status) => {
    const requestId = ++requestRef.current
    setLoading(true)
    setError('')
    try {
      const response = await api<{ reports: MapReport[] }>(`/api/reports/map?${filterQuery(nextViewport, nextCategory, nextStatus)}`)
      if (requestId === requestRef.current) setReports(response.reports)
    } catch (caught) {
      if (requestId === requestRef.current) setError((caught as ApiError).message || 'Map reports could not be loaded.')
    } finally {
      if (requestId === requestRef.current) setLoading(false)
    }
  }, [category, status])

  useEffect(() => {
    if (!viewport) return
    const timer = window.setTimeout(() => void loadReports(viewport), 180)
    return () => window.clearTimeout(timer)
  }, [loadReports, viewport])

  useEffect(() => {
    if (viewport) return
    const initialViewport = viewportFromCenter(mapCenter[0], mapCenter[1])
    setViewport(initialViewport)
    void loadReports(initialViewport)
  }, [loadReports, mapCenter, viewport])

  const searchNearby = useCallback(async (latitude: number, longitude: number) => {
    setNearbyLoading(true)
    setPermissionMessage('')
    try {
      const params = new URLSearchParams({ latitude: String(latitude), longitude: String(longitude), radius: '5000' })
      if (category !== categories[0]) params.set('category', category)
      if (status !== statuses[0]) params.set('status', status)
      const response = await api<{ reports: MapReport[] }>(`/api/reports/nearby?${params}`)
      setNearby(response.reports)
    } catch (caught) {
      setPermissionMessage((caught as ApiError).message || 'Nearby reports could not be loaded.')
    } finally {
      setNearbyLoading(false)
    }
  }, [category, status])

  function findNearMe() {
    if (!navigator.geolocation) return setPermissionMessage('Location access is not available in this browser. Search around the map centre instead.')
    setNearbyLoading(true)
    setPermissionMessage('')
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setMapCenter([coords.latitude, coords.longitude])
        void searchNearby(coords.latitude, coords.longitude)
      },
      () => { setNearbyLoading(false); setPermissionMessage('Location permission was not granted. You can still search around the map centre.') },
      { enableHighAccuracy: false, timeout: 10000 },
    )
  }

  useEffect(() => {
    if (!navigator.geolocation) return
    let cancelled = false
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        if (cancelled) return
        setMapCenter((current) => current ?? [coords.latitude, coords.longitude])
        setPermissionMessage('Using your current location to show nearby issues.')
        void searchNearby(coords.latitude, coords.longitude)
      },
      () => {
        if (!cancelled) setPermissionMessage('Location permission was not granted. You can still search around the map centre.')
      },
      { enableHighAccuracy: false, timeout: 10000 },
    )
    return () => { cancelled = true }
  }, [searchNearby])

  const counts = useMemo(() => Object.entries(reports.reduce<Record<string, number>>((result, report) => {
    result[report.category] = (result[report.category] ?? 0) + 1
    return result
  }, {})).sort((a, b) => b[1] - a[1]), [reports])
  const displayedReports = nearby ?? reports

  return <><Header /><main id="main-content" className="container py-8 sm:py-12"><div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><Badge><Layers3 className="size-3.5" aria-hidden="true" />Live civic map</Badge><h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">See what your neighbourhood is reporting</h1><p className="mt-2 max-w-2xl leading-7 text-muted-foreground">Explore current reports, narrow the view by category or status, and find issues near a chosen area.</p></div><Badge variant="outline" className="self-start px-3 py-2 lg:self-auto"><MapPin className="size-4" aria-hidden="true" />{reports.length} visible report{reports.length === 1 ? '' : 's'}</Badge></div>
    <Card className="mt-7 p-4 sm:p-5"><div className="flex items-center gap-2"><SlidersHorizontal className="size-5 text-primary" aria-hidden="true" /><h2 className="font-display text-lg font-extrabold">Map filters</h2></div><div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto_auto]"><div><label htmlFor="map-category" className="mb-1.5 block text-sm font-bold">Category</label><select id="map-category" value={category} onChange={(event) => { setCategory(event.target.value); setNearby(null) }} className="h-12 w-full rounded-xl border border-input bg-background px-3 text-sm font-bold outline-none focus-visible:ring-4 focus-visible:ring-ring/15">{categories.map((item) => <option key={item}>{item}</option>)}</select></div><div><label htmlFor="map-status" className="mb-1.5 block text-sm font-bold">Status</label><select id="map-status" value={status} onChange={(event) => { setStatus(event.target.value); setNearby(null) }} className="h-12 w-full rounded-xl border border-input bg-background px-3 text-sm font-bold outline-none focus-visible:ring-4 focus-visible:ring-ring/15">{statuses.map((item) => <option key={item}>{item}</option>)}</select></div><Button className="self-end" variant="outline" onClick={findNearMe} disabled={nearbyLoading}>{nearbyLoading ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <LocateFixed className="size-4" aria-hidden="true" />}Near me</Button><Button className="self-end" variant="outline" onClick={() => viewport && void searchNearby(viewport.latitude, viewport.longitude)} disabled={!viewport || nearbyLoading}><Crosshair className="size-4" aria-hidden="true" />This area</Button></div>{counts.length > 0 && <div className="mt-4 flex flex-wrap gap-2" aria-label="Visible report counts by category">{counts.map(([name, count]) => <Badge key={name} variant="secondary">{name}<span className="rounded-full bg-card px-1.5">{count}</span></Badge>)}</div>}</Card>
    {permissionMessage && <Alert className="mt-5" title="Location update" variant="info">{permissionMessage}</Alert>}
    {tileError && <Alert className="mt-5" title="Base map connection is limited">Report markers and the list remain available. Check your network connection to restore street tiles.</Alert>}
    {error && <div className="mt-5"><Alert title="Map data is unavailable" variant="error">{error}</Alert><Button className="mt-3" variant="outline" onClick={() => viewport && void loadReports(viewport)}><RefreshCw className="size-4" aria-hidden="true" />Try again</Button></div>}
    <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1.65fr)_minmax(19rem,.7fr)]"><div className="relative min-h-[28rem] overflow-hidden rounded-[1.5rem] border border-border shadow-card sm:min-h-[36rem]"><CivicMap reports={reports} center={mapCenter ?? [18.559, 73.807]} zoom={12} className="absolute inset-0 min-h-0 rounded-none" onViewportChange={setViewport} onTileError={() => setTileError(true)} />{loading && <div className="pointer-events-none absolute inset-x-4 top-4 z-[500] flex items-center gap-2 rounded-xl bg-card/95 px-4 py-3 text-sm font-bold shadow-card" role="status"><Loader2 className="size-4 animate-spin text-primary" aria-hidden="true" />Updating reports…</div>}{!loading && !error && reports.length === 0 && <div className="absolute inset-x-5 top-1/2 z-[500] -translate-y-1/2 rounded-2xl bg-card/95 p-5 text-center shadow-card"><MapPin className="mx-auto size-6 text-primary" aria-hidden="true" /><p className="mt-2 font-extrabold">No matching reports in this view</p><p className="mt-1 text-sm text-muted-foreground">Move the map or clear a filter to explore another area.</p></div>}</div><Card className="max-h-[36rem] overflow-hidden"><div className="flex items-center justify-between border-b border-border p-5"><div><h2 className="font-display text-xl font-extrabold">{nearby ? 'Nearby reports' : 'Reports in view'}</h2><p className="mt-1 text-xs text-muted-foreground">{nearby ? 'Within 5 km, nearest first' : 'Based on the visible map area'}</p></div>{nearby && <Button size="sm" variant="ghost" onClick={() => setNearby(null)}>Clear</Button>}</div><div className="max-h-[29rem] overflow-y-auto" tabIndex={0}>{loading && !reports.length ? <div className="space-y-3 p-5">{[1, 2, 3].map((item) => <Skeleton key={item} className="h-28 rounded-2xl" />)}</div> : displayedReports.length === 0 ? <div className="p-8 text-center"><p className="font-bold">No reports to list</p><p className="mt-2 text-sm text-muted-foreground">Try a wider area or different filters.</p></div> : <AnimatePresence initial={false}>{displayedReports.slice(0, 25).map((report) => <motion.article key={report.id} initial={reduceMotion ? false : { opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="border-b border-border p-5 last:border-0"><div className="flex items-start justify-between gap-3"><Badge variant="outline">{report.category}</Badge><ReportStatusBadge status={report.status as ReportStatus} /></div><p className="mt-3 line-clamp-2 text-sm leading-6 text-muted-foreground">{report.description}</p><p className="mt-3 flex gap-2 text-sm"><MapPin className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />{report.location.address}, {report.location.city}</p>{report.distanceMetres !== undefined && <p className="mt-2 text-xs font-bold text-primary">{report.distanceMetres < 1000 ? `${Math.round(report.distanceMetres)} m away` : `${(report.distanceMetres / 1000).toFixed(1)} km away`}</p>}<p className="mt-3 font-mono text-xs font-bold text-primary">{report.reference}</p></motion.article>)}</AnimatePresence>}</div></Card></div>
  </main></>
}
