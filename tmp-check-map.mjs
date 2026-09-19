import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

await page.goto('http://localhost:5178/login', { waitUntil: 'networkidle' });
await page.locator('input[type="email"]').fill('citizen@civicpulse.local');
await page.locator('#password').fill('CivicPulse@123');
await page.getByRole('button', { name: 'Sign in' }).click();
await page.waitForURL(/\/my-reports$/, { timeout: 20000 });
console.log('logged in url=', page.url());
await page.goto('http://localhost:5178/map', { waitUntil: 'networkidle' });
await page.waitForTimeout(5000);
console.log('map url=', page.url());
console.log('cluster count=', await page.locator('.civic-cluster-marker').count());
console.log('report count=', await page.locator('.civic-report-marker').count());
console.log('visible reports text=', await page.getByText(/visible reports?/).first().textContent());
console.log('body text=', (await page.locator('body').textContent()).slice(0, 1200));
const payload = await page.evaluate(async () => {
  const res = await fetch('/api/reports/map?west=72.75&south=18.45&east=73.95&north=18.85', { credentials: 'include' });
  const text = await res.text();
  return { status: res.status, body: text.slice(0, 800) };
});
console.log('API payload=', JSON.stringify(payload));
await browser.close();
