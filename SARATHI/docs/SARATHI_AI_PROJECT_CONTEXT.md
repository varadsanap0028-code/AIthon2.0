# SARATHI AI — Master Project Context & Engineering Architecture

> **Purpose:** Canonical technical orientation document for AI assistants (Antigravity, Claude, etc.) and software engineers onboarding to the Sarathi AI codebase.  
> **Last Verified:** October 2026  
> **Repository:** Full-Stack Monorepo (React 18 + Vite 8 Frontend / Node.js 24 + Express 5 Backend / SQLite 3 Database)

---

## 1. System Overview & Multi-Portal Architecture

Sarathi AI is an AI-powered talent readiness, verification, and placement platform operating across three interconnected portal ecosystems:

```
                              [ SARATHI AI PLATFORM ]
                                         │
        ┌────────────────────────────────┼────────────────────────────────┐
        ▼                                ▼                                ▼
[ Student Portal ]              [ Recruiter Portal ]             [ College Portal ]
  Route: /student/*               Route: /recruiter/*              Route: /college/*
  Persona: Job Seekers            Persona: Talent Acquisition      Persona: Placement Cells
  Key Capabilities:               Key Capabilities:                Key Capabilities:
  • AI Skill Assessments          • Verified Talent Search         • Cohort Benchmarking
  • Skill Gap Analytics           • Job Postings & Pipelines       • Readiness Tracking
  • Adaptive Roadmaps             • Interview Scheduling           • Department Analytics
  • Skill Passport                • Proctored Review Queue         • Placement Drives
```

### Operational Modes
1. **Demo / Standalone Mode (`ENABLE_DEMO_AUTH=true` / `VITE_APP_MODE=demo`):**
   - Instant 1-click persona switching (`student@sarathi.ai`, `recruiter@nextech.com`, `placement@nit.edu`).
   - Mock assessment questions, simulated Google OAuth, pre-seeded candidate benchmarks.
2. **Production Mode (`ENABLE_DEMO_AUTH=false`):**
   - Scrypt/Argon2 password hashing, strict SQLite multi-tenant boundaries.
   - Google OAuth 2.0 token cryptographic verification (`google-auth-library`).
   - Institutional admin provisioning required for college accounts.

---

## 2. Technology Stack & Key Dependencies

| Domain | Technology | Key Libraries / Drivers | Location |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | React 18.3 (TypeScript 5.6) | React Router DOM 6.28, Context API | `src/` |
| **Styling & Design** | Tailwind CSS v4 | `@tailwindcss/vite`, `@theme` tokens in `src/index.css` | `src/index.css` |
| **Iconography** | Lucide React | `lucide-react ^0.460.0`, `react-icons ^5.5.0` | `package.json` |
| **Charts & Visuals** | Recharts | `recharts ^2.13.0` | `src/pages/student/dashboard/` |
| **Backend Runtime** | Node.js >=20 (ES Modules) | Express 5.0, CORS, Cookie-Parser | `server/src/app.js` |
| **Database** | Node SQLite (`node:sqlite`) | Custom transactional repository wrapper | `server/src/data/repository.js` |
| **Auth & Security** | JWT & Google OAuth | `jsonwebtoken ^9.0.2`, `google-auth-library` | `server/src/services/authService.js` |
| **Assessment Engine** | V2 Hybrid Runner | Local dev runner, isolated code evaluation | `server/src/services/runner/` |
| **AI Integration** | Multi-Provider Chat | Google Gemini (`gemini-1.5-flash`), OpenAI (`gpt-4o-mini`), Local fallback | `server/src/services/aiChatService.js` |

---

## 3. Critical Source File Directory Map

