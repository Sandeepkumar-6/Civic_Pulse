import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/auth-context'
import { Skeleton } from '@/components/ui/skeleton'
import type { ReactNode } from 'react'

export function ProtectedRoute({ children, roles = ['citizen', 'ward_officer', 'admin'] }: { children?: ReactNode; roles?: string[] }) {
  const { user, ready } = useAuth()
  const location = useLocation()
  if (!ready) return <div className="container py-24" role="status" aria-label="Checking your session"><Skeleton className="h-8 w-56" /><Skeleton className="mt-5 h-52 w-full" /></div>
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (!roles.includes(user.role)) return <Navigate to="/" replace />
  return children ?? <Outlet />
}
