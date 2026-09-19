import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

for (const width of [360, 390, 768, 1024, 1280, 1440]) {
  test(`citizen and municipal layouts work at ${width}px`, async ({ page }) => {
    test.setTimeout(90_000)
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()) })
    await page.setViewportSize({ width, height: 900 })
    const signIn = async (email: string) => {
      const response = await page.request.post('/api/auth/login', { data: { email, password: 'CivicPulse@123' } })
      expect(response.ok()).toBe(true)
    }
    await signIn('citizen@civicpulse.local')
    for (const route of ['/my-reports', '/profile', '/report', '/map']) {
      await page.goto(route, { waitUntil: 'domcontentloaded' })
      await expect(page.locator('h1')).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), route).toBe(true)
      if (route === '/map') {
        // Tile decoding is checked by the dedicated map integration test.
        // Layout checks should wait for report data, not external tile latency.
        await expect(page.locator('.civic-cluster-marker, .civic-report-marker').first()).toBeVisible()
        await page.getByRole('button', { name: 'Zoom in' }).click()
        await expect(page.locator('.civic-cluster-marker, .civic-report-marker').first()).toBeVisible()
      }
      if (width === 360 || width === 1440) {
        await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
        await page.screenshot({ path: `test-results/${route.slice(1)}-${width}.png`, fullPage: true })
      }
    }
    await page.goto('about:blank')
    await page.request.post('/api/auth/logout')
    await signIn('admin@civicpulse.local')
    await page.goto('/admin', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: 'Civic service dashboard' })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    await page.getByRole('link', { name: 'Manage', exact: true }).first().click()
    await expect(page.getByRole('heading', { name: 'Assignment & workflow' })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    if (width === 360 || width === 1440) {
      const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
      expect(accessibility.violations).toEqual([])
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
      await page.screenshot({ path: `test-results/workflow-${width}.png`, fullPage: true })
    }
    expect(errors).toEqual([])
  })
}

test('map handles denied location and network failure without losing navigation', async ({ page, context }) => {
  await context.clearPermissions()
  await page.request.post('/api/auth/login', { data: { email: 'citizen@civicpulse.local', password: 'CivicPulse@123' } })
  await page.goto('/map')
  await page.getByRole('button', { name: 'Near me', exact: true }).click()
  await expect(page.getByText('Location permission was not granted. You can still search around the map centre.')).toBeVisible({ timeout: 15_000 })
  await page.route('**/api/reports/map?*', (route) => route.abort())
  await page.reload()
  await expect(page.getByRole('alert')).toBeVisible()
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await page.unroute('**/api/reports/map?*')
  await page.route('https://tile.openstreetmap.org/**', (route) => route.abort())
  await page.reload()
  await expect(page.getByText('Base map connection is limited')).toBeVisible()
  await expect(page.locator('.civic-cluster-marker, .civic-report-marker').first()).toBeVisible()
})

test('landing contrast, keyboard navigation and reduced motion work in both themes', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  for (const theme of ['light', 'dark']) {
    if (theme === 'dark') await page.getByRole('button', { name: 'Switch to dark theme' }).click()
    for (const heading of ['What can you report?', 'See civic work moving forward', 'Civic participation without the guesswork.', 'From street-level concern to visible action']) await page.getByRole('heading', { name: heading }).scrollIntoViewIfNeeded()
    await expect(page.getByText(/reports received/)).toBeVisible()
    const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
    expect(accessibility.violations, theme).toEqual([])
  }
  await page.goto('/login')
  await expect(page.getByRole('link', { name: 'Skip to main content' })).toHaveCount(1)
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.locator('#main-content')).toBeFocused()
})
