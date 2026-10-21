#!/usr/bin/env node
/**
 * SARATHI Admin Portal — End-to-End Smoke Test Script
 * PRD Phase 11
 *
 * Validates that all administrative API surfaces respond with HTTP 200 and expected schemas.
 * Can run against a live running dev server or autonomously spins up an ephemeral instance.
 */

import { initDb } from '../server/src/config/db.js';
import { authService } from '../server/src/services/authService.js';
import app from '../server/src/index.js';

async function runSmokeTests() {
  console.log('🚀 Running SARATHI Admin Smoke Test Suite...\n');

  let serverInstance = null;
  let baseUrl = process.env.BASE_URL || 'http://127.0.0.1:4000';

  // Check if live server is reachable, otherwise spin up ephemeral listener
  try {
    const probe = await fetch(`${baseUrl}/health`, { signal: AbortSignal.timeout(1000) });
    if (!probe.ok && probe.status !== 404) throw new Error('Unhealthy');
    console.log(`📡 Connected to live server at ${baseUrl}`);
  } catch {
    console.log('🔄 No live server detected on port 4000. Launching ephemeral in-memory server...');
    await new Promise((resolve) => {
      serverInstance = app.listen(0, '127.0.0.1', () => {
        const port = serverInstance.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        console.log(`📡 Ephemeral server running at ${baseUrl}`);
        resolve();
      });
    });
  }

  // Obtain admin authentication token
  const db = initDb();
  let adminUser = db.prepare(`SELECT * FROM users WHERE role = 'platform_admin' AND status = 'active' LIMIT 1;`).get();

  if (!adminUser) {
    console.log('⚠️ No active platform_admin found in DB. Seeding temporary admin credentials...');
    const now = new Date().toISOString();
    const hash = await authService.hashPassword('password123');
    const adminId = `usr-smoke-admin-${Date.now()}`;
    db.prepare(`
      INSERT INTO users (id, email, password_hash, full_name, role, status, email_verified, created_at, updated_at)
      VALUES (?, 'smoke-admin@sarathi.dev', ?, 'Smoke Test Admin', 'platform_admin', 'active', 1, ?, ?);
    `).run(adminId, hash, now, now);
    adminUser = db.prepare(`SELECT * FROM users WHERE id = ?;`).get(adminId);
  }

  const token = authService.generateToken(adminUser);
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
  };

  const tests = [
    { name: 'Overview Dashboard Metrics', url: '/api/admin/analytics/overview', validate: (d) => d.kpis && d.series },
    { name: 'System Request Telemetry', url: '/api/admin/system/metrics', validate: (d) => typeof d.totalRequestsLast15m === 'number' },
    { name: 'User Management Directory', url: '/api/admin/users?page=1&pageSize=5', validate: (d) => Array.isArray(d.items) },
    { name: 'Recruiter Approvals Stats', url: '/api/admin/approvals/stats', validate: (d) => typeof d.pendingCount === 'number' },
    { name: 'Test Integrity Statistics', url: '/api/admin/integrity/stats', validate: (d) => typeof d.unreviewedHighRisk === 'number' },
    { name: 'Content Taxonomy Domains', url: '/api/admin/content/domains', validate: (d) => Array.isArray(d.domains) },
    { name: 'Support Tickets Stats', url: '/api/admin/support/tickets/stats', validate: (d) => typeof d.openCount === 'number' },
    { name: 'Platform Announcements', url: '/api/admin/announcements/announcements', validate: (d) => Array.isArray(d.announcements) },
    { name: 'Insights OLS Forecast', url: '/api/admin/insights/forecast?metric=applications&horizon=7', validate: (d) => Array.isArray(d.forecast) },
    { name: 'Admin Copilot Sessions', url: '/api/admin/copilot/sessions', validate: (d) => Array.isArray(d.sessions) },
    { name: 'System Probes & Health', url: '/api/admin/system/health', validate: (d) => d.status && d.database },
    { name: 'Feature Switches & Flags', url: '/api/admin/flags', validate: (d) => Array.isArray(d.flags) },
    { name: 'Audit Ledger Records', url: '/api/admin/audit?pageSize=5', validate: (d) => Array.isArray(d.logs) },
    { name: 'Audit Cryptographic Verification', url: '/api/admin/audit/verify', validate: (d) => typeof d.ok === 'boolean' && typeof d.checked === 'number' },
  ];

  let failedCount = 0;

  for (const t of tests) {
    const start = performance.now();
    try {
      const res = await fetch(`${baseUrl}${t.url}`, { headers });
      const elapsed = Math.round(performance.now() - start);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText}`);
      }

      const json = await res.json();
      if (!t.validate(json)) {
        throw new Error('Response failed schema validation assertion');
      }

      console.log(`  ✅ ${t.name.padEnd(35)} [${res.status}] (${elapsed}ms)`);
    } catch (err) {
      failedCount++;
      const elapsed = Math.round(performance.now() - start);
      console.error(`  ❌ ${t.name.padEnd(35)} FAILED (${elapsed}ms): ${err.message}`);
    }
  }

  if (serverInstance) {
    await new Promise((r) => serverInstance.close(r));
  }

  console.log('\n---------------------------------------------------------');
  if (failedCount === 0) {
    console.log('🎉 ALL ADMIN SMOKE TESTS PASSED! Portal is production healthy.\n');
    process.exit(0);
  } else {
    console.error(`💥 ${failedCount} ADMIN SMOKE TEST(S) FAILED.\n`);
    process.exit(1);
  }
}

runSmokeTests().catch((err) => {
  console.error('Fatal smoke test runner error:', err);
  process.exit(1);
});
