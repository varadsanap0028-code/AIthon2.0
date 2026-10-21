import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { initDb } from '../../config/db.js';
import app from '../../index.js';
import { repository } from '../../data/repository.js';

describe('Phase 2: Student Portal Persistence Integration Tests', () => {
  let serverInstance;
  let baseUrl;
  const testCandidateEmail = `p2-candidate-${Date.now()}@sarathi.test`;
  const initialPassword = 'oldSecretPass123!';
  let token = null;
  let candidateUser = null;

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

  test('0. Prepares test candidate and acquires JWT token', async () => {
    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testCandidateEmail,
        password: initialPassword,
        fullName: 'Phase2 Candidate',
        role: 'student'
      }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    token = body.token;
    assert.ok(token);
    candidateUser = body.user;
    assert.ok(candidateUser.id);
  });

  test('1. Candidate can fetch their initial profile via GET /api/candidates/profile', async () => {
    const res = await fetch(`${baseUrl}/api/candidates/profile`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.email, testCandidateEmail.toLowerCase());
    assert.equal(body.data.fullName, 'Phase2 Candidate');
  });

  test('2. Candidate can update their profile with extended fields via PUT /api/candidates/profile', async () => {
    const updatePayload = {
      fullName: 'Updated Phase2 Candidate',
      institution: 'Sarathi Institute of Technology',
      targetRole: 'Full Stack Engineer',
      headline: 'Passionate Developer',
      bio: 'Building reliable and scalable distributed systems.',
      experienceYears: 2,
      location: 'Bangalore, India',
      workPreference: 'hybrid',
      githubUrl: 'https://github.com/phase2dev',
      linkedinUrl: 'https://linkedin.com/in/phase2dev',
      portfolioUrl: 'https://phase2dev.me',
      resumeUrl: 'https://sarathi.ai/resumes/phase2dev.pdf',
      degree: 'B.Tech Computer Science',
      graduationYear: 2025,
    };

    const res = await fetch(`${baseUrl}/api/candidates/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(updatePayload),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.fullName, 'Updated Phase2 Candidate');
    assert.equal(body.data.institution, 'Sarathi Institute of Technology');
    assert.equal(body.data.githubUrl, 'https://github.com/phase2dev');
    assert.equal(body.data.linkedinUrl, 'https://linkedin.com/in/phase2dev');
    assert.equal(body.data.resumeUrl, 'https://sarathi.ai/resumes/phase2dev.pdf');
    assert.equal(body.data.degree, 'B.Tech Computer Science');
    assert.equal(body.data.graduationYear, 2025);

    // Verify persisted directly in SQLite database
    const userRow = repository.queryOne('SELECT full_name, institution FROM users WHERE id = ?;', [candidateUser.id]);
    assert.equal(userRow.full_name, 'Updated Phase2 Candidate');
    assert.equal(userRow.institution, 'Sarathi Institute of Technology');

    const profileRow = repository.queryOne('SELECT * FROM candidate_profiles WHERE id = ?;', [candidateUser.id]);
    assert.equal(profileRow.github_url, 'https://github.com/phase2dev');
    assert.equal(profileRow.linkedin_url, 'https://linkedin.com/in/phase2dev');
    assert.equal(profileRow.resume_url, 'https://sarathi.ai/resumes/phase2dev.pdf');
    assert.equal(profileRow.degree, 'B.Tech Computer Science');
    assert.equal(profileRow.graduation_year, 2025);
  });

  test('3. PUT /api/candidates/profile validates URLs with Zod', async () => {
    const res = await fetch(`${baseUrl}/api/candidates/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        githubUrl: 'not-a-valid-url',
      }),
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.ok(body.error);
  });

  test('4. Candidate can save and retrieve roadmap progress', async () => {
    // Initially empty
    const getRes1 = await fetch(`${baseUrl}/api/roadmap?trackKey=frontend`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    assert.equal(getRes1.status, 200);
    const getBody1 = await getRes1.json();
    assert.deepEqual(getBody1.data.completedTaskIds, []);

    // Save completed tasks
    const putRes = await fetch(`${baseUrl}/api/roadmap`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        trackKey: 'frontend',
        completedTaskIds: ['fe-task-1', 'fe-task-2', 'fe-task-3'],
      }),
    });

    assert.equal(putRes.status, 200);
    const putBody = await putRes.json();
    assert.equal(putBody.success, true);
    assert.deepEqual(putBody.data.completedTaskIds, ['fe-task-1', 'fe-task-2', 'fe-task-3']);

    // Retrieve again
    const getRes2 = await fetch(`${baseUrl}/api/roadmap?trackKey=frontend`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    assert.equal(getRes2.status, 200);
    const getBody2 = await getRes2.json();
    assert.deepEqual(getBody2.data.completedTaskIds, ['fe-task-1', 'fe-task-2', 'fe-task-3']);

    // Check all tracks map
    const getAllRes = await fetch(`${baseUrl}/api/roadmap`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    assert.equal(getAllRes.status, 200);
    const getAllBody = await getAllRes.json();
    assert.deepEqual(getAllBody.data.frontend, ['fe-task-1', 'fe-task-2', 'fe-task-3']);
  });

  test('5. Candidate can retrieve and update settings', async () => {
    // Initial fetch creates default settings
    const getRes1 = await fetch(`${baseUrl}/api/settings`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    assert.equal(getRes1.status, 200);
    const getBody1 = await getRes1.json();
    assert.equal(getBody1.data.emailDigest, true);
    assert.equal(getBody1.data.roadmapReminders, true);
    assert.equal(getBody1.data.jobAlerts, true);

    // Update settings
    const putRes = await fetch(`${baseUrl}/api/settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        emailDigest: false,
        jobAlerts: false,
      }),
    });

    assert.equal(putRes.status, 200);
    const putBody = await putRes.json();
    assert.equal(putBody.data.emailDigest, false);
    assert.equal(putBody.data.roadmapReminders, true);
    assert.equal(putBody.data.jobAlerts, false);

    // Re-verify fetch
    const getRes2 = await fetch(`${baseUrl}/api/settings`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    assert.equal(getRes2.status, 200);
    const getBody2 = await getRes2.json();
    assert.equal(getBody2.data.emailDigest, false);
    assert.equal(getBody2.data.jobAlerts, false);
  });

  test('6. Candidate can change password and log in with new password', async () => {
    const newPassword = 'newPassword456!';

    // Wrong current password fails
    const failRes = await fetch(`${baseUrl}/api/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        currentPassword: 'wrongPassword!',
        newPassword,
      }),
    });

    assert.equal(failRes.status, 400);

    // Valid change password succeeds
    const changeRes = await fetch(`${baseUrl}/api/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        currentPassword: initialPassword,
        newPassword,
      }),
    });

    assert.equal(changeRes.status, 200);
    const changeBody = await changeRes.json();
    assert.equal(changeBody.success, true);

    // Old password no longer works
    const oldLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testCandidateEmail,
        password: initialPassword,
      }),
    });

    assert.ok(oldLoginRes.status === 400 || oldLoginRes.status === 401);

    // New password works
    const newLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testCandidateEmail,
        password: newPassword,
      }),
    });

    assert.equal(newLoginRes.status, 200);
    const newLoginBody = await newLoginRes.json();
    assert.ok(newLoginBody.token);
  });

  test('7. Password reset flow creates token and allows resetting password', async () => {
    // Request reset token
    const forgotRes = await fetch(`${baseUrl}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testCandidateEmail,
      }),
    });

    assert.equal(forgotRes.status, 200);
    const forgotBody = await forgotRes.json();
    assert.equal(forgotBody.success, true);
    const resetToken = forgotBody.resetToken;
    assert.ok(resetToken);

    // Reset password with token
    const brandNewPassword = 'resetPassword789!';
    const resetRes = await fetch(`${baseUrl}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: resetToken,
        newPassword: brandNewPassword,
      }),
    });

    assert.equal(resetRes.status, 200);
    const resetBody = await resetRes.json();
    assert.equal(resetBody.success, true);

    // Log in with brand new password
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testCandidateEmail,
        password: brandNewPassword,
      }),
    });

    assert.equal(loginRes.status, 200);
    const loginBody = await loginRes.json();
    assert.ok(loginBody.token);

    // Token cannot be reused
    const reuseRes = await fetch(`${baseUrl}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: resetToken,
        newPassword: 'anotherPassword!',
      }),
    });

    assert.equal(reuseRes.status, 400);
  });
});
