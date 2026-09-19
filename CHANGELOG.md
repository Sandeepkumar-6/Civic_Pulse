# CivicPulse changelog

## Verified status

This project has been validated with the current runtime checks:

- `npm test -- --run`
- `npx playwright test --reporter=list`

The current workspace passes the backend test suite and the browser E2E suite.

## Role model

Supported roles:

- citizen
- ward_officer
- admin

Citizen users can manage their own reports only. Ward officers are scoped by city and ward. Admin users can access municipal management workflows.

## Runtime fixes captured in this repo

- hardened geospatial duplicate filtering
- stabilized map runtime fallback behavior
- verified the local admin and user role flow under browser tests
