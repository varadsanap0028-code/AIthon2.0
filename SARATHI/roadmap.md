# SARATHI Student Portal: "My Roadmap" Improvement
## Product Requirements Document (PRD)

| Field | Value |
|---|---|
| Product | SARATHI, Student Portal, Skill Intelligence, My Roadmap |
| Document type | PRD |
| Version | 1.0 |
| Date | 19 Oct 2026 |
| Status | Draft for implementation |
| Scope | Student Portal "My Roadmap" page and its directly related backend, data, and navigation links. **Recruiter and Employer portals are out of scope. Do not change the Skill Assessment internals** (a separate effort); only *read* its saved results. |

---

## 1. Summary

The current My Roadmap page shows a "Learning Path for Full-Stack Developer" split into 3 stages (for example, *Foundational Core*, *Advanced Systems & Engineering*), each with tasks (HTML5 & Semantic Markup, JavaScript (ES6+), React.js Architecture, TypeScript, and so on). Every task shows a level badge, a "Free Resource" badge, an hour estimate, one official-documentation link, a relevance line, and a **Mark Completed** button. Overall completion is shown as a single percentage.

The page works as a checklist, but it does not yet behave like a *personalized* roadmap. This PRD defines improvements that make the roadmap:

1. Personalized from the student's real, saved skill-assessment and skill-gap data.
2. Honest about progress (self-reported vs. verified) and durable across refresh/login.
3. Richer in learning content (more than one documentation link per task).
4. Easier to act on (a clear "what to do next", pacing, filters).
5. Connected to the rest of SARATHI (Skill Assessment, Skill Gap Analysis, Projects, Skill Passport).
6. Visually clean, responsive, and accessible.

> **Verify before relying on anything here:** inspect the real repository, data model, API, and components. The observations below come from a UI screenshot only, not from code.

---

## 2. Observations from the Current UI (Screenshot Review)

| # | Observation | Why it matters |
|---|---|---|
| 1 | Every visible task has the same relevance text: "Critical foundational skill (Target Level: 4/5)" | Looks generic; does not say *why this task matters to this student* |
| 2 | Every visible task shows the same "6-8 hours" estimate | Looks templated; weak basis for planning |
| 3 | Each task has a single "Official Documentation" link | Docs alone are poor for beginners; no practice, video, or project |
| 4 | Header says "verified free resources" | A claim the product must be able to back up (link checks, license/free status) |
| 5 | Completion is only a manual **Mark Completed** click | Self-reported; no distinction from verified skill growth; accidental clicks and no undo visible |
| 6 | Roadmap shows 0% with no explanation or next step | A student with 0% gets no guidance on where to begin |
| 7 | No visible link to the student's assessment results or skill gaps | Roadmap may not reflect actual weaknesses (to be confirmed in code) |
| 8 | No filters, sorting, or collapse for stages | Long page; stage 2 and 3 push content far down |
| 9 | Floating chat prompt ("Need career or skill advice?") overlaps task-card content near the bottom right | Layout/overlap defect |
| 10 | "Change Career Domain" sits beside completion | Unclear what happens to existing progress when the domain changes |
| 11 | Stages show "0 / 3 Tasks Done" only | No per-stage hours, skills covered, or milestone |
| 12 | Sidebar has "Skill Gap Analysis", "Projects & Portfolio", "Skill Passport" but the roadmap shows no connection to them | Missed loop: learn → build → verify → re-assess |

---

## 3. Goals and Non-Goals

### Goals
- G1. Roadmap content is derived from the student's selected career track **and** their latest saved assessment/skill-gap results when available.
- G2. Every task explains why it appears ("Why this task") using real data, not a generic phrase.
- G3. Progress persists reliably on the server and is isolated per student and per career track.
- G4. Completion distinguishes **self-reported** from **verified** (for example, completed a mini-quiz, linked a project, or improved on re-assessment) where those mechanisms exist or are built.
- G5. A clear "Next recommended task" and a simple pacing view reduce decision fatigue.
- G6. Resource claims ("verified", "free") are backed by a real validation process or are removed.
- G7. The loop "learn → practice/build → re-assess" is visible.
- G8. Page is responsive, accessible, fast, and free of overlap defects.

