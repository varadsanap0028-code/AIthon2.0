/**
 * SARATHI Admin Portal — Phase 10: System, Flags & Audit Integration Tests
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { initDb } from '../../config/db.js';
import app from '../../index.js';
import { authService } from '../../services/authService.js';
import { featureFlagService } from '../../services/admin/featureFlagService.js';

describe('Phase 10: System Operations, Flags & Audit Integration Tests', () => {
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

    testAdminId = `usr-test-sys-adm-${Date.now()}`;
    testStudentId = `usr-test-sys-std-${Date.now()}`;

    db.prepare(`
      INSERT INTO users (id, email, password_hash, full_name, role, status, email_verified, created_at, updated_at)
      VALUES (?, ?, ?, 'System Admin', 'platform_admin', 'active', 1, ?, ?);
    `).run(testAdminId, `admin-sys-${Date.now()}@sarathi.dev`, hash, now, now);

    db.prepare(`
      INSERT INTO users (id, email, password_hash, full_name, role, status, email_verified, created_at, updated_at)
      VALUES (?, ?, ?, 'System Student', 'student', 'active', 1, ?, ?);
    `).run(testStudentId, `std-sys-${Date.now()}@sarathi.dev`, hash, now, now);

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
    // Restore default flags
    featureFlagService.setFlag('signups_open', true, testAdminId);
    featureFlagService.setFlag('maintenance_mode', false, testAdminId);

    db.prepare('UPDATE feature_flags SET updated_by = NULL WHERE updated_by = ?;').run(testAdminId);
    db.prepare('DELETE FROM admin_audit_log WHERE admin_id = ?;').run(testAdminId);
    db.prepare('DELETE FROM notifications WHERE user_id IN (?, ?);').run(testAdminId, testStudentId);
    db.prepare('DELETE FROM users WHERE id IN (?, ?);').run(testAdminId, testStudentId);
  });

  it('1. Non-admin is rejected on /api/admin/system/health with 403', async () => {
    const res = await fetch(`${baseUrl}/api/admin/system/health`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert.equal(res.status, 403);
  });

  it('2. Admin gets system health probes across process, database, runner, AI, and flags', async () => {
    const res = await fetch(`${baseUrl}/api/admin/system/health`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'healthy');
    assert.ok(typeof body.process.uptimeSeconds === 'number');
    assert.ok(typeof body.database.fileSizeMb === 'number');
    assert.ok(body.codeRunner.status);
    assert.ok(body.ai.status);
  });

  it('3. Admin gets request metrics and errors telemetry', async () => {
    const resM = await fetch(`${baseUrl}/api/admin/system/metrics`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(resM.status, 200);
    const metrics = await resM.json();
    assert.ok(Array.isArray(metrics.series));

    const resE = await fetch(`${baseUrl}/api/admin/system/errors`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(resE.status, 200);
    const errors = await resE.json();
    assert.ok(Array.isArray(errors.errors));
  });

  it('4. Admin creates safe SQLite backup and lists backups', async () => {
    const postRes = await fetch(`${baseUrl}/api/admin/system/backups`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(postRes.status, 201);
    const backup = await postRes.json();
    assert.ok(backup.filename);
    assert.ok(backup.sizeBytes > 0);

    const listRes = await fetch(`${baseUrl}/api/admin/system/backups`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(listRes.status, 200);
    const list = await listRes.json();
    assert.ok(list.backups.some((b) => b.filename === backup.filename));
  });

  it('5. Retention cleaner dry-run matches real run counts', async () => {
    const dryRes = await fetch(`${baseUrl}/api/admin/system/retention/run`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ dryRun: true, days: 365 }),
    });
    assert.equal(dryRes.status, 200);
    const dry = await dryRes.json();
    assert.equal(dry.dryRun, true);

    const runRes = await fetch(`${baseUrl}/api/admin/system/retention/run`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ dryRun: false, days: 365 }),
    });
    assert.equal(runRes.status, 200);
    const run = await runRes.json();
    assert.equal(run.dryRun, false);
    assert.equal(
      run.purgedTotal,
      dry.affected.integrityEvents + dry.affected.integrityRiskScores
    );
  });

  it('6. Feature flag toggle is audited and immediately affects platform switches', async () => {
    // 1. Toggle flag
    const res = await fetch(`${baseUrl}/api/admin/flags/camera_proctoring`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ enabled: false, reason: 'Disable camera for maintenance' }),
    });
    assert.equal(res.status, 200);
    assert.equal(featureFlagService.isEnabled('camera_proctoring'), false);

    // 2. Restore flag
    await fetch(`${baseUrl}/api/admin/flags/camera_proctoring`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ enabled: true, reason: 'Restore camera proctoring' }),
    });
    assert.equal(featureFlagService.isEnabled('camera_proctoring'), true);
  });

  it('7. Turning off signups_open blocks user registration with 403 SIGNUPS_CLOSED', async () => {
    // Disable signups
    featureFlagService.setFlag('signups_open', false, testAdminId);

    const regRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `closed_reg_${Date.now()}@example.com`,
        password: 'password123',
        fullName: 'Test Closed',
      }),
    });
    assert.equal(regRes.status, 403);
    const body = await regRes.json();
    assert.equal(body.error.code, 'SIGNUPS_CLOSED');

    // Restore signups
    featureFlagService.setFlag('signups_open', true, testAdminId);
  });

  it('8. Maintenance mode blocks non-admin traffic with 503 MAINTENANCE while admin works', async () => {
    // Enable maintenance mode
    featureFlagService.setFlag('maintenance_mode', true, testAdminId);

    // Student request to an API endpoint is blocked with 503
    const stdRes = await fetch(`${baseUrl}/api/taxonomy/domains`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert.equal(stdRes.status, 503);
    const body = await stdRes.json();
    assert.equal(body.error.code, 'MAINTENANCE');

    // Admin request is permitted
    const admRes = await fetch(`${baseUrl}/api/admin/flags`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(admRes.status, 200);

    // Disable maintenance mode
    featureFlagService.setFlag('maintenance_mode', false, testAdminId);
  });

  it('9. Audit log lists mutations, verifies SHA-256 chain, and exports CSV', async () => {
    // 1. List logs
    const listRes = await fetch(`${baseUrl}/api/admin/audit`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(listRes.status, 200);
    const list = await listRes.json();
    assert.ok(Array.isArray(list.logs));
    assert.ok(list.total > 0);

    // 2. Verify hash chain
    const verifyRes = await fetch(`${baseUrl}/api/admin/audit/verify`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(verifyRes.status, 200);
    const verify = await verifyRes.json();
    assert.equal(verify.ok, true);
    assert.ok(verify.checked > 0);
    assert.ok(verify.headHash);

    // 3. Export CSV
    const csvRes = await fetch(`${baseUrl}/api/admin/audit/export.csv`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(csvRes.status, 200);
    const csv = await csvRes.text();
    assert.ok(csv.includes('Admin Name'));
    assert.ok(csv.includes('Hash'));
  });
});
