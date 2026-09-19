import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  BrainCircuit,
  Check,
  Droplets,
  FileCheck2,
  Lightbulb,
  Loader2,
  MapPin,
  Navigation,
  Route,
  ShieldCheck,
  Signpost,
  Trash2,
  Upload,
  Waves,
  X,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { CivicMap } from '@/components/map/civic-map'
import { Header } from '@/components/layout/header'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input, Textarea } from '@/components/ui/input'
import { ApiError, api } from '@/lib/api'
import type { AiReportAnalysis, CivicReport, MapReport } from '@/types'

const categories = [
  { name: 'Pothole', description: 'Deep or hazardous potholes on public roads.', icon: Route },
  { name: 'Garbage accumulation', description: 'Uncollected waste or overflowing public bins.', icon: Trash2 },
  { name: 'Damaged streetlight', description: 'Streetlights that are broken, unsafe or not working.', icon: Lightbulb },
  { name: 'Blocked drainage', description: 'Clogged drains, waterlogging or overflowing stormwater lines.', icon: Waves },
  { name: 'Road damage', description: 'Cracked surfaces, unsafe shoulders or damaged dividers.', icon: Route },
  { name: 'Water infrastructure', description: 'Public pipeline leaks, broken taps or supply infrastructure.', icon: Droplets },
  { name: 'Public sanitation', description: 'Issues affecting public toilets or sanitation facilities.', icon: ShieldCheck },
  { name: 'Signage issue', description: 'Missing, damaged or unclear public road signs.', icon: Signpost },
] as const

const steps = [
  { label: 'Category', short: '1' },
  { label: 'Details', short: '2' },
  { label: 'Photos', short: '3' },
  { label: 'Location', short: '4' },
  { label: 'Review', short: '5' },
]

type LocationFields = {
  address: string
  landmark: string
  city: string
  state: string
  pincode: string
  latitude?: number
  longitude?: number
}

const initialLocation: LocationFields = { address: '', landmark: '', city: '', state: '', pincode: '' }

function StepProgress({ current }: { current: number }) {
  return (
    <nav aria-label="Report progress" className="pb-2">
      <ol className="flex items-center">
        {steps.map((step, index) => {
          const complete = index < current
          const active = index === current
          return <li key={step.label} className="flex flex-1 items-center last:flex-none" aria-current={active ? 'step' : undefined}>
            <div className="flex items-center gap-2">
              <span className={`grid size-9 shrink-0 place-items-center rounded-full border text-sm font-extrabold ${complete ? 'border-primary bg-primary text-primary-foreground' : active ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card text-muted-foreground'}`}>{complete ? <Check className="size-4" aria-hidden="true" /> : step.short}</span>
              <span className={`sr-only text-sm font-bold sm:not-sr-only ${active ? 'text-foreground' : 'text-muted-foreground'}`}>{step.label}</span>
            </div>
            {index < steps.length - 1 && <span className={`mx-2 h-px min-w-2 flex-1 sm:mx-3 sm:min-w-5 ${complete ? 'bg-primary' : 'bg-border'}`} aria-hidden="true" />}
          </li>
        })}
      </ol>
    </nav>
  )
}

