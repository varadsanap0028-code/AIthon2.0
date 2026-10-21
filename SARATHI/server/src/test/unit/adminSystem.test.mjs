/**
 * SARATHI Admin Portal — Phase 10: System Operations & Audit Unit Tests
 */

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { initDb } from '../../config/db.js';
import {
  logAdminAction,
  verifyAuditChain,
  sealHistoricalAuditLogs,
  GENESIS_HASH,
} from '../../services/admin/adminAuditService.js';
import { featureFlagService } from '../../services/admin/featureFlagService.js';
import { metricsCollector } from '../../middleware/requestMetricsMiddleware.js';

describe('Phase 10: System Operations, Switches & Tamper-Evident Audit Unit Tests', () => {
  const db = initDb();

  before(() => {
    sealHistoricalAuditLogs(db, true);
  });

  describe('Cryptographic Hash Chain & Tamper Evidence', () => {
    it('1. Appends audit log with sha256 hash chaining and verifies chain validity', () => {
      const adminId = 'usr-admin-seed';

      // Insert 3 records
      const r1 = logAdminAction(db, {
        adminId,
        action: 'system.probe_test_1',
        entityType: 'test_entity',
        entityId: 'e-1',
        before: { val: 1 },
        after: { val: 2 },
        reason: 'Test action 1',
      });
      assert.ok(r1.hash);
      assert.ok(r1.prevHash);

      const r2 = logAdminAction(db, {
        adminId,
        action: 'system.probe_test_2',
        entityType: 'test_entity',
        entityId: 'e-2',
        before: { val: 2 },
        after: { val: 3 },
        reason: 'Test action 2',
      });
      assert.equal(r2.prevHash, r1.hash);

      const r3 = logAdminAction(db, {
        adminId,
        action: 'system.probe_test_3',
        entityType: 'test_entity',
        entityId: 'e-3',
        before: { val: 3 },
        after: { val: 4 },
        reason: 'Test action 3',
      });
      assert.equal(r3.prevHash, r2.hash);

      // Verify chain
      const verification = verifyAuditChain(db);
      assert.equal(verification.ok, true);
      assert.ok(verification.checked >= 3);
      assert.ok(verification.headHash);
    });

    it('2. Detects tampering when an existing audit record is altered', () => {
      // Find the latest inserted row to tamper with
      const row = db.prepare("SELECT id, reason FROM admin_audit_log WHERE action = 'system.probe_test_2' ORDER BY rowid DESC LIMIT 1").get();
      assert.ok(row);

      const originalReason = row.reason;
      // Tamper reason directly in SQLite without updating hash
      db.prepare('UPDATE admin_audit_log SET reason = ? WHERE id = ?').run('TAMPERED REASON', row.id);

      const verification = verifyAuditChain(db);
      assert.equal(verification.ok, false);
      assert.equal(verification.firstBrokenId, row.id);

      // Restore original reason
      db.prepare('UPDATE admin_audit_log SET reason = ? WHERE id = ?').run(originalReason, row.id);
      const restoredVerification = verifyAuditChain(db);
      assert.equal(restoredVerification.ok, true);
    });
  });

  describe('Feature Flag Switch Service', () => {
    it('3. Respects default fallback for non-existent flags', () => {
      assert.equal(featureFlagService.isEnabled('non_existent_flag_xyz', true), true);
      assert.equal(featureFlagService.isEnabled('non_existent_flag_xyz', false), false);
    });

    it('4. Toggles feature flag, updates database, and immediately invalidates cache', () => {
      const adminId = 'usr-admin-seed';
      featureFlagService.setFlag('test_feature_alpha', true, adminId, 'Enable alpha test');
      assert.equal(featureFlagService.isEnabled('test_feature_alpha'), true);

      featureFlagService.setFlag('test_feature_alpha', false, adminId, 'Disable alpha test');
      assert.equal(featureFlagService.isEnabled('test_feature_alpha'), false);

      // Cleanup
      db.prepare('DELETE FROM feature_flags WHERE key = ?').run('test_feature_alpha');
    });
  });

  describe('Metrics Ring Buffer Overhead', () => {
    it('5. Metrics recording has < 0.5ms overhead and maintains bounded memory', () => {
      const fakeReq = { baseUrl: '/api/admin', path: '/api/admin/users', method: 'GET', url: '/api/admin/users' };
      const fakeRes = { statusCode: 200 };

      const t0 = performance.now();
      for (let i = 0; i < 1000; i++) {
        metricsCollector.record(fakeReq, fakeRes, 12.5);
      }
      const t1 = performance.now();
      const avgMs = (t1 - t0) / 1000;
      assert.ok(avgMs < 0.5, `Average recording time ${avgMs}ms should be < 0.5ms`);

      const metrics = metricsCollector.getMetrics();
      assert.ok(metrics.series.length <= 15);
      assert.ok(metrics.totalRequestsLast15m >= 1000);
    });
  });
});
