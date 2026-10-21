import test, { describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import app from '../../index.js';
import { runMigrations } from '../../data/migrate.mjs';

describe('Enhanced Student Features: Learning Library, Skill Passport & Resumes', () => {
  let serverInstance;
  let baseUrl;
  let token;
  let candidateId;

  before(async () => {
    runMigrations();
    await new Promise((resolve) => {
      serverInstance = app.listen(0, '127.0.0.1', () => {
        const address = serverInstance.address();
        baseUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    });

    // Acquire session token for student
    const regRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `student_enh_${Date.now()}@test.sarathi.ai`,
        password: 'Password123!',
        fullName: 'Test Enhancement Student',
        role: 'student',
      }),
    });
    assert.equal(regRes.status, 200);
    const body = await regRes.json();
    token = body.token;
    candidateId = body.user.id;
    assert.ok(token);
  });

  after(async () => {
    if (serverInstance) {
      await new Promise((resolve) => serverInstance.close(resolve));
    }
  });

  test('1. GET /api/resources/recommendations returns personalized resource recommendations', async () => {
    const res = await fetch(`${baseUrl}/api/resources/recommendations?targetRole=Full-Stack%20Developer`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(Array.isArray(body.data));
    assert.ok(body.data.length > 0);

    const recommended = body.data.filter(r => r.isRecommended);
    assert.ok(recommended.length > 0);
    assert.ok(recommended[0].recommendationReason);
    assert.ok(recommended[0].learningObjectives);
  });

  test('2. Candidate can update resource progress with percentage and milestones', async () => {
    const listRes = await fetch(`${baseUrl}/api/resources`);
    const listBody = await listRes.json();
    const resourceId = listBody.data[0].id;

    // Update to 75% in progress with notes
    const updateRes = await fetch(`${baseUrl}/api/resources/${resourceId}/progress`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        status: 'in_progress',
        percentComplete: 75,
        notes: 'Completed chapters 1 through 4.',
      }),
    });
    assert.equal(updateRes.status, 200);
    const updateBody = await updateRes.json();
    assert.equal(updateBody.data.percentComplete, 75);
    assert.equal(updateBody.data.status, 'in_progress');

    // Retrieve via user authenticated list
    const authListRes = await fetch(`${baseUrl}/api/resources?status=in_progress`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const authListBody = await authListRes.json();
    const found = authListBody.data.find(r => r.id === resourceId);
    assert.ok(found);
    assert.equal(found.percentComplete, 75);
    assert.equal(found.progressNotes, 'Completed chapters 1 through 4.');
  });

  test('3. Candidate can add completed learning resource to Skill Passport as learning evidence', async () => {
    const listRes = await fetch(`${baseUrl}/api/resources`);
    const listBody = await listRes.json();
    const resourceId = listBody.data[0].id;

    const addRes = await fetch(`${baseUrl}/api/resources/${resourceId}/add-to-passport`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(addRes.status, 200);
    const addBody = await addRes.json();
    assert.equal(addBody.success, true);
    assert.ok(addBody.data.createdCount > 0);

    // Verify it appears in candidate passport evidence
    const passRes = await fetch(`${baseUrl}/api/candidates/my-passport`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const passBody = await passRes.json();
    assert.equal(passBody.success, true);
    const evidenceItem = passBody.data.evidence.find(e => e.evidence_type === 'course');
    assert.ok(evidenceItem);
    assert.equal(evidenceItem.verification_status, 'self_reported');
  });

  test('4. Candidate can manage Passport sharing privacy settings and regenerate link', async () => {
    // Get share config
    const getRes = await fetch(`${baseUrl}/api/passport/share`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(getRes.status, 200);
    const getBody = await getRes.json();
    assert.equal(getBody.success, true);
    const oldPublicId = getBody.data.publicId;

    // Update privacy: includeSkills = true, includeContact = false
    const configRes = await fetch(`${baseUrl}/api/passport/share/config`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        sectionsConfig: {
          includeSkills: true,
          includeProjects: true,
          includeContact: false,
          includeAssessments: false,
        },
      }),
    });
    assert.equal(configRes.status, 200);
    const configBody = await configRes.json();
    assert.equal(configBody.data.sectionsConfig.includeContact, false);

    // Public view hides contact info
    const publicRes = await fetch(`${baseUrl}/api/passport/public/${oldPublicId}`);
    assert.equal(publicRes.status, 200);
    const publicBody = await publicRes.json();
    assert.equal(publicBody.data.candidate.email, null);
    assert.equal(publicBody.data.assessments.length, 0);

    // Regenerate link revokes old one
    const regenRes = await fetch(`${baseUrl}/api/passport/share/regenerate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(regenRes.status, 200);
    const regenBody = await regenRes.json();
    const newPublicId = regenBody.data.publicId;
    assert.notEqual(newPublicId, oldPublicId);

    // Old public ID is now 404
    const oldCheck = await fetch(`${baseUrl}/api/passport/public/${oldPublicId}`);
    assert.equal(oldCheck.status, 404);

    // New public ID works
    const newCheck = await fetch(`${baseUrl}/api/passport/public/${newPublicId}`);
    assert.equal(newCheck.status, 200);
  });

  test('5. Candidate can compile factual resume, save drafts, and switch versions', async () => {
    // Compile resume
    const compileRes = await fetch(`${baseUrl}/api/resumes/compile?targetRole=Full-Stack%20Developer`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(compileRes.status, 200);
    const compileBody = await compileRes.json();
    assert.equal(compileBody.success, true);
    assert.ok(compileBody.data.personalInfo);
    assert.equal(compileBody.data.personalInfo.fullName, 'Test Enhancement Student');

    // Create a saved draft
    const createRes = await fetch(`${baseUrl}/api/resumes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        title: 'Full-Stack Developer Resume v1',
        targetRole: 'Full-Stack Developer',
        templateId: 'technical',
        sectionsConfig: { summary: true, skills: true, projects: true, education: true },
        customContent: { summary: 'Specialized in TypeScript and scalable backends.' },
        isDefault: true,
      }),
    });
    assert.equal(createRes.status, 201);
    const createBody = await createRes.json();
    const resumeId = createBody.data.id;
    assert.ok(resumeId);

    // List resumes
    const listRes = await fetch(`${baseUrl}/api/resumes`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const listBody = await listRes.json();
    assert.equal(listBody.data.length, 1);
    assert.equal(listBody.data[0].id, resumeId);

    // Update draft
    const updateRes = await fetch(`${baseUrl}/api/resumes/${resumeId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        title: 'Full-Stack Developer Resume (ATS Tailored)',
        templateId: 'modern-ats',
      }),
    });
    assert.equal(updateRes.status, 200);
    const updateBody = await updateRes.json();
    assert.equal(updateBody.data.title, 'Full-Stack Developer Resume (ATS Tailored)');
    assert.equal(updateBody.data.templateId, 'modern-ats');

    // Delete draft
    const deleteRes = await fetch(`${baseUrl}/api/resumes/${resumeId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(deleteRes.status, 200);

    const emptyListRes = await fetch(`${baseUrl}/api/resumes`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const emptyListBody = await emptyListRes.json();
    assert.equal(emptyListBody.data.length, 0);
  });
});
