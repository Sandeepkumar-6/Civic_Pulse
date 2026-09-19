import { useEffect, useMemo, useState } from 'react'
import { ArrowUpDown, Inbox, MapPin, Search } from 'lucide-react'
import type { IssueStatus } from '@/data/civic-data'
import { api } from '@/lib/api'
import { formatIst } from '@/lib/format'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

const filters = ['All', 'Active', 'Resolved'] as const

function StatusBadge({ status }: { status: IssueStatus }) {
  const variant = status === 'Resolved' || status === 'Closed' ? 'success' : status === 'In Progress' ? 'warning' : 'outline'
  return <Badge variant={variant}><span className="size-1.5 rounded-full bg-current" aria-hidden="true" />{status}</Badge>
}

export function IssuePreview() {
  const [recentIssues, setRecentIssues] = useState<Array<{ id: string; category: string; title: string; location: string; reported: string; status: IssueStatus }>>([])
  const [state, setState] = useState('Loading civic activity…')
  useEffect(() => { api<{ issues: typeof recentIssues }>('/api/reports/public-summary').then((data) => { setRecentIssues(data.issues); setState('') }).catch(() => setState('Civic activity is unavailable. Please reload to try again.')) }, [])
  const [filter, setFilter] = useState<(typeof filters)[number]>('All')
  const [query, setQuery] = useState('')
  const [newestFirst, setNewestFirst] = useState(true)

  const issues = useMemo(() => {
    const normalised = query.trim().toLowerCase()
    const filtered = recentIssues.filter((issue) => {
      const resolved = issue.status === 'Resolved' || issue.status === 'Closed'
      const statusMatch = filter === 'All' || (filter === 'Active' ? !resolved : resolved)
      const queryMatch = !normalised || `${issue.title} ${issue.location} ${issue.category} ${issue.id}`.toLowerCase().includes(normalised)
      return statusMatch && queryMatch
    })
    return newestFirst ? filtered : [...filtered].reverse()
  }, [filter, query, newestFirst, recentIssues])

  return (
    <section id="issues" className="section-shell" aria-labelledby="issues-title">
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div><span className="eyebrow">Neighbourhood pulse</span><h2 id="issues-title" className="section-title">See civic work moving forward</h2><p className="section-copy">Clear statuses help residents understand what has been acknowledged, assigned and resolved.</p></div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter issues by status">
          {filters.map((item) => <Button key={item} size="sm" variant={filter === item ? 'default' : 'outline'} onClick={() => setFilter(item)} aria-pressed={filter === item}>{item}</Button>)}
        </div>
      </div>

      <Card className="mt-8 overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="relative w-full sm:max-w-sm"><Search className="pointer-events-none absolute left-3.5 top-3.5 size-5 text-muted-foreground" aria-hidden="true" /><Input className="pl-11" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search area, issue or reference" aria-label="Search recent civic issues" /></div>
          <Button variant="ghost" onClick={() => setNewestFirst((value) => !value)} aria-label={`Sort ${newestFirst ? 'oldest' : 'newest'} first`}><ArrowUpDown className="size-4" aria-hidden="true" />{newestFirst ? 'Newest first' : 'Oldest first'}</Button>
        </div>

        {state ? <p className="p-8 text-muted-foreground" role="status">{state}</p> : issues.length === 0 ? (
          <div className="grid min-h-72 place-items-center p-8 text-center" role="status">
            <div><span className="mx-auto grid size-12 place-items-center rounded-2xl bg-secondary text-primary"><Inbox className="size-6" aria-hidden="true" /></span><h3 className="mt-4 font-display text-xl font-bold">No matching issues</h3><p className="mt-2 text-sm text-muted-foreground">Try another area, category or reference number.</p><Button variant="outline" className="mt-5" onClick={() => { setQuery(''); setFilter('All') }}>Clear filters</Button></div>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full border-collapse text-left text-sm">
                <caption className="sr-only">Recent civic reports</caption>
                <thead><tr className="bg-secondary/55 text-xs uppercase tracking-wider text-muted-foreground"><th scope="col" className="px-6 py-3.5 font-bold">Issue</th><th scope="col" className="px-6 py-3.5 font-bold">Location</th><th scope="col" className="px-6 py-3.5 font-bold">Reported</th><th scope="col" className="px-6 py-3.5 font-bold">Status</th></tr></thead>
                <tbody>{issues.map((issue) => <tr key={issue.id} className="border-t border-border transition hover:bg-secondary/35"><td className="px-6 py-5"><p className="font-bold text-foreground">{issue.title}</p><p className="mt-1 font-mono text-xs text-muted-foreground">{issue.id} · {issue.category}</p></td><td className="px-6 py-5 text-muted-foreground"><span className="inline-flex items-center gap-1.5"><MapPin className="size-4" aria-hidden="true" />{issue.location}</span></td><td className="whitespace-nowrap px-6 py-5 text-muted-foreground">{formatIst(issue.reported)}</td><td className="px-6 py-5"><StatusBadge status={issue.status} /></td></tr>)}</tbody>
              </table>
            </div>
            <div className="divide-y divide-border md:hidden">{issues.map((issue) => <article key={issue.id} className="p-5"><div className="flex items-start justify-between gap-3"><Badge variant="outline">{issue.category}</Badge><StatusBadge status={issue.status} /></div><h3 className="mt-4 font-display text-base font-bold">{issue.title}</h3><p className="mt-2 flex items-start gap-1.5 text-sm text-muted-foreground"><MapPin className="mt-0.5 size-4 shrink-0" aria-hidden="true" />{issue.location}</p><p className="mt-3 font-mono text-xs text-muted-foreground">{issue.id} · {formatIst(issue.reported)}</p></article>)}</div>
          </>
        )}
      </Card>
      <p className="mt-3 text-xs text-muted-foreground">Recent municipal activity. Reporter contact details and exact addresses are kept private.</p>
    </section>
  )
}
