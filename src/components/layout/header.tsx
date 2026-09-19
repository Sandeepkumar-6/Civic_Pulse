import { useEffect, useState } from 'react'
import { LogOut, Menu, Moon, Sun, X } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Link } from 'react-router-dom'
import { Logo } from '@/components/brand/logo'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/auth-context'

const navItems = [
  { label: 'Civic map', href: '/map' },
  { label: 'Issues', href: '/#issues' },
  { label: 'How it works', href: '/#how-it-works' },
  { label: 'Why CivicPulse', href: '/#features' },
]

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [dark, setDark] = useState(false)
  const reduceMotion = useReducedMotion()
  const { user, logout } = useAuth()

  useEffect(() => {
    const saved = window.localStorage.getItem('civicpulse-theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const initialDark = saved ? saved === 'dark' : prefersDark
    setDark(initialDark)
    document.documentElement.classList.toggle('dark', initialDark)
  }, [])

  function toggleTheme() {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    window.localStorage.setItem('civicpulse-theme', next ? 'dark' : 'light')
  }

  async function handleLogout() {
    await logout()
    setMenuOpen(false)
  }

  return (
    <><a href="#main-content" onClick={() => { const main = document.getElementById('main-content'); main?.setAttribute('tabindex', '-1'); main?.focus() }} className="fixed left-4 top-3 z-[100] -translate-y-20 rounded-xl bg-primary px-4 py-2 font-bold text-primary-foreground shadow-lg transition focus:translate-y-0">Skip to main content</a><header className="sticky top-0 z-40 border-b border-border/70 bg-background/95 backdrop-blur-sm">
      <div className="container flex h-[4.5rem] items-center justify-between gap-4">
        <Logo />
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary navigation">
          {navItems.map((item) => <a key={item.href} href={item.href} className="inline-flex min-h-11 items-center rounded-full px-4 text-sm font-bold text-muted-foreground transition hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/25">{item.label}</a>)}
        </nav>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}>
            {dark ? <Sun className="size-5" aria-hidden="true" /> : <Moon className="size-5" aria-hidden="true" />}
          </Button>
          {user ? (
            <>
              <Button asChild variant="ghost" className="hidden lg:inline-flex"><Link to={user.role === 'citizen' ? '/my-reports' : '/admin'}>{user.role === 'citizen' ? 'My dashboard' : 'Operations'}</Link></Button>
              {user.role === 'citizen' ? <Button asChild className="hidden lg:inline-flex"><Link to="/report">Report an issue</Link></Button> : <Button asChild className="hidden lg:inline-flex"><Link to="/profile">Profile</Link></Button>}
              <Button variant="ghost" size="icon" className="hidden lg:inline-flex" onClick={handleLogout} aria-label={`Sign out ${user.name}`}><LogOut className="size-5" aria-hidden="true" /></Button>
            </>
          ) : (
            <><Button asChild variant="ghost" className="hidden sm:inline-flex"><Link to="/login">Sign in</Link></Button><Button asChild className="hidden sm:inline-flex"><Link to="/register">Create account</Link></Button></>
          )}
          <Button variant="outline" size="icon" className="lg:hidden" onClick={() => setMenuOpen((value) => !value)} aria-expanded={menuOpen} aria-controls="mobile-menu" aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}>
            {menuOpen ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
          </Button>
        </div>
      </div>
      <AnimatePresence initial={false}>
        {menuOpen && (
          <motion.nav id="mobile-menu" aria-label="Mobile navigation" initial={reduceMotion ? false : { opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: reduceMotion ? 0 : 0.16 }} className="border-t border-border bg-background px-4 py-4 lg:hidden">
            <div className="container grid gap-1 px-0">
              {navItems.map((item) => <a key={item.href} href={item.href} onClick={() => setMenuOpen(false)} className="flex min-h-12 items-center rounded-xl px-3 font-bold text-foreground hover:bg-secondary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/25">{item.label}</a>)}
              {user ? <><Link to={user.role === 'citizen' ? '/my-reports' : '/admin'} onClick={() => setMenuOpen(false)} className="flex min-h-12 items-center rounded-xl px-3 font-bold hover:bg-secondary">{user.role === 'citizen' ? 'My dashboard' : 'Municipal operations'}</Link><Link to="/profile" onClick={() => setMenuOpen(false)} className="flex min-h-12 items-center rounded-xl px-3 font-bold hover:bg-secondary">Profile & settings</Link>{user.role === 'citizen' && <Button asChild className="mt-2 w-full"><Link to="/report" onClick={() => setMenuOpen(false)}>Report an issue</Link></Button>}<Button variant="outline" className="w-full" onClick={handleLogout}><LogOut className="size-4" aria-hidden="true" />Sign out</Button></> : <><Button asChild variant="outline" className="mt-2 w-full"><Link to="/login" onClick={() => setMenuOpen(false)}>Sign in</Link></Button><Button asChild className="w-full"><Link to="/register" onClick={() => setMenuOpen(false)}>Create account</Link></Button></>}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header></>
  )
}
