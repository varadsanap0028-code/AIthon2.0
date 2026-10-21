import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import app from '../../index.js';
import { authService } from '../../services/authService.js';
import { assessmentV2 } from '../../config/index.js';
import { seedAssessmentBank } from '../../data/seeds/assessmentSeeder.js';
import { SessionService } from '../../services/assessmentV2/sessionService.js';
import { GradingService } from '../../services/assessmentV2/gradingService.js';

describe('Phase 4: Integrity Indicators & Reviewer Workflow Integration', () => {
  let server;
  let baseUrl;
  let candidateToken;
  let recruiterToken;
  let studentId = 'usr-cand-p4';
  let recruiterId = 'usr-rec-p4';
  let activeSessionId;

  before(async () => {
    seedAssessmentBank();
    const prevFlag = assessmentV2.enabled;
    assessmentV2.enabled = true;

    const { initDb } = await import('../../config/db.js');
    const db = initDb();
    const now = new Date().toISOString();

    // Ensure candidate & recruiter
    db.prepare(`
      INSERT OR REPLACE INTO users (id, email, full_name, role, created_at, updated_at)
      VALUES (?, 'cand-p4@example.com', 'Candidate P4', 'candidate', ?, ?),
             (?, 'rec-p4@example.com', 'Recruiter P4', 'recruiter', ?, ?)
    `).run(studentId, now, now, recruiterId, now, now);

    candidateToken = authService.generateToken({
      id: studentId,
      email: 'cand-p4@example.com',
      fullName: 'Candidate P4',
      role: 'candidate',
      globalRole: 'candidate',
    });

    recruiterToken = authService.generateToken({
      id: recruiterId,
      email: 'rec-p4@example.com',
      fullName: 'Recruiter P4',
      role: 'recruiter',
      globalRole: 'recruiter',
      orgRole: 'recruiter',
      orgId: 'org-1',
    });

    // Create a secure session for candidate
    const session = SessionService.createSession({
      userId: studentId,
      mode: 'secure',
      domainId: 'web-dev',
      scope: 'quiz_only',
      consent: { agreed: true },
    });
    activeSessionId = session.sessionId;

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

  test('1. Candidate can log integrity indicator events during active session', async () => {
    const res = await fetch(`${baseUrl}/api/assessments/v2/sessions/${activeSessionId}/integrity-events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${candidateToken}`,
      },
      body: JSON.stringify({
        type: 'visibility_hidden',
        ts: new Date().toISOString(),
        meta: { reason: 'user tab switch' },
      }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.eventId);
  });

  test('2. Candidate role is strictly rejected from reviewer queue (403 Forbidden)', async () => {
    const res = await fetch(`${baseUrl}/api/assessments/v2/reviews/queue`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${candidateToken}`,
      },
    });

    assert.equal(res.status, 403, 'Candidates must not have access to reviewer queue');
  });

  test('3. Recruiter can access review queue and view candidate attempt', async () => {
    // Grade the session first so it enters graded state
    GradingService.gradeSession(activeSessionId, studentId, { answers: {} });

    const res = await fetch(`${baseUrl}/api/assessments/v2/reviews/queue`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${recruiterToken}`,
      },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(Array.isArray(body.data));

    const found = body.data.find(item => item.sessionId === activeSessionId);
    assert.ok(found, 'Completed session should appear in reviewer queue');
    assert.ok(found.integritySummary.eventCount >= 1, 'Logged integrity events should be reflected in summary');
  });

  test('4. Recruiter can inspect session detail and submit review decision', async () => {
    const detailRes = await fetch(`${baseUrl}/api/assessments/v2/reviews/${activeSessionId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${recruiterToken}`,
      },
    });

    assert.equal(detailRes.status, 200);
    const detail = await detailRes.json();
    assert.equal(detail.success, true);
    assert.equal(detail.data.session.id, activeSessionId);
    assert.ok(detail.data.integrity.timeline.length >= 1);

    // Submit review decision
    const reviewRes = await fetch(`${baseUrl}/api/assessments/v2/reviews/${activeSessionId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${recruiterToken}`,
      },
      body: JSON.stringify({
        decision: 'no_concern',
        note: 'Candidate verified successfully; no anomalies detected.',
      }),
    });

    assert.equal(reviewRes.status, 200);
    const reviewBody = await reviewRes.json();
    assert.equal(reviewBody.success, true);
    assert.equal(reviewBody.data.decision, 'no_concern');
  });
});
