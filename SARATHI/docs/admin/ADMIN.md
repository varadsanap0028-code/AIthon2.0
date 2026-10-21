# SARATHI Platform Admin Portal — System Architecture & Runbook

This document is the authoritative engineering and operational reference for the SARATHI Platform Admin Portal, implemented per `SARATHI_ADMIN_PRD.md`.

---

## 1. System Overview & Architecture

The SARATHI Platform Admin Portal provides mission-critical operational oversight, governance, anti-cheat detection, recruiter validation, and systems engineering control across the SARATHI platform.

### Architectural Tenets
1. **Zero-Degradation Guardrails:** The admin portal operates as an independent control plane. All endpoints enforce strict `requireAuth` + `requireRole(['platform_admin'])` and dedicated sliding-window rate limiting.
2. **Immutable Audit Ledger:** Every administrative state mutation writes a cryptographically linked SHA-256 block into `admin_audit_log`, providing verifiable tamper evidence.
3. **Fail-Safe Fallbacks:** Statistical analytics (OLS forecasting, modified z-score anomaly detection, Wilson interval cohorts) and Natural Language Admin Copilot gracefully fall back to deterministic pure math and keyword engines if external AI keys or external networks are unavailable.
4. **Isolated Operational Overhaul:** Full support for live feature switching, SQLite database hot snapshots, and emergency platform maintenance mode without requiring container restarts or code redeployments.

---

## 2. Admin Route Map & Access Control Matrix

All administrative routes are prefixed with `/api/admin` and require an active session bearing the `platform_admin` role.

| Method | Endpoint | Description | Scope / Entity |
|---|---|---|---|
| `GET` | `/api/admin/me` | Authenticated admin profile identity | Auth |
| `GET` | `/api/admin/nav-badges` | Live notification counts (pending approvals, flagged tests, open tickets) | Global Shell |
| `GET` | `/api/admin/analytics/overview` | High-level metrics, KPIs, daily series, score buckets & attention items | Overview |
| `GET` | `/api/admin/users` | Paginated user directory with search, role filters, status filtering | Users |
| `GET` | `/api/admin/users/:id` | Detailed candidate/recruiter/college profile with timeline & sessions | Users |
| `POST` | `/api/admin/users/invite` | Single/bulk user invitation with temporary activation links | Users |
| `POST` | `/api/admin/users/:id/suspend` | Immediate session revocation & account suspension | Users |
| `POST` | `/api/admin/users/:id/unsuspend` | Account reactivation | Users |
| `PATCH` | `/api/admin/users/:id/role` | Elevate or demote user role (guarded against self-demotion & last-admin) | Users |
| `GET` | `/api/admin/approvals` | Verification applications queue with SLA tracking & advisory checks | Recruiter Approvals |
| `GET` | `/api/admin/approvals/stats` | Approvals SLA counts (ok, warning, breached, approved today) | Recruiter Approvals |
| `GET` | `/api/admin/approvals/:id` | Full application detail with hints, history, and document viewer | Recruiter Approvals |
| `POST` | `/api/admin/approvals/:id/decision` | Review decision (`approve`, `reject`, `needs_info`) with notes | Recruiter Approvals |
| `GET` | `/api/admin/approvals/:id/document` | Secure document streaming with strict MIME validation | Recruiter Approvals |
| `GET` | `/api/admin/integrity/stats` | Aggregated proctoring metrics, risk distribution & flag rates | Integrity Review |
| `GET` | `/api/admin/integrity/sessions` | Paginated candidate assessment sessions with risk bands | Integrity Review |
| `GET` | `/api/admin/integrity/sessions/:id` | Full session proctoring timeline, code diffs, and contribution weights | Integrity Review |
| `POST` | `/api/admin/integrity/sessions/:id/review` | Adjudicate review (`clean`, `violation`, `escalate`) & score revocation | Integrity Review |
| `GET` | `/api/admin/content/domains` | Skills taxonomy domains CRUD | Content Catalog |
| `GET` | `/api/admin/content/skills` | Skills catalog with aliases and cross-domain usage inspection | Content Catalog |
| `POST` | `/api/admin/content/skills/merge` | Atomic skill consolidation tool with dry-run preview | Content Catalog |
| `GET` | `/api/admin/content/benchmarks` | Role benchmarks configuration with live radar preview | Content Catalog |
| `POST` | `/api/admin/content/resources/check-links`| SSRF-safe link verification scanner | Content Catalog |
| `GET` | `/api/admin/support/tickets` | Multi-category support desk ticketing queue with SLA tracking | Support Desk |
| `POST` | `/api/admin/support/tickets/:id/reply` | Staff response and internal private notes | Support Desk |
| `GET` | `/api/admin/announcements/announcements` | Global & targeted broadcast announcements | Announcements |
| `GET` | `/api/admin/insights/forecast` | OLS regression + 95% prediction interval forecasting | Insights |
| `GET` | `/api/admin/insights/anomalies` | Modified z-score anomaly detector across 4 platform series | Insights |
| `GET` | `/api/admin/insights/recruiter-trust` | Composite 0-100 recruiter trust index | Insights |
| `GET` | `/api/admin/insights/skill-gap-market` | Supply vs Demand market skill gap ranking | Insights |
| `GET` | `/api/admin/insights/funnel-cohorts` | Weekly conversion funnel cohorts with Wilson score intervals | Insights |
| `GET` | `/api/admin/copilot/sessions` | Read-only Natural Language Admin Copilot chat sessions | Copilot |
| `POST` | `/api/admin/copilot/sessions/:id/messages`| Send query to copilot assistant with tool orchestration | Copilot |
| `GET` | `/api/admin/system/health` | Comprehensive multi-subsystem probe (Node, SQLite, Runner, AI) | System Operations |
| `GET` | `/api/admin/system/metrics` | 15-minute rolling request telemetry with P50/P95 latencies | System Operations |
| `POST` | `/api/admin/system/backups` | Safe hot SQLite database backup snapshot to `data/backups/` | System Operations |
| `POST` | `/api/admin/system/retention/run` | Audit and log retention pruning tool (dry-run & live) | System Operations |
| `GET` | `/api/admin/flags` | Feature flag switches listing with current active states | Platform Settings |
| `PATCH` | `/api/admin/flags/:key` | Toggle platform feature flag with instant cache invalidation | Platform Settings |
| `GET` | `/api/admin/audit` | Paginated audit ledger with state diffs and filters | Audit Ledger |
| `GET` | `/api/admin/audit/verify` | Complete SHA-256 cryptographic chain validation | Audit Ledger |
| `GET` | `/api/admin/audit/export.csv` | Export entire audit ledger in CSV format | Audit Ledger |

