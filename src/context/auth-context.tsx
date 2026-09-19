import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api } from '@/lib/api'
import type { User } from '@/types'

type LoginInput = { email: string; password: string }
type RegisterInput = { name: string; email: string; phone: string; password: string }
type ProfileInput = { name: string; phone: string; city: string; settings: NonNullable<User['settings']> }

type AuthContextValue = {
  user: User | null
  ready: boolean
  login: (input: LoginInput) => Promise<User>
  register: (input: RegisterInput) => Promise<User>
  logout: () => Promise<void>
  refresh: () => Promise<void>
  updateProfile: (input: ProfileInput) => Promise<User>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const response = await api<{ user: User | null }>('/api/auth/me')
      setUser(response.user)
    } catch {
      setUser(null)
    } finally {
      setReady(true)
    }
  }, [])

  useEffect(() => { void refresh() }, [refresh])

  const value = useMemo<AuthContextValue>(() => ({
    user,
    ready,
    login: async (input) => {
      const response = await api<{ user: User }>('/api/auth/login', { method: 'POST', body: JSON.stringify(input) })
      setUser(response.user)
      return response.user
    },
    register: async (input) => {
      const response = await api<{ user: User }>('/api/auth/register', { method: 'POST', body: JSON.stringify(input) })
      setUser(response.user)
      return response.user
    },
    logout: async () => {
      await api('/api/auth/logout', { method: 'POST' })
      setUser(null)
    },
    updateProfile: async (input) => {
      const response = await api<{ user: User }>('/api/auth/profile', { method: 'PATCH', body: JSON.stringify(input) })
      setUser(response.user)
      return response.user
    },
    refresh,
  }), [ready, refresh, user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// This hook intentionally shares the provider module so the context contract stays private.
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside AuthProvider')
  return value
}
