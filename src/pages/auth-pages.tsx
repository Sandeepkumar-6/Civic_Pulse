import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Eye, EyeOff, Loader2, LockKeyhole, ShieldCheck } from 'lucide-react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Header } from '@/components/layout/header'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/context/auth-context'
import { ApiError } from '@/lib/api'

type FormErrors = Record<string, string>

function authenticatedDestination(role: 'citizen' | 'ward_officer' | 'admin', isRegister: boolean, requested?: string) {
  const citizenOnly = requested === '/report' || requested === '/my-reports'
  const municipalOnly = requested === '/admin'
  if (requested && !(citizenOnly && role !== 'citizen') && !(municipalOnly && role === 'citizen')) return requested
  return role === 'citizen' ? (isRegister ? '/report' : '/my-reports') : '/admin'
}

function PasswordInput({ id, name = 'password', autoComplete, invalid, describedBy }: { id: string; name?: string; autoComplete: string; invalid?: boolean; describedBy?: string }) {
  const [visible, setVisible] = useState(false)
  return <div className="relative"><Input id={id} name={name} type={visible ? 'text' : 'password'} autoComplete={autoComplete} className="pr-12" required aria-invalid={invalid} aria-describedby={describedBy} /><button type="button" onClick={() => setVisible((value) => !value)} className="absolute right-1 top-0 grid size-11 place-items-center rounded-xl text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/20" aria-label={visible ? 'Hide password' : 'Show password'}>{visible ? <EyeOff className="size-5" aria-hidden="true" /> : <Eye className="size-5" aria-hidden="true" />}</button></div>
}

