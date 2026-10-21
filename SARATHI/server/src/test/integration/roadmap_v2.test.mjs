import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import app from '../../index.js';

describe('Roadmap V2 Robust Server-Side Progress and Undo Tests', () => {
  let server;
  let baseUrl;
  let token;
  const testEmail = `student_roadmap_${Date.now()}@example.com`;

  test.before(async () => {
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });

    // Register test student
    const regRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'Password123!',
        fullName: 'Roadmap Test Student',
        role: 'student'
      })
    });
    assert.ok(regRes.status === 200 || regRes.status === 201);
    const regBody = await regRes.json();
    token = regBody.data?.token || regBody.token;
  });

  test.after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  test('1. Initial roadmap fetch returns empty progress', async () => {
    const res = await fetch(`${baseUrl}/api/roadmap?trackKey=web-dev`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.trackKey, 'web-dev');
    assert.deepEqual(body.data.completedTaskIds, []);
    assert.deepEqual(body.data.taskProgress, {});
  });

  test('2. POST /api/roadmap/task marks task completed with self_reported type and timestamp', async () => {
    const res = await fetch(`${baseUrl}/api/roadmap/task`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        trackKey: 'web-dev',
        taskId: 'task-1-1',
        action: 'complete',
        completionType: 'self_reported'
      })
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.deepEqual(body.data.completedTaskIds, ['task-1-1']);
    const detail = body.data.taskProgress['task-1-1'];
    assert.ok(detail);
    assert.equal(detail.status, 'completed');
    assert.equal(detail.completionType, 'self_reported');
    assert.ok(detail.completedAt);
  });

  test('3. POST /api/roadmap/task undo reverts task completion', async () => {
    const res = await fetch(`${baseUrl}/api/roadmap/task`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        trackKey: 'web-dev',
        taskId: 'task-1-1',
        action: 'undo'
      })
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.deepEqual(body.data.completedTaskIds, []);
    assert.equal(body.data.taskProgress['task-1-1'].status, 'not_started');
  });

  test('4. Progress is isolated between tracks', async () => {
    // Complete in ML track
    const resML = await fetch(`${baseUrl}/api/roadmap/task`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        trackKey: 'machine-learning',
        taskId: 'task-ml-1-1',
        action: 'complete',
        completionType: 'self_reported'
      })
    });
    assert.equal(resML.status, 200);

    // Verify web-dev has not been affected
    const resWeb = await fetch(`${baseUrl}/api/roadmap?trackKey=web-dev`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const bodyWeb = await resWeb.json();
    assert.deepEqual(bodyWeb.data.completedTaskIds, []);

    // Verify ML has the task
    const resMLFetch = await fetch(`${baseUrl}/api/roadmap?trackKey=machine-learning`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const bodyML = await resMLFetch.json();
    assert.deepEqual(bodyML.data.completedTaskIds, ['task-ml-1-1']);
  });
});
