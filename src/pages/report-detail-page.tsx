import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { ArrowLeft, Camera, CheckCircle2, Clock3, Loader2, MapPin, RefreshCw, UserRoundCheck } from 'lucide-react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Header } from '@/components/layout/header'
import { ReportStatusBadge } from '@/components/reports/report-status'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/context/auth-context'
import { ApiError, api, apiUrl } from '@/lib/api'
import { formatIst } from '@/lib/format'
import type { CivicReport, MunicipalDashboard, ReportStatus, User } from '@/types'

const statuses: ReportStatus[] = ['Submitted', 'Acknowledged', 'Assigned', 'In Progress', 'Resolved', 'Closed']

function DetailLoading() {
  return <div className="mx-auto max-w-6xl py-10"><Skeleton className="h-5 w-32" /><Skeleton className="mt-5 h-10 w-80 max-w-full" /><div className="mt-8 grid gap-5 lg:grid-cols-[1.3fr_.7fr]"><Skeleton className="h-96 rounded-3xl" /><Skeleton className="h-80 rounded-3xl" /></div></div>
}

export function ReportDetailPage() {
  const { user } = useAuth()
  const { id = '' } = useParams()
  const [searchParams] = useSearchParams()
  const [report, setReport] = useState<CivicReport | null>(null)
  const [assignees, setAssignees] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [status, setStatus] = useState<ReportStatus>('Acknowledged')
  const [ward, setWard] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const justSubmitted = searchParams.get('submitted') === '1'
  const municipal = user?.role === 'admin' || user?.role === 'ward_officer'

  const loadReport = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const response = await api<{ report: CivicReport }>(`/api/reports/${id}`)
      setReport(response.report); setStatus(response.report.status); setWard(response.report.ward ?? '')
      setAssignedTo(typeof response.report.assignedTo === 'object' ? response.report.assignedTo.id : '')
      if (municipal) {
        const municipalData = await api<MunicipalDashboard>('/api/dashboard/municipal')
        setAssignees(municipalData.assignees)
      }
    } catch (caught) { setError((caught as ApiError).message || 'This report could not be loaded.') }
    finally { setLoading(false) }
  }, [id, municipal])

  useEffect(() => { void loadReport() }, [loadReport])

  async function updateWorkflow(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError(''); setSuccess('')
    try {
      const response = await api<{ report: CivicReport }>(`/api/reports/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status, ward, assignedTo, message }) })
      setReport(response.report); setMessage(''); setSuccess(`Report updated to ${response.report.status}.`)
    } catch (caught) { setError((caught as ApiError).message || 'The workflow update could not be saved.') }
    finally { setSaving(false) }
  }

  const dashboardHref = municipal ? '/admin' : '/my-reports'
  const dashboardLabel = municipal ? 'Back to dashboard' : 'Back to my reports'
  return <><Header /><main id="main-content" className="container">{loading ? <DetailLoading /> : error && !report ? <div className="mx-auto max-w-xl py-16"><Alert title="Report unavailable" variant="error">{error}</Alert><div className="mt-5 flex gap-3"><Button asChild variant="outline"><Link to={dashboardHref}><ArrowLeft className="size-4" aria-hidden="true" />{dashboardLabel}</Link></Button><Button onClick={() => void loadReport()}><RefreshCw className="size-4" aria-hidden="true" />Try again</Button></div></div> : report && <div className="mx-auto max-w-6xl py-10 sm:py-14">{justSubmitted && <Alert title="Report submitted successfully" variant="success" className="mb-6">Your reference is <strong>{report.reference}</strong>. Save it for future correspondence; progress will remain available in your account.</Alert>}{success && <Alert title="Workflow updated" variant="success" className="mb-6">{success}</Alert>}{error && <Alert title="Update failed" variant="error" className="mb-6">{error}</Alert>}<Button asChild variant="link"><Link to={dashboardHref}><ArrowLeft className="size-4" aria-hidden="true" />{dashboardLabel}</Link></Button><div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="font-mono text-sm font-bold text-muted-foreground">{report.reference}</p><h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">{report.category}</h1>{municipal && typeof report.citizen === 'object' && <p className="mt-2 text-sm text-muted-foreground">Reported by {report.citizen.name}</p>}</div><ReportStatusBadge status={report.status} /></div>
      <div className="mt-8 grid gap-5 lg:grid-cols-[1.3fr_.7fr]"><div className="space-y-5"><Card className="p-5 sm:p-7"><h2 className="font-display text-xl font-extrabold">Issue details</h2><p className="mt-4 whitespace-pre-wrap leading-7 text-muted-foreground">{report.description}</p></Card><Card className="p-5 sm:p-7"><h2 className="font-display text-xl font-extrabold">Progress updates</h2><ol className="mt-6 space-y-0">{[...report.updates].reverse().map((update, index, updates) => <li key={update._id} className="relative grid grid-cols-[2.25rem_1fr] gap-3 pb-7 last:pb-0"><div className="relative"><span className={`grid size-9 place-items-center rounded-full ${index === 0 ? 'bg-primary text-primary-foreground' : 'bg-secondary text-primary'}`}>{index === 0 ? <CheckCircle2 className="size-4" aria-hidden="true" /> : <Clock3 className="size-4" aria-hidden="true" />}</span>{index < updates.length - 1 && <span className="absolute left-[1.1rem] top-9 h-[calc(100%-2.25rem)] w-px bg-border" aria-hidden="true" />}</div><div><div className="flex flex-wrap items-center gap-2"><p className="font-extrabold">{update.status}</p><Badge variant="outline">{update.actorRole === 'system' ? 'CivicPulse' : update.actorRole.replace('_', ' ')}</Badge></div><p className="mt-1 text-sm leading-6 text-muted-foreground">{update.message}</p><time className="mt-2 block text-xs text-muted-foreground" dateTime={update.createdAt}>{formatIst(update.createdAt)}</time></div></li>)}</ol></Card>{report.photos.length > 0 && <Card className="p-5 sm:p-7"><h2 className="flex items-center gap-2 font-display text-xl font-extrabold"><Camera className="size-5 text-primary" aria-hidden="true" />Photographs</h2><div className="mt-5 grid gap-3 sm:grid-cols-2">{report.photos.map((photo, index) => <a key={photo.filename} href={apiUrl(photo.url)} target="_blank" rel="noreferrer" className="overflow-hidden rounded-2xl border border-border focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/20"><img src={apiUrl(photo.url)} alt={`Report photograph ${index + 1}`} className="aspect-[4/3] w-full object-cover" /></a>)}</div></Card>}</div>
        <aside className="space-y-5"><Card className="p-5 sm:p-6"><h2 className="font-display text-lg font-extrabold">Report summary</h2><dl className="mt-5 space-y-5 text-sm"><div><dt className="font-bold text-muted-foreground">Submitted</dt><dd className="mt-1"><time dateTime={report.createdAt}>{formatIst(report.createdAt)}</time></dd></div><div><dt className="font-bold text-muted-foreground">Priority</dt><dd className="mt-1">{report.priority}</dd></div><div><dt className="font-bold text-muted-foreground">Assigned to</dt><dd className="mt-1">{typeof report.assignedTo === 'object' ? report.assignedTo.name : 'Awaiting assignment'}</dd></div>{report.ward && <div><dt className="font-bold text-muted-foreground">Municipal area</dt><dd className="mt-1">{report.ward}</dd></div>}<div><dt className="font-bold text-muted-foreground">Location</dt><dd className="mt-2 flex gap-2 leading-6"><MapPin className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" /><span>{report.location.address}{report.location.landmark ? <>, {report.location.landmark}</> : null}<br />{report.location.city}, {report.location.state} {report.location.pincode}</span></dd></div></dl></Card>
        {municipal && <Card className="p-5 sm:p-6"><div className="flex items-center gap-2"><UserRoundCheck className="size-5 text-primary" aria-hidden="true" /><h2 className="font-display text-lg font-extrabold">Assignment & workflow</h2></div><p className="mt-2 text-sm leading-6 text-muted-foreground">Record a clear update for the citizen and municipal team.</p><form onSubmit={updateWorkflow} className="mt-5 space-y-4"><div><label htmlFor="workflow-status" className="mb-1.5 block text-sm font-bold">Status</label><select id="workflow-status" className="h-12 w-full rounded-xl border border-input bg-background px-3 text-sm font-bold" value={status} onChange={(event) => setStatus(event.target.value as ReportStatus)}>{statuses.map((item) => <option key={item}>{item}</option>)}</select></div><div><label htmlFor="workflow-assignee" className="mb-1.5 block text-sm font-bold">Assigned officer</label><select id="workflow-assignee" className="h-12 w-full rounded-xl border border-input bg-background px-3 text-sm" value={assignedTo} onChange={(event) => setAssignedTo(event.target.value)}><option value="">Not assigned</option>{assignees.map((item) => <option key={item.id} value={item.id}>{item.name}{item.ward ? ` · ${item.ward}` : ''}</option>)}</select></div><div><label htmlFor="workflow-ward" className="mb-1.5 block text-sm font-bold">Ward or zone</label><input id="workflow-ward" className="h-12 w-full rounded-xl border border-input bg-background px-3 text-sm" value={ward} onChange={(event) => setWard(event.target.value)} maxLength={80} /></div><div><label htmlFor="workflow-message" className="mb-1.5 block text-sm font-bold">Citizen-facing update</label><textarea id="workflow-message" className="min-h-28 w-full rounded-xl border border-input bg-background px-3 py-3 text-sm" value={message} onChange={(event) => setMessage(event.target.value)} minLength={8} maxLength={500} required placeholder="Explain what has changed and what happens next." /></div><Button type="submit" className="w-full" disabled={saving}>{saving ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}{saving ? 'Saving update…' : 'Save workflow update'}</Button></form></Card>}</aside></div></div>}</main></>
}
