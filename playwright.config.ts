import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: 'test-results',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  webServer: [
    { command: 'node server/src/testing/e2e-server.js', port: 4100, reuseExistingServer: false, timeout: 120_000 },
    { command: `node node_modules/vite/bin/vite.js ${process.env.E2E_PRODUCTION === '1' ? 'preview' : ''} --host 127.0.0.1 --port 4173`, port: 4173, env: { API_PROXY_TARGET: 'http://127.0.0.1:4100' }, reuseExistingServer: false, timeout: 120_000 },
  ],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    browserName: 'chromium',
    channel: process.env.PLAYWRIGHT_CHANNEL === 'chromium' ? undefined : 'chrome',
    trace: 'retain-on-failure',
  },
})