function AuthShell({ mode }: { mode: 'login' | 'register' }) {
  const { user, ready, login, register } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [errors, setErrors] = useState<FormErrors>({})
  const errorRef = useRef<HTMLDivElement>(null)
  const isRegister = mode === 'register'

  useEffect(() => { if (error) errorRef.current?.focus() }, [error])
  if (ready && user) return <Navigate to={authenticatedDestination(user.role, isRegister, location.state?.from)} replace />

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setErrors({})
    const data = new FormData(event.currentTarget)
    const email = String(data.get('email') ?? '').trim()
    const password = String(data.get('password') ?? '')
    const clientErrors: FormErrors = {}
    if (!/^\S+@\S+\.\S+$/.test(email)) clientErrors.email = 'Enter a valid email address.'
    if (!password) clientErrors.password = 'Enter your password.'
    if (isRegister) {
      const name = String(data.get('name') ?? '').trim()
      const phone = String(data.get('phone') ?? '').trim()
      if (name.length < 2) clientErrors.name = 'Enter your full name.'
      if (!/^\+91[6-9]\d{9}$/.test(phone)) clientErrors.phone = 'Use +91 followed by your 10-digit mobile number.'
      if (password.length < 8 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) clientErrors.password = 'Use 8+ characters with uppercase, lowercase and a number.'
    }
    if (Object.keys(clientErrors).length) {
      setErrors(clientErrors)
      setError('Please correct the highlighted information.')
      return
    }
    setLoading(true)
    try {
      const authenticatedUser = isRegister
        ? await register({ name: String(data.get('name')), email, phone: String(data.get('phone')), password })
        : await login({ email, password })
      navigate(authenticatedDestination(authenticatedUser.role, isRegister, location.state?.from), { replace: true })
    } catch (caught) {
      const apiError = caught as ApiError
      setError(apiError.message)
      setErrors(apiError.errors ?? {})
    } finally {
      setLoading(false)
    }
  }

  return <><Header /><main id="main-content" className="container grid min-h-[calc(100dvh-4.5rem)] items-center gap-10 py-10 lg:grid-cols-[.9fr_1.1fr] lg:py-16"><section className="hidden rounded-[2rem] bg-primary p-10 text-primary-foreground lg:block"><span className="grid size-12 place-items-center rounded-2xl bg-white/10"><ShieldCheck className="size-6" aria-hidden="true" /></span><h1 className="mt-8 max-w-md font-display text-4xl font-extrabold tracking-[-0.04em]">A trusted account for every civic report.</h1><p className="mt-4 max-w-md leading-7 text-primary-foreground/90">Your reports stay connected to your account, so you can return and follow municipal progress at any time.</p><ul className="mt-8 space-y-4 text-sm font-bold"><li className="flex gap-3"><LockKeyhole className="size-5 text-accent" aria-hidden="true" />Secure, HTTP-only session</li><li className="flex gap-3"><ShieldCheck className="size-5 text-accent" aria-hidden="true" />Citizen access is separated from municipal roles</li></ul></section><Card className="mx-auto w-full max-w-xl p-6 sm:p-8"><div className="mb-7"><p className="text-sm font-bold text-primary">{isRegister ? 'Citizen registration' : 'Welcome back'}</p><h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight">{isRegister ? 'Create your CivicPulse account' : 'Sign in to CivicPulse'}</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">{isRegister ? 'Use your own contact details so report updates reach the right account.' : 'Continue tracking your reports and local civic updates.'}</p></div>{error && <div ref={errorRef} tabIndex={-1} className="mb-5 outline-none"><Alert title={error} variant="error">{Object.values(errors).length ? 'Review the fields below and try again.' : 'Check your details or try again in a moment.'}</Alert></div>}<form className="space-y-5" onSubmit={handleSubmit} noValidate>{isRegister && <div><label htmlFor="name" className="mb-2 block text-sm font-bold">Full name</label><Input id="name" name="name" autoComplete="name" aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'name-error' : undefined} />{errors.name && <p id="name-error" role="alert" className="mt-1.5 text-sm font-bold text-destructive">{errors.name}</p>}</div>}<div><label htmlFor="email" className="mb-2 block text-sm font-bold">Email address</label><Input id="email" name="email" type="email" autoComplete="email" aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'email-error' : undefined} />{errors.email && <p id="email-error" role="alert" className="mt-1.5 text-sm font-bold text-destructive">{errors.email}</p>}</div>{isRegister && <div><label htmlFor="phone" className="mb-2 block text-sm font-bold">Mobile number</label><Input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" defaultValue="+91" aria-invalid={Boolean(errors.phone)} aria-describedby={errors.phone ? 'phone-error' : 'phone-help'} /><p id="phone-help" className="mt-1.5 text-xs text-muted-foreground">Indian mobile format: +91 followed by 10 digits</p>{errors.phone && <p id="phone-error" role="alert" className="mt-1.5 text-sm font-bold text-destructive">{errors.phone}</p>}</div>}<div><label htmlFor="password" className="mb-2 block text-sm font-bold">Password</label><PasswordInput id="password" autoComplete={isRegister ? 'new-password' : 'current-password'} />{isRegister && <p className="mt-1.5 text-xs text-muted-foreground">At least 8 characters with uppercase, lowercase and a number.</p>}{errors.password && <p role="alert" className="mt-1.5 text-sm font-bold text-destructive">{errors.password}</p>}</div><Button type="submit" size="lg" className="w-full" disabled={loading}>{loading ? <><Loader2 className="size-4 animate-spin" aria-hidden="true" />{isRegister ? 'Creating account…' : 'Signing in…'}</> : isRegister ? 'Create account' : 'Sign in'}</Button></form><p className="mt-6 text-center text-sm text-muted-foreground">{isRegister ? 'Already registered?' : 'New to CivicPulse?'} <Link className="font-bold text-primary underline-offset-4 hover:underline" to={isRegister ? '/login' : '/register'}>{isRegister ? 'Sign in' : 'Create an account'}</Link></p></Card></main></>
}

export function LoginPage() { return <AuthShell mode="login" /> }
export function RegisterPage() { return <AuthShell mode="register" /> }