### Non-Goals
- Changing Recruiter or Employer portals.
- Changing assessment scoring, questions, or secure-mode behavior.
- Building a full course platform or hosting video content.
- Auto-certifying skills from self-reported completion.
- Inventing benchmarks, hour estimates, or resources with no source.

---

## 4. Users and Jobs-to-be-Done

| User | Job |
|---|---|
| New student with no assessment | "Tell me where to start for my target role." |
| Student with assessment results | "Show me what to learn first to close my biggest gaps." |
| Returning student | "Resume where I stopped and see how far I've come." |
| Student switching track | "Switch domains without losing earlier progress." |

---

## 5. Functional Requirements

### FR-1. Personalization from real data
1. If a saved assessment/skill-gap result exists for the selected track, order and highlight tasks by **gap size and importance** (largest gap on a critical skill first).
2. Each task shows a **"Why this task"** line using actual data, for example: current score vs. role benchmark for the related skill, or "Not yet assessed" when no data exists.
3. If no assessment exists, show a clear banner: the roadmap is currently the **standard path** for the track, with a call to action to take the Skill Assessment for a personalized path. Never present the standard path as personalized.
4. Use the latest *completed* attempt for the same track only. Never use another track's results.
5. If assessment data fails to load, show a distinct error state with retry. Do not silently fall back to the generic path while implying personalization.
6. Mark skills already at or above benchmark as "Already strong" (optionally collapsed or lower priority) instead of hiding them silently.

### FR-2. Task card improvements
Each task card should include (only where data exists; omit rather than invent):
- Title, level, skill/category tag.
- Description and **Why this task**.
- Estimated hours, with the source of the estimate defined (curated per resource, or a documented range). Do not show an identical range for every task unless that is genuinely the data.
- **Multiple resources** per task, typed (Official docs, Tutorial, Video, Practice exercise, Mini-project), each with a free/paid indicator.
- Target level and the student's current level for the related skill when known.
- Status: Not started, In progress, Completed (self-reported), Verified.
- Actions: Start, Mark completed, **Undo completion** (with confirmation for destructive undo), open resource.

### FR-3. Evidence-based completion
1. Keep "Mark Completed" but record it as **self-reported** with a timestamp.
2. Offer optional verification paths, scoped to what the app can actually support:
   - Short check quiz for the task, using the existing question infrastructure if suitable.
   - Link the task to a project in **Projects & Portfolio**.
   - Show whether a later saved assessment shows improvement in that skill (read only, from saved results).
3. Show "Verified" only when a real verification event is stored. Otherwise show "Self-reported".
4. Roadmap completion % must state how it is calculated (for example, tasks completed / total tasks, and separately verified tasks). Provide per-stage and per-skill progress.
5. Prevent accidental clicks (undo toast or confirmation).

### FR-4. Progress persistence and isolation
1. Progress is stored server-side per authenticated student, per career track, and per task.
2. Refresh, navigation, and logout/login restore the same state.
3. Backend verifies ownership; never trusts a client-supplied student ID.
4. Marking completed is idempotent (double-click or retry creates no duplicates or inconsistent state).
5. **Change Career Domain** must keep each track's progress separately and tell the student that earlier progress is preserved. Switching back restores it.
6. Show loading, retry, auth-expired, and error states. Never display a failed fetch as 0% progress.

### FR-5. "Next up" and pacing
1. A prominent **Next recommended task** card at the top (based on gap priority and prerequisite order).
2. Optional pacing: student sets weekly study hours; show estimated completion date computed from remaining task hours. Label it clearly as an estimate.
3. Show stage-level summaries: tasks done, total estimated hours, skills covered, and a milestone description.
4. Resume behavior: "Continue where you left off".

