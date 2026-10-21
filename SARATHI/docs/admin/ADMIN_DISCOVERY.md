# SARATHI Platform Admin Portal — System Discovery Report

**Phase:** Phase 0 (Discovery)  
**Date:** 2026-10-20  
**Repository Context:** SARATHI Platform Admin (`/admin`)

---

## 1. Stack & Versions

- **Frontend:**
  - React 19.2.8 (`react`, `react-dom`)
  - React Router DOM 7.18.4 (`react-router-dom`)
  - Tailwind CSS 4.3.3 (`tailwindcss`, `@tailwindcss/vite`)
  - Recharts 3.10.1 (`recharts`)
  - Icons: Lucide React 1.55.0 (`lucide-react`)
  - Schema Validation: Zod 4.6.7 (`zod`)
  - Build Tool: Vite 8.3.0 (`vite`, `@vitejs/plugin-react`)
  - Language: TypeScript ~6.0.2
  - Test Runner: Vitest 5.0.5 (`vitest`) + `@testing-library/react` 16.3.3 + `jsdom` 30.1.3
- **Backend:**
  - Runtime: Node.js (>=20.0.0, current runtime v24.13.3)
  - Web Framework: Express 5.1.0 (server package) / 5.3.0 (root package)
  - Database Engine: Native `node:sqlite` (`DatabaseSync` synchronous engine)
  - Password Hashing: bcryptjs 3.0.3 (`bcryptjs`)
  - Authentication Tokens: jsonwebtoken 9.0.3 (`jsonwebtoken`)
  - Security Headers: Helmet 8.3.0 (`helmet`)
  - Sandboxed Runner: isolated-vm 7.0.1 (`isolated-vm`)
  - OAuth Integration: google-auth-library 11.3.1 (`google-auth-library`)
  - Linter: Oxlint 1.81.0 (`oxlint`)
  - Test Runner: Native Node.js Test Runner (`node --test`)
- **Package Scripts:**
  - `npm run dev`: Concurrent dev orchestrator (`node scripts/dev.js`)
  - `npm run dev:frontend`: Vite dev server (`vite`)
  - `npm run dev:backend` / `npm run server`: Express backend (`node server/src/index.js`)
  - `npm run build`: Typecheck and bundle (`tsc -b && vite build`)
  - `npm run test`: Backend test suite (`npm --prefix server test`)
  - `npm run test:server`: Backend test suite (`node --test --test-concurrency=1 src/test/unit/*.test.mjs src/test/integration/*.test.mjs`)
  - `npm run test:client`: Frontend test suite (`vitest run`)
  - `npm run test:all`: Server tests followed by client tests (`npm --prefix server test && vitest run`)
  - `npm run seed`: Database seed script (`npm --prefix server run seed` -> `node src/seeder/seeder.mjs`)
  - `npm --prefix server run migrate`: Database migrations (`node src/data/migrate.mjs`)
  - `npm run lint`: Code quality & formatting checks (`oxlint && node scripts/check-line-limits.mjs`)

---

## 2. Server Route Mounting & Middleware Order

- **Entry Point:** `server/src/index.js`
- **Mounting Pattern:**
  - Route handlers export Express `Router` instances from `server/src/routes/*.js`.
  - Mounted via `app.use('/api/<resource>', router)`.
