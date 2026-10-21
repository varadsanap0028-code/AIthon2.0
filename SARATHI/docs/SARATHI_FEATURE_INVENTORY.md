# SARATHI AI — Complete Feature Inventory & Implementation Matrix

> **Scope:** Full repository audit across Student, Recruiter, College, and Reviewer portals.  
> **Status Classifications:**
> - **Verified Functional:** Fully connected to backend endpoints, verified with integration tests, and backed by SQLite.
> - **Partially Implemented:** Functional in the UI with local Context/Storage persistence; backend API exists or is in transition.
> - **Mock / Prototype:** Rich frontend interactive presentation backed by client mock data (requires backend service binding for production).
> - **Experimental / Flagged:** Active under feature flag (`VITE_ASSESSMENT_V2`).

---

## 0. Public & Authentication Routes (Global)

| Feature Name | Route Path | Implementation Status | Primary Frontend Files | Backend Endpoints & Services | SQLite Database Tables | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Landing Page** | `/` | **Verified Functional** | `LandingPage.tsx`, `PublicLayout.tsx` | N/A (Marketing / Static) | N/A | Features value propositions, role showcase, and CTA links. |
| **Login Surface** | `/login` | **Verified Functional** | `LoginPage.tsx`, `AuthContext.tsx` | `POST /api/auth/login`, `GET /api/auth/mode`, `authService.js` | `users`, `candidate_profiles` | Supports 3-portal switching, quick demo fast-fill, and Google Sign-In. |
| **Candidate Registration** | `/signup` | **Verified Functional** | `SignupPage.tsx`, `AuthContext.tsx` | `POST /api/auth/register`, `authService.js` | `users`, `candidate_profiles` | UI route is `/signup`; dispatches to backend endpoint `/api/auth/register`. |
| **Password Recovery** | `/forgot-password` | **Verified Functional** | `ForgotPasswordPage.tsx` | `POST /api/auth/forgot-password` | `password_resets`, `users` | Generates reset tokens with 1-hour expiration. |
| **Password Reset** | `/reset-password` | **Verified Functional** | `ResetPasswordPage.tsx` | `POST /api/auth/reset-password` | `password_resets`, `users` | Validates token hash and updates user password hash. |
| **Public Verifiable Passport** | `/passport/:publicId` | **Verified Functional** | `PublicPassportPage.tsx` | `GET /api/passport/share/:publicId` | `passport_shares`, `candidate_skills`, `users` | Publicly accessible verification credential; no authentication required. |
| **404 Not Found** | `*` (Catch-all) | **Verified Functional** | `NotFoundPage.tsx` | N/A | N/A | Graceful fallback route with return-home CTA. |

---

## 1. Student Portal Features (`/student/*`)

