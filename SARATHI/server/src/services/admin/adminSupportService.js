import { initDb } from '../../config/db.js';
import { v4 as uuidv4 } from 'uuid';
import { logAdminAction } from './adminAuditService.js';
import { notificationService } from '../notificationService.js';

/**
 * Strips HTML tags and sanitizes input text to plain text.
 */
export function sanitizePlainText(text) {
  if (typeof text !== 'string') return '';
  return text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]*>/g, '') // Strip remaining HTML tags
    .trim();
}

/**
 * Computes first response SLA due date based on priority.
 */
export function calculateSlaDueAt(createdAtDate, priority = 'normal') {
  const base = new Date(createdAtDate).getTime();
  const hours = priority === 'urgent' ? 4 : priority === 'high' ? 12 : 24;
  return new Date(base + hours * 3600 * 1000).toISOString();
}

export class AdminSupportService {
  // =================== USER ENDPOINTS ===================
  static createTicket({ requesterId, role, category, subject, body, priority = 'normal' }) {
    if (!requesterId) throw new Error('Requester ID is required');
    if (!category || !['account', 'approval', 'test', 'bug', 'other'].includes(category)) {
      throw new Error('Valid category is required (account, approval, test, bug, other)');
    }
    const cleanSubject = sanitizePlainText(subject);
    const cleanBody = sanitizePlainText(body);

    if (!cleanSubject || cleanSubject.length > 120) {
      throw new Error('Subject must be between 1 and 120 characters');
    }
    if (!cleanBody || cleanBody.length > 5000) {
      throw new Error('Message body must be between 1 and 5000 characters');
    }

    const db = initDb();
    const now = new Date().toISOString();

    // Rate limit: 10 tickets per day
    const oneDayAgo = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const dailyCount = db.prepare(`
      SELECT COUNT(*) as cnt FROM support_tickets
      WHERE requester_id = ? AND created_at >= ?;
    `).get(requesterId, oneDayAgo)?.cnt || 0;

    if (dailyCount >= 10) {
      const err = new Error('Daily ticket limit reached (max 10 new tickets per 24 hours)');
      err.status = 429;
      throw err;
    }

    const ticketId = `tkt-${uuidv4().slice(0, 8)}`;
    const messageId = `msg-${uuidv4().slice(0, 8)}`;
    const slaDueAt = calculateSlaDueAt(now, priority);

    db.exec('BEGIN IMMEDIATE;');
    try {
      db.prepare(`
        INSERT INTO support_tickets (
          id, requester_id, category, subject, status, priority,
          assigned_to, first_response_at, resolved_at, sla_due_at,
          created_at, updated_at, last_message_at
        ) VALUES (?, ?, ?, ?, 'open', ?, NULL, NULL, NULL, ?, ?, ?, ?);
      `).run(ticketId, requesterId, category, cleanSubject, priority, slaDueAt, now, now, now);

      db.prepare(`
        INSERT INTO support_messages (
          id, ticket_id, sender_id, sender_role, body, is_internal_note, created_at
        ) VALUES (?, ?, ?, ?, ?, 0, ?);
      `).run(messageId, ticketId, requesterId, role || 'candidate', cleanBody, now);

      db.exec('COMMIT;');
      return this.getUserTicket(ticketId, requesterId);
    } catch (err) {
      db.exec('ROLLBACK;');
      throw err;
    }
  }

  static listUserTickets(requesterId) {
    const db = initDb();
    const tickets = db.prepare(`
      SELECT t.*,
             (SELECT COUNT(*) FROM support_messages m WHERE m.ticket_id = t.id AND m.is_internal_note = 0) as message_count
      FROM support_tickets t
      WHERE t.requester_id = ?
      ORDER BY t.last_message_at DESC;
    `).all(requesterId);

    return tickets.map(t => ({
      ...t,
      slaBreached: !t.first_response_at && new Date() > new Date(t.sla_due_at)
    }));
  }

