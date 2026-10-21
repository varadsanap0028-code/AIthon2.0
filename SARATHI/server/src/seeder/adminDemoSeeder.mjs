import bcrypt from 'bcryptjs';
import { randomUUID as uuidv4 } from 'node:crypto';
import { app as appConfig } from '../config/index.js';
import { initDb, closeDb } from '../config/db.js';
import { runMigrations } from '../data/migrate.mjs';
import { IntegrityRiskService } from '../services/admin/integrityRiskService.js';

const DEMO_DOMAIN = '@demo.sarathi.test';

/**
 * Generate a timestamp within the last 90 days, applying gentle upward trend,
 * weekday seasonality, and deliberate activity spikes.
 *
 * @param {number} dayOffset 0 (today) to 90 (90 days ago)
 * @returns {string} ISO date string
 */
function generateSeasonedTimestamp(dayOffset) {
  const now = Date.now();
  const targetDate = new Date(now - dayOffset * 24 * 60 * 60 * 1000);

  // Set random business hour between 09:00 and 19:00 UTC
  const hour = 9 + Math.floor(Math.random() * 10);
  const minute = Math.floor(Math.random() * 60);
  const second = Math.floor(Math.random() * 60);
  targetDate.setUTCHours(hour, minute, second, 0);

  return targetDate.toISOString();
}

