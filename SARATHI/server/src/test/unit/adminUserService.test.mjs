import { test, describe, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeCsvCell, adminUserService } from '../../services/admin/adminUserService.js';
import { getDb } from '../../config/db.js';
import { runMigrations } from '../../data/migrate.mjs';

describe('Admin User Service Unit Test Suite', () => {
  let db;
  const adminUser = { id: 'usr-admin-test', role: 'platform_admin', fullName: 'Test Admin' };

  before(() => {
    runMigrations();
    db = getDb();
  });

  beforeEach(() => {
    // Clean child references first
    db.prepare("UPDATE feature_flags SET updated_by = NULL WHERE updated_by = 'usr-admin-test' OR updated_by LIKE 'test-unit-%' OR updated_by LIKE 'usr-inv-%';").run();
    db.prepare("UPDATE business_verifications SET reviewed_by = NULL WHERE reviewed_by = 'usr-admin-test' OR reviewed_by LIKE 'test-unit-%';").run();
    db.prepare("DELETE FROM business_verifications WHERE user_id LIKE 'test-unit-%' OR user_id = 'usr-admin-test';").run();
    db.prepare("DELETE FROM support_messages WHERE sender_id = 'usr-admin-test' OR sender_id LIKE 'test-unit-%' OR sender_id LIKE 'usr-inv-%';").run();
    db.prepare("DELETE FROM support_tickets WHERE requester_id = 'usr-admin-test' OR requester_id LIKE 'test-unit-%' OR requester_id LIKE 'usr-inv-%' OR assigned_to = 'usr-admin-test';").run();
    db.prepare("DELETE FROM announcements WHERE created_by = 'usr-admin-test' OR created_by LIKE 'test-unit-%' OR created_by LIKE 'usr-inv-%';").run();
    db.prepare("DELETE FROM support_canned_responses WHERE created_by = 'usr-admin-test' OR created_by LIKE 'test-unit-%' OR created_by LIKE 'usr-inv-%';").run();
    db.prepare("DELETE FROM password_resets WHERE user_id LIKE 'test-unit-%' OR user_id = 'usr-admin-test' OR user_id LIKE 'usr-inv-%';").run();
    db.prepare("DELETE FROM admin_audit_log WHERE admin_id = 'usr-admin-test' OR admin_id LIKE 'test-unit-%' OR admin_id LIKE 'usr-inv-%' OR entity_id LIKE 'test-unit-%' OR entity_id LIKE 'usr-inv-%';").run();
    db.prepare("DELETE FROM users WHERE id LIKE 'test-unit-%' OR id = 'usr-admin-test' OR id LIKE 'usr-inv-%';").run();

    // Ensure our test admin exists
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO users (id, email, password_hash, full_name, role, status, created_at, updated_at)
       VALUES (?, ?, 'hash', ?, 'platform_admin', 'active', ?, ?);`
    ).run(adminUser.id, 'unit-admin@sarathi.dev', adminUser.fullName, now, now);
  });

  test('1. sanitizeCsvCell strictly neutralizes formula injection prefixes', () => {
    assert.equal(sanitizeCsvCell('=SUM(A1:A10)'), `"'=SUM(A1:A10)"`);
    assert.equal(sanitizeCsvCell('+12345'), ` "'+12345"`.trim());
    assert.equal(sanitizeCsvCell('-cmd|/C calc'), ` "'-cmd|/C calc"`.trim());
    assert.equal(sanitizeCsvCell('@HYPERLINK("http://evil.com")'), `"'@HYPERLINK(""http://evil.com"")"`);
    assert.equal(sanitizeCsvCell('\tTabPrefix'), ` "'\tTabPrefix"`.trim());
    assert.equal(sanitizeCsvCell('\rReturnPrefix'), ` "'\rReturnPrefix"`.trim());
    assert.equal(sanitizeCsvCell('Normal Safe Text'), '"Normal Safe Text"');
    assert.equal(sanitizeCsvCell(null), '""');
    assert.equal(sanitizeCsvCell(undefined), '""');
  });

  test('2. Self-protection: Administrator cannot suspend or change role of their own account', () => {
    assert.throws(
      () => adminUserService.updateUserStatus(adminUser, adminUser.id, { status: 'suspended', reason: 'Self-test' }),
      /Cannot modify your own account status/
    );

    assert.throws(
      () => adminUserService.updateUserRole(adminUser, adminUser.id, { role: 'candidate', reason: 'Self-test' }),
      /Cannot change your own role/
    );
  });

  test('3. Reason requirement: Suspending a user strictly requires a non-empty reason', () => {
    const now = new Date().toISOString();
    const targetId = 'test-unit-user-1';
    db.prepare(
      `INSERT INTO users (id, email, password_hash, full_name, role, status, created_at, updated_at)
       VALUES (?, ?, 'hash', 'Target User', 'candidate', 'active', ?, ?);`
    ).run(targetId, 'target1@test.sarathi.dev', now, now);

    assert.throws(
      () => adminUserService.updateUserStatus(adminUser, targetId, { status: 'suspended', reason: '' }),
      /A reason is required to suspend a user account/
    );

    assert.throws(
      () => adminUserService.updateUserStatus(adminUser, targetId, { status: 'suspended', reason: '   ' }),
      /A reason is required to suspend a user account/
    );
  });

  test('4. Last admin protection: Cannot suspend or demote the last active platform admin', () => {
    // If only usr-admin-test is active admin
    db.prepare("UPDATE users SET status = 'suspended' WHERE role = 'platform_admin' AND id != ?;").run(adminUser.id);

    const secondAdminId = 'test-unit-admin-2';
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO users (id, email, password_hash, full_name, role, status, created_at, updated_at)
       VALUES (?, ?, 'hash', 'Second Admin', 'platform_admin', 'active', ?, ?);`
    ).run(secondAdminId, 'second-admin@test.sarathi.dev', now, now);

    // Suspending second admin succeeds because there are 2 active admins
    const res = adminUserService.updateUserStatus(adminUser, secondAdminId, {
      status: 'suspended',
      reason: 'Valid audit reason',
    });
    assert.equal(res.status, 'suspended');

    // Now usr-admin-test is the ONLY active admin.
    // If someone tries to suspend the only active admin, it must fail.
    assert.throws(
      () => adminUserService.updateUserStatus({ id: 'external-caller' }, adminUser.id, {
        status: 'suspended',
        reason: 'Attempting to suspend last admin',
      }),
      /Cannot suspend the last active platform administrator/
    );

    // Demoting last active admin must also fail
    assert.throws(
      () => adminUserService.updateUserRole({ id: 'external-caller' }, adminUser.id, {
        role: 'reviewer',
        reason: 'Attempting demote last admin',
      }),
      /Cannot demote the last active platform administrator/
    );
  });

  test('5. Candidate <-> Recruiter role switch returns migration warning notice', () => {
    const now = new Date().toISOString();
    const candId = 'test-unit-cand-switch';
    db.prepare(
      `INSERT INTO users (id, email, password_hash, full_name, role, status, created_at, updated_at)
       VALUES (?, ?, 'hash', 'Candidate Switch', 'candidate', 'active', ?, ?);`
    ).run(candId, 'switch@test.sarathi.dev', now, now);

    const result = adminUserService.updateUserRole(adminUser, candId, {
      role: 'recruiter',
      reason: 'User requested employer status',
    });

    assert.equal(result.role, 'recruiter');
    assert.equal(result.previousRole, 'candidate');
    assert.match(result.warning, /Profile data does not migrate/);
  });

  test('6. Force password reset invalidates previous tokens and issues fresh one', () => {
    const now = new Date().toISOString();
    const targetId = 'test-unit-reset-user';
    db.prepare(
      `INSERT INTO users (id, email, password_hash, full_name, role, status, created_at, updated_at)
       VALUES (?, ?, 'hash', 'Reset Target', 'candidate', 'active', ?, ?);`
    ).run(targetId, 'resettarget@test.sarathi.dev', now, now);

    // Insert an old pending reset token
    db.prepare(
      `INSERT INTO password_resets (id, user_id, token_hash, expires_at, used_at)
       VALUES ('pwr-old-test', ?, 'old-token-hash', ?, NULL);`
    ).run(targetId, new Date(Date.now() + 3600000).toISOString());

    const resetRes = adminUserService.forcePasswordReset(adminUser, targetId);
    assert.equal(resetRes.success, true);
    assert.ok(resetRes.resetLink);

    // Old token should be marked used
    const oldToken = db.prepare('SELECT used_at FROM password_resets WHERE id = ?;').get('pwr-old-test');
    assert.ok(oldToken.used_at !== null);

    // Check audit log recorded action without leaking token
    const auditRow = db.prepare('SELECT * FROM admin_audit_log WHERE entity_id = ? AND action = ?;').get(targetId, 'user.force_password_reset');
    assert.ok(auditRow);
    assert.equal(auditRow.admin_id, adminUser.id);
    assert.equal(auditRow.reason, 'Administrator triggered password reset');
    assert.ok(!auditRow.after_json.includes(resetRes.resetLink));
  });

  test('7. Staff invitation creates account and 48h setup link with audit log', () => {
    const inviteEmail = 'staff.invited@test.sarathi.dev';
    const inviteRes = adminUserService.inviteStaff(adminUser, {
      email: inviteEmail,
      name: 'Jane Reviewer',
      role: 'reviewer',
    });

    assert.equal(inviteRes.success, true);
    assert.equal(inviteRes.user.email, inviteEmail);
    assert.equal(inviteRes.user.role, 'reviewer');
    assert.ok(inviteRes.setupLink.includes('/reset-password?token='));

    // Verify token expiration is approximately 48 hours in the future
    const tokenRow = db.prepare('SELECT expires_at FROM password_resets WHERE user_id = ?;').get(inviteRes.user.id);
    assert.ok(tokenRow);
    const expiresMs = new Date(tokenRow.expires_at).getTime();
    const expectedMinMs = Date.now() + 47 * 60 * 60 * 1000;
    assert.ok(expiresMs > expectedMinMs);
  });

  test('8. Bulk status update handles mix of valid, self, and invalid IDs reporting per-id outcomes', () => {
    const now = new Date().toISOString();
    const u1 = 'test-unit-bulk-1';
    const u2 = 'test-unit-bulk-2';
    db.prepare(
      `INSERT INTO users (id, email, password_hash, full_name, role, status, created_at, updated_at)
       VALUES (?, ?, 'hash', 'Bulk 1', 'candidate', 'active', ?, ?);`
    ).run(u1, 'bulk1@test.sarathi.dev', now, now);
    db.prepare(
      `INSERT INTO users (id, email, password_hash, full_name, role, status, created_at, updated_at)
       VALUES (?, ?, 'hash', 'Bulk 2', 'candidate', 'active', ?, ?);`
    ).run(u2, 'bulk2@test.sarathi.dev', now, now);

    const bulkResult = adminUserService.bulkUpdateStatus(adminUser, {
      ids: [u1, adminUser.id, u2, 'non-existent-user-id'],
      status: 'suspended',
      reason: 'Bulk investigation',
    });

    assert.equal(bulkResult.totalRequested, 4);
    assert.equal(bulkResult.updatedCount, 2);
    assert.equal(bulkResult.skippedCount, 2);

    const selfOutcome = bulkResult.results.find((r) => r.id === adminUser.id);
    assert.equal(selfOutcome.success, false);
    assert.match(selfOutcome.error, /Cannot modify your own account/);

    const nonExistentOutcome = bulkResult.results.find((r) => r.id === 'non-existent-user-id');
    assert.equal(nonExistentOutcome.success, false);
    assert.match(nonExistentOutcome.error, /User not found/);

    const u1Outcome = bulkResult.results.find((r) => r.id === u1);
    assert.equal(u1Outcome.success, true);
  });
});