  static getUserTicket(ticketId, requesterId) {
    const db = initDb();
    const ticket = db.prepare(`
      SELECT * FROM support_tickets
      WHERE id = ? AND requester_id = ?;
    `).get(ticketId, requesterId);

    if (!ticket) return null;

    // Internal notes are strictly excluded from user view
    const messages = db.prepare(`
      SELECT m.id, m.ticket_id, m.sender_id, m.sender_role, m.body, m.created_at,
             u.full_name as sender_name
      FROM support_messages m
      LEFT JOIN users u ON m.sender_id = u.id
      WHERE m.ticket_id = ? AND m.is_internal_note = 0
      ORDER BY m.created_at ASC;
    `).all(ticketId);

    return {
      ...ticket,
      slaBreached: !ticket.first_response_at && new Date() > new Date(ticket.sla_due_at),
      messages
    };
  }

  static userReplyTicket(ticketId, requesterId, role, body) {
    const cleanBody = sanitizePlainText(body);
    if (!cleanBody || cleanBody.length > 5000) {
      throw new Error('Message body must be between 1 and 5000 characters');
    }

    const db = initDb();
    const ticket = db.prepare('SELECT * FROM support_tickets WHERE id = ? AND requester_id = ?;').get(ticketId, requesterId);
    if (!ticket) throw new Error('Ticket not found or access denied');

    // Rate limit: 30 messages/hour
    const oneHourAgo = new Date(Date.now() - 3600 * 1000).toISOString();
    const msgCount = db.prepare(`
      SELECT COUNT(*) as cnt FROM support_messages
      WHERE sender_id = ? AND created_at >= ?;
    `).get(requesterId, oneHourAgo)?.cnt || 0;

    if (msgCount >= 30) {
      const err = new Error('Hourly message limit exceeded (max 30 messages/hour)');
      err.status = 429;
      throw err;
    }

    const now = new Date().toISOString();
    const messageId = `msg-${uuidv4().slice(0, 8)}`;

    // Reopen ticket if previously resolved/closed
    const nextStatus = (ticket.status === 'resolved' || ticket.status === 'closed') ? 'open' : ticket.status;

    db.exec('BEGIN IMMEDIATE;');
    try {
      db.prepare(`
        INSERT INTO support_messages (
          id, ticket_id, sender_id, sender_role, body, is_internal_note, created_at
        ) VALUES (?, ?, ?, ?, ?, 0, ?);
      `).run(messageId, ticketId, requesterId, role || 'candidate', cleanBody, now);

      db.prepare(`
        UPDATE support_tickets
        SET status = ?, last_message_at = ?, updated_at = ?
        WHERE id = ?;
      `).run(nextStatus, now, now, ticketId);

      db.exec('COMMIT;');
      return this.getUserTicket(ticketId, requesterId);
    } catch (err) {
      db.exec('ROLLBACK;');
      throw err;
    }
  }

  static closeUserTicket(ticketId, requesterId) {
    const db = initDb();
    const ticket = db.prepare('SELECT * FROM support_tickets WHERE id = ? AND requester_id = ?;').get(ticketId, requesterId);
    if (!ticket) throw new Error('Ticket not found');

    const now = new Date().toISOString();
    db.prepare(`
      UPDATE support_tickets
      SET status = 'closed', resolved_at = COALESCE(resolved_at, ?), updated_at = ?
      WHERE id = ?;
    `).run(now, now, ticketId);

    return { success: true, ticketId, status: 'closed' };
  }

