import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './context/auth-context'
import { AdminDashboardPage } from './pages/admin-dashboard-page'

const citizen = {
  id: 'citizen-1',
  name: 'Asha Rao',
  email: 'asha@example.com',
  phone: '+919876543210',
  role: 'citizen',
}

beforeEach(() => {
  window.history.replaceState({}, '', '/')
  Object.defineProperty(window, 'scrollTo', { value: vi.fn(), writable: true })
  vi.stubGlobal('fetch', vi.fn(async (url: string) => url.includes('public-summary') ? new Response(JSON.stringify({ stats: [], issues: [{ id: 'CP-PUN-2481', category: 'Pothole', title: 'Pothole', location: 'Pune', reported: new Date().toISOString(), status: 'Assigned' }] }), { status: 200, headers: { 'Content-Type': 'application/json' } }) : new Response(JSON.stringify({ message: 'Authentication is required.' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  })))
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('CivicPulse application', () => {
  it('renders the landing journey and data-driven civic activity', async () => {
    render(<App />)
    expect(screen.getByRole('heading', { level: 1, name: /your city listens/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /see civic work moving forward/i })).toBeInTheDocument()
    expect((await screen.findAllByText(/CP-PUN-2481/)).length).toBeGreaterThan(0)
  })

  it('shows and clears an empty civic activity state', async () => {
    const user = userEvent.setup()
    render(<App />)
    const search = screen.getByRole('textbox', { name: /search recent civic issues/i })
    await user.type(search, 'no matching ward')
    expect(screen.getByRole('status')).toHaveTextContent('No matching issues')
    await user.click(screen.getByRole('button', { name: /clear filters/i }))
    expect(screen.getAllByText(/CP-PUN-2481/).length).toBeGreaterThan(0)
  })

  it('lets municipal staff clear draft filters before applying them', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.includes('/api/dashboard/municipal')) {
        return new Response(JSON.stringify({
          analytics: {
            total: 1,
            active: 1,
            resolved: 0,
            resolutionRate: 0,
            urgent: 0,
            byStatus: [{ label: 'Submitted', count: 1 }],
            byCategory: [{ label: 'Pothole', count: 1 }],
            byWard: [{ label: 'Aundh-Baner Ward', count: 1 }],
          },
          filters: {
            categories: ['Pothole', 'Streetlight'],
            statuses: ['Submitted', 'In Progress'],
            wards: ['Aundh-Baner Ward'],
          },
          reports: [{
            id: 'r-1',
            reference: 'CP-2026-PUN548',
            category: 'Pothole',
            description: 'Pothole on road',
            status: 'Submitted',
            priority: 'Urgent',
            citizen: { id: 'c-1', name: 'Citizen One', email: 'citizen@example.com' },
            assignedTo: { id: 'u-1', name: 'Ward Services Officer', email: 'officer@example.com' },
            location: { address: 'Aundh Road', landmark: 'Near station', city: 'Pune', state: 'Maharashtra', pincode: '411007' },
            photos: [],
            updates: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            ward: 'Aundh-Baner Ward',
          }],
          assignees: [],
          scope: 'Pune municipal zone',
        }), { status: 200, headers: { 'Content-Type': 'application/json' } })
      }

      return new Response(JSON.stringify({ message: 'Authentication is required.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }))

    render(
      <BrowserRouter>
        <AuthProvider>
          <AdminDashboardPage />
        </AuthProvider>
      </BrowserRouter>,
    )

    const search = await screen.findByLabelText('Search')
    await user.type(search, 'CP-2026-PUN548')
    await user.selectOptions(screen.getByLabelText('Category'), 'Pothole')

    const clearButton = screen.getByRole('button', { name: /clear filters/i })
    await user.click(clearButton)

    expect(search).toHaveValue('')
    expect(screen.getByLabelText('Category')).toHaveValue('')
  })

  it('redirects a signed-out citizen from reporting to sign in', async () => {
    window.history.replaceState({}, '', '/report')
    render(<App />)
    await waitFor(() => expect(screen.getByRole('heading', { name: /sign in to civicpulse/i })).toBeInTheDocument())
  })

  it('validates citizen registration before calling the API', async () => {
    const user = userEvent.setup()
    window.history.replaceState({}, '', '/register')
    render(<App />)
    await user.click(await screen.findByRole('button', { name: 'Create account' }))
    expect(screen.getByText('Please correct the highlighted information.')).toBeInTheDocument()
    expect(screen.getByText('Enter your full name.')).toBeInTheDocument()
  })

  it('shows a short-description warning only after the user interacts with the field', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      const resource = String(url)
      if (resource.includes('/api/auth/me')) {
        return new Response(JSON.stringify({ user: citizen }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      if (resource.includes('public-summary')) {
        return new Response(JSON.stringify({ stats: [], issues: [{ id: 'CP-PUN-2481', category: 'Pothole', title: 'Pothole', location: 'Pune', reported: new Date().toISOString(), status: 'Assigned' }] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      return new Response(JSON.stringify({ message: 'Authentication is required.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }))

    window.history.replaceState({}, '', '/report')
    render(<App />)

    expect(await screen.findByRole('heading', { name: /report a civic issue/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /pothole/i }))

    const description = screen.getByLabelText(/issue description/i)
    expect(screen.queryByText('Describe the issue in at least 20 characters.')).not.toBeInTheDocument()
    await user.type(description, 'Short issue detail.')
    await user.tab()
    expect(screen.getByText('Describe the issue in at least 20 characters.')).toBeInTheDocument()
  })

  it('only marks the description invalid after the user has interacted with it', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      const resource = String(url)
      if (resource.includes('/api/auth/me')) {
        return new Response(JSON.stringify({ user: citizen }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      if (resource.includes('public-summary')) {
        return new Response(JSON.stringify({ stats: [], issues: [{ id: 'CP-PUN-2481', category: 'Pothole', title: 'Pothole', location: 'Pune', reported: new Date().toISOString(), status: 'Assigned' }] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      return new Response(JSON.stringify({ message: 'Authentication is required.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }))

    window.history.replaceState({}, '', '/report')
    render(<App />)

    expect(await screen.findByRole('heading', { name: /report a civic issue/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /pothole/i }))
    const description = screen.getByLabelText(/issue description/i)

    expect(description).toHaveAttribute('aria-invalid', 'false')
    await user.type(description, 'Short issue detail.')
    expect(description).toHaveAttribute('aria-invalid', 'false')
    await user.tab()
    expect(description).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText('Describe the issue in at least 20 characters.')).toBeInTheDocument()
  })

  it('shows accessible validation feedback on the citizen report form', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      const resource = String(url)
      if (resource.includes('/api/auth/me')) {
        return new Response(JSON.stringify({ user: citizen }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      if (resource.includes('public-summary')) {
        return new Response(JSON.stringify({ stats: [], issues: [{ id: 'CP-PUN-2481', category: 'Pothole', title: 'Pothole', location: 'Pune', reported: new Date().toISOString(), status: 'Assigned' }] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      return new Response(JSON.stringify({ message: 'Authentication is required.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }))

    window.history.replaceState({}, '', '/report')
    render(<App />)

    expect(await screen.findByRole('heading', { name: /report a civic issue/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /pothole/i }))
    await user.click(screen.getByRole('button', { name: /continue/i }))

    const description = screen.getByLabelText(/issue description/i)
    expect(description).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText('Describe the issue in at least 20 characters.')).toBeInTheDocument()
  })
})
