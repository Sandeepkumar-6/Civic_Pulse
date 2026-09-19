import type { HTMLAttributes, ReactNode } from 'react'
import { AlertCircle, CheckCircle2, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

const icons = { info: Info, success: CheckCircle2, error: AlertCircle }

export function Alert({
  title,
  children,
  variant = 'info',
  className,
}: HTMLAttributes<HTMLDivElement> & { title: string; children: ReactNode; variant?: keyof typeof icons }) {
  const Icon = icons[variant]
  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      className={cn(
        'flex gap-3 rounded-2xl border p-4 text-sm',
        variant === 'info' && 'border-primary/15 bg-primary/5 text-foreground',
        variant === 'success' && 'border-success/20 bg-success/5 text-foreground',
        variant === 'error' && 'border-destructive/20 bg-destructive/5 text-foreground',
        className,
      )}
    >
      <Icon className={cn('mt-0.5 size-5 shrink-0', variant === 'success' ? 'text-success' : variant === 'error' ? 'text-destructive' : 'text-primary')} aria-hidden="true" />
      <div><p className="font-bold">{title}</p><div className="mt-0.5 text-muted-foreground">{children}</div></div>
    </div>
  )
}
