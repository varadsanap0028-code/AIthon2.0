#!/usr/bin/env node
/**
 * SARATHI Admin Portal — Automated Demo Environment Seeder
 * PRD Phase 11
 *
 * One-command idempotent bootstrapping:
 * 1. Runs database schema migrations
 * 2. Seeds baseline platform data (skills, roles, questions, colleges, recruiters)
 * 3. Creates/elevates platform administrator (admin@sarathi.dev / password123)
 * 4. Seeds rich admin demo data (historical user growth, 300+ assessments, integrity anomalies,
 *    recruiter verification submissions, support desk tickets & announcements)
 * 5. Prints ready-to-use access credentials and portal direct URLs
 */

import { runMigrations } from '../server/src/data/migrate.mjs';
import { runSeeder } from '../server/src/seeder/seeder.mjs';
import { seedAdmin } from '../server/src/seeder/adminSeeder.mjs';
import { runAdminDemoSeeder } from '../server/src/seeder/adminDemoSeeder.mjs';
import { initDb, closeDb } from '../server/src/config/db.js';
import bcrypt from 'bcryptjs';

async function runDemoAdminBootstrap() {
  console.log('\x1b[36m%s\x1b[0m', '===============================================================');
  console.log('\x1b[36m%s\x1b[0m', '   SARATHI Platform Admin — Demo Environment Bootstrapper      ');
  console.log('\x1b[36m%s\x1b[0m', '===============================================================\n');

  try {
    // 1. Run Migrations
    console.log('📦 Step 1/4: Running database migrations to schema v16...');
    runMigrations();
    console.log('   ✅ Database schema up-to-date.\n');

    // 2. Base Platform Seed
    console.log('🌱 Step 2/4: Verifying baseline platform seeds...');
    await runSeeder();
    console.log('   ✅ Core platform entities seeded.\n');

    // 3. Admin User Guarantee
    console.log('🛡️  Step 3/4: Provisioning Platform Administrator account...');
    process.env.ADMIN_SEED_EMAIL = 'admin@sarathi.dev';
    process.env.ADMIN_SEED_PASSWORD = 'password123';
    await seedAdmin();

    // Ensure fixed known password for local demo convenience
    const db = initDb();
    const hash = await bcrypt.hash('password123', 10);
    db.prepare(`UPDATE users SET password_hash = ?, status = 'active' WHERE email = 'admin@sarathi.dev';`).run(hash);
    console.log('   ✅ Administrator credentials verified.\n');

    // 4. Admin Demo Data (Integrity, Analytics, Approvals, Tickets)
    console.log('📊 Step 4/4: Seeding full admin demo data (anomalies, SLA queues, telemetry)...');
    await runAdminDemoSeeder({ force: true, userCount: 150 });
    console.log('   ✅ Admin demo fixtures populated.\n');

    console.log('\x1b[32m%s\x1b[0m', '===============================================================');
    console.log('\x1b[32m%s\x1b[0m', '   🎉 SARATHI ADMIN PORTAL READY FOR DEMONSTRATION & REVIEW   ');
    console.log('\x1b[32m%s\x1b[0m', '===============================================================');
    console.log('');
    console.log('\x1b[1mPortal Login Credentials:\x1b[0m');
    console.log('  URL:      \x1b[34mhttp://localhost:5173/login\x1b[0m');
    console.log('  Email:    \x1b[33madmin@sarathi.dev\x1b[0m');
    console.log('  Password: \x1b[33mpassword123\x1b[0m');
    console.log('  Direct:   \x1b[34mhttp://localhost:5173/admin\x1b[0m');
    console.log('');
    console.log('\x1b[1mAvailable Admin Modules:\x1b[0m');
    console.log('  • Overview Dashboard:    http://localhost:5173/admin');
    console.log('  • Analytics & Insights:  http://localhost:5173/admin/insights');
    console.log('  • Admin Copilot:         http://localhost:5173/admin/copilot (or Ctrl+J)');
    console.log('  • User Directory:        http://localhost:5173/admin/users');
    console.log('  • Recruiter Approvals:   http://localhost:5173/admin/approvals');
    console.log('  • Test Integrity Review: http://localhost:5173/admin/integrity');
    console.log('  • Content Catalog:       http://localhost:5173/admin/content');
    console.log('  • Support Desk:          http://localhost:5173/admin/support');
    console.log('  • Announcements:         http://localhost:5173/admin/announcements');
    console.log('  • System Health:         http://localhost:5173/admin/system');
    console.log('  • Feature Switches:      http://localhost:5173/admin/settings');
    console.log('  • Tamper Audit Ledger:   http://localhost:5173/admin/audit');
    console.log('');
    console.log('\x1b[90mCommand Palette: Press Ctrl+K (or Cmd+K) anywhere inside admin to jump.\x1b[0m');
    console.log('===============================================================\n');

    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to bootstrap admin demo environment:', err);
    process.exit(1);
  } finally {
    closeDb();
  }
}

runDemoAdminBootstrap();
