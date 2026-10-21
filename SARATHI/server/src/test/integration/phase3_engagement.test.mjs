import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { initDb } from '../../config/db.js';
import app from '../../index.js';

describe('Phase 3: Student Engagement Integration Tests', () => {
  let serverInstance;
  let baseUrl;
  const testCandidateEmail = `p3-candidate-${Date.now()}@sarathi.test`;
  const password = 'studentPassword123!';
  let token = null;

  before(async () => {
    initDb();
    await new Promise((resolve) => {
      serverInstance = app.listen(0, '127.0.0.1', () => {
        const port = serverInstance.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });

    const regRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testCandidateEmail,
        password,
        fullName: 'Phase3 Student',
        role: 'student',
      }),
    });
    assert.equal(regRes.status, 200);
    const body = await regRes.json();
    token = body.token;
    assert.ok(token);
  });

  after(async () => {
    if (serverInstance) {
      await new Promise((resolve) => serverInstance.close(resolve));
    }
  });

  test('1. GET /api/resources returns seeded learning resources', async () => {
    const res = await fetch(`${baseUrl}/api/resources`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(Array.isArray(body.data));
    assert.ok(body.data.length >= 8);

    const first = body.data[0];
    assert.ok(first.id);
    assert.ok(first.title);
    assert.ok(first.url);
    assert.ok(Array.isArray(first.skillTags));
  });

  test('2. Candidate can filter resources and toggle bookmark', async () => {
    // Filter by free
    const freeRes = await fetch(`${baseUrl}/api/resources?isFree=true`);
    const freeBody = await freeRes.json();
    assert.ok(freeBody.data.every((r) => r.isFree === true));

    // Toggle bookmark on first resource
    const resourceId = freeBody.data[0].id;
    const bmRes1 = await fetch(`${baseUrl}/api/resources/${resourceId}/bookmark`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(bmRes1.status, 200);
    const bmBody1 = await bmRes1.json();
    assert.equal(bmBody1.data.bookmarked, true);

    // List resources with user auth: resource is marked bookmarked
    const authListRes = await fetch(`${baseUrl}/api/resources?bookmarkedOnly=true`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const authListBody = await authListRes.json();
    assert.equal(authListBody.data.length, 1);
    assert.equal(authListBody.data[0].id, resourceId);
    assert.equal(authListBody.data[0].isBookmarked, true);

    // Toggle bookmark off
    const bmRes2 = await fetch(`${baseUrl}/api/resources/${resourceId}/bookmark`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(bmRes2.status, 200);
    const bmBody2 = await bmRes2.json();
    assert.equal(bmBody2.data.bookmarked, false);
  });

  test('3. Candidate can track resource progress (in_progress, completed)', async () => {
    const resourceId = 'res-react-1';
    const progRes = await fetch(`${baseUrl}/api/resources/${resourceId}/progress`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status: 'completed' }),
    });

    assert.equal(progRes.status, 200);
    const progBody = await progRes.json();
    assert.equal(progBody.data.status, 'completed');

    // Verify when listing resources for authenticated user
    const listRes = await fetch(`${baseUrl}/api/resources`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const listBody = await listRes.json();
    const reactRes = listBody.data.find((r) => r.id === resourceId);
    assert.ok(reactRes);
    assert.equal(reactRes.progressStatus, 'completed');
  });

  test('4. Notifications are retrieved, marked read individually, and in bulk', async () => {
    // Initial fetch returns onboarding notifications
    const notifRes1 = await fetch(`${baseUrl}/api/notifications`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(notifRes1.status, 200);
    const notifBody1 = await notifRes1.json();
    assert.ok(notifBody1.data.length >= 2);
    assert.ok(notifBody1.unreadCount >= 2);

    const firstNotifId = notifBody1.data[0].id;

    // Mark single notification as read
    const readSingleRes = await fetch(`${baseUrl}/api/notifications/${firstNotifId}/read`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(readSingleRes.status, 200);

    // Verify unread count decreased
    const notifRes2 = await fetch(`${baseUrl}/api/notifications`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const notifBody2 = await notifRes2.json();
    assert.equal(notifBody2.unreadCount, notifBody1.unreadCount - 1);

    // Mark all as read
    const markAllRes = await fetch(`${baseUrl}/api/notifications/read-all`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(markAllRes.status, 200);

    // Verify all marked as read
    const notifRes3 = await fetch(`${baseUrl}/api/notifications`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const notifBody3 = await notifRes3.json();
    assert.equal(notifBody3.unreadCount, 0);
  });

  test('5. Candidate can submit feedback with category validation', async () => {
    // Rejects too short feedback
    const failRes = await fetch(`${baseUrl}/api/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category: 'bug', message: 'bad' }),
    });
    assert.equal(failRes.status, 400);

    // Valid feedback succeeds
    const successRes = await fetch(`${baseUrl}/api/feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        category: 'feature_request',
        message: 'It would be amazing to have real-time collaborative coding assessments!',
      }),
    });
    assert.equal(successRes.status, 201);
    const successBody = await successRes.json();
    assert.equal(successBody.success, true);
    assert.ok(successBody.data.id);
  });

  test('6. Public Skill Passport share link can be generated, toggled, and viewed publicly', async () => {
    // Get or create share link configuration
    const shareRes1 = await fetch(`${baseUrl}/api/passport/share`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(shareRes1.status, 200);
    const shareBody1 = await shareRes1.json();
    assert.ok(shareBody1.data.publicId);
    assert.equal(shareBody1.data.isPublic, true);
    const publicId = shareBody1.data.publicId;

    // View public passport without any authorization header
    const publicViewRes = await fetch(`${baseUrl}/api/passport/public/${publicId}`);
    assert.equal(publicViewRes.status, 200);
    const publicViewBody = await publicViewRes.json();
    assert.equal(publicViewBody.success, true);
    assert.equal(publicViewBody.data.candidate.full_name, 'Phase3 Student');
    assert.ok(Array.isArray(publicViewBody.data.skills));

    // Toggle public sharing off
    const toggleOffRes = await fetch(`${baseUrl}/api/passport/share/toggle`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ isPublic: false }),
    });
    assert.equal(toggleOffRes.status, 200);
    const toggleOffBody = await toggleOffRes.json();
    assert.equal(toggleOffBody.data.isPublic, false);

    // Accessing private passport via public endpoint now returns 404
    const privateViewRes = await fetch(`${baseUrl}/api/passport/public/${publicId}`);
    assert.equal(privateViewRes.status, 404);

    // Re-enable public sharing
    const toggleOnRes = await fetch(`${baseUrl}/api/passport/share/toggle`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ isPublic: true }),
    });
    assert.equal(toggleOnRes.status, 200);
  });
});