### FR-6. Navigation, filters, and layout
1. Collapsible stages (current stage expanded by default; completed stages collapsible).
2. Filters: status, level, resource type, free only. Sort: recommended order, gap size, hours.
3. Sticky or compact progress header on scroll.
4. Fix the chat-launcher overlap so it never covers task content or actions; ensure page bottom padding clears the floating widget.
5. Consistent with SARATHI's existing design system.

### FR-7. Connections to other features
- Link each task's skill to **Skill Gap Analysis** for that skill.
- Link projects-oriented tasks to **Projects & Portfolio**.
- Provide a clear **Re-assess** prompt after a stage is completed (opens Skill Assessment; does not alter assessment logic).
- Show before/after comparison from saved assessment attempts when at least two comparable attempts exist; otherwise show nothing rather than invented trends.
- If a Skill Passport or Resume feature can consume verified completions, expose them there only if that integration already exists or is separately approved.

### FR-8. Resource integrity
1. "Verified free resources" wording is allowed **only** if there is an actual validation process (link reachability checks and a free/licensed flag with a last-checked date). Otherwise change the wording.
2. Build or reuse a resource record with: URL, title, type, provider, cost flag, level, estimated hours, last verified date, status.
3. Handle broken links gracefully (flag, hide, or fall back); provide a way to report a bad link.
4. Open external links safely (`rel="noopener noreferrer"`) and indicate that they open externally.

### FR-9. Roadmap-related AI chat (only if it already exists)
If the floating assistant uses roadmap context, it must read the same saved roadmap/progress data and not invent tasks, progress, or assessment results. Do not create a new chat feature as part of this work.

---

## 6. Data Model Guidance

Inspect existing schema first; **extend, do not duplicate**. Likely needs (adapt to what exists):

- `roadmaps` or equivalent: student_id, track/domain, generated_from (standard | assessment_attempt_id), generated_at, version.
- `roadmap_stages`: roadmap_id, order, title, description, milestone.
- `roadmap_tasks`: stage_id, skill_id, order, title, description, level, target_level, estimated_hours, rationale (structured fields, for example current score and benchmark, not free text invented by AI).
- `roadmap_task_resources`: task_id, type, url, provider, is_free, last_verified_at, status.
- `roadmap_progress`: student_id, track, task_id, status, completed_at, completion_type (self_reported | verified), verification_ref.
- Preserve existing progress data in migration; map legacy completions to `self_reported`.

---

## 7. API Guidance

Prefer extending existing routes. Needed capabilities:

| Capability | Notes |
|---|---|
| Get roadmap for track | Includes generated-from info, stages, tasks, resources, progress, "next task" |
| Update task status | Authenticated, owned, idempotent, supports undo |
| Switch/choose track | Preserves per-track progress |
| Regenerate/refresh from latest assessment | Explicit, preserves progress by task/skill match; never silently wipes progress |
| Report broken resource | Optional |
| Roadmap summary for chat/dashboard | Same source as the page |

Regeneration rules: when a newer assessment arrives, matching tasks keep their status; new or reprioritized tasks are flagged "Updated"; removed tasks that were completed stay visible in a "Completed earlier" group.

---

## 8. Non-Functional Requirements

- Responsive from mobile to wide desktop; no horizontal scroll; touch targets at least 44px.
- Accessible: keyboard navigation, focus states, ARIA labels for progress bars and status, color-independent status (icon/text), contrast compliant.
- Performance: page usable quickly; avoid refetching the whole roadmap on each task toggle (optimistic update with rollback on failure).
- Observability: server logs for progress updates and generation source.
- Backward compatible with existing student data.

---

## 9. Acceptance Criteria