export async function runAdminDemoSeeder({
  force = false,
  reset = false,
  userCount = 120,
  dbFile,
} = {}) {
  const isDemo = appConfig.mode === 'demo' || process.env.APP_MODE === 'demo';
  if (!isDemo && !force) {
    console.error('Refusing to seed demo data in non-demo mode without --force.');
    return { success: false, reason: 'NOT_DEMO_MODE' };
  }

  runMigrations(dbFile);
  const db = initDb(dbFile);

  // Reset existing demo data if requested
  if (reset) {
    console.log(`[SEED:DEMO] Resetting existing demo records matching "${DEMO_DOMAIN}"...`);
    const demoUserRows = db.prepare(`SELECT id FROM users WHERE email LIKE '%${DEMO_DOMAIN}';`).all();
    const demoUserIds = demoUserRows.map((r) => r.id);

    if (demoUserIds.length > 0) {
      const placeholders = demoUserIds.map(() => '?').join(',');
      db.prepare(`DELETE FROM session_scores WHERE session_id IN (SELECT id FROM assessment_sessions WHERE user_id IN (${placeholders}));`).run(...demoUserIds);
      db.prepare(`DELETE FROM integrity_events WHERE session_id IN (SELECT id FROM assessment_sessions WHERE user_id IN (${placeholders}));`).run(...demoUserIds);
      db.prepare(`DELETE FROM integrity_reviews WHERE session_id IN (SELECT id FROM assessment_sessions WHERE user_id IN (${placeholders}));`).run(...demoUserIds);
      db.prepare(`DELETE FROM assessment_sessions WHERE user_id IN (${placeholders});`).run(...demoUserIds);
      db.prepare(`DELETE FROM assessment_attempts WHERE candidate_id IN (${placeholders});`).run(...demoUserIds);
      db.prepare(`DELETE FROM assessment_results WHERE candidate_id IN (${placeholders});`).run(...demoUserIds);
      db.prepare(`DELETE FROM assessment_assignments WHERE candidate_id IN (${placeholders});`).run(...demoUserIds);
      db.prepare(`DELETE FROM skill_evidence WHERE candidate_id IN (${placeholders});`).run(...demoUserIds);
      db.prepare(`DELETE FROM candidate_skills WHERE candidate_id IN (${placeholders});`).run(...demoUserIds);
      db.prepare(`DELETE FROM canonical_skill_profiles WHERE candidate_id IN (${placeholders});`).run(...demoUserIds);
      db.prepare(`DELETE FROM applications WHERE candidate_id IN (${placeholders});`).run(...demoUserIds);
      db.prepare(`DELETE FROM candidate_profiles WHERE id IN (${placeholders});`).run(...demoUserIds);
      db.prepare(`DELETE FROM recruiter_profiles WHERE user_id IN (${placeholders});`).run(...demoUserIds);
      db.prepare(`DELETE FROM organisation_memberships WHERE user_id IN (${placeholders});`).run(...demoUserIds);
      db.prepare(`DELETE FROM jobs WHERE creator_id IN (${placeholders});`).run(...demoUserIds);
      db.prepare(`DELETE FROM business_verifications WHERE user_id IN (${placeholders}) OR id LIKE 'bv-demo-%';`).run(...demoUserIds);
      db.prepare(`DELETE FROM users WHERE id IN (${placeholders});`).run(...demoUserIds);
    }
    console.log(`[SEED:DEMO] Removed ${demoUserIds.length} demo users and associated records.`);
  }

  // Idempotency check: count existing demo users
  const existingCountRow = db.prepare(`SELECT COUNT(*) as cnt FROM users WHERE email LIKE '%${DEMO_DOMAIN}';`).get();
  if (existingCountRow?.cnt > 0 && !reset) {
    console.log(`[SEED:DEMO] Demo data already exists (${existingCountRow.cnt} demo users). Use --reset to re-seed.`);
    return { success: true, seeded: 0, existing: existingCountRow.cnt };
  }

  console.log(`[SEED:DEMO] Seeding realistic platform activity (${userCount} students, 25 recruiters, jobs, applications, assessments)...`);

  const now = new Date().toISOString();
  const passwordHash = await bcrypt.hash('password123', 8);

  const studentTarget = Math.max(10, userCount);
  const recruiterTarget = 25;
  const collegesTarget = 5;

  const demoStudents = [];
  const demoRecruiters = [];

  // Transactionally insert demo entities
  db.exec('BEGIN TRANSACTION;');

  try {
    // 1. Seed Students
    const studentNames = [
      'Aarav Sharma', 'Diya Patel', 'Rohan Iyer', 'Ananya Gupta', 'Kabir Sen',
      'Ishaan Roy', 'Pooja Nair', 'Siddharth Rao', 'Sneha Reddy', 'Aditya Joshi',
      'Tanvi Mehta', 'Varun Verma', 'Meera Bhatt', 'Karan Saxena', 'Rhea Kapoor',
    ];
    const domains = ['dom-fullstack', 'dom-frontend', 'dom-backend', 'dom-aiml', 'dom-cybersec'];
    const roles = ['Full-Stack Developer', 'Frontend Developer', 'Backend Developer', 'AI/ML Engineer', 'Security Analyst'];

    for (let i = 1; i <= studentTarget; i++) {
      const studentId = `usr-demo-stu-${i}`;
      const email = `student${i}${DEMO_DOMAIN}`;
      const name = `${studentNames[(i - 1) % studentNames.length]} ${Math.floor(i / studentNames.length) || ''}`.trim();
      const domain = domains[(i - 1) % domains.length];
      const targetRole = roles[(i - 1) % roles.length];

      // Spread over 90 days with recent bias
      const dayOffset = Math.floor(Math.pow(Math.random(), 1.5) * 89);
      const createdAt = generateSeasonedTimestamp(dayOffset);
      const lastLoginAt = dayOffset < 14 ? generateSeasonedTimestamp(Math.floor(dayOffset / 2)) : null;

      db.prepare(`
        INSERT INTO users (id, email, password_hash, full_name, role, status, company_name, institution, timezone, last_login_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, 'candidate', 'active', NULL, 'National Institute of Technology', 'Asia/Kolkata', ?, ?, ?);
      `).run(studentId, email, passwordHash, name, lastLoginAt, createdAt, createdAt);

      // Candidate Profile (90% profile completed)
      if (i % 10 !== 0) {
        db.prepare(`
          INSERT INTO candidate_profiles (
            id, headline, bio, location, github_url, target_role, experience_years, created_at, updated_at
          ) VALUES (?, ?, ?, 'Bangalore, India', ?, ?, ?, ?, ?);
        `).run(
          studentId,
          `Aspiring ${targetRole} | Final Year CS`,
          `Passionate software engineering student focused on building high-performance systems.`,
          `https://github.com/student${i}`,
          targetRole,
          i % 3 === 0 ? 1 : 0,
          createdAt,
          createdAt
        );
      }

      demoStudents.push({ id: studentId, domain, targetRole, createdAt, dayOffset });
    }

    // 2. Seed Recruiters & Organizations
    const companyNames = [
      'NexTech Innovations', 'Apex Cloud Systems', 'Vanguard Fintech', 'Zephyr Robotics', 'OmniData Labs'
    ];

    // Ensure demo organisations exist
    for (let c = 0; c < companyNames.length; c++) {
      const orgId = `org-demo-${c + 1}`;
      const name = companyNames[c];
      const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const now = new Date().toISOString();
      db.prepare(`
        INSERT OR IGNORE INTO organisations (id, name, slug, timezone, currency, settings, verification_status, created_at, updated_at)
        VALUES (?, ?, ?, 'Asia/Kolkata', 'INR', '{"industry": "Technology"}', 'unverified', ?, ?);
      `).run(orgId, name, slug, now, now);
    }

    for (let i = 1; i <= recruiterTarget; i++) {
      const recruiterId = `usr-demo-rec-${i}`;
      const email = `recruiter${i}${DEMO_DOMAIN}`;
      const orgIndex = (i - 1) % companyNames.length;
      const orgId = `org-demo-${orgIndex + 1}`;
      const company = companyNames[orgIndex];
      const dayOffset = Math.floor(Math.random() * 85);
      const createdAt = generateSeasonedTimestamp(dayOffset);
      const lastLoginAt = generateSeasonedTimestamp(Math.min(dayOffset, Math.floor(Math.random() * 10)));

      db.prepare(`
        INSERT INTO users (id, email, password_hash, full_name, role, status, company_name, institution, timezone, last_login_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, 'recruiter', 'active', ?, NULL, 'Asia/Kolkata', ?, ?, ?);
      `).run(recruiterId, email, passwordHash, `Recruiter Lead ${i}`, company, lastLoginAt, createdAt, createdAt);

      db.prepare(`
        INSERT INTO recruiter_profiles (user_id, department, title, created_at, updated_at)
        VALUES (?, 'Engineering Talent', 'Technical Talent Partner', ?, ?);
      `).run(recruiterId, createdAt, createdAt);

      db.prepare(`
        INSERT OR IGNORE INTO organisation_memberships (id, org_id, user_id, role, status, created_at, updated_at)
        VALUES (?, ?, ?, 'recruiter', 'active', ?, ?);
      `).run(`mem-demo-rec-${i}`, orgId, recruiterId, createdAt, createdAt);

      demoRecruiters.push({ id: recruiterId, orgId, company, createdAt, dayOffset });
    }

    // 3. Seed Jobs (~12 jobs)
    const demoJobs = [];
    for (let j = 1; j <= 12; j++) {
      const jobId = `job-demo-${j}`;
      const recruiter = demoRecruiters[(j - 1) % demoRecruiters.length];
      const domain = domains[(j - 1) % domains.length];
      const role = roles[(j - 1) % roles.length];
      const createdAt = generateSeasonedTimestamp(Math.min(recruiter.dayOffset, 80));

      db.prepare(`
        INSERT INTO jobs (id, org_id, creator_id, title, description, domain_id, employment_type, experience_level, location, work_arrangement, salary_min, salary_max, status, created_at, updated_at)
        VALUES (?, 'org-demo-1', ?, ?, 'Exciting engineering role working on scalable systems.', ?, 'full_time', 'entry', 'Bangalore', 'remote', 800000, 1400000, 'published', ?, ?);
      `).run(jobId, recruiter.id, `${role} (Core Engineering)`, domain, createdAt, createdAt);

      demoJobs.push({ id: jobId, domain, role, createdAt });
    }

    // 4. Seed Applications (~400 applications)
    let appIndex = 1;
    const stages = ['applied', 'screening', 'interview', 'offered', 'rejected'];

    for (const student of demoStudents) {
      // 1 to 4 applications per student
      const appCount = (student.dayOffset % 4) + 1;
      for (let a = 0; a < appCount; a++) {
        const job = demoJobs[(appIndex + a) % demoJobs.length];
        const appId = `app-demo-${appIndex++}`;
        const appDay = Math.max(0, student.dayOffset - Math.floor(Math.random() * 5));
        const appliedAt = generateSeasonedTimestamp(appDay);
        const stage = stages[Math.floor(Math.random() * stages.length)];

        db.prepare(`
          INSERT OR IGNORE INTO applications (id, org_id, job_id, candidate_id, stage, match_score, cover_note, applied_at, updated_at)
          VALUES (?, 'org-demo-1', ?, ?, ?, ?, 'Candidate assessed via diagnostic platform.', ?, ?);
        `).run(appId, job.id, student.id, stage, 70 + Math.floor(Math.random() * 25), appliedAt, appliedAt);
      }
    }

    // 5. Seed Assessment Sessions & Scores (~300 sessions)
    let sessionCount = 0;
    for (let i = 0; i < demoStudents.length; i++) {
      const student = demoStudents[i];
      // 2-3 sessions per student
      const testsToTake = 2 + (i % 2);

      for (let t = 0; t < testsToTake; t++) {
        sessionCount++;
        const sessionId = `ses-demo-${sessionCount}`;
        const testDay = Math.max(0, student.dayOffset - Math.floor(Math.random() * 10));
        const startedAt = generateSeasonedTimestamp(testDay);
        const submittedAt = generateSeasonedTimestamp(testDay);
        const isSecure = (sessionCount % 3) !== 0;

        // Score generation: 25-96 score range with bell distribution
        const baseScore = 40 + Math.floor(Math.random() * 55);
        const knowledgeScore = Math.min(100, baseScore + Math.floor(Math.random() * 10) - 5);
        const practicalScore = Math.min(100, baseScore + Math.floor(Math.random() * 10) - 5);
        const technicalScore = Math.round(0.4 * knowledgeScore + 0.6 * practicalScore);

        db.prepare(`
          INSERT INTO assessment_sessions (
            id, user_id, mode, domain_id, role, status, started_at, expires_at, submitted_at, engine_version
          ) VALUES (?, ?, ?, ?, ?, 'graded', ?, ?, ?, 'v2');
        `).run(
          sessionId,
          student.id,
          isSecure ? 'secure' : 'practice',
          student.domain,
          student.targetRole,
          startedAt,
          submittedAt,
          submittedAt
        );

        db.prepare(`
          INSERT INTO session_scores (
            session_id, technical_score, knowledge_score, practical_score, rubric_json, skill_scores, graded_at
          ) VALUES (?, ?, ?, ?, '{}', '{}', ?);
        `).run(sessionId, technicalScore, knowledgeScore, practicalScore, submittedAt);

        // Insert code snapshot so similarity and code analysis have data
        const sampleCode = `import math\ndef euclidean_distance(p1, p2):\n    # Variant ${sessionCount}\n    diffs = [(x - y) ** 2 for x, y in zip(p1, p2)]\n    return math.sqrt(sum(diffs))\n`;
        db.prepare(`
          INSERT INTO submission_snapshots (id, session_id, question_id, code, language, reason, created_at)
          VALUES (?, ?, 'q-aiml-code-01', ?, 'python', 'submit', ?);
        `).run(`snap-demo-${sessionCount}`, sessionId, sampleCode, submittedAt);

        // Populate a few integrity events for secure tests
        if (isSecure && sessionCount % 12 === 0) {
          const eventType = sessionCount % 2 === 0 ? 'fullscreen_exit' : 'paste_blocked';
          db.prepare(`
            INSERT INTO integrity_events (id, session_id, type, ts, meta)
            VALUES (?, ?, ?, ?, '{"simulated": true, "pastedLength": 120}');
          `).run(`ie-demo-${sessionCount}`, sessionId, eventType, startedAt);
        }
      }
    }

    // ==========================================
    // 5b. Anti-Cheat Demo Fixtures: Copycat Pair & Paste-Heavy Case (PRD 5.2)
    // ==========================================
    const copycatCode = `import math\n\ndef euclidean_distance(p1, p2):\n    # Normalized vector space Euclidean distance calculation\n    if len(p1) != len(p2):\n        raise ValueError("Dimensions must match")\n    squared_deltas = [(a - b) ** 2 for a, b in zip(p1, p2)]\n    return math.sqrt(sum(squared_deltas))\n`;
    const copycatDate1 = generateSeasonedTimestamp(5);
    const copycatDate2 = generateSeasonedTimestamp(3);

    // Copycat 1
    const copycat1Id = 'ses-demo-copycat-1';
    db.prepare(`
      INSERT INTO assessment_sessions (
        id, user_id, mode, domain_id, role, status, started_at, expires_at, submitted_at, engine_version
      ) VALUES (?, ?, 'secure', 'dom-aiml', 'AI/ML Engineer', 'graded', ?, ?, ?, 'v2');
    `).run(copycat1Id, demoStudents[1]?.id || demoStudents[0].id, copycatDate1, copycatDate1, copycatDate1);

    db.prepare(`
      INSERT INTO session_scores (session_id, technical_score, knowledge_score, practical_score, rubric_json, skill_scores, graded_at)
      VALUES (?, 92, 90, 94, '{}', '{}', ?);
    `).run(copycat1Id, copycatDate1);

    db.prepare(`
      INSERT INTO submission_snapshots (id, session_id, question_id, code, language, reason, created_at)
      VALUES (?, ?, 'q-aiml-code-01', ?, 'python', 'submit', ?);
    `).run('snap-copycat-1', copycat1Id, copycatCode, copycatDate1);

    // Copycat 2 (submitted 2 days later by another candidate with identical code)
    const copycat2Id = 'ses-demo-copycat-2';
    db.prepare(`
      INSERT INTO assessment_sessions (
        id, user_id, mode, domain_id, role, status, started_at, expires_at, submitted_at, engine_version
      ) VALUES (?, ?, 'secure', 'dom-aiml', 'AI/ML Engineer', 'graded', ?, ?, ?, 'v2');
    `).run(copycat2Id, demoStudents[2]?.id || demoStudents[0].id, copycatDate2, copycatDate2, copycatDate2);

    db.prepare(`
      INSERT INTO session_scores (session_id, technical_score, knowledge_score, practical_score, rubric_json, skill_scores, graded_at)
      VALUES (?, 92, 90, 94, '{}', '{}', ?);
    `).run(copycat2Id, copycatDate2);

    db.prepare(`
      INSERT INTO submission_snapshots (id, session_id, question_id, code, language, reason, created_at)
      VALUES (?, ?, 'q-aiml-code-01', ?, 'python', 'submit', ?);
    `).run('snap-copycat-2', copycat2Id, copycatCode, copycatDate2);

    // Paste-Heavy Case: multiple paste events covering > 80% of final code + focus loss
    const pasteHeavyId = 'ses-demo-paste-heavy';
    const pasteDate = generateSeasonedTimestamp(1);
    db.prepare(`
      INSERT INTO assessment_sessions (
        id, user_id, mode, domain_id, role, status, started_at, expires_at, submitted_at, engine_version
      ) VALUES (?, ?, 'secure', 'dom-aiml', 'AI/ML Engineer', 'graded', ?, ?, ?, 'v2');
    `).run(pasteHeavyId, demoStudents[3]?.id || demoStudents[0].id, pasteDate, pasteDate, pasteDate);

    db.prepare(`
      INSERT INTO session_scores (session_id, technical_score, knowledge_score, practical_score, rubric_json, skill_scores, graded_at)
      VALUES (?, 85, 80, 88, '{}', '{}', ?);
    `).run(pasteHeavyId, pasteDate);

    db.prepare(`
      INSERT INTO submission_snapshots (id, session_id, question_id, code, language, reason, created_at)
      VALUES (?, ?, 'q-aiml-code-01', ?, 'python', 'submit', ?);
    `).run('snap-paste-heavy', pasteHeavyId, copycatCode, pasteDate);

    // Add paste events & blur events
    for (let p = 1; p <= 4; p++) {
      db.prepare(`
        INSERT INTO integrity_events (id, session_id, type, ts, meta)
        VALUES (?, ?, 'paste_blocked', ?, '{"pastedLength": 180}');
      `).run(`ie-paste-${p}`, pasteHeavyId, pasteDate);
    }
    db.prepare(`
      INSERT INTO integrity_events (id, session_id, type, ts, meta)
      VALUES (?, ?, 'visibility_hidden', ?, '{}');
    `).run('ie-blur-1', pasteHeavyId, pasteDate);
    db.prepare(`
      INSERT INTO integrity_events (id, session_id, type, ts, meta)
      VALUES (?, ?, 'fullscreen_exit', ?, '{}');
    `).run('ie-blur-2', pasteHeavyId, pasteDate);

    // 6. Deliberate Attention Item: Unreviewed Flagged Session > 24h
    const attentionSessionId = `ses-demo-attention-1`;
    const twoDaysAgo = generateSeasonedTimestamp(2);
    db.prepare(`
      INSERT INTO assessment_sessions (
        id, user_id, mode, domain_id, role, status, started_at, expires_at, submitted_at, engine_version
      ) VALUES (?, ?, 'secure', 'dom-fullstack', 'Full-Stack Developer', 'graded', ?, ?, ?, 'v2');
    `).run(attentionSessionId, demoStudents[0].id, twoDaysAgo, twoDaysAgo, twoDaysAgo);

    db.prepare(`
      INSERT INTO session_scores (session_id, technical_score, knowledge_score, practical_score, rubric_json, skill_scores, graded_at)
      VALUES (?, 78, 80, 76, '{}', '{}', ?);
    `).run(attentionSessionId, twoDaysAgo);

    db.prepare(`
      INSERT INTO submission_snapshots (id, session_id, question_id, code, language, reason, created_at)
      VALUES (?, ?, 'q-aiml-code-01', ?, 'python', 'submit', ?);
    `).run('snap-demo-attn-1', attentionSessionId, copycatCode, twoDaysAgo);

    db.prepare(`
      INSERT INTO integrity_events (id, session_id, type, ts, meta)
      VALUES (?, ?, 'fullscreen_exit', ?, '{"simulated": true}');
    `).run(`ie-demo-attn-1`, attentionSessionId, twoDaysAgo);

    for (let p = 1; p <= 3; p++) {
      db.prepare(`
        INSERT INTO integrity_events (id, session_id, type, ts, meta)
        VALUES (?, ?, 'paste_blocked', ?, '{"pastedLength": 210}');
      `).run(`ie-demo-attn-paste-${p}`, attentionSessionId, twoDaysAgo);
    }

    // 7. Compute & Save Risk Scores for all seeded sessions
    const sessionsToScore = db.prepare(`SELECT id FROM assessment_sessions;`).all();
    for (const s of sessionsToScore) {
      try {
        IntegrityRiskService.computeAndSave(s.id, db);
      } catch (scoreErr) {
        // Silently continue for incomplete mock sessions
      }
    }

    // 5. Seed Business Verifications (~10 items: 5 pending, 3 approved, 1 rejected, 1 needs_info)
    const verificationSeedData = [
      {
        id: 'bv-demo-1',
        orgId: 'org-demo-1',
        userId: 'usr-demo-rec-1',
        docType: 'gstin',
        docName: 'nextech-gstin-certificate.pdf',
        file: 'sample-gstin.pdf',
        mime: 'application/pdf',
        size: 34520,
        hash: 'hash-nextech-gstin-v1',
        taxId: '27AAPCN1234C1Z5',
        status: 'pending',
        submittedOffsetHours: 8, // SLA ok (<24h)
        reviewedOffsetHours: null,
        reason: null,
      },
      {
        id: 'bv-demo-2',
        orgId: 'org-demo-2',
        userId: 'usr-demo-rec-2',
        docType: 'pan',
        docName: 'apex-systems-pan.jpg',
        file: 'sample-pan.jpg',
        mime: 'image/jpeg',
        size: 18450,
        hash: 'hash-apex-pan-v1',
        taxId: 'AAPCA9876C',
        status: 'pending',
        submittedOffsetHours: 32, // SLA warning (24-48h)
        reviewedOffsetHours: null,
        reason: null,
      },
      {
        id: 'bv-demo-3',
        orgId: 'org-demo-3',
        userId: 'usr-demo-rec-3',
        docType: 'incorporation',
        docName: 'vanguard-incorporation-cert.png',
        file: 'sample-incorporation.png',
        mime: 'image/png',
        size: 89400,
        hash: 'hash-vanguard-incorp-v1',
        taxId: '29AABCV5555C1Z2',
        status: 'pending',
        submittedOffsetHours: 58, // SLA breached (>48h)
        reviewedOffsetHours: null,
        reason: null,
      },
      {
        id: 'bv-demo-4',
        orgId: 'org-demo-4',
        userId: 'usr-demo-rec-4',
        docType: 'utility_bill',
        docName: 'zephyr-electricity-bill-oct.pdf',
        file: 'sample-gstin.pdf',
        mime: 'application/pdf',
        size: 42100,
        hash: 'hash-zephyr-bill-v1',
        taxId: null,
        status: 'pending',
        submittedOffsetHours: 72, // SLA breached (>48h)
        reviewedOffsetHours: null,
        reason: null,
      },
      {
        id: 'bv-demo-5',
        orgId: 'org-demo-5',
        userId: 'usr-demo-rec-5',
        docType: 'gstin',
        docName: 'omnidata-gst-registration.pdf',
        file: 'sample-gstin.pdf',
        mime: 'application/pdf',
        size: 51200,
        hash: 'hash-omnidata-gst-v1',
        taxId: '07AAPCO4321C1Z8',
        status: 'pending',
        submittedOffsetHours: 14, // SLA ok (<24h)
        reviewedOffsetHours: null,
        reason: null,
      },
      {
        id: 'bv-demo-6',
        orgId: 'org-demo-1',
        userId: 'usr-demo-rec-1',
        docType: 'incorporation',
        docName: 'nextech-articles-of-incorp.pdf',
        file: 'sample-gstin.pdf',
        mime: 'application/pdf',
        size: 104200,
        hash: 'hash-nextech-incorp-v1',
        taxId: '27AAPCN1234C1Z5',
        status: 'approved',
        submittedOffsetHours: 120,
        reviewedOffsetHours: 96,
        reason: 'Valid certificate and matching corporate records',
      },
      {
        id: 'bv-demo-7',
        orgId: 'org-demo-2',
        userId: 'usr-demo-rec-2',
        docType: 'gstin',
        docName: 'apex-gst-filing.pdf',
        file: 'sample-gstin.pdf',
        mime: 'application/pdf',
        size: 67300,
        hash: 'hash-apex-gst-v1',
        taxId: '29AAPCA9876C1Z3',
        status: 'approved',
        submittedOffsetHours: 200,
        reviewedOffsetHours: 170,
        reason: 'Verified through corporate registry',
      },
      {
        id: 'bv-demo-8',
        orgId: 'org-demo-3',
        userId: 'usr-demo-rec-3',
        docType: 'pan',
        docName: 'vanguard-pan-blurry.jpg',
        file: 'sample-pan.jpg',
        mime: 'image/jpeg',
        size: 15400,
        hash: 'hash-vanguard-pan-blurry',
        taxId: 'AABCV5555C',
        status: 'rejected',
        submittedOffsetHours: 180,
        reviewedOffsetHours: 150,
        reason: 'Document unreadable: Please provide a high-resolution color scan',
      },
      {
        id: 'bv-demo-9',
        orgId: 'org-demo-4',
        userId: 'usr-demo-rec-4',
        docType: 'utility_bill',
        docName: 'zephyr-old-bill.pdf',
        file: 'sample-gstin.pdf',
        mime: 'application/pdf',
        size: 32000,
        hash: 'hash-zephyr-old-bill',
        taxId: null,
        status: 'needs_info',
        submittedOffsetHours: 90,
        reviewedOffsetHours: 65,
        reason: 'Registration expired: Utility bill is dated over 6 months ago',
      },
      {
        id: 'bv-demo-10',
        orgId: 'org-demo-5',
        userId: 'usr-demo-rec-5',
        docType: 'pan',
        docName: 'omnidata-incorporation.png',
        file: 'sample-incorporation.png',
        mime: 'image/png',
        size: 45000,
        hash: 'hash-omnidata-pan-v1',
        taxId: 'AAPCO4321C',
        status: 'approved',
        submittedOffsetHours: 350,
        reviewedOffsetHours: 320,
        reason: 'Corporate registration successfully validated',
      },
    ];

    const adminRow = db.prepare("SELECT id FROM users WHERE role = 'platform_admin' LIMIT 1;").get();
    const adminIdForReview = adminRow?.id || null;

    const uploadsDir = 'server/data/uploads';
    for (const v of verificationSeedData) {
      const nowMs = Date.now();
      const submittedAt = new Date(nowMs - v.submittedOffsetHours * 3600 * 1000).toISOString();
      const reviewedAt = v.reviewedOffsetHours ? new Date(nowMs - v.reviewedOffsetHours * 3600 * 1000).toISOString() : null;
      const filePath = `${uploadsDir}/${v.file}`;

      db.prepare(`
        INSERT OR REPLACE INTO business_verifications (
          id, org_id, user_id, document_type, document_name, file_path, file_size,
          mime_type, file_hash, tax_identifier, status, submitted_at, reviewed_at,
          reviewed_by, decision_reason, decision_notes, override, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?);
      `).run(
        v.id,
        v.orgId,
        v.userId,
        v.docType,
        v.docName,
        filePath,
        v.size,
        v.mime,
        v.hash,
        v.taxId,
        v.status,
        submittedAt,
        reviewedAt,
        v.status !== 'pending' ? adminIdForReview : null,
        v.reason,
        null,
        submittedAt,
        reviewedAt || submittedAt
      );

      if (v.status === 'approved') {
        db.prepare("UPDATE organisations SET verification_status = 'verified' WHERE id = ?;").run(v.orgId);
      }
    }

    db.exec('COMMIT;');
    console.log(`[SEED:DEMO] Success! Created ${studentTarget} students, ${recruiterTarget} recruiters, 12 jobs, ${appIndex - 1} applications, ${sessionCount} assessment sessions, ${verificationSeedData.length} verifications.`);
    return { success: true, seededStudents: studentTarget, seededRecruiters: recruiterTarget, seededSessions: sessionCount, seededVerifications: verificationSeedData.length };
  } catch (err) {
    db.exec('ROLLBACK;');
    console.error('[SEED:DEMO] Transaction rolled back due to error:', err);
    throw err;
  }
}

// CLI entry point
if (process.argv[1]?.includes('adminDemoSeeder')) {
  const force = process.argv.includes('--force');
  const reset = process.argv.includes('--reset');
  let userCount = 120;

  const usersIndex = process.argv.indexOf('--users');
  if (usersIndex !== -1 && process.argv[usersIndex + 1]) {
    userCount = parseInt(process.argv[usersIndex + 1], 10) || 120;
  }

  try {
    await runAdminDemoSeeder({ force, reset, userCount });
    process.exit(0);
  } catch (err) {
    console.error('Demo seed failed:', err.message);
    process.exit(1);
  } finally {
    closeDb();
  }
}
