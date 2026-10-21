import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { initDb } from '../../config/db.js';
import { runMigrations } from '../../data/migrate.mjs';
import { authService } from '../../services/authService.js';
import app from '../../index.js';

describe('Admin Analytics Overview Endpoint Integration Suite', () => {
  let serverInstance;
  let baseUrl;
  let adminToken;
  let studentToken;

  before(async () => {
    runMigrations();
    const db = initDb();
    const now = new Date().toISOString();
    const passwordHash = await authService.hashPassword('AdminPass123456');

    // Seed admin
    const adminId = `usr-test-an-adm-${Date.now()}`;
    const adminEmail = `an-admin-${Date.now()}@sarathi.dev`;
    db.prepare(`
      INSERT INTO users (id, email, password_hash, full_name, role, status, created_at, updated_at)
      VALUES (?, ?, ?, 'Analytics Admin', 'platform_admin', 'active', ?, ?);
    `).run(adminId, adminEmail, passwordHash, now, now);
    const adminUser = db.prepare('SELECT * FROM users WHERE id = ?;').get(adminId);
    adminToken = authService.generateToken(adminUser);

    // Seed student
    const studentId = `usr-test-an-stu-${Date.now()}`;
    const studentEmail = `an-student-${Date.now()}@sarathi.dev`;
    db.prepare(`
      INSERT INTO users (id, email, password_hash, full_name, role, status, created_at, updated_at)
      VALUES (?, ?, ?, 'Analytics Student', 'candidate', 'active', ?, ?);
    `).run(studentId, studentEmail, passwordHash, now, now);
    const studentUser = db.prepare('SELECT * FROM users WHERE id = ?;').get(studentId);
    studentToken = authService.generateToken(studentUser);

    // Ephemeral listener
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
      await new Promise((resolve) => serverInstance.close(resolve));
    }
  });

  test('1. Unauthenticated request to /api/admin/analytics/overview returns 401', async () => {
    const res = await fetch(`${baseUrl}/api/admin/analytics/overview`);
    assert.strictEqual(res.status, 401);
  });

  test('2. Student candidate token returns 403 Forbidden', async () => {
    const res = await fetch(`${baseUrl}/api/admin/analytics/overview`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert.strictEqual(res.status, 403);
  });

  test('3. Authenticated platform admin receives complete 7d analytics contract', async () => {
    const start = Date.now();
    const res = await fetch(`${baseUrl}/api/admin/analytics/overview?range=7d&fresh=1`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const duration = Date.now() - start;

    assert.strictEqual(res.status, 200);
    assert.ok(duration < 300, `Expected duration < 300ms, got ${duration}ms`);

    const data = await res.json();
    assert.strictEqual(data.range, '7d');
    assert.ok(data.generatedAt);

    // KPIs
    assert.ok(data.kpis.totalUsers);
    assert.strictEqual(typeof data.kpis.totalUsers.value, 'number');
    assert.ok(data.kpis.newUsers);
    assert.ok(data.kpis.activeStudents);
    assert.ok(data.kpis.activeRecruiters);
    assert.ok(data.kpis.openJobs);
    assert.ok(data.kpis.applications);
    assert.ok(data.kpis.testsCompleted);
    assert.ok(data.kpis.testPassRate);

    // Series
    assert.strictEqual(data.series.signupsByRole.length, 8); // 7 full days + current day
    assert.strictEqual(data.series.applicationsPerDay.length, 8);
    assert.strictEqual(data.series.tests.length, 8);

    // Funnel & distributions
    assert.strictEqual(data.funnel.length, 5);
    assert.strictEqual(data.scoreDistribution.length, 10);
    assert.ok(Array.isArray(data.roleMix));
    assert.ok(Array.isArray(data.topSkillsTested));
    assert.ok(Array.isArray(data.attention));
  });

  test('4. Range parameter 30d correctly returns 31 date items and executes in < 300ms', async () => {
    const start = Date.now();
    const res = await fetch(`${baseUrl}/api/admin/analytics/overview?range=30d`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const duration = Date.now() - start;

    assert.strictEqual(res.status, 200);
    assert.ok(duration < 300, `Expected duration < 300ms, got ${duration}ms`);

    const data = await res.json();
    assert.strictEqual(data.range, '30d');
    assert.strictEqual(data.series.signupsByRole.length, 31);
  });
});
