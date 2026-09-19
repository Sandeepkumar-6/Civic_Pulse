import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowRight, Bell, CheckCircle2, Clock3, FileText, MapPin, Plus, RefreshCw, Settings2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'motion/react'
import { Header } from '@/components/layout/header'
import { ReportStatusBadge } from '@/components/reports/report-status'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ApiError, api } from '@/lib/api'
import { formatIst } from '@/lib/format'
import { useAuth } from '@/context/auth-context'
import type { CitizenDashboard, CivicReport } from '@/types'

type HistoryFilter = 'All' | 'Active' | 'Resolved'

function DashboardLoading() {
  return <div className="mt-8 space-y-5" aria-label="Loading citizen dashboard"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[0, 1, 2, 3].map((item) => <Skeleton key={item} className="h-28 rounded-3xl" />)}</div><div className="grid gap-5 lg:grid-cols-[1.4fr_.6fr]"><Skeleton className="h-96 rounded-3xl" /><Skeleton className="h-96 rounded-3xl" /></div></div>
}

function ReportCard({ report, compact = false }: { report: CivicReport; compact?: boolean }) {
  return <Card className={`flex flex-col transition hover:border-primary/25 hover:shadow-card ${compact ? 'p-4' : 'p-5'}`}><div className="flex flex-wrap items-center justify-between gap-3"><p className="font-mono text-xs font-bold text-muted-foreground">{report.reference}</p><ReportStatusBadge status={report.status} /></div><h3 className={`${compact ? 'mt-3' : 'mt-4'} font-display text-lg font-extrabold`}>{report.category}</h3><p className={`mt-2 text-sm leading-6 text-muted-foreground ${compact ? 'line-clamp-1' : 'line-clamp-2'}`}>{report.description}</p><p className={`${compact ? 'mt-3' : 'mt-4'} flex items-start gap-2 text-sm`}><MapPin className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" /><span>{report.location.address}, {report.location.city}</span></p><div className={`${compact ? 'mt-3 pt-3' : 'mt-5 pt-4'} flex items-center justify-between gap-3 border-t border-border`}><time className="text-xs text-muted-foreground" dateTime={report.createdAt}>{formatIst(report.createdAt)}</time><Button asChild variant="link"><Link to={`/reports/${report.id}`}>Track report<ArrowRight className="size-4" aria-hidden="true" /></Link></Button></div></Card>
}