```
SARATHI/
├── src/
│   ├── App.tsx                          # Core React Router switch and route definitions
│   ├── index.css                        # Tailwind v4 theme tokens and global aesthetics
│   ├── context/
│   │   ├── AuthContext.tsx              # Session persistence, JWT decoding, role translation
│   │   ├── StudentContext.tsx           # Student state: target role/domain, gaps, roadmap, readiness
│   │   └── RecruiterContext.tsx         # Recruiter active org and team state
│   ├── layouts/
│   │   ├── StudentLayout.tsx            # Protected layout guard for candidates
│   │   ├── RecruiterLayout.tsx          # Protected layout guard for recruiters
│   │   └── CollegeLayout.tsx            # Protected layout guard for placement officers
│   ├── pages/
│   │   ├── public/                      # LandingPage, LoginPage, RegisterPage, ForgotPassword
│   │   ├── student/                     # StudentDashboard, AssessmentPage, SkillGapPage, RoadmapPage,
│   │   │                                # ProjectsPage, SkillPassportPage, OpportunitiesPage, ResumePage
│   │   ├── recruiter/                   # RecruiterDashboard, Candidates, Jobs, Pipeline, Interviews
│   │   ├── college/                     # CollegeDashboard (cohort analytics, placement metrics)
│   │   └── reviewer/                    # ReviewerAssessmentQueuePage (proctoring & human review)
│   ├── components/
│   │   ├── assessment/                  # V2 Assessment Engine (ActiveAssessmentEngine, CodeWorkbench, etc.)
│   │   ├── chat/                        # FloatingChatbot, ChatWindow, Markdown parser
│   │   └── common/                      # Reusable UI: Card, Button, Badge, Modal, DomainRoleSelector
│   └── services/
│       ├── apiClient.ts                 # Fetch wrapper with Bearer token injection
│       ├── skillSyncService.ts          # Bridges SQLite verified skills with React state
│       └── opportunityService.ts        # Connects jobs and candidate application pipelines
│
├── server/
│   ├── src/
│   │   ├── app.js                       # Express app setup, CORS, JSON parsing, route mounting
│   │   ├── index.js                     # HTTP server startup on port 4000
│   │   ├── routes/                      # 19 REST route files (auth, analytics, assessment, pipeline, etc.)
│   │   ├── services/                    # Business logic: auth, candidate, assessmentV2, aiChat, pipeline
│   │   └── data/
│   │       ├── schema.js                # SQLite DDL schema (v4, 25+ tables)
│   │       ├── repository.js            # SQL query helper (`queryOne`, `queryAll`, `execute`, `transaction`)
│   │       └── seeds/                   # Question seeds, taxonomies, and benchmark data
│   └── test/                            # Integration test suites (142 tests passing via node --test)
```

---

## 4. Key Data Flows & Architectural Invariants

### 1. Role Translation Invariant
- **Database Schema:** Candidate accounts are stored with `users.role = 'candidate'`.
- **Frontend State:** React components consume `user.role === 'student'`.
- **Translation Point:** `AuthContext.tsx` (`mapBackendUserToProfile`) translates `'candidate'` $\rightarrow$ `'student'`. Never bypass this translation.

### 2. Career Readiness Calculation
- The Career Readiness Score is **not** an arbitrary number.
- `StudentContext.tsx` calculates readiness by comparing the student's **verified / assessed skills** (`proficiencyLevel`) against the target role's required skill thresholds defined in `domainsCatalog.ts`.
- Formula: $\text{Readiness \%} = \min\left(100, \frac{\sum \text{Demonstrated Points}}{\sum \text{Required Points}} \times 100\right)$.
- If no assessment has been taken, readiness is `null` (or displays diagnostic guidance).

### 3. Dynamic Roadmap Adaptation
- When a student changes their Target Domain or Role (e.g. from *Web Development* to *AI & Data Science*), `StudentContext.setTargetRole` immediately:
  1. Resolves the canonical domain track.
  2. Queries `getDomainRoadmap` to build the curriculum.
  3. Re-orders tasks by prioritizing detected skill gaps via `prioritizeRoadmapTasksWithGaps`.
  4. Hydrates completed task states from SQLite (`/api/roadmap`).

### 4. V1 vs V2 Assessment Engine
- Controlled by environment flag: `VITE_ASSESSMENT_V2=true`.
- **V1 (`LegacyAssessmentPage`):** Client-side MCQ + basic code editor with client evaluation.
- **V2 (`AssessmentV2Shell`):** Server-backed proctored engine with:
  - Practice vs Secure modes.
  - Camera check and environment integrity monitoring (`integrityService.js`).
  - Code workbench with hidden test cases and execution runner (`runnerDriver.js`).
  - Human review queue for flagged attempts (`/reviewer/queue`).

---

## 5. Development Conventions & Anti-Patterns

### Strict Rules for Future AI Sessions
1. **Do Not Introduce Heavy UI Libraries:** Use Tailwind CSS v4 utility classes and Lucide React icons. Do not install MUI, AntD, or Chakra.
2. **Do Not Trust Client Role Headers:** Selecting a tab in the UI never grants permissions. Authorization is strictly enforced by server JWT token claims.
3. **Preserve Demo Mode:** Always support instant evaluation when `ENABLE_DEMO_AUTH=true`. Do not hardcode mandatory third-party API credentials that break offline dev.
4. **Maintain File Modularity:** Keep React components under 300 lines by breaking them into logical subcomponents.
5. **Database Queries:** Always use parameterized SQL statements through `repository.queryAll(sql, [params])` to prevent SQL injection.

---

## 6. Common Commands & Verification

```bash
# Run Development Servers (Concurrent Frontend + Backend)
npm run dev

# Run Frontend Vitest Client Tests
npm run test:client

# Run Backend Node Test Suites
npm test

# Check Database Schema & Tables
node server/src/data/schemaCheck.mjs
```