- **Middleware Execution Order:**
  1. `validateConfig()` executed synchronously at startup to enforce secret strength and forbid demo auth in production.
  2. `runMigrations()` ensures schema versioning is up to date before accepting requests.
  3. `helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false })` applies HTTP security headers.
  4. CORS middleware with dynamic origin validation (`CORS_ORIGINS`, default `http://localhost:5173`) and credentials support.
  5. `express.json({ limit: '5mb' })` parses JSON payloads.
  6. Development request logging middleware (method, path, status, duration).
  7. Public health endpoint: `GET /api/health` returns status, uptime, timestamp, memory usage, and mode.
  8. Global `authenticate` middleware (`server/src/middleware/authMiddleware.js`):
     - Parses Bearer token from `Authorization` header or cookie.
     - Verifies JWT against `JWT_SECRET`.
     - Queries `users` table (`SELECT * FROM users WHERE id = ? AND deleted_at IS NULL`) to attach live user state to `req.user`.
     - Non-blocking: attaches `req.user = null` if token is absent or invalid without throwing, leaving enforcement to `requireAuth`.
  9. Route registrations:
     - `/api/auth` -> `authRoutes.js`
     - `/api/taxonomy` -> `taxonomyRoutes.js`
     - `/api/jobs` -> `jobRoutes.js`
     - `/api/candidates` -> `candidateRoutes.js`
     - `/api/verifications` -> `verificationRoutes.js`
     - `/api/assessments` -> `assessmentRoutes.js`
     - `/api/assessments/v2` -> `assessmentV2Routes.js`
     - `/api/pipeline` -> `pipelineRoutes.js`
     - `/api/interviews` -> `interviewRoutes.js`
     - `/api/analytics` -> `analyticsRoutes.js`
     - `/api/analytics/college` -> `studentAnalyticsRoutes.js`
     - `/api/college` -> `collegeRoutes.js`
     - `/api/organization` -> `organizationRoutes.js`
     - `/api/chat` -> `chatRoutes.js`
     - `/api/roadmap` -> `roadmapRoutes.js`
     - `/api/settings` -> `settingsRoutes.js`
     - `/api/resources` -> `resourceRoutes.js`
     - `/api/notifications` -> `notificationRoutes.js`
     - `/api/feedback` -> `feedbackRoutes.js`
     - `/api/passport` -> `passportShareRoutes.js`
     - `/api/resumes` -> `resumeRoutes.js`
     - `/api/skills` -> `skillEngineRoutes.js`
  10. Catch-all 404 handler for undefined routes (`{ error: 'Endpoint not found', code: 'NOT_FOUND' }`).
  11. Global error handler (`server/src/middleware/errorHandler.js`): formats JSON responses with `{ error, code }` and appropriate HTTP status codes.

---

## 3. Auth Architecture

- **Login Flow:**
  - Route: `POST /api/auth/login` (rate-limited via `loginLimiter` in `server/src/routes/authRoutes.js`).
  - Service: `authService.login(email, password, requestedOrgId)` in `server/src/services/authService.js`.
  - Verifies email and bcrypt password hash; resolves active organisation membership; returns `{ token, user, organization }`.
- **JWT Payload Fields:**
  - `sub`: User ID (`user.id`)
  - `email`: User email (`user.email`)
  - `name`: Full name (`user.full_name`)
  - `globalRole`: User global platform role (`user.role`)
  - `status`: User status (`user.status || 'active'`)
  - `institutionId`: College ID (`user.institution_id || null`)
  - `institution`: College name (`user.institution || null`)
  - `orgId`: Active tenant organization ID (`orgId || null`)
  - `orgRole`: Organization membership role (`role || null`)
  - Signed using HMAC-SHA256 (`HS256`), default expiration `7d`.
- **Request Context Attachment:**
  - `authenticate` in `server/src/middleware/authMiddleware.js` attaches:
    - `req.user = { id, email, fullName, role, globalRole: role, status, institution, institutionId, orgId, orgRole, isSuspended: status === 'suspended', isPendingApproval: status === 'pending_approval' }`
    - `req.orgId = requestedOrgId || req.user.orgId || tenant.demoOrgId`
- **Role Verification Functions:**
  - `requireAuth`: Enforces that `req.user` exists and rejects suspended accounts (`isSuspended: true`) with HTTP 403 `ACCOUNT_SUSPENDED`.
  - `requireRole(allowedRoles)`: Checks if `req.user.role === 'platform_admin' || allowedRoles.includes(req.user.role) || allowedRoles.includes(req.user.globalRole)`. If not satisfied, returns HTTP 403 `FORBIDDEN`.
  - `requireTenant`: Ensures `req.orgId` is set.
- **Exact Global Role Strings:**
  - Platform Admin: `'platform_admin'`
  - Recruiter: `'recruiter'`
  - Technical Assessor: `'assessor'`
  - College/Institutional Admin: `'college'` (or `'placement_officer'`)
  - Candidate/Student: `'candidate'` (frontend maps to `'student'`)