export function CitizenReportPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [descriptionTouched, setDescriptionTouched] = useState(false)
  const [photos, setPhotos] = useState<File[]>([])
  const [location, setLocation] = useState<LocationFields>(initialLocation)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [locating, setLocating] = useState(false)
  const [checkingDuplicates, setCheckingDuplicates] = useState(false)
  const [duplicates, setDuplicates] = useState<MapReport[]>([])
  const [aiAnalysis, setAiAnalysis] = useState<AiReportAnalysis | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')
  const errorRef = useRef<HTMLDivElement>(null)
  const previews = useMemo(() => photos.map((file) => ({ file, url: URL.createObjectURL(file) })), [photos])

  useEffect(() => () => previews.forEach(({ url }) => URL.revokeObjectURL(url)), [previews])
  useEffect(() => { if (error) errorRef.current?.focus() }, [error])

  function validate(current = step) {
    let message = ''
    if (current === 0 && !category) message = 'Choose the category that best matches the issue.'
    if (current === 1) {
      setDescriptionTouched(true)
      if (description.trim().length < 20) message = 'Describe the issue in at least 20 characters.'
    }
    if (current === 3) {
      if (!location.address.trim() || !location.city.trim() || !location.state.trim()) message = 'Enter the street address, city and state.'
      else if (!/^[1-9]\d{5}$/.test(location.pincode)) message = 'Enter a valid 6-digit Indian PIN code.'
      else if (location.latitude === undefined || location.longitude === undefined) message = 'Drop a pin on the map or use your current location to confirm the issue position.'
    }
    setError(message)
    return !message
  }

  async function next() {
    if (!validate()) return
    setError('')
    if (step === 3 && location.latitude !== undefined && location.longitude !== undefined) await checkDuplicates()
    setStep((value) => Math.min(value + 1, 4))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function analyseDescription() {
    if (description.trim().length < 20) return setAiError('Write at least 20 characters before asking Civic Assist to review the description.')
    setAiLoading(true)
    setAiError('')
    setAiAnalysis(null)
    try {
      const response = await api<{ analysis: AiReportAnalysis }>('/api/ai/report-assist', { method: 'POST', body: JSON.stringify({ description }) })
      setAiAnalysis(response.analysis)
    } catch (caught) {
      setAiError((caught as ApiError).message || 'Civic Assist is unavailable. You can continue without it.')
    } finally {
      setAiLoading(false)
    }
  }

  async function checkDuplicates() {
    if (location.latitude === undefined || location.longitude === undefined) return
    setCheckingDuplicates(true)
    try {
      const response = await api<{ possibleDuplicates: MapReport[]; warningOnly: boolean }>('/api/reports/duplicates/check', {
        method: 'POST',
        body: JSON.stringify({ category, description, latitude: location.latitude, longitude: location.longitude, radius: 200, hours: 72 }),
      })
      setDuplicates(response.possibleDuplicates)
    } catch {
      setDuplicates([])
    } finally {
      setCheckingDuplicates(false)
    }
  }

  function back() {
    setError('')
    setStep((value) => Math.max(value - 1, 0))
  }

  function addPhotos(files: FileList | null) {
    if (!files) return
    const allowed = Array.from(files).filter((file) => ['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
    const tooLarge = allowed.find((file) => file.size > 5 * 1024 * 1024)
    if (allowed.length !== files.length) return setError('Use JPG, PNG or WebP photographs only.')
    if (tooLarge) return setError(`${tooLarge.name} is larger than 5 MB.`)
    if (photos.length + allowed.length > 4) return setError('You can add up to four photographs.')
    setError('')
    setPhotos((current) => [...current, ...allowed])
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) return setError('Location access is not supported by this browser. Enter the address manually.')
    setLocating(true)
    setError('')
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocation((current) => ({ ...current, latitude: coords.latitude, longitude: coords.longitude }))
        setLocating(false)
      },
      () => {
        setError('We could not access your location. You can continue by entering the address manually.')
        setLocating(false)
      },
      { enableHighAccuracy: false, timeout: 10000 },
    )
  }

  async function submitReport() {
    if (![0, 1, 3].every(validate)) return
    const body = new FormData()
    body.set('category', category)
    body.set('description', description.trim())
    body.set('location', JSON.stringify({
      address: location.address.trim(),
      landmark: location.landmark.trim() || undefined,
      city: location.city.trim(),
      state: location.state.trim(),
      pincode: location.pincode.trim(),
      coordinates: location.latitude !== undefined && location.longitude !== undefined
        ? { latitude: location.latitude, longitude: location.longitude }
        : undefined,
    }))
    photos.forEach((photo) => body.append('photos', photo))
    setSubmitting(true)
    setError('')
    try {
      const result = await api<{ report: CivicReport; possibleDuplicates: MapReport[] }>('/api/reports', { method: 'POST', body })
      navigate(`/reports/${result.report.id}?submitted=1`, { replace: true, state: { duplicateWarningCount: result.possibleDuplicates.length } })
    } catch (caught) {
      setError((caught as ApiError).message || 'Your report could not be submitted. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const selectedCategory = categories.find((item) => item.name === category)
  const descriptionError = descriptionTouched && description.trim().length < 20 ? 'Describe the issue in at least 20 characters.' : ''
  const updateLocation = (field: keyof LocationFields, value: string) => setLocation((current) => ({ ...current, [field]: value }))

  return <><Header /><main id="main-content" className="container py-8 sm:py-12 lg:py-16"><div className="mx-auto max-w-5xl"><div className="mb-8"><Badge>Citizen report</Badge><h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">Report a civic issue</h1><p className="mt-2 max-w-2xl leading-7 text-muted-foreground">Share clear details so the appropriate municipal team can review the issue. Required fields are marked.</p></div><StepProgress current={step} />
    {error && <div ref={errorRef} tabIndex={-1} className="mt-5 outline-none"><Alert title="Please review this step" variant="error">{error}</Alert></div>}
    <Card className="mt-6 p-5 sm:p-8">
      {step === 0 && <section aria-labelledby="category-title"><h2 id="category-title" className="font-display text-2xl font-extrabold">What needs attention?</h2><p className="mt-2 text-muted-foreground">Select one category. You can explain related details in the next step.</p><div className="mt-6 grid gap-3 sm:grid-cols-2">{categories.map(({ name, description: copy, icon: Icon }) => <button key={name} type="button" onClick={() => { setCategory(name); setError('') }} aria-pressed={category === name} className={`flex min-h-28 gap-4 rounded-2xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/20 ${category === name ? 'border-primary bg-primary/5 shadow-card' : 'border-border hover:border-primary/35 hover:bg-secondary/45'}`}><span className={`grid size-11 shrink-0 place-items-center rounded-xl ${category === name ? 'bg-primary text-primary-foreground' : 'bg-secondary text-primary'}`}><Icon className="size-5" aria-hidden="true" /></span><span><span className="block font-extrabold">{name}</span><span className="mt-1 block text-sm leading-5 text-muted-foreground">{copy}</span></span></button>)}</div></section>}
      {step === 1 && <section aria-labelledby="details-title"><h2 id="details-title" className="font-display text-2xl font-extrabold">Describe what you noticed</h2><p className="mt-2 text-muted-foreground">Include the severity, nearby hazards and how long the issue has been present.</p><label htmlFor="description" className="mt-6 block text-sm font-bold">Issue description <span aria-hidden="true">*</span></label><Textarea id="description" value={description} onChange={(event) => { setDescription(event.target.value); setAiAnalysis(null); setAiError('') }} maxLength={2000} rows={8} className="mt-2" placeholder="For example: A deep pothole near the left lane has exposed loose stones and is difficult to see after sunset." aria-invalid={Boolean(descriptionError)} aria-describedby={descriptionError ? 'description-help description-count description-error' : 'description-help description-count'} /><div className="mt-2 flex justify-between gap-4 text-xs text-muted-foreground"><p id="description-help">Minimum 20 characters. Avoid including personal information.</p><p id="description-count" aria-live="polite">{description.length}/2000</p></div>{descriptionError && <p id="description-error" className="mt-2 text-sm font-medium text-destructive" role="alert">{descriptionError}</p>}<div className="mt-5 rounded-2xl border border-primary/15 bg-primary/5 p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="flex items-center gap-2 font-extrabold"><BrainCircuit className="size-5 text-primary" aria-hidden="true" />Civic Assist</p><p className="mt-1 text-sm text-muted-foreground">Get a private, server-side category and urgency suggestion. You stay in control.</p></div><Button type="button" variant="outline" onClick={() => void analyseDescription()} disabled={aiLoading}>{aiLoading ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <BrainCircuit className="size-4" aria-hidden="true" />}{aiLoading ? 'Reviewing…' : 'Review description'}</Button></div>{aiError && <Alert className="mt-4" title="Civic Assist unavailable" variant="error">{aiError}</Alert>}{aiAnalysis && <div className="mt-4 rounded-xl bg-card p-4" role="status"><div className="flex flex-wrap items-center gap-2"><Badge>{aiAnalysis.suggestedCategory ?? 'More detail needed'}</Badge><Badge variant="outline">{Math.round(aiAnalysis.confidence * 100)}% confidence</Badge><Badge variant="secondary">{aiAnalysis.suggestedPriority} priority</Badge></div><p className="mt-3 text-sm leading-6 text-muted-foreground">{aiAnalysis.summary}</p><p className="mt-2 text-xs text-muted-foreground">{aiAnalysis.guidance}</p>{aiAnalysis.suggestedCategory && aiAnalysis.suggestedCategory !== category && <Button type="button" size="sm" variant="outline" className="mt-3" onClick={() => setCategory(aiAnalysis.suggestedCategory!)}>Use suggested category</Button>}</div>}</div></section>}
      {step === 2 && <section aria-labelledby="photos-title"><h2 id="photos-title" className="font-display text-2xl font-extrabold">Add photographs</h2><p className="mt-2 text-muted-foreground">Photographs help teams assess the issue, but you can continue without them.</p><label className="mt-6 flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-input bg-secondary/35 p-6 text-center transition hover:border-primary/40 focus-within:ring-4 focus-within:ring-ring/15"><input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => { addPhotos(event.target.files); event.target.value = '' }} /><Upload className="size-7 text-primary" aria-hidden="true" /><span className="mt-3 font-extrabold">Choose photographs</span><span className="mt-1 text-sm text-muted-foreground">JPG, PNG or WebP · up to 4 files · 5 MB each</span></label>{previews.length > 0 && <ul className="mt-5 grid gap-3 sm:grid-cols-2">{previews.map(({ file, url }, index) => <li key={`${file.name}-${file.lastModified}`} className="flex items-center gap-3 rounded-2xl border border-border p-3"><img src={url} alt="" className="size-16 rounded-xl object-cover" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{file.name}</p><p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(1)} MB</p></div><Button type="button" variant="ghost" size="icon" onClick={() => setPhotos((current) => current.filter((_, photoIndex) => photoIndex !== index))} aria-label={`Remove ${file.name}`}><X className="size-4" aria-hidden="true" /></Button></li>)}</ul>}</section>}
      {step === 3 && <section aria-labelledby="location-title"><h2 id="location-title" className="font-display text-2xl font-extrabold">Confirm the location</h2><p className="mt-2 text-muted-foreground">Drop a pin on the issue position, then add the nearest public address.</p><Button type="button" variant="outline" className="mt-5" onClick={useCurrentLocation} disabled={locating}>{locating ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Navigation className="size-4" aria-hidden="true" />}{locating ? 'Finding location…' : location.latitude !== undefined ? 'Use current location again' : 'Use current location'}</Button><div className="mt-5 h-80 overflow-hidden rounded-3xl border border-border"><CivicMap mode="pick" selectedLocation={location.latitude !== undefined && location.longitude !== undefined ? { latitude: location.latitude, longitude: location.longitude } : undefined} onLocationSelect={({ latitude, longitude }) => { setLocation((current) => ({ ...current, latitude, longitude })); setError('') }} ariaLabel="Choose the civic issue location" className="min-h-0 rounded-none" /></div><p className="mt-2 text-xs text-muted-foreground">Tap or click the map to place the issue pin. Street tiles are provided by OpenStreetMap contributors.</p><div className="mt-6 grid gap-5 sm:grid-cols-2"><div className="sm:col-span-2"><label htmlFor="address" className="mb-2 block text-sm font-bold">Street address <span aria-hidden="true">*</span></label><Input id="address" value={location.address} onChange={(event) => updateLocation('address', event.target.value)} autoComplete="street-address" placeholder="For example: Baner Road, near Orchid School" /></div><div className="sm:col-span-2"><label htmlFor="landmark" className="mb-2 block text-sm font-bold">Landmark <span className="font-normal text-muted-foreground">(optional)</span></label><Input id="landmark" value={location.landmark} onChange={(event) => updateLocation('landmark', event.target.value)} placeholder="Opposite the community garden" /></div><div><label htmlFor="city" className="mb-2 block text-sm font-bold">City <span aria-hidden="true">*</span></label><Input id="city" value={location.city} onChange={(event) => updateLocation('city', event.target.value)} autoComplete="address-level2" placeholder="Pune" /></div><div><label htmlFor="state" className="mb-2 block text-sm font-bold">State <span aria-hidden="true">*</span></label><Input id="state" value={location.state} onChange={(event) => updateLocation('state', event.target.value)} autoComplete="address-level1" placeholder="Maharashtra" /></div><div><label htmlFor="pincode" className="mb-2 block text-sm font-bold">PIN code <span aria-hidden="true">*</span></label><Input id="pincode" value={location.pincode} onChange={(event) => updateLocation('pincode', event.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="postal-code" placeholder="411045" /></div>{location.latitude !== undefined && <div className="flex items-end"><p className="flex min-h-12 items-center gap-2 rounded-xl bg-success/8 px-4 text-sm font-bold text-success"><MapPin className="size-4" aria-hidden="true" />Map pin confirmed</p></div>}</div></section>}
      {step === 4 && <section aria-labelledby="review-title"><h2 id="review-title" className="font-display text-2xl font-extrabold">Review your report</h2><p className="mt-2 text-muted-foreground">Check the information before sending it to the civic team.</p>{checkingDuplicates && <Alert className="mt-5" title="Checking nearby reports"><span className="inline-flex items-center gap-2"><Loader2 className="size-4 animate-spin" aria-hidden="true" />Looking for recent reports within 200 metres…</span></Alert>}{!checkingDuplicates && duplicates.length > 0 && <div className="mt-5 rounded-2xl border border-warning/35 bg-warning/10 p-4" role="status"><p className="font-extrabold text-foreground">Similar reports may already exist nearby</p><p className="mt-1 text-sm leading-6 text-muted-foreground">These are warnings only. If your issue is different or has changed, you can still submit a new report.</p><ul className="mt-3 space-y-2">{duplicates.map((duplicate) => <li key={duplicate.id} className="rounded-xl bg-card p-3 text-sm"><div className="flex flex-wrap items-center justify-between gap-2"><span className="font-bold">{duplicate.reference} · {duplicate.category}</span><Badge variant="outline">{duplicate.distanceMetres !== undefined ? `${Math.round(duplicate.distanceMetres)} m away` : 'Nearby'}</Badge></div><p className="mt-1 line-clamp-2 text-muted-foreground">{duplicate.description}</p></li>)}</ul></div>}<dl className="mt-6 divide-y divide-border rounded-2xl border border-border"><div className="p-4 sm:grid sm:grid-cols-[10rem_1fr] sm:gap-4"><dt className="text-sm font-bold text-muted-foreground">Category</dt><dd className="mt-1 font-bold sm:mt-0">{selectedCategory?.name}</dd></div><div className="p-4 sm:grid sm:grid-cols-[10rem_1fr] sm:gap-4"><dt className="text-sm font-bold text-muted-foreground">Description</dt><dd className="mt-1 whitespace-pre-wrap sm:mt-0">{description}</dd></div><div className="p-4 sm:grid sm:grid-cols-[10rem_1fr] sm:gap-4"><dt className="text-sm font-bold text-muted-foreground">Photographs</dt><dd className="mt-1 sm:mt-0">{photos.length ? `${photos.length} photograph${photos.length > 1 ? 's' : ''}` : 'None added'}</dd></div><div className="p-4 sm:grid sm:grid-cols-[10rem_1fr] sm:gap-4"><dt className="text-sm font-bold text-muted-foreground">Location</dt><dd className="mt-1 sm:mt-0">{location.address}{location.landmark ? `, ${location.landmark}` : ''}<br />{location.city}, {location.state} {location.pincode}</dd></div></dl><Alert className="mt-5" title="What happens next">You will receive a reference number immediately and can track every status update from My reports.</Alert></section>}
      <div className="mt-8 flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:justify-between">{step > 0 ? <Button type="button" variant="outline" onClick={back} disabled={submitting || checkingDuplicates}><ArrowLeft className="size-4" aria-hidden="true" />Back</Button> : <span />}{step < 4 ? <Button type="button" onClick={() => void next()} disabled={checkingDuplicates}>{checkingDuplicates ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}{checkingDuplicates ? 'Checking nearby reports…' : 'Continue'}{!checkingDuplicates && <ArrowRight className="size-4" aria-hidden="true" />}</Button> : <Button type="button" size="lg" onClick={submitReport} disabled={submitting || checkingDuplicates}>{submitting ? <><Loader2 className="size-4 animate-spin" aria-hidden="true" />Submitting securely…</> : <><FileCheck2 className="size-4" aria-hidden="true" />{duplicates.length ? 'Submit as a new report' : 'Submit report'}</>}</Button>}</div>
    </Card></div></main></>
}