1. A student with a saved assessment for their track sees tasks ordered by real gaps, each with a data-backed "Why this task".
2. A student without an assessment sees a standard-path banner and an assessment CTA; nothing is labeled "personalized".
3. Different tasks show their own relevance and hour estimates drawn from real data; no identical placeholder text unless it is genuinely identical data.
4. Each task offers more than docs where such resources exist, typed and labeled free/paid.
5. Mark completed → refresh → still completed; logout/login → still completed; undo works; double-click creates no duplicate.
6. Completion shows "Self-reported" vs "Verified" accurately; "Verified" appears only with a stored verification event.
7. Switching career domain preserves each track's progress and restores it on switching back.
8. Network or API failure shows an error/retry state, never 0%.
9. "Next recommended task" is shown and consistent with gap priority and stage order.
10. Filters, sorting, and collapsible stages work and are keyboard accessible.
11. The chat launcher no longer overlaps task content or buttons at common viewport sizes.
12. "Verified free resources" copy is either backed by a validation record or removed.
13. Cross-student and cross-track access is rejected by the backend.
14. Page passes responsive checks (mobile, tablet, desktop) and basic accessibility checks.

---

## 10. Test Plan

**Backend:** ownership checks, idempotent status updates, per-track isolation, regeneration preserving progress, migration of legacy completions.
**Frontend:** card rendering with missing/partial data, status transitions, undo, filters/sort, error/loading/empty states, no fake 0% on failure.
**Integration/E2E (real browser):** complete task → refresh → persists; logout/login → persists; switch domain and back; no-assessment vs with-assessment views; failed request states; overlap check for the chat launcher at multiple viewport widths.
**Data checks:** every displayed "Why this task" value traces to a saved record; no cross-track data leakage.
If browser automation cannot run, state exactly what was not verified. Never claim manual testing that did not occur.

---

## 11. Delivery Phases

| Phase | Output |
|---|---|
| 0 | Audit: current code, data model, how the roadmap is generated, where content comes from, how progress is stored |
| 1 | Reliable progress persistence, per-track isolation, undo, error states |
| 2 | Data-backed personalization (gap-driven ordering, "Why this task", standard-path banner) |
| 3 | Richer task cards and resource model; resource integrity |
| 4 | Next-up card, pacing, stage summaries, filters, collapsible stages, layout fixes |
| 5 | Verification paths, cross-feature links, re-assess loop |
| 6 | Full testing and final report |

---

## 12. Risks and Open Questions

| Risk / Question | Mitigation |
|---|---|
| Roadmap content may be hardcoded or AI-generated without sources | Audit in Phase 0; require curated/validated resources |
| Hour estimates have no real source | Show ranges only when sourced; otherwise omit or label as estimate |
| Resource links go stale | Last-verified date, link checks, report-broken-link action |
| Regeneration could wipe progress | Match by task/skill; never silently reset |
| Verification options may exceed available effort | Ship self-reported + project-link first; quiz verification as follow-up |
| Product decision: should "Verified" feed Skill Passport/Resume? | Needs owner decision |
| Product decision: who curates resources, and how often are they reviewed? | Needs owner decision |

---
---

# Antigravity Prompt

Copy everything below this line into Antigravity.

---

