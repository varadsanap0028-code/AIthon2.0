// Canonical DDL for the SARATHI Recruiter & Employer application database.
//
// Design discipline:
//  - Every operational entity is scoped to an organisation (org_id) except platform-level
//    taxonomies (domains, skills) and global user identities.
//  - Foreign keys are enforced. Deletions on dependent relationships preserve audit integrity.
//  - Timestamps are ISO-8601 UTC.
//  - Multi-tenant RBAC and candidate privacy boundaries are enforced at the schema and service level.

export const SCHEMA_VERSION = 16;

export const ddl = `
-- ============ ORGANISATIONS ============
CREATE TABLE IF NOT EXISTS organisations (
  id                  TEXT PRIMARY KEY,
  name                TEXT NOT NULL,
  slug                TEXT NOT NULL UNIQUE,
  timezone            TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  currency            TEXT NOT NULL DEFAULT 'INR',
  settings            TEXT NOT NULL DEFAULT '{}',
  verification_status TEXT NOT NULL DEFAULT 'unverified',
  created_at          TEXT NOT NULL,
  updated_at          TEXT NOT NULL
);

-- ============ BUSINESS VERIFICATIONS ============
CREATE TABLE IF NOT EXISTS business_verifications (
  id              TEXT PRIMARY KEY,
  org_id          TEXT NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  document_type   TEXT NOT NULL,
  document_name   TEXT NOT NULL,
  file_path       TEXT NOT NULL,
  file_size       INTEGER NOT NULL DEFAULT 0,
  mime_type       TEXT NOT NULL,
  file_hash       TEXT,
  tax_identifier  TEXT,
  status          TEXT NOT NULL DEFAULT 'pending',
  submitted_at    TEXT NOT NULL,
  reviewed_at     TEXT,
  reviewed_by     TEXT REFERENCES users(id),
  decision_reason TEXT,
  decision_notes  TEXT,
  override        INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL
);

-- ============ INSTITUTIONS ============
CREATE TABLE IF NOT EXISTS institutions (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  domain     TEXT,
  settings   TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- ============ USERS ============
CREATE TABLE IF NOT EXISTS users (
  id             TEXT PRIMARY KEY,
  email          TEXT NOT NULL UNIQUE,
  password_hash  TEXT,
  full_name      TEXT NOT NULL,
  role           TEXT NOT NULL DEFAULT 'candidate',
  status         TEXT NOT NULL DEFAULT 'active',
  company_name   TEXT,
  institution    TEXT,
  institution_id TEXT REFERENCES institutions(id),
  timezone       TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  avatar_url     TEXT,
  last_login_at  TEXT,
  email_verified INTEGER NOT NULL DEFAULT 1,
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL,
  deleted_at     TEXT
);

-- ============ AUTH IDENTITIES (GOOGLE SSO / OAUTH) ============
CREATE TABLE IF NOT EXISTS auth_identities (
  id               TEXT PRIMARY KEY,
  user_id          TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider         TEXT NOT NULL,
  provider_subject TEXT NOT NULL,
  email_at_link    TEXT NOT NULL,
  created_at       TEXT NOT NULL,
  last_login_at    TEXT NOT NULL,
  UNIQUE(provider, provider_subject)
);

-- ============ ACCOUNT INVITATIONS ============
CREATE TABLE IF NOT EXISTS account_invitations (
  id             TEXT PRIMARY KEY,
  email          TEXT NOT NULL,
  role           TEXT NOT NULL,
  org_id         TEXT REFERENCES organisations(id) ON DELETE CASCADE,
  institution_id TEXT REFERENCES institutions(id) ON DELETE CASCADE,
  invited_by     TEXT REFERENCES users(id),
  status         TEXT NOT NULL DEFAULT 'pending',
  expires_at     TEXT NOT NULL,
  created_at     TEXT NOT NULL
);

-- ============ AUTH NONCES (SINGLE-USE CSRF / REPLAY PROTECTION) ============
CREATE TABLE IF NOT EXISTS auth_nonces (
  nonce      TEXT PRIMARY KEY,
  expires_at INTEGER NOT NULL,
  used_at    INTEGER
);

-- ============ ORGANISATION MEMBERSHIPS ============
CREATE TABLE IF NOT EXISTS organisation_memberships (
  id            TEXT PRIMARY KEY,
  org_id        TEXT NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role          TEXT NOT NULL DEFAULT 'recruiter',
  status        TEXT NOT NULL DEFAULT 'active',
  invited_by    TEXT,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL,
  UNIQUE(org_id, user_id)
);

-- ============ PROFILE FIELDS ============
CREATE TABLE IF NOT EXISTS candidate_profiles (
  id               TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  headline         TEXT,
  target_role      TEXT,
  bio              TEXT,
  experience_years REAL DEFAULT 0,
  location         TEXT,
  work_preference  TEXT DEFAULT 'flexible',
  resume_url       TEXT,
  profile_url      TEXT,
  github_url       TEXT,
  linkedin_url     TEXT,
  portfolio_url    TEXT,
  degree           TEXT,
  graduation_year  INTEGER,
  repo_count       INTEGER DEFAULT 0,
  visibility       TEXT NOT NULL DEFAULT 'public',
  branch           TEXT,
  consent_at       TEXT,
  consent_until    TEXT,
  created_at       TEXT NOT NULL,
  updated_at       TEXT NOT NULL,
  deleted_at       TEXT
);

CREATE TABLE IF NOT EXISTS recruiter_profiles (
  user_id      TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  title        TEXT,
  department   TEXT,
  bio          TEXT,
  linkedin_url TEXT,
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL
);

-- ============ SKILL TAXONOMY ============
CREATE TABLE IF NOT EXISTS domains (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  icon_name   TEXT,
  badge_color TEXT,
  active      INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS skills (
  id                     TEXT PRIMARY KEY,
  domain_id              TEXT NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
  name                   TEXT NOT NULL,
  description            TEXT NOT NULL DEFAULT '',
  category               TEXT,
  proficiency_scale      TEXT NOT NULL DEFAULT '1-5',
  accepted_evidence_types TEXT NOT NULL DEFAULT '["github_pr","project_repo","assessment_score","certificate","code_sample"]',
  assessment_types       TEXT NOT NULL DEFAULT '["practical_coding","mcq","code_review"]',
  active                 INTEGER NOT NULL DEFAULT 1,
  created_at             TEXT NOT NULL,
  updated_at             TEXT NOT NULL,
  UNIQUE(domain_id, name)
);

-- ============ JOBS & REQUIREMENTS ============
CREATE TABLE IF NOT EXISTS jobs (
  id                   TEXT PRIMARY KEY,
  org_id               TEXT NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  creator_id           TEXT NOT NULL REFERENCES users(id),
  title                TEXT NOT NULL,
  description          TEXT NOT NULL,
  responsibilities     TEXT NOT NULL DEFAULT '[]',
  department           TEXT,
  domain_id            TEXT REFERENCES domains(id),
  experience_level     TEXT NOT NULL DEFAULT 'mid',
  employment_type      TEXT NOT NULL DEFAULT 'full_time',
  work_arrangement     TEXT NOT NULL DEFAULT 'hybrid',
  location             TEXT NOT NULL DEFAULT 'Bangalore, India',
  salary_min           REAL,
  salary_max           REAL,
  currency             TEXT NOT NULL DEFAULT 'INR',
  application_deadline TEXT,
  status               TEXT NOT NULL DEFAULT 'draft',
  created_at           TEXT NOT NULL,
  updated_at           TEXT NOT NULL,
  deleted_at           TEXT
);

CREATE TABLE IF NOT EXISTS job_skill_requirements (
  id                     TEXT PRIMARY KEY,
  job_id                 TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  skill_id               TEXT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  requirement_type       TEXT NOT NULL DEFAULT 'required',
  target_proficiency     INTEGER NOT NULL DEFAULT 3,
  weight                 REAL NOT NULL DEFAULT 1.0,
  accepted_evidence_types TEXT NOT NULL DEFAULT '[]',
  assessment_required    INTEGER NOT NULL DEFAULT 0,
  created_at             TEXT NOT NULL,
  updated_at             TEXT NOT NULL,
  UNIQUE(job_id, skill_id)
);

-- ============ CANDIDATE SKILLS & EVIDENCE ============
CREATE TABLE IF NOT EXISTS candidate_skills (
  id                  TEXT PRIMARY KEY,
  candidate_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill_id            TEXT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  proficiency         INTEGER NOT NULL DEFAULT 1,
  verification_status TEXT NOT NULL DEFAULT 'self_reported',
  source              TEXT NOT NULL DEFAULT 'candidate_profile',
  last_verified_at    TEXT,
  verified_by         TEXT REFERENCES users(id),
  notes               TEXT,
  created_at          TEXT NOT NULL,
  updated_at          TEXT NOT NULL,
  UNIQUE(candidate_id, skill_id)
);

CREATE TABLE IF NOT EXISTS skill_evidence (
  id                  TEXT PRIMARY KEY,
  candidate_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill_id            TEXT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  evidence_type       TEXT NOT NULL,
  title               TEXT NOT NULL,
  reference_url       TEXT NOT NULL,
  metadata            TEXT NOT NULL DEFAULT '{}',
  source              TEXT NOT NULL DEFAULT 'manual_submission',
  verification_status TEXT NOT NULL DEFAULT 'pending_review',
  decision_rationale  TEXT,
  verified_by         TEXT REFERENCES users(id),
  verified_at         TEXT,
  expiry_at           TEXT,
  created_at          TEXT NOT NULL,
  updated_at          TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS verification_reviews (
  id                 TEXT PRIMARY KEY,
  evidence_id        TEXT NOT NULL REFERENCES skill_evidence(id) ON DELETE CASCADE,
  reviewer_id        TEXT NOT NULL REFERENCES users(id),
  previous_status    TEXT NOT NULL,
  new_status         TEXT NOT NULL,
  decision_rationale TEXT NOT NULL,
  rubric_evaluations TEXT NOT NULL DEFAULT '{}',
  created_at         TEXT NOT NULL
);

-- ============ ASSESSMENTS ============
CREATE TABLE IF NOT EXISTS assessment_templates (
  id               TEXT PRIMARY KEY,
  domain_id        TEXT NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  description      TEXT NOT NULL,
  type             TEXT NOT NULL DEFAULT 'practical_coding',
  duration_minutes INTEGER NOT NULL DEFAULT 45,
  passing_score    REAL NOT NULL DEFAULT 70.0,
  scoring_rubric   TEXT NOT NULL DEFAULT '{}',
  assessed_skills  TEXT NOT NULL DEFAULT '[]',
  active           INTEGER NOT NULL DEFAULT 1,
  created_at       TEXT NOT NULL,
  updated_at       TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS assessment_assignments (
  id            TEXT PRIMARY KEY,
  org_id        TEXT NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  template_id   TEXT NOT NULL REFERENCES assessment_templates(id),
  candidate_id  TEXT NOT NULL REFERENCES users(id),
  job_id        TEXT REFERENCES jobs(id) ON DELETE SET NULL,
  assigned_by   TEXT NOT NULL REFERENCES users(id),
  deadline_at   TEXT,
  status        TEXT NOT NULL DEFAULT 'invited',
  attempt_count INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS assessment_attempts (
  id                 TEXT PRIMARY KEY,
  assignment_id      TEXT NOT NULL REFERENCES assessment_assignments(id) ON DELETE CASCADE,
  candidate_id       TEXT NOT NULL REFERENCES users(id),
  attempt_number     INTEGER NOT NULL DEFAULT 1,
  started_at         TEXT NOT NULL,
  submitted_at       TEXT,
  submission_payload TEXT NOT NULL DEFAULT '{}',
  status             TEXT NOT NULL DEFAULT 'in_progress',
  created_at         TEXT NOT NULL,
  updated_at         TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS assessment_results (
  id                     TEXT PRIMARY KEY,
  attempt_id             TEXT NOT NULL REFERENCES assessment_attempts(id) ON DELETE CASCADE,
  candidate_id           TEXT NOT NULL REFERENCES users(id),
  template_id            TEXT NOT NULL REFERENCES assessment_templates(id),
  score                  REAL NOT NULL,
  max_score              REAL NOT NULL DEFAULT 100.0,
  passed                 INTEGER NOT NULL DEFAULT 0,
  rubric_scores          TEXT NOT NULL DEFAULT '{}',
  reviewer_feedback      TEXT,
  verified_skill_awards  TEXT NOT NULL DEFAULT '[]',
  graded_by              TEXT REFERENCES users(id),
  graded_at              TEXT NOT NULL,
  created_at             TEXT NOT NULL
);

-- ============ SKILL GAP ANALYSES ============
CREATE TABLE IF NOT EXISTS skill_gap_analyses (
  id                       TEXT PRIMARY KEY,
  candidate_id             TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id                   TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  overall_match_score      REAL NOT NULL DEFAULT 0.0,
  required_skill_coverage  REAL NOT NULL DEFAULT 0.0,
  preferred_skill_coverage REAL NOT NULL DEFAULT 0.0,
  summary                  TEXT,
  calculated_at            TEXT NOT NULL,
  UNIQUE(candidate_id, job_id)
);

CREATE TABLE IF NOT EXISTS skill_gap_items (
  id                    TEXT PRIMARY KEY,
  analysis_id           TEXT NOT NULL REFERENCES skill_gap_analyses(id) ON DELETE CASCADE,
  skill_id              TEXT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  requirement_type      TEXT NOT NULL,
  target_proficiency    INTEGER NOT NULL,
  candidate_proficiency INTEGER NOT NULL,
  verification_status   TEXT NOT NULL,
  gap_status            TEXT NOT NULL,
  recommendation        TEXT,
  created_at            TEXT NOT NULL
);

-- ============ APPLICATIONS & PIPELINE ============
CREATE TABLE IF NOT EXISTS applications (
  id                TEXT PRIMARY KEY,
  org_id            TEXT NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  job_id            TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  candidate_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stage             TEXT NOT NULL DEFAULT 'new_applicant',
  match_score       REAL NOT NULL DEFAULT 0.0,
  cover_note        TEXT,
  rejection_reason  TEXT,
  withdrawal_reason TEXT,
  applied_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL,
  UNIQUE(job_id, candidate_id)
);

CREATE TABLE IF NOT EXISTS application_stage_history (
  id             TEXT PRIMARY KEY,
  application_id TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  from_stage     TEXT,
  to_stage       TEXT NOT NULL,
  changed_by     TEXT NOT NULL REFERENCES users(id),
  reason         TEXT,
  created_at     TEXT NOT NULL
);

-- ============ SHORTLISTS ============
CREATE TABLE IF NOT EXISTS shortlists (
  id          TEXT PRIMARY KEY,
  org_id      TEXT NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  creator_id  TEXT NOT NULL REFERENCES users(id),
  job_id      TEXT REFERENCES jobs(id) ON DELETE SET NULL,
  title       TEXT NOT NULL,
  description TEXT,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS shortlist_members (
  id           TEXT PRIMARY KEY,
  shortlist_id TEXT NOT NULL REFERENCES shortlists(id) ON DELETE CASCADE,
  candidate_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notes        TEXT,
  added_by     TEXT NOT NULL REFERENCES users(id),
  created_at   TEXT NOT NULL,
  UNIQUE(shortlist_id, candidate_id)
);

-- ============ INTERVIEWS & FEEDBACK ============
CREATE TABLE IF NOT EXISTS interviews (
  id               TEXT PRIMARY KEY,
  org_id           TEXT NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  job_id           TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  candidate_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  application_id   TEXT REFERENCES applications(id) ON DELETE SET NULL,
  title            TEXT NOT NULL,
  interview_type   TEXT NOT NULL DEFAULT 'technical',
  scheduled_at     TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 45,
  timezone         TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  meeting_link     TEXT,
  location         TEXT,
  status           TEXT NOT NULL DEFAULT 'scheduled',
  cancelled_reason TEXT,
  created_by       TEXT NOT NULL REFERENCES users(id),
  created_at       TEXT NOT NULL,
  updated_at       TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS interview_participants (
  id           TEXT PRIMARY KEY,
  interview_id TEXT NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role         TEXT NOT NULL DEFAULT 'interviewer',
  created_at   TEXT NOT NULL,
  UNIQUE(interview_id, user_id)
);

CREATE TABLE IF NOT EXISTS interview_feedback (
  id                      TEXT PRIMARY KEY,
  interview_id            TEXT NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
  interviewer_id          TEXT NOT NULL REFERENCES users(id),
  technical_rating        INTEGER,
  communication_rating    INTEGER,
  overall_recommendation  TEXT NOT NULL,
  feedback_notes          TEXT NOT NULL,
  confidential_notes      TEXT,
  submitted_at            TEXT NOT NULL,
  created_at              TEXT NOT NULL,
  UNIQUE(interview_id, interviewer_id)
);

-- ============ RECRUITER NOTES ============
CREATE TABLE IF NOT EXISTS recruiter_notes (
  id           TEXT PRIMARY KEY,
  org_id       TEXT NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  candidate_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id       TEXT REFERENCES jobs(id) ON DELETE SET NULL,
  author_id    TEXT NOT NULL REFERENCES users(id),
  note         TEXT NOT NULL,
  is_private   INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL
);

-- ============ PLACEMENT DRIVES ============
CREATE TABLE IF NOT EXISTS placement_drives (
  id                      TEXT PRIMARY KEY,
  institution_id          TEXT REFERENCES institutions(id) ON DELETE CASCADE,
  institution_name        TEXT NOT NULL,
  company                 TEXT NOT NULL,
  role                    TEXT NOT NULL,
  package_lpa             REAL NOT NULL DEFAULT 0,
  status                  TEXT NOT NULL DEFAULT 'upcoming',
  eligible_branches       TEXT NOT NULL DEFAULT '[]',
  min_readiness           INTEGER NOT NULL DEFAULT 60,
  required_skills         TEXT NOT NULL DEFAULT '[]',
  verified_passport_req   INTEGER NOT NULL DEFAULT 0,
  start_date              TEXT,
  end_date                TEXT,
  created_by              TEXT REFERENCES users(id),
  created_at              TEXT NOT NULL,
  updated_at              TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS drive_applications (
  id           TEXT PRIMARY KEY,
  drive_id     TEXT NOT NULL REFERENCES placement_drives(id) ON DELETE CASCADE,
  candidate_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'applied',
  applied_at   TEXT NOT NULL,
  UNIQUE(drive_id, candidate_id)
);

-- ============ REMEDIATION ASSIGNMENTS ============
CREATE TABLE IF NOT EXISTS remediation_assignments (
  id            TEXT PRIMARY KEY,
  institution_id TEXT,
  candidate_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_by   TEXT REFERENCES users(id),
  missing_skills TEXT NOT NULL DEFAULT '[]',
  status        TEXT NOT NULL DEFAULT 'assigned',
  benchmark     INTEGER NOT NULL DEFAULT 60,
  assigned_at   TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

-- ============ CURRICULUM RECOMMENDATIONS ============
CREATE TABLE IF NOT EXISTS curriculum_recommendations (
  id           TEXT PRIMARY KEY,
  institution_id TEXT,
  institution_name TEXT NOT NULL,
  skill        TEXT NOT NULL,
  rec_type     TEXT NOT NULL DEFAULT 'bootcamp',
  title        TEXT NOT NULL,
  description  TEXT NOT NULL,
  branches     TEXT NOT NULL DEFAULT '[]',
  status       TEXT NOT NULL DEFAULT 'planned',
  created_by   TEXT REFERENCES users(id),
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL
);

-- ============ COLLEGE SETTINGS ============
CREATE TABLE IF NOT EXISTS college_settings (
  institution_id TEXT PRIMARY KEY,
  institution_name TEXT NOT NULL,
  benchmark_threshold INTEGER NOT NULL DEFAULT 60,
  branches TEXT NOT NULL DEFAULT '["CSE","IT","AI/DS","ECE"]',
  batch_year INTEGER NOT NULL DEFAULT 2026,
  updated_by TEXT,
  updated_at TEXT NOT NULL
);

-- ============ AUDIT TRAIL ============
CREATE TABLE IF NOT EXISTS audit_events (
  id            TEXT PRIMARY KEY,
  org_id        TEXT,
  actor_id      TEXT,
  action        TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id   TEXT,
  payload       TEXT NOT NULL DEFAULT '{}',
  ip_address    TEXT,
  created_at    TEXT NOT NULL
);

-- ============ PLATFORM ADMIN AUDIT LOG ============
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id          TEXT PRIMARY KEY,
  admin_id    TEXT NOT NULL REFERENCES users(id),
  action      TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id   TEXT,
  before_json TEXT,
  after_json  TEXT,
  reason      TEXT,
  ip          TEXT,
  user_agent  TEXT,
  prev_hash   TEXT,
  hash        TEXT,
  created_at  TEXT NOT NULL
);

-- ============ STUDENT ROADMAPS ============
CREATE TABLE IF NOT EXISTS student_roadmaps (
  id                 TEXT PRIMARY KEY,
  user_id            TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  track_key          TEXT NOT NULL,
  completed_task_ids TEXT NOT NULL DEFAULT '[]',
  task_progress      TEXT NOT NULL DEFAULT '{}',
  updated_at         TEXT NOT NULL,
  UNIQUE(user_id, track_key)
);

-- ============ USER SETTINGS ============
CREATE TABLE IF NOT EXISTS user_settings (
  user_id            TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  email_digest       INTEGER NOT NULL DEFAULT 1,
  roadmap_reminders  INTEGER NOT NULL DEFAULT 1,
  job_alerts         INTEGER NOT NULL DEFAULT 1,
  updated_at         TEXT NOT NULL
);

-- ============ PASSWORD RESETS ============
CREATE TABLE IF NOT EXISTS password_resets (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at    TEXT
);

-- ============ PASSPORT SHARES ============
CREATE TABLE IF NOT EXISTS passport_shares (
  user_id         TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  public_id       TEXT NOT NULL UNIQUE,
  is_public       INTEGER NOT NULL DEFAULT 1,
  sections_config TEXT NOT NULL DEFAULT '{"includeSkills":true,"includeProjects":true,"includeContact":false,"includeAssessments":true}',
  created_at      TEXT NOT NULL
);

-- ============ LEARNING RESOURCES ============
CREATE TABLE IF NOT EXISTS learning_resources (
  id                  TEXT PRIMARY KEY,
  slug                TEXT NOT NULL UNIQUE,
  domain              TEXT NOT NULL,
  skill_tags          TEXT NOT NULL DEFAULT '[]',
  title               TEXT NOT NULL,
  provider            TEXT NOT NULL,
  type                TEXT NOT NULL DEFAULT 'documentation',
  resource_type       TEXT NOT NULL DEFAULT 'documentation',
  source              TEXT NOT NULL DEFAULT 'web',
  url                 TEXT NOT NULL,
  is_free             INTEGER NOT NULL DEFAULT 1,
  level               TEXT NOT NULL DEFAULT 'Beginner',
  duration            TEXT NOT NULL DEFAULT '',
  duration_minutes    INTEGER DEFAULT 0,
  language            TEXT NOT NULL DEFAULT 'English',
  description         TEXT NOT NULL DEFAULT '',
  learning_objectives TEXT NOT NULL DEFAULT '[]',
  prerequisites       TEXT NOT NULL DEFAULT '[]',
  youtube_video_id    TEXT,
  youtube_playlist_id TEXT,
  channel_name        TEXT,
  thumbnail_url       TEXT,
  last_verified_at    TEXT,
  created_at          TEXT NOT NULL
);

-- ============ RESOURCE PLAYLIST ITEMS ============
CREATE TABLE IF NOT EXISTS resource_playlist_items (
  id               TEXT PRIMARY KEY,
  resource_id      TEXT NOT NULL REFERENCES learning_resources(id) ON DELETE CASCADE,
  position         INTEGER NOT NULL,
  video_id         TEXT NOT NULL,
  title            TEXT NOT NULL,
  duration_minutes INTEGER DEFAULT 0,
  created_at       TEXT NOT NULL
);

-- ============ RESOURCE BOOKMARKS ============
CREATE TABLE IF NOT EXISTS resource_bookmarks (
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  resource_id     TEXT NOT NULL REFERENCES learning_resources(id) ON DELETE CASCADE,
  collection_name TEXT NOT NULL DEFAULT 'my_list',
  created_at      TEXT NOT NULL,
  PRIMARY KEY (user_id, resource_id)
);

-- ============ RESOURCE PROGRESS ============
CREATE TABLE IF NOT EXISTS resource_progress (
  user_id               TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  resource_id           TEXT NOT NULL REFERENCES learning_resources(id) ON DELETE CASCADE,
  status                TEXT NOT NULL DEFAULT 'not_started',
  percent_complete      INTEGER NOT NULL DEFAULT 0,
  notes                 TEXT NOT NULL DEFAULT '',
  last_position_seconds INTEGER NOT NULL DEFAULT 0,
  completed_item_ids    TEXT NOT NULL DEFAULT '[]',
  completed_at          TEXT,
  updated_at            TEXT NOT NULL,
  PRIMARY KEY (user_id, resource_id)
);

-- ============ STUDENT RESUMES ============
CREATE TABLE IF NOT EXISTS student_resumes (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  target_role     TEXT,
  template_id     TEXT NOT NULL DEFAULT 'modern-ats',
  sections_config TEXT NOT NULL DEFAULT '{}',
  custom_content  TEXT NOT NULL DEFAULT '{}',
  is_default      INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL
);

-- ============ NOTIFICATIONS ============
CREATE TABLE IF NOT EXISTS notifications (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL DEFAULT 'info',
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  link       TEXT,
  is_read    INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

-- ============ FEEDBACK ============
CREATE TABLE IF NOT EXISTS feedback (
  id         TEXT PRIMARY KEY,
  user_id    TEXT REFERENCES users(id) ON DELETE SET NULL,
  category   TEXT NOT NULL,
  message    TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- ============ V2 ASSESSMENT SYSTEM ============
CREATE TABLE IF NOT EXISTS assessment_questions (
  id           TEXT PRIMARY KEY,
  version      INTEGER NOT NULL DEFAULT 1,
  domain_id    TEXT NOT NULL,
  skill_id     TEXT NOT NULL,
  type         TEXT NOT NULL CHECK(type IN ('mcq', 'code', 'sql', 'project')),
  difficulty   INTEGER NOT NULL CHECK(difficulty IN (1, 2, 3)),
  prompt       TEXT NOT NULL,
  options      TEXT DEFAULT '[]',
  correct      TEXT DEFAULT '{}',
  explanation  TEXT,
  starter_code TEXT,
  language     TEXT,
  status       TEXT NOT NULL DEFAULT 'active',
  created_at   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS code_tests (
  id              TEXT PRIMARY KEY,
  question_id     TEXT NOT NULL REFERENCES assessment_questions(id) ON DELETE CASCADE,
  kind            TEXT NOT NULL CHECK(kind IN ('visible', 'hidden')),
  input           TEXT NOT NULL,
  expected_output TEXT NOT NULL,
  weight          REAL NOT NULL DEFAULT 1.0,
  timeout_ms      INTEGER NOT NULL DEFAULT 3000
);

CREATE TABLE IF NOT EXISTS project_rubrics (
  id          TEXT PRIMARY KEY,
  question_id TEXT NOT NULL REFERENCES assessment_questions(id) ON DELETE CASCADE,
  criteria    TEXT NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS assessment_sessions (
  id                 TEXT PRIMARY KEY,
  user_id            TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mode               TEXT NOT NULL CHECK(mode IN ('practice', 'secure')),
  domain_id          TEXT NOT NULL,
  role               TEXT NOT NULL,
  question_ids       TEXT NOT NULL DEFAULT '[]',
  bank_version       INTEGER NOT NULL DEFAULT 1,
  status             TEXT NOT NULL DEFAULT 'in_progress' CHECK(status IN ('in_progress', 'submitted', 'graded', 'expired')),
  started_at         TEXT NOT NULL,
  expires_at         TEXT NOT NULL,
  deadline_at        TEXT,
  save_version       INTEGER NOT NULL DEFAULT 1,
  submitted_at       TEXT,
  consent_json       TEXT DEFAULT '{}',
  accommodation_json TEXT DEFAULT '{}',
  engine_version     TEXT NOT NULL DEFAULT 'v2'
);

CREATE TABLE IF NOT EXISTS submission_snapshots (
  id          TEXT PRIMARY KEY,
  session_id  TEXT NOT NULL REFERENCES assessment_sessions(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL REFERENCES assessment_questions(id) ON DELETE CASCADE,
  code        TEXT NOT NULL,
  language    TEXT NOT NULL,
  reason      TEXT NOT NULL CHECK(reason IN ('autosave', 'run', 'submit')),
  created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS run_results (
  id             TEXT PRIMARY KEY,
  session_id     TEXT NOT NULL REFERENCES assessment_sessions(id) ON DELETE CASCADE,
  question_id    TEXT NOT NULL REFERENCES assessment_questions(id) ON DELETE CASCADE,
  visible_passed INTEGER NOT NULL DEFAULT 0,
  visible_total  INTEGER NOT NULL DEFAULT 0,
  status         TEXT NOT NULL,
  stdout         TEXT DEFAULT '',
  stderr         TEXT DEFAULT '',
  time_ms        INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS explanation_answers (
  id           TEXT PRIMARY KEY,
  session_id   TEXT NOT NULL REFERENCES assessment_sessions(id) ON DELETE CASCADE,
  question_id  TEXT NOT NULL REFERENCES assessment_questions(id) ON DELETE CASCADE,
  text         TEXT NOT NULL,
  rubric_score REAL DEFAULT 0,
  needs_review INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS session_scores (
  session_id      TEXT PRIMARY KEY REFERENCES assessment_sessions(id) ON DELETE CASCADE,
  technical_score REAL NOT NULL DEFAULT 0,
  knowledge_score REAL NOT NULL DEFAULT 0,
  practical_score REAL NOT NULL DEFAULT 0,
  rubric_json     TEXT NOT NULL DEFAULT '{}',
  skill_scores    TEXT NOT NULL DEFAULT '{}',
  graded_at       TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS integrity_events (
  id         TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES assessment_sessions(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  ts         TEXT NOT NULL,
  meta       TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS integrity_reviews (
  id          TEXT PRIMARY KEY,
  session_id  TEXT NOT NULL REFERENCES assessment_sessions(id) ON DELETE CASCADE,
  reviewer_id TEXT NOT NULL REFERENCES users(id),
  decision    TEXT NOT NULL CHECK(decision IN ('no_concern', 'needs_followup', 'concern_confirmed')),
  note        TEXT NOT NULL,
  created_at  TEXT NOT NULL
);

-- ============ SKILL INTELLIGENCE ENGINE ============
CREATE TABLE IF NOT EXISTS canonical_skill_profiles (
  candidate_id              TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill_id                  TEXT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  demonstrated_proficiency  INTEGER,
  evidence_status           TEXT NOT NULL DEFAULT 'INSUFFICIENT_EVIDENCE' CHECK(evidence_status IN ('VERIFIED', 'PROVISIONAL', 'INSUFFICIENT_EVIDENCE', 'CONFLICTING', 'OUTDATED')),
  confidence                TEXT NOT NULL DEFAULT 'NONE' CHECK(confidence IN ('HIGH', 'MEDIUM', 'LOW', 'NONE')),
  evidence_count            INTEGER NOT NULL DEFAULT 0,
  last_evidence_at          TEXT,
  scoring_rule_version      TEXT NOT NULL DEFAULT '1.0',
  reassessment_recommended  INTEGER NOT NULL DEFAULT 0,
  updated_at                TEXT NOT NULL,
  PRIMARY KEY (candidate_id, skill_id)
);

CREATE TABLE IF NOT EXISTS skill_evidence_ledger (
  id                  TEXT PRIMARY KEY,
  candidate_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill_id            TEXT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  evidence_type       TEXT NOT NULL,
  source              TEXT NOT NULL,
  title               TEXT NOT NULL,
  reference_url       TEXT,
  score               REAL,
  max_score           REAL,
  demonstrated_level  INTEGER,
  validity_status     TEXT NOT NULL DEFAULT 'VALID',
  rule_version        TEXT NOT NULL DEFAULT '1.0',
  metadata            TEXT NOT NULL DEFAULT '{}',
  created_at          TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS practical_challenges (
  id               TEXT PRIMARY KEY,
  domain_id        TEXT NOT NULL,
  skill_id         TEXT NOT NULL,
  title            TEXT NOT NULL,
  description      TEXT NOT NULL,
  challenge_type   TEXT NOT NULL DEFAULT 'api_debugging',
  starter_code     TEXT NOT NULL,
  test_suite_json  TEXT NOT NULL DEFAULT '[]',
  difficulty       INTEGER NOT NULL DEFAULT 2,
  active           INTEGER NOT NULL DEFAULT 1,
  created_at       TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS practical_challenge_submissions (
  id                 TEXT PRIMARY KEY,
  challenge_id       TEXT NOT NULL REFERENCES practical_challenges(id) ON DELETE CASCADE,
  candidate_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  submitted_code     TEXT NOT NULL,
  status             TEXT NOT NULL CHECK(status IN ('passed', 'failed')),
  score              REAL NOT NULL,
  test_results_json  TEXT NOT NULL DEFAULT '{}',
  submitted_at       TEXT NOT NULL
);

-- ============ INTEGRITY RISK SCORES ============
CREATE TABLE IF NOT EXISTS integrity_risk_scores (
  session_id     TEXT PRIMARY KEY REFERENCES assessment_sessions(id) ON DELETE CASCADE,
  score          INTEGER NOT NULL,
  band           TEXT NOT NULL CHECK(band IN ('low', 'medium', 'high')),
  features_json  TEXT NOT NULL DEFAULT '{}',
  reasons_json   TEXT NOT NULL DEFAULT '[]',
  model_version  TEXT NOT NULL DEFAULT '1.0.0',
  computed_at    TEXT NOT NULL
);

-- ============ SKILL ALIASES ============
CREATE TABLE IF NOT EXISTS skill_aliases (
  id         TEXT PRIMARY KEY,
  skill_id   TEXT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  alias      TEXT NOT NULL UNIQUE COLLATE NOCASE,
  created_at TEXT NOT NULL
);

-- ============ ROLE BENCHMARKS ============
CREATE TABLE IF NOT EXISTS role_benchmarks (
  id                TEXT PRIMARY KEY,
  role_id           TEXT NOT NULL UNIQUE,
  title             TEXT NOT NULL,
  domain_id         TEXT,
  description       TEXT,
  benchmark_version TEXT NOT NULL DEFAULT '2026.1',
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS role_benchmark_skills (
  id                 TEXT PRIMARY KEY,
  benchmark_id       TEXT NOT NULL REFERENCES role_benchmarks(id) ON DELETE CASCADE,
  skill_id           TEXT NOT NULL,
  target_level       INTEGER NOT NULL CHECK(target_level BETWEEN 1 AND 5),
  weight             REAL NOT NULL CHECK(weight > 0),
  is_mandatory       INTEGER NOT NULL DEFAULT 1,
  prerequisites_json TEXT NOT NULL DEFAULT '[]',
  why_it_matters     TEXT,
  UNIQUE(benchmark_id, skill_id)
);

-- ============ SUPPORT DESK ============
CREATE TABLE IF NOT EXISTS support_tickets (
  id                TEXT PRIMARY KEY,
  requester_id      TEXT NOT NULL REFERENCES users(id),
  category          TEXT NOT NULL CHECK(category IN ('account', 'approval', 'test', 'bug', 'other')),
  subject           TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'pending', 'resolved', 'closed')),
  priority          TEXT NOT NULL DEFAULT 'normal' CHECK(priority IN ('low', 'normal', 'high', 'urgent')),
  assigned_to       TEXT REFERENCES users(id),
  first_response_at TEXT,
  resolved_at       TEXT,
  sla_due_at        TEXT NOT NULL,
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL,
  last_message_at   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS support_messages (
  id               TEXT PRIMARY KEY,
  ticket_id        TEXT NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_id        TEXT NOT NULL REFERENCES users(id),
  sender_role      TEXT NOT NULL,
  body             TEXT NOT NULL,
  is_internal_note INTEGER NOT NULL DEFAULT 0,
  created_at       TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS support_canned_responses (
  id         TEXT PRIMARY KEY,
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL
);

-- ============ ANNOUNCEMENTS ============
CREATE TABLE IF NOT EXISTS announcements (
  id         TEXT PRIMARY KEY,
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  audience   TEXT NOT NULL DEFAULT 'all' CHECK(audience IN ('all', 'student', 'recruiter', 'college', 'reviewer')),
  severity   TEXT NOT NULL DEFAULT 'info' CHECK(severity IN ('info', 'success', 'warning', 'critical')),
  starts_at  TEXT NOT NULL,
  ends_at    TEXT,
  active     INTEGER NOT NULL DEFAULT 1,
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS announcement_dismissals (
  announcement_id TEXT NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  dismissed_at    TEXT NOT NULL,
  PRIMARY KEY (announcement_id, user_id)
);

-- ============ ADMIN COPILOT CHAT ============
CREATE TABLE IF NOT EXISTS admin_chat_sessions (
  id         TEXT PRIMARY KEY,
  admin_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_chat_messages (
  id               TEXT PRIMARY KEY,
  session_id       TEXT NOT NULL REFERENCES admin_chat_sessions(id) ON DELETE CASCADE,
  role             TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
  content          TEXT NOT NULL,
  blocks_json      TEXT NOT NULL DEFAULT '[]',
  tool             TEXT,
  used_fallback    INTEGER NOT NULL DEFAULT 0,
  latency_ms       INTEGER NOT NULL DEFAULT 0,
  feedback         INTEGER,
  feedback_comment TEXT,
  created_at       TEXT NOT NULL
);

-- ============ FEATURE FLAGS ============
CREATE TABLE IF NOT EXISTS feature_flags (
  key         TEXT PRIMARY KEY,
  enabled     INTEGER NOT NULL DEFAULT 1,
  description TEXT,
  updated_by  TEXT REFERENCES users(id),
  updated_at  TEXT NOT NULL
);

-- ============ INDEXES ============
CREATE INDEX IF NOT EXISTS idx_canonical_skill_profiles_user ON canonical_skill_profiles(candidate_id);
CREATE INDEX IF NOT EXISTS idx_skill_evidence_ledger_user ON skill_evidence_ledger(candidate_id, skill_id);
CREATE INDEX IF NOT EXISTS idx_practical_challenges_skill ON practical_challenges(skill_id);
CREATE INDEX IF NOT EXISTS idx_memberships_user ON organisation_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_org_status ON jobs(org_id, status);
CREATE INDEX IF NOT EXISTS idx_job_skills_job ON job_skill_requirements(job_id);
CREATE INDEX IF NOT EXISTS idx_skills_domain ON skills(domain_id);
CREATE INDEX IF NOT EXISTS idx_candidate_skills_user ON candidate_skills(candidate_id, verification_status);
CREATE INDEX IF NOT EXISTS idx_skill_evidence_candidate ON skill_evidence(candidate_id, verification_status);
CREATE INDEX IF NOT EXISTS idx_applications_org_job ON applications(org_id, job_id, stage);
CREATE INDEX IF NOT EXISTS idx_applications_candidate ON applications(candidate_id);
CREATE INDEX IF NOT EXISTS idx_interviews_org_date ON interviews(org_id, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_audit_org_action ON audit_events(org_id, action, created_at);
CREATE INDEX IF NOT EXISTS idx_student_roadmaps_user ON student_roadmaps(user_id);
CREATE INDEX IF NOT EXISTS idx_password_resets_user ON password_resets(user_id);
CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token_hash);
CREATE INDEX IF NOT EXISTS idx_passport_shares_pub ON passport_shares(public_id);
CREATE INDEX IF NOT EXISTS idx_learning_resources_domain ON learning_resources(domain);
CREATE UNIQUE INDEX IF NOT EXISTS idx_learning_resources_slug ON learning_resources(slug);
CREATE INDEX IF NOT EXISTS idx_playlist_items_resource ON resource_playlist_items(resource_id, position);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_assessment_sessions_user ON assessment_sessions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_assessment_sessions_domain ON assessment_sessions(domain_id);
CREATE INDEX IF NOT EXISTS idx_integrity_events_session ON integrity_events(session_id);
CREATE INDEX IF NOT EXISTS idx_integrity_reviews_session ON integrity_reviews(session_id);
CREATE INDEX IF NOT EXISTS idx_assessment_questions_domain ON assessment_questions(domain_id, skill_id);
CREATE INDEX IF NOT EXISTS idx_student_resumes_user ON student_resumes(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_identities_user ON auth_identities(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_identities_provider_sub ON auth_identities(provider, provider_subject);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON account_invitations(email);
CREATE INDEX IF NOT EXISTS idx_auth_nonces_exp ON auth_nonces(expires_at);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at ON admin_audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin_created ON admin_audit_log(admin_id, created_at);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_entity ON admin_audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_users_role_created ON users(role, created_at);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_last_login_at ON users(last_login_at);
CREATE INDEX IF NOT EXISTS idx_users_role_status ON users(role, status);
CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users(email_verified);
CREATE INDEX IF NOT EXISTS idx_password_resets_user_used ON password_resets(user_id, used_at);
CREATE INDEX IF NOT EXISTS idx_applications_applied_at ON applications(applied_at);
CREATE INDEX IF NOT EXISTS idx_assessment_sessions_started_at ON assessment_sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_session_scores_graded_at ON session_scores(graded_at);
CREATE INDEX IF NOT EXISTS idx_business_verifications_status ON business_verifications(status, submitted_at);
CREATE INDEX IF NOT EXISTS idx_business_verifications_org ON business_verifications(org_id);
CREATE INDEX IF NOT EXISTS idx_business_verifications_user ON business_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_business_verifications_hash ON business_verifications(file_hash);
CREATE INDEX IF NOT EXISTS idx_business_verifications_tax_id ON business_verifications(tax_identifier);
CREATE INDEX IF NOT EXISTS idx_organisations_verification_status ON organisations(verification_status);
CREATE INDEX IF NOT EXISTS idx_integrity_risk_scores_band ON integrity_risk_scores(band, score);
CREATE INDEX IF NOT EXISTS idx_integrity_risk_scores_computed_at ON integrity_risk_scores(computed_at);
CREATE INDEX IF NOT EXISTS idx_skill_aliases_skill ON skill_aliases(skill_id);
CREATE INDEX IF NOT EXISTS idx_role_benchmarks_role ON role_benchmarks(role_id);
CREATE INDEX IF NOT EXISTS idx_role_benchmark_skills_b ON role_benchmark_skills(benchmark_id);
CREATE INDEX IF NOT EXISTS idx_role_benchmark_skills_s ON role_benchmark_skills(skill_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status_last_msg ON support_tickets(status, last_message_at);
CREATE INDEX IF NOT EXISTS idx_support_tickets_requester ON support_tickets(requester_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned_status ON support_tickets(assigned_to, status);
CREATE INDEX IF NOT EXISTS idx_support_messages_ticket ON support_messages(ticket_id, created_at);
CREATE INDEX IF NOT EXISTS idx_announcements_audience ON announcements(audience, active, starts_at);
CREATE INDEX IF NOT EXISTS idx_admin_chat_sessions_admin ON admin_chat_sessions(admin_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_admin_chat_messages_session ON admin_chat_messages(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_feature_flags_key ON feature_flags(key);

`;