| Feature Name | Implementation Status | Primary Frontend Files | Backend Endpoints & Services | SQLite Database Tables | Outstanding Work / Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Authentication & Session** | **Verified Functional** | `LoginPage.tsx`, `AuthContext.tsx` | `/api/auth/login`, `/api/auth/me`, `authService.js` | `users`, `candidate_profiles` | Remember Me state currently saves to `sessionStorage`; should add `localStorage` persistence. |
| **Career Dashboard** | **Verified Functional** | `DashboardPage.tsx`, `useDashboardData.ts`, `KpiRow.tsx`, `SkillRadarCard.tsx` | `GET /api/analytics/student`, `studentAnalyticsService.js` | `candidate_skills`, `skills`, `assessment_results` | Single source of truth merges server telemetry with client context. |
| **Skill Assessment V1 (Legacy)** | **Verified Functional** | `AssessmentPage.tsx`, `mockAssessments.ts` | Client scoring engine + `SkillSyncService.ts` | Local storage + `candidate_skills` | Fallback mode active when `VITE_ASSESSMENT_V2=false`. |
| **Skill Assessment V2 (Proctored)** | **Verified Functional** (Flagged: `VITE_ASSESSMENT_V2=true`) | `AssessmentV2Shell.tsx`, `ActiveAssessmentEngine.tsx`, `CodeWorkbench.tsx`, `CameraCheck.tsx` | `/api/v2/assessment/*`, `assessmentV2Routes.js`, `runnerDriver.js`, `gradingService.js` | `assessment_sessions`, `assessment_questions`, `code_tests`, `submission_snapshots`, `integrity_events`, `session_scores` | Supports Practice vs Secure mode, webcam integrity checks, local/Judge0 code execution, and rubric evaluation. |
| **Skill Gap Analysis** | **Verified Functional** | `SkillGapPage.tsx`, `StudentContext.tsx` | `domainsCatalog.ts` + `GET /api/resources` (`resourceRoutes.js`) | `skills`, `domains`, `learning_resources` | Evaluates verified/assessed skills against target role benchmarks; matches curated learning resources. |
| **Dynamic Learning Roadmap** | **Verified Functional** | `RoadmapPage.tsx`, `DomainRoleSelector.tsx`, `domainRoadmaps.ts` | `GET/POST /api/roadmap`, `roadmapService.js` | `student_roadmaps` | Switching target domain immediately updates curriculum milestones and prioritizes identified skill gaps. |
| **Project & Evidence Portfolio** | **Verified Functional** | `ProjectsPage.tsx`, `SkillSyncService.ts` | `POST /api/candidates/github/import`, `POST /api/candidates/evidence` | `skill_evidence`, `candidate_profiles` | Auto-imports repositories, topics, and languages from GitHub API; submits evidence for recruiter review. |
| **Verifiable Skill Passport** | **Verified Functional** | `SkillPassportPage.tsx` | `GET /api/passport/share`, `POST /api/passport/share/toggle`, `passportShareRoutes.js` | `passport_shares`, `candidate_skills` | Generates shareable public token URL (`/passport/:publicId`) with cryptographic verification badges. |
| **Opportunities & Applications** | **Verified Functional** | `OpportunitiesPage.tsx`, `opportunityService.ts` | `GET /api/jobs`, `GET /api/pipeline/my-applications`, `POST /api/pipeline/apply` | `jobs`, `applications`, `application_stage_history`, `interviews` | Allows candidates to apply, track multi-stage interview progress, and view interview invitations. |
| **AI Career Assistant Chatbot** | **Verified Functional** | `FloatingChatbot.tsx`, `ChatWindow.tsx`, `ChatMessageItem.tsx` | `POST /api/chat`, `aiChatService.js` | `users`, `candidate_profiles` (context injection) | Multi-provider support: Google Gemini (`gemini-1.5-flash`), OpenAI (`gpt-4o-mini`), and local knowledge base fallback. |
| **Expanded Learning Library** | **Verified Functional** | `ResourcesPage.tsx`, `VideoPlayerModal.tsx`, `YouTubeIframe.tsx`, `PlaylistDrawer.tsx`, `ResourceCard.tsx`, `ResourceFilters.tsx` | `GET /api/resources`, `GET /api/resources/recommendations`, `GET /api/resources/:id/playlist`, `POST /api/resources/:id/progress`, `POST /api/resources/:id/bookmark` | `learning_resources`, `resource_playlist_items`, `resource_bookmarks`, `resource_progress` | 81 live-verified free resources (47 videos/playlists) across 5 technical domains. In-app YouTube IFrame playback via youtube-nocookie.com, chapter playlist tracking, duration sorting, server-side pagination (12/page), and gap-based recommendations. |
| **Candidate Profile & Resume** | **Partially Implemented** | `ProfilePage.tsx`, `ResumePage.tsx` | `PUT /api/candidates/profile`, `candidateService.js` | `candidate_profiles`, `users` | Resume builder UI is functional; PDF export uses client-side rendering. |
| **Notifications & System Alerts** | **Verified Functional** | `StudentLayout.tsx`, `Navbar.tsx` | `GET /api/notifications`, `PATCH /api/notifications/:id/read` | `notifications` | Supports unread badge counter, individual mark-as-read, and mark-all-read. |
| **User Settings & Privacy** | **Verified Functional** | `SettingsPage.tsx` | `GET/PUT /api/settings`, `settingsRoutes.js` | `user_settings` | Email digest, roadmap alerts, and job notification preferences saved in SQLite. |

---

## 2. Recruiter & Employer Portal Features (`/recruiter/*`)

