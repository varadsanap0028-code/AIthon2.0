import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { logAdminAction, redactSensitiveData } from '../../services/admin/adminAuditService.js';
import { initDb } from '../../config/db.js';
import { repository } from '../../data/repository.js';
import { runMigrations } from '../../data/migrate.mjs';

describe('Admin Audit Service Unit Tests', () => {
  test('1. Redaction of sensitive keys (password, token, hash, secret, otp) at all depths', () => {
    const sensitivePayload = {
      user: {
        id: 'usr-123',
        email: 'user@example.com',
        password: 'my-plain-password',
        password_hash: '$2b$10$abcdef1234567890',
        nested: {
          api_token: 'secret-token-xyz',
          jwtSecret: 'super-secret-key',
          login_otp: '123456',
          safeField: 'This is safe',
        },
      },
      tags: ['audit', 'test'],
      nullField: null,
      numberField: 42,
    };

    const redacted = redactSensitiveData(sensitivePayload);

    assert.strictEqual(redacted.user.id, 'usr-123');
    assert.strictEqual(redacted.user.email, 'user@example.com');
    assert.strictEqual(redacted.user.password, '[REDACTED]');
    assert.strictEqual(redacted.user.password_hash, '[REDACTED]');
    assert.strictEqual(redacted.user.nested.api_token, '[REDACTED]');
    assert.strictEqual(redacted.user.nested.jwtSecret, '[REDACTED]');
    assert.strictEqual(redacted.user.nested.login_otp, '[REDACTED]');
    assert.strictEqual(redacted.user.nested.safeField, 'This is safe');
    assert.deepStrictEqual(redacted.tags, ['audit', 'test']);
    assert.strictEqual(redacted.nullField, null);
    assert.strictEqual(redacted.numberField, 42);
  });

  test('2. Audit record is written inside caller transaction and persists on commit', () => {
    runMigrations();
    const db = initDb();
    const testAdminId = 'usr-admin-seed';

    const result = repository.transaction((txDb) => {
      return logAdminAction(txDb, {
        adminId: testAdminId,
        action: 'user.suspend',
        entityType: 'user',
        entityId: 'usr-target-1',
        before: { status: 'active' },
        after: { status: 'suspended' },
        reason: 'Violation of platform terms',
        req: {
          ip: '192.168.1.100',
          headers: { 'user-agent': 'AntigravityAdminBrowser/1.0' },
        },
      });
    });

    assert.ok(result.id);
    const stored = db.prepare('SELECT * FROM admin_audit_log WHERE id = ?;').get(result.id);
    assert.ok(stored, 'Stored audit log entry should exist');
    assert.strictEqual(stored.admin_id, testAdminId);
    assert.strictEqual(stored.action, 'user.suspend');
    assert.strictEqual(stored.entity_type, 'user');
    assert.strictEqual(stored.entity_id, 'usr-target-1');
    assert.strictEqual(stored.reason, 'Violation of platform terms');
    assert.strictEqual(stored.ip, '192.168.1.100');
    assert.strictEqual(stored.user_agent, 'AntigravityAdminBrowser/1.0');

    const beforeParsed = JSON.parse(stored.before_json);
    const afterParsed = JSON.parse(stored.after_json);
    assert.strictEqual(beforeParsed.status, 'active');
    assert.strictEqual(afterParsed.status, 'suspended');
  });

  test('3. Rollback of caller transaction discards the audit log record atomically', () => {
    runMigrations();
    const db = initDb();
    const testAdminId = 'usr-admin-seed';
    let attemptedAuditId = null;

    try {
      repository.transaction((txDb) => {
        const entry = logAdminAction(txDb, {
          adminId: testAdminId,
          action: 'user.delete',
          entityType: 'user',
          entityId: 'usr-rollback-1',
          before: { status: 'active' },
          reason: 'Test rollback',
        });
        attemptedAuditId = entry.id;

        // Force an error inside the transaction
        throw new Error('SIMULATED_TRANSACTION_FAILURE');
      });
    } catch (err) {
      assert.strictEqual(err.message, 'SIMULATED_TRANSACTION_FAILURE');
    }

    assert.ok(attemptedAuditId);
    const stored = db.prepare('SELECT * FROM admin_audit_log WHERE id = ?;').get(attemptedAuditId);
    assert.strictEqual(stored, undefined, 'Rolled back audit entry must NOT exist in the database');
  });
});
