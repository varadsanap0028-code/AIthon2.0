import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import app from '../../index.js';
import { initDb } from '../../config/db.js';
import { authService } from '../../services/authService.js';
import { IntegrityRiskService } from '../../services/admin/integrityRiskService.js';
import { SkillEvidenceEngine } from '../../services/skillEvidenceEngine.js';

describe('Admin Test Integrity Integration Suite (PRD Phase 5)', () => {
  let server;
  let baseUrl;
  let adminToken;
  let studentToken;
  let adminUser;
  let testStudent;
  let testSessionId;
  let copycatSessionId;

  before(async () => {
    server = createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;

    const db = initDb();
    const now = new Date().toISOString();

    // 1. Create Admin
    adminUser = {
      id: `usr-admin-integ-${Date.now()}`,
      email: `admin-integ-${Date.now()}@sarathi.dev`,
      full_name: 'Integrity Proctor Admin',
      role: 'platform_admin',
      status: 'active',
      created_at: now,
      updated_at: now,
    };
    db.prepare(`
      INSERT INTO users (id, email, full_name, role, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(adminUser.id, adminUser.email, adminUser.full_name, adminUser.role, adminUser.status, now, now);

    adminToken = authService.generateToken({
      id: adminUser.id,
      email: adminUser.email,
      fullName: adminUser.full_name,
      role: 'platform_admin',
    });

    // 2. Create Student
    testStudent = {
      id: `usr-stud-integ-${Date.now()}`,
      email: `student-integ-${Date.now()}@sarathi.dev`,
      full_name: 'Aarav Proctor Candidate',
      role: 'student',
      status: 'active',
      created_at: now,
      updated_at: now,
    };
    db.prepare(`
      INSERT INTO users (id, email, full_name, role, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(testStudent.id, testStudent.email, testStudent.full_name, testStudent.role, testStudent.status, now, now);

    studentToken = authService.generateToken({
      id: testStudent.id,
      email: testStudent.email,
      fullName: testStudent.full_name,
      role: 'student',
    });

    // 3. Create Assessment Session with high-risk events
    testSessionId = `ses-test-integ-${Date.now()}`;
    db.prepare(`
      INSERT INTO assessment_sessions (
        id, user_id, mode, domain_id, role, status, started_at, expires_at, submitted_at, engine_version
      ) VALUES (?, ?, 'secure', 'dom-aiml', 'AI/ML Engineer', 'graded', ?, ?, ?, 'v2')
    `).run(testSessionId, testStudent.id, now, now, now);

    db.prepare(`
      INSERT INTO session_scores (
        session_id, technical_score, knowledge_score, practical_score, rubric_json, skill_scores, graded_at
      ) VALUES (?, 90, 88, 92, '{}', '{}', ?)
    `).run(testSessionId, now);

    // Code snapshot
    const testCode = `import math\n\ndef euclidean_distance(p1, p2):\n    return math.sqrt(sum((a - b)**2 for a, b in zip(p1, p2)))\n`;
    db.prepare(`
      INSERT INTO submission_snapshots (id, session_id, question_id, code, language, reason, created_at)
      VALUES (?, ?, 'q-aiml-code-01', ?, 'python', 'submit', ?)
    `).run(`snap-test-1-${Date.now()}`, testSessionId, testCode, now);

    // Suspicious integrity events: multiple paste events + window exit
    for (let i = 1; i <= 5; i++) {
      db.prepare(`
        INSERT INTO integrity_events (id, session_id, type, ts, meta)
        VALUES (?, ?, 'paste_blocked', ?, '{"pastedLength": 250}')
      `).run(`ie-test-paste-${i}-${Date.now()}`, testSessionId, now);
    }
    db.prepare(`
      INSERT INTO integrity_events (id, session_id, type, ts, meta)
      VALUES (?, ?, 'visibility_hidden', ?, '{}')
    `).run(`ie-test-blur-1-${Date.now()}`, testSessionId, now);
    db.prepare(`
      INSERT INTO integrity_events (id, session_id, type, ts, meta)
      VALUES (?, ?, 'visibility_visible', ?, '{}')
    `).run(`ie-test-focus-1-${Date.now()}`, testSessionId, now);

    // Initial risk computation
    IntegrityRiskService.computeAndSave(testSessionId, db);

    // 4. Create a second session (copycat peer)
    copycatSessionId = `ses-test-copycat-${Date.now()}`;
    db.prepare(`
      INSERT INTO assessment_sessions (
        id, user_id, mode, domain_id, role, status, started_at, expires_at, submitted_at, engine_version
      ) VALUES (?, ?, 'secure', 'dom-aiml', 'AI/ML Engineer', 'graded', ?, ?, ?, 'v2')
    `).run(copycatSessionId, testStudent.id, now, now, now);

    db.prepare(`
      INSERT INTO submission_snapshots (id, session_id, question_id, code, language, reason, created_at)
      VALUES (?, ?, 'q-aiml-code-01', ?, 'python', 'submit', ?)
    `).run(`snap-test-2-${Date.now()}`, copycatSessionId, testCode, now);

    IntegrityRiskService.computeAndSave(copycatSessionId, db);
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it('1. GET /api/admin/integrity/stats returns comprehensive anti-cheat overview', async () => {
    const res = await fetch(`${baseUrl}/api/admin/integrity/stats`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res.status, 200);
    const data = await res.json();

    assert.ok(typeof data.unreviewedHighRisk === 'number');
    assert.ok(typeof data.flagRatePct === 'number');
    assert.ok(typeof data.avgReviewHours === 'number');
    assert.ok(data.bandDistribution);
    assert.ok(Array.isArray(data.flagsPerDay));
    assert.ok(Array.isArray(data.topQuestions));
  });

  it('2. GET /api/admin/integrity/sessions supports filtering, pagination, and sorting', async () => {
    const res = await fetch(`${baseUrl}/api/admin/integrity/sessions?page=1&pageSize=10`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res.status, 200);
    const data = await res.json();

    assert.ok(Array.isArray(data.sessions));
    assert.ok(data.total >= 1);
    assert.equal(data.page, 1);

    const first = data.sessions[0];
    assert.ok(first.id);
    assert.ok(first.candidateName);
    assert.ok(typeof first.score === 'number');
    assert.ok(['low', 'medium', 'high'].includes(first.band));
    assert.ok(['unreviewed', 'clean', 'violation', 'escalated'].includes(first.reviewStatus));
  });

  it('3. GET /api/admin/integrity/sessions/:id returns complete timeline and risk breakdown', async () => {
    const res = await fetch(`${baseUrl}/api/admin/integrity/sessions/${testSessionId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res.status, 200);
    const data = await res.json();

    assert.equal(data.session.id, testSessionId);
    assert.ok(data.risk);
    assert.ok(data.risk.score >= 0);
    assert.ok(Array.isArray(data.risk.reasons));
    assert.ok(data.risk.contributions);
    assert.ok(Array.isArray(data.timeline));
    assert.ok(Array.isArray(data.snapshots));
  });

  it('4. GET /api/admin/integrity/sessions/:id/compare/:otherId returns diff with anonymized peer', async () => {
    const res = await fetch(`${baseUrl}/api/admin/integrity/sessions/${testSessionId}/compare/${copycatSessionId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res.status, 200);
    const data = await res.json();

    assert.ok(data.sessionCode);
    assert.ok(data.otherCode);
    assert.equal(data.otherCandidateLabel, 'Candidate B');
    assert.ok(data.similarityPct >= 90);
  });

  it('5. POST /api/admin/integrity/sessions/:id/review enforces validation and records clean review', async () => {
    // Note too short
    const shortRes = await fetch(`${baseUrl}/api/admin/integrity/sessions/${testSessionId}/review`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ decision: 'clean', notes: 'ok' }),
    });
    assert.equal(shortRes.status, 400);

    // Valid review
    const res = await fetch(`${baseUrl}/api/admin/integrity/sessions/${testSessionId}/review`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ decision: 'clean', notes: 'Reviewed video and logs. Code patterns deemed acceptable.' }),
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.decision, 'clean');
  });

  it('6. Changing review decision audits integrity.override', async () => {
    const res = await fetch(`${baseUrl}/api/admin/integrity/sessions/${testSessionId}/review`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        decision: 'violation',
        notes: 'Overturning earlier clean decision: similarity confirmed with external repository.',
      }),
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.isOverride, true);

    const db = initDb();
    const auditRow = db.prepare(`
      SELECT * FROM admin_audit_log WHERE action = 'integrity.override' AND entity_id = ?
    `).get(testSessionId);
    assert.ok(auditRow);
  });

  it('7. Violation with invalidateScore zeroes session scores and marks skills unverified', async () => {
    const db = initDb();
    const now = new Date().toISOString();

    // Create candidate_skill record using existing skill ID
    const skillRow = db.prepare("SELECT id FROM skills LIMIT 1").get();
    const skillId = skillRow?.id || 'sk-react';
    db.prepare(`
      INSERT OR REPLACE INTO candidate_skills (id, candidate_id, skill_id, proficiency, verification_status, created_at, updated_at)
      VALUES (?, ?, ?, 3, 'verified', ?, ?)
    `).run(`cs-test-${Date.now()}`, testStudent.id, skillId, now, now);

    const res = await fetch(`${baseUrl}/api/admin/integrity/sessions/${testSessionId}/review`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        decision: 'violation',
        notes: 'Confirmed unauthorized code pasting. Invalidation required.',
        invalidateScore: true,
      }),
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.scoreInvalidated, true);

    // Verify session_scores zeroed
    const scoreRow = db.prepare(`SELECT technical_score FROM session_scores WHERE session_id = ?`).get(testSessionId);
    assert.equal(scoreRow.technical_score, 0);

    // Verify candidate_skills unverified
    const candidateSkillRow = db.prepare(`SELECT verification_status FROM candidate_skills WHERE candidate_id = ? LIMIT 1`).get(testStudent.id);
    assert.equal(candidateSkillRow.verification_status, 'unverified');
  });

  it('8. POST /api/admin/integrity/sessions/:id/recompute recalculates score and writes audit', async () => {
    const res = await fetch(`${baseUrl}/api/admin/integrity/sessions/${testSessionId}/recompute`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(typeof data.score === 'number');

    const db = initDb();
    const auditRow = db.prepare(`
      SELECT * FROM admin_audit_log WHERE action = 'integrity.recompute' AND entity_id = ?
    `).get(testSessionId);
    assert.ok(auditRow);
  });

  it('9. Non-admin roles receive 403 Forbidden on /api/admin/integrity/*', async () => {
    const res = await fetch(`${baseUrl}/api/admin/integrity/stats`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert.equal(res.status, 403);
  });
});
