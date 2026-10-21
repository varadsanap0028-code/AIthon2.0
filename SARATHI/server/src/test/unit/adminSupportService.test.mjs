import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { initDb } from '../../config/db.js';
import { AdminSupportService, sanitizePlainText, calculateSlaDueAt } from '../../services/admin/adminSupportService.js';

describe('Phase 7: AdminSupportService Unit Tests', () => {
  let db;
  const adminId = 'usr-admin-seed';
  let student1Id;
  let student2Id;

  before(() => {
    db = initDb();
    const now = new Date().toISOString();
    student1Id = `usr-test-s1-${Date.now()}`;
    student2Id = `usr-test-s2-${Date.now()}`;

    db.prepare(`
      INSERT INTO users (id, email, password_hash, full_name, role, status, email_verified, created_at, updated_at)
      VALUES (?, ?, 'hash', 'Student One', 'candidate', 'active', 1, ?, ?);
    `).run(student1Id, `s1-${Date.now()}@sarathi.dev`, now, now);

    db.prepare(`
      INSERT INTO users (id, email, password_hash, full_name, role, status, email_verified, created_at, updated_at)
      VALUES (?, ?, 'hash', 'Student Two', 'candidate', 'active', 1, ?, ?);
    `).run(student2Id, `s2-${Date.now()}@sarathi.dev`, now, now);
  });

  after(() => {
    db.prepare('DELETE FROM support_messages WHERE sender_id IN (?, ?);').run(student1Id, student2Id);
    db.prepare('DELETE FROM support_tickets WHERE requester_id IN (?, ?);').run(student1Id, student2Id);
    db.prepare('DELETE FROM users WHERE id IN (?, ?);').run(student1Id, student2Id);
  });

  describe('Sanitization & SLA Calculation', () => {
    it('1. Strips HTML injection payloads and prevents XSS', () => {
      const malicious = '<img src=x onerror=alert(1)>Hello <b>World</b><script>fetch("/steal")</script>';
      const clean = sanitizePlainText(malicious);
      assert.equal(clean.includes('<img'), false);
      assert.equal(clean.includes('<script>'), false);
      assert.equal(clean.includes('alert(1)'), false);
      assert.equal(clean, 'Hello World');
    });

    it('2. Calculates SLA accurately based on priority', () => {
      const base = '2026-10-20T10:00:00.000Z';
      const normalDue = calculateSlaDueAt(base, 'normal');
      const urgentDue = calculateSlaDueAt(base, 'urgent');

      const normalHours = (new Date(normalDue).getTime() - new Date(base).getTime()) / (3600 * 1000);
      const urgentHours = (new Date(urgentDue).getTime() - new Date(base).getTime()) / (3600 * 1000);

      assert.equal(normalHours, 24);
      assert.equal(urgentHours, 4);
    });
  });

  describe('Ticket Lifecycle & Privacy Isolation', () => {
    let ticketId;

    it('3. User can create a ticket and retrieve it', () => {
      const ticket = AdminSupportService.createTicket({
        requesterId: student1Id,
        role: 'candidate',
        category: 'test',
        subject: 'Assessment Proctoring Issue',
        body: 'Camera disconnected during question 3.'
      });

      assert.ok(ticket);
      assert.equal(ticket.subject, 'Assessment Proctoring Issue');
      assert.equal(ticket.status, 'open');
      assert.equal(ticket.messages.length, 1);
      assert.equal(ticket.messages[0].body, 'Camera disconnected during question 3.');
      ticketId = ticket.id;
    });

    it('4. Other users cannot access tickets they do not own', () => {
      const unauthorized = AdminSupportService.getUserTicket(ticketId, student2Id);
      assert.equal(unauthorized, null);
    });

    it('5. Admin can post internal notes (hidden from user) and public replies (visible to user)', () => {
      // 1. Post internal note
      AdminSupportService.adminReplyTicket(ticketId, adminId, {
        body: 'Internal note: Candidate camera log shows momentary browser disconnect.',
        isInternalNote: true
      });

      // User view must NOT see the internal note
      const userView = AdminSupportService.getUserTicket(ticketId, student1Id);
      assert.equal(userView.messages.length, 1);
      assert.ok(!userView.messages.some(m => m.body.includes('Internal note')));

      // Admin view must see the internal note
      const adminView = AdminSupportService.getAdminTicketDetail(ticketId);
      assert.equal(adminView.messages.length, 2);
      assert.ok(adminView.messages.some(m => m.is_internal_note === 1));

      // 2. Post public reply
      AdminSupportService.adminReplyTicket(ticketId, adminId, {
        body: 'We have reviewed your session and verified the proctoring logs.',
        isInternalNote: false,
        setStatus: 'resolved'
      });

      // User view should now see 2 messages and ticket status is resolved
      const userView2 = AdminSupportService.getUserTicket(ticketId, student1Id);
      assert.equal(userView2.messages.length, 2);
      assert.equal(userView2.status, 'resolved');
    });

    it('6. User replying to a resolved ticket automatically reopens it', () => {
      const updated = AdminSupportService.userReplyTicket(
        ticketId,
        student1Id,
        'candidate',
        'Thank you! But can you also check question 4?'
      );

      assert.equal(updated.status, 'open');
      assert.equal(updated.messages.length, 3);
    });
  });

  describe('Announcements Audience & Dismissal', () => {
    let annId;

    it('7. Announcements match audience and can be dismissed per user', () => {
      const ann = AdminSupportService.createAnnouncement(adminId, {
        title: 'Platform Maintenance Notice',
        body: 'Scheduled maintenance will occur tonight at 2 AM UTC.',
        audience: 'student',
        severity: 'warning'
      });
      annId = ann.id;

      // Student 1 should see active announcement
      const studentAnnouncements = AdminSupportService.getActiveAnnouncementsForUser(student1Id, 'student');
      assert.ok(studentAnnouncements.some(a => a.id === annId));

      // Recruiter should NOT see student-targeted announcement
      const recruiterAnnouncements = AdminSupportService.getActiveAnnouncementsForUser('usr-recruiter', 'recruiter');
      assert.ok(!recruiterAnnouncements.some(a => a.id === annId));

      // Student 1 dismisses announcement
      AdminSupportService.dismissAnnouncement(annId, student1Id);

      // Student 1 should NO LONGER see it
      const studentAfterDismiss = AdminSupportService.getActiveAnnouncementsForUser(student1Id, 'student');
      assert.ok(!studentAfterDismiss.some(a => a.id === annId));

      // Student 2 should STILL see it
      const student2Announcements = AdminSupportService.getActiveAnnouncementsForUser(student2Id, 'student');
      assert.ok(student2Announcements.some(a => a.id === annId));
    });
  });
});
