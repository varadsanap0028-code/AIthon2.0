import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { authService } from '../../services/authService.js';
import { validateConfig } from '../../config/index.js';
import { initDb, getDb } from '../../config/db.js';
import app from '../../index.js';

describe('Phase 3: Real Authentication & Operating Modes', () => {
  let serverInstance;
  let baseUrl;

  before(async () => {
    initDb();

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

  test('1. GET /api/auth/mode returns server operating mode and demo authentication status', async () => {
    const res = await fetch(`${baseUrl}/api/auth/mode`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.mode === 'demo' || body.mode === 'production');
    assert.equal(typeof body.demoAuthEnabled, 'boolean');
    assert.equal(body.activeDatabase, 'sqlite');
  });

  test('2. Real login succeeds for designated demo student with genuine password hash', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'student@sarathi.ai',
        password: 'password123'
      })
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.token, 'Must return signed JWT token');
    assert.equal(body.user.email, 'student@sarathi.ai');
    assert.equal(body.user.role, 'candidate');
    assert.equal(body.user.id, 'usr-student-demo');

    // Token should decode and verify
    const verified = authService.verifyToken(body.token);
    assert.ok(verified);
    assert.equal(verified.sub, 'usr-student-demo');
    assert.equal(verified.globalRole, 'candidate');
  });

  test('3. Real login succeeds for designated demo recruiter with organization membership', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'recruiter@sarathi.ai',
        password: 'password123'
      })
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.token);
    assert.equal(body.user.email, 'recruiter@sarathi.ai');
    assert.equal(body.user.role, 'recruiter');
    assert.ok(body.organization, 'Recruiter must have an organization');
    assert.equal(body.organization.id, 'org-demo-1');

    const verified = authService.verifyToken(body.token);
    assert.ok(verified);
    assert.equal(verified.globalRole, 'recruiter');
    assert.equal(verified.orgId, 'org-demo-1');
  });

  test('4. Demo alias recruiter@nextech.com resolves to designated recruiter in demo mode', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'recruiter@nextech.com',
        password: 'password123'
      })
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.token);
    assert.equal(body.user.email, 'recruiter@sarathi.ai');
    assert.equal(body.user.role, 'recruiter');
  });

  test('5. Login strictly rejects invalid passwords with error response', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'student@sarathi.ai',
        password: 'incorrect-password-999'
      })
    });

    assert.ok(res.status === 400 || res.status === 401, 'Status must be 400 or 401');
    const body = await res.json();
    assert.ok(body.error.includes('Invalid email or password'));
  });

  test('6. Login strictly rejects nonexistent users with error response', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'nonexistent-user@sarathi.ai',
        password: 'password123'
      })
    });

    assert.ok(res.status === 400 || res.status === 401, 'Status must be 400 or 401');
    const body = await res.json();
    assert.ok(body.error.includes('Invalid email or password'));
  });

  test('7. GET /api/auth/me restores verified session for student', async () => {
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'student@sarathi.ai',
        password: 'password123'
      })
    });
    const { token } = await loginRes.json();

    const meRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    assert.equal(meRes.status, 200);
    const meBody = await meRes.json();
    assert.equal(meBody.user.id, 'usr-student-demo');
    assert.equal(meBody.user.email, 'student@sarathi.ai');
    assert.equal(meBody.user.role, 'candidate');
  });

  test('8. GET /api/auth/me restores verified session and organization for recruiter', async () => {
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'recruiter@sarathi.ai',
        password: 'password123'
      })
    });
    const { token } = await loginRes.json();

    const meRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    assert.equal(meRes.status, 200);
    const meBody = await meRes.json();
    assert.equal(meBody.user.role, 'recruiter');
    assert.equal(meBody.activeOrgId, 'org-demo-1');
    assert.ok(Array.isArray(meBody.organizations));
    assert.ok(meBody.organizations.length >= 1);
  });

  test('9. GET /api/auth/me rejects invalid or forged bearer tokens with HTTP 401', async () => {
    const res = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: 'Bearer invalid.tampered.token' }
    });
    assert.equal(res.status, 401);
  });

  test('10. POST /api/auth/logout succeeds for authenticated users', async () => {
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'student@sarathi.ai',
        password: 'password123'
      })
    });
    const { token } = await loginRes.json();

    const logoutRes = await fetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
    assert.equal(logoutRes.status, 200);
    const logoutBody = await logoutRes.json();
    assert.equal(logoutBody.success, true);
  });

  test('11. Production configuration safety: rejects missing/default secrets and disables demo endpoints', () => {
    // Test production config validator rejects unsafe secrets
    const unsafeConfig = {
      isProduction: true,
      auth: {
        enableDemoAuth: false,
        secret: 'sarathi-dev-insecure-jwt-secret-do-not-use-in-prod-1234567890'
      }
    };
    assert.throws(
      () => validateConfig(unsafeConfig),
      /JWT_SECRET must be explicitly configured/
    );

    // Test production config validator rejects active demo auth in production
    const demoInProdConfig = {
      isProduction: true,
      auth: {
        enableDemoAuth: true,
        secret: 'a-sufficiently-long-and-secure-custom-production-secret-value-key-here'
      }
    };
    assert.throws(
      () => validateConfig(demoInProdConfig),
      /Demo authentication.*cannot be enabled in a production environment/
    );
  });

  test('12. Candidate identity cannot access recruiter candidate pool endpoints (403 Forbidden)', async () => {
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'student@sarathi.ai',
        password: 'password123'
      })
    });
    const { token } = await loginRes.json();

    const candidatePoolRes = await fetch(`${baseUrl}/api/candidates`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    assert.equal(candidatePoolRes.status, 403, 'Candidates must not access recruiter candidate pool');
  });

  test('13. Public job catalog remains accessible to unauthenticated visitors', async () => {
    const publicJobsRes = await fetch(`${baseUrl}/api/jobs/public`);
    assert.equal(publicJobsRes.status, 200);
    const jobs = await publicJobsRes.json();
    assert.ok(Array.isArray(jobs), 'Public jobs must return an array');
    assert.ok(jobs.length > 0, 'Public jobs must include existing published opportunities');
    assert.ok(jobs.every((j) => j.status === 'published'), 'All public jobs must have status published');
  });

  test('14. Sample database records and presentation data remain intact', () => {
    const db = getDb();
    const studentUser = db.prepare('SELECT * FROM users WHERE id = ?').get('usr-student-demo');
    assert.ok(studentUser, 'usr-student-demo must exist');
    assert.equal(studentUser.email, 'student@sarathi.ai');
    assert.ok(studentUser.password_hash, 'student password hash must be set');

    const candidateProfile = db.prepare('SELECT * FROM candidate_profiles WHERE id = ?').get('usr-student-demo');
    assert.ok(candidateProfile, 'usr-student-demo candidate profile must exist');

    const jobsCount = db.prepare('SELECT COUNT(*) as count FROM jobs').get();
    assert.ok(jobsCount.count >= 5, 'Sample jobs must be preserved');

    const skillsCount = db.prepare('SELECT COUNT(*) as count FROM skills').get();
    assert.ok(skillsCount.count >= 10, 'Sample skills taxonomy must be preserved');
  });
});