| Feature Name | Implementation Status | Primary Frontend Files | Backend Endpoints & Services | SQLite Database Tables | Outstanding Work / Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Recruiter Dashboard** | **Verified Functional** | `RecruiterDashboard.tsx` | `GET /api/analytics/recruiter`, `analyticsService.js` | `jobs`, `applications`, `candidates` | Real metrics on active listings, applicant pipeline funnel, and candidate scores. |
| **Candidate Talent Discovery** | **Verified Functional** | `RecruiterCandidatesPage.tsx` | `GET /api/candidates/search`, `candidateService.js`, `matchingService.js` | `users`, `candidate_profiles`, `candidate_skills` | Multi-dimensional skill search, experience filters, and explainable match score algorithm. |
| **Job Requisitions Management** | **Verified Functional** | `RecruiterJobsPage.tsx` | `GET/POST /api/jobs`, `jobService.js` | `jobs`, `job_skill_requirements` | Draft, publish, edit, and archive job openings with weighted skill requirements. |
| **Hiring Pipeline Tracking** | **Verified Functional** | `RecruiterPipelinePage.tsx` | `/api/pipeline/*`, `pipelineService.js` | `applications`, `application_stage_history` | Kanban/table interface to advance candidates across 11 stages with audit logging. |
| **Interview Scheduling & Feedback**| **Verified Functional** | `RecruiterInterviewsPage.tsx` | `GET/POST /api/interviews`, `POST /api/feedback/interview` | `interviews`, `interview_participants`, `interview_feedback` | Schedules technical/behavioral rounds and records scorecard rubric evaluations. |
| **Skill Verifications Review** | **Verified Functional** | `RecruiterVerificationsPage.tsx` | `GET/POST /api/verifications`, `verificationService.js` | `skill_evidence`, `verification_reviews` | Review candidate-submitted project repos and issue verified skill badges. |
| **Assessment Invitations** | **Verified Functional** | `RecruiterAssessmentsPage.tsx` | `GET/POST /api/assessments/assignments` | `assessment_assignments`, `assessment_templates` | Assign coding challenges or MCQ assessments to specific candidates. |
| **Candidate Comparison Tool** | **Verified Functional** | `RecruiterComparisonsPage.tsx` | `matchingService.js` | In-memory evaluation against active job requirements | Side-by-side radar comparison of candidates. |
| **Organization & Team Management**| **Verified Functional** | `RecruiterCompanyPage.tsx`, `RecruiterTeamPage.tsx` | `GET /api/organizations/current`, `organizationService.js` | `organisations`, `organisation_memberships` | RBAC scoping to active organisation (`org_id`). |

---

## 3. College & Institutional Placement Portal Features (`/college/*`)

| Feature Name | Implementation Status | Primary Frontend Files | Backend Endpoints & Services | SQLite Database Tables | Outstanding Work / Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Institutional Dashboard** | **Mock / Prototype** | `CollegeDashboard.tsx` | Uses `mockRecruiterCollege.ts` frontend fixture | N/A (Client Mock) | Comprehensive presentation of placement % (78%), average readiness (79%), department breakdowns (CSE, IT, AI/DS, ECE), and upcoming campus drives. Needs dedicated Express routes to aggregate student cohort SQLite data. |
| **Cohort & Department Breakdown** | **Mock / Prototype** | `CollegeDashboard.tsx` | Frontend state | N/A (Client Mock) | Tracks student counts, assessment rates, and at-risk students per department. |
| **Placement Drives Schedule** | **Mock / Prototype** | `CollegeDashboard.tsx` | Frontend state | N/A (Client Mock) | Visual drive calendar showing visiting companies and applicant counts. |

---

## 4. Assessment Reviewer & Proctoring Portal Features (`/reviewer/*`)

| Feature Name | Implementation Status | Primary Frontend Files | Backend Endpoints & Services | SQLite Database Tables | Outstanding Work / Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Assessment Review Queue** | **Verified Functional** | `ReviewerAssessmentQueuePage.tsx` | `GET /api/v2/assessment/review/queue`, `reviewService.js` | `assessment_sessions`, `integrity_events`, `integrity_reviews` | Lists flagged secure assessment sessions requiring human decision. |
| **Integrity Review Decision** | **Verified Functional** | `ReviewerAssessmentQueuePage.tsx` | `POST /api/v2/assessment/review/:sessionId/decision` | `integrity_reviews`, `session_scores` | Reviewers record decision (`no_concern`, `needs_followup`, `concern_confirmed`) with notes. |

---

## 5. Shared Infrastructure & Cross-Cutting Components

| Component / Service | Responsibility | Verification Status | Files |
| :--- | :--- | :--- | :--- |
| **`apiClient`** | Axios-like Fetch client with Bearer auth header injection | Verified Functional | `src/services/apiClient.ts` |
| **`StorageService`** | User-scoped client fallback storage | Verified Functional | `src/services/storageService.ts` |
| **`DomainRoleSelector`** | Reusable 6-domain / 24-role interactive taxonomy picker | Verified Functional | `src/components/common/DomainRoleSelector.tsx` |
| **`Card`, `Button`, `Badge`** | Core design system atomic UI primitives | Verified Functional | `src/components/common/` |
| **`Modal`** | Accessible overlay dialog with portal rendering | Verified Functional | `src/components/common/Modal.tsx` |
| **`databaseRepository`** | Transactional parameterized SQLite interface | Verified Functional | `server/src/data/repository.js` |