- **Handling of Suspended Users:**
  - During login: `authService.login` checks `if (user.status === 'suspended')` and throws an Error with `code: 'ACCOUNT_SUSPENDED'` (HTTP 403).
  - During authenticated requests: `requireAuth` inspects `req.user.isSuspended` and responds with HTTP 403 `{ error: 'Your account has been suspended...', code: 'ACCOUNT_SUSPENDED' }`.
- **Portal Specificity of Login:**
  - The backend login endpoint `POST /api/auth/login` is general and shared across all user types.
  - The frontend client routes users after successful login based on `user.role` (students to `/`, recruiters to `/recruiter`, colleges to `/college`, and upcoming platform admins to `/admin`).

---

## 4. Database Architecture & Migrations

- **Schema Definition:**
  - Defined in `server/src/data/schema.js`.
  - Current schema version constant: `SCHEMA_VERSION = 11`.
  - Contains complete DDL statements (`CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`).
- **Migrations & Versioning:**
  - Migration script: `server/src/data/migrate.mjs` (`runMigrations(dbFilePath)`).
  - Version tracking table: `schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)`.
  - Migration process:
    1. Checks if `schema_migrations` table exists.
    2. Runs incremental ALTER TABLE migrations if DB is below targeted schema versions (e.g. adding columns idempotently).
    3. Executes the full DDL to ensure all latest tables and indexes are present.
    4. Records the current `SCHEMA_VERSION` in `schema_migrations`.
- **Database Backups:**
  - In `migrate.mjs`: `if (fs.existsSync(dbFile)) { fs.copyFileSync(dbFile, `${dbFile}.backup-${Date.now()}`); }`.
- **Database Engine & Connection:**
  - `server/src/config/db.js`: uses `node:sqlite` `DatabaseSync`.
  - Database file location: `server/data/database.db` (resolved via `paths.dbFile` in `server/src/config/index.js`).
- **ID & Timestamp Conventions:**
  - IDs: Generated using `randomUUID()` from `node:crypto` or `uuidv4()`. Many tables use semantic prefixes (e.g. `usr-...`, `org-...`, `job-...`, `app-...`, `ses-...`, `ie-...`).
  - Timestamps: ISO-8601 strings created using `new Date().toISOString()`.
- **Repository & Transaction Helpers:**
  - `server/src/data/repository.js` exports:
    - `repository.query(sql, params)` -> returns array of rows.
    - `repository.queryOne(sql, params)` -> returns single row or null.
    - `repository.execute(sql, params)` -> executes statement, returns `{ changes, lastInsertRowid }`.
    - `repository.transaction(fn)` -> opens transaction (`BEGIN TRANSACTION`), runs `fn(db)`, and commits (`COMMIT`) or rolls back (`ROLLBACK`) on error.

---

## 5. Table & Column Mapping

