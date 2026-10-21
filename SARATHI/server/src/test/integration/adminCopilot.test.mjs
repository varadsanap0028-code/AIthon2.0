/**
 * SARATHI Admin Portal — Phase 9: Admin Copilot Integration Tests
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { initDb } from '../../config/db.js';
import app from '../../index.js';
import { authService } from '../../services/authService.js';

describe('Phase 9: Admin Copilot Integration Tests', () => {
  let db;
  let serverInstance;
  let baseUrl;
  let adminToken;
  let otherAdminToken;
  let studentToken;
  let testAdminId;
  let otherAdminId;
  let testStudentId;

  let createdSessionId = null;
  let createdAssistantMsgId = null;

  before(async () => {
    db = initDb();
    const now = new Date().toISOString();
    const hash = await authService.hashPassword('Secret123456');

    testAdminId = `usr-test-cplt-adm1-${Date.now()}`;
    otherAdminId = `usr-test-cplt-adm2-${Date.now()}`;
    testStudentId = `usr-test-cplt-std-${Date.now()}`;

    db.prepare(`
      INSERT INTO users (id, email, password_hash, full_name, role, status, email_verified, created_at, updated_at)
      VALUES (?, ?, ?, 'Copilot Admin', 'platform_admin', 'active', 1, ?, ?);
    `).run(testAdminId, `admin-cplt1-${Date.now()}@sarathi.dev`, hash, now, now);

    db.prepare(`
      INSERT INTO users (id, email, password_hash, full_name, role, status, email_verified, created_at, updated_at)
      VALUES (?, ?, ?, 'Other Admin', 'platform_admin', 'active', 1, ?, ?);
    `).run(otherAdminId, `admin-cplt2-${Date.now()}@sarathi.dev`, hash, now, now);

    db.prepare(`
      INSERT INTO users (id, email, password_hash, full_name, role, status, email_verified, created_at, updated_at)
      VALUES (?, ?, ?, 'Copilot Student', 'student', 'active', 1, ?, ?);
    `).run(testStudentId, `std-cplt-${Date.now()}@sarathi.dev`, hash, now, now);

    const adminUser = db.prepare('SELECT * FROM users WHERE id = ?;').get(testAdminId);
    adminToken = authService.generateToken(adminUser);

    const otherUser = db.prepare('SELECT * FROM users WHERE id = ?;').get(otherAdminId);
    otherAdminToken = authService.generateToken(otherUser);

    const stdUser = db.prepare('SELECT * FROM users WHERE id = ?;').get(testStudentId);
    studentToken = authService.generateToken(stdUser);

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
      await new Promise((r) => serverInstance.close(r));
    }
    db.prepare('DELETE FROM admin_chat_sessions WHERE admin_id IN (?, ?);').run(testAdminId, otherAdminId);
    db.prepare('DELETE FROM notifications WHERE user_id IN (?, ?, ?);').run(testAdminId, otherAdminId, testStudentId);
    db.prepare('DELETE FROM users WHERE id IN (?, ?, ?);').run(testAdminId, otherAdminId, testStudentId);
  });

  it('1. Non-admin is rejected on /api/admin/copilot with 403', async () => {
    const res = await fetch(`${baseUrl}/api/admin/copilot/sessions`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert.equal(res.status, 403);
  });

  it('2. Admin initiates new chat session with query via POST /api/admin/copilot/sessions', async () => {
    const res = await fetch(`${baseUrl}/api/admin/copilot/sessions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: 'how many users joined this week' }),
    });
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.ok(body.sessionId);
    assert.ok(body.messageId);
    assert.ok(body.text);
    assert.ok(Array.isArray(body.blocks));
    assert.ok(Array.isArray(body.links));
    assert.equal(body.usedFallback, true);
    assert.ok(['kpi_summary', 'signups_trend'].includes(body.tool));

    createdSessionId = body.sessionId;
    createdAssistantMsgId = body.messageId;
  });

  it('3. Admin fetches session message history', async () => {
    const res = await fetch(`${baseUrl}/api/admin/copilot/sessions/${createdSessionId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.session.id, createdSessionId);
    assert.equal(body.messages.length, 2); // 1 user + 1 assistant
    assert.equal(body.messages[0].role, 'user');
    assert.equal(body.messages[1].role, 'assistant');
  });

  it('4. Admin sends second message in existing session', async () => {
    const res = await fetch(`${baseUrl}/api/admin/copilot/sessions/${createdSessionId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: 'what skills do we lack' }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.sessionId, createdSessionId);
    assert.equal(body.tool, 'skill_gap_market');
    assert.ok(body.blocks.some((b) => b.type === 'table'));
  });

  it('5. Admin submits feedback on message', async () => {
    const res = await fetch(`${baseUrl}/api/admin/copilot/messages/${createdAssistantMsgId}/feedback`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ value: 1, comment: 'Accurate KPI breakdown' }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
  });

  it('6. Admin session isolation: other admin cannot read created session', async () => {
    const res = await fetch(`${baseUrl}/api/admin/copilot/sessions/${createdSessionId}`, {
      headers: { Authorization: `Bearer ${otherAdminToken}` },
    });
    assert.equal(res.status, 404);
  });

  it('7. Admin deletes session and verifies deletion', async () => {
    const res = await fetch(`${baseUrl}/api/admin/copilot/sessions/${createdSessionId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res.status, 200);

    const getRes = await fetch(`${baseUrl}/api/admin/copilot/sessions/${createdSessionId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(getRes.status, 404);
  });
});
