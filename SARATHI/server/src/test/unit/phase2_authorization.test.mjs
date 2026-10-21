import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { authService } from '../../services/authService.js';
import { pipelineService } from '../../services/pipelineService.js';
import { initDb, getDb } from '../../config/db.js';
import app from '../../index.js';

describe('Phase 2: Authorization & Multi-Tenant Data Isolation', () => {
  let serverInstance;
  let baseUrl;
  let recruiterToken;
  let candidateToken;
  let org2RecruiterToken;
  let org1ShortlistId;
  let org2ShortlistId;

  before(async () => {
    initDb();

    // Start ephemeral test server
    await new Promise((resolve) => {
      serverInstance = app.listen(0, '127.0.0.1', () => {
        const port = serverInstance.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });

    // Generate tokens
    const recruiterSession = await authService.getOrCreateRecruiterSession({
      email: 'recruiter@sarathi.local',
      orgId: 'org-demo-1',
    });
    recruiterToken = recruiterSession.token;

    const candidateSession = await authService.getOrCreateStudentSession({
      id: `usr-phase2-candidate-${Date.now()}`,
      email: `candidate.phase2.${Date.now()}@sarathi.local`,
      fullName: 'Security Test Candidate',
      institution: 'Security University',
      targetRole: 'Full-Stack Developer'
    });
    candidateToken = candidateSession.token;

    // Recruiter for org-demo-2
    const org2User = {
      id: `usr-recruiter-org2-${Date.now()}`,
      email: `recruiter.org2.${Date.now()}@sarathi.local`,
      full_name: 'Org 2 Recruiter',
      role: 'recruiter',
    };
    const db = getDb();
    const now = new Date().toISOString();
    db.prepare(`
      INSERT OR IGNORE INTO organisations (id, name, slug, created_at, updated_at)
      VALUES ('org-demo-2', 'Acme Corp Org 2', 'acme-org2', ?, ?);
    `).run(now, now);

    db.prepare(`
      INSERT INTO users (id, email, full_name, role, created_at, updated_at)
      VALUES (?, ?, ?, 'recruiter', ?, ?);
    `).run(org2User.id, org2User.email, org2User.full_name, now, now);

    db.prepare(`
      INSERT INTO organisation_memberships (id, org_id, user_id, role, status, created_at, updated_at)
      VALUES (?, 'org-demo-2', ?, 'recruiter', 'active', ?, ?);
    `).run(`mem-org2-${Date.now()}`, org2User.id, now, now);

    org2RecruiterToken = authService.generateToken(org2User, 'org-demo-2', 'recruiter');

    // Create a shortlist for org-demo-1 and org-demo-2
    const sl1 = pipelineService.createShortlist('org-demo-1', 'usr-recruiter-1', {
      title: 'Phase 2 Test Shortlist Org 1',
      description: 'Testing tenant isolation'
    });
    org1ShortlistId = sl1.id;

    const sl2 = pipelineService.createShortlist('org-demo-2', org2User.id, {
      title: 'Phase 2 Test Shortlist Org 2',
      description: 'Testing tenant isolation'
    });
    org2ShortlistId = sl2.id;
  });

  after(async () => {
    if (serverInstance) {
      await new Promise((resolve) => serverInstance.close(resolve));
    }
  });

  // 1. Unauthenticated requests to protected endpoints are rejected (401)
  test('1. Unauthenticated requests to protected endpoints return 401', async () => {
    const protectedGetEndpoints = [
      '/api/candidates',
      '/api/candidates/cand-1/passport',
      '/api/jobs',
      '/api/jobs/job-1',
      '/api/verifications/pending',
      '/api/assessments/assignments',
      '/api/interviews',
      '/api/interviews/iv-1',
      '/api/analytics/dashboard',
      '/api/organization',
      '/api/organization/members',
      `/api/pipeline/shortlists/${org1ShortlistId}/members`,
    ];

    for (const endpoint of protectedGetEndpoints) {
      const res = await fetch(`${baseUrl}${endpoint}`);
      assert.strictEqual(
        res.status,
        401,
        `Expected 401 for unauthenticated GET ${endpoint}, got ${res.status}`
      );
      const data = await res.json();
      assert.strictEqual(data.error, 'Authentication required');
    }

    const protectedPostEndpoints = [
      { endpoint: '/api/candidates/cand-1/match', body: { jobId: 'job-1' } },
      { endpoint: '/api/candidates/cand-1/gap-analysis', body: { jobId: 'job-1' } },
      { endpoint: '/api/candidates/compare', body: { candidateIds: ['cand-1', 'cand-2'], jobId: 'job-1' } },
    ];

    for (const { endpoint, body } of protectedPostEndpoints) {
      const res = await fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      assert.strictEqual(
        res.status,
        401,
        `Expected 401 for unauthenticated POST ${endpoint}, got ${res.status}`
      );
    }
  });

  // 2. Authenticated users with insufficient roles (candidates) are rejected (403)
  test('2. Candidates attempting to access recruiter-only endpoints receive 403 Forbidden', async () => {
    const recruiterOnlyEndpoints = [
      '/api/candidates',
      '/api/candidates/cand-1/passport',
      '/api/jobs',
      '/api/jobs/job-1',
      '/api/verifications/pending',
      '/api/assessments/assignments',
      '/api/interviews',
      '/api/analytics/dashboard',
      '/api/organization',
      '/api/organization/members',
      `/api/pipeline/shortlists/${org1ShortlistId}/members`,
    ];

    for (const endpoint of recruiterOnlyEndpoints) {
      const res = await fetch(`${baseUrl}${endpoint}`, {
        headers: { Authorization: `Bearer ${candidateToken}` },
      });
      assert.strictEqual(
        res.status,
        403,
        `Expected 403 for candidate accessing ${endpoint}, got ${res.status}`
      );
      const data = await res.json();
      assert.ok(data.error.includes('Access denied') || data.error.includes('Only') || data.error.includes('sufficient permissions'));
    }

    // Also test POST endpoints
    const recruiterOnlyPosts = [
      { endpoint: '/api/candidates/cand-1/match', body: { jobId: 'job-1' } },
      { endpoint: '/api/candidates/cand-1/gap-analysis', body: { jobId: 'job-1' } },
      { endpoint: '/api/candidates/compare', body: { candidateIds: ['cand-1', 'cand-2'], jobId: 'job-1' } },
    ];

    for (const { endpoint, body } of recruiterOnlyPosts) {
      const res = await fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${candidateToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      assert.strictEqual(
        res.status,
        403,
        `Expected 403 for candidate POST to ${endpoint}, got ${res.status}`
      );
    }
  });

  // 3. Authorized recruiters can access the protected endpoints they need (200)
  test('3. Authorized recruiters receive 200 OK on internal endpoints', async () => {
    const headers = { Authorization: `Bearer ${recruiterToken}` };

    const getEndpoints = [
      '/api/candidates',
      '/api/candidates/usr-cand-1/passport',
      '/api/jobs',
      '/api/jobs/job-1',
      '/api/verifications/pending',
      '/api/assessments/assignments',
      '/api/interviews',
      '/api/analytics/dashboard',
      '/api/organization',
      '/api/organization/members',
      `/api/pipeline/shortlists/${org1ShortlistId}/members`,
    ];

    for (const endpoint of getEndpoints) {
      const res = await fetch(`${baseUrl}${endpoint}`, { headers });
      assert.strictEqual(
        res.status,
        200,
        `Expected 200 for recruiter accessing ${endpoint}, got ${res.status}`
      );
    }

    // POST match & gap-analysis & compare
    const matchRes = await fetch(`${baseUrl}/api/candidates/usr-cand-1/match`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId: 'job-1' }),
    });
    assert.strictEqual(matchRes.status, 200);

    const gapRes = await fetch(`${baseUrl}/api/candidates/usr-cand-1/gap-analysis`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId: 'job-1' }),
    });
    assert.strictEqual(gapRes.status, 200);

    const compareRes = await fetch(`${baseUrl}/api/candidates/compare`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ candidateIds: ['usr-cand-1', 'usr-cand-2'], jobId: 'job-1' }),
    });
    assert.strictEqual(compareRes.status, 200);
  });

  // 4. Public published-job endpoints remain publicly accessible (200)
  test('4. Public published-job endpoints remain accessible without authentication', async () => {
    const pubListRes = await fetch(`${baseUrl}/api/jobs/public`);
    assert.strictEqual(pubListRes.status, 200);
    const pubJobs = await pubListRes.json();
    assert.ok(Array.isArray(pubJobs));
    assert.ok(pubJobs.length > 0);

    const pubSingleRes = await fetch(`${baseUrl}/api/jobs/public/job-1`);
    assert.strictEqual(pubSingleRes.status, 200);
    const pubSingle = await pubSingleRes.json();
    assert.strictEqual(pubSingle.id, 'job-1');
    assert.strictEqual(pubSingle.status, 'published');
  });

  // 5. Draft jobs and private candidate records are not publicly exposed
  test('5. Draft jobs and non-existent jobs are not exposed on public endpoints', async () => {
    // job-5 is a draft job in seed
    const draftRes = await fetch(`${baseUrl}/api/jobs/public/job-5`);
    assert.strictEqual(draftRes.status, 404, 'Draft job must return 404 on public endpoint');

    const nonExistentRes = await fetch(`${baseUrl}/api/jobs/public/non-existent-id`);
    assert.strictEqual(nonExistentRes.status, 404);

    // Private candidate records cannot be read without auth
    const candRes = await fetch(`${baseUrl}/api/candidates/cand-1/passport`);
    assert.strictEqual(candRes.status, 401);
  });

  // 6. Recruiter from Organization A cannot access Organization B's shortlist members
  test('6. Cross-tenant isolation: Recruiter from Org A cannot access Org B shortlist members', async () => {
    // Recruiter 1 (Org 1) attempts to access Org 2's shortlist
    const crossRes = await fetch(`${baseUrl}/api/pipeline/shortlists/${org2ShortlistId}/members`, {
      headers: { Authorization: `Bearer ${recruiterToken}` },
    });
    assert.strictEqual(
      crossRes.status,
      404,
      `Expected 404 Not Found for cross-org shortlist access, got ${crossRes.status}`
    );

    // Recruiter 2 (Org 2) attempts to access Org 1's shortlist
    const crossRes2 = await fetch(`${baseUrl}/api/pipeline/shortlists/${org1ShortlistId}/members`, {
      headers: { Authorization: `Bearer ${org2RecruiterToken}` },
    });
    assert.strictEqual(
      crossRes2.status,
      404,
      `Expected 404 Not Found for cross-org shortlist access, got ${crossRes2.status}`
    );

    // Recruiter 1 attempting to tamper using x-org-id: org-demo-2 header cannot access Org 2 shortlist
    const headerTamperRes = await fetch(`${baseUrl}/api/pipeline/shortlists/${org2ShortlistId}/members`, {
      headers: {
        Authorization: `Bearer ${recruiterToken}`,
        'x-org-id': 'org-demo-2',
      },
    });
    assert.strictEqual(
      headerTamperRes.status,
      404,
      'x-org-id header must not override authenticated user orgId'
    );

    // Org 2 recruiter accessing own shortlist succeeds
    const org2OwnRes = await fetch(`${baseUrl}/api/pipeline/shortlists/${org2ShortlistId}/members`, {
      headers: { Authorization: `Bearer ${org2RecruiterToken}` },
    });
    assert.strictEqual(org2OwnRes.status, 200);
  });

  // 7. Candidate self-service endpoints remain accessible for their authenticated owner
  test('7. Candidate self-service endpoints work correctly for authenticated candidates', async () => {
    const candHeaders = { Authorization: `Bearer ${candidateToken}` };

    const passportRes = await fetch(`${baseUrl}/api/candidates/my-passport`, { headers: candHeaders });
    assert.strictEqual(passportRes.status, 200);
    const passportData = await passportRes.json();
    assert.strictEqual(passportData.success, true);

    const appsRes = await fetch(`${baseUrl}/api/pipeline/my-applications`, { headers: candHeaders });
    assert.strictEqual(appsRes.status, 200);
    const appsData = await appsRes.json();
    assert.strictEqual(appsData.success, true);

    const histRes = await fetch(`${baseUrl}/api/assessments/my-history`, { headers: candHeaders });
    assert.strictEqual(histRes.status, 200);
    const histData = await histRes.json();
    assert.strictEqual(histData.success, true);
  });
});