```text
ROLE
You are a senior full-stack engineer and UX-minded QA lead working in the SARATHI repository. Your task is limited to the Student Portal "My Roadmap" page (Student > Skill Intelligence > My Roadmap) and its directly related backend services, data, and navigation links. Do NOT modify the Recruiter or Employer portals. Do NOT change Skill Assessment scoring, questions, or secure-mode behavior; you may only READ saved assessment/skill-gap results.

CONTEXT
SARATHI is a career-development and skill-verification web app. It has been reported to use React, TypeScript, Vite, Node.js, Express, and SQLite. Verify this by inspecting the real repository. Read the attached roadmap PRD in full first.

The current page shows "Learning Path for <track>" (example: Full-Stack Developer), a Roadmap Completion percentage, a "Change Career Domain" button, and 3 stages (for example "Foundational Core", "Advanced Systems & Engineering"). Each stage lists tasks (for example HTML5 & Semantic Markup, JavaScript (ES6+), React.js Architecture, TypeScript). Each task card shows a level badge, a "Free Resource" badge, an hour estimate (6-8 hours on every visible task), a single "Official Documentation" link, a relevance line ("Critical foundational skill (Target Level: 4/5)") that looks identical across tasks, and a "Mark Completed" button. A floating "Need career or skill advice?" chat launcher overlaps the lower right of the content. The header text claims "verified free resources".

WORKING RULES
- Audit before changing code. Do not assume the screenshot reflects the data model.
- Reuse existing components, services, tables, and design tokens. Avoid duplicate components, APIs, or tables. Preserve existing student progress data and compatibility.
- Do not invent data. Never fabricate resources, hour estimates, benchmarks, assessment scores, or progress. If data does not exist, omit the element or show an honest empty state.
- Never label a roadmap "personalized" unless it is actually derived from the student's saved assessment/skill-gap data.
- Never show "Verified" for a task unless a real verification event is stored.
- Never display a failed fetch as 0% progress.
- Do not claim you tested something unless you actually ran it. If browser automation cannot run, state exactly what was not verified.
- Produce Artifacts as you go: an implementation plan, a task list, and a walkthrough with test evidence. Pause for my approval after the Phase 0 audit and after the Phase 2 plan.

PHASE 0: AUDIT (no code changes)
1. Map the repo: structure, scripts, env, DB file path(s), auth/token handling, how the frontend and backend run.
2. Locate the roadmap page component(s), routes, services, and tables. Document: how roadmap stages/tasks are generated (hardcoded, curated table, AI-generated), where resources/hours/relevance text come from, how progress is stored (client state, localStorage, server DB), and how "Change Career Domain" affects progress.
3. Run the real app and open the roadmap in a browser. Capture screenshots, network requests, and DB rows. Reproduce: complete a task, refresh, log out/in, change domain and return. Record exactly what persists and what does not.
4. Confirm whether the roadmap currently reads saved assessment/skill-gap results at all.
5. Verify whether "verified free resources" is backed by any validation process (link checks, last-verified dates).
6. Confirm the chat-launcher overlap and any responsive/accessibility defects at mobile, tablet, and desktop widths.
Deliver a written audit with evidence and a prioritized plan, then wait for my approval.

PHASE 1: RELIABLE PROGRESS
- Store progress server-side per authenticated student, per career track, per task (status, completed_at, completion_type self_reported|verified). Backend verifies ownership and never trusts a client student ID.
- Idempotent updates (double-click/retry safe). Add Undo for completion (confirmation or undo toast).
- Refresh, navigation, and logout/login restore the same state. Use optimistic updates with rollback on failure.
- "Change Career Domain" must preserve each track's progress separately and tell the student so.
- Distinct loading, retry, auth-expired, not-found, and server-error states. Never show an error as 0%.
- Migrate legacy completions as self_reported without losing data.

PHASE 2: DATA-BACKED PERSONALIZATION (present plan for approval first)
- If a saved completed assessment/skill-gap result exists for the selected track, order tasks by gap size and skill importance and add a "Why this task" line from real data (student score vs role benchmark for the related skill; "Not yet assessed" when unknown). Use only the same track's latest completed attempt.
- If none exists, show a "Standard path" banner with a call to action to take the Skill Assessment. Do not call it personalized.
- If assessment data fails to load, show an explicit error with retry; do not silently fall back while implying personalization.
- Mark skills already at or above benchmark as "Already strong" (lower priority or collapsed).
- Regeneration from a newer assessment must keep existing progress by matching task/skill, flag new or reprioritized tasks as "Updated", and keep earlier completed tasks visible in a "Completed earlier" group. Never silently reset progress.

PHASE 3: RICHER TASKS AND RESOURCE INTEGRITY
- Extend the task/resource model (reuse existing tables where possible): multiple typed resources per task (Official docs, Tutorial, Video, Practice exercise, Mini-project), free/paid flag, provider, level, last_verified_at, status.
- Show distinct relevance text and hour estimates only where sourced; remove placeholder-identical text. Label estimates honestly.
- Resource integrity: either implement link reachability checks with last-verified dates and a free/licensed flag, or change the "verified free resources" wording to something accurate. Handle broken links gracefully and add a "report broken link" action if feasible. External links use rel="noopener noreferrer" and indicate they open externally.
- Do not fabricate resources. Source them from existing data or clearly mark placeholders for me to curate.

PHASE 4: NEXT-UP, PACING, NAVIGATION, LAYOUT
- Add a prominent "Next recommended task" card (gap priority + prerequisite order) and "Continue where you left off".
- Stage summaries: tasks done, total estimated hours, skills covered, milestone text (only if data exists).
- Optional pacing: weekly study hours input, estimated completion date, clearly labeled as an estimate.
- Collapsible stages (current stage expanded), filters (status, level, resource type, free only), sorting (recommended, gap size, hours), compact sticky progress header.
- State how Roadmap Completion % is calculated; show per-stage and per-skill progress; show self-reported vs verified counts.
- Fix the floating chat-launcher overlap (bottom padding / positioning) so it never covers task content or buttons at common viewport sizes.
- Stay consistent with SARATHI's existing design system; responsive; touch targets >= 44px; keyboard accessible; ARIA labels on progress bars and statuses; status not conveyed by color alone.

PHASE 5: CONNECTIONS AND VERIFICATION PATHS
- Link each task's skill to Skill Gap Analysis; link project-type tasks to Projects & Portfolio.
- Show a "Re-assess" prompt after a stage is completed (navigates to Skill Assessment; do not change assessment logic).
- Show before/after skill comparison from saved assessment attempts ONLY when at least two comparable attempts exist for the same track; otherwise show nothing.
- Verification: ship self-reported plus project-link verification if the Projects feature supports it. Add short check-quizzes only if existing question infrastructure fits; otherwise list it as a follow-up. "Verified" appears only with a stored verification event.
- If the floating assistant already uses roadmap context, ensure it reads the same saved roadmap/progress data and never invents tasks or progress. Do not build a new chat feature.

PHASE 6: VERIFICATION
Run and report actual results for frontend tests, backend tests, API integration tests, and a production build, plus end-to-end browser tests covering:
- Complete task -> refresh -> persists; logout/login -> persists; undo; double-click creates no duplicate.
- Switch domain and back; progress preserved per track.
- With-assessment vs no-assessment views (personalized vs standard banner).
- Simulated auth expiry, network failure, and server error show proper states, not 0%.
- Cross-student and cross-track access is rejected.
- "Why this task" values trace to saved records; no cross-track leakage.
- Filters/sorting/collapse work with keyboard.
- Chat-launcher overlap fixed at mobile, tablet, and desktop widths.
- Basic accessibility checks (labels, focus, contrast).

FINAL REPORT (required)
1. Audit findings: how the roadmap was generated and stored, and what was broken or misleading.
2. Files changed and the reason for each.
3. How personalization works and what happens with no assessment data.
4. How progress persists and how domain switching preserves it.
5. How self-reported vs verified completion works and what verification paths exist.
6. Resource model and how "verified/free" claims are now backed (or what wording was changed).
7. New UI features (next-up, pacing, filters, collapsible stages) and the layout fixes.
8. Actual frontend, backend, integration, and browser-test results (pass/fail with output).
9. Remaining limitations, curation work needed from me, and anything unverified, stated honestly.

Begin with Phase 0. Do not modify code until the audit is delivered and approved.
```
