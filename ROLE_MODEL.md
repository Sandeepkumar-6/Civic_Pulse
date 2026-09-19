# CivicPulse role model

The application supports three roles:

- citizen
- ward_officer
- admin

## Citizen

- Registers and signs in with a personal account
- Views dashboard data scoped to their own reports
- Can create and track reports for their own activity
- Cannot access other citizens’ reports or municipal administration views

## Ward officer

- Is scoped to a city and ward
- Can review and update reports within that municipal area
- Cannot transfer or override a report outside their assigned ward

## Admin

- Has full municipal access across the service dashboard
- Can filter, assign, and update report workflows
- Can manage broader operational visibility across the city

This role model is enforced by the session authentication and permission checks in the backend.
