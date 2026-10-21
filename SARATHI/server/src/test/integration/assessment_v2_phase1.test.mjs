import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import app from '../../index.js';
import { authService } from '../../services/authService.js';
import { assessmentV2 } from '../../config/index.js';
import { seedAssessmentBank } from '../../data/seeds/assessmentSeeder.js';

describe('Phase 1: Assessment V2 Foundation & Security Contracts', () => {
  let server;
  let baseUrl;
  let candidateToken;
  let candidate2Token;
  let student1Id = 'usr-cand-v2-1';
  let student2Id = 'usr-cand-v2-2';

  before(async () => {
    seedAssessmentBank();

    const { initDb } = await import('../../config/db.js');
    const db = initDb();
    const now = new Date().toISOString();
    db.prepare(`
      INSERT OR IGNORE INTO users (id, email, full_name, role, created_at, updated_at)
      VALUES (?, ?, ?, 'candidate', ?, ?), (?, ?, ?, 'candidate', ?, ?)
    `).run(
      student1Id, 'v2student1@example.com', 'V2 Student One', now, now,
      student2Id, 'v2student2@example.com', 'V2 Student Two', now, now
    );
    db.prepare('DELETE FROM assessment_sessions WHERE user_id IN (?, ?)').run(student1Id, student2Id);

    candidateToken = authService.generateToken({
      id: student1Id,
      email: 'v2student1@example.com',
      fullName: 'V2 Student One',
      role: 'candidate',
      globalRole: 'candidate',
    });

    candidate2Token = authService.generateToken({
      id: student2Id,
      email: 'v2student2@example.com',
      fullName: 'V2 Student Two',
      role: 'candidate',
      globalRole: 'candidate',
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

  test('1. Flag OFF: /api/assessments/v2/* returns 404 when flag is disabled', async () => {
    process.env.ASSESSMENT_V2_ENABLED = 'false';
    assessmentV2.enabled = false;

    const res = await fetch(`${baseUrl}/api/assessments/v2/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${candidateToken}`,
      },
      body: JSON.stringify({ domainId: 'web-dev' }),
    });

    assert.equal(res.status, 404);
    const body = await res.json();
    assert.equal(body.error?.code, 'NOT_FOUND');
  });

  test('2. Flag ON: Legacy student-submit returns 410 Gone', async () => {
    process.env.ASSESSMENT_V2_ENABLED = 'true';
    assessmentV2.enabled = true;

    const res = await fetch(`${baseUrl}/api/assessments/student-submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${candidateToken}`,
      },
      body: JSON.stringify({
        domainId: 'web-dev',
        overallScore: 90,
      }),
    });

    assert.equal(res.status, 410);
    const body = await res.json();
    assert.equal(body.error?.code, 'GONE');
  });

  test('3. Session Creation: creates session without leaking answers or hidden tests', async () => {
    process.env.ASSESSMENT_V2_ENABLED = 'true';
    assessmentV2.enabled = true;

    const res = await fetch(`${baseUrl}/api/assessments/v2/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${candidateToken}`,
      },
      body: JSON.stringify({
        mode: 'secure',
        domainId: 'web-dev',
        role: 'Full-Stack Developer',
        consent: { agreed: true, ts: new Date().toISOString() },
      }),
    });

    assert.equal(res.status, 201);
    const session = await res.json();
    assert.ok(session.sessionId);
    assert.equal(session.mode, 'secure');
    assert.equal(session.domainId, 'web-dev');
    assert.ok(Array.isArray(session.questions));
    assert.ok(session.questions.length > 0);

    // Verify correct answers and hidden tests are NOT leaked
    for (const q of session.questions) {
      assert.equal(q.correct, undefined, 'Correct answers must never leak to client before grading');
      if (q.tests) {
        for (const t of q.tests) {
          assert.equal(t.kind, 'visible', 'Hidden tests must never leak to client before grading');
        }
      }
    }
  });

  test('4. Session Resume & Ownership Isolation: Student 2 cannot access Student 1 session', async () => {
    process.env.ASSESSMENT_V2_ENABLED = 'true';
    assessmentV2.enabled = true;

    // Create session as Student 1
    const createRes = await fetch(`${baseUrl}/api/assessments/v2/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${candidateToken}`,
      },
      body: JSON.stringify({
        mode: 'practice',
        domainId: 'web-dev',
      }),
    });

    const session = await createRes.json();

    // Student 2 attempts to read Student 1 session
    const unauthorizedRes = await fetch(`${baseUrl}/api/assessments/v2/sessions/${session.sessionId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${candidate2Token}`,
      },
    });

    assert.equal(unauthorizedRes.status, 403);

    // Student 1 resumes successfully
    const authorizedRes = await fetch(`${baseUrl}/api/assessments/v2/sessions/${session.sessionId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${candidateToken}`,
      },
    });

    assert.equal(authorizedRes.status, 200);
    const resumed = await authorizedRes.json();
    assert.equal(resumed.sessionId, session.sessionId);
  });

  test('5. Autosave & Code Snapshot size limits', async () => {
    process.env.ASSESSMENT_V2_ENABLED = 'true';
    assessmentV2.enabled = true;

    const createRes = await fetch(`${baseUrl}/api/assessments/v2/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${candidateToken}`,
      },
      body: JSON.stringify({ mode: 'practice', domainId: 'web-dev' }),
    });
    const session = await createRes.json();

    // Save answers
    const answersRes = await fetch(`${baseUrl}/api/assessments/v2/sessions/${session.sessionId}/answers`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${candidateToken}`,
      },
      body: JSON.stringify({
        answers: { 'q-wd-mcq-01': 1, 'q-wd-mcq-02': 1 },
      }),
    });

    assert.equal(answersRes.status, 200);

    // Snapshot payload within limit
    const snapRes = await fetch(`${baseUrl}/api/assessments/v2/sessions/${session.sessionId}/snapshots`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${candidateToken}`,
      },
      body: JSON.stringify({
        questionId: 'q-wd-code-01',
        code: 'function test() { return 42; }',
        reason: 'autosave',
      }),
    });

    assert.equal(snapRes.status, 200);

    // Oversized snapshot (> 20 KB)
    const largeCode = 'a'.repeat(25000);
    const largeRes = await fetch(`${baseUrl}/api/assessments/v2/sessions/${session.sessionId}/snapshots`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${candidateToken}`,
      },
      body: JSON.stringify({
        questionId: 'q-wd-code-01',
        code: largeCode,
        reason: 'autosave',
      }),
    });

    assert.equal(largeRes.status, 413);
  });

  test('6. Server Grading: grades session, evaluates evidence levels, updates candidate_skills', async () => {
    process.env.ASSESSMENT_V2_ENABLED = 'true';
    assessmentV2.enabled = true;

    const createRes = await fetch(`${baseUrl}/api/assessments/v2/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${candidateToken}`,
      },
      body: JSON.stringify({
        mode: 'secure',
        domainId: 'web-dev',
        consent: { agreed: true },
      }),
    });
    const session = await createRes.json();

    // Submit for grading
    const submitRes = await fetch(`${baseUrl}/api/assessments/v2/sessions/${session.sessionId}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${candidateToken}`,
      },
      body: JSON.stringify({
        answers: {
          'q-wd-mcq-01': 1,
          'q-wd-mcq-02': 1,
          'q-wd-mcq-03': 0,
        },
        tasks: {
          'q-wd-code-01': {
            code: 'function flattenArray(arr) { return arr.flat(Infinity); }',
            runResults: { visiblePassed: 3, hiddenPassed: 5 },
          },
        },
      }),
    });

    assert.equal(submitRes.status, 200);
    const result = await submitRes.json();

    assert.equal(typeof result.technicalScore, 'number');
    assert.equal(typeof result.knowledgeScore, 'number');
    assert.ok(result.technicalScore > 0);
    assert.ok(result.skillScores);

    // Verify per-skill evidence level and confidence fields
    for (const s of Object.values(result.skillScores)) {
      assert.ok(s.level >= 1 && s.level <= 5);
      assert.ok(['low', 'medium', 'high'].includes(s.confidence));
      assert.ok(typeof s.evidenceCount === 'number');
    }

    // Answers and explanations revealed AFTER grading
    const resultRes = await fetch(`${baseUrl}/api/assessments/v2/sessions/${session.sessionId}/result`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${candidateToken}` },
    });

    assert.equal(resultRes.status, 200);
    const revealed = await resultRes.json();
    assert.ok(revealed.answersSummary.length > 0);
    assert.ok(revealed.answersSummary[0].explanation);
  });
});
