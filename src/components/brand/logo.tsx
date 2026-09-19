import { Activity } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Logo({ inverse = false, compact = false }: { inverse?: boolean; compact?: boolean }) {
  return (
    <a href="/" className={cn('inline-flex min-h-11 items-center gap-2.5 rounded-lg font-display focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/25', inverse ? 'text-white' : 'text-foreground')} aria-label="CivicPulse home">
      <span className={cn('grid size-9 place-items-center rounded-xl', inverse ? 'bg-white text-primary' : 'bg-primary text-primary-foreground')}>
        <Activity className="size-5" strokeWidth={2.5} aria-hidden="true" />
      </span>
      <span className={cn('text-lg font-extrabold tracking-[-0.04em]', compact && 'hidden sm:inline')}>Civic<span className={inverse ? 'text-orange-300' : 'text-primary'}>Pulse</span></span>
    </a>
  )
}