export function MyReportsPage() {
  const { user } = useAuth()
  const reduceMotion = useReducedMotion()
  const [dashboard, setDashboard] = useState<CitizenDashboard | null>(null)
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>('All')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadDashboard = useCallback(async () => {
    setLoading(true); setError('')
    try { setDashboard(await api<CitizenDashboard>('/api/dashboard/citizen')) }
    catch (caught) { setError((caught as ApiError).message || 'Your dashboard could not be loaded.') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { void loadDashboard() }, [loadDashboard])

  const history = useMemo(() => dashboard?.reports.filter((report) => {
    if (historyFilter === 'Active') return !['Resolved', 'Closed'].includes(report.status)
    if (historyFilter === 'Resolved') return ['Resolved', 'Closed'].includes(report.status)
    return true
  }) ?? [], [dashboard, historyFilter])

  return <><Header /><main id="main-content" className="container py-9 sm:py-12 lg:py-14"><div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-extrabold text-primary">Citizen dashboard</p><h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">Your civic activity</h1><p className="mt-2 max-w-2xl text-muted-foreground">Track active reports, review resolved work and see updates from municipal teams.</p></div><div className="flex flex-wrap gap-2"><Button asChild variant="outline"><Link to="/profile"><Settings2 className="size-4" aria-hidden="true" />Profile & settings</Link></Button><Button asChild><Link to="/report"><Plus className="size-4" aria-hidden="true" />Report an issue</Link></Button></div></div>
    {loading ? <DashboardLoading /> : error || !dashboard ? <div className="mt-8 max-w-xl"><Alert title="Dashboard unavailable" variant="error">{error || 'Your civic activity could not be loaded.'}</Alert><Button className="mt-4" variant="outline" onClick={() => void loadDashboard()}><RefreshCw className="size-4" aria-hidden="true" />Try again</Button></div> : <motion.div initial={reduceMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-8 space-y-8">
      <section aria-labelledby="summary-title"><h2 id="summary-title" className="sr-only">Report summary</h2><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[
        { label: 'All reports', value: dashboard.summary.total, icon: FileText },
        { label: 'Active', value: dashboard.summary.active, icon: Clock3 },
        { label: 'Resolved', value: dashboard.summary.resolved, icon: CheckCircle2 },
        { label: 'Awaiting action', value: dashboard.summary.awaitingAction, icon: Bell },
      ].map(({ label, value, icon: Icon }) => <Card key={label} className="p-5"><div className="flex items-center justify-between"><span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><Icon className="size-5" aria-hidden="true" /></span><span className="font-display text-3xl font-extrabold">{value}</span></div><p className="mt-4 text-sm font-bold text-muted-foreground">{label}</p></Card>)}</div></section>
      <div className="grid gap-6 lg:grid-cols-[1.45fr_.55fr]">
        <section aria-labelledby="recent-title"><h2 id="recent-title" className="font-display text-2xl font-extrabold">Recent reports</h2><p className="mt-1 text-sm text-muted-foreground">Your latest civic reports and their current status.</p>{dashboard.recentReports.length ? <div className="mt-4 grid gap-4 md:grid-cols-2">{dashboard.recentReports.map((report) => <ReportCard key={report.id} report={report} compact={user?.settings?.compactDashboard} />)}</div> : <Card className="mt-4 p-8 text-center"><FileText className="mx-auto size-7 text-primary" aria-hidden="true" /><h3 className="mt-3 font-display text-xl font-extrabold">No reports yet</h3><p className="mt-2 text-sm text-muted-foreground">Create a report when you notice an issue in a public space.</p></Card>}</section>
        <section aria-labelledby="updates-title"><Card className="h-full p-5"><div className="flex items-center gap-2"><Bell className="size-5 text-primary" aria-hidden="true" /><h2 id="updates-title" className="font-display text-xl font-extrabold">Recent updates</h2></div>{dashboard.notifications.length ? <ol className="mt-5 space-y-5">{dashboard.notifications.slice(0, 5).map((item) => <li key={item.id} className="border-l-2 border-primary/25 pl-4"><div className="flex flex-wrap items-center gap-2"><Badge variant="outline">{item.status}</Badge><span className="font-mono text-xs font-bold">{item.reference}</span></div><p className="mt-2 text-sm leading-6 text-muted-foreground">{item.message}</p><time className="mt-1 block text-xs text-muted-foreground" dateTime={item.createdAt}>{formatIst(item.createdAt)}</time></li>)}</ol> : <p className="mt-4 text-sm text-muted-foreground">Status updates will appear here after municipal review.</p>}</Card></section>
      </div>
      <section aria-labelledby="nearby-title"><div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><h2 id="nearby-title" className="font-display text-2xl font-extrabold">Nearby issues</h2><p className="mt-1 text-sm text-muted-foreground">Open reports within 5 km of your most recent mapped report.</p></div><Button asChild variant="outline"><Link to="/map">Explore civic map</Link></Button></div>{dashboard.nearby.length ? <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{dashboard.nearby.map((report) => <Card key={report.id} className="p-5"><div className="flex items-start justify-between gap-3"><Badge variant="outline">{report.category}</Badge><ReportStatusBadge status={report.status} /></div><p className="mt-4 line-clamp-2 text-sm leading-6 text-muted-foreground">{report.description}</p><p className="mt-3 text-sm font-bold">{report.location.address}, {report.location.city}</p>{report.distanceMetres !== undefined && <p className="mt-2 text-xs font-bold text-primary">{report.distanceMetres < 1000 ? `${Math.round(report.distanceMetres)} m away` : `${(report.distanceMetres / 1000).toFixed(1)} km away`}</p>}<p className="mt-3 font-mono text-xs font-bold">{report.reference}</p></Card>)}</div> : <Card className="mt-4 p-6"><p className="font-bold">{user?.settings?.nearbyDigest === false ? 'Nearby issues are hidden' : 'No other active issues nearby'}</p><p className="mt-1 text-sm text-muted-foreground">{user?.settings?.nearbyDigest === false ? 'Enable nearby issues in Profile & settings to include them here.' : 'The map remains available for exploring other areas.'}</p></Card>}</section>
      <section aria-labelledby="history-title"><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><h2 id="history-title" className="font-display text-2xl font-extrabold">Report history</h2><p className="mt-1 text-sm text-muted-foreground">A complete record of reports submitted from your account.</p></div><div className="flex rounded-xl border border-border p-1" role="group" aria-label="Filter report history">{(['All', 'Active', 'Resolved'] as HistoryFilter[]).map((item) => <Button key={item} size="sm" variant={historyFilter === item ? 'default' : 'ghost'} onClick={() => setHistoryFilter(item)} aria-pressed={historyFilter === item}>{item}</Button>)}</div></div>{history.length ? <div className="mt-4 grid gap-4 md:grid-cols-2">{history.map((report) => <ReportCard key={report.id} report={report} compact={user?.settings?.compactDashboard} />)}</div> : <Card className="mt-4 p-8 text-center"><h3 className="font-display text-xl font-extrabold">No {historyFilter.toLowerCase()} reports</h3><p className="mt-2 text-sm text-muted-foreground">Choose another history filter to see your reports.</p></Card>}</section>
    </motion.div>}
  </main></>
}
