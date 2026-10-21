/**
 * SARATHI Admin Portal — Phase 8: Admin Insights Integration Tests
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { initDb } from '../../config/db.js';
import app from '../../index.js';
import { authService } from '../../services/authService.js';

describe('Phase 8: Platform Analytics & Cross-Domain Insights Integration Tests', () => {
  let db;
  let serverInstance;
  let baseUrl;
  let adminToken;
  let studentToken;
  let testAdminId;
  let testStudentId;

  before(async () => {
    db = initDb();
    const now = new Date().toISOString();
    const hash = await authService.hashPassword('Secret123456');

    testAdminId = `usr-test-ins-admin-${Date.now()}`;
    testStudentId = `usr-test-ins-std-${Date.now()}`;

    db.prepare(`
      INSERT INTO users (id, email, password_hash, full_name, role, status, email_verified, created_at, updated_at)
      VALUES (?, ?, ?, 'Insights Admin', 'platform_admin', 'active', 1, ?, ?);
    `).run(testAdminId, `admin-ins-${Date.now()}@sarathi.dev`, hash, now, now);

    db.prepare(`
      INSERT INTO users (id, email, password_hash, full_name, role, status, email_verified, created_at, updated_at)
      VALUES (?, ?, ?, 'Insights Student', 'student', 'active', 1, ?, ?);
    `).run(testStudentId, `std-ins-${Date.now()}@sarathi.dev`, hash, now, now);

    const adminUser = db.prepare('SELECT * FROM users WHERE id = ?;').get(testAdminId);
    adminToken = authService.generateToken(adminUser);

    const stdUser = db.prepare('SELECT * FROM users WHERE id = ?;').get(testStudentId);
    studentToken = authService.generateToken(stdUser);

    await new Promise((resolve) => {
      serverInstance = app.listen(0, '127.0.0.1', () => {
        const port = serverInstance.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (serverInstance) {
      await new Promise((r) => serverInstance.close(r));
    }
    db.prepare('DELETE FROM notifications WHERE user_id IN (?, ?);').run(testAdminId, testStudentId);
    db.prepare('DELETE FROM users WHERE id IN (?, ?);').run(testAdminId, testStudentId);
  });

  it('1. Non-admin is rejected on /api/admin/insights with 403', async () => {
    const res = await fetch(`${baseUrl}/api/admin/insights/forecast`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert.equal(res.status, 403);
  });

  it('2. Admin gets forecast with history, fitted model and confidence interval', async () => {
    const res = await fetch(`${baseUrl}/api/admin/insights/forecast?metric=applications&horizon=14`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.metric, 'applications');
    assert.equal(body.horizon, 14);
    assert.ok(Array.isArray(body.history));
    assert.ok(Array.isArray(body.forecast));
    assert.ok(['low', 'high'].includes(body.confidence));

    // Assert no NaN / Infinity
    const rawJson = JSON.stringify(body);
    assert.equal(rawJson.includes('NaN'), false);
    assert.equal(rawJson.includes('Infinity'), false);
  });

  it('3. Admin gets anomalies across 6 metrics with modified z-score evaluation', async () => {
    const res = await fetch(`${baseUrl}/api/admin/insights/anomalies?days=60`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(typeof body.flaggedCount === 'number');
    assert.ok(Array.isArray(body.flagged));
    assert.ok(body.series.signups);
    assert.ok(body.series.applications);
    assert.ok(body.series.tests_started);
  });

  it('4. Admin gets recruiter trust scores and component breakdown', async () => {
    const res = await fetch(`${baseUrl}/api/admin/insights/recruiter-trust`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(Array.isArray(body.companies));
    if (body.companies.length > 0) {
      const first = body.companies[0];
      assert.ok(typeof first.score === 'number');
      assert.ok(['Trusted', 'Watch', 'Risky'].includes(first.band));
      assert.ok(first.components.approvalStatus);
      assert.ok(first.components.corporateEmail);
      assert.ok(first.components.accountAge);
    }
  });

  it('5. Admin gets skill gap market index with under/over-supplied rankings', async () => {
    const res = await fetch(`${baseUrl}/api/admin/insights/skill-gap-market`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(Array.isArray(body.topUnderSupplied));
    assert.ok(Array.isArray(body.topOverSupplied));
    assert.ok(Array.isArray(body.allSkills));
  });

  it('6. Admin gets funnel cohorts with Wilson score confidence intervals', async () => {
    const res = await fetch(`${baseUrl}/api/admin/insights/funnel-cohorts?weeks=8`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(Array.isArray(body.cohorts));
    assert.ok(Array.isArray(body.overallFunnel));
    assert.ok(body.overallFunnel.length > 0);
    const step1 = body.overallFunnel[0];
    assert.ok(step1.step);
    assert.ok(typeof step1.center === 'number');
    assert.ok(typeof step1.lower === 'number');
    assert.ok(typeof step1.upper === 'number');
  });

  it('7. Admin gets correlations with Pearson r and scatter point samples', async () => {
    const res = await fetch(`${baseUrl}/api/admin/insights/correlations`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.disclaimer.includes('causation'));
    assert.ok(Array.isArray(body.relationships));
    assert.equal(body.relationships.length, 4);
    const rel1 = body.relationships[0];
    assert.ok(typeof rel1.r === 'number');
    assert.ok(Array.isArray(rel1.sample));
  });
});
