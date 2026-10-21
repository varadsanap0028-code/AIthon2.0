# SARATHI Project Architecture & Progress Audit Report

**Date of Audit:** October 11, 2026  
**Auditor:** Full-Stack & Systems Architecture Review  
**Repository:** `Sarathi`  
**Application Target:** AI-Assisted Skill Verification, Career Intelligence, and Recruiter Hiring Platform  

---

## Executive Summary

SARATHI is currently in a **hybrid architectural state**. It consists of two fundamentally distinct architectural models operating within the same repository:

1. **Recruiter & Employer Platform**: A **full-stack, production-grade enterprise subsystem** built on Node.js/Express with a normalized 27-table SQLite database (`node:sqlite`), multi-tenant RBAC, explainable candidate matching, Kanban pipeline tracking, verification review workflows, and live persisted KPI analytics.
2. **Student & College Portal**: A **rich, interactive client-side application** with functional diagnostic assessments and gap analysis, but currently persisting strictly to browser `localStorage` and `sessionStorage`, relying on static mock data catalogs and mock opportunity listings rather than connecting to the backend SQLite database.

The application compiles cleanly with zero TypeScript errors (`tsc -b`), builds for production via Vite (`vite build`), and all 9 backend unit/integration tests pass with 100% success. However, there is a fundamental functional disconnect: **student activity in the browser does not persist to the recruiter database**, and **recruiter job postings are not visible in the student opportunities catalog**.

---

## 1. Technology Stack Breakdown

| Layer | Technologies & Libraries | Config / Details |
|---|---|---|
| **Frontend Framework** | React 19.2.8, TypeScript 6.0.2 | Single Page App configured via Vite 8.3.4 |
| **Styling & Design System** | Tailwind CSS 4.3.3 (`@tailwindcss/vite`) | Custom components (`Card`, `Button`, `Badge`, `ProgressBar`, `Modal`), Lucide React icons (`v1.55.0`) |
| **Data Visualization** | Recharts 3.10.1 | Responsive containers, Line charts, Bar charts, hiring funnels |
| **Routing** | React Router DOM 7.18.4 | Browser router with `/student/*`, `/recruiter/*`, and public `/login`, `/signup` routes |
| **Backend API** | Node.js 24 (`ES Modules`), Express 5.1.0 / 5.3.0 | REST architecture with 10 modular route handlers, JSON body parsing, CORS middleware |
| **Database & ORM** | Native `node:sqlite` (`DatabaseSync`) | Embedded SQLite 3 in Write-Ahead Logging (`WAL`) mode with foreign key enforcement and parameterized queries via `repository.js` |
| **Authentication (Backend)** | `bcryptjs 3.0.3`, `jsonwebtoken 9.0.3` | Password hashing with salt factor 10, JWT token issuance with 7-day expiry, role middleware |
| **Authentication (Frontend)** | Custom `AuthContext` + `StorageService` | Local browser registry (`localStorage`), hardcoded demo profiles (`student`, `recruiter`, `college`) |
| **Third-Party Services** | `@supabase/supabase-js 2.117.3` | Installed and stubbed in `src/services/supabase.ts`, but completely **inactive / unconfigured** (no `.env` credentials) |
| **Testing & Quality** | Node.js Native Test Runner (`node --test`), Oxlint 1.81.0 | 9 automated unit/integration tests; linting configured for both client and server |

---

## 2. Implemented Features & Modules Audit

### A. Recruiter & Employer Platform (`/recruiter/*`)
**Status:** **Fully Implemented (Full-Stack)**

The Recruiter Portal is completely backed by the Express REST API and SQLite database. None of its core metrics or workflows are fake or hardcoded.

