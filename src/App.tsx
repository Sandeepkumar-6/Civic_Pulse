import { ArrowRight, Check, ChevronRight, MapPin, ShieldCheck } from 'lucide-react'
import { api } from '@/lib/api'
import { lazy, Suspense, useEffect, useState } from 'react'
import { AnimatedGroup } from '@/components/motion/animated-group'
import { Header } from '@/components/layout/header'
import { Logo } from '@/components/brand/logo'
import { IssuePreview } from '@/components/issues/issue-preview'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { features, issueCategories, workflow } from '@/data/civic-data'
import { BrowserRouter, Link, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/context/auth-context'
import { ProtectedRoute } from '@/components/auth/protected-route'
const LoginPage = lazy(() => import('@/pages/auth-pages').then((module) => ({ default: module.LoginPage })))
const RegisterPage = lazy(() => import('@/pages/auth-pages').then((module) => ({ default: module.RegisterPage })))
const CitizenReportPage = lazy(() => import('@/pages/report-page').then((module) => ({ default: module.CitizenReportPage })))
const MyReportsPage = lazy(() => import('@/pages/my-reports-page').then((module) => ({ default: module.MyReportsPage })))
const ReportDetailPage = lazy(() => import('@/pages/report-detail-page').then((module) => ({ default: module.ReportDetailPage })))
const CivicMapPage = lazy(() => import('@/pages/map-page').then((module) => ({ default: module.CivicMapPage })))
const ProfilePage = lazy(() => import('@/pages/profile-page').then((module) => ({ default: module.ProfilePage })))
const AdminDashboardPage = lazy(() => import('@/pages/admin-dashboard-page').then((module) => ({ default: module.AdminDashboardPage })))

function HeroVisual() {
  return <Card className="mx-auto w-full max-w-xl overflow-hidden">
    <div className="border-b border-border p-6"><p className="text-sm font-bold text-primary">A clear path to municipal action</p><h2 className="mt-2 font-display text-2xl font-extrabold">From your street to the right team</h2></div>
    <ol className="divide-y divide-border">{[
      ['01', 'Describe the issue', 'Choose a civic category and add a clear description or photograph.'],
      ['02', 'Confirm the location', 'Pin the spot and add a nearby landmark to help the field team find it.'],
      ['03', 'Follow the progress', 'Keep your reference number and check municipal updates in your account.'],
    ].map(([number, title, copy]) => <li key={number} className="flex gap-4 p-6"><span className="font-mono text-sm font-bold text-primary">{number}</span><div><h3 className="font-bold">{title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{copy}</p></div></li>)}</ol>
    <p className="border-t border-border bg-secondary px-6 py-4 text-sm">For emergencies, call 112. CivicPulse handles non-emergency municipal issues.</p>
  </Card>
}

function Hero() {
  const [civicStats, setStats] = useState<Array<{ value: number; label: string }>>([])
  const [statsState, setStatsState] = useState('Loading civic activity…')
  useEffect(() => { api<{ stats: typeof civicStats }>('/api/reports/public-summary').then((data) => { setStats(data.stats); setStatsState('') }).catch(() => setStatsState('Civic activity is unavailable. Please reload to try again.')) }, [])
  return (
    <section id="top" className="relative overflow-hidden border-b border-border/60">
      <div className="container grid items-center gap-12 py-16 lg:grid-cols-[1.03fr_.97fr] lg:py-20">
        <AnimatedGroup className="max-w-3xl">
          <Badge variant="outline" className="mb-6 border-primary/20 bg-card/70 px-3 py-2 text-primary"><ShieldCheck className="size-4" aria-hidden="true" />Built for accountable city services</Badge>
          <h1 className="font-display text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">Your city listens<br /><span className="text-primary">when you speak up.</span></h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground sm:text-xl">Report neighbourhood issues, follow every update, and help municipal teams build cleaner, safer, better-connected Indian cities.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row"><Button asChild size="lg" variant="accent"><Link to="/report">Report an issue <ArrowRight className="size-5" aria-hidden="true" /></Link></Button><Button asChild size="lg" variant="outline"><a href="#issues">Explore civic activity</a></Button></div>
          <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-muted-foreground"><span className="inline-flex items-center gap-2"><Check className="size-4 text-success" aria-hidden="true" />Free for citizens</span><span className="inline-flex items-center gap-2"><Check className="size-4 text-success" aria-hidden="true" />Mobile friendly</span><span className="inline-flex items-center gap-2"><Check className="size-4 text-success" aria-hidden="true" />Trackable updates</span></div>
        </AnimatedGroup>
        <AnimatedGroup stagger={0.08}><HeroVisual /></AnimatedGroup>
      </div>
      <div className="container pb-10">{statsState ? <p role="status" className="text-sm text-muted-foreground">{statsState}</p> : <dl className="grid gap-4 rounded-2xl border border-border bg-card p-5 sm:grid-cols-3 sm:p-6">{civicStats.map((stat) => <div key={stat.label} className="border-b border-border pb-4 last:border-0 last:pb-0 sm:border-b-0 sm:border-r sm:pb-0 sm:last:border-0"><dt className="text-sm text-muted-foreground">{stat.label}</dt><dd className="mt-1 font-display text-2xl font-extrabold tracking-tight">{stat.value}</dd></div>)}</dl>}</div>
    </section>
  )
}

function Categories() {
  return (
    <section className="section-shell" aria-labelledby="categories-title"><div className="text-center"><span className="eyebrow">Common services</span><h2 id="categories-title" className="section-title">What can you report?</h2><p className="section-copy mx-auto">Choose the service that best fits what you see. CivicPulse keeps the first step simple and routes the details responsibly.</p></div><AnimatedGroup className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{issueCategories.map(({ name, description, icon: Icon, tone }) => <Card key={name} className="group p-5 transition duration-200 hover:border-primary/25 hover:shadow-soft sm:p-6"><div className={`grid size-12 place-items-center rounded-2xl ${tone}`}><Icon className="size-6" aria-hidden="true" /></div><h3 className="mt-5 font-display text-lg font-extrabold">{name}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p><Button asChild variant="link" className="mt-4"><Link to="/report">Start report <ChevronRight className="size-4" aria-hidden="true" /></Link></Button></Card>)}</AnimatedGroup></section>
  )
}

function Features() {
  return (
    <section id="features" className="border-y border-border bg-primary text-primary-foreground"><div className="section-shell"><div className="grid gap-12 lg:grid-cols-[.8fr_1.2fr] lg:items-start"><div className="lg:sticky lg:top-28"><span className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.13em]">Designed for clarity</span><h2 className="mt-4 font-display text-4xl font-extrabold tracking-[-0.04em] sm:text-5xl">Civic participation without the guesswork.</h2><p className="mt-5 max-w-xl leading-7 text-primary-foreground/90">The experience uses plain Indian English, predictable steps and transparent statuses—comfortable on a phone, clear on any connection.</p></div><AnimatedGroup className="grid gap-4">{features.map(({ title, description, icon: Icon }, index) => <div key={title} className="flex gap-4 rounded-3xl border border-white/15 bg-white/[0.08] p-5 sm:p-6"><span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-accent text-accent-foreground"><Icon className="size-6" aria-hidden="true" /></span><div><p className="text-xs font-bold uppercase tracking-wider text-primary-foreground/85">0{index + 1}</p><h3 className="mt-1 font-display text-xl font-extrabold">{title}</h3><p className="mt-2 leading-6 text-primary-foreground/90">{description}</p></div></div>)}</AnimatedGroup></div></div></section>
  )
}

