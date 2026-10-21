import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import app from '../../index.js';
import { authService } from '../../services/authService.js';
import { assessmentV2 } from '../../config/index.js';
import { seedAssessmentBank } from '../../data/seeds/assessmentSeeder.js';
import { initDb } from '../../config/db.js';

describe('Assessment V2: Active Session Recovery and Duplicate Prevention', () => {
  let server;
  let baseUrl;
  let candidateToken;
  let candidate2Token;
  const uniqueSuffix = Date.now();
  const student1Id = `usr-cand-recov-1-${uniqueSuffix}`;
  const student2Id = `usr-cand-recov-2-${uniqueSuffix}`;

  before(async () => {
    process.env.ASSESSMENT_V2_ENABLED = 'true';
    assessmentV2.enabled = true;

    seedAssessmentBank();
    const db = initDb();
    const now = new Date().toISOString();
    db.prepare(`
      INSERT OR IGNORE INTO users (id, email, full_name, role, created_at, updated_at)
      VALUES (?, ?, ?, 'candidate', ?, ?), (?, ?, ?, 'candidate', ?, ?)
    `).run(
      student1Id, `recov1_${uniqueSuffix}@example.com`, 'Recov Student One', now, now,
      student2Id, `recov2_${uniqueSuffix}@example.com`, 'Recov Student Two', now, now
    );

    candidateToken = authService.generateToken({
      id: student1Id,
      email: `recov1_${uniqueSuffix}@example.com`,
      fullName: 'Recov Student One',
      role: 'candidate',
      globalRole: 'candidate',
    });

    candidate2Token = authService.generateToken({
      id: student2Id,
      email: `recov2_${uniqueSuffix}@example.com`,
      fullName: 'Recov Student Two',
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

  test('GET /sessions/active returns 404 when no session has been started', async () => {
    const res = await fetch(`${baseUrl}/api/assessments/v2/sessions/active`, {
      headers: { Authorization: `Bearer ${candidateToken}` },
    });
    assert.equal(res.status, 404);
    const body = await res.json();
    assert.equal(body.session, null);
  });

  test('POST /sessions creates a session and GET /sessions/active retrieves it', async () => {
    const createRes = await fetch(`${baseUrl}/api/assessments/v2/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${candidateToken}`,
      },
      body: JSON.stringify({
        domainId: 'web-dev',
        mode: 'secure',
        role: 'Full-Stack Developer',
        consent: { agreed: true, ts: new Date().toISOString() },
      }),
    });
    assert.equal(createRes.status, 201);
    const created = await createRes.json();
    const sessionId = created.sessionId || created.id;
    assert.ok(sessionId);
    assert.equal(created.mode, 'secure');
    assert.ok(created.questions?.length > 0);

    const activeRes = await fetch(`${baseUrl}/api/assessments/v2/sessions/active?domainId=web-dev`, {
      headers: { Authorization: `Bearer ${candidateToken}` },
    });
    assert.equal(activeRes.status, 200);
    const body = await activeRes.json();
    const active = body.session;
    assert.equal(active.id, sessionId);
    assert.equal(active.startedAt, created.startedAt);
    assert.equal(active.deadlineAt, created.deadlineAt);
    assert.equal(active.questions.length, created.questions.length);
  });

  test('POST /sessions is idempotent: returns existing active session rather than creating duplicate', async () => {
    const dupRes = await fetch(`${baseUrl}/api/assessments/v2/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${candidateToken}`,
      },
      body: JSON.stringify({
        domainId: 'web-dev',
        mode: 'secure',
        role: 'Full-Stack Developer',
        consent: { agreed: true, ts: new Date().toISOString() },
      }),
    });
    // Returns 200 OK with the existing active session
    assert.equal(dupRes.status, 200);
    const body = await dupRes.json();
    assert.ok(body.resumed);
    assert.ok(body.session.id || body.session.sessionId);
  });

  test('Autosaved drafts and snapshots are returned by active session recovery', async () => {
    const activeRes = await fetch(`${baseUrl}/api/assessments/v2/sessions/active`, {
      headers: { Authorization: `Bearer ${candidateToken}` },
    });
    const { session: active } = await activeRes.json();
    const sessionId = active.id;
    const testQuestionId = active.questions[0].id;

    // Save answer
    const saveRes = await fetch(`${baseUrl}/api/assessments/v2/sessions/${sessionId}/answers`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${candidateToken}`,
      },
      body: JSON.stringify({
        answers: { [testQuestionId]: 'option_b' },
        saveVersion: 1,
      }),
    });
    assert.equal(saveRes.status, 200);

    // Save snapshot
    const snapRes = await fetch(`${baseUrl}/api/assessments/v2/sessions/${sessionId}/snapshots`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${candidateToken}`,
      },
      body: JSON.stringify({
        questionId: testQuestionId,
        code: 'def solution(): return 42',
        language: 'python',
        reason: 'autosave',
      }),
    });
    assert.equal(snapRes.status, 200);

    // Fetch active session again
    const updatedActiveRes = await fetch(`${baseUrl}/api/assessments/v2/sessions/active`, {
      headers: { Authorization: `Bearer ${candidateToken}` },
    });
    const { session: updated } = await updatedActiveRes.json();
    assert.equal(updated.draftAnswers[testQuestionId], 'option_b');
    const recoveredCode = updated.snapshots[testQuestionId]?.code || updated.snapshots[testQuestionId];
    assert.equal(recoveredCode, 'def solution(): return 42');
  });

  test('Unauthorized user cannot access active session of another candidate', async () => {
    const activeRes = await fetch(`${baseUrl}/api/assessments/v2/sessions/active`, {
      headers: { Authorization: `Bearer ${candidate2Token}` },
    });
    // Candidate 2 has no active session
    assert.equal(activeRes.status, 404);
  });

  test('POST /sessions/:id/abandon marks session abandoned and frees candidate to start anew', async () => {
    const activeRes = await fetch(`${baseUrl}/api/assessments/v2/sessions/active`, {
      headers: { Authorization: `Bearer ${candidateToken}` },
    });
    const { session: active } = await activeRes.json();
    const sessionId = active.id;

    const abandonRes = await fetch(`${baseUrl}/api/assessments/v2/sessions/${sessionId}/abandon`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${candidateToken}` },
    });
    assert.equal(abandonRes.status, 200);
    const abandonBody = await abandonRes.json();
    assert.equal(abandonBody.status, 'abandoned');

    // GET /sessions/active should now return 404
    const postAbandonActive = await fetch(`${baseUrl}/api/assessments/v2/sessions/active`, {
      headers: { Authorization: `Bearer ${candidateToken}` },
    });
    assert.equal(postAbandonActive.status, 404);
  });

  test('Concurrent session-creation requests return the same session without race conditions', async () => {
    const concurrentPayload = {
      domainId: 'web-dev',
      mode: 'practice',
      role: 'Full-Stack Developer',
    };

    // Execute 3 simultaneous session creation requests
    const promises = [1, 2, 3].map(() =>
      fetch(`${baseUrl}/api/assessments/v2/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${candidateToken}`,
        },
        body: JSON.stringify(concurrentPayload),
      })
    );

    const responses = await Promise.all(promises);
    const bodies = await Promise.all(responses.map(r => r.json()));

    const sessionIds = bodies.map(b => b.sessionId || b.id || b.session?.id || b.session?.sessionId);
    // All 3 concurrent calls must resolve to the identical session
    assert.equal(sessionIds[0], sessionIds[1]);
    assert.equal(sessionIds[1], sessionIds[2]);
  });

  test('Expired session cannot be resumed as active', async () => {
    const db = initDb();
    // Force deadline to 10 minutes in the past
    const pastDate = new Date(Date.now() - 600000).toISOString();
    db.prepare(`
      UPDATE assessment_sessions
      SET deadline_at = ?, expires_at = ?
      WHERE user_id = ? AND status = 'in_progress'
    `).run(pastDate, pastDate, student1Id);

    const activeRes = await fetch(`${baseUrl}/api/assessments/v2/sessions/active`, {
      headers: { Authorization: `Bearer ${candidateToken}` },
    });
    // Expired session must return 404, not active
    assert.equal(activeRes.status, 404);
  });

  test('Abandoned session cannot be submitted or graded', async () => {
    // Start a new session
    const createRes = await fetch(`${baseUrl}/api/assessments/v2/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${candidateToken}`,
      },
      body: JSON.stringify({ domainId: 'web-dev', mode: 'practice' }),
    });
    const { sessionId } = await createRes.json();

    // Abandon it
    await fetch(`${baseUrl}/api/assessments/v2/sessions/${sessionId}/abandon`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${candidateToken}` },
    });

    // Attempt to submit the abandoned session
    const submitRes = await fetch(`${baseUrl}/api/assessments/v2/sessions/${sessionId}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${candidateToken}`,
      },
      body: JSON.stringify({ answers: {}, tasks: {} }),
    });

    assert.equal(submitRes.status, 400);
    const body = await submitRes.json();
    assert.equal(body.error?.code, 'INVALID_STATE');
  });

  test('GET /sessions/latest-result returns 404 when no completed session exists', async () => {
    // candidate2 has not completed any sessions yet
    const res = await fetch(`${baseUrl}/api/assessments/v2/sessions/latest-result`, {
      headers: { Authorization: `Bearer ${candidate2Token}` },
    });
    assert.equal(res.status, 404);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.equal(body.result, null);
  });

  test('Grading a session and retrieving GET /sessions/latest-result returns completed result', async () => {
    // 1. Create a session for candidate2
    const createRes = await fetch(`${baseUrl}/api/assessments/v2/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${candidate2Token}`,
      },
      body: JSON.stringify({
        domainId: 'web-dev',
        mode: 'practice',
        role: 'Frontend Developer',
      }),
    });
    assert.equal(createRes.status, 201);
    const created = await createRes.json();
    const sessionId = created.sessionId || created.id;

    // 2. Submit the session
    const submitRes = await fetch(`${baseUrl}/api/assessments/v2/sessions/${sessionId}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${candidate2Token}`,
      },
      body: JSON.stringify({
        answers: {},
        tasks: {},
      }),
    });
    assert.equal(submitRes.status, 200);
    const graded = await submitRes.json();
    assert.ok(typeof graded.overallScore === 'number' || typeof graded.score === 'number');

    // 3. GET /sessions/latest-result returns candidate2's completed result
    const latestRes = await fetch(`${baseUrl}/api/assessments/v2/sessions/latest-result?domainId=web-dev`, {
      headers: { Authorization: `Bearer ${candidate2Token}` },
    });
    assert.equal(latestRes.status, 200);
    const latestBody = await latestRes.json();
    assert.equal(latestBody.success, true);
    assert.ok(latestBody.result);
    assert.equal(latestBody.result.sessionId, sessionId);
    assert.ok(latestBody.result.completedAt || latestBody.result.submittedAt);
    assert.ok(typeof latestBody.result.overallScore === 'number');

    // 4. Student isolation: Candidate 1 requesting latest-result gets candidate 1's own result or 404, not candidate 2's
    const cand1Latest = await fetch(`${baseUrl}/api/assessments/v2/sessions/latest-result`, {
      headers: { Authorization: `Bearer ${candidateToken}` },
    });
    if (cand1Latest.status === 200) {
      const cand1Body = await cand1Latest.json();
      assert.notEqual(cand1Body.result?.sessionId, sessionId);
    } else {
      assert.equal(cand1Latest.status, 404);
    }

    // 5. Retake creates a NEW attempt and does not overwrite or duplicate previous completed session
    const retakeRes = await fetch(`${baseUrl}/api/assessments/v2/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${candidate2Token}`,
      },
      body: JSON.stringify({
        domainId: 'web-dev',
        mode: 'secure',
        role: 'Frontend Developer',
        consent: { agreed: true, ts: new Date().toISOString() },
      }),
    });
    assert.equal(retakeRes.status, 201);
    const retakeBody = await retakeRes.json();
    const newSessionId = retakeBody.sessionId || retakeBody.id;
    assert.notEqual(newSessionId, sessionId);

    // 6. Check history contains both the original completed session and the new one
    const historyRes = await fetch(`${baseUrl}/api/assessments/v2/history?domainId=web-dev`, {
      headers: { Authorization: `Bearer ${candidate2Token}` },
    });
    assert.equal(historyRes.status, 200);
    const historyBody = await historyRes.json();
    const sessions = historyBody.data || historyBody.history || historyBody.sessions || [];
    assert.ok(sessions.length >= 2, `Expected at least 2 sessions, got ${sessions.length}`);
    const foundOriginal = sessions.find(s => (s.id || s.sessionId) === sessionId);
    const foundNew = sessions.find(s => (s.id || s.sessionId) === newSessionId);
    assert.ok(foundOriginal, 'Original completed session must be preserved in history');
    assert.ok(foundNew, 'New retake session must exist in history');
  });
});