- **Persistent Enterprise Shell ([RecruiterLayout.tsx](file:///c:/Users/Administrator/Documents/Sarathi/src/layouts/RecruiterLayout.tsx))**:
  - Collapsible responsive sidebar with 13 functional sections.
  - Multi-tenant Organization Switcher (`Sarathi Enterprise Systems` vs `Apex Cloud Innovations`).
  - Global candidate & skill search bar.
  - Instant portal switcher back to `/student/dashboard`.
  - Notification badge linked to pending evidence submissions.
- **Executive Dashboard ([RecruiterDashboard.tsx](file:///c:/Users/Administrator/Documents/Sarathi/src/pages/recruiter/RecruiterDashboard.tsx))**:
  - Live KPIs dynamically queried from SQLite (`activeJobs`, `totalApplicants`, `shortlistedCandidates`, `skillVerifiedCandidates`, `pendingReviews`, `interviewsScheduled`).
  - 5-stage recruitment funnel chart (Applied $\rightarrow$ Shortlisted $\rightarrow$ Assessment $\rightarrow$ Interview $\rightarrow$ Hired).
  - Recommended candidates matched dynamically against active organization jobs.
  - Recent activity audit feed.
- **Job & Posting Management ([RecruiterJobsPage.tsx](file:///c:/Users/Administrator/Documents/Sarathi/src/pages/recruiter/RecruiterJobsPage.tsx))**:
  - Complete Job CRUD with title, description, domain, department, experience, work arrangement, and salary range.
  - State machine enforcing lifecycle: `draft` $\rightarrow$ `published` $\rightarrow$ `paused` $\rightarrow$ `closed` $\rightarrow$ `archived`.
  - Weighted skill requirement builder (Required vs Preferred, proficiency level 1–5, weights, assessment requirements).
- **Candidate Discovery & Server-Side Filtering ([RecruiterCandidatesPage.tsx](file:///c:/Users/Administrator/Documents/Sarathi/src/pages/recruiter/RecruiterCandidatesPage.tsx))**:
  - Server-side multi-parameter filtering: query, domain, skill, verification status (`verified`, `evidence_submitted`), experience, and work arrangement.
  - Dual Grid / List layout with readiness indicators, verified skill badges, and repository metrics.
- **Candidate Skill Passport Inspector ([CandidatePassportModal.tsx](file:///c:/Users/Administrator/Documents/Sarathi/src/components/recruiter/CandidatePassportModal.tsx))**:
  - Multi-tab inspection drawer/modal covering verified skills, submitted evidence dossier with provenance links, assessment attempts & rubric scores, and audit history.
  - Supplemental evidence request dialog triggering backend `evidence_requests` notifications.
- **Verification Review Queue ([RecruiterVerificationsPage.tsx](file:///c:/Users/Administrator/Documents/Sarathi/src/pages/recruiter/RecruiterVerificationsPage.tsx))**:
  - Assessor review workflow for candidate evidence (GitHub PRs, test suites, architecture docs).
  - Enforces mandatory decision rationale and awarded proficiency level (1–5).
  - Automatically updates `candidate_skills` status upon approval.
- **Explainable Candidate Matching Engine ([matchingService.js](file:///c:/Users/Administrator/Documents/Sarathi/server/src/services/matchingService.js))**:
  - Deterministic algorithm combining Required Skill Coverage (50%), Proficiency Alignment (25%), Relevant Assessments (15%), and Preferred Skills (10%).
  - Provides mathematical breakdown explaining why candidate received their match percentage.
- **Pipeline Kanban & Applications ([RecruiterPipelinePage.tsx](file:///c:/Users/Administrator/Documents/Sarathi/src/pages/recruiter/RecruiterPipelinePage.tsx))**:
  - 11-stage recruitment pipeline with drag/move stage transitions, candidate notes, and stage history audit tracking.
- **Interviews Management ([RecruiterInterviewsPage.tsx](file:///c:/Users/Administrator/Documents/Sarathi/src/pages/recruiter/RecruiterInterviewsPage.tsx))**:
  - Interview scheduler with candidate association, interview type, meeting links, and 5-point rubric evaluation feedback.
- **Side-by-Side Candidate Comparison ([RecruiterComparisonsPage.tsx](file:///c:/Users/Administrator/Documents/Sarathi/src/pages/recruiter/RecruiterComparisonsPage.tsx))**:
  - 2 to 4 candidate matrix comparison across match scores, verified competencies, repositories, and assessments.
- **Team & RBAC ([RecruiterTeamPage.tsx](file:///c:/Users/Administrator/Documents/Sarathi/src/pages/recruiter/RecruiterTeamPage.tsx))**:
  - Multi-tenant role management (`owner`, `recruiter`, `assessor`, `reviewer`) scoped to active organization.

---

### B. Student Portal (`/student/*`)
**Status:** **Partially Implemented (Client-Side & Mock Only)**

The Student Portal offers rich, polished UI workflows, but operates entirely isolated in browser `localStorage`.

- **Student Dashboard ([StudentDashboard.tsx](file:///c:/Users/Administrator/Documents/Sarathi/src/pages/student/StudentDashboard.tsx))**:
  - **Working**: Dynamic greeting, onboarding checklist for new users, role readiness meter, verified skills tags, roadmap progress. Starts clean at zero for newly registered emails.
  - **Limitation**: Reads and writes exclusively to `localStorage` (`sarathi_<userId>_skills`, `sarathi_<userId>_roadmap`). Does not synchronize with the backend database.
- **Skill Assessment ([AssessmentPage.tsx](file:///c:/Users/Administrator/Documents/Sarathi/src/pages/student/AssessmentPage.tsx))**:
  - **Working**: 4-stage assessment workflow: Intro $\rightarrow$ Multi-choice diagnostic quiz $\rightarrow$ Interactive code editor for practical tasks with starter code and test execution $\rightarrow$ Results breakdown.
  - **Limitation**: Questions and coding challenges are hardcoded in `src/data/mockAssessments.ts`. The code validation executes client-side string/regex checks rather than a sandboxed code execution backend. Completed scores update `localStorage` only; recruiters cannot see student submissions.
- **Skill Gap Analysis ([SkillGapPage.tsx](file:///c:/Users/Administrator/Documents/Sarathi/src/pages/student/SkillGapPage.tsx))**:
  - **Working**: Compares student demonstrated skills against target role benchmarks in `src/data/domainsCatalog.ts`. Correctly differentiates missing skills, unverified self-reported skills, and verified skills below target proficiency. Recommends learning actions.
  - **Limitation**: Uses static role catalog definitions; cannot analyze student gaps against real recruiter job postings from the database.
- **Skill Passport ([SkillPassportPage.tsx](file:///c:/Users/Administrator/Documents/Sarathi/src/pages/student/SkillPassportPage.tsx))**:
  - **Working**: Printable/exportable verifiable credential passport displaying target role, readiness index, assessed skills, and project evidence. Includes clipboard sharing and print stylesheets.
  - **Limitation**: Client-side only. Does not generate cryptographically signed verification tokens or shareable public verification URLs.
- **Roadmap & Projects ([RoadmapPage.tsx](file:///c:/Users/Administrator/Documents/Sarathi/src/pages/student/RoadmapPage.tsx), [ProjectsPage.tsx](file:///c:/Users/Administrator/Documents/Sarathi/src/pages/student/ProjectsPage.tsx))**:
  - **Working**: Step-by-step milestone checklist with task toggle completion; Project showcase with repository links, live demos, and verified badges.
  - **Limitation**: Stored locally in `localStorage`. Projects cannot be formally submitted to recruiters for review.
- **Jobs & Opportunities ([OpportunitiesPage.tsx](file:///c:/Users/Administrator/Documents/Sarathi/src/pages/student/OpportunitiesPage.tsx))**:
  - **Mock Only**: Displays static job listings from `src/data/mockOpportunities.ts`. Job matching calculates against student local skills, but students cannot apply to jobs created by recruiters in the Recruiter Portal.

---

### C. College & Institutional Portal (`/college/dashboard`)
**Status:** **Mock Only**

- A single page displaying institutional placement readiness statistics, batch skill distributions, and student cohorts using Recharts.
- All numbers are hardcoded in `src/data/mockRecruiterCollege.ts`.
- No institutional backend APIs or student batch management features exist.

---

## 3. Supported Technical Domains

The multi-domain framework is defined in both the backend taxonomy service ([taxonomyService.js](file:///c:/Users/Administrator/Documents/Sarathi/server/src/services/taxonomyService.js)) and frontend catalog ([domainsCatalog.ts](file:///c:/Users/Administrator/Documents/Sarathi/src/data/domainsCatalog.ts)), covering **20 technical domains**:

1. Frontend Development
2. Backend Development
3. Full-Stack Development
4. Mobile App Development
5. AI and Machine Learning
6. Generative AI
7. Data Science
8. Data Engineering
9. Data Analytics
10. Cybersecurity
11. Application Security
12. Cloud Computing
13. DevOps & Platform Engineering
14. Database Engineering
15. Networking
16. QA & Test Automation
17. UI/UX Design
18. Blockchain Development
19. Embedded Systems & IoT
20. Robotics

Each domain includes standard proficiency definitions (Levels 1–5: Beginner, Developing, Proficient, Advanced, Expert) and accepted evidence types (GitHub repositories, test reports, architecture documents, live deployments).

---

## 4. Working vs. Incomplete Functionality Matrix

| Feature / Capability | Recruiter Portal | Student Portal | Working Status | Underlying Persistence |
|---|---|---|---|---|
| **User Sign-up / Login** | Real (`/api/auth/*`) | LocalStorage / Mock | ⚠️ Partial | Backend SQLite vs LocalStorage |
| **Organization Management** | Real (`/api/organizations/*`) | N/A | ✅ Working | SQLite `organizations`, `organization_memberships` |
| **Job Creation & Lifecycle** | Real (`/api/jobs/*`) | Mock Listings | ⚠️ Partial | SQLite `jobs`, `job_skill_requirements` |
| **Skill Taxonomy (20 Domains)** | Real (`/api/taxonomy/*`) | Local Catalog | ✅ Working | SQLite `domains`, `skills` + TS catalog |
| **Candidate Search & Filters** | Real (`/api/candidates/*`) | N/A | ✅ Working | SQLite parameterized queries |
| **Skill Passport Inspection** | Real (`/api/candidates/:id/passport`) | Client Printable | ✅ Working | SQLite joins across 5 tables |
| **Evidence Verification Review** | Real (`/api/verifications/*`) | N/A | ✅ Working | SQLite `verification_reviews`, `skill_evidence` |
| **Technical Assessments** | Real Assignment & Grading API | Interactive Quiz Engine | ⚠️ Disconnected | SQLite assignments vs LocalStorage quiz |
| **Skill Gap Analysis** | Real Role-to-Job Matching | Interactive Role Benchmark | ✅ Working | Deterministic calculation in both |
| **Candidate Pipeline / Kanban** | Real 11-Stage Pipeline | N/A | ✅ Working | SQLite `applications`, `application_stage_history` |
| **Interview Scheduling & Notes** | Real (`/api/interviews/*`) | N/A | ✅ Working | SQLite `interviews`, `interview_feedback` |
| **Candidate Side-by-Side Compare**| Real (`/recruiter/comparisons`)| N/A | ✅ Working | SQLite multi-candidate aggregation |
| **Job Opportunities Matching** | Recruiter views matches | Student views static opps | ⚠️ Disconnected | Different data stores |
| **Institutional / College Analytics**| N/A | Read-only mock dashboard | ❌ Mock Only | Static JSON fixture |

---

## 5. Database, Backend, and API Status

### Database Architecture
- **Engine**: SQLite 3 using Node 24 native `node:sqlite` (`DatabaseSync`).
- **File Location**: `server/data/database.db`.
- **Mode**: Write-Ahead Logging (`WAL`), `foreign_keys = ON`, `busy_timeout = 5000`.
- **Schema Management**: Version-controlled migrations in [migrate.mjs](file:///c:/Users/Administrator/Documents/Sarathi/server/src/data/migrate.mjs) creating **27 normalized tables** with unique constraints and performance indexes.
- **Seeder**: Comprehensive development seeder in [seeder.mjs](file:///c:/Users/Administrator/Documents/Sarathi/server/src/seeder/seeder.mjs) populating 2 organizations, 8 users, 20 domains, 27 skills, 5 jobs across various lifecycle stages, 4 candidate profiles with evidence, assessment results, and scheduled interviews.

### Backend REST API Endpoints
All endpoints are active on `http://localhost:4000` (and proxied via `/api/*` from `http://localhost:5173`):
- `GET /api/health`: Health status.
- `POST /api/auth/register`, `POST /api/auth/login`: User creation & JWT issuance.
- `GET /api/taxonomy/domains`, `GET /api/taxonomy/skills`: Multi-domain taxonomy.
- `GET, POST /api/jobs`, `GET, PUT, DELETE /api/jobs/:id`, `PATCH /api/jobs/:id/status`: Job CRUD & state transitions.
- `GET /api/candidates`, `GET /api/candidates/:id/passport`: Candidate discovery & passport inspection.
- `POST /api/candidates/:id/match`: Explainable candidate-job matching.
- `GET /api/verifications/pending`, `POST /api/verifications/:id/review`: Evidence review workflows.
- `GET /api/assessments/templates`, `POST /api/assessments/assignments`: Assessment integration.
- `GET /api/pipeline/applications`, `PATCH /api/pipeline/applications/:id/stage`: Application pipeline tracking.
- `GET, POST /api/interviews`: Interview scheduling & rubric feedback.
- `GET /api/analytics/dashboard`: Dynamic live KPI calculations.
- `GET /api/organizations/current`, `GET, POST /api/organizations/current/members`: Multi-tenant RBAC.

---

## 6. Bugs, Security Issues & Technical Limitations

### 1. Architectural & Data Disconnect (Critical)
- **Student-Recruiter Isolation**: The Student Portal does not communicate with the backend Express API. When a student registers, takes an assessment, or adds a project, data is stored in their browser's `localStorage`. Recruiters see only what is seeded in SQLite. A student cannot actually apply to a recruiter's job, and a recruiter cannot review a live student's evidence.

### 2. Authentication & Authorization Security Gaps (High)
- **Fallback Recruiter Impersonation**: In `server/src/middleware/authMiddleware.js`, if a request arrives without a JWT `Authorization: Bearer <token>` header, the backend defaults to assigning the first recruiter user from the SQLite database. While convenient for local prototyping, this allows anyone with network access to mutate recruiter data if exposed beyond localhost.
- **Hardcoded JWT Secret Default**: In `server/src/config/index.js`, `auth.secret` falls back to `'sarathi-dev-secret-change-me'` when `JWT_SECRET` is unset.
- **Unverified Candidate Evidence URLs**: The candidate evidence submission accepts arbitrary external URLs without file upload virus scanning or domain allowlisting.

### 3. Client-Side Assessment Integrity (Medium)
- **Local Assessment Evaluation**: Student quiz answers and test cases are evaluated entirely in the browser using client-side JavaScript. Correct answer indices exist in the frontend bundle (`mockAssessments.ts`), allowing users to view answers via browser DevTools.
- **Regex-Based Practical Coding**: Practical tasks in the student assessment are validated using regex pattern matching rather than a sandboxed code runner (e.g., Docker container or remote evaluator).

### 4. Supabase Dependency Dead Code (Low)
- `@supabase/supabase-js` is imported in `src/services/supabase.ts`, but no valid environment variables exist, causing `isSupabaseConfigured` to permanently return `false`. This adds unnecessary dependency weight without providing cloud persistence.

### 5. Linter Findings (Low)
- Running `npx oxlint` on the frontend flags:
  - **1 Error**: `src/pages/student/AssessmentPage.tsx:199: unused variable totalQuestionsAnswered`.
  - **54 Warnings**: React 19 / React Compiler warnings regarding `setState` calls inside `useEffect` bodies across several pages.

---

## 7. Actual Test & Build Results

All tests and builds were directly executed and verified on the system:

### 1. Backend Test Suite
```bash
npm --prefix server test
```
```
▶ Recruiter Platform Core Workflows & Multi-Tenancy
  ✔ Organization live KPI analytics are computed dynamically from persisted data (43.51ms)
  ✔ Candidate discovery filters correctly by domain, skills, and experience (7.98ms)
  ✔ Tenant isolation: jobs and applicants are scoped to active organization (5.93ms)
  ✔ Job CRUD lifecycle enforces valid state transitions and manages skill requirements (107.01ms)
✔ Recruiter Platform Core Workflows & Multi-Tenancy (167.24ms)
▶ Explainable Candidate Matching Engine
  ✔ separates match score, readiness score, and assessment bonuses (27.53ms)
  ✔ handles candidates applying for different domain roles gracefully (1.03ms)
✔ Explainable Candidate Matching Engine (30.58ms)
▶ Recruitment Pipeline Service
  ✔ validates stage list and preserves stage history (23.55ms)
  ✔ rejects invalid pipeline stages (0.81ms)
✔ Recruitment Pipeline Service (28.46ms)
▶ Skill Verification and Review Workflow
  ✔ enforces mandatory rationale and records decision audit trail (52.15ms)
✔ Skill Verification and Review Workflow (54.68ms)

ℹ tests 9 | pass 9 | fail 0 | cancelled 0 | skipped 0
ℹ duration_ms 854.52ms
```
**Outcome:** **100% Passed (9 of 9 tests).**

### 2. Frontend Production Build
```bash
npm run build
```
```
> tsc -b && vite build
vite v8.3.4 building client environment for production...
✓ 2589 modules transformed.
dist/index.html                     0.45 kB │ gzip:   0.29 kB
dist/assets/index-CkSZHPMX.css     80.06 kB │ gzip:  12.89 kB
dist/assets/index-Ba6F9qg4.js   1,074.74 kB │ gzip: 287.37 kB
✓ built in 3.63s
```
**Outcome:** **Clean Build, 0 TypeScript Errors, Exit Code 0.**

### 3. Server Linting
```bash
npm --prefix server run lint
```
```
Found 7 warnings and 0 errors.
Finished in 98ms on 37 files with 116 rules.
```
**Outcome:** **0 Errors.**

---

## 8. Prioritized Next Steps & Recommendations

### Phase 1: Unify Data Layer (High Priority)
1. **Bridge Student Portal to Backend API**: Create student API endpoints (`/api/student/profile`, `/api/student/skills`, `/api/student/assessments`, `/api/student/applications`) so student actions persist directly into the SQLite database.
2. **Connect Student Opportunities to Real Jobs**: Replace `mockOpportunitiesData` with a query to `/api/jobs?status=published` so students can view and apply to live employer postings.
3. **Connect Recruiter Candidate Pool to Real Students**: Allow registered students to appear directly in the recruiter's candidate discovery search.

### Phase 2: Security & Authentication Hardening (High Priority)
1. **Remove Insecure Recruiter Fallback**: Require valid JWT bearer tokens on all protected `/api/*` routes.
2. **Synchronize Frontend Auth with Backend JWT**: Update `AuthContext` to store and send the JWT received from `POST /api/auth/login`.
3. **Enforce Environment Secrets**: Disallow default fallback strings for `JWT_SECRET` in production mode.

### Phase 3: Technical Assessment Sandboxing (Medium Priority)
1. **Server-Side Evaluation**: Move practical coding task validation to a backend execution service rather than client-side regex matching.
2. **Assessment Integrity**: Prevent assessment question answers from being sent to the browser prior to submission.

### Phase 4: College & Institutional Module (Low Priority)
1. **Cohort Database Modeling**: Create tables for `institutions`, `batches`, and `cohort_analytics` to replace `mockCollegeAnalyticsData`.

---

## 9. Overall Project Rating & Justification

### Overall Rating: **7.5 / 10**

### Rating Breakdown:
- **Architecture & Code Quality (Recruiter Subsystem): 9.0 / 10**  
  *Clean separation of concerns, repository pattern with parameterized SQLite queries, 27 normalized tables, explainable matching formulas, robust error handling, and 100% passing tests.*
- **UI/UX & Design Polish: 8.8 / 10**  
  *Cohesive design language (blue/indigo primary palette, clean cards, responsive layouts, accessible typography, rich interactive states, no garish gradients).*
- **Build & Compilation Health: 9.5 / 10**  
  *TypeScript compiles with zero errors, Vite builds cleanly in under 4 seconds, test runner completes in under 1 second.*
- **System Cohesion & Integration: 4.5 / 10**  
  *The Student Portal and Recruiter Portal are disconnected. The Student Portal operates client-side in `localStorage`, while the Recruiter Portal operates on SQLite. Until student actions write to the database and jobs flow to students, the platform acts as two separate prototypes sharing one frontend.*
- **Security & Production Readiness: 5.5 / 10**  
  *Unauthenticated fallback logic, hardcoded development secrets, and lack of server-side assessment validation need remediation prior to production deployment.*

### Summary
SARATHI has established an exceptional, enterprise-grade foundation on the employer and verification side. Connecting the student frontend to the existing backend API will transform SARATHI into a fully unified, end-to-end skill-verified hiring platform.

---
*Report generated and saved to `docs/SARATHI_PROJECT_PROGRESS_REPORT.md`.*