| Concept | Table Name | Columns / Implementation Status |
|---|---|---|
| **Users** | `users` | `id, email, password_hash, full_name, role, status, company_name, institution, institution_id, timezone, avatar_url, created_at, updated_at, deleted_at` |
| **Organisations / Companies** | `organisations` | `id, name, slug, timezone, currency, settings, created_at, updated_at, deleted_at` |
| **Recruiter Business Verifications** | `NOT FOUND` | No table exists yet for recruiter business / employer identity verification (will be created in Phase 4). |
| **Uploaded Document Storage** | `NOT FOUND` | No business verification document upload table exists. (Student resumes use `student_resumes` storing `file_path`, but no recruiter document storage exists). |
| **Candidate / Recruiter Profiles** | `candidate_profiles`<br>`recruiter_profiles` | `candidate_profiles`: `user_id, headline, bio, location, github_url, linkedin_url, portfolio_url, resume_url, experience_years, work_preference, skills, target_role, degree, graduation_year, metadata, created_at, updated_at`<br>`recruiter_profiles`: `user_id, department, title, phone, linkedin_url, created_at, updated_at` |
| **Jobs** | `jobs` | `id, org_id, title, description, domain_id, employment_type, experience_level, location, is_remote, salary_min, salary_max, currency, status, created_by, created_at, updated_at` |
| **Applications & Stage History** | `applications`<br>`application_stage_history` | `applications`: `id, org_id, job_id, candidate_id, stage, match_score, notes, applied_at, updated_at`<br>`application_stage_history`: `id, application_id, from_stage, to_stage, changed_by, reason, created_at` |
| **Skills** | `skills` | `id, domain_id, name, description, category, max_proficiency, created_at` |
| **Domains** | `domains` | `id, name, slug, description, created_at` |
| **Skill Evidence & Candidate Skills** | `candidate_skills`<br>`skill_evidence`<br>`canonical_skill_profiles`<br>`skill_evidence_ledger` | `candidate_skills`: `candidate_id, skill_id, proficiency, verification_status, verified_at, verified_by, evidence_notes, created_at, updated_at`<br>`skill_evidence`: `id, candidate_id, skill_id, evidence_type, title, description, url, metadata, verification_status, created_at`<br>`canonical_skill_profiles`: `candidate_id, skill_id, demonstrated_proficiency, evidence_status, confidence, evidence_count, last_evidence_at, scoring_rule_version, reassessment_recommended, updated_at`<br>`skill_evidence_ledger`: `id, candidate_id, skill_id, evidence_type, source, title, reference_url, score, max_score, demonstrated_level, validity_status, rule_version, metadata, created_at` |
| **Assessment Sessions** | `assessment_sessions` | `id, user_id, mode, domain_id, role, question_ids, bank_version, status, started_at, expires_at, deadline_at, save_version, submitted_at, consent_json, accommodation_json, engine_version` (also `assessment_assignments` & `assessment_attempts` for legacy) |
| **Scores** | `session_scores`<br>`assessment_results` | `session_scores`: `session_id, technical_score, knowledge_score, practical_score, rubric_json, skill_scores, graded_at`<br>`assessment_results`: `id, assignment_id, candidate_id, score, max_score, percentage, ...` |
| **Integrity Events** | `integrity_events` | `id, session_id, type, ts, meta`<br>**Distinct event types found in codebase:**<br>1. `visibility_hidden`<br>2. `visibility_visible`<br>3. `blur`<br>4. `focus`<br>5. `fullscreen_exit`<br>6. `paste_blocked`<br>7. `copy_blocked`<br>8. `offline_start`<br>9. `offline_end`<br>10. `network_offline`<br>11. `network_online`<br>12. `session_resume`<br>13. `camera_unauthorized`<br>14. `multiple_faces` (V2 specs)<br>15. `no_face` (V2 specs) |
| **Integrity Reviews** | `integrity_reviews` | `id, session_id, reviewer_id, decision, note, created_at` (`decision IN ('no_concern', 'needs_followup', 'concern_confirmed')`) |
| **Code Snapshots** | `submission_snapshots` | `id, session_id, question_id, code, language, reason, created_at` (`reason IN ('autosave', 'run', 'submit')`) |
| **Run Results** | `run_results` | `id, session_id, question_id, visible_passed, visible_total, status, stdout, stderr, time_ms, created_at` |
| **Learning Resources** | `learning_resources`<br>`resource_bookmarks`<br>`resource_progress`<br>`resource_playlist_items` | `learning_resources`: `id, title, slug, description, url, provider, type, domain, role_target, difficulty, duration_minutes, rating, rating_count, is_free, is_featured, tags, created_at, updated_at`<br>`resource_bookmarks`: `id, user_id, resource_id, created_at`<br>`resource_progress`: `id, user_id, resource_id, status, progress_percent, last_accessed_at, completed_at, notes, created_at` |
| **Notifications** | `notifications` | `id, user_id, title, message, type, is_read, metadata, created_at` |
| **Feedback** | `feedback` | `id, user_id, role, category, rating, comment, page_url, user_agent, metadata, created_at` |
| **Auth / Reset Tokens** | `password_resets`<br>`auth_identities`<br>`auth_nonces` | `password_resets`: `id, user_id, token_hash, expires_at, used_at, created_at`<br>`auth_identities`: `id, user_id, provider, provider_subject, email_at_link, created_at, last_login_at`<br>`auth_nonces`: `nonce, expires_at, created_at` |
| **Audit Events** | `audit_events` | `id, org_id, actor_id, action, target_type, target_id, details, created_at` (existing generic audit table; Phase 1 will add dedicated `admin_audit_log`) |
| **Support Tickets** | `NOT FOUND` | Will be created in Phase 6 (`support_tickets`, `ticket_messages`). |
| **Announcements** | `NOT FOUND` | Will be created in Phase 7 (`announcements`, `announcement_reads`). |
| **Platform Settings / Feature Switches** | `NOT FOUND` | `college_settings` and `user_settings` exist, but global platform `system_settings` does not exist yet (will be created in Phase 10). |

