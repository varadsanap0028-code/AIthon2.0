import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import app from '../../index.js';
import { runMigrations } from '../../data/migrate.mjs';
import { matchingService } from '../../services/matchingService.js';

describe('Skill Intelligence Engine - End-to-End API Integration Suite', () => {
  let serverInstance;
  let baseUrl;
  let studentToken;
  let recruiterToken;
  const testStudentEmail = `sie-student-${Date.now()}@sarathi.test`;
  const testRecruiterEmail = `sie-recruiter-${Date.now()}@sarathi.test`;
  const password = 'SecurePassword123!';

  before(async () => {
    runMigrations();

    await new Promise((resolve) => {
      serverInstance = app.listen(0, '127.0.0.1', () => {
        const port = serverInstance.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });

    // 1. Register candidate
    const studentRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testStudentEmail,
        password,
        fullName: 'Skill Engine Student',
        role: 'student'
      })
    });
    const studentJson = await studentRes.json();
    studentToken = studentJson.token;

    // 2. Register recruiter
    const recruiterRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testRecruiterEmail,
        password,
        fullName: 'Skill Engine Recruiter',
        role: 'recruiter',
        companyName: 'Acme AI Systems'
      })
    });
    const recruiterJson = await recruiterRes.json();
    recruiterToken = recruiterJson.token;
  });

  after(() => {
    if (serverInstance) serverInstance.close();
  });

  it('1. GET /api/skills/benchmarks returns canonical roles and competencies', async () => {
    const res = await fetch(`${baseUrl}/api/skills/benchmarks`);
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.ok(json.data.length > 0);

    const feRole = json.data.find(r => r.roleTitle === 'Frontend Developer');
    assert.ok(feRole);
    assert.ok(feRole.requiredSkills.length >= 6);
  });

  it('2. GET /api/skills/profile returns unassessed canonical profile with INSUFFICIENT_EVIDENCE', async () => {
    const res = await fetch(`${baseUrl}/api/skills/profile?targetRole=Frontend Developer`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.ok(Array.isArray(json.data));

    // For new student, skills must explicitly be marked INSUFFICIENT_EVIDENCE (not silent level 0)
    const htmlSkill = json.data.find(s => s.skillId === 'sk-html5');
    assert.ok(htmlSkill);
    assert.strictEqual(htmlSkill.evidenceStatus, 'INSUFFICIENT_EVIDENCE');
    assert.strictEqual(htmlSkill.demonstratedProficiency, null);
  });

  it('3. GET /api/skills/gaps and /api/skills/readiness enforce unassessed denominator', async () => {
    const gapsRes = await fetch(`${baseUrl}/api/skills/gaps?targetRole=Frontend Developer`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert.strictEqual(gapsRes.status, 200);
    const gapsJson = await gapsRes.json();
    assert.strictEqual(gapsJson.success, true);
    assert.strictEqual(gapsJson.data.targetRole, 'Frontend Developer');
    assert.ok(gapsJson.data.metrics.evidenceNeeded > 0);

    const readinessRes = await fetch(`${baseUrl}/api/skills/readiness?targetRole=Frontend Developer`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert.strictEqual(readinessRes.status, 200);
    const readinessJson = await readinessRes.json();
    assert.strictEqual(readinessJson.success, true);
    assert.strictEqual(readinessJson.data.readinessScore, 0); // 0 verified points
    assert.strictEqual(readinessJson.data.evidenceCoverage, 0);
    assert.strictEqual(readinessJson.data.evidenceSufficiency.uncertainty, 'HIGH');
  });

  it('4. POST /api/skills/adaptive/start starts a diagnostic session and records answers', async () => {
    const res = await fetch(`${baseUrl}/api/skills/adaptive/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`
      },
      body: JSON.stringify({
        targetRole: 'Frontend Developer',
        maxQuestions: 4
      })
    });
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.ok(json.data.sessionId);
    assert.ok(json.data.question);
    assert.ok(json.data.question.id);

    // Submit answer to the first question
    const answerRes = await fetch(`${baseUrl}/api/skills/adaptive/answer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`
      },
      body: JSON.stringify({
        sessionId: json.data.sessionId,
        questionId: json.data.question.id,
        selectedOptionIndex: 0
      })
    });
    assert.strictEqual(answerRes.status, 200);
    const answerJson = await answerRes.json();
    assert.strictEqual(answerJson.success, true);
    assert.ok(typeof answerJson.data.isCorrect === 'boolean');
  });

  it('4b. POST /api/candidates/evidence submits project repository evidence and updates canonical profile', async () => {
    const res = await fetch(`${baseUrl}/api/candidates/evidence`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`
      },
      body: JSON.stringify({
        title: 'Full-Stack E-Commerce Platform',
        description: 'Microservices architecture with Next.js, Express, and PostgreSQL',
        repositoryUrl: 'https://github.com/student/e-commerce-platform',
        liveDemoUrl: 'https://demo-ecommerce.vercel.app',
        skillsDemonstrated: ['HTML5 & Semantic Markup', 'React.js Architecture'],
        technologies: ['TypeScript', 'Node.js']
      })
    });
    assert.strictEqual(res.status, 201);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.ok(json.data.createdCount >= 2);

    // Verify canonical profile is updated with project evidence
    const profRes = await fetch(`${baseUrl}/api/skills/profile?targetRole=Frontend Developer`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    const profJson = await profRes.json();
    const htmlSkill = profJson.data.find(s => s.skillName === 'HTML5 & Semantic Markup');
    assert.ok(htmlSkill);
    assert.strictEqual(htmlSkill.evidenceStatus, 'PROVISIONAL');
    assert.ok(htmlSkill.evidenceCount >= 1);
  });

  it('5. POST /api/skills/challenges/:id/submit grades practical submission and updates profile', async () => {
    const listRes = await fetch(`${baseUrl}/api/skills/challenges`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert.strictEqual(listRes.status, 200);
    const listJson = await listRes.json();
    assert.ok(listJson.data.length > 0);

    const challenge = listJson.data[0];
    const submitRes = await fetch(`${baseUrl}/api/skills/challenges/${challenge.id}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`
      },
      body: JSON.stringify({
        submittedCode: challenge.starterCode
      })
    });
    assert.strictEqual(submitRes.status, 200);
    const submitJson = await submitRes.json();
    assert.strictEqual(submitJson.success, true);
    assert.ok(submitJson.data.submissionId);
    assert.ok(typeof submitJson.data.score === 'number');

    // Verify evidence is recorded in provenance
    const provRes = await fetch(`${baseUrl}/api/skills/provenance/${challenge.skill_id}`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert.strictEqual(provRes.status, 200);
    const provJson = await provRes.json();
    assert.strictEqual(provJson.success, true);
    assert.ok(provJson.data.length > 0);
  });

  it('6. GET /api/skills/recommendations provides prerequisite-aware learning tasks', async () => {
    const res = await fetch(`${baseUrl}/api/skills/recommendations?targetRole=Frontend Developer`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.ok(Array.isArray(json.data));
    assert.ok(json.data.length > 0);

    const topTask = json.data[0];
    assert.ok(topTask.skillName);
    assert.strictEqual(topTask.prerequisitesUnmet.length, 0, 'First recommended action must be unblocked');
    assert.ok(topTask.recommendedActivity);
    assert.ok(topTask.verificationCriteria);
  });

  it('7. Recruiter search and matching includes evidence coverage and non-automated hiring disclaimer', async () => {
    const res = await fetch(`${baseUrl}/api/candidates`, {
      headers: { Authorization: `Bearer ${recruiterToken}` }
    });
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.ok(json.candidates || json.data || Array.isArray(json));

    // Test explainable recruiter match calculation directly
    const match = matchingService.calculateJobMatch('usr-cand-1', 'job-1');
    assert.ok(match);
    assert.ok(typeof match.matchScore === 'number');
    assert.ok(typeof match.evidenceCoverage === 'number');
    assert.ok(['LOW', 'MEDIUM', 'HIGH'].includes(match.evidenceUncertainty));
    assert.ok(match.disclaimer.includes('not an automated hiring decision'));
  });
});
