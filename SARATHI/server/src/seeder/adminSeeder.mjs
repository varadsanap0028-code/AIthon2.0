import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { app as appConfig, auth as authConfig } from '../config/index.js';
import { initDb, closeDb } from '../config/db.js';
import { runMigrations } from '../data/migrate.mjs';

export async function seedAdmin(dbFile) {
  runMigrations(dbFile);
  const db = initDb(dbFile);

  const isProd = appConfig.env === 'production' || process.env.NODE_ENV === 'production';
  const email = (process.env.ADMIN_SEED_EMAIL || 'admin@sarathi.dev').toLowerCase().trim();
  let password = process.env.ADMIN_SEED_PASSWORD;
  let generatedPassword = null;

  if (isProd) {
    if (!password || password.length < 12) {
      throw new Error(
        'FATAL: ADMIN_SEED_PASSWORD must be configured with at least 12 characters in production mode.'
      );
    }
  } else {
    if (!password) {
      generatedPassword = randomBytes(12).toString('base64url');
      password = generatedPassword;
    }
  }

  const now = new Date().toISOString();
  const passwordHash = await bcrypt.hash(password, 10);

  const existing = db.prepare('SELECT id, email, role, status FROM users WHERE email = ?;').get(email);

  if (existing) {
    db.prepare(`
      UPDATE users 
      SET role = 'platform_admin',
          status = 'active',
          password_hash = ?,
          updated_at = ?
      WHERE id = ?;
    `).run(passwordHash, now, existing.id);

    console.log(`[SEED:ADMIN] Existing user "${email}" elevated to active platform_admin (ID: ${existing.id}).`);
  } else {
    const adminId = 'usr-admin-seed';
    db.prepare(`
      INSERT INTO users (
        id, email, password_hash, full_name, role, status, company_name, institution, timezone, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'platform_admin', 'active', 'SARATHI Platform', 'SARATHI Central', 'Asia/Kolkata', ?, ?);
    `).run(adminId, email, passwordHash, 'Platform Administrator', now, now);

    console.log(`[SEED:ADMIN] Platform admin created with email "${email}" (ID: ${adminId}).`);
  }

  if (generatedPassword) {
    console.log('================================================================');
    console.log('[SEED:ADMIN] One-time generated password for development:');
    console.log(`Email:    ${email}`);
    console.log(`Password: ${generatedPassword}`);
    console.log('================================================================');
  }

  return { email, status: 'active', role: 'platform_admin' };
}

// Direct execution CLI entry
if (process.argv[1]?.endsWith('adminSeeder.mjs') || process.argv[1]?.includes('adminSeeder')) {
  try {
    await seedAdmin();
    process.exit(0);
  } catch (err) {
    console.error('[SEED:ADMIN] Error:', err.message);
    process.exit(1);
  } finally {
    closeDb();
  }
}