---

## 6. Role Benchmarks & Skill Taxonomy

- **Backend Taxonomy & Benchmarks Location:**
  - Core role taxonomies, benchmark proficiencies, weights, and competencies are defined in `server/src/data/roleTaxonomy.js`.
  - Seeded into SQLite tables via `server/src/data/taxonomySeed.js` and `server/src/seeder/seeder.mjs`.
  - Served via `server/src/services/taxonomyService.js` and mounted at `GET /api/taxonomy/domains`, `GET /api/taxonomy/roles`, `GET /api/taxonomy/roles/:roleId/benchmark`.
- **Frontend Catalog Copies:**
  - `src/data/roleTaxonomy.ts`: Defines `DOMAIN_TAXONOMY` with required skills, weights, and benchmark levels for frontend gap analysis.
  - `src/data/domainsCatalog.ts`: Defines domain descriptions, icon mappings, and skill breakdowns.

---

## 7. Existing Admin-ish Endpoints & Tests

- **Assessment Integrity & Review Queue:**
  - `GET /api/assessments/v2/reviews/queue`: Returns flagged or pending assessment sessions (`ReviewService.getReviewQueue`). Roles: `recruiter`, `college`, `admin`, `hiring_manager`, `reviewer`, `platform_admin`.
  - `GET /api/assessments/v2/reviews/:sessionId`: Returns complete assessment attempt details for human inspection.
  - `POST /api/assessments/v2/reviews/:sessionId`: Submits human reviewer judgment (`decision`, `note`, rubric adjustments).
- **Skill Evidence Verification:**
  - `GET /api/verifications/pending`: Pending verification queue for candidates' submitted skill evidence (`verificationService.getPendingVerifications`).
  - `POST /api/verifications/review`: Submits evaluation and awards proficiency level (`verificationService.submitReview`).
  - `POST /api/verifications/request`: Requests evidence from a candidate.
- **Organization & Member Management:**
  - `PUT /api/organization/settings`: Updates organization-wide settings.
  - `PATCH /api/organization/members/:id/role`: Updates member permissions.
- **Existing Tests for These Endpoints:**
  - `server/src/test/unit/verification.test.mjs`
  - `server/src/test/integration/assessment_v2_phase4.test.mjs` (reviewer queue and judgment verification)
  - `server/src/test/unit/phase2_authorization.test.mjs` (role permission checks)

---

## 8. Frontend Architecture

- **Router File:** `src/App.tsx` (using React Router `Routes` and `Route`).
- **Layouts:** Located in `src/layouts/`:
  - `PublicLayout.tsx`: Header, footer, and navigation for unauthenticated landing and documentation views.
  - `StudentLayout.tsx`: Top bar, student sidebar navigation, profile drawer, and active view container.
  - `RecruiterLayout.tsx`: Recruiter header, tenant context switcher, and recruiter navigation tabs.
  - `CollegeLayout.tsx`: Institutional dashboard navigation, department selectors, and placement drives.
- **Auth Context:** `src/context/AuthContext.tsx`
  - Manages `token`, `user`, `isAuthenticated`, `isLoading`, `isDemo`, `login`, `loginWithGoogle`, `logout`.
  - Session stored in `localStorage` (if `rememberMe` true) or `sessionStorage` (`sarathi_auth_token`, `sarathi_auth_user`).
- **Role Type Definitions:** `src/types/user.ts`
  - Currently defines: `export type UserRole = 'student' | 'recruiter' | 'college';`
  - Will be extended in Phase 1 to include `'platform_admin'`.