  // =================== ADMIN ENDPOINTS ===================
  static listAdminTickets({ status, priority, category, assignee, slaBreached, q, since, page = 1, pageSize = 30 }) {
    const db = initDb();
    const where = [];
    const params = [];

    if (status && status !== 'all') {
      where.push('t.status = ?');
      params.push(status);
    }
    if (priority && priority !== 'all') {
      where.push('t.priority = ?');
      params.push(priority);
    }
    if (category && category !== 'all') {
      where.push('t.category = ?');
      params.push(category);
    }
    if (assignee === 'unassigned') {
      where.push('t.assigned_to IS NULL');
    } else if (assignee && assignee !== 'all') {
      where.push('t.assigned_to = ?');
      params.push(assignee);
    }
    if (slaBreached === 'true' || slaBreached === true) {
      where.push("t.first_response_at IS NULL AND t.sla_due_at < datetime('now')");
    }
    if (q && q.trim()) {
      where.push('(t.subject LIKE ? OR u.full_name LIKE ? OR u.email LIKE ? OR t.id LIKE ?)');
      const term = `%${q.trim()}%`;
      params.push(term, term, term, term);
    }
    if (since) {
      where.push('t.last_message_at > ?');
      params.push(since);
    }

    const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
    const total = db.prepare(`
      SELECT COUNT(*) as cnt
      FROM support_tickets t
      JOIN users u ON t.requester_id = u.id
      ${whereSql};
    `).get(...params)?.cnt || 0;

    const offset = Math.max(0, (page - 1) * pageSize);
    const tickets = db.prepare(`
      SELECT t.*,
             u.full_name as requester_name,
             u.email as requester_email,
             u.role as requester_role,
             u.status as requester_status,
             admin.full_name as assignee_name,
             (SELECT COUNT(*) FROM support_messages m WHERE m.ticket_id = t.id) as message_count
      FROM support_tickets t
      JOIN users u ON t.requester_id = u.id
      LEFT JOIN users admin ON t.assigned_to = admin.id
      ${whereSql}
      ORDER BY
        CASE WHEN t.status = 'open' THEN 1 WHEN t.status = 'pending' THEN 2 ELSE 3 END ASC,
        t.last_message_at DESC
      LIMIT ? OFFSET ?;
    `).all(...params, pageSize, offset);

    const nowTime = Date.now();
    return {
      tickets: tickets.map(t => {
        const dueTime = new Date(t.sla_due_at).getTime();
        const diffHours = Math.round((dueTime - nowTime) / (3600 * 1000));
        return {
          ...t,
          slaBreached: !t.first_response_at && nowTime > dueTime,
          slaHoursLeft: diffHours
        };
      }),
      pagination: {
        page: Number(page),
        pageSize: Number(pageSize),
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    };
  }

  static getAdminTicketDetail(ticketId) {
    const db = initDb();
    const ticket = db.prepare(`
      SELECT t.*,
             u.full_name as requester_name,
             u.email as requester_email,
             u.role as requester_role,
             u.status as requester_status,
             u.created_at as requester_joined_at,
             admin.full_name as assignee_name
      FROM support_tickets t
      JOIN users u ON t.requester_id = u.id
      LEFT JOIN users admin ON t.assigned_to = admin.id
      WHERE t.id = ?;
    `).get(ticketId);

    if (!ticket) return null;

    // Messages includes internal notes
    const messages = db.prepare(`
      SELECT m.*, u.full_name as sender_name, u.avatar_url as sender_avatar
      FROM support_messages m
      LEFT JOIN users u ON m.sender_id = u.id
      WHERE m.ticket_id = ?
      ORDER BY m.created_at ASC;
    `).all(ticketId);

    // Requester previous tickets
    const previousTickets = db.prepare(`
      SELECT id, subject, status, priority, created_at
      FROM support_tickets
      WHERE requester_id = ? AND id != ?
      ORDER BY created_at DESC
      LIMIT 5;
    `).all(ticket.requester_id, ticketId);

    const nowTime = Date.now();
    const dueTime = new Date(ticket.sla_due_at).getTime();

    return {
      ...ticket,
      slaBreached: !ticket.first_response_at && nowTime > dueTime,
      slaHoursLeft: Math.round((dueTime - nowTime) / (3600 * 1000)),
      messages,
      previousTickets
    };
  }

  static adminReplyTicket(ticketId, adminId, { body, isInternalNote = false, setStatus }, req) {
    const cleanBody = sanitizePlainText(body);
    if (!cleanBody) throw new Error('Reply body cannot be empty');

    const db = initDb();
    const ticket = db.prepare('SELECT * FROM support_tickets WHERE id = ?;').get(ticketId);
    if (!ticket) throw new Error('Ticket not found');

    const now = new Date().toISOString();
    const messageId = `msg-${uuidv4().slice(0, 8)}`;
    const isInternal = Boolean(isInternalNote);

    // Compute status update
    let nextStatus = ticket.status;
    if (setStatus) {
      nextStatus = setStatus;
    } else if (!isInternal && ticket.status === 'open') {
      nextStatus = 'pending';
    }

    const firstResponseAt = (!isInternal && !ticket.first_response_at) ? now : ticket.first_response_at;
    const resolvedAt = nextStatus === 'resolved' ? (ticket.resolved_at || now) : (nextStatus === 'open' ? null : ticket.resolved_at);

    db.exec('BEGIN IMMEDIATE;');
    try {
      db.prepare(`
        INSERT INTO support_messages (
          id, ticket_id, sender_id, sender_role, body, is_internal_note, created_at
        ) VALUES (?, ?, ?, 'platform_admin', ?, ?, ?);
      `).run(messageId, ticketId, adminId, cleanBody, isInternal ? 1 : 0, now);

      db.prepare(`
        UPDATE support_tickets
        SET status = ?, first_response_at = ?, resolved_at = ?, last_message_at = ?, updated_at = ?
        WHERE id = ?;
      `).run(nextStatus, firstResponseAt, resolvedAt, now, now, ticketId);

      // Create notification for requester if not an internal note
      if (!isInternal) {
        notificationService.createNotification({
          userId: ticket.requester_id,
          type: 'info',
          title: 'Support Team Replied',
          body: `Update on ticket: "${ticket.subject.slice(0, 40)}"`,
          link: '/student/help'
        });
      }

      logAdminAction(db, {
        adminId,
        action: isInternal ? 'support.internal_note' : 'support.reply',
        entityType: 'support_ticket',
        entityId: ticketId,
        after: { messageId, isInternal, nextStatus },
        reason: isInternal ? 'Added staff internal note' : 'Replied to user support ticket',
        req
      });

      db.exec('COMMIT;');
      return this.getAdminTicketDetail(ticketId);
    } catch (err) {
      db.exec('ROLLBACK;');
      throw err;
    }
  }

  static updateTicket(ticketId, adminId, { status, priority, category, assignedTo }, req) {
    const db = initDb();
    const existing = db.prepare('SELECT * FROM support_tickets WHERE id = ?;').get(ticketId);
    if (!existing) throw new Error('Ticket not found');

    const now = new Date().toISOString();
    const newStatus = status || existing.status;
    const newPriority = priority || existing.priority;
    const newCategory = category || existing.category;
    const newAssignee = assignedTo !== undefined ? (assignedTo || null) : existing.assigned_to;
    const resolvedAt = newStatus === 'resolved' ? (existing.resolved_at || now) : (newStatus === 'open' ? null : existing.resolved_at);

    db.prepare(`
      UPDATE support_tickets
      SET status = ?, priority = ?, category = ?, assigned_to = ?, resolved_at = ?, updated_at = ?
      WHERE id = ?;
    `).run(newStatus, newPriority, newCategory, newAssignee, resolvedAt, now, ticketId);

    const updated = this.getAdminTicketDetail(ticketId);
    logAdminAction(db, {
      adminId,
      action: 'support.update_ticket',
      entityType: 'support_ticket',
      entityId: ticketId,
      before: existing,
      after: updated,
      reason: 'Updated ticket status / metadata',
      req
    });
    return updated;
  }

  static bulkUpdateTickets(adminId, { ids, status, assignedTo }, req) {
    if (!Array.isArray(ids) || ids.length === 0) throw new Error('ids must be a non-empty array');
    if (ids.length > 100) throw new Error('Bulk operations capped at 100 tickets');

    const db = initDb();
    const now = new Date().toISOString();
    let updatedCount = 0;

    db.exec('BEGIN IMMEDIATE;');
    try {
      for (const id of ids) {
        if (status) {
          const resolvedAt = status === 'resolved' ? now : null;
          db.prepare('UPDATE support_tickets SET status = ?, resolved_at = COALESCE(resolved_at, ?), updated_at = ? WHERE id = ?;').run(status, resolvedAt, now, id);
        }
        if (assignedTo !== undefined) {
          db.prepare('UPDATE support_tickets SET assigned_to = ?, updated_at = ? WHERE id = ?;').run(assignedTo || null, now, id);
        }
        updatedCount++;
      }

      logAdminAction(db, {
        adminId,
        action: 'support.bulk_update',
        entityType: 'support_ticket',
        after: { count: updatedCount, ids, status, assignedTo },
        reason: `Bulk updated ${updatedCount} support tickets`,
        req
      });

      db.exec('COMMIT;');
      return { success: true, updatedCount };
    } catch (err) {
      db.exec('ROLLBACK;');
      throw err;
    }
  }

  static getSupportStats() {
    const db = initDb();
    const openCount = db.prepare("SELECT COUNT(*) as cnt FROM support_tickets WHERE status = 'open';").get()?.cnt || 0;
    const unassignedCount = db.prepare("SELECT COUNT(*) as cnt FROM support_tickets WHERE status = 'open' AND assigned_to IS NULL;").get()?.cnt || 0;
    const breachedCount = db.prepare(`
      SELECT COUNT(*) as cnt FROM support_tickets
      WHERE first_response_at IS NULL AND sla_due_at < datetime('now');
    `).get()?.cnt || 0;

    // Average first response hours (tickets replied in last 30d)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
    const responseTimes = db.prepare(`
      SELECT (julianday(first_response_at) - julianday(created_at)) * 24 as diff_hours
      FROM support_tickets
      WHERE first_response_at IS NOT NULL AND created_at >= ?;
    `).all(thirtyDaysAgo);

    const avgResponseHours = responseTimes.length > 0
      ? Number((responseTimes.reduce((acc, r) => acc + (r.diff_hours || 0), 0) / responseTimes.length).toFixed(1))
      : 0;

    // Daily volume
    const volumePerDay = db.prepare(`
      SELECT date(created_at) as date, COUNT(*) as count
      FROM support_tickets
      WHERE created_at >= ?
      GROUP BY date(created_at)
      ORDER BY date(created_at) ASC;
    `).all(thirtyDaysAgo);

    return {
      openCount,
      unassignedCount,
      breachedCount,
      avgResponseHours,
      volumePerDay
    };
  }

  // =================== CANNED RESPONSES ===================
  static listCannedResponses() {
    const db = initDb();
    return db.prepare('SELECT * FROM support_canned_responses ORDER BY title ASC;').all();
  }

  static createCannedResponse(adminId, { title, body }, req) {
    if (!title || !body) throw new Error('Title and body are required');
    const db = initDb();
    const id = `can-${uuidv4().slice(0, 8)}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO support_canned_responses (id, title, body, created_by, created_at)
      VALUES (?, ?, ?, ?, ?);
    `).run(id, title.trim(), body.trim(), adminId, now);

    const created = db.prepare('SELECT * FROM support_canned_responses WHERE id = ?;').get(id);
    logAdminAction(db, {
      adminId,
      action: 'support.canned_create',
      entityType: 'canned_response',
      entityId: id,
      after: created,
      reason: `Created canned response '${title}'`,
      req
    });
    return created;
  }

