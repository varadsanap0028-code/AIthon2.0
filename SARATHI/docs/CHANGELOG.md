# Sarathi Student Portal — Changelog & Engineering Log

## Phase 1: Foundation (Completed)

### 1. Workspaces & Dependency Setup
- **Installed missing runtime dependencies:** Installed `node_modules` in root and `server/` directories, restoring `bcryptjs`, `uuid`, and core dependencies.
- **Added production libraries:** Added `zod` in both root and server for client/server schema validation; added `helmet` in server for HTTP security headers.
- **Configured Client Testing:** Installed `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, and `jsdom`. Added `test:client` and `test:all` scripts to `package.json`.
- **Created Vitest Config:** Added [`vitest.config.ts`](file:///c:/Users/Nishant/Documents/SARATHI/vitest.config.ts) and [`src/test/setup.ts`](file:///c:/Users/Nishant/Documents/SARATHI/src/test/setup.ts) with `jsdom` environment and DOM matchers.

### 2. Dead Code Elimination
- **Deleted Supabase Stub:** Completely removed unconfigured [`src/services/supabase.ts`](file:///c:/Users/Nishant/Documents/SARATHI/src/services/supabase.ts) and uninstalled `@supabase/supabase-js`.

### 3. Environment & Security Guards
- **Environment Templates:** Created [`.env`](file:///c:/Users/Nishant/Documents/SARATHI/.env) and [`server/.env`](file:///c:/Users/Nishant/Documents/SARATHI/server/.env) with explicit `APP_MODE=demo` and secure default JWT secrets.
- **Server Config:** Updated [`server/src/config/index.js`](file:///c:/Users/Nishant/Documents/SARATHI/server/src/config/index.js) to load both root and server `.env` files and cleanly default non-production mode to `'demo'`.
- **Helmet Security Middleware:** Mounted `helmet` in [`server/src/index.js`](file:///c:/Users/Nishant/Documents/SARATHI/server/src/index.js) with cross-origin resource policy.
- **Server Validation Middleware:** Implemented [`server/src/middleware/validate.js`](file:///c:/Users/Nishant/Documents/SARATHI/server/src/middleware/validate.js) providing `validateBody`, `validateQuery`, and `validateParams` with standardized `{ error: { code: 'VALIDATION_ERROR', message } }` output.

### 4. API Client & Testing
- **Unified API Client:** Created [`src/services/apiClient.ts`](file:///c:/Users/Nishant/Documents/SARATHI/src/services/apiClient.ts) featuring:
  - Automatic `Authorization: Bearer <token>` injection.
  - Automatic 401 handling, session clearing, and unauthorized dispatching.
  - Error normalization into typed `ApiError` class.
  - Automatic retry with exponential backoff on transient network failures.
  - Clean `get`, `post`, `put`, `patch`, `delete` methods.
- **Client Unit Tests:** Added [`src/test/apiClient.test.ts`](file:///c:/Users/Nishant/Documents/SARATHI/src/test/apiClient.test.ts) (3 tests passing).

### 5. Verification Results
- `npm --prefix server test`: **83/83 passed (100% green)**
- `npm run test:client`: **3/3 passed (100% green)**
- `npx tsc -b`: **Clean (0 errors)**
- `npx oxlint`: **Clean (0 errors)**
- `npx vite build`: **Clean (Exit code 0)**

## Phase 2: Persistence (Completed)

### 1. Database Schema Version 2 & Migrations
- **Schema Migration to Version 2:** Updated [`server/src/data/schema.js`](file:///c:/Users/Nishant/Documents/SARATHI/server/src/data/schema.js) (`SCHEMA_VERSION = 2`) and [`server/src/data/migrate.mjs`](file:///c:/Users/Nishant/Documents/SARATHI/server/src/data/migrate.mjs) with idempotent column guards.
- **Extended `candidate_profiles`:** Added `linkedin_url`, `degree`, and `graduation_year` columns with safe `ALTER TABLE` checks.
- **Created Student Tables:**
  - `student_roadmaps(id, user_id, track_key, completed_task_ids JSON, updated_at, UNIQUE(user_id, track_key))`
  - `user_settings(user_id PK, email_digest, roadmap_reminders, job_alerts, updated_at)`
  - `password_resets(id, user_id, token_hash, expires_at, used_at)`
  - `passport_shares(user_id PK, public_id UNIQUE, is_public, created_at)`
  - `learning_resources(id, domain, skill_tags JSON, title, provider, type, url, is_free, level, duration, language, created_at)`
  - `resource_bookmarks(user_id, resource_id, created_at, PK(user_id, resource_id))`
  - `resource_progress(user_id, resource_id, status, updated_at, PK(user_id, resource_id))`
  - `notifications(id, user_id, type, title, body, link, is_read, created_at)`
  - `feedback(id, user_id, category, message, created_at)`
  - Added indexes for performance and foreign key queries.

### 2. Candidate Profile Persistence
- **Backend Service:** Implemented `getCandidateProfile(candidateId)` and `updateCandidateProfile(candidateId, updates)` in [`server/src/services/candidateService.js`](file:///c:/Users/Nishant/Documents/SARATHI/server/src/services/candidateService.js), updating `users` (`full_name`, `institution`) and `candidate_profiles` (`headline`, `target_role`, `bio`, `github_url`, `linkedin_url`, `portfolio_url`, `degree`, `graduation_year`, `location`, `work_preference`).
- **Backend Endpoints:** Added `GET /api/candidates/profile` and `PUT /api/candidates/profile` in [`server/src/routes/candidateRoutes.js`](file:///c:/Users/Nishant/Documents/SARATHI/server/src/routes/candidateRoutes.js) with Zod validation.
- **Frontend Integration:** Wired [`src/context/AuthContext.tsx`](file:///c:/Users/Nishant/Documents/SARATHI/src/context/AuthContext.tsx) `updateProfile` to call `apiClient.put('/api/candidates/profile')` and hydrated candidate profile fields on session restore.
- **UI Enhancement:** Updated [`src/pages/student/ProfilePage.tsx`](file:///c:/Users/Nishant/Documents/SARATHI/src/pages/student/ProfilePage.tsx) with GitHub, LinkedIn, portfolio links, headline, location, client URL validation, loading skeleton, and error/success banners.

### 3. Student Roadmap Persistence
- **Backend Routes:** Created [`server/src/routes/roadmapRoutes.js`](file:///c:/Users/Nishant/Documents/SARATHI/server/src/routes/roadmapRoutes.js) providing `GET /api/roadmap` and `PUT /api/roadmap` with Zod validation and upsert logic into `student_roadmaps`.
- **Frontend Integration:** Updated [`src/context/StudentContext.tsx`](file:///c:/Users/Nishant/Documents/SARATHI/src/context/StudentContext.tsx) to hydrate completed task progress from `/api/roadmap` and sync `toggleTaskCompletion` directly to the SQLite backend.

### 4. User Settings Persistence
- **Backend Routes:** Created [`server/src/routes/settingsRoutes.js`](file:///c:/Users/Nishant/Documents/SARATHI/server/src/routes/settingsRoutes.js) providing `GET /api/settings` and `PUT /api/settings` with Zod validation and upsert logic into `user_settings`.
- **Frontend Integration:** Updated [`src/pages/student/SettingsPage.tsx`](file:///c:/Users/Nishant/Documents/SARATHI/src/pages/student/SettingsPage.tsx) to fetch preferences on mount and persist updates on form submit.

### 5. Password Management & Reset Flow
- **Backend Service:** Implemented `changePassword(userId, currentPassword, newPassword)`, `createPasswordResetToken(email)`, and `resetPasswordWithToken(token, newPassword)` in [`server/src/services/authService.js`](file:///c:/Users/Nishant/Documents/SARATHI/server/src/services/authService.js).
- **Backend Routes:** Added `POST /api/auth/change-password`, `POST /api/auth/forgot-password`, and `POST /api/auth/reset-password` in [`server/src/routes/authRoutes.js`](file:///c:/Users/Nishant/Documents/SARATHI/server/src/routes/authRoutes.js) with Zod validation.
- **Frontend Pages:**
  - Added Change Password form to [`src/pages/student/SettingsPage.tsx`](file:///c:/Users/Nishant/Documents/SARATHI/src/pages/student/SettingsPage.tsx).
  - Wired [`src/pages/public/ForgotPasswordPage.tsx`](file:///c:/Users/Nishant/Documents/SARATHI/src/pages/public/ForgotPasswordPage.tsx) to `POST /api/auth/forgot-password`.
  - Created [`src/pages/public/ResetPasswordPage.tsx`](file:///c:/Users/Nishant/Documents/SARATHI/src/pages/public/ResetPasswordPage.tsx) and registered route in [`src/App.tsx`](file:///c:/Users/Nishant/Documents/SARATHI/src/App.tsx).

### 6. Test Suites & Verification
- **Integration Tests:** Added [`server/src/test/integration/phase2_persistence.test.mjs`](file:///c:/Users/Nishant/Documents/SARATHI/server/src/test/integration/phase2_persistence.test.mjs) testing profile save/fetch, Zod URL validation, roadmap progress sync, settings sync, password change, and password reset.
- **Client Tests:** Added [`src/test/profileSave.test.ts`](file:///c:/Users/Nishant/Documents/SARATHI/src/test/profileSave.test.ts) testing `apiClient` payloads for profile, settings, and roadmap endpoints.
- **Command Verification Gate:**
  - `npm --prefix server test`: **91/91 passed (100% green)** across 14 suites.
  - `npm run test:client`: **6/6 passed (100% green)**.
  - `npx tsc -b`: **Clean (0 errors)**.
  - `npx oxlint`: **Clean (0 errors)**.
  - `npx vite build`: **Clean (Exit code 0)**.

## Phase 3: Engagement (Completed)

### 1. Curated Learning Resources Library
- **Database Seeder & Service:** Created [`server/src/data/resourceSeeder.js`](file:///c:/Users/Nishant/Documents/SARATHI/server/src/data/resourceSeeder.js) with 15+ curated high-quality resources spanning AI/ML, Full Stack, Cloud/DevOps, and Cybersecurity. Built [`server/src/services/resourceService.js`](file:///c:/Users/Nishant/Documents/SARATHI/server/src/services/resourceService.js) supporting domain/level/type filtering, user bookmark state, and progress tracking (`not_started`, `in_progress`, `completed`).
- **Backend API Endpoints:** Created [`server/src/routes/resourceRoutes.js`](file:///c:/Users/Nishant/Documents/SARATHI/server/src/routes/resourceRoutes.js) with:
  - `GET /api/resources` (supports `domain`, `level`, `type`, `isFree`, `bookmarkedOnly`, and search filters).
  - `POST /api/resources/:id/bookmark` (toggle bookmark per student).
  - `POST /api/resources/:id/progress` (updates progress with Zod status validation).
- **Frontend Page:** Created [`src/pages/student/ResourcesPage.tsx`](file:///c:/Users/Nishant/Documents/SARATHI/src/pages/student/ResourcesPage.tsx) with domain tabs, search bar, difficulty badges, status update actions, and registered route `/student/resources` in [`src/App.tsx`](file:///c:/Users/Nishant/Documents/SARATHI/src/App.tsx) and sidebar navigation in [`src/components/navigation/StudentSidebar.tsx`](file:///c:/Users/Nishant/Documents/SARATHI/src/components/navigation/StudentSidebar.tsx).

### 2. In-App Notification System
- **Backend Service & Routes:** Implemented [`server/src/services/notificationService.js`](file:///c:/Users/Nishant/Documents/SARATHI/server/src/services/notificationService.js) and [`server/src/routes/notificationRoutes.js`](file:///c:/Users/Nishant/Documents/SARATHI/server/src/routes/notificationRoutes.js):
  - `GET /api/notifications` (lists candidate notifications and unread badge count).
  - `PATCH /api/notifications/:id/read` (marks specific notification as read with ownership check).
  - `POST /api/notifications/read-all` (bulk marks all unread notifications).
  - Automatic welcome notification creation for newly connected candidates.
- **Frontend Drawer Component:** Created [`src/components/common/NotificationDrawer.tsx`](file:///c:/Users/Nishant/Documents/SARATHI/src/components/common/NotificationDrawer.tsx) with slide-over drawer, unread counters, mark-all-as-read, type icons, and relative timestamps. Mounted in [`src/layouts/StudentLayout.tsx`](file:///c:/Users/Nishant/Documents/SARATHI/src/layouts/StudentLayout.tsx) and wired to bell button in [`src/components/navigation/StudentHeader.tsx`](file:///c:/Users/Nishant/Documents/SARATHI/src/components/navigation/StudentHeader.tsx).

### 3. Student Feedback System
- **Backend API:** Created [`server/src/routes/feedbackRoutes.js`](file:///c:/Users/Nishant/Documents/SARATHI/server/src/routes/feedbackRoutes.js) with Zod validation (`category`, `rating`, `message`, `pageUrl`) saving to `feedback` table.
- **Frontend Modal:** Created [`src/components/common/FeedbackModal.tsx`](file:///c:/Users/Nishant/Documents/SARATHI/src/components/common/FeedbackModal.tsx) with interactive star ratings, categories, character limits, error validation, and success state. Triggerable from StudentHeader.

### 4. Public Skill Passport Share Links
- **Backend Service & Routes:** Created [`server/src/routes/passportShareRoutes.js`](file:///c:/Users/Nishant/Documents/SARATHI/server/src/routes/passportShareRoutes.js):
  - `GET /api/passport/share`: Retrieves share link state (`publicId`, `isEnabled`).
  - `POST /api/passport/share/toggle`: Toggles public visibility.
  - `GET /api/passport/public/:publicId`: Public, unauthenticated endpoint returning verified credentials, skills, evidence, and assessments.
- **Frontend Public Page:** Created [`src/pages/public/PublicPassportPage.tsx`](file:///c:/Users/Nishant/Documents/SARATHI/src/pages/public/PublicPassportPage.tsx) with tamper-verifiable credential view, printable layouts, and official platform stamp.
- **Skill Passport Integration:** Enhanced [`src/pages/student/SkillPassportPage.tsx`](file:///c:/Users/Nishant/Documents/SARATHI/src/pages/student/SkillPassportPage.tsx) with interactive Share Modal, instant copy-to-clipboard, preview link, and privacy toggle switch.

### 5. Verification Results
- `npm --prefix server test`: **97/97 passed (100% green)** across 15 suites.
- `npm run test:client`: **12/12 passed (100% green)** across 3 suites.
- `npx tsc -b`: **Clean (0 errors)**.
- `npx oxlint`: **Clean (0 errors)**.
- `npx vite build`: **Clean (Exit code 0)**.

## Phase 4: Insight & Analytics (Completed)

### 1. Statistical Analytics Engine
- **Backend Service:** Implemented [`server/src/services/studentAnalyticsService.js`](file:///c:/Users/Nishant/Documents/SARATHI/server/src/services/studentAnalyticsService.js) computing:
  - Skill category radar / benchmark gaps (current vs required per category & skill).
  - Overall readiness score and historical readiness trend (Week 1 to Current).
  - Diagnostic assessment history (scores, attempts, pass/fail status).
  - Gap priority split (High, Medium, Low/Mastered).
  - Learning activity distribution (tasks and study hours across 12 weeks).
  - Application funnel (`Applied` → `In Review` → `Shortlisted` → `Interview` → `Offer`).
  - Job match distribution histogram across active published marketplace jobs.
  - Resource type mix (Courses, Guides, Videos, Practice).
  - GitHub languages breakdown.
  - Summary KPI telemetry (Readiness %, Streak Days, Hours Learned, Avg Score, Cohort percentile guarded by `>= 20` candidates threshold).
- **Backend Route:** Added `GET /api/analytics/student` in [`server/src/routes/analyticsRoutes.js`](file:///c:/Users/Nishant/Documents/SARATHI/server/src/routes/analyticsRoutes.js) with JWT authentication and candidate context resolution.

### 2. GitHub Public Repository Auto-Fill Import
- **Backend Service & Route:** Implemented [`server/src/services/githubService.js`](file:///c:/Users/Nishant/Documents/SARATHI/server/src/services/githubService.js) and `POST /api/candidates/github/import` in [`server/src/routes/candidateRoutes.js`](file:///c:/Users/Nishant/Documents/SARATHI/server/src/routes/candidateRoutes.js) with URL parsing, caching, rate-limit resilience, and metadata extraction.
- **Frontend Integration:** Added "Auto-fill from GitHub" button and automatic metadata pre-fill in [`src/pages/student/ProjectsPage.tsx`](file:///c:/Users/Nishant/Documents/SARATHI/src/pages/student/ProjectsPage.tsx).

### 3. Analytics & Help Center Frontend Pages
- **Analytics Dashboard:** Created [`src/pages/student/AnalyticsPage.tsx`](file:///c:/Users/Nishant/Documents/SARATHI/src/pages/student/AnalyticsPage.tsx) featuring:
  - All 11 statistical charts compliant with PRD §3.5.
  - Loading skeleton, empty, and error fallback states.
  - Accessible ARIA labels and responsive layout (<400px mobile resilience).
  - Print / Export PDF stylesheet trigger (`window.print()`).
- **Help Center & FAQ:** Created [`src/pages/student/HelpPage.tsx`](file:///c:/Users/Nishant/Documents/SARATHI/src/pages/student/HelpPage.tsx) with FAQ accordion and direct feedback form.
- **Navigation:** Added routes `/student/analytics` and `/student/help` in [`src/App.tsx`](file:///c:/Users/Nishant/Documents/SARATHI/src/App.tsx) and navigation items in [`src/components/navigation/StudentSidebar.tsx`](file:///c:/Users/Nishant/Documents/SARATHI/src/components/navigation/StudentSidebar.tsx).

### 4. Test Suites & Verification
- **Integration Tests:** Added [`server/src/test/integration/phase4_analytics.test.mjs`](file:///c:/Users/Nishant/Documents/SARATHI/server/src/test/integration/phase4_analytics.test.mjs) (5 tests covering analytics telemetry, unauthorized protection, and github import).
- **Client Tests:** Added [`src/test/analytics.test.ts`](file:///c:/Users/Nishant/Documents/SARATHI/src/test/analytics.test.ts) (3 tests covering analytics mapper, github import, and feedback).
- **Command Verification Gate:**
  - `npm --prefix server test`: **102/102 passed (100% green)** across 16 suites.
  - `npm run test:client`: **15/15 passed (100% green)** across 4 suites.
  - `npx tsc -b`: **Clean (0 errors)**.
  - `npx oxlint`: **Clean (0 errors)**.
  - `npx vite build`: **Clean (Exit code 0)**.

## Phase 5: Quality & Production Hardening (Completed)

### 1. Large File Refactoring & Dashboard Splitting
- Refactored monolithic [`src/pages/student/StudentDashboard.tsx`](file:///c:/Users/Nishant/Documents/SARATHI/src/pages/student/StudentDashboard.tsx) (reduced from 1,227 lines to <250 lines) into modular components:
  - [`src/pages/student/dashboard/DashboardWelcomeBanner.tsx`](file:///c:/Users/Nishant/Documents/SARATHI/src/pages/student/dashboard/DashboardWelcomeBanner.tsx): Hero banner, career domain selector, onboarding checklist with progress tracker.
  - [`src/pages/student/dashboard/DashboardStatsGrid.tsx`](file:///c:/Users/Nishant/Documents/SARATHI/src/pages/student/dashboard/DashboardStatsGrid.tsx): 4 primary KPI telemetry cards with progress indicators and explainability modal trigger.
  - [`src/pages/student/dashboard/DashboardThreePillars.tsx`](file:///c:/Users/Nishant/Documents/SARATHI/src/pages/student/dashboard/DashboardThreePillars.tsx): Core 3 pillars (Diagnostic Assessment, Skill Gap Analysis, Structured Roadmap) + Recommended Next Learning Task spotlight.
  - [`src/pages/student/dashboard/DashboardSkillChart.tsx`](file:///c:/Users/Nishant/Documents/SARATHI/src/pages/student/dashboard/DashboardSkillChart.tsx): Benchmark skill proficiency bar chart with custom tooltips, legend, and verified projects/evidence list.
  - [`src/pages/student/dashboard/DashboardOpportunitiesWidget.tsx`](file:///c:/Users/Nishant/Documents/SARATHI/src/pages/student/dashboard/DashboardOpportunitiesWidget.tsx): Real-time AI job matches, Skill Passport callout banner, and audit log.
  - [`src/pages/student/dashboard/ReadinessExplainerModal.tsx`](file:///c:/Users/Nishant/Documents/SARATHI/src/pages/student/dashboard/ReadinessExplainerModal.tsx): Transparent weight breakdown modal (45% Diagnostic Depth, 30% Benchmark Coverage, 25% Project Proof).

### 2. Automated Resource Catalog Link Checker
- Built [`scripts/check-links.mjs`](file:///c:/Users/Nishant/Documents/SARATHI/scripts/check-links.mjs) per PRD §5.
- Automated HEAD/GET HTTP health probe verifying top-level domain URLs against dead links or timeouts.
- Added npm script `"check:links": "node scripts/check-links.mjs"` to [`package.json`](file:///c:/Users/Nishant/Documents/SARATHI/package.json).
- Executed check: **8/8 canonical resources verified live (0 dead links)**.

### 3. Accessibility & WCAG Contrast Hardening
- Replaced low-contrast `#8FA1C0` on tiny 10px/11px text labels across `StudentHeader.tsx`, `StudentSidebar.tsx`, `ResourcesPage.tsx`, and `PublicPassportPage.tsx` with high-contrast `#405B8B` (compliant with WCAG AA 4.5:1 ratio).
- Ensured external links have `rel="noopener noreferrer"`.
- Cleaned up unused imports and state across all modified components.

