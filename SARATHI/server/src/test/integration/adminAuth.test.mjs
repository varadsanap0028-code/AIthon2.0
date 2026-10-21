import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { initDb } from '../../config/db.js';
import { runMigrations } from '../../data/migrate.mjs';
import { authService } from '../../services/authService.js';
import app from '../../index.js';

describe('Admin Authentication, Gating & Endpoints Integration Suite', () => {
  let serverInstance;
  let baseUrl;
  let adminToken;
  let studentToken;
  let recruiterToken;
  let collegeToken;
  let suspendedAdminToken;

  const adminEmail = `admin-test-${Date.now()}@sarathi.dev`;
  const suspendedAdminEmail = `suspended-admin-${Date.now()}@sarathi.dev`;
  const studentEmail = `student-test-${Date.now()}@sarathi.dev`;
  const recruiterEmail = `recruiter-test-${Date.now()}@sarathi.dev`;
  const collegeEmail = `college-test-${Date.now()}@sarathi.dev`;

  before(async () => {
    runMigrations();
    const db = initDb();
    const now = new Date().toISOString();
    const passwordHash = await authService.hashPassword('AdminPass123456');

    // 1. Seed active platform admin
    const adminId = `usr-test-adm-${Date.now()}`;
    db.prepare(`
      INSERT INTO users (id, email, password_hash, full_name, role, status, created_at, updated_at)
      VALUES (?, ?, ?, 'Test Platform Admin', 'platform_admin', 'active', ?, ?);
    `).run(adminId, adminEmail, passwordHash, now, now);
    const adminUser = db.prepare('SELECT * FROM users WHERE id = ?;').get(adminId);
    adminToken = authService.generateToken(adminUser);

    // 2. Seed student user
    const studentId = `usr-test-stu-${Date.now()}`;
    db.prepare(`
      INSERT INTO users (id, email, password_hash, full_name, role, status, created_at, updated_at)
      VALUES (?, ?, ?, 'Test Student', 'candidate', 'active', ?, ?);
    `).run(studentId, studentEmail, passwordHash, now, now);
    const studentUser = db.prepare('SELECT * FROM users WHERE id = ?;').get(studentId);
    studentToken = authService.generateToken(studentUser);

    // 3. Seed recruiter user
    const recruiterId = `usr-test-rec-${Date.now()}`;
    db.prepare(`
      INSERT INTO users (id, email, password_hash, full_name, role, status, created_at, updated_at)
      VALUES (?, ?, ?, 'Test Recruiter', 'recruiter', 'active', ?, ?);
    `).run(recruiterId, recruiterEmail, passwordHash, now, now);
    const recruiterUser = db.prepare('SELECT * FROM users WHERE id = ?;').get(recruiterId);
    recruiterToken = authService.generateToken(recruiterUser, 'org-demo-1', 'recruiter');

    // 4. Seed college user
    const collegeId = `usr-test-col-${Date.now()}`;
    db.prepare(`
      INSERT INTO users (id, email, password_hash, full_name, role, status, created_at, updated_at)
      VALUES (?, ?, ?, 'Test College Admin', 'college', 'active', ?, ?);
    `).run(collegeId, collegeEmail, passwordHash, now, now);
    const collegeUser = db.prepare('SELECT * FROM users WHERE id = ?;').get(collegeId);
    collegeToken = authService.generateToken(collegeUser);

    // 5. Seed suspended platform admin
    const suspendedAdminId = `usr-test-susadm-${Date.now()}`;
    db.prepare(`
      INSERT INTO users (id, email, password_hash, full_name, role, status, created_at, updated_at)
      VALUES (?, ?, ?, 'Suspended Admin', 'platform_admin', 'suspended', ?, ?);
    `).run(suspendedAdminId, suspendedAdminEmail, passwordHash, now, now);
    const suspendedAdminUser = db.prepare('SELECT * FROM users WHERE id = ?;').get(suspendedAdminId);
    suspendedAdminToken = authService.generateToken(suspendedAdminUser);

    // Start ephemeral server
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

  test('1. Unauthenticated request to /api/admin/me returns 401', async () => {
    const res = await fetch(`${baseUrl}/api/admin/me`);
    assert.strictEqual(res.status, 401);
  });

  test('2. Student/Candidate token to /api/admin/me returns 403', async () => {
    const res = await fetch(`${baseUrl}/api/admin/me`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert.strictEqual(res.status, 403);
  });

  test('3. Recruiter token to /api/admin/me returns 403', async () => {
    const res = await fetch(`${baseUrl}/api/admin/me`, {
      headers: { Authorization: `Bearer ${recruiterToken}` },
    });
    assert.strictEqual(res.status, 403);
  });

  test('4. College token to /api/admin/me returns 403', async () => {
    const res = await fetch(`${baseUrl}/api/admin/me`, {
      headers: { Authorization: `Bearer ${collegeToken}` },
    });
    assert.strictEqual(res.status, 403);
  });

  test('5. Suspended admin token is rejected on request with 403 ACCOUNT_SUSPENDED', async () => {
    const res = await fetch(`${baseUrl}/api/admin/me`, {
      headers: { Authorization: `Bearer ${suspendedAdminToken}` },
    });
    assert.strictEqual(res.status, 403);
    const body = await res.json();
    assert.strictEqual(body.code, 'ACCOUNT_SUSPENDED');
  });

  test('6. Authenticated platform admin receives 200 and profile identity on /api/admin/me', async () => {
    const res = await fetch(`${baseUrl}/api/admin/me`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.email, adminEmail);
    assert.strictEqual(data.role, 'platform_admin');
    assert.strictEqual(data.fullName, 'Test Platform Admin');
  });

  test('7. GET /api/admin/nav-badges returns numeric badge counts', async () => {
    const res = await fetch(`${baseUrl}/api/admin/nav-badges`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(typeof data.pendingApprovals, 'number');
    assert.strictEqual(typeof data.flaggedSessions, 'number');
    assert.strictEqual(typeof data.openTickets, 'number');
  });

  test('8. Normal login POST /api/auth/login succeeds for platform_admin and updates last_login_at', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: adminEmail,
        password: 'AdminPass123456',
      }),
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(data.token);
    assert.strictEqual(data.user.role, 'platform_admin');
    assert.ok(data.user.lastLoginAt, 'lastLoginAt should be present on user payload');

    const db = initDb();
    const updated = db.prepare('SELECT last_login_at FROM users WHERE email = ?;').get(adminEmail);
    assert.ok(updated.last_login_at, 'last_login_at column should be populated in database');
  });

  test('9. Public registration POST /api/auth/register with role platform_admin is rejected with 403', async () => {
    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `hacker-${Date.now()}@evil.test`,
        password: 'HackerPassword123',
        fullName: 'Hacker Admin',
        role: 'platform_admin',
      }),
    });
    assert.strictEqual(res.status, 403);
    const body = await res.json();
    assert.strictEqual(body.error?.code, 'ADMIN_SIGNUP_FORBIDDEN');
  });

  test('10. Public registration attempting to overwrite or hijack existing platform_admin email is rejected with 403', async () => {
    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: adminEmail,
        password: 'NewHijackPassword123',
        fullName: 'Imposter Admin',
        role: 'student',
      }),
    });
    assert.strictEqual(res.status, 403);
    const body = await res.json();
    assert.ok(
      body.code === 'ADMIN_ACCOUNT_PROTECTED' || (typeof body.error === 'string' && body.error.includes('administrator')),
      'Should protect admin account from registration overwrite'
    );
  });
});
