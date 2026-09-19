# CivicPulse

India-first civic reporting built with React/Vite, Express and MongoDB. Citizens
report and track neighbourhood issues; municipal teams triage, assign and update
reports. Maps, dashboard metrics, history and analytics use MongoDB records.

## Run locally

Prerequisites: Node.js 22.12+ (or 24+), npm, and MongoDB 7+ locally or a
development MongoDB Atlas database. Use a dedicated development database.

```bash
npm install
```

Copy `.env.example` to `.env` (`Copy-Item .env.example .env` in PowerShell,
`cp .env.example .env` on macOS/Linux). Set `MONGODB_URI` and replace
`JWT_SECRET` with a random secret of at least 32 characters. Never commit it.

```bash
npm run seed
npm run dev
```

Open http://localhost:5173. The API listens on port 4000; Vite proxies
`/api` to it. Use that same hostname consistently for session cookies.
To run separately: `npm run dev:server` and `npm run dev:client`.
`GET /api/health` returns 200 only while MongoDB is connected.

Atlas: use the Atlas-provided `mongodb+srv://` connection string with a database
name, a least-privilege database user and the required network access.
URL-encode special characters in credentials. No Atlas credentials are included.
The tests run an isolated real MongoDB process, not a mocked database.

## Fictional development accounts

All listed accounts use **CivicPulse@123**, stored as bcrypt hashes.

| Role | Email |
| --- | --- |
| Citizen | citizen@civicpulse.local |
| Citizen | citizen2@civicpulse.local |
| Administrator | admin@civicpulse.local |
| Ward officer | officer@civicpulse.local |

These are development-only accounts, never production credentials.
Normal `npm run seed` adds missing users/reports, refreshes these account
passwords and creates indexes without deleting existing reports.
`npm run seed:reset` explicitly deletes users/reports in the configured
development database before seeding. Check the URI before using it.
Both commands refuse to run with `NODE_ENV=production`. Startup never seeds.

The seed includes twelve fictional Indian reports with coordinates, wards,
priorities, timestamps, varied statuses and assignments. Nearby Pune reports
exercise clustering and duplicate warnings. Duplicate candidates must match
the category, lie within 200 metres and be no older than 72 hours; closed reports
are excluded. Text similarity or very close proximity further narrows candidates.
Warnings never prevent a new valid submission.

Older databases lacking GeoJSON can use `npm run migrate:geo` after backup
and explicit review of the target database. It changes records/indexes.

## Environment

Only `VITE_*` variables are bundled into the browser; never place secrets there.

| Variable | Purpose |
| --- | --- |
| NODE_ENV | development locally; production for the deployed API |
| PORT | API listen port; default 4000 |
| MONGODB_URI | MongoDB / Atlas connection string, including database |
| JWT_SECRET | Private random signing secret, at least 32 characters |
| JWT_EXPIRES_IN | Token lifetime; default 7d |
| CLIENT_ORIGIN | Exact permitted browser origins, comma-separated, no trailing slash |
| UPLOAD_DIR | Writable persistent photograph directory; default uploads |
| COOKIE_SAME_SITE | lax by default; strict or none when deliberately configured |
| TRUST_PROXY | Trusted reverse-proxy hop count; default 0; match actual topology |
| VITE_API_URL | Build-time API origin, without /api; empty for same-origin routing |
| API_PROXY_TARGET | Development/preview proxy target; default http://127.0.0.1:4000 |

For development on another device, configure the actual frontend origin and API
proxy target. Browser geolocation requires a secure context (HTTPS, or localhost).
Manual coordinates remain available when permission is denied.

## Verification

```bash
npm run lint
npm test
npm run check:readiness
npm run build
npm run test:e2e
npm audit
```

The readiness check runs the actual seed and server entry points against its own
temporary MongoDB, verifies repeat-safe seeding and production seed refusal,
then checks development/production startup and all three required accounts.
It does not use or modify the database configured in your .env.

Browser tests use installed Google Chrome. Alternatively run
`npx playwright install chromium` and set `PLAYWRIGHT_CHANNEL=chromium`.
Ports 4100, 4101 and 4173 must be free for verification.
MongoDB test binaries need download access on first run and sufficient temporary
disk space. Standard `TEMP`/`TMP` variables can select another temporary drive.
Screenshots/traces/uploads are under ignored `test-results/`.

To test the built frontend after `npm run build`, set `E2E_PRODUCTION=1`
before `npm run test:e2e`. The normal browser run tests Vite development mode.
Automated accessibility checks supplement, not replace, assistive-technology
and real-device testing.

## Production preparation — manual deployment only

1. Build with the intended public `VITE_API_URL`: `npm run build`.
   The build script forces production React output even if local .env says development.
2. Serve `dist/` using an HTTPS static server with SPA fallback to `index.html`.
   Prefer one public origin and reverse-proxy `/api` to Express.
3. Configure the API environment explicitly: `NODE_ENV=production`, private
   `JWT_SECRET`, production `MONGODB_URI`, exact HTTPS `CLIENT_ORIGIN`,
   persistent `UPLOAD_DIR`, appropriate `PORT` and `TRUST_PROXY`.
4. Install runtime dependencies with `npm ci --omit=dev` on the API host,
   then run `npm start`. The API does not serve the frontend build.
5. Verify HTTPS, health, login/session cookies, photo retrieval, map tiles,
   database indexes and a citizen-to-municipal workflow in your environment.

`npm run preview` is a local build check, not a production hosting server.
Do not ship .env, test artifacts, local uploads or development accounts.
Configure backups, persistent storage, process supervision and log retention.
Provision municipal roles through an authorised operational process; public
registration always creates citizens.

Production cookies are HttpOnly and Secure. Same-origin routing is recommended.
If frontend/API are separate subdomains on the same site, set the API URL and
exact CORS origins. Separate unrelated sites additionally require
`COOKIE_SAME_SITE=none` and can fail where browsers block third-party cookies;
use same-site routing rather than relying on that arrangement. Photos are

authenticated and deliberately protected by a same-site resource policy.

## Operational boundaries

- Civic Assist is a server-side, deterministic category/priority analysis
  provider, not a hosted language model. Its provider abstraction can be
  integrated separately; no external AI key is needed or exposed.
- Notifications are in-app report updates. Email, SMS and push delivery are
  not implemented.
- OpenStreetMap tiles require internet access. Attribution is retained.
  Review the tile provider's usage policy before public traffic; report lists
  remain usable when tiles fail.
- Uploads accept JPEG, PNG and WebP, up to four files of 5 MB each, with MIME
  and signature checks. This is not malware scanning or full image decoding.
  Plan image sanitisation/scanning and retention before accepting public uploads
  at scale.
- No external stock images were added. Icons are Lucide; typography is served
  locally. See THIRD_PARTY_NOTICES.md for attribution.
- MongoDB Atlas, production TLS/proxies/storage and hosted-service reliability
  require verification in the owner's configured environment.

## Implementation references

- API, schemas, authorization and services: `server/src`
- Citizen and municipal screens: `src/pages`
- Shared controls and map: `src/components`
- Theme tokens: `src/index.css`
- Persisted UI/UX Pro Max reference: `design-system/civicpulse/MASTER.md`
- Browser workflows: `tests/e2e`; API integration checks: `server/test`

The existing CivicPulse teal identity is preserved. UI/UX Pro Max accessibility
guidance, 21st.dev component patterns and restrained Motion interactions inform
the interface without replacing its established layouts.
>>>>>>> 53b45ca (chore: initialize CivicPulse repository)
