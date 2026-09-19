import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { AlertTriangle, ArrowRight, BarChart3, CheckCircle2, ClipboardList, Map, RefreshCw, Search, SlidersHorizontal } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Header } from '@/components/layout/header'
import { ReportStatusBadge } from '@/components/reports/report-status'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { ApiError, api } from '@/lib/api'
import { formatIst } from '@/lib/format'
import type { MunicipalDashboard } from '@/types'

const emptyFilters = { search: '', category: '', status: '', ward: '' }

export function AdminDashboardPage() {
  const [dashboard, setDashboard] = useState<MunicipalDashboard | null>(null)
  const [draft, setDraft] = useState(emptyFilters)
  const [filters, setFilters] = useState(emptyFilters)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadDashboard = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const params = new URLSearchParams(Object.entries(filters).filter(([, value]) => value))
      setDashboard(await api<MunicipalDashboard>(`/api/dashboard/municipal?${params}`))
    } catch (caught) { setError((caught as ApiError).message || 'Municipal operations data could not be loaded.') }
    finally { setLoading(false) }
  }, [filters])

  useEffect(() => { void loadDashboard() }, [loadDashboard])
  function applyFilters(event: FormEvent) { event.preventDefault(); setFilters(draft) }
  function clearFilters() { setDraft(emptyFilters); setFilters(emptyFilters) }

  const maxCategory = Math.max(...(dashboard?.analytics.byCategory.map((item) => item.count) ?? [1]), 1)
  return <><Header /><main id="main-content" className="container py-9 sm:py-12"><div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><div className="flex flex-wrap items-center gap-2"><Badge>Municipal operations</Badge>{dashboard && <Badge variant="outline">{dashboard.scope}</Badge>}</div><h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">Civic service dashboard</h1><p className="mt-2 max-w-2xl text-muted-foreground">Review incoming reports, coordinate ward teams and monitor resolution performance from live application data.</p></div><div className="flex gap-2"><Button asChild variant="outline"><Link to="/profile">Profile & settings</Link></Button><Button asChild><Link to="/map"><Map className="size-4" aria-hidden="true" />Open map</Link></Button></div></div>
    {error && <div className="mt-6"><Alert title="Operations dashboard unavailable" variant="error">{error}</Alert><Button className="mt-3" variant="outline" onClick={() => void loadDashboard()}><RefreshCw className="size-4" aria-hidden="true" />Try again</Button></div>}
    {loading && !dashboard ? <div className="mt-8 space-y-5"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">{[0, 1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-28 rounded-3xl" />)}</div><Skeleton className="h-96 rounded-3xl" /></div> : dashboard && <div className="mt-8 space-y-7">
      <section aria-labelledby="analytics-title"><div className="flex items-center gap-2"><BarChart3 className="size-5 text-primary" aria-hidden="true" /><h2 id="analytics-title" className="font-display text-xl font-extrabold">Service overview</h2></div><div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">{[
        { label: 'All reports', value: dashboard.analytics.total, icon: ClipboardList },
        { label: 'Active', value: dashboard.analytics.active, icon: RefreshCw },
        { label: 'Resolved', value: dashboard.analytics.resolved, icon: CheckCircle2 },
        { label: 'Resolution rate', value: `${dashboard.analytics.resolutionRate}%`, icon: BarChart3 },
        { label: 'Urgent active', value: dashboard.analytics.urgent, icon: AlertTriangle },
      ].map(({ label, value, icon: Icon }) => <Card key={label} className="p-5"><div className="flex items-center justify-between"><Icon className="size-5 text-primary" aria-hidden="true" /><span className="font-display text-3xl font-extrabold">{value}</span></div><p className="mt-4 text-sm font-bold text-muted-foreground">{label}</p></Card>)}</div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2"><Card className="p-5"><h3 className="font-display text-lg font-extrabold">Reports by category</h3><div className="mt-5 space-y-4">{dashboard.analytics.byCategory.map((item) => <div key={item.label}><div className="flex justify-between gap-3 text-sm"><span className="font-bold">{item.label}</span><span>{item.count}</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.max((item.count / maxCategory) * 100, 4)}%` }} /></div></div>)}</div></Card><Card className="p-5"><h3 className="font-display text-lg font-extrabold">Status distribution</h3><div className="mt-5 flex flex-wrap gap-3">{dashboard.analytics.byStatus.map((item) => <div key={item.label} className="min-w-32 flex-1 rounded-2xl border border-border p-4"><ReportStatusBadge status={item.label as never} /><p className="mt-3 font-display text-3xl font-extrabold">{item.count}</p></div>)}</div></Card></div></section>
      <section aria-labelledby="management-title" className="min-w-0"><Card className="p-4 sm:p-5"><div className="flex items-center gap-2"><SlidersHorizontal className="size-5 text-primary" aria-hidden="true" /><h2 id="management-title" className="font-display text-xl font-extrabold">Report management</h2></div><form onSubmit={applyFilters} className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-[1.4fr_1fr_1fr_1fr_auto]"><div><label htmlFor="admin-search" className="mb-1.5 block text-sm font-bold">Search</label><div className="relative"><Search className="pointer-events-none absolute left-3 top-3.5 size-4 text-muted-foreground" aria-hidden="true" /><Input id="admin-search" className="pl-10" placeholder="Reference, issue or location" value={draft.search} onChange={(event) => setDraft((value) => ({ ...value, search: event.target.value }))} /></div></div><div><label htmlFor="admin-category" className="mb-1.5 block text-sm font-bold">Category</label><select id="admin-category" className="h-12 w-full rounded-xl border border-input bg-background px-3 text-sm font-bold" value={draft.category} onChange={(event) => setDraft((value) => ({ ...value, category: event.target.value }))}><option value="">All categories</option>{dashboard.filters.categories.map((item) => <option key={item}>{item}</option>)}</select></div><div><label htmlFor="admin-status" className="mb-1.5 block text-sm font-bold">Status</label><select id="admin-status" className="h-12 w-full rounded-xl border border-input bg-background px-3 text-sm font-bold" value={draft.status} onChange={(event) => setDraft((value) => ({ ...value, status: event.target.value }))}><option value="">All statuses</option>{dashboard.filters.statuses.map((item) => <option key={item}>{item}</option>)}</select></div><div><label htmlFor="admin-ward" className="mb-1.5 block text-sm font-bold">Ward</label><select id="admin-ward" className="h-12 w-full rounded-xl border border-input bg-background px-3 text-sm font-bold" value={draft.ward} onChange={(event) => setDraft((value) => ({ ...value, ward: event.target.value }))}><option value="">All wards</option>{dashboard.filters.wards.map((item) => <option key={item}>{item}</option>)}</select></div><Button className="self-end" type="submit" disabled={loading}>{loading ? 'Updating…' : 'Apply filters'}</Button></form>{Object.values(filters).some(Boolean) && <Button className="mt-3" size="sm" variant="ghost" onClick={clearFilters}>Clear all filters</Button>}</Card>
      <div className="mt-4 w-full min-w-0 max-w-full overflow-hidden rounded-3xl border border-border bg-card"><div className="flex items-center justify-between border-b border-border px-5 py-4"><p className="font-bold">{dashboard.reports.length} matching report{dashboard.reports.length === 1 ? '' : 's'}</p><span className="text-xs text-muted-foreground">Updated in IST</span></div>{dashboard.reports.length === 0 ? <div className="p-10 text-center"><Search className="mx-auto size-7 text-primary" aria-hidden="true" /><h3 className="mt-3 font-display text-xl font-extrabold">No matching reports</h3><p className="mt-2 text-sm text-muted-foreground">Clear a filter or search for a different reference or location.</p></div> : <div className="w-full max-w-full overflow-x-auto"><table className="w-full min-w-[860px] text-left text-sm"><thead className="bg-secondary/65 text-xs uppercase tracking-wider text-muted-foreground"><tr><th className="px-5 py-3">Report</th><th className="px-5 py-3">Citizen</th><th className="px-5 py-3">Ward</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Assigned to</th><th className="px-5 py-3">Updated</th><th className="px-5 py-3" aria-label="Actions" /></tr></thead><tbody className="divide-y divide-border">{dashboard.reports.map((report) => <tr key={report.id} className="align-top transition hover:bg-secondary/35"><td className="px-5 py-4"><p className="font-mono text-xs font-bold text-primary">{report.reference}</p><p className="mt-1 font-bold">{report.category}</p><p className="mt-1 max-w-xs truncate text-muted-foreground">{report.location.address}, {report.location.city}</p></td><td className="px-5 py-4">{typeof report.citizen === 'string' ? 'Citizen' : report.citizen.name}</td><td className="px-5 py-4">{report.ward || 'Unassigned'}</td><td className="px-5 py-4"><ReportStatusBadge status={report.status} /></td><td className="px-5 py-4">{typeof report.assignedTo === 'object' ? report.assignedTo.name : 'Not assigned'}</td><td className="px-5 py-4 text-muted-foreground"><time dateTime={report.updatedAt}>{formatIst(report.updatedAt)}</time></td><td className="px-5 py-4"><Button asChild variant="link"><Link to={`/reports/${report.id}`}>Manage<ArrowRight className="size-4" aria-hidden="true" /></Link></Button></td></tr>)}</tbody></table></div>}</div></section>
    </div>}
  </main></>
}
