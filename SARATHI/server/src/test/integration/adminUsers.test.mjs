import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { initDb } from '../../config/db.js';
import { runMigrations } from '../../data/migrate.mjs';
import { authService } from '../../services/authService.js';
import app from '../../index.js';

describe('Admin User Management Integration Test Suite', () => {
  let serverInstance;
  let baseUrl;
  let adminToken;
  let candidateToken;
  let testAdminId;
  let testCandidateId;
  let db;

  before(async () => {
    runMigrations();
    db = initDb();
    const now = new Date().toISOString();
    const passwordHash = await authService.hashPassword('Secret123456');

    // Create Admin user
    testAdminId = `usr-test-integ-admin-${Date.now()}`;
    const adminEmail = `integ-admin-${Date.now()}@sarathi.dev`;
    db.prepare(`
      INSERT INTO users (id, email, password_hash, full_name, role, status, email_verified, created_at, updated_at)
      VALUES (?, ?, ?, 'Integ Admin', 'platform_admin', 'active', 1, ?, ?);
    `).run(testAdminId, adminEmail, passwordHash, now, now);
    const adminUser = db.prepare('SELECT * FROM users WHERE id = ?;').get(testAdminId);
    adminToken = authService.generateToken(adminUser);

    // Create Candidate user
    testCandidateId = `usr-test-integ-cand-${Date.now()}`;
    const candidateEmail = `integ-cand-${Date.now()}@sarathi.dev`;
    db.prepare(`
      INSERT INTO users (id, email, password_hash, full_name, role, status, email_verified, created_at, updated_at)
      VALUES (?, ?, ?, 'Integ Candidate', 'candidate', 'active', 1, ?, ?);
    `).run(testCandidateId, candidateEmail, passwordHash, now, now);

    // Create Candidate profile
    db.prepare(`
      INSERT INTO candidate_profiles (id, headline, target_role, experience_years, location, created_at, updated_at)
      VALUES (?, 'Full Stack Dev', 'Software Engineer', 2.5, 'Bangalore', ?, ?);
    `).run(testCandidateId, now, now);

    const candUser = db.prepare('SELECT * FROM users WHERE id = ?;').get(testCandidateId);
    candidateToken = authService.generateToken(candUser);

    // Ephemeral server listener
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

  test('1. Unauthenticated or non-admin requests to /api/admin/users are rejected with 401/403', async () => {
    // Unauthenticated
    const resUnauth = await fetch(`${baseUrl}/api/admin/users`);
    assert.strictEqual(resUnauth.status, 401);

    // Student/Candidate token
    const resForbidden = await fetch(`${baseUrl}/api/admin/users`, {
      headers: { Authorization: `Bearer ${candidateToken}` },
    });
    assert.strictEqual(resForbidden.status, 403);
  });

  test('2. GET /api/admin/users returns paginated users with filters and search', async () => {
    const res = await fetch(`${baseUrl}/api/admin/users?q=Integ&role=candidate&page=1&pageSize=10`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data.items));
    assert.ok(data.total >= 1);
    assert.strictEqual(data.page, 1);
    assert.strictEqual(data.pageSize, 10);

    const match = data.items.find((u) => u.id === testCandidateId);
    assert.ok(match);
    assert.strictEqual(match.emailVerified, true);
    assert.strictEqual(match.role, 'candidate');
    assert.strictEqual(match.status, 'active');
  });

  test('3. GET /api/admin/users/:id returns complete profile, counts, and audit log', async () => {
    const res = await fetch(`${baseUrl}/api/admin/users/${testCandidateId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert.strictEqual(res.status, 200);
    const detail = await res.json();
    assert.strictEqual(detail.user.id, testCandidateId);
    assert.strictEqual(detail.user.fullName, 'Integ Candidate');
    assert.ok(!detail.user.password_hash); // password hash stripped
    assert.strictEqual(detail.profile.headline, 'Full Stack Dev');
    assert.ok(typeof detail.counts.applications === 'number');
    assert.ok(typeof detail.counts.tests === 'number');
    assert.ok(Array.isArray(detail.recentAudit));
  });

  test('4. Suspending a user immediately denies their subsequent authenticated requests with 403 ACCOUNT_SUSPENDED', async () => {
    // First verify candidate currently has access
    const checkBefore = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${candidateToken}` },
    });
    assert.strictEqual(checkBefore.status, 200);

    // Admin suspends candidate
    const suspendRes = await fetch(`${baseUrl}/api/admin/users/${testCandidateId}/status`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: 'suspended',
        reason: 'Violation of platform terms during assessment',
      }),
    });
    assert.strictEqual(suspendRes.status, 200);
    const suspendBody = await suspendRes.json();
    assert.strictEqual(suspendBody.status, 'suspended');

    // Candidate attempts request immediately with existing token
    const checkAfter = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${candidateToken}` },
    });
    assert.strictEqual(checkAfter.status, 403);
    const errorBody = await checkAfter.json();
    assert.strictEqual(errorBody.code, 'ACCOUNT_SUSPENDED');

    // Admin re-activates candidate
    const activateRes = await fetch(`${baseUrl}/api/admin/users/${testCandidateId}/status`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: 'active',
        reason: 'Account reinstated following review',
      }),
    });
    assert.strictEqual(activateRes.status, 200);

    // Candidate can now access again
    const checkReinstated = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${candidateToken}` },
    });
    assert.strictEqual(checkReinstated.status, 200);
  });

  test('5. Self-modification and suspension without reason are blocked with 400', async () => {
    // Cannot suspend self
    const selfRes = await fetch(`${baseUrl}/api/admin/users/${testAdminId}/status`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: 'suspended',
        reason: 'Trying self-suspend',
      }),
    });
    assert.strictEqual(selfRes.status, 400);

    // Suspend without reason
    const noReasonRes = await fetch(`${baseUrl}/api/admin/users/${testCandidateId}/status`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: 'suspended',
        reason: '',
      }),
    });
    assert.strictEqual(noReasonRes.status, 400);
  });

  test('6. POST /api/admin/users/:id/force-password-reset generates reset link and audits action', async () => {
    const res = await fetch(`${baseUrl}/api/admin/users/${testCandidateId}/force-password-reset`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.resetLink);

    // Check audit row
    const auditRow = db.prepare('SELECT * FROM admin_audit_log WHERE entity_id = ? AND action = ?;').get(testCandidateId, 'user.force_password_reset');
    assert.ok(auditRow);
    assert.strictEqual(auditRow.admin_id, testAdminId);
  });

  test('7. POST /api/admin/users/invite creates staff account with reviewer role and 48h setup link', async () => {
    const inviteEmail = `integ-reviewer-${Date.now()}@sarathi.dev`;
    const res = await fetch(`${baseUrl}/api/admin/users/invite`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: inviteEmail,
        name: 'Technical Reviewer Bob',
        role: 'reviewer',
      }),
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.user.email, inviteEmail);
    assert.strictEqual(body.user.role, 'reviewer');
    assert.ok(body.setupLink.includes('/reset-password?token='));
  });

  test('8. GET /api/admin/users/export.csv streams CSV and records user.export in audit log', async () => {
    // Insert a user with a formula prefix name to test CSV escaping
    const formulaUserId = `usr-test-formula-${Date.now()}`;
    const formulaEmail = `formula-${Date.now()}@test.com`;
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO users (id, email, password_hash, full_name, role, status, email_verified, created_at, updated_at)
      VALUES (?, ?, 'hash', '=HYPERLINK("http://evil.com")', 'candidate', 'active', 1, ?, ?);
    `).run(formulaUserId, formulaEmail, now, now);

    const res = await fetch(`${baseUrl}/api/admin/users/export.csv?role=candidate`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert.strictEqual(res.status, 200);
    assert.match(res.headers.get('content-type'), /text\/csv/);
    const text = await res.text();

    assert.ok(text.includes('id,name,email,role,status,emailVerified,createdAt,lastLoginAt'));
    // The formula prefix should be escaped with leading single quote: '=HYPERLINK
    assert.ok(text.includes(`"'=HYPERLINK`));

    // Audit log should record user.export
    const exportAudit = db.prepare('SELECT * FROM admin_audit_log WHERE action = ? ORDER BY created_at DESC LIMIT 1;').get('user.export');
    assert.ok(exportAudit);
    assert.strictEqual(exportAudit.admin_id, testAdminId);
  });
});
