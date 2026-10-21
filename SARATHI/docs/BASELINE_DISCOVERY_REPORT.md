# SARATHI AI — Baseline Discovery & Verification Report (Phase 1)

> **Date:** October 2026  
> **Auditor/Engineer:** Senior Full-Stack & Authentication Security Engineer  
> **Repository:** Sarathi AI (React 18 + Vite 8 + TypeScript + Tailwind v4 / Node.js 24 + Express 5 / Node SQLite)  

---

## 1. Verified Technology Stack & Versions

- **Frontend:** React `^18.3.1`, TypeScript `~5.6.2`, Vite `^8.3.0`, React Router DOM `^6.28.0`, Tailwind CSS `^4.0.0-beta.8`, Lucide React `^0.460.0`, Vitest `^2.1.8`.
- **Backend:** Node.js v24.20.0, Express `^5.1.0`, jsonwebtoken `^9.0.3`, bcryptjs `^3.0.3`, uuid `^11.1.0`, zod `^4.6.7`, helmet `^8.3.0`.
- **Database:** Node SQLite (`node:sqlite`), Schema Version 4 (25+ tables).
- **Installed Addition:** `google-auth-library ^9.15.1` (server).

---

## 2. Baseline Test Execution Results

- **Backend Integration Tests:** `npm test`  
  - Result: **142 / 142 tests passing** (22 suites, 0 failures, 20.5s duration).
- **Frontend Client Tests:** `npm run test:client`  
  - Result: **39 / 39 tests passing** (8 suites, 0 failures, 4.18s duration).
- **TypeScript Compilation:** `npx tsc -b`  
  - Result: **Clean pass** (Exit code 0, zero type errors).
- **Production Bundle Build:** `npm run build`  
  - Result: **Clean pass** (Built in 1.43s, exit code 0).
- **Lint & Line Limit Audit:** `npm run lint`  
  - Result: **Passed** (0 errors, 81 pre-existing warnings in non-auth components, all assessment components <= 200 lines).
- **Seed Validation:** `npm run validate:seeds`  
  - Result: **Passed** (120 unique task IDs validated).

---

## 3. Suspected Risks & Bug Register (Verified vs Refuted)

| ID | Description | Status | Verification Finding |
| :--- | :--- | :--- | :--- |
| **SUS-01** | Auth middleware falls back to first recruiter when no token is sent | **REFUTED** | `server/src/middleware/authMiddleware.js` explicitly sets `req.orgId = null` when unauthenticated and `requireAuth` returns HTTP 401. |
| **SUS-02** | Default JWT secret usable in production | **REFUTED** | `server/src/config/index.js` `validateConfig()` runs on server boot and throws fatal configuration error if `JWT_SECRET` is missing, default, or < 32 chars in production. |
| **SUS-03** | Frontend-only user registry driving login | **PARTIALLY CONFIRMED** | Student and Recruiter logins use real `/api/auth/login` and SQLite DB. College login in demo mode bypassed SQLite via `defaultDemoCollege` in `AuthContext.tsx`. |
| **SUS-04** | Unvalidated evidence URLs | **CONFIRMED** | `ProjectsPage.tsx` submits project URLs without strict schema validation; GitHub import handles parsing but needs explicit URL sanitization. |
| **BUG-01** | `rememberMe` checkbox not persisted | **CONFIRMED** | `LoginPage.tsx` captured state but `AuthContext.tsx` wrote tokens exclusively to `sessionStorage`. |
| **BUG-02** | College portal mock-only | **CONFIRMED** | `CollegeDashboard.tsx` relies exclusively on `mockCollegeAnalyticsData`; no `/api/analytics/college` endpoint currently exists. |
| **BUG-03** | Simulated Google modal reachable in production mode | **CONFIRMED** | `GoogleLoginButton.tsx` opens mock simulation modal when `activeClientId` is missing regardless of environment mode. Server `/api/auth/google` previously accepted unverified client JSON bodies. |

---

## 4. Defaulted Decisions (D-01 to D-15)

All decisions from Section 4 are accepted as **DEFAULT APPLIED**:
- **D-01:** Recruiter/College via Google: invitation/pre-provisioning only. No auto-grant. Students may self-register.
- **D-02:** Linking: auto-link Google identity to existing `candidate` account when Google `email_verified === true`; recruiter/college accounts require proof of existing password. Never merge two distinct users.
- **D-03:** Portal tab is a cosmetic hint only. Server identity governs post-login redirect.
- **D-04:** `rememberMe`: `localStorage` for persistent sessions (30-day bound), `sessionStorage` for session-only.
- **D-05:** Students link to institutions via invite code / roster.
- **D-06:** `GOOGLE_ALLOWED_HD` optional, off by default.
- **D-07:** No One Tap/auto-select in v1.
- **D-08:** Keep existing password-reset delivery behavior; report real email delivery as Blocked if no provider exists.
- **D-09:** College scope: real SQLite aggregate queries via `/api/analytics/college` with honest empty states.
- **D-10:** Reviewer is a role capability, not a separate login persona.
- **D-11:** Simulated Google modal strictly gated to demo mode.
- **D-13:** Keep 7-day JWT; no refresh tokens.
- **D-15:** Rate limiting: 10 attempts per 15 minutes per IP+email on login, Google, and password recovery.