- **API Client & Error Handling:** `src/services/apiClient.ts`
  - Exports `request<T>(endpoint, options)`.
  - Exports `ApiError` class (`status`, `code`, `message`, `details`).
  - Automatically attaches `Authorization: Bearer <token>` from storage.
  - Supports automated retries (default 2 for GET) and an `onUnauthorized` listener.
- **Shared UI Components:** Located in `src/components/common/`:
  - `Button.tsx`, `Badge.tsx`, `Card.tsx`, `Modal.tsx`, `EmptyState.tsx`, `LoadingSpinner.tsx`, `PageHeader.tsx`, `ProgressBar.tsx`, `Skeleton.tsx`.
- **Styling Tokens & Theme:**
  - Defined in `src/index.css` via Tailwind CSS v4 `@theme` and `@layer base`:
    - Indigo accent: `--color-indigo: #4F46E5` / `--color-sarathi-indigo`
    - Brand blue: `--color-primary: #087BFA` / `--color-sarathi-blue`
    - Status success: `--color-success: #16A34A`
    - Status warning: `--color-warning: #D97706`
    - Status error: `--color-error: #DC2626`
    - Radius: `--radius-badge: 0.5rem`, `--radius-button: 0.75rem`, `--radius-card: 1rem`
- **Charting Library:** Recharts 3.10.1 (`AreaChart`, `BarChart`, `LineChart`, `ResponsiveContainer`, `XAxis`, `YAxis`, `Tooltip`).
- **Chatbot & AI Implementation:**
  - Frontend component: `src/components/chat/ChatWindow.tsx` (sends chat prompts to `/api/chat`).
  - Backend service: `server/src/services/aiChatService.js` (uses Google Gemini API or falls back to local knowledge engine).
  - Environment variables: `GEMINI_API_KEY`, `GEMINI_MODEL=gemini-1.5-flash` in `server/.env.example`.

---

## 9. Environment Variables & `.env.example`

- **Root `.env.example`:**
  - `VITE_APP_MODE`: Application mode (`demo` | `production`)
  - `VITE_API_URL`: Backend URL (e.g. `http://localhost:4000`)
  - `ASSESSMENT_V2_ENABLED`, `VITE_ASSESSMENT_V2`, `ASSESSMENT_CAMERA_ENABLED`: Assessment feature flags
  - `RUNNER_DRIVER`: Sandbox code runner driver (`local-dev` | `judge0` | `sql`)
  - `ASSESSMENT_RUNNER_TIMEOUT_MS`, `ASSESSMENT_CODE_MAX_BYTES`: Runner execution parameters
  - `JUDGE0_URL`, `JUDGE0_API_KEY`: Judge0 configuration
  - `INTEGRITY_RETENTION_DAYS`, `ASSESSMENT_PASS_THRESHOLD`: Integrity retention and passing threshold
  - `VITE_GOOGLE_CLIENT_ID`: Google OAuth Client ID for frontend
- **Server `server/.env.example`:**
  - `PORT`, `HOST`: Express port (4000) and host (0.0.0.0)
  - `NODE_ENV`: Runtime environment (`development` | `production`)
  - `APP_MODE`: Mode (`demo` | `production`)
  - `ENABLE_DEMO_AUTH`: Toggle for demo credentials (must be `false` in production)
  - `JWT_SECRET`, `JWT_EXPIRES_IN`: JWT signing secret and expiration (7d)
  - `CORS_ORIGINS`: Allowed origins (e.g. `http://localhost:5173`)
  - `GEMINI_API_KEY`, `GEMINI_MODEL`: AI engine keys
  - `OPENAI_API_KEY`, `OPENAI_MODEL`: Optional alternative AI engine keys
  - `ASSESSMENT_V2_ENABLED`, `RUNNER_DRIVER`, `ASSESSMENT_RUNNER_TIMEOUT_MS`, `ASSESSMENT_CODE_MAX_BYTES`, `JUDGE0_URL`, `JUDGE0_API_KEY`, `INTEGRITY_RETENTION_DAYS`, `ASSESSMENT_PASS_THRESHOLD`, `ASSESSMENT_CAMERA_ENABLED`: Assessment engine flags
  - `GOOGLE_CLIENT_ID`, `GOOGLE_ALLOWED_HD`: Google OAuth backend verification parameters