  static deleteCannedResponse(id, adminId, req) {
    const db = initDb();
    const existing = db.prepare('SELECT * FROM support_canned_responses WHERE id = ?;').get(id);
    if (!existing) throw new Error('Canned response not found');

    db.prepare('DELETE FROM support_canned_responses WHERE id = ?;').run(id);
    logAdminAction(db, {
      adminId,
      action: 'support.canned_delete',
      entityType: 'canned_response',
      entityId: id,
      before: existing,
      reason: `Deleted canned response '${existing.title}'`,
      req
    });
    return { success: true, id };
  }

  // =================== ANNOUNCEMENTS ===================
  static listAnnouncements() {
    const db = initDb();
    return db.prepare(`
      SELECT a.*, u.full_name as author_name,
             (SELECT COUNT(*) FROM announcement_dismissals ad WHERE ad.announcement_id = a.id) as dismissal_count
      FROM announcements a
      LEFT JOIN users u ON a.created_by = u.id
      ORDER BY a.created_at DESC;
    `).all();
  }

  static getActiveAnnouncementsForUser(userId, role = 'student') {
    const db = initDb();
    const now = new Date().toISOString();

    return db.prepare(`
      SELECT a.*
      FROM announcements a
      WHERE a.active = 1
        AND a.starts_at <= ?
        AND (a.ends_at IS NULL OR a.ends_at >= ?)
        AND (a.audience = 'all' OR a.audience = ?)
        AND NOT EXISTS (
          SELECT 1 FROM announcement_dismissals ad
          WHERE ad.announcement_id = a.id AND ad.user_id = ?
        )
      ORDER BY a.starts_at DESC;
    `).all(now, now, role, userId);
  }