---

## 3. Database Schema Evolutions

All migrations are tracked in `server/src/data/migrate.mjs` with automatic idempotency.

### Key Schema Additions:
- **Schema v12 (Foundation):**
  - `admin_audit_log`: Core ledger table with `prev_hash`, `hash`, `action`, `entity_type`, `before_json`, `after_json`.
- **Schema v13 (Support & Announcements):**
  - `support_tickets`: Ticketing queue with category, priority, status, SLA due dates, and assignment.
  - `support_messages`: Thread messages including `is_internal_note` boolean.
  - `support_canned_responses`: Pre-written template snippets.
  - `announcements`: Broadcast announcements with audience targeting, severity, and start/end dates.
  - `announcement_dismissals`: User-specific alert dismissal tracking.
- **Schema v14 (Content Governance):**
  - `skill_aliases`: Canonical alias mapping for search deduplication.
  - `role_benchmarks`: Expected proficiency targets per skill and experience band.
- **Schema v15 (Admin Copilot):**
  - `admin_copilot_sessions`: NL conversation sessions.
  - `admin_copilot_messages`: Session messages, tool execution logs, charts, and feedback ratings.
- **Schema v16 (System Operations & Feature Switches):**
  - `feature_flags`: Dynamic on/off platform toggles (`key`, `enabled`, `description`, `updated_by`).

---

## 4. Key Mathematical & Security Models

### A. Test Integrity Risk Score
Computes a calibrated $0-100$ probability that an assessment attempt involves unauthorized assistance:
$$\text{Risk Score} = \sigma\left(\beta_0 + \sum_{i=1}^8 w_i \cdot f_i\right) \times 100$$
Features include: paste event ratio, blur duration, rapid completion time, face anomalies, multi-token similarity, and first-try correctness.
- **High Risk:** $\ge 65$ (Requires manual review before recruiter visibility)
- **Medium Risk:** $35 - 64$
- **Low Risk:** $< 35$

### B. Recruiter Trust Score
Composite index ($0-100$) evaluating employer authenticity based on verified domain consistency, GSTIN/PAN uniqueness, profile completeness, assessment creation hygiene, and candidate dispute frequency.
- **Trusted:** $\ge 75$
- **Watch:** $45 - 74$
- **Risky:** $< 45$

### C. Cryptographic Tamper-Evident Ledger
Each audit row $R_n$ computes its SHA-256 hash chaining to $R_{n-1}$:
$$H_n = \text{SHA-256}(H_{n-1} \,\|\, \text{admin\_id} \,\|\, \text{action} \,\|\, \text{entity\_type} \,\|\, \text{entity\_id} \,\|\, \text{before} \,\|\, \text{after} \,\|\, \text{created\_at})$$
If any row in SQLite is modified or deleted directly via raw database tools, `/api/admin/audit/verify` detects the broken chain, flags the tampering, and pinpoints the exact row ID.

---

## 5. Operational Runbook

### Hot Database Backup
To create a safe snapshot without taking down the server:
```bash
# Via Admin UI:
Navigate to http://localhost:5173/admin/system -> Click "Create Safe Backup Now"

# Via API:
curl -X POST http://localhost:4000/api/admin/system/backups \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```
Snapshots are written to `data/backups/sarathi_backup_<timestamp>.sqlite` with atomic file flushing.

### Emergency Maintenance Mode
To isolate the platform during emergency migrations or incident recovery:
1. Open **Platform Settings** (`/admin/settings`).
2. Toggle the `maintenance_mode` switch.
3. Type `MAINTENANCE` in the confirmation dialog to confirm.
4. **Behavior:** All non-admin API requests immediately receive HTTP 503 `MAINTENANCE`. Administrative access remains fully functional to allow repairs.
5. Once repairs are complete, toggle `maintenance_mode` off.

### Audit Ledger Chain Verification
```bash
# Via CLI Smoke Script:
npm run smoke:admin

# Via Admin UI:
Navigate to http://localhost:5173/admin/audit -> Click "Re-verify Chain"
```

### Seeding Demo Environment
```bash
npm run demo:admin
```
Idempotently boots the system, provisions administrator `admin@sarathi.dev`, and seeds full representative traffic.
