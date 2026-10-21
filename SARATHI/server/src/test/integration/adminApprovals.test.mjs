import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import app from '../../index.js';
import { initDb } from '../../config/db.js';
import { authService } from '../../services/authService.js';
import { paths } from '../../config/index.js';

describe('Admin Recruiter Approvals Integration Tests', () => {
  let server;
  let baseUrl;
  let adminToken;
  let recruiterToken;
  let adminUser;
  let recruiterUser;
  let orgId;
  let verificationId;
  let testFilePath;

  before(async () => {
    server = createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;

    const db = initDb();

    // Ensure uploadsDir exists
    if (!fs.existsSync(paths.uploadsDir)) {
      fs.mkdirSync(paths.uploadsDir, { recursive: true });
    }

    testFilePath = path.join(paths.uploadsDir, 'integration-test-doc.pdf');
    fs.writeFileSync(testFilePath, '%PDF-1.4 test document content %%EOF');

    const now = new Date().toISOString();

    // Create test platform admin
    adminUser = {
      id: `usr-admin-test-${Date.now()}`,
      email: `admin-appr-${Date.now()}@sarathi.dev`,
      full_name: 'Test Approvals Admin',
      role: 'platform_admin',
      status: 'active',
      created_at: now,
      updated_at: now,
    };
    db.prepare(`
      INSERT INTO users (id, email, full_name, role, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?);
    `).run(adminUser.id, adminUser.email, adminUser.full_name, adminUser.role, adminUser.status, now, now);
    adminToken = authService.generateToken(adminUser);

    // Create test recruiter
    recruiterUser = {
      id: `usr-rec-test-${Date.now()}`,
      email: `recruiter-appr-${Date.now()}@nextech.com`,
      full_name: 'Test Hiring Lead',
      role: 'recruiter',
      status: 'active',
      email_verified: 1,
      created_at: now,
      updated_at: now,
    };
    db.prepare(`
      INSERT INTO users (id, email, full_name, role, status, email_verified, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?);
    `).run(recruiterUser.id, recruiterUser.email, recruiterUser.full_name, recruiterUser.role, recruiterUser.status, 1, now, now);

    // Create test organisation
    orgId = `org-test-${Date.now()}`;
    db.prepare(`
      INSERT INTO organisations (id, name, slug, timezone, currency, settings, verification_status, created_at, updated_at)
      VALUES (?, 'NexTech Global Inc', ?, 'Asia/Kolkata', 'INR', '{}', 'unverified', ?, ?);
    `).run(orgId, `nextech-global-${Date.now()}`, now, now);

    // Link recruiter to org
    db.prepare(`
      INSERT INTO organisation_memberships (id, org_id, user_id, role, status, created_at, updated_at)
      VALUES (?, ?, ?, 'recruiter', 'active', ?, ?);
    `).run(`mem-test-${Date.now()}`, orgId, recruiterUser.id, now, now);
    recruiterToken = authService.generateToken(recruiterUser, orgId, 'recruiter');

    // Create test verification record in pending status (submitted 10h ago: SLA ok)
    verificationId = `bv-test-${Date.now()}`;
    const tenHoursAgo = new Date(Date.now() - 10 * 3600 * 1000).toISOString();
    db.prepare(`
      INSERT INTO business_verifications (
        id, org_id, user_id, document_type, document_name, file_path, file_size,
        mime_type, file_hash, tax_identifier, status, submitted_at, created_at, updated_at
      ) VALUES (?, ?, ?, 'gstin', 'integration-test-doc.pdf', ?, 128, 'application/pdf', 'hash-test-123', '27AAPCN1234C1Z5', 'pending', ?, ?, ?);
    `).run(verificationId, orgId, recruiterUser.id, testFilePath, tenHoursAgo, tenHoursAgo, tenHoursAgo);
  });

  after(async () => {
    const db = initDb();
    if (verificationId) {
      db.prepare('DELETE FROM business_verifications WHERE id = ?;').run(verificationId);
      db.prepare('DELETE FROM admin_audit_log WHERE entity_id = ?;').run(verificationId);
    }
    if (orgId) {
      db.prepare('DELETE FROM organisation_memberships WHERE org_id = ?;').run(orgId);
      db.prepare('DELETE FROM organisations WHERE id = ?;').run(orgId);
    }
    if (recruiterUser?.id) {
      db.prepare('DELETE FROM notifications WHERE user_id = ?;').run(recruiterUser.id);
      db.prepare('DELETE FROM users WHERE id = ?;').run(recruiterUser.id);
    }
    if (adminUser?.id) {
      db.prepare('DELETE FROM admin_audit_log WHERE admin_id = ?;').run(adminUser.id);
      db.prepare('DELETE FROM users WHERE id = ?;').run(adminUser.id);
    }

    if (testFilePath && fs.existsSync(testFilePath)) {
      try {
        fs.unlinkSync(testFilePath);
      } catch {}
    }

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it('1. GET /api/admin/approvals requires platform admin and lists pending verifications with SLA', async () => {
    // Unauthenticated request -> 401
    const unauth = await fetch(`${baseUrl}/api/admin/approvals`);
    assert.equal(unauth.status, 401);

    // Recruiter trying to access -> 403
    const forbidden = await fetch(`${baseUrl}/api/admin/approvals`, {
      headers: { Authorization: `Bearer ${recruiterToken}` },
    });
    assert.equal(forbidden.status, 403);

    // Platform admin -> 200
    const res = await fetch(`${baseUrl}/api/admin/approvals?status=pending`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res.status, 200);
    const data = await res.json();

    assert.ok(Array.isArray(data.items));
    assert.ok(data.total >= 1);
    assert.ok(data.statusCounts.pending >= 1);

    const item = data.items.find((i) => i.id === verificationId);
    assert.ok(item, 'Created verification item must be present');
    assert.equal(item.company, 'NexTech Global Inc');
    assert.equal(item.sla, 'ok'); // 10h ago < 24h
    assert.equal(item.documentType, 'gstin');
    assert.equal(item.emailVerified, true);
  });

  it('2. GET /api/admin/approvals/stats and reason-templates return aggregated metrics and templates', async () => {
    const statsRes = await fetch(`${baseUrl}/api/admin/approvals/stats`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(statsRes.status, 200);
    const stats = await statsRes.json();

    assert.ok(typeof stats.pendingCount === 'number');
    assert.ok(typeof stats.approvalRate30d === 'number');
    assert.ok(Array.isArray(stats.decisionsPerDay));

    const templatesRes = await fetch(`${baseUrl}/api/admin/approvals/reason-templates`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(templatesRes.status, 200);
    const templates = await templatesRes.json();
    assert.ok(Array.isArray(templates));
    assert.ok(templates.includes('Document unreadable'));
  });

  it('3. GET /api/admin/approvals/:id returns detail with automated hints', async () => {
    const res = await fetch(`${baseUrl}/api/admin/approvals/${verificationId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res.status, 200);
    const detail = await res.json();

    assert.equal(detail.id, verificationId);
    assert.equal(detail.company.name, 'NexTech Global Inc');
    assert.equal(detail.recruiter.fullName, 'Test Hiring Lead');
    assert.ok(Array.isArray(detail.automatedHints));

    // GSTIN was 27AAPCN1234C1Z5 (Valid company GSTIN)
    const gstinHint = detail.automatedHints.find((h) => h.key === 'gstin_format');
    assert.ok(gstinHint);
    assert.equal(gstinHint.status, 'pass');

    // Email was recruiter@nextech.com matching NexTech Global Inc
    const emailHint = detail.automatedHints.find((h) => h.key === 'email_domain');
    assert.ok(emailHint);
    assert.equal(emailHint.status, 'pass');
  });

  it('4. Path traversal defense: streaming document rejects paths outside uploads directory', async () => {
    const db = initDb();
    const maliciousId = `bv-traversal-${Date.now()}`;
    const escapedPath = path.resolve(paths.dataDir, '..', 'package.json'); // outside uploads dir!

    db.prepare(`
      INSERT INTO business_verifications (
        id, org_id, user_id, document_type, document_name, file_path, file_size,
        mime_type, status, submitted_at, created_at, updated_at
      ) VALUES (?, ?, ?, 'gstin', 'secret.pdf', ?, 100, 'application/pdf', 'pending', datetime('now'), datetime('now'), datetime('now'));
    `).run(maliciousId, orgId, recruiterUser.id, escapedPath);

    try {
      const res = await fetch(`${baseUrl}/api/admin/approvals/${maliciousId}/document`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(res.status, 403, 'Path traversal must return 403 Forbidden');
    } finally {
      db.prepare('DELETE FROM business_verifications WHERE id = ?;').run(maliciousId);
    }
  });

  it('5. GET /api/admin/approvals/:id/document streams authorized file and writes audit log', async () => {
    const res = await fetch(`${baseUrl}/api/admin/approvals/${verificationId}/document`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('content-type'), 'application/pdf');
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');

    const bodyText = await res.text();
    assert.match(bodyText, /%PDF-1\.4/);

    // Verify audit log was recorded for document_view
    const db = initDb();
    const auditEntry = db.prepare(`
      SELECT * FROM admin_audit_log 
      WHERE action = 'approval.document_view' AND entity_id = ?;
    `).get(verificationId);
    assert.ok(auditEntry, 'Audit log entry must be written for document view');
  });

  it('6. POST /api/admin/approvals/:id/decision blocks rejection without reason (>=10 chars)', async () => {
    const badDecision = await fetch(`${baseUrl}/api/admin/approvals/${verificationId}/decision`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ decision: 'reject', reason: 'bad' }), // only 3 chars!
    });
    assert.equal(badDecision.status, 400);
    const body = await badDecision.json();
    assert.match(body.error, /at least 10 characters/i);
  });

  it('7. POST /api/admin/approvals/:id/decision approves company, creates recruiter notification, and writes audit', async () => {
    const res = await fetch(`${baseUrl}/api/admin/approvals/${verificationId}/decision`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        decision: 'approve',
        reason: 'Valid corporate registration verified with government portal',
        notes: 'Cross-checked with GST portal',
      }),
    });
    assert.equal(res.status, 200);
    const result = await res.json();
    assert.equal(result.success, true);
    assert.equal(result.decision, 'approve');
    assert.equal(result.companyVerificationStatus, 'verified');

    const db = initDb();

    // 1. Check business_verifications status
    const updatedBv = db.prepare('SELECT status, reviewed_by FROM business_verifications WHERE id = ?;').get(verificationId);
    assert.equal(updatedBv.status, 'approve');
    assert.equal(updatedBv.reviewed_by, adminUser.id);

    // 2. Check organisation status
    const updatedOrg = db.prepare('SELECT verification_status FROM organisations WHERE id = ?;').get(orgId);
    assert.equal(updatedOrg.verification_status, 'verified');

    // 3. Check notification for recruiter
    const notif = db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 1;').get(recruiterUser.id);
    assert.ok(notif);
    assert.equal(notif.type, 'success');
    assert.match(notif.title, /Approved/i);

    // 4. Check audit log
    const auditRow = db.prepare(`
      SELECT * FROM admin_audit_log 
      WHERE action = 'approval.decision' AND entity_id = ?;
    `).get(verificationId);
    assert.ok(auditRow);
    assert.equal(auditRow.admin_id, adminUser.id);
  });

  it('8. Re-deciding already decided record requires override: true', async () => {
    // Attempting decision without override -> 400
    const noOverride = await fetch(`${baseUrl}/api/admin/approvals/${verificationId}/decision`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        decision: 'reject',
        reason: 'Revoked approval upon re-investigation of document',
      }),
    });
    assert.equal(noOverride.status, 400);
    const body = await noOverride.json();
    assert.match(body.error, /override=true/i);

    // With override: true -> 200 and audited as approval.override
    const withOverride = await fetch(`${baseUrl}/api/admin/approvals/${verificationId}/decision`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        decision: 'reject',
        reason: 'Revoked approval upon re-investigation of document',
        override: true,
      }),
    });
    assert.equal(withOverride.status, 200);

    const db = initDb();
    const overrideAudit = db.prepare(`
      SELECT * FROM admin_audit_log 
      WHERE action = 'approval.override' AND entity_id = ?;
    `).get(verificationId);
    assert.ok(overrideAudit, 'Must record approval.override in audit log');
  });

  it('9. Sidebar badge reflects pending approval count', async () => {
    const res = await fetch(`${baseUrl}/api/admin/nav-badges`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res.status, 200);
    const badges = await res.json();
    assert.ok(typeof badges.pendingApprovals === 'number');
    assert.ok(badges.pendingApprovals >= 0);
  });
});