---

## 10. Test Seeding & Test Execution

- **How Tests Seed Data:**
  - Unit tests: execute against pure functions with structured in-memory test objects (e.g. `collegeEligibility.test.mjs`, `matching.test.mjs`).
  - Integration tests: invoke `initDb()` from `server/src/config/db.js` which initializes the database and seeds records on-demand using unique timestamped IDs (e.g. `usr-test-...-${Date.now()}`) to avoid primary key collisions.
- **Running a Single Test File:**
  - Backend:
    ```bash
    node --test server/src/test/unit/collegeEligibility.test.mjs
    ```
    or
    ```bash
    npm --prefix server test -- src/test/unit/collegeEligibility.test.mjs
    ```
  - Frontend:
    ```bash
    npx vitest run src/components/common/Skeleton.test.tsx
    ```

---

## 11. Existing Demo / Seed Scripts & Data

- **Primary Seeder Script:** `server/src/seeder/seeder.mjs` (executed via `npm run seed`).
- **Seeded Data Summary:**
  1. **Organisations:**
     - `org-demo-1`: Sarathi Enterprise Systems
     - `org-demo-2`: Apex Cloud Innovations
  2. **Users:**
     - `usr-admin-1` (`admin@sarathi.ai`): Platform Admin (role: `platform_admin`)
     - `usr-recruiter-1` (`recruiter@sarathi.ai`): Lead Recruiter (role: `recruiter`)
     - `usr-assessor-1` (`assessor@sarathi.ai`): Technical Assessor (role: `assessor`)
     - `usr-student-demo` (`student@sarathi.ai`): Alex Morgan (role: `candidate`)
     - 5 candidate accounts across top universities (Aarav Patel, Diya Sharma, Rohan Iyer, Ananya Reddy, Kabir Verma).
  3. **Memberships:** Connects admin, recruiter, and assessor to demo organizations with active status.
  4. **Profiles:** Complete candidate profiles including headlines, GitHub URLs, target roles, education, and verified skills.
  5. **Jobs & Applications:** Open listings for Frontend, Backend, AI/ML, and Full-Stack roles with candidates progressing across application stages.
  6. **Assessment Banks & Question Sets:** Multiple domains with coding challenges, unit test assertions, and project rubrics.
  7. **Learning Resources:** Complete library of courses, documentation, and videos with category tags and ratings.

---

## 12. Risks & Oddities

1. **Native `node:sqlite` Engine:** The backend relies on Node's native synchronous `DatabaseSync` engine (`import { DatabaseSync } from 'node:sqlite'`) rather than `better-sqlite3` or `sqlite3`. Prepared statements require synchronous `.prepare(...).run()`, `.get()`, or `.all()`.
2. **Role Name Synchronization:** The backend schema and auth middleware recognize `'platform_admin'` as the global administrative role. The frontend TypeScript type `UserRole` (`src/types/user.ts`) only permits `'student' | 'recruiter' | 'college'`. We must extend `UserRole` to include `'platform_admin'` in Phase 1.
3. **Missing Business Verifications Table:** The PRD assumes recruiter business verification occurs against an existing table, but no `business_verifications` table exists in the current schema. It must be created cleanly via a migration in Phase 4.
4. **Missing Support Tickets & Announcements Tables:** Support tickets (`support_tickets`, `ticket_messages`) and announcements (`announcements`, `announcement_reads`) do not exist and will be introduced in Phases 6 and 7.
5. **No Global System Settings Table:** Feature switches currently exist per-college (`college_settings`) or per-user (`user_settings`), but not platform-wide. `system_settings` will be created in Phase 10.
6. **Demo Authentication Overrides:** When `ENABLE_DEMO_AUTH=true` is enabled, `authService.login` allows fallback demo passwords. For Phase 1, we must ensure admin authentication is strictly gated and demo auto-login or Google sign-in cannot grant `platform_admin` privileges unless the email is already an existing platform admin.
7. **Active Development Server:** SQLite files can lock on concurrent write operations if unhandled transactions occur. All multi-table admin writes must use `repository.transaction()` to ensure atomicity and rollback safety.
