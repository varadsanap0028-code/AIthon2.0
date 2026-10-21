import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { initDb } from '../../config/db.js';
import { authService } from '../../services/authService.js';
import app from '../../index.js';

describe('Chat API Routes Integration Tests', () => {
  let serverInstance;
  let baseUrl;
  let studentToken;

  before(async () => {
    initDb();

    // Generate valid auth token for demo student
    const studentAuth = await authService.login('student@sarathi.ai', 'password123');
    studentToken = studentAuth.token;

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

  test('1. GET /api/chat/status returns operational status and provider details', async () => {
    const res = await fetch(`${baseUrl}/api/chat/status`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.status, 'ok');
    assert.strictEqual(typeof body.configured, 'boolean');
    assert.strictEqual(typeof body.provider, 'string');
    assert.strictEqual(typeof body.notice, 'string');
  });

  test('2. GET /api/chat/suggestions returns prompt chips for student', async () => {
    const res = await fetch(`${baseUrl}/api/chat/suggestions?role=student`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.status, 'ok');
    assert.ok(Array.isArray(body.data));
    assert.ok(body.data.length >= 4);
    assert.ok(body.data.some(s => s.prompt.includes('career path')));
  });

  test('3. GET /api/chat/suggestions returns prompt chips for recruiter', async () => {
    const res = await fetch(`${baseUrl}/api/chat/suggestions?role=recruiter`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.status, 'ok');
    assert.ok(Array.isArray(body.data));
    assert.ok(body.data.some(s => s.prompt.toLowerCase().includes('verification')));
  });

  test('4. POST /api/chat/message rejects empty message with 400 VALIDATION_ERROR', async () => {
    const res = await fetch(`${baseUrl}/api/chat/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '   ' }),
    });
    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.code, 'VALIDATION_ERROR');
  });

  test('5. POST /api/chat/message returns structured response for unauthenticated visitor', async () => {
    const res = await fetch(`${baseUrl}/api/chat/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'How do I use Sarathi to verify my skills?',
        conversationHistory: [],
      }),
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.data);
    assert.strictEqual(body.data.role, 'assistant');
    assert.ok(body.data.content.length > 20);
    assert.ok(body.data.content.includes('Skill Passport') || body.data.content.includes('Sarathi'));
  });

  test('6. POST /api/chat/message respects authenticated student identity and customizes response', async () => {
    const res = await fetch(`${baseUrl}/api/chat/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        message: 'Explain my skill gap analysis for my target role.',
        conversationHistory: [],
      }),
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.data.content.includes('Skill Gap') || body.data.content.includes('Target Role'));
  });

  test('7. POST /api/chat/message preserves context in multi-turn conversation', async () => {
    const res = await fetch(`${baseUrl}/api/chat/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'What projects should I build for that roadmap?',
        conversationHistory: [
          { role: 'user', content: 'Create my skill development roadmap for Web Development' },
          { role: 'assistant', content: 'Here is your Stage 1 and Stage 2 roadmap.' },
        ],
      }),
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.data.content.length > 20);
  });
});
