import { test, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { googleAuthService } from '../../services/googleAuthService.js';
import { authService } from '../../services/authService.js';
import { collegeAnalyticsService, MIN_COLLEGE_COHORT_SIZE } from '../../services/collegeAnalyticsService.js';
import { repository } from '../../data/repository.js';
import { initDb } from '../../config/db.js';
import app from '../../index.js';

describe('Google SSO & Role-Based Authorization Integration Suite', () => {
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
    googleAuthService.resetVerifier();
    if (serverInstance) {
      await new Promise((resolve) => serverInstance.close(resolve));
    }
  });

  beforeEach(() => {
    googleAuthService.resetVerifier();
  });

  // ==================== 1. NONCE GENERATION & REPLAY DEFENSE ====================
  test('1. Nonce generation provides single-use cryptographic token and prevents replay attacks', async () => {
    const { nonce } = googleAuthService.generateNonce();
    assert.ok(nonce && nonce.length >= 32, 'Nonce must be at least 32 characters');

    // First consumption succeeds
    const consumed = googleAuthService.consumeNonce(nonce);
    assert.equal(consumed, true);

    // Second consumption (replay attack) must throw
    assert.throws(() => {
      googleAuthService.consumeNonce(nonce);
    }, (err) => {
      return err.code === 'GOOGLE_TOKEN_INVALID' && err.message.includes('replay');
    });
  });

  // ==================== 2. STRICT TOKEN VERIFICATION ====================
  test('2. Token verification rejects unverified Google emails with GOOGLE_TOKEN_INVALID', async () => {
    googleAuthService.setVerifier(async () => ({
      sub: 'google-sub-unverified',
      email: 'unverified.user@gmail.com',
      emailVerified: false,
      name: 'Unverified User',
    }));

    await assert.rejects(async () => {
      await googleAuthService.authenticateGoogle({
        credential: 'fake-token-unverified',
      });
    }, (err) => {
      return err.code === 'GOOGLE_TOKEN_INVALID';
    });
  });

  test('3. Token verification rejects invalid audience or signature', async () => {
    googleAuthService.setVerifier(async () => {
      const err = new Error('Wrong recipient, audience mismatch');
      err.code = 'GOOGLE_TOKEN_INVALID';
      throw err;
    });

    const res = await fetch(`${baseUrl}/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: 'mismatched-aud-token' }),
    });

    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.error.code, 'GOOGLE_TOKEN_INVALID');
  });

  // ==================== 3. STUDENT SELF-REGISTRATION VIA GOOGLE ====================
  test('4. Valid Google token for new student self-registers as candidate role and issues JWT', async () => {
    const testSub = `sub-student-${Date.now()}`;
    const testEmail = `newstudent.${Date.now()}@gmail.com`;

    googleAuthService.setVerifier(async () => ({
      sub: testSub,
      email: testEmail,
      emailVerified: true,
      name: 'New Student Test',
      picture: 'https://example.com/avatar.jpg',
    }));

    const result = await googleAuthService.authenticateGoogle({
      credential: 'valid-student-token',
      portalHint: 'student',
    });

    assert.ok(result.token, 'Must return signed Sarathi JWT');
    assert.equal(result.user.email, testEmail);
    assert.equal(result.user.role, 'candidate', 'DB role must strictly be candidate');
    assert.equal(result.defaultDashboard, '/student/dashboard');

    // Verify token claims
    const verified = authService.verifyToken(result.token);
    assert.equal(verified.sub, result.user.id);
    assert.equal(verified.globalRole, 'candidate');

    // Verify identity persisted in auth_identities table
    const identity = repository.queryOne(
      'SELECT * FROM auth_identities WHERE provider = ? AND provider_subject = ?;',
      ['google', testSub]
    );
    assert.ok(identity, 'Identity mapping must be saved in auth_identities');
    assert.equal(identity.user_id, result.user.id);
  });

  // ==================== 4. PRIVILEGED ACCESS GATING (NO AUTO-GRANT) ====================
  test('5. Unknown user requesting recruiter portal via Google is DENIED with ROLE_NOT_PROVISIONED', async () => {
    const unknownRecruiterEmail = `unknown.recruiter.${Date.now()}@company.com`;
    googleAuthService.setVerifier(async () => ({
      sub: `sub-recruiter-${Date.now()}`,
      email: unknownRecruiterEmail,
      emailVerified: true,
      name: 'Unknown Recruiter',
    }));

    const res = await fetch(`${baseUrl}/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        credential: 'valid-google-token',
        portalHint: 'recruiter',
      }),
    });

    assert.equal(res.status, 403, 'Must return 403 Forbidden');
    const body = await res.json();
    assert.equal(body.error.code, 'ROLE_NOT_PROVISIONED');
    assert.ok(body.error.message.includes('invitation'));
  });

  test('6. Unknown user requesting college portal via Google is DENIED with ROLE_NOT_PROVISIONED', async () => {
    const unknownCollegeEmail = `unknown.dean.${Date.now()}@university.edu`;
    googleAuthService.setVerifier(async () => ({
      sub: `sub-college-${Date.now()}`,
      email: unknownCollegeEmail,
      emailVerified: true,
      name: 'Unknown College Dean',
    }));

    const res = await fetch(`${baseUrl}/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        credential: 'valid-google-token',
        portalHint: 'college',
      }),
    });

    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.error.code, 'ROLE_NOT_PROVISIONED');
  });

  // ==================== 5. PRE-PROVISIONED INVITATIONS ====================
  test('7. Recruiter with a valid pending invitation is auto-provisioned upon Google sign-in', async () => {
    const invitedEmail = `invited.hiring.${Date.now()}@sarathi.enterprise`;
    const inviteId = `inv-${Date.now()}`;
    const now = new Date().toISOString();
    const futureExpiry = new Date(Date.now() + 86400000).toISOString();

    // Insert valid invitation
    repository.execute(
      `INSERT INTO account_invitations (id, email, role, org_id, status, expires_at, created_at)
       VALUES (?, ?, 'recruiter', 'org-demo-1', 'pending', ?, ?);`,
      [inviteId, invitedEmail, futureExpiry, now]
    );

    googleAuthService.setVerifier(async () => ({
      sub: `sub-invited-${Date.now()}`,
      email: invitedEmail,
      emailVerified: true,
      name: 'Invited Hiring Manager',
    }));

    const result = await googleAuthService.authenticateGoogle({
      credential: 'valid-invited-token',
      portalHint: 'recruiter',
    });

    assert.ok(result.token);
    assert.equal(result.user.email, invitedEmail);
    assert.equal(result.user.role, 'recruiter');
    assert.equal(result.organization.id, 'org-demo-1');

    // Verify invitation marked as accepted
    const updatedInvite = repository.queryOne(
      'SELECT status FROM account_invitations WHERE id = ?;',
      [inviteId]
    );
    assert.equal(updatedInvite.status, 'accepted');
  });

  // ==================== 6. ACCOUNT LINKING & SECURITY ====================
  test('8. Candidate account auto-links to matching verified email', async () => {
    // student@sarathi.ai is pre-seeded candidate
    const existingEmail = 'student@sarathi.ai';
    const sub = `sub-cand-link-${Date.now()}`;

    googleAuthService.setVerifier(async () => ({
      sub,
      email: existingEmail,
      emailVerified: true,
      name: 'Alex Morgan',
    }));

    const result = await googleAuthService.authenticateGoogle({
      credential: 'valid-link-token',
      portalHint: 'student',
    });

    assert.ok(result.token);
    assert.equal(result.user.id, 'usr-student-demo');

    // Verify linked identity
    const identity = repository.queryOne(
      'SELECT * FROM auth_identities WHERE provider_subject = ?;',
      [sub]
    );
    assert.equal(identity.user_id, 'usr-student-demo');
  });

  test('9. Existing recruiter account rejects auto-linking via Google sign-in without proof', async () => {
    // recruiter@sarathi.ai is an existing recruiter account
    googleAuthService.setVerifier(async () => ({
      sub: `sub-recruiter-spoof-${Date.now()}`,
      email: 'recruiter@sarathi.ai',
      emailVerified: true,
      name: 'Recruiter Spoof',
    }));

    await assert.rejects(async () => {
      await googleAuthService.authenticateGoogle({
        credential: 'spoof-token',
        portalHint: 'recruiter',
      });
    }, (err) => {
      return err.code === 'LINK_REQUIRES_PASSWORD';
    });
  });

  // ==================== 7. MID-SESSION SUSPENSION & STATUS ENFORCEMENT ====================
  test('10. Suspended user is denied access on login and mid-session requests', async () => {
    // 1. Create temporary active user
    const tempEmail = `temp.user.${Date.now()}@sarathi.test`;
    const regRes = await authService.register({
      email: tempEmail,
      password: 'password123',
      fullName: 'Temp Test User',
      role: 'student',
    });

    assert.ok(regRes.token);

    // Verify valid session initially
    const check1 = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${regRes.token}` },
    });
    assert.equal(check1.status, 200);

    // 2. Suspend user in database mid-session
    repository.execute("UPDATE users SET status = 'suspended' WHERE email = ?;", [tempEmail]);

    // 3. Next request with the SAME token must be rejected with 403 Forbidden
    const check2 = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${regRes.token}` },
    });
    assert.equal(check2.status, 403);
    const body2 = await check2.json();
    assert.equal(body2.code, 'ACCOUNT_SUSPENDED');

    // 4. Password login for suspended user must also fail with 403
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: tempEmail, password: 'password123' }),
    });
    assert.equal(loginRes.status, 403);
  });

  // ==================== 8. COLLEGE ANALYTICS & PRIVACY BOUNDS ====================
  test('11. College analytics enforces minimum cohort threshold to protect student privacy', async () => {
    // Query institution with 0 or 1 student
    const result = collegeAnalyticsService.getCollegeAnalytics('non-existent-inst', 'Empty College');
    assert.equal(result.minCohortMet, false);
    assert.equal(result.minCohortRequired, MIN_COLLEGE_COHORT_SIZE);
    assert.ok(result.notice.includes('minimum cohort'));
    assert.equal(result.kpis.avgReadinessScore, 0);
  });

  test('12. College analytics computes real aggregates when cohort meets threshold', async () => {
    // Link 3 candidates to a test institution
    const testInstId = `inst-test-${Date.now()}`;
    const testInstName = `Unique College ${Date.now()}`;
    const now = new Date().toISOString();
    repository.execute(
      'INSERT INTO institutions (id, name, domain, created_at, updated_at) VALUES (?, ?, ?, ?, ?);',
      [testInstId, testInstName, 'sit.ac.in', now, now]
    );

    // Create 3 students linked to this institution
    for (let i = 1; i <= 3; i++) {
      const stuEmail = `sit.student${i}.${Date.now()}@sit.ac.in`;
      const stu = await authService.register({
        email: stuEmail,
        password: 'password123',
        fullName: `SIT Student ${i}`,
        role: 'student',
      });
      collegeAnalyticsService.linkStudentToInstitution(stu.user.id, testInstId);
    }

    const analytics = collegeAnalyticsService.getCollegeAnalytics(testInstId, testInstName);
    assert.equal(analytics.minCohortMet, true);
    assert.equal(analytics.kpis.totalStudents, 3);
    assert.ok(analytics.kpis.avgReadinessScore > 0, 'Average readiness score must be computed');
    assert.ok(Array.isArray(analytics.departments), 'Departments must be an array');
    assert.ok(Array.isArray(analytics.roster), 'Roster must be returned');
    assert.equal(analytics.roster.length, 3);
  });
});
