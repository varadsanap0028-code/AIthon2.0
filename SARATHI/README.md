# SARATHI — Placement-Readiness Platform

## College & Institutional Portal

### Setup

1. Install dependencies:
   - Frontend: `npm install`
   - Backend: `npm --prefix server install`
2. Migrate + seed the database:
   - `npm --prefix server run migrate`
   - `npm --prefix server run seed` (core demo data)
   - `node server/src/seeder/collegeSeeder.mjs` (Apex Institute: 420 students, 4 branches, 18 drives)
3. Run:
   - Backend: `npm run server` (port 4000)
   - Frontend: `npm run dev:frontend`
   - Both: `npm run dev`

### College API

All `/api/analytics/college*` endpoints require the `college` (or `platform_admin`) role.
HODs are server-scoped to their own branch.

- `GET /api/analytics/college?branch=CSE` — KPIs, departments (D-09 suppressed), trends, drives, skill gaps, domains, at-risk count, roster, `lastSyncedAt`.
- `GET /api/analytics/college/drives?status=upcoming` — list placement drives.
- `POST /api/analytics/college/drives` — create drive (rate-limited, validated).
- `PATCH /api/analytics/college/drives/:id` — update drive (audited).
- `GET /api/analytics/college/drives/:id/eligible` — eligibility engine (branch, min readiness, verified skills, passport).
- `GET /api/analytics/college/at-risk?benchmark=60` — at-risk students (D-09 enforced).
- `POST /api/analytics/college/remediation` — assign remediation (audited).
- `PATCH /api/analytics/college/remediation/:id` — update remediation status (audited).
- `GET /api/analytics/college/curriculum` — curriculum recommendations.
- `PATCH /api/analytics/college/curriculum/:id` — accept/plan/dismiss (audited).
- `GET /api/analytics/college/settings` / `PUT /api/analytics/college/settings` — benchmark, branches, batch year.
- `GET /api/analytics/college/users` — college Admin/TPO/HOD users.

### Privacy (Rule D-09)

Any aggregate over fewer than 3 candidates is suppressed server-side
("Insufficient cohort size"), including when branch filters shrink the cohort.

### Tests

- Client: `npm run test:client` (vitest, 96 tests)
- Server: `npm run test:server` (node:test; includes `collegeD09.test.mjs` + `collegeEligibility.test.mjs`)

---

## Original Template Notes

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.

## Smart Assessment Engine V2

SARATHI includes a server-trusted, evidence-based skill assessment system with sandboxed code runners and integrity monitoring.

### Configuration & Feature Flags

Assessment V2 operates strictly behind feature flags:

| Flag | Location | Default | Description |
|---|---|---|---|
| `ASSESSMENT_V2_ENABLED` | `server/.env` | `false` | Enables V2 server routes (`/api/assessments/v2/*`) and blocks legacy heuristic submissions (410 Gone) |
| `VITE_ASSESSMENT_V2` | `.env` | `false` | Mounts V2 assessment shell on `/student/assessment` |
| `ASSESSMENT_RUNNER_DRIVER` | `server/.env` | `local_dev` | Code runner driver (`local_dev`, `sql`, `judge0`) |
| `ASSESSMENT_CAMERA_ENABLED`| `server/.env` / `.env` | `false` | Camera monitoring preview (local browser only, no video stored/uploaded) |

### Testing & Validation

```bash
# Run all server tests (123 tests across 20 suites)
npm --prefix server test

# Run all client tests (39 tests across 8 suites)
npm run test:client

# Typecheck and linting
npx tsc -b
npx oxlint
npx vite build
```

