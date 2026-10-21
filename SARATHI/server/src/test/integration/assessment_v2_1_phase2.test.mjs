import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import app from '../../index.js';
import { authService } from '../../services/authService.js';
import { assessmentV2 } from '../../config/index.js';
import { seedAssessmentBank } from '../../data/seeds/assessmentSeeder.js';
import { initDb } from '../../config/db.js';

describe('Assessment V2.1 Phase 2: Candidate Experience, Accommodations & Review Workflow', () => {
  let server;
  let baseUrl;
  let candidateToken;
  let recruiterToken;
  const candidateId = 'usr-cand-p2';
  const recruiterId = 'usr-rec-p2';
  let sessionId;

  before(async () => {
    assessmentV2.enabled = true;
    assessmentV2.v2_1Enabled = true;

    seedAssessmentBank();

    const db = initDb();
    const now = new Date().toISOString();

    db.prepare(`DELETE FROM candidate_skills WHERE candidate_id = ?`).run(candidateId);
    db.prepare(`DELETE FROM assessment_sessions WHERE user_id = ?`).run(candidateId);

    db.prepare(`
      INSERT OR IGNORE INTO users (id, email, full_name, role, created_at, updated_at)
      VALUES (?, ?, ?, 'candidate', ?, ?), (?, ?, ?, 'recruiter', ?, ?)
    `).run(
      candidateId, 'p2cand@example.com', 'Candidate Phase2', now, now,
      recruiterId, 'p2rec@example.com', 'Recruiter Phase2', now, now
    );

    candidateToken = authService.generateToken({
      id: candidateId,
      email: 'p2cand@example.com',
      fullName: 'Candidate Phase2',
      role: 'candidate',
      globalRole: 'candidate',
    });

    recruiterToken = authService.generateToken({
      id: recruiterId,
      email: 'p2rec@example.com',
      fullName: 'Recruiter Phase2',
      role: 'recruiter',
      globalRole: 'recruiter',
    });

    await new Promise((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        const addr = server.address();
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  test('1. Accommodations: extendedTimeMultiplier (1.5x) and screenReaderMode grant extra time and paste allowance', async () => {
    const res = await fetch(`${baseUrl}/api/assessments/v2/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${candidateToken}`,
      },
      body: JSON.stringify({
        mode: 'secure',
        domainId: 'web-dev',
        role: 'Full Stack Engineer',
        consent: { agreed: true },
        accommodation: {
          extendedTimeMultiplier: 1.5,
          screenReaderMode: true,
        },
      }),
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    sessionId = body.sessionId;

    // Standard time is 45 min; 1.5x multiplier -> 68 min
    assert.ok(body.rules.timeLimitMinutes >= 67, `Expected >= 67 minutes, got ${body.rules.timeLimitMinutes}`);
    assert.equal(body.rules.pasteAllowed, true, 'pasteAllowed must be true under screenReaderMode');
  });

  test('2. Integrity event batching records multiple events non-destructively', async () => {
    const res = await fetch(`${baseUrl}/api/assessments/v2/sessions/${sessionId}/integrity-events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${candidateToken}`,
      },
      body: JSON.stringify({
        events: [
          { type: 'visibility_hidden', meta: { awaySec: 15 } },
          { type: 'visibility_visible', meta: { awaySec: 15 } },
          { type: 'fullscreen_exit', meta: {} },
        ],
      }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.count, 3);
  });

  test('3. Submit session grades candidate and creates review queue entry', async () => {
    const res = await fetch(`${baseUrl}/api/assessments/v2/sessions/${sessionId}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${candidateToken}`,
      },
      body: JSON.stringify({
        answers: { 'q-web-mcq-01': 1, 'q-web-mcq-02': 2 },
        tasks: {},
      }),
    });

    assert.equal(res.status, 200);
    const result = await res.json();
    assert.ok(typeof result.technicalScore === 'number');

    // Candidate initial verification status is diagnostic_tested
    const db = initDb();
    const candSkill = db.prepare(`SELECT verification_status FROM candidate_skills WHERE candidate_id = ?`).get(candidateId);
    assert.ok(candSkill);
    assert.equal(candSkill.verification_status, 'diagnostic_tested');
  });

  test('4. Reviewer queue enforces RBAC: candidate receives 403; recruiter receives 200', async () => {
    // Candidate cannot access review queue
    const candRes = await fetch(`${baseUrl}/api/assessments/v2/reviews/queue`, {
      headers: { Authorization: `Bearer ${candidateToken}` },
    });
    assert.equal(candRes.status, 403);

    // Recruiter can access review queue
    const recRes = await fetch(`${baseUrl}/api/assessments/v2/reviews/queue`, {
      headers: { Authorization: `Bearer ${recruiterToken}` },
    });
    assert.equal(recRes.status, 200);
    const queue = await recRes.json();
    assert.equal(queue.success, true);
    assert.ok(Array.isArray(queue.data));
    const entry = queue.data.find(q => q.sessionId === sessionId);
    assert.ok(entry, 'Completed session should appear in reviewer queue');
  });

  test('5. Reviewer decision rejects empty/short rationale (< 5 chars)', async () => {
    const res = await fetch(`${baseUrl}/api/assessments/v2/reviews/${sessionId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${recruiterToken}`,
      },
      body: JSON.stringify({
        decision: 'verified',
        note: 'ok', // too short!
      }),
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.error?.code, 'VALIDATION_ERROR');
  });

  test('6. Reviewer verification promotes verification_status to verified without altering technical score', async () => {
    const db = initDb();
    const preScore = db.prepare(`SELECT technical_score FROM session_scores WHERE session_id = ?`).get(sessionId);

    const res = await fetch(`${baseUrl}/api/assessments/v2/reviews/${sessionId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${recruiterToken}`,
      },
      body: JSON.stringify({
        decision: 'verified',
        note: 'Code implementation and solution patterns manually inspected and verified.',
      }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.decision, 'verified');

    // Candidate skills promoted to verified
    const candSkill = db.prepare(`SELECT verification_status FROM candidate_skills WHERE candidate_id = ?`).get(candidateId);
    assert.equal(candSkill.verification_status, 'verified');

    // Technical score strictly preserved
    const postScore = db.prepare(`SELECT technical_score FROM session_scores WHERE session_id = ?`).get(sessionId);
    assert.equal(postScore.technical_score, preScore.technical_score);
  });

  test('7. Reviewer flag demotes verification_status to unverified without altering technical score', async () => {
    const db = initDb();
    const preScore = db.prepare(`SELECT technical_score FROM session_scores WHERE session_id = ?`).get(sessionId);

    const res = await fetch(`${baseUrl}/api/assessments/v2/reviews/${sessionId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${recruiterToken}`,
      },
      body: JSON.stringify({
        decision: 'flagged',
        note: 'Flagged for follow-up verification due to anomalous focus away indicators.',
      }),
    });

    assert.equal(res.status, 200);

    // Candidate skills demoted to unverified
    const candSkill = db.prepare(`SELECT verification_status FROM candidate_skills WHERE candidate_id = ?`).get(candidateId);
    assert.equal(candSkill.verification_status, 'unverified');

    // Technical score STILL strictly preserved
    const postScore = db.prepare(`SELECT technical_score FROM session_scores WHERE session_id = ?`).get(sessionId);
    assert.equal(postScore.technical_score, preScore.technical_score);
  });
});
