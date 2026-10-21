import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import app from '../../index.js';
import { authService } from '../../services/authService.js';
import { assessmentV2 } from '../../config/index.js';
import { seedAssessmentBank } from '../../data/seeds/assessmentSeeder.js';

describe('Assessment V2.1: End-to-End Lifecycle & Sandboxed Execution', () => {
  let server;
  let baseUrl;
  let candidateToken;
  const candidateId = 'usr-cand-v21-e2e';

  before(async () => {
    // Enable V2 and V2.1 for integration suite
    assessmentV2.enabled = true;
    assessmentV2.v2_1Enabled = true;

    seedAssessmentBank();

    const { initDb } = await import('../../config/db.js');
    const db = initDb();
    const now = new Date().toISOString();
    db.prepare(`
      INSERT OR IGNORE INTO users (id, email, full_name, role, created_at, updated_at)
      VALUES (?, ?, ?, 'candidate', ?, ?)
    `).run(
      candidateId,
      'v21candidate@example.com',
      'V2.1 Candidate E2E',
      now,
      now
    );

    candidateToken = authService.generateToken({
      id: candidateId,
      email: 'v21candidate@example.com',
      fullName: 'V2.1 Candidate E2E',
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

  let activeSessionId;
  let codeQuestionId;
  let sqlQuestionId;

  test('Step 1: Start session returns deadlineAt and saveVersion = 1', async () => {
    const res = await fetch(`${baseUrl}/api/assessments/v2/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${candidateToken}`,
      },
      body: JSON.stringify({
        mode: 'practice',
        domainId: 'web-dev',
        role: 'Full Stack Engineer',
        scope: 'full',
      }),
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.ok(body.sessionId);
    assert.ok(body.deadlineAt);
    assert.equal(body.saveVersion, 1);
    assert.equal(body.status, 'in_progress');
    assert.ok(Array.isArray(body.questions));
    assert.ok(body.questions.length > 0);

    // Verify hidden tests are NOT exposed in client question list
    for (const q of body.questions) {
      assert.equal(q.hiddenTests, undefined, 'Hidden tests must not be exposed');
      assert.equal(q.correct, undefined, 'Correct answer must not be exposed');
    }

    activeSessionId = body.sessionId;
    const codeQ = body.questions.find(q => q.type === 'code');
    if (codeQ) codeQuestionId = codeQ.id;
    const sqlQ = body.questions.find(q => q.type === 'sql');
    if (sqlQ) sqlQuestionId = sqlQ.id;
  });

  test('Step 2: State endpoint returns authoritative timer and session recovery info', async () => {
    const res = await fetch(`${baseUrl}/api/assessments/v2/sessions/${activeSessionId}/state`, {
      headers: {
        Authorization: `Bearer ${candidateToken}`,
      },
    });

    assert.equal(res.status, 200);
    const state = await res.json();
    assert.equal(state.sessionId, activeSessionId);
    assert.equal(state.status, 'in_progress');
    assert.ok(state.deadlineAt);
    assert.ok(typeof state.remainingSeconds === 'number');
    assert.ok(state.remainingSeconds > 0);
    assert.equal(state.saveVersion, 1);
  });

  test('Step 3: Versioned autosave increments saveVersion on valid update', async () => {
    const res = await fetch(`${baseUrl}/api/assessments/v2/sessions/${activeSessionId}/answers`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${candidateToken}`,
      },
      body: JSON.stringify({
        answers: { 'q-web-mcq-01': 1 },
        saveVersion: 1,
      }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.saveVersion, 2);
  });

  test('Step 4: Autosave with stale saveVersion returns 409 VERSION_CONFLICT', async () => {
    const res = await fetch(`${baseUrl}/api/assessments/v2/sessions/${activeSessionId}/answers`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${candidateToken}`,
      },
      body: JSON.stringify({
        answers: { 'q-web-mcq-01': 2 },
        saveVersion: 1, // Stale! Server is now at version 2
      }),
    });

    assert.equal(res.status, 409);
    const body = await res.json();
    assert.equal(body.error?.code, 'VERSION_CONFLICT');
  });

  test('Step 5: Code execution runs in isolated sandbox out of server process', async () => {
    if (!codeQuestionId) return;

    const res = await fetch(`${baseUrl}/api/assessments/v2/sessions/${activeSessionId}/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${candidateToken}`,
      },
      body: JSON.stringify({
        questionId: codeQuestionId,
        code: `
          function debounce(fn, delay) {
            let timer = null;
            return function(...args) {
              clearTimeout(timer);
              timer = setTimeout(() => fn.apply(this, args), delay);
            };
          }
          module.exports = { debounce };
        `,
        language: 'javascript',
      }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(['success', 'failed'].includes(body.status));
    assert.ok(typeof body.visiblePassed === 'number');
    assert.ok(Array.isArray(body.results));
    assert.ok(body.results.length > 0);
  });

  test('Step 6: Hardened SQL execution rejects mutating queries', async () => {
    if (!sqlQuestionId) return;

    const res = await fetch(`${baseUrl}/api/assessments/v2/sessions/${activeSessionId}/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${candidateToken}`,
      },
      body: JSON.stringify({
        questionId: sqlQuestionId,
        code: 'DROP TABLE orders; SELECT 1;',
        language: 'sql',
      }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'failed');
    assert.match(body.stderr, /Multiple SQL statements are not permitted|Security violation/i);
  });

  test('Step 7: Submit session is idempotent and never leaks hidden test inputs', async () => {
    const submitPayload = {
      answers: { 'q-web-mcq-01': 1, 'q-web-mcq-02': 2 },
      tasks: {},
    };

    const res1 = await fetch(`${baseUrl}/api/assessments/v2/sessions/${activeSessionId}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${candidateToken}`,
      },
      body: JSON.stringify(submitPayload),
    });

    assert.equal(res1.status, 200);
    const result1 = await res1.json();
    assert.ok(typeof result1.technicalScore === 'number');
    assert.ok(result1.skillScores);
    assert.ok(Array.isArray(result1.strengths));

    // Verify hidden tests details are NOT exposed
    const serialized = JSON.stringify(result1);
    assert.equal(serialized.includes('t-web-c01-h1'), false, 'Hidden test ID must not be leaked');
    assert.equal(serialized.includes('hiddenTestInput'), false);

    // Idempotent submit: second submit returns identical result
    const res2 = await fetch(`${baseUrl}/api/assessments/v2/sessions/${activeSessionId}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${candidateToken}`,
      },
      body: JSON.stringify(submitPayload),
    });

    assert.equal(res2.status, 200);
    const result2 = await res2.json();
    assert.equal(result2.technicalScore, result1.technicalScore);
    assert.equal(result2.sessionId, result1.sessionId);
  });
});
