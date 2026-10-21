import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { initDb } from '../../config/db.js';
import app from '../../index.js';
import { authService } from '../../services/authService.js';

describe('Phase 7: Support Desk & Announcements Integration Tests', () => {
  let db;
  let serverInstance;
  let baseUrl;
  let adminToken;
  let studentToken;
  let otherStudentToken;
  let testAdminId;
  let studentId;
  let otherStudentId;

  before(async () => {
    db = initDb();
    const now = new Date().toISOString();
    const hash = await authService.hashPassword('Secret123456');

    testAdminId = `usr-test-sup-admin-${Date.now()}`;
    studentId = `usr-test-sup-std-${Date.now()}`;
    otherStudentId = `usr-test-sup-oth-${Date.now()}`;

    db.prepare(`
      INSERT INTO users (id, email, password_hash, full_name, role, status, email_verified, created_at, updated_at)
      VALUES (?, ?, ?, 'Support Admin', 'platform_admin', 'active', 1, ?, ?);
    `).run(testAdminId, `admin-sup-${Date.now()}@sarathi.dev`, hash, now, now);

    db.prepare(`
      INSERT INTO users (id, email, password_hash, full_name, role, status, email_verified, created_at, updated_at)
      VALUES (?, ?, ?, 'Support Student', 'candidate', 'active', 1, ?, ?);
    `).run(studentId, `std-sup-${Date.now()}@sarathi.dev`, hash, now, now);

    db.prepare(`
      INSERT INTO users (id, email, password_hash, full_name, role, status, email_verified, created_at, updated_at)
      VALUES (?, ?, ?, 'Other Student', 'candidate', 'active', 1, ?, ?);
    `).run(otherStudentId, `oth-sup-${Date.now()}@sarathi.dev`, hash, now, now);

    const adminUser = db.prepare('SELECT * FROM users WHERE id = ?;').get(testAdminId);
    adminToken = authService.generateToken(adminUser);

    const stdUser = db.prepare('SELECT * FROM users WHERE id = ?;').get(studentId);
    studentToken = authService.generateToken(stdUser);

    const othUser = db.prepare('SELECT * FROM users WHERE id = ?;').get(otherStudentId);
    otherStudentToken = authService.generateToken(othUser);

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
      await new Promise(r => serverInstance.close(r));
    }
    db.prepare('DELETE FROM announcement_dismissals WHERE user_id IN (?, ?);').run(studentId, otherStudentId);
    db.prepare('DELETE FROM announcements WHERE created_by = ?;').run(testAdminId);
    db.prepare('DELETE FROM notifications WHERE user_id IN (?, ?);').run(studentId, otherStudentId);
    db.prepare('DELETE FROM support_messages WHERE sender_id IN (?, ?, ?);').run(testAdminId, studentId, otherStudentId);
    db.prepare('DELETE FROM support_tickets WHERE requester_id IN (?, ?);').run(studentId, otherStudentId);
    db.prepare('DELETE FROM admin_audit_log WHERE admin_id = ?;').run(testAdminId);
    db.prepare('DELETE FROM users WHERE id IN (?, ?, ?);').run(testAdminId, studentId, otherStudentId);
  });

  it('1. Non-admin is rejected on /api/admin/support with 403', async () => {
    const res = await fetch(`${baseUrl}/api/admin/support/tickets`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert.equal(res.status, 403);
  });

  let createdTicketId;

  it('2. User creates a support ticket via POST /api/support/tickets', async () => {
    const res = await fetch(`${baseUrl}/api/support/tickets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`
      },
      body: JSON.stringify({
        category: 'bug',
        subject: 'Cannot save candidate profile headline',
        body: 'Clicking save button causes a spinner to spin indefinitely.',
        priority: 'high'
      })
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.ok(body.ticket);
    assert.equal(body.ticket.subject, 'Cannot save candidate profile headline');
    assert.equal(body.ticket.status, 'open');
    createdTicketId = body.ticket.id;
  });

  it('3. Other student cannot read the created ticket (returns 404/unauthorized)', async () => {
    const res = await fetch(`${baseUrl}/api/support/tickets/${createdTicketId}`, {
      headers: { Authorization: `Bearer ${otherStudentToken}` }
    });
    assert.equal(res.status, 404);
  });

  it('4. Admin lists tickets, writes internal note & reply, and verifies isolation', async () => {
    // Admin list
    const listRes = await fetch(`${baseUrl}/api/admin/support/tickets`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.equal(listRes.status, 200);
    const listBody = await listRes.json();
    assert.ok(listBody.tickets.some(t => t.id === createdTicketId));

    // Admin internal note
    const noteRes = await fetch(`${baseUrl}/api/admin/support/tickets/${createdTicketId}/reply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        body: 'Internal note: Reproducing profile headline save issue with Chrome devtools.',
        isInternalNote: true
      })
    });
    assert.equal(noteRes.status, 200);

    // Student should NOT see internal note
    const stdViewRes1 = await fetch(`${baseUrl}/api/support/tickets/${createdTicketId}`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert.equal(stdViewRes1.status, 200);
    const stdBody1 = await stdViewRes1.json();
    assert.equal(stdBody1.ticket.messages.length, 1);
    assert.ok(!stdBody1.ticket.messages.some(m => m.body.includes('Internal note')));

    // Admin public reply
    const replyRes = await fetch(`${baseUrl}/api/admin/support/tickets/${createdTicketId}/reply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        body: 'We have deployed a hotfix for profile headline updates. Please refresh and retry.',
        isInternalNote: false,
        setStatus: 'resolved'
      })
    });
    assert.equal(replyRes.status, 200);

    // Student now sees public reply
    const stdViewRes2 = await fetch(`${baseUrl}/api/support/tickets/${createdTicketId}`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert.equal(stdViewRes2.status, 200);
    const stdBody2 = await stdViewRes2.json();
    assert.equal(stdBody2.ticket.messages.length, 2);
    assert.equal(stdBody2.ticket.status, 'resolved');
  });

  it('5. Announcements: Admin creates announcement, student views & dismisses', async () => {
    // Admin creates announcement
    const createRes = await fetch(`${baseUrl}/api/admin/support/announcements`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        title: 'Platform System Update',
        body: 'New coding playground features are now live for all candidates!',
        audience: 'all',
        severity: 'info'
      })
    });
    assert.equal(createRes.status, 201);
    const createBody = await createRes.json();
    const annId = createBody.announcement.id;

    // Student checks active announcements
    const activeRes = await fetch(`${baseUrl}/api/announcements/active`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert.equal(activeRes.status, 200);
    const activeBody = await activeRes.json();
    assert.ok(activeBody.announcements.some(a => a.id === annId));

    // Student dismisses
    const disRes = await fetch(`${baseUrl}/api/announcements/${annId}/dismiss`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert.equal(disRes.status, 200);

    // Student should no longer see it
    const activeResAfter = await fetch(`${baseUrl}/api/announcements/active`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    const activeBodyAfter = await activeResAfter.json();
    assert.ok(!activeBodyAfter.announcements.some(a => a.id === annId));
  });
});