function Workflow() {
  return (
    <section id="how-it-works" className="section-shell" aria-labelledby="workflow-title"><div className="max-w-2xl"><span className="eyebrow">Citizen workflow</span><h2 id="workflow-title" className="section-title">From street-level concern to visible action</h2><p className="section-copy">A short, understandable path that keeps you informed without asking for more data than necessary.</p></div><AnimatedGroup className="relative mt-10 grid gap-5 lg:grid-cols-3">{workflow.map(({ step, title, description, icon: Icon }) => <Card key={step} className="relative p-6"><div className="flex items-center justify-between"><span className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary"><Icon className="size-6" aria-hidden="true" /></span><span className="font-mono text-sm font-bold text-muted-foreground">{step}</span></div><h3 className="mt-7 font-display text-xl font-extrabold">{title}</h3><p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p></Card>)}</AnimatedGroup></section>
  )
}

function ClosingCta() {
  return <section className="container pb-16 sm:pb-20 lg:pb-24"><div className="relative overflow-hidden rounded-[2rem] bg-accent px-6 py-12 text-accent-foreground sm:px-10 lg:px-16 lg:py-16"><div className="absolute inset-y-0 right-0 hidden w-1/3 dot-grid opacity-40 lg:block" /><div className="relative max-w-2xl"><span className="inline-flex items-center gap-2 text-sm font-extrabold"><MapPin className="size-4" aria-hidden="true" />One report can improve an entire street.</span><h2 className="mt-4 font-display text-4xl font-extrabold tracking-[-0.045em] sm:text-5xl">Notice it. Report it. Follow it through.</h2><p className="mt-4 max-w-xl leading-7 text-accent-foreground">Give your local civic team the clear information they need to act.</p><Button asChild size="lg" className="mt-7"><Link to="/report">Report an issue <ArrowRight className="size-5" aria-hidden="true" /></Link></Button></div></div></section>
}

function Footer() {
  return <footer className="bg-[#073b36] text-white"><div className="container grid gap-10 py-12 md:grid-cols-[1.3fr_.7fr_.7fr]"><div><Logo inverse /><p className="mt-4 max-w-sm text-sm leading-6 text-white/65">A citizen-first civic platform for clearer reporting, accountable progress and stronger neighbourhoods.</p></div><div><h2 className="text-sm font-extrabold">Explore</h2><ul className="mt-3 space-y-2 text-sm text-white/65"><li><a className="hover:text-white" href="#issues">Civic activity</a></li><li><a className="hover:text-white" href="#how-it-works">How it works</a></li><li><a className="hover:text-white" href="#features">Why CivicPulse</a></li></ul></div><div><h2 className="text-sm font-extrabold">Citizen support</h2><ul className="mt-3 space-y-2 text-sm text-white/65"><li>Emergency services: 112</li><li>Available in Indian English</li><li>All times shown in IST</li></ul></div></div><div className="border-t border-white/10"><div className="container flex flex-col gap-2 py-5 text-xs text-white/75 sm:flex-row sm:items-center sm:justify-between"><p>© 2026 CivicPulse. Built for better cities.</p><p>Privacy-minded · Accessible · India-first</p></div></div></footer>
}

function LandingPage() {
  return <><Header /><main id="main-content" tabIndex={-1}><Hero /><Categories /><IssuePreview /><Features /><Workflow /><ClosingCta /></main><Footer /></>
}

export default function App() {
  return <BrowserRouter><AuthProvider><Suspense fallback={<main className="container py-24" role="status"><div className="h-8 w-56 animate-pulse rounded-xl bg-muted" /><div className="mt-5 h-64 animate-pulse rounded-3xl bg-muted" /></main>}><Routes><Route path="/" element={<LandingPage />} /><Route path="/login" element={<LoginPage />} /><Route path="/register" element={<RegisterPage />} /><Route element={<ProtectedRoute roles={['citizen']} />}><Route path="/report" element={<CitizenReportPage />} /><Route path="/my-reports" element={<MyReportsPage />} /></Route><Route element={<ProtectedRoute roles={['ward_officer', 'admin']} />}><Route path="/admin" element={<AdminDashboardPage />} /></Route><Route element={<ProtectedRoute roles={['citizen', 'ward_officer', 'admin']} />}><Route path="/map" element={<CivicMapPage />} /><Route path="/profile" element={<ProfilePage />} /><Route path="/reports/:id" element={<ReportDetailPage />} /></Route><Route path="*" element={<Navigate to="/" replace />} /></Routes></Suspense></AuthProvider></BrowserRouter>
}
