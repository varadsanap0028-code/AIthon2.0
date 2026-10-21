import { initDb } from '../../config/db.js';
import { v4 as uuidv4 } from 'uuid';

export function seedSupportData(db = initDb()) {
  const users = db.prepare("SELECT id, role, full_name FROM users WHERE role IN ('candidate', 'recruiter') LIMIT 15;").all();
  if (users.length === 0) return 0;

  const admin = db.prepare("SELECT id FROM users WHERE role = 'platform_admin' LIMIT 1;").get();
  const adminId = admin?.id || 'usr-admin-seed';

  const ticketCount = db.prepare("SELECT COUNT(*) as count FROM support_tickets;").get()?.count || 0;
  if (ticketCount >= 20) return ticketCount;

  const now = Date.now();
  const sampleTickets = [
    { cat: 'approval', subj: 'Registration document verification pending over 48h', prio: 'urgent', status: 'open', ageHours: 52 },
    { cat: 'test', subj: 'Camera disconnected during Python coding challenge', prio: 'high', status: 'open', ageHours: 14 },
    { cat: 'bug', subj: 'Cannot download Skill Passport PDF on Safari', prio: 'normal', status: 'pending', ageHours: 28 },
    { cat: 'account', subj: 'Need to update official company GSTIN on profile', prio: 'normal', status: 'resolved', ageHours: 72 },
    { cat: 'approval', subj: 'GST certificate rejected: name mismatch query', prio: 'urgent', status: 'open', ageHours: 18 },
    { cat: 'test', subj: 'Docker runner timed out on test case 4', prio: 'normal', status: 'open', ageHours: 6 },
    { cat: 'bug', subj: 'Candidate interview invite email link expired', prio: 'high', status: 'pending', ageHours: 22 },
    { cat: 'other', subj: 'Inquiry regarding college campus placement drive bulk invite', prio: 'low', status: 'resolved', ageHours: 96 },
    { cat: 'account', subj: 'Two-factor authentication reset request', prio: 'high', status: 'open', ageHours: 5 },
    { cat: 'test', subj: 'Integrity review score dispute for test session 1092', prio: 'urgent', status: 'open', ageHours: 35 },
    { cat: 'bug', subj: 'Radar chart not rendering on mobile responsive viewport', prio: 'low', status: 'closed', ageHours: 120 },
    { cat: 'approval', subj: 'PAN Card entity type code clarification', prio: 'normal', status: 'pending', ageHours: 40 },
    { cat: 'account', subj: 'Request for recruiter seat allocation increase', prio: 'normal', status: 'resolved', ageHours: 85 },
    { cat: 'test', subj: 'Accidental tab blur event recorded during network glitch', prio: 'normal', status: 'open', ageHours: 12 },
    { cat: 'other', subj: 'API access for university ERP placement integration', prio: 'low', status: 'open', ageHours: 45 },
    { cat: 'bug', subj: 'Job application status filter resetting on page refresh', prio: 'normal', status: 'resolved', ageHours: 110 },
    { cat: 'approval', subj: 'MSME registration certificate acceptable as proof of business?', prio: 'normal', status: 'closed', ageHours: 140 },
    { cat: 'test', subj: 'Multiple monitor proctoring false-positive warning', prio: 'high', status: 'pending', ageHours: 19 },
    { cat: 'account', subj: 'Change candidate graduation year from 2025 to 2026', prio: 'low', status: 'resolved', ageHours: 160 },
    { cat: 'bug', subj: 'Skill assessment submit button disabled after test run', prio: 'urgent', status: 'open', ageHours: 2 },
    { cat: 'other', subj: 'Guidelines for campus hackathon sponsorship listing', prio: 'low', status: 'open', ageHours: 30 },
    { cat: 'approval', subj: 'Authorized signatory authorization letter format query', prio: 'normal', status: 'open', ageHours: 8 },
    { cat: 'test', subj: 'Copy paste shortcut was blocked while copying test input', prio: 'normal', status: 'resolved', ageHours: 90 },
    { cat: 'account', subj: 'Request to merge student personal and university email accounts', prio: 'high', status: 'open', ageHours: 16 },
    { cat: 'bug', subj: 'Notification bell unread count badge out of sync', prio: 'low', status: 'open', ageHours: 4 }
  ];

  db.exec('BEGIN IMMEDIATE;');
  try {
    sampleTickets.forEach((t, idx) => {
      const user = users[idx % users.length];
      const ticketId = `tkt-demo-${idx + 1}`;
      const createdAt = new Date(now - t.ageHours * 3600 * 1000).toISOString();
      const slaHours = t.prio === 'urgent' ? 4 : t.prio === 'high' ? 12 : 24;
      const slaDueAt = new Date(now - (t.ageHours - slaHours) * 3600 * 1000).toISOString();
      const firstResponseAt = t.status !== 'open' ? new Date(now - (t.ageHours - 2) * 3600 * 1000).toISOString() : null;
      const resolvedAt = (t.status === 'resolved' || t.status === 'closed') ? new Date(now - (t.ageHours - 10) * 3600 * 1000).toISOString() : null;
      const lastMsgAt = new Date(now - Math.max(1, t.ageHours - 4) * 3600 * 1000).toISOString();

      db.prepare(`
        INSERT OR IGNORE INTO support_tickets (
          id, requester_id, category, subject, status, priority,
          assigned_to, first_response_at, resolved_at, sla_due_at,
          created_at, updated_at, last_message_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `).run(
        ticketId, user.id, t.cat, t.subj, t.status, t.prio,
        t.status !== 'open' ? adminId : null,
        firstResponseAt, resolvedAt, slaDueAt,
        createdAt, lastMsgAt, lastMsgAt
      );

      // Initial user message
      db.prepare(`
        INSERT OR IGNORE INTO support_messages (
          id, ticket_id, sender_id, sender_role, body, is_internal_note, created_at
        ) VALUES (?, ?, ?, ?, ?, 0, ?);
      `).run(
        `msg-demo-${idx + 1}-1`, ticketId, user.id, user.role,
        `Hello Sarathi Support, I am reporting an issue regarding "${t.subj}". Please advise how to proceed.`,
        createdAt
      );

      // Follow-up messages if not strictly initial
      if (t.status !== 'open') {
        db.prepare(`
          INSERT OR IGNORE INTO support_messages (
            id, ticket_id, sender_id, sender_role, body, is_internal_note, created_at
          ) VALUES (?, ?, ?, 'platform_admin', ?, 1, ?);
        `).run(
          `msg-demo-${idx + 1}-int`, ticketId, adminId,
          `Internal Note: Checked telemetry logs for user ${user.id}. Issue verified against server telemetry.`,
          new Date(new Date(createdAt).getTime() + 1800 * 1000).toISOString()
        );

        db.prepare(`
          INSERT OR IGNORE INTO support_messages (
            id, ticket_id, sender_id, sender_role, body, is_internal_note, created_at
          ) VALUES (?, ?, ?, 'platform_admin', ?, 0, ?);
        `).run(
          `msg-demo-${idx + 1}-rep`, ticketId, adminId,
          `Hello ${user.full_name}, thank you for contacting Sarathi Support. We have investigated your request and updated the platform records accordingly.`,
          firstResponseAt
        );
      }
    });

    db.exec('COMMIT;');
    const total = db.prepare("SELECT COUNT(*) as cnt FROM support_tickets;").get()?.cnt || 0;
    return total;
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }
}

if (process.argv[1]?.endsWith('supportSeeder.js')) {
  const count = seedSupportData();
  console.log(`Seeded demo support tickets. Total tickets in DB: ${count}`);
}