  static dismissAnnouncement(announcementId, userId) {
    const db = initDb();
    const now = new Date().toISOString();
    db.prepare(`
      INSERT OR IGNORE INTO announcement_dismissals (announcement_id, user_id, dismissed_at)
      VALUES (?, ?, ?);
    `).run(announcementId, userId, now);
    return { success: true, announcementId, userId };
  }

  static createAnnouncement(adminId, { title, body, audience = 'all', severity = 'info', startsAt, endsAt }, req) {
    if (!title || !body) throw new Error('Title and body are required');
    const db = initDb();
    const id = `ann-${uuidv4().slice(0, 8)}`;
    const now = new Date().toISOString();
    const start = startsAt || now;

    db.prepare(`
      INSERT INTO announcements (
        id, title, body, audience, severity, starts_at, ends_at, active, created_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?);
    `).run(id, title.trim(), body.trim(), audience, severity, start, endsAt || null, adminId, now);

    const created = db.prepare('SELECT * FROM announcements WHERE id = ?;').get(id);
    logAdminAction(db, {
      adminId,
      action: 'announcement.create',
      entityType: 'announcement',
      entityId: id,
      after: created,
      reason: `Broadcast announcement '${title}' to audience: ${audience}`,
      req
    });
    return created;
  }

  static toggleAnnouncementActive(id, adminId, active, req) {
    const db = initDb();
    const existing = db.prepare('SELECT * FROM announcements WHERE id = ?;').get(id);
    if (!existing) throw new Error('Announcement not found');

    const nextActive = active !== undefined ? (active ? 1 : 0) : (existing.active === 1 ? 0 : 1);
    db.prepare('UPDATE announcements SET active = ? WHERE id = ?;').run(nextActive, id);

    const updated = db.prepare('SELECT * FROM announcements WHERE id = ?;').get(id);
    logAdminAction(db, {
      adminId,
      action: 'announcement.toggle',
      entityType: 'announcement',
      entityId: id,
      before: existing,
      after: updated,
      reason: `Toggled announcement active state to ${nextActive === 1 ? 'ON' : 'OFF'}`,
      req
    });
    return updated;
  }
}
