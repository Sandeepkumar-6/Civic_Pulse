export class ApiError extends Error {
  status: number
  errors?: Record<string, string>

  constructor(message: string, status: number, errors?: Record<string, string>) {
    super(message)
    this.status = status
    this.errors = errors
  }
}

export function apiUrl(path: string) {
  return `${(import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')}${path}`
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const isFormData = options.body instanceof FormData
  const response = await fetch(apiUrl(path), {
    ...options,
    credentials: 'include',
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...options.headers,
    },
  })

  if (response.status === 204) return undefined as T
  const payload = await response.json().catch(() => ({ message: 'The server returned an unreadable response.' }))
  if (!response.ok) throw new ApiError(payload.message ?? 'The request could not be completed.', response.status, payload.errors)
  return payload as T
}
