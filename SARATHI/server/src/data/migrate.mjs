import fs from 'node:fs';
import { initDb, closeDb } from '../config/db.js';
import { paths } from '../config/index.js';
import { ddl, SCHEMA_VERSION } from './schema.js';
import { ROLE_BENCHMARKS } from '../services/roleBenchmarkService.js';
import { v4 as uuidv4 } from 'uuid';

export function runMigrations(dbFile) {
  if (paths.uploadsDir && !fs.existsSync(paths.uploadsDir)) {
    fs.mkdirSync(paths.uploadsDir, { recursive: true });
  }
  const db = initDb(dbFile);
  console.log(`Starting migration to schema version ${SCHEMA_VERSION}...`);

  // Create schema version tracking table if not exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);

  const currentVersionRow = db.prepare('SELECT MAX(version) as max_version FROM schema_migrations;').get();
  const currentVersion = currentVersionRow?.max_version || 0;

  if (currentVersion >= SCHEMA_VERSION) {
    console.log(`Schema is already up to date (version: ${currentVersion}).`);
    return { applied: false, version: currentVersion };
  }

  // Idempotently add any new columns to candidate_profiles if table exists
  try {
    const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='candidate_profiles';").get();
    if (tableCheck) {
      const cols = db.prepare("PRAGMA table_info(candidate_profiles);").all();
      const colNames = new Set(cols.map(c => c.name));
      if (!colNames.has('linkedin_url')) {
        db.exec('ALTER TABLE candidate_profiles ADD COLUMN linkedin_url TEXT;');
      }
      if (!colNames.has('degree')) {
        db.exec('ALTER TABLE candidate_profiles ADD COLUMN degree TEXT;');
      }
      if (!colNames.has('graduation_year')) {
        db.exec('ALTER TABLE candidate_profiles ADD COLUMN graduation_year INTEGER;');
      }
    }

    const attemptsCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='assessment_attempts';").get();
    if (attemptsCheck) {
      const cols = db.prepare("PRAGMA table_info(assessment_attempts);").all();
      const colNames = new Set(cols.map(c => c.name));
      if (!colNames.has('engine_version')) {
        db.exec("ALTER TABLE assessment_attempts ADD COLUMN engine_version TEXT DEFAULT 'v1';");
      }
    }

    const sessionsCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='assessment_sessions';").get();
    if (sessionsCheck) {
      const cols = db.prepare("PRAGMA table_info(assessment_sessions);").all();
      const colNames = new Set(cols.map(c => c.name));
      if (!colNames.has('deadline_at')) {
        db.exec("ALTER TABLE assessment_sessions ADD COLUMN deadline_at TEXT;");
      }
      if (!colNames.has('save_version')) {
        db.exec("ALTER TABLE assessment_sessions ADD COLUMN save_version INTEGER DEFAULT 1;");
      }
    }

    // Schema v5 migrations: passport_shares, learning_resources, resource_bookmarks, resource_progress
    const sharesCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='passport_shares';").get();
    if (sharesCheck) {
      const cols = db.prepare("PRAGMA table_info(passport_shares);").all();
      const colNames = new Set(cols.map(c => c.name));
      if (!colNames.has('sections_config')) {
        db.exec(`ALTER TABLE passport_shares ADD COLUMN sections_config TEXT DEFAULT '{"includeSkills":true,"includeProjects":true,"includeContact":false,"includeAssessments":true}';`);
      }
    }

    const resourcesCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='learning_resources';").get();
    if (resourcesCheck) {
      const cols = db.prepare("PRAGMA table_info(learning_resources);").all();
      const colNames = new Set(cols.map(c => c.name));
      if (!colNames.has('slug')) {
        db.exec("ALTER TABLE learning_resources ADD COLUMN slug TEXT;");
      }
      if (!colNames.has('resource_type')) {
        db.exec("ALTER TABLE learning_resources ADD COLUMN resource_type TEXT DEFAULT 'documentation';");
      }
      if (!colNames.has('source')) {
        db.exec("ALTER TABLE learning_resources ADD COLUMN source TEXT DEFAULT 'web';");
      }
      if (!colNames.has('youtube_video_id')) {
        db.exec("ALTER TABLE learning_resources ADD COLUMN youtube_video_id TEXT;");
      }
      if (!colNames.has('youtube_playlist_id')) {
        db.exec("ALTER TABLE learning_resources ADD COLUMN youtube_playlist_id TEXT;");
      }
      if (!colNames.has('channel_name')) {
        db.exec("ALTER TABLE learning_resources ADD COLUMN channel_name TEXT;");
      }
      if (!colNames.has('thumbnail_url')) {
        db.exec("ALTER TABLE learning_resources ADD COLUMN thumbnail_url TEXT;");
      }
      if (!colNames.has('duration_minutes')) {
        db.exec("ALTER TABLE learning_resources ADD COLUMN duration_minutes INTEGER DEFAULT 0;");
      }
      if (!colNames.has('last_verified_at')) {
        db.exec("ALTER TABLE learning_resources ADD COLUMN last_verified_at TEXT;");
      }
      if (!colNames.has('description')) {
        db.exec("ALTER TABLE learning_resources ADD COLUMN description TEXT DEFAULT '';");
      }
      if (!colNames.has('learning_objectives')) {
        db.exec("ALTER TABLE learning_resources ADD COLUMN learning_objectives TEXT DEFAULT '[]';");
      }
      if (!colNames.has('prerequisites')) {
        db.exec("ALTER TABLE learning_resources ADD COLUMN prerequisites TEXT DEFAULT '[]';");
      }

      // Backfill slug and resource_type for pre-existing rows
      try {
        db.exec("UPDATE learning_resources SET slug = id WHERE slug IS NULL OR slug = '';");
        db.exec("UPDATE learning_resources SET resource_type = COALESCE(type, 'documentation') WHERE resource_type IS NULL OR resource_type = '';");
        db.exec("UPDATE learning_resources SET source = CASE WHEN youtube_video_id IS NOT NULL OR youtube_playlist_id IS NOT NULL THEN 'youtube' ELSE 'web' END WHERE source IS NULL OR source = '';");
      } catch (backfillErr) {
        console.warn('Backfill note for learning_resources:', backfillErr.message);
      }
    }

    const bookmarksCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='resource_bookmarks';").get();
    if (bookmarksCheck) {
      const cols = db.prepare("PRAGMA table_info(resource_bookmarks);").all();
      const colNames = new Set(cols.map(c => c.name));
      if (!colNames.has('collection_name')) {
        db.exec("ALTER TABLE resource_bookmarks ADD COLUMN collection_name TEXT DEFAULT 'my_list';");
      }
    }

    const progressCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='resource_progress';").get();
    if (progressCheck) {
      const cols = db.prepare("PRAGMA table_info(resource_progress);").all();
      const colNames = new Set(cols.map(c => c.name));
      if (!colNames.has('percent_complete')) {
        db.exec("ALTER TABLE resource_progress ADD COLUMN percent_complete INTEGER DEFAULT 0;");
      }
      if (!colNames.has('notes')) {
        db.exec("ALTER TABLE resource_progress ADD COLUMN notes TEXT DEFAULT '';");
      }
      if (!colNames.has('last_position_seconds')) {
        db.exec("ALTER TABLE resource_progress ADD COLUMN last_position_seconds INTEGER DEFAULT 0;");
      }
      if (!colNames.has('completed_item_ids')) {
        db.exec("ALTER TABLE resource_progress ADD COLUMN completed_item_ids TEXT DEFAULT '[]';");
      }
      if (!colNames.has('completed_at')) {
        db.exec("ALTER TABLE resource_progress ADD COLUMN completed_at TEXT;");
      }
    }

    const usersCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users';").get();
    if (usersCheck) {
      const cols = db.prepare("PRAGMA table_info(users);").all();
      const colNames = new Set(cols.map(c => c.name));
      if (!colNames.has('status')) {
        db.exec("ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'active';");
      }
      if (!colNames.has('institution_id')) {
        db.exec("ALTER TABLE users ADD COLUMN institution_id TEXT;");
      }
      if (!colNames.has('last_login_at')) {
        db.exec("ALTER TABLE users ADD COLUMN last_login_at TEXT;");
      }
      if (!colNames.has('email_verified')) {
        db.exec("ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 1;");
      }
    }

    const cpCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='candidate_profiles';").get();
    if (cpCheck) {
      const cols = db.prepare("PRAGMA table_info(candidate_profiles);").all();
      const colNames = new Set(cols.map(c => c.name));
      if (!colNames.has('branch')) {
        db.exec("ALTER TABLE candidate_profiles ADD COLUMN branch TEXT;");
      }
    }

    const roadmapsCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='student_roadmaps';").get();
    if (roadmapsCheck) {
      const cols = db.prepare("PRAGMA table_info(student_roadmaps);").all();
      const colNames = new Set(cols.map(c => c.name));
      if (!colNames.has('task_progress')) {
        db.exec("ALTER TABLE student_roadmaps ADD COLUMN task_progress TEXT NOT NULL DEFAULT '{}';");
      }
    }

    const orgsCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='organisations';").get();
    if (orgsCheck) {
      const cols = db.prepare("PRAGMA table_info(organisations);").all();
      const colNames = new Set(cols.map(c => c.name));
      if (!colNames.has('verification_status')) {
        db.exec("ALTER TABLE organisations ADD COLUMN verification_status TEXT NOT NULL DEFAULT 'unverified';");
      }
    }

    const auditCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='admin_audit_log';").get();
    if (auditCheck) {
      const cols = db.prepare("PRAGMA table_info(admin_audit_log);").all();
      const colNames = new Set(cols.map(c => c.name));
      if (!colNames.has('prev_hash')) {
        db.exec("ALTER TABLE admin_audit_log ADD COLUMN prev_hash TEXT;");
      }
      if (!colNames.has('hash')) {
        db.exec("ALTER TABLE admin_audit_log ADD COLUMN hash TEXT;");
      }
    }

    const skillsCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='skills';").get();
    if (skillsCheck) {
      const cols = db.prepare("PRAGMA table_info(skills);").all();
      const colNames = new Set(cols.map(c => c.name));
      if (!colNames.has('is_archived')) {
        db.exec("ALTER TABLE skills ADD COLUMN is_archived INTEGER NOT NULL DEFAULT 0;");
      }
    }

    const lrCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='learning_resources';").get();
    if (lrCheck) {
      const cols = db.prepare("PRAGMA table_info(learning_resources);").all();
      const colNames = new Set(cols.map(c => c.name));
      if (!colNames.has('is_archived')) {
        db.exec("ALTER TABLE learning_resources ADD COLUMN is_archived INTEGER NOT NULL DEFAULT 0;");
      }
      if (!colNames.has('link_status')) {
        db.exec("ALTER TABLE learning_resources ADD COLUMN link_status TEXT NOT NULL DEFAULT 'untested';");
      }
      if (!colNames.has('last_checked_at')) {
        db.exec("ALTER TABLE learning_resources ADD COLUMN last_checked_at TEXT;");
      }
      if (!colNames.has('link_status_code')) {
        db.exec("ALTER TABLE learning_resources ADD COLUMN link_status_code INTEGER;");
      }
    }
  } catch (err) {
    console.warn('Column migration note:', err.message);
  }

  // Execute canonical DDL
  db.exec(ddl);

  // Seed default role benchmarks if empty
  try {
    const rbCount = db.prepare("SELECT COUNT(*) as count FROM role_benchmarks;").get()?.count || 0;
    if (rbCount === 0 && ROLE_BENCHMARKS) {
      const now = new Date().toISOString();
      const insertRb = db.prepare(`
        INSERT OR IGNORE INTO role_benchmarks (id, role_id, title, domain_id, description, benchmark_version, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?);
      `);
      const insertSkill = db.prepare(`
        INSERT OR IGNORE INTO skills (id, domain_id, name, description, category, proficiency_scale, accepted_evidence_types, assessment_types, active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, '1-5', '["assessment", "project", "work_experience"]', '["mcq", "coding_challenge"]', 1, ?, ?);
      `);
      const insertRbs = db.prepare(`
        INSERT OR IGNORE INTO role_benchmark_skills (id, benchmark_id, skill_id, target_level, weight, is_mandatory, prerequisites_json, why_it_matters)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?);
      `);

      for (const [title, bm] of Object.entries(ROLE_BENCHMARKS)) {
        const rbId = `rb-${uuidv4()}`;
        const roleId = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        let domainId = bm.domainId || 'dom-frontend';
        const dCheck = db.prepare("SELECT id FROM domains WHERE id = ?;").get(domainId);
        if (!dCheck) domainId = 'dom-frontend';

        insertRb.run(rbId, roleId, bm.roleTitle || title, domainId, bm.description || '', bm.benchmarkVersion || '2026.1', now, now);

        if (Array.isArray(bm.requiredSkills)) {
          for (const s of bm.requiredSkills) {
            insertSkill.run(s.skillId, domainId, s.skillName, s.whyItMatters || '', s.category || 'General', now, now);
            insertRbs.run(
              `rbs-${uuidv4()}`,
              rbId,
              s.skillId,
              s.requiredProficiency || 3,
              s.weight || 1.0,
              s.isMandatory ? 1 : 0,
              JSON.stringify(s.prerequisites || []),
              s.whyItMatters || ''
            );
          }
        }
      }
    }
  } catch (err) {
    console.warn('Role benchmarks seed note:', err.message);
  }

  // Seed default feature flags if empty
  try {
    const flagCount = db.prepare("SELECT COUNT(*) as count FROM feature_flags;").get()?.count || 0;
    if (flagCount === 0) {
      const now = new Date().toISOString();
      const insertFlag = db.prepare(`
        INSERT OR IGNORE INTO feature_flags (key, enabled, description, updated_by, updated_at)
        VALUES (?, ?, ?, NULL, ?);
      `);
      insertFlag.run('signups_open', 1, 'Allow new user registration', now);
      insertFlag.run('recruiter_requires_verification', 1, 'Require company verification before recruiter actions', now);
      insertFlag.run('assessment_engine', 1, 'Enable adaptive assessment engine', now);
      insertFlag.run('camera_proctoring', 1, 'Enable camera proctoring during assessments', now);
      insertFlag.run('ai_copilot', 1, 'Enable Admin Copilot AI features', now);
      insertFlag.run('ai_chatbot', 1, 'Enable student/recruiter AI assistant chatbot', now);
      insertFlag.run('maintenance_mode', 0, 'Platform maintenance mode (blocks non-admin traffic)', now);
    }
  } catch (err) {
    console.warn('Feature flags seed note:', err.message);
  }

  // Seed support canned responses if empty
  try {
    const cannedCount = db.prepare("SELECT COUNT(*) as count FROM support_canned_responses;").get()?.count || 0;
    if (cannedCount === 0) {
      const now = new Date().toISOString();
      const insertCanned = db.prepare(`
        INSERT OR IGNORE INTO support_canned_responses (id, title, body, created_by, created_at)
        VALUES (?, ?, ?, 'usr-admin-seed', ?);
      `);
      insertCanned.run('can-1', 'Document Unreadable', 'The uploaded verification document is blurry or unreadable. Please upload a clear PDF or high-resolution image of your Certificate of Incorporation or GST certificate.', now);
      insertCanned.run('can-2', 'Name Mismatch', 'The organisation name on your submission does not match the legal name on the registration documents. Please re-submit with matching official details.', now);
      insertCanned.run('can-3', 'Tax ID Verification Failed', 'We could not verify the provided GSTIN or PAN against official records. Please ensure the identifier is valid and active.', now);
      insertCanned.run('can-4', 'Personal Email Used', 'Please use your corporate work email (e.g. name@company.com) for company verification rather than a free email provider.', now);
      insertCanned.run('can-5', 'Assessment Score Invalidation', 'Your test session was flagged for multiple integrity violations. The associated score has been marked invalid following reviewer confirmation.', now);
      insertCanned.run('can-6', 'General Support Inquiry', 'Thank you for contacting Sarathi Support. We have received your inquiry and our team is investigating. You will receive an update shortly.', now);
    }
  } catch (err) {
    console.warn('Canned responses seed note:', err.message);
  }

  // Record migration
  db.prepare('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?);')
    .run(SCHEMA_VERSION, new Date().toISOString());

  console.log(`Migration successful! Database updated to version ${SCHEMA_VERSION}.`);
  return { applied: true, version: SCHEMA_VERSION };
}

// If executed directly
if (process.argv[1]?.endsWith('migrate.mjs')) {
  try {
    runMigrations();
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    closeDb();
  }
}
