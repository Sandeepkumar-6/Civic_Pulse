import { useEffect, useState, type FormEvent } from 'react'
import { ArrowLeft, BellRing, CheckCircle2, Loader2, MapPin, Settings2, UserRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Header } from '@/components/layout/header'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/context/auth-context'
import { ApiError } from '@/lib/api'

const defaultSettings = { emailStatusUpdates: true, nearbyDigest: true, compactDashboard: false }

export function ProfilePage() {
  const { user, updateProfile } = useAuth()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState('')
  const [settings, setSettings] = useState(defaultSettings)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!user) return
    setName(user.name); setPhone(user.phone ?? ''); setCity(user.city ?? ''); setSettings(user.settings ?? defaultSettings)
  }, [user])

  async function submit(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError(''); setSaved(false)
    try { await updateProfile({ name, phone, city, settings }); setSaved(true) }
    catch (caught) { setError((caught as ApiError).message || 'Your profile could not be saved.') }
    finally { setSaving(false) }
  }

  const dashboardHref = user?.role === 'citizen' ? '/my-reports' : '/admin'
  return <><Header /><main id="main-content" className="container py-9 sm:py-12"><div className="mx-auto max-w-4xl"><Button asChild variant="link"><Link to={dashboardHref}><ArrowLeft className="size-4" aria-hidden="true" />Back to dashboard</Link></Button><div className="mt-4"><p className="text-sm font-extrabold text-primary">Account</p><h1 className="mt-2 font-display text-3xl font-extrabold sm:text-4xl">Profile & settings</h1><p className="mt-2 text-muted-foreground">Keep your contact and city details current and choose which civic updates you receive.</p></div>
    {saved && <Alert className="mt-6" title="Settings saved" variant="success"><span className="inline-flex items-center gap-2"><CheckCircle2 className="size-4" aria-hidden="true" />Your profile and notification preferences are up to date.</span></Alert>}{error && <Alert className="mt-6" title="Could not save settings" variant="error">{error}</Alert>}
    <form onSubmit={submit} className="mt-7 grid gap-5 lg:grid-cols-[1fr_.85fr]"><Card className="p-5 sm:p-7"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><UserRound className="size-5" aria-hidden="true" /></span><div><h2 className="font-display text-xl font-extrabold">Personal details</h2><p className="text-sm text-muted-foreground">Used for your account and civic correspondence.</p></div></div><div className="mt-6 space-y-5"><div><label htmlFor="profile-name" className="mb-1.5 block text-sm font-bold">Full name</label><Input id="profile-name" value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={80} required /></div><div><label htmlFor="profile-email" className="mb-1.5 block text-sm font-bold">Email address</label><Input id="profile-email" value={user?.email ?? ''} disabled /><p className="mt-1.5 text-xs text-muted-foreground">Email changes require account verification and are not available here.</p></div><div><label htmlFor="profile-phone" className="mb-1.5 block text-sm font-bold">Mobile number</label><Input id="profile-phone" value={phone} onChange={(event) => setPhone(event.target.value)} pattern="\+91[6-9][0-9]{9}" required /><p className="mt-1.5 text-xs text-muted-foreground">Use +91 followed by your 10-digit mobile number.</p></div><div><label htmlFor="profile-city" className="mb-1.5 block text-sm font-bold">City</label><Input id="profile-city" value={city} onChange={(event) => setCity(event.target.value)} minLength={2} maxLength={80} required /></div></div></Card>
      <Card className="p-5 sm:p-7"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><Settings2 className="size-5" aria-hidden="true" /></span><div><h2 className="font-display text-xl font-extrabold">Preferences</h2><p className="text-sm text-muted-foreground">Control useful updates without unnecessary messages.</p></div></div><fieldset className="mt-6 space-y-3"><legend className="sr-only">Notification and dashboard preferences</legend>{[
        { key: 'emailStatusUpdates' as const, title: 'Status update notifications', copy: 'Show municipal status changes in your CivicPulse dashboard.', icon: BellRing },
        { key: 'nearbyDigest' as const, title: 'Nearby issues', copy: 'Show open civic reports near your most recent mapped report.', icon: MapPin },
        { key: 'compactDashboard' as const, title: 'Compact dashboard', copy: 'Show denser report cards in your citizen dashboard.', icon: Settings2 },
      ].map(({ key, title, copy, icon: Icon }) => <label key={key} className="flex cursor-pointer gap-3 rounded-2xl border border-border p-4 transition hover:border-primary/30"><input type="checkbox" className="mt-1 size-5 accent-primary" checked={settings[key]} onChange={(event) => setSettings((value) => ({ ...value, [key]: event.target.checked }))} /><Icon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" /><span><span className="block font-bold">{title}</span><span className="mt-1 block text-sm leading-6 text-muted-foreground">{copy}</span></span></label>)}</fieldset><Button type="submit" className="mt-6 w-full" disabled={saving}>{saving ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}{saving ? 'Saving…' : 'Save profile and settings'}</Button></Card></form></div></main></>
}