### 4. Verification Results Across All 5 Delivery Phases
- `npm run check:links`: **8/8 live (100% clean)**.
- `npm --prefix server test`: **102/102 passed (100% green)** across 16 test suites.
- `npm run test:client`: **15/15 passed (100% green)** across 4 test suites.
- `npm run test:all`: **All 117 tests passing (100% green)**.
- `npx tsc -b`: **Clean (0 errors)**.
- `npx oxlint`: **Clean (0 errors)**.
- `npx vite build`: **Clean (Exit code 0)**.

## Phase 6: Final Polish & Audit Bug Fixes (Completed)

### 1. Auto-Generated Printable Resume (PRD §3.11)
- **Backend Persistence:** Added `resumeUrl` field to `candidateProfileSchema` in [`server/src/routes/candidateRoutes.js`](file:///c:/Users/Nishant/Documents/SARATHI/server/src/routes/candidateRoutes.js) and `resume_url` SQL persistence in [`server/src/services/candidateService.js`](file:///c:/Users/Nishant/Documents/SARATHI/server/src/services/candidateService.js).
- **Profile Integration:** Added external `resumeUrl` input field and URL validator in [`src/pages/student/ProfilePage.tsx`](file:///c:/Users/Nishant/Documents/SARATHI/src/pages/student/ProfilePage.tsx).
- **Printable Resume Engine:** Created [`src/pages/student/ResumePage.tsx`](file:///c:/Users/Nishant/Documents/SARATHI/src/pages/student/ResumePage.tsx) (`/student/resume`), compiling candidate identity, verified skills with proficiency bars, evidence-backed projects with repo links, and print styles with a "Print / Save PDF" button (`window.print()`).
- **Navigation:** Registered `/student/resume` in [`src/App.tsx`](file:///c:/Users/Nishant/Documents/SARATHI/src/App.tsx) and added "Skill Resume" link to [`src/components/navigation/StudentSidebar.tsx`](file:///c:/Users/Nishant/Documents/SARATHI/src/components/navigation/StudentSidebar.tsx).

### 2. GitHub Profile Snapshot Card & Project Proof Hardening (PRD §3.2)
- **Profile Card:** Added top GitHub developer snapshot card in [`src/pages/student/ProjectsPage.tsx`](file:///c:/Users/Nishant/Documents/SARATHI/src/pages/student/ProjectsPage.tsx) displaying connected username, public repository count, and dynamically aggregated top languages color breakdown bar.
- **Strict Regex:** Enforced GitHub repository format regex `github.com/{owner}/{repo}` on submission.
- **Reviewer Feedback:** Displayed reviewer feedback note on project cards when review status is updated or requires revision.
- **Screenshots:** Added optional screenshot preview link and modal input field.

### 3. Recommended Resources on Skill Gap Page (PRD §3.4)
- **Direct Curated Recommendations:** In [`src/pages/student/SkillGapPage.tsx`](file:///c:/Users/Nishant/Documents/SARATHI/src/pages/student/SkillGapPage.tsx), wired catalog integration to query curated modules matching skill tags for each high-priority gap, displaying direct learning links with level, provider, and free badges.

## Smart Assessment Engine V2 Upgrade (Phases 0 - 5 Completed)

### 1. Architectural Guardrails & Feature Flags
- Strictly additive implementation behind feature flags: `ASSESSMENT_V2_ENABLED` (server) and `VITE_ASSESSMENT_V2` (client).
- When flags are OFF, the application behaves 100% identically to the baseline.
- Legacy `POST /api/assessments/student-submit` returns HTTP `410 Gone` when `ASSESSMENT_V2_ENABLED=true` to eliminate client-side heuristic score forgery.
- Frozen output contract: [`toLegacyAssessmentResult()`](file:///c:/Users/Nishant/Documents/SARATHI/src/adapters/toLegacyAssessmentResult.ts) translates V2 session results into the exact legacy `AssessmentResult` shape, feeding `StudentContext.recordFullAssessmentResult()` with zero alterations to `StudentContext`, `Dashboard` (`useDashboardData`), `SkillGapPage`, or `SkillPassportPage`.

### 2. Schema Migration & Taxonomy (Schema Version 3)
- Bumped database schema to `SCHEMA_VERSION = 3` in [`server/src/data/schema.js`](file:///c:/Users/Nishant/Documents/SARATHI/server/src/data/schema.js).
- Added idempotent migration column `engine_version TEXT DEFAULT 'v1'` on `assessment_attempts` in [`server/src/data/migrate.mjs`](file:///c:/Users/Nishant/Documents/SARATHI/server/src/data/migrate.mjs).
- Added database tables:
  - `assessment_questions` (id, version, domain_id, skill_id, type, difficulty, prompt, options, correct, explanation, starter_code, language, status, created_at)
  - `code_tests` (id, question_id, kind, input, expected_output, weight, timeout_ms)
  - `project_rubrics` (id, question_id, criteria)
  - `assessment_sessions` (id, user_id, mode, domain_id, role, question_ids, status, started_at, expires_at, submitted_at, rules_json, consent_json, engine_version)
  - `submission_snapshots` (id, session_id, question_id, code, language, reason, created_at)
  - `run_results` (id, session_id, question_id, visible_passed, visible_total, status, stdout, stderr, time_ms, created_at)
  - `explanation_answers` (id, session_id, question_id, text, rubric_score, needs_review, created_at)
  - `session_scores` (session_id, technical_score, knowledge_score, practical_score, rubric_json, skill_scores, graded_at)
  - `integrity_events` (id, session_id, type, ts, meta)
  - `integrity_reviews` (id, session_id, reviewer_id, decision, note, created_at)

### 3. Versioned Question Bank Seeds (5 Domains)
- Built seeded question banks in [`server/src/data/seeds/assessment/`](file:///c:/Users/Nishant/Documents/SARATHI/server/src/data/seeds/assessment/):
  - `web_development.json`: 20 MCQs, 4 coding tasks (with 3 visible + 5 hidden test cases), 2 SQL tasks, 1 project with rubric.
  - `ai_ml.json`: 20 MCQs, 4 coding tasks, 2 SQL tasks, 1 project with rubric.
  - `cloud_devops.json`: 20 MCQs, 4 coding tasks, 2 SQL tasks, 1 project with rubric.
  - `data_science.json`: 20 MCQs, 4 coding tasks, 2 SQL tasks, 1 project with rubric.
  - `cybersecurity.json`: 20 MCQs, 4 coding tasks, 2 SQL tasks, 1 project with rubric.
- Total seed counts: 135 questions, 185 test cases, and 5 project rubrics populated via `assessmentSeeder.js`.

### 4. Sandboxed Code & SQL Runner Drivers
- Built modular driver architecture in [`server/src/services/runner/`](file:///c:/Users/Nishant/Documents/SARATHI/server/src/services/runner/):
  - `RunnerDriver`: Factory selecting driver based on language and environment.
  - `LocalDevDriver`: Isolated Node.js `child_process` runner enforcing hard execution timeout (2000ms), output truncation, and fatal exit if run under `NODE_ENV=production`.
  - `SqlDriver`: In-memory isolated SQLite instance seeded with mock tables (`candidates`, `jobs`, `applications`, `orders`), executing read-only `SELECT` queries and strictly rejecting mutating statements (`INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`).
  - `Judge0Driver`: Production batch execution client connecting to self-hosted Judge0 CE Docker service, with graceful fallback.
  - `docker-compose.judge0.yml`: Self-hosted Judge0 CE + Postgres + Redis compose service.

### 5. Evidence-Based Grading & One-Writer Rule
- Implemented [`server/src/services/assessmentV2/gradingService.js`](file:///c:/Users/Nishant/Documents/SARATHI/server/src/services/assessmentV2/gradingService.js):
  - Difficulty-weighted scoring for MCQs (1pt, 2pt, 3pt).
  - Practical task hidden test assertion weighting (70% hidden tests, 15% visible tests, 15% code quality).
  - Technical score composite: 40% knowledge + 60% practical.
  - Evidence-based level capping (PRD §6.4): ≥3 items for Level 4–5; 2 items max Level 3; 1 item max Level 2.
  - Practice mode ceiling: Capped at Level 2 (Developing) with "self_practice" status.
  - Verified preservation: Candidate skills with `'verified'` status are never downgraded.
  - One-writer rule: Only the server-side grading service writes `candidate_skills`.

### 6. Client Integrity Monitoring & Privacy-First Architecture
- Built [`src/hooks/useIntegrityMonitor.ts`](file:///c:/Users/Nishant/Documents/SARATHI/src/hooks/useIntegrityMonitor.ts) and [`server/src/services/assessmentV2/integrityService.js`](file:///c:/Users/Nishant/Documents/SARATHI/server/src/services/assessmentV2/integrityService.js):
  - Monitors visibility change, window blur/focus, copy/paste restrictions, and network offline/online events.
  - Non-accusatory indicator banner: alerts student politely after 3 tab away events without blocking work.
  - Strict zero-deduction guarantee: Integrity events provide signals for human review and NEVER alter technical scores or candidate skills directly.
  - Retention cleanup job: deletes event logs older than retention period (default 30 days).
  - Camera monitoring: Disabled by default (`ASSESSMENT_CAMERA_ENABLED=false`). In-browser local stream only, zero image or video upload/storage.

### 7. Reviewer Queue & Inspection Workflow
- Built [`server/src/services/assessmentV2/reviewService.js`](file:///c:/Users/Nishant/Documents/SARATHI/server/src/services/assessmentV2/reviewService.js) and routes (`/api/assessments/v2/reviews/queue`, `/api/assessments/v2/reviews/:sessionId`):
  - Role-guarded for recruiters, college administrators, and platform admins.
  - Inspects attempt summary, question answers, code snapshots, test results, and integrity timeline.
  - Supports review decisions (`no_concern`, `needs_followup`, `concern_confirmed`) with mandatory audit notes.
- Built [`src/pages/reviewer/ReviewerAssessmentQueuePage.tsx`](file:///c:/Users/Nishant/Documents/SARATHI/src/pages/reviewer/ReviewerAssessmentQueuePage.tsx) and registered in [`src/App.tsx`](file:///c:/Users/Nishant/Documents/SARATHI/src/App.tsx).

### 8. Modular UI Assembly (< 200 Lines Each)
- Built modular assessment components:
  - `ModeSelect.tsx`: Practice vs Secure mode selector.
  - `RulesConsent.tsx`: Rules disclosure, privacy explanation, and 1.5× extended time accommodation.
  - `QuizPanel.tsx`: Keyboard-accessible MCQ interface with explanation field.
  - `CodeWorkbench.tsx`: Lazy-loaded Monaco editor with real-time test output console.
  - `ProjectTask.tsx`: Multi-file / repo submission interface with rubric criteria accordion.
  - `QuestionPalette.tsx`: Question navigation grid with completed status indicators.
  - `ResultsReport.tsx`: Detailed score report with strengths, improvements, and question review.
  - `SkillGapPlan.tsx`: Targeted diagnostic action plan with recommended resource actions.
  - `IntegrityBanner.tsx`: Non-accusatory environment notice.
  - `CameraCheck.tsx`: Local-only webcam status preview.
  - `AssessmentV2Shell.tsx`: Orchestrator managing mode select, consent, assessment engine, and results.
  - `useAssessmentEngine.ts`: Central state machine coordinating autosave, countdown timer, code runs, and submission.
  - `useCountdown.ts`: High-precision timer with auto-submit on expiry.
  - `useAutosave.ts`: 30-second throttled autosave to sessionStorage and server.

### 9. Verification & DoD Results
- `npm --prefix server test`: **123/123 passed (100% green)** across 20 test suites.
- `npm run test:client`: **39/39 passed (100% green)** across 8 test suites.
- `npx tsc -b`: **Clean (0 errors)**.
- `npx oxlint`: **Clean (0 errors)**.
- `npx vite build`: **Clean (Exit code 0, 653ms)**.

## Skill Assessment V2.1: Sandboxed Execution & Candidate Experience (Completed)

### Phase 1: Sandboxed Runner Architecture & Authoritative State
- **Out-of-Process JavaScript Runner (`isolated-vm`):**
  - Worker: `server/src/services/runner/isolatedVmWorker.js`
  - Driver: `server/src/services/runner/isolatedVmDriver.js`
  - Runs in dedicated child process using `isolated-vm` V8 isolate with 128 MB RAM cap, timeout watchdog, 20 KB output cap, and CommonJS harness. Candidate code never runs in API server process.
- **Python Driver:**
  - `server/src/services/runner/pythonDriver.js`: Probes host for Python 3 runtime; runs isolated child process with timeout and output limit; returns structured diagnostic (`runtime_unavailable`) if host lacks Python.
- **Hardened SQL Driver:**
  - `server/src/services/runner/sqlDriver.js`: Strict `validateSqlQuery` enforces single `SELECT`/`WITH` statements only, blocks mutating commands (`INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`, `PRAGMA`, `ATTACH`, `DETACH`), and caps rows at 1000.
- **Server-Authoritative Timer & Resume:**
  - Schema version 4 migration with `deadline_at TEXT` and `save_version INTEGER NOT NULL DEFAULT 1` in `assessment_sessions`.
  - State endpoint: `GET /api/assessments/v2/sessions/:id/state` returning `remainingSeconds`, `deadlineAt`, `saveVersion`, `draftAnswers`, and `snapshots`.
  - Versioned autosave: `PUT /api/assessments/v2/sessions/:id/answers` checks `saveVersion`, rejecting stale writes with `409 VERSION_CONFLICT`.
  - Deadline + 10s grace period: late submissions grade last recorded autosaved draft instead of losing work.
  - Idempotent submission: repeat submits return cached result cleanly without duplicate processing.
  - Hidden tests inputs and expected outputs are never exposed in any client response.
- **Client Countdown & Autosave Integration:**
  - `useCountdown.ts`: Added `syncDeadline` to synchronize timer against server deadline.
  - `useAutosave.ts`: Added sessionStorage queueing, exponential backoff (2s → 4s → 8s → 30s), and live status (`saved | saving | offline`).
  - `ActiveAssessmentEngine.tsx`: Displays live autosave status pill in header bar.
- **Testing & Quality Tooling:**
  - `scripts/validate-seeds.mjs` (`npm run validate:seeds`): Validates question IDs, types, difficulty (1-3), and $\ge 2$ hidden tests per task across all 5 JSON seed banks.
  - `scripts/check-line-limits.mjs` (`npm run check:lines`): Strictly enforces that every assessment component file stays under 200 lines.
  - Integration suite: `server/src/test/integration/assessment_v2_1_e2e.test.mjs` (7/7 passing).

### Phase 2: Candidate Experience, Accommodations & Review Workflow
- **Accessibility Accommodations:**
  - Updated `src/components/assessment/RulesConsent.tsx` (< 200 lines) with time multiplier (1.0x, 1.5x, 2.0x) and screen reader / accessible input toggles.
  - Automatically enables `pasteAllowed: true` when accommodations are requested or in practice mode.
  - Zero-penalty guarantee: Accommodations are recorded for accessibility without penalizing candidate skill scoring.
- **Integrity Event Batching & Fullscreen Monitoring:**
  - Updated `src/hooks/useIntegrityMonitor.ts` with event queueing and periodic/unload batch flushing.
  - Added fullscreen exit tracking (`fullscreenchange`).
  - Updated server route `POST /api/assessments/v2/sessions/:id/integrity-events` and `IntegrityService.recordBatch` to support batch ingestion.
- **Review Queue & Reviewer Decisions:**
  - Updated `ReviewService.getReviewQueue` with status filtering (`pending_review`, `reviewed`, `flagged`).
  - Updated `ReviewService.recordReview` with mandatory review rationale notes (minimum 5 characters) and audit log persistence.
  - Supports reviewer decisions (`verified`, `cleared`, `flagged`, `concern_confirmed`, `dismissed`).
  - Adjusts `candidate_skills.verification_status` (`verified` vs `unverified`) while strictly preserving candidate technical score.
- **Candidate Results Polish:**
  - Updated `ResultsReport.tsx` (< 200 lines) with verification status banner, evidence counts, and confidence levels.
- **Testing & Verification:**
  - Integration suite: `server/src/test/integration/assessment_v2_1_phase2.test.mjs` (7/7 passing).
  - Server test suite: **142/142 tests passing** across 22 test suites.
  - Client test suite: **39/39 tests passing** across 8 test suites.
  - Code hygiene: `npm run lint` clean (0 errors), `npm run check:lines` passed (all 13 files < 200 lines).
  - Production build: `npm run build` completes cleanly in 867ms.

## Learning Library Expansion (Completed)

### Phase 1: Schema, Migrations & Seed Foundation
- **Database Schema Version 9:**
  - Bumped `SCHEMA_VERSION` to 9 in `server/src/data/schema.js`.
  - Extended `learning_resources` with: `slug` (unique), `resource_type`, `source`, `youtube_video_id`, `youtube_playlist_id`, `channel_name`, `thumbnail_url`, `duration_minutes`, `last_verified_at`.
  - Created `resource_playlist_items` table with `id`, `resource_id`, `position`, `video_id`, `title`, `duration_minutes`, `created_at`.
  - Extended `resource_progress` with `last_position_seconds` (INT) and `completed_item_ids` (JSON).
  - Created indexes `idx_learning_resources_slug` and `idx_playlist_items_resource`.
- **Safe Migration & Backfills:**
  - Idempotent migration step 9 in `server/src/data/migrate.mjs` ensuring existing rows, user bookmarks, and progress remain completely intact.
- **Automated Resource Validator:**
  - Added `scripts/validate-resources.mjs` (`npm run validate:resources`).
  - Verifies required metadata, uniqueness of slugs, domain/type validity, and live network reachability (YouTube oEmbed for video IDs, HTTP for web links, `--skip-network` support).

### Phase 2: Curated 80+ Resource Catalog
- **Catalog Population (`server/src/data/seeds/resourceCatalog.js`):**
  - 81 verified resources across all 5 technical domains:
    - Frontend & Web (`dom-frontend`): 19 resources
    - Backend & System Design (`dom-backend`): 16 resources
    - AI & Machine Learning (`dom-aiml`): 17 resources
    - Cloud & DevOps (`dom-clouddevops`): 14 resources
    - Cybersecurity (`dom-cybersecurity`): 15 resources
  - Format distribution: 42 Videos, 5 Playlists, 20 Documentation guides, 9 Interactive labs, 5 Handbooks.
  - Video/playlist count: 47 (exceeds requirement of >= 36).
  - 100% free with no invented URLs or IDs; excluded/rejected candidates documented in `docs/RESOURCES_TO_VERIFY.md`.

### Phase 3: Video Player Modal & YouTube IFrame API
- **Official YouTube IFrame Embed (`src/components/resources/YouTubeIframe.tsx`):**
  - Uses `https://www.youtube-nocookie.com` host and official `iframe_api`.
  - Dynamic script loading with graceful fallback for network/ad-blocker restrictions.
  - Full event tracking: `onPlay` (sets status to `in_progress`), `onPause` (saves last position), `onNearEnd` (90% watched triggers completion), and `onEnded`.
- **Playlist Navigation Drawer (`src/components/resources/PlaylistDrawer.tsx`):**
  - Shows course chapters, completion checkmarks, duration, active video highlight, and click-to-play.
- **Video Player Modal (`src/components/resources/VideoPlayerModal.tsx`):**
  - Seamless in-app playback, progress badge, manual completion button, and "Open on YouTube" external fallback.
- **Helmet Security Headers:**
  - Configured CSP in `server/src/index.js` for production (`frame-src` for `youtube.com` and `youtube-nocookie.com`, `img-src` for `i.ytimg.com`, `script-src` for `youtube.com/iframe_api`).

### Phase 4: Server-Side Filtering, Sorting & Pagination
- **Server API (`server/src/routes/resourceRoutes.js` & `server/src/services/resourceService.js`):**
  - Supports query parameters: `format` / `type`, `domain`, `level`, `free`, `q` / `search`, `sort` (`recommended`, `newest`, `shortest`, `longest`), `page` (default 1), `pageSize` (12 per page).
  - Parameterized SQL with `LIMIT ? OFFSET ?` and total count metadata.
- **Frontend Filter Bar & Grid (`src/components/resources/ResourceFilters.tsx` & `ResourceCard.tsx`):**
  - Format filter tabs, domain/level dropdowns, duration sort controls, and search input.
  - Responsive cards with video thumbnail, channel name, play icon overlay, duration badge, and progress bar.
  - "Load More" pagination support.

### Phase 5: Gap-Based Recommendations & Stat Cards
- **Personalized Recommendations:**
  - `GET /api/resources/recommendations` and alias `GET /api/resources/recommended`.
  - Calculates overlap between resource `skill_tags` and student's unverified/assessed skill gaps from `candidate_skills` and target role.
  - Returns customized reason strings (e.g. "Targeted to elevate your proficiency in React").
  - Graceful fallback for unassessed students.
- **Live Counters (`src/components/resources/ResourceStats.tsx`):**
  - Stat cards for In Progress, Completed, and Saved items that update instantly with optimistic UI.

### Phase 6: Test Suites & Verification
- **Backend Integration Suite (`server/src/test/integration/resources_v2.test.mjs`):**
  - 7 comprehensive tests covering catalog size, pagination, filtering, sorting, progress saving, per-user isolation, and seed idempotency.
- **Client Vitest Suite (`src/test/resourcesPage.test.tsx`):**
  - 5 tests covering component rendering, format switching, video modal playback, and progress update API dispatch.
- **Verification Results:**
  - Server test suite: **223/223 passed (33 suites, 0 failures)**
  - Client test suite: **96/96 passed (17 suites, 0 failures)**
  - Seed validation: `npm run validate:seeds` passed.
  - Resource validation: `npm run validate:resources` passed (81 resources live-verified).
  - Production build: `npm run build` completed in 1.65s.
  - Line limits: All components in `src/components/resources` and `src/pages/student/ResourcesPage.tsx` strictly under 300 lines.



