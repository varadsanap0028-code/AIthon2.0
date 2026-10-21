import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { app as appConfig, auth as authConfig, validateConfig } from '../../config/index.js';
import { authService } from '../../services/authService.js';
import { initDb } from '../../config/db.js';
import app from '../../index.js';

describe('Phase 1: Student and Recruiter Session Security', () => {
  let serverInstance;
  let baseUrl;

  before(async () => {
    initDb();
    // Start temporary test listener on ephemeral port
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

  test('1. Startup configuration validation fails safely in production when demo auth is enabled', () => {
    const origEnv = appConfig.env;
    const origEnableDemo = authConfig.enableDemoAuth;
    const origSecret = authConfig.secret;

    try {
      appConfig.env = 'production';
      authConfig.enableDemoAuth = true;

      assert.throws(() => {
        validateConfig();
      }, /FATAL CONFIGURATION ERROR: Demo authentication .* cannot be enabled in a production environment/);

      // Verify weak secret detection in production
      authConfig.enableDemoAuth = false;
      authConfig.secret = 'sarathi-dev-secret-change-me';
      assert.throws(() => {
        validateConfig();
      }, /FATAL CONFIGURATION ERROR: JWT_SECRET must be explicitly configured/);

      // Verify valid production config passes
      authConfig.secret = 'strong-production-secret-key-12345';
      assert.doesNotThrow(() => {
        validateConfig();
      });
    } finally {
      appConfig.env = origEnv;
      authConfig.enableDemoAuth = origEnableDemo;
      authConfig.secret = origSecret;
    }
  });

  test('2. Anonymous session generation is rejected (403) when demo authentication is disabled', async () => {
    const origEnableDemo = authConfig.enableDemoAuth;
    authConfig.enableDemoAuth = false;

    try {
      // Recruiter session request
      const recRes = await fetch(`${baseUrl}/api/auth/recruiter-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId: 'org-demo-1' }),
      });
      assert.strictEqual(recRes.status, 403);
      const recJson = await recRes.json();
      assert.match(recJson.error, /Demo session generation is disabled/);

      // Student session request
      const studRes = await fetch(`${baseUrl}/api/auth/student-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'student@sarathi.ai' }),
      });
      assert.strictEqual(studRes.status, 403);
      const studJson = await studRes.json();
      assert.match(studJson.error, /Demo session generation is disabled/);
    } finally {
      authConfig.enableDemoAuth = origEnableDemo;
    }
  });

  test('3. Anonymous session generation is rejected (403) in production configuration', async () => {
    const origEnv = appConfig.env;
    const origEnableDemo = authConfig.enableDemoAuth;
    appConfig.env = 'production';
    authConfig.enableDemoAuth = false;

    try {
      const recRes = await fetch(`${baseUrl}/api/auth/recruiter-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      assert.strictEqual(recRes.status, 403);

      const studRes = await fetch(`${baseUrl}/api/auth/student-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test.student@example.com' }),
      });
      assert.strictEqual(studRes.status, 403);
    } finally {
      appConfig.env = origEnv;
      authConfig.enableDemoAuth = origEnableDemo;
    }
  });

  test('4. In demo mode, recruiter-session endpoint only permits the designated demo recruiter and demo org', async () => {
    const origEnableDemo = authConfig.enableDemoAuth;
    const origEnv = appConfig.env;
    authConfig.enableDemoAuth = true;
    appConfig.env = 'development';

    try {
      // Legitimate demo recruiter session succeeds
      const validRes = await fetch(`${baseUrl}/api/auth/recruiter-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId: 'org-demo-1' }),
      });
      assert.strictEqual(validRes.status, 200);
      const validData = await validRes.json();
      assert.ok(validData.token);
      assert.strictEqual(validData.user.role, 'recruiter');
      assert.strictEqual(validData.user.orgId, 'org-demo-1');

      // Attempting to request arbitrary recruiter email is rejected
      const hijackRes = await fetch(`${baseUrl}/api/auth/recruiter-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@sarathi.ai' }),
      });
      assert.strictEqual(hijackRes.status, 403);
      const hijackJson = await hijackRes.json();
      assert.match(hijackJson.error, /only be issued for the designated demo recruiter/);

      // Attempting to request arbitrary organization ID is rejected
      const orgHijackRes = await fetch(`${baseUrl}/api/auth/recruiter-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId: 'org-demo-2' }),
      });
      assert.strictEqual(orgHijackRes.status, 403);
      const orgHijackJson = await orgHijackRes.json();
      assert.match(orgHijackJson.error, /restricted to the default demo organization/);
    } finally {
      authConfig.enableDemoAuth = origEnableDemo;
      appConfig.env = origEnv;
    }
  });

  test('5. In demo mode, student-session endpoint prevents account takeover of existing users', async () => {
    const origEnableDemo = authConfig.enableDemoAuth;
    const origEnv = appConfig.env;
    authConfig.enableDemoAuth = true;
    appConfig.env = 'development';

    try {
      // Attempting to generate a session for an existing non-demo candidate is strictly rejected
      const takeoverRes = await fetch(`${baseUrl}/api/auth/student-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'rohan.iyer@example.com' }),
      });
      assert.strictEqual(takeoverRes.status, 403);
      const takeoverJson = await takeoverRes.json();
      assert.match(takeoverJson.error, /Cannot generate a demo session for an existing/);

      // Designated demo student is allowed
      const demoRes = await fetch(`${baseUrl}/api/auth/student-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: 'usr-student-demo',
          email: 'student@sarathi.ai',
          fullName: 'Alex Morgan'
        }),
      });
      assert.strictEqual(demoRes.status, 200);
      const demoData = await demoRes.json();
      assert.ok(demoData.token);
      assert.strictEqual(demoData.user.role, 'candidate');

      // Attempting to claim privileged role via student-session is forced to candidate
      const roleClaimRes = await fetch(`${baseUrl}/api/auth/student-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: `test-ephemeral-${Date.now()}@sarathi.test`,
          role: 'recruiter' // Attacker attempts role elevation
        }),
      });
      assert.strictEqual(roleClaimRes.status, 200);
      const roleData = await roleClaimRes.json();
      assert.strictEqual(roleData.user.role, 'candidate');
      const decoded = authService.verifyToken(roleData.token);
      assert.strictEqual(decoded.globalRole, 'candidate');
    } finally {
      authConfig.enableDemoAuth = origEnableDemo;
      appConfig.env = origEnv;
    }
  });

  test('6. POST /api/auth/login requires valid email and password credentials', async () => {
    // Missing credentials
    const missingRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'recruiter@sarathi.ai' }), // No password
    });
    assert.strictEqual(missingRes.status, 400);

    // Invalid password
    const invalidRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'recruiter@sarathi.ai', password: 'wrongpassword' }),
    });
    assert.strictEqual(invalidRes.status, 400);

    // Valid credentials
    const validRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'recruiter@sarathi.ai', password: 'password123' }),
    });
    assert.strictEqual(validRes.status, 200);
    const validData = await validRes.json();
    assert.ok(validData.token);
    assert.strictEqual(validData.user.email, 'recruiter@sarathi.ai');
  });

  test('7. Token validation and verification remain intact', () => {
    const user = {
      id: 'usr-test-verify',
      email: 'verify@sarathi.ai',
      full_name: 'Verify User',
      role: 'recruiter'
    };
    const token = authService.generateToken(user, 'org-demo-1', 'recruiter');
    assert.ok(token);

    const verified = authService.verifyToken(token);
    assert.strictEqual(verified.sub, user.id);
    assert.strictEqual(verified.email, user.email);
    assert.strictEqual(verified.globalRole, 'recruiter');
    assert.strictEqual(verified.orgId, 'org-demo-1');

    // Tampered token returns null
    const tampered = token.slice(0, -5) + 'abcde';
    assert.strictEqual(authService.verifyToken(tampered), null);
  });
});
