import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

beforeEach(() => {
  window.history.replaceState({}, '', '/')
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
})
