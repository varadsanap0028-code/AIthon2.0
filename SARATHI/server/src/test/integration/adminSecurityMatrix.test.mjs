/**
 * SARATHI Admin Portal — Phase 11: Security Route Matrix & Hardening Tests
 *
 * Tests:
 * 1. Route Matrix: All /api/admin/* endpoints enforce authentication and platform_admin authorization:
 *    - No token -> 401
 *    - Student / Recruiter / College -> 403
 *    - Suspended admin -> 403
 *    - Valid platform admin -> not 401/403
 * 2. Mutation Audit Coverage: Administrative mutations create an immutable, hashed audit row.
 * 3. Fuzzing & SQL Metacharacter safety in search parameters (q, entityType, action).
 * 4. Secrets Sweep: Verification that password_hash, token secrets, or keys are never returned in admin responses.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { initDb } from '../../config/db.js';
import app from '../../index.js';
import { authService } from '../../services/authService.js';

describe('Phase 11: Security Route Matrix, Fuzzing & Secrets Sweep', () => {
  let db;
  let serverInstance;
  let baseUrl;

  let adminToken;
  let studentToken;
  let recruiterToken;
  let collegeToken;
  let suspendedAdminToken;

  let testAdminId;
  let testStudentId;
  let testRecruiterId;
  let testCollegeId;
  let testSuspendedAdminId;

  // Representative endpoint from each admin module
  const ADMIN_ENDPOINTS = [
    { name: 'Overview Metrics', path: '/api/admin/metrics' },
    { name: 'User Management', path: '/api/admin/users' },
    { name: 'Recruiter Approvals', path: '/api/admin/approvals' },
    { name: 'Test Integrity Stats', path: '/api/admin/integrity/stats' },
    { name: 'Content Domains', path: '/api/admin/content/domains' },
    { name: 'Support Tickets', path: '/api/admin/support/tickets' },
    { name: 'Announcements', path: '/api/admin/announcements/announcements' },
    { name: 'Analytics Forecast', path: '/api/admin/insights/forecast' },
    { name: 'Copilot Sessions', path: '/api/admin/copilot/sessions' },
    { name: 'System Health', path: '/api/admin/system/health' },
    { name: 'Feature Flags', path: '/api/admin/flags' },
    { name: 'Audit Ledger', path: '/api/admin/audit' },
  ];

  before(async () => {
    db = initDb();
    const now = new Date().toISOString();
    const hash = await authService.hashPassword('Pass123456');

    testAdminId = `usr-sec-adm-${Date.now()}`;
    testStudentId = `usr-sec-std-${Date.now()}`;
    testRecruiterId = `usr-sec-rec-${Date.now()}`;
    testCollegeId = `usr-sec-clg-${Date.now()}`;
    testSuspendedAdminId = `usr-sec-sus-${Date.now()}`;

    // Insert active admin
    db.prepare(`
      INSERT INTO users (id, email, password_hash, full_name, role, status, email_verified, created_at, updated_at)
      VALUES (?, ?, ?, 'Sec Admin', 'platform_admin', 'active', 1, ?, ?);
    `).run(testAdminId, `admin-sec-${Date.now()}@sarathi.dev`, hash, now, now);

    // Insert student
    db.prepare(`
      INSERT INTO users (id, email, password_hash, full_name, role, status, email_verified, created_at, updated_at)
      VALUES (?, ?, ?, 'Sec Student', 'student', 'active', 1, ?, ?);
    `).run(testStudentId, `std-sec-${Date.now()}@sarathi.dev`, hash, now, now);

    // Insert recruiter
    db.prepare(`
      INSERT INTO users (id, email, password_hash, full_name, role, status, email_verified, created_at, updated_at)
      VALUES (?, ?, ?, 'Sec Recruiter', 'recruiter', 'active', 1, ?, ?);
    `).run(testRecruiterId, `rec-sec-${Date.now()}@sarathi.dev`, hash, now, now);

    // Insert college
    db.prepare(`
      INSERT INTO users (id, email, password_hash, full_name, role, status, email_verified, created_at, updated_at)
      VALUES (?, ?, ?, 'Sec College', 'college', 'active', 1, ?, ?);
    `).run(testCollegeId, `clg-sec-${Date.now()}@sarathi.dev`, hash, now, now);

    // Insert suspended admin
    db.prepare(`
      INSERT INTO users (id, email, password_hash, full_name, role, status, email_verified, created_at, updated_at)
      VALUES (?, ?, ?, 'Sec Suspended Admin', 'platform_admin', 'suspended', 1, ?, ?);
    `).run(testSuspendedAdminId, `sus-adm-${Date.now()}@sarathi.dev`, hash, now, now);

    // Generate JWT tokens
    adminToken = authService.generateToken(db.prepare('SELECT * FROM users WHERE id = ?;').get(testAdminId));
    studentToken = authService.generateToken(db.prepare('SELECT * FROM users WHERE id = ?;').get(testStudentId));
    recruiterToken = authService.generateToken(db.prepare('SELECT * FROM users WHERE id = ?;').get(testRecruiterId));
    collegeToken = authService.generateToken(db.prepare('SELECT * FROM users WHERE id = ?;').get(testCollegeId));
    suspendedAdminToken = authService.generateToken(db.prepare('SELECT * FROM users WHERE id = ?;').get(testSuspendedAdminId));

    // Bind to test server
    await new Promise((resolve) => {
      serverInstance = app.listen(0, '127.0.0.1', () => {
        baseUrl = `http://127.0.0.1:${serverInstance.address().port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (serverInstance) {
      await new Promise((r) => serverInstance.close(r));
    }
    // Cleanup foreign keys & test users
    try {
      db.prepare(`UPDATE feature_flags SET updated_by = NULL WHERE updated_by = ?;`).run(testAdminId);
      db.prepare(`DELETE FROM admin_audit_log WHERE admin_id IN (?, ?);`).run(testAdminId, testSuspendedAdminId);
      db.prepare(`DELETE FROM users WHERE id IN (?, ?, ?, ?, ?);`).run(
        testAdminId,
        testStudentId,
        testRecruiterId,
        testCollegeId,
        testSuspendedAdminId
      );
    } catch {}
  });

  describe('1. Security Route Matrix Across All Admin Modules', () => {
    for (const ep of ADMIN_ENDPOINTS) {
      it(`enforces 401 when no token is supplied for ${ep.name} (${ep.path})`, async () => {
        const res = await fetch(`${baseUrl}${ep.path}`);
        assert.equal(res.status, 401, `Expected 401 for unauthenticated request to ${ep.path}`);
      });

      it(`enforces 403 when student token is supplied for ${ep.name} (${ep.path})`, async () => {
        const res = await fetch(`${baseUrl}${ep.path}`, {
          headers: { Authorization: `Bearer ${studentToken}` },
        });
        assert.equal(res.status, 403, `Expected 403 for student accessing ${ep.path}`);
      });

      it(`enforces 403 when recruiter token is supplied for ${ep.name} (${ep.path})`, async () => {
        const res = await fetch(`${baseUrl}${ep.path}`, {
          headers: { Authorization: `Bearer ${recruiterToken}` },
        });
        assert.equal(res.status, 403, `Expected 403 for recruiter accessing ${ep.path}`);
      });

      it(`enforces 403 when college token is supplied for ${ep.name} (${ep.path})`, async () => {
        const res = await fetch(`${baseUrl}${ep.path}`, {
          headers: { Authorization: `Bearer ${collegeToken}` },
        });
        assert.equal(res.status, 403, `Expected 403 for college accessing ${ep.path}`);
      });

      it(`rejects suspended admin token for ${ep.name} (${ep.path})`, async () => {
        const res = await fetch(`${baseUrl}${ep.path}`, {
          headers: { Authorization: `Bearer ${suspendedAdminToken}` },
        });
        // requireAuth rejects inactive/suspended users with 401 or 403
        assert.ok(
          res.status === 401 || res.status === 403,
          `Expected 401/403 for suspended admin accessing ${ep.path}, got ${res.status}`
        );
      });

      it(`authorizes valid platform admin for ${ep.name} (${ep.path})`, async () => {
        const res = await fetch(`${baseUrl}${ep.path}`, {
          headers: { Authorization: `Bearer ${adminToken}` },
        });
        assert.notEqual(res.status, 401, `Admin should not get 401 on ${ep.path}`);
        assert.notEqual(res.status, 403, `Admin should not get 403 on ${ep.path}`);
        assert.ok(res.status >= 200 && res.status < 400, `Admin should get 2xx/3xx on ${ep.path}, got ${res.status}`);
      });
    }
  });

  describe('2. Audit Coverage on Administrative Mutations', () => {
    it('records an audited, SHA-256 chained entry on administrative flag toggle', async () => {
      const beforeCount = db.prepare(`SELECT count(*) as c FROM admin_audit_log WHERE action = 'system.flag_toggle';`).get().c;

      const res = await fetch(`${baseUrl}/api/admin/flags/signups_open`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ enabled: false, reason: 'Security matrix test toggle' }),
      });

      assert.equal(res.status, 200);

      const afterCount = db.prepare(`SELECT count(*) as c FROM admin_audit_log WHERE action = 'system.flag_toggle';`).get().c;
      assert.equal(afterCount, beforeCount + 1, 'Exactly one audit log record must be created on mutation');

      const latestLog = db.prepare(`SELECT * FROM admin_audit_log ORDER BY rowid DESC LIMIT 1;`).get();
      assert.equal(latestLog.admin_id, testAdminId);
      assert.equal(latestLog.action, 'system.flag_toggle');
      assert.ok(latestLog.hash, 'Audit entry must have a non-null SHA-256 hash');
      assert.ok(latestLog.prev_hash, 'Audit entry must chain to previous hash');

      // Revert flag
      await fetch(`${baseUrl}/api/admin/flags/signups_open`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ enabled: true, reason: 'Revert test' }),
      });
    });
  });

  describe('3. Input Fuzzing & SQL Metacharacter Resistance', () => {
    const maliciousStrings = [
      "' OR '1'='1",
      "'; DROP TABLE users; --",
      '<script>alert(1)</script>',
      '../../../../etc/passwd',
      '${7*7}',
      '\x00\x00\x00',
    ];

    it('handles malicious query inputs without crashing or leaking SQL errors', async () => {
      for (const injection of maliciousStrings) {
        // Fuzz user directory search
        const usersUrl = `${baseUrl}/api/admin/users?q=${encodeURIComponent(injection)}&pageSize=99999999&page=-5`;
        const userRes = await fetch(usersUrl, {
          headers: { Authorization: `Bearer ${adminToken}` },
        });
        assert.equal(userRes.status, 200, `User search must not crash on injection: ${injection}`);
        const userJson = await userRes.json();
        assert.ok(Array.isArray(userJson.items), 'Expected valid array response');

        // Fuzz audit log search
        const auditUrl = `${baseUrl}/api/admin/audit?q=${encodeURIComponent(injection)}&action=${encodeURIComponent(injection)}&page=-1`;
        const auditRes = await fetch(auditUrl, {
          headers: { Authorization: `Bearer ${adminToken}` },
        });
        assert.equal(auditRes.status, 200, `Audit search must not crash on injection: ${injection}`);
        const auditJson = await auditRes.json();
        assert.ok(Array.isArray(auditJson.logs), 'Expected valid logs array response');
      }
    });
  });

  describe('4. Secrets Sweep Across Admin Responses', () => {
    it('verifies password_hash and token hashes are never exposed in user listings', async () => {
      const res = await fetch(`${baseUrl}/api/admin/users?pageSize=20`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(res.status, 200);
      const text = await res.text();

      assert.ok(!text.includes('password_hash'), 'Response must NEVER include password_hash key');
      assert.ok(!text.includes('$2a$'), 'Response must NEVER contain bcrypt hashes');
      assert.ok(!text.includes('$2b$'), 'Response must NEVER contain bcrypt hashes');
      assert.ok(!text.includes('jwt_secret'), 'Response must NEVER leak JWT secret');
    });

    it('verifies system health probe never leaks sensitive process credentials', async () => {
      const res = await fetch(`${baseUrl}/api/admin/system/health`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(res.status, 200);
      const data = await res.json();

      assert.ok(data.ai, 'AI probe present');
      // AI probe should only return boolean configured status, not raw API key!
      assert.equal(typeof data.ai.configured, 'boolean');
      assert.equal(data.ai.apiKey, undefined, 'Raw API key must not be exposed');
    });
  });
});
