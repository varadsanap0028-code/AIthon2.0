import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import app from '../../index.js';
import { runMigrations } from '../../data/migrate.mjs';

describe('Phase 4: Student Analytics and GitHub Integration Tests', () => {
  let serverInstance;
  let baseUrl;
  let candidateToken;
  const testEmail = `p4-candidate-${Date.now()}@sarathi.test`;
  const testPassword = 'studentSecurePassword123!';

  before(async () => {
    runMigrations();

    await new Promise((resolve) => {
      serverInstance = app.listen(0, '127.0.0.1', () => {
        const port = serverInstance.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });

    // Register and get genuine JWT token
    const regRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
        fullName: 'Phase4 Analytics Student',
        role: 'student'
      })
    });
    const regJson = await regRes.json();
    candidateToken = regJson.token;
  });

  after(() => {
    if (serverInstance) {
      serverInstance.close();
    }
  });

  it('1. GET /api/analytics/student rejects unauthenticated requests with 401', async () => {
    const res = await fetch(`${baseUrl}/api/analytics/student`);
    assert.strictEqual(res.status, 401);
  });

  it('2. GET /api/analytics/student returns complete statistical chart data for candidate', async () => {
    const res = await fetch(`${baseUrl}/api/analytics/student`, {
      headers: { Authorization: `Bearer ${candidateToken}` }
    });

    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.ok(json.data, 'Analytics data payload must exist');

    const { summary, charts } = json.data;

    // Check summary statistics
    assert.ok(typeof summary.readinessScore === 'number', 'readinessScore must be a number');
    assert.ok(summary.avgAssessmentScore === null || typeof summary.avgAssessmentScore === 'number', 'avgAssessmentScore must be null or a number');
    assert.ok(typeof summary.streakDays === 'number', 'streakDays must be a number');
    assert.ok(typeof summary.totalHoursLearned === 'number', 'totalHoursLearned must be a number');

    // Check all required PRD §3.5 charts
    assert.ok(Array.isArray(charts.skillRadar), 'skillRadar must be an array');
    assert.ok(Array.isArray(charts.benchmarkGaps), 'benchmarkGaps must be an array');
    assert.ok(Array.isArray(charts.readinessTrend), 'readinessTrend must be an array');
    assert.ok(Array.isArray(charts.gapPrioritySplit), 'gapPrioritySplit must be an array');
    assert.ok(Array.isArray(charts.roadmapProgress), 'roadmapProgress must be an array');
    assert.ok(Array.isArray(charts.learningActivity), 'learningActivity must be an array');
    assert.ok(Array.isArray(charts.applicationFunnel), 'applicationFunnel must be an array');
    assert.ok(Array.isArray(charts.jobMatchDistribution), 'jobMatchDistribution must be an array');
    assert.ok(Array.isArray(charts.resourceMix), 'resourceMix must be an array');
    assert.ok(Array.isArray(charts.githubLanguages), 'githubLanguages must be an array');

    // Check chart elements structure
    assert.ok(charts.skillRadar.length > 0, 'skillRadar must have categories');
    assert.ok(charts.skillRadar[0].category, 'Radar item must have category');
    assert.ok(typeof charts.skillRadar[0].current === 'number', 'Radar item must have current score');
    assert.ok(typeof charts.skillRadar[0].required === 'number', 'Radar item must have required score');

    assert.ok(charts.applicationFunnel.length >= 4, 'Funnel must have at least 4 stages');
    assert.strictEqual(charts.learningActivity.length, 12, 'Learning activity must have 12 weeks');

    // Check unified Dashboard PRD fields
    assert.ok(json.data.kpis, 'kpis object must exist');
    assert.ok(typeof json.data.kpis.readinessScore === 'number', 'kpi readinessScore must be a number');
    assert.ok(typeof json.data.kpis.verifiedSkillsCount === 'number', 'kpi verifiedSkillsCount must be a number');
    assert.ok(typeof json.data.kpis.highPriorityGapsCount === 'number', 'kpi highPriorityGapsCount must be a number');
    assert.ok(typeof json.data.kpis.roadmapProgressPct === 'number', 'kpi roadmapProgressPct must be a number');

    assert.ok(Array.isArray(json.data.categoryScores), 'categoryScores must be an array');
    assert.ok(Array.isArray(json.data.topGaps), 'topGaps must be an array');
    assert.ok(Array.isArray(json.data.roadmapByStage), 'roadmapByStage must be an array');
    assert.ok(Array.isArray(json.data.topJobMatches), 'topJobMatches must be an array');
  });

  it('3. POST /api/candidates/github/import requires authentication', async () => {
    const res = await fetch(`${baseUrl}/api/candidates/github/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repoUrl: 'facebook/react' })
    });

    assert.strictEqual(res.status, 401);
  });

  it('4. POST /api/candidates/github/import rejects invalid format or missing body', async () => {
    const res = await fetch(`${baseUrl}/api/candidates/github/import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${candidateToken}`
      },
      body: JSON.stringify({})
    });

    assert.strictEqual(res.status, 400);
  });

  it('5. POST /api/candidates/github/import imports repository metadata successfully', async () => {
    const res = await fetch(`${baseUrl}/api/candidates/github/import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${candidateToken}`
      },
      body: JSON.stringify({ repoUrl: 'https://github.com/facebook/react' })
    });

    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.ok(json.data, 'Imported repo data must exist');
    assert.ok(json.data.title, 'Repo must have a title');
    assert.ok(json.data.repositoryUrl.includes('facebook/react'), 'Repository URL must be normalized');
    assert.ok(Array.isArray(json.data.languages), 'Languages must be an array');
  });
});
