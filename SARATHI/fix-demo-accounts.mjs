/**
 * fix-demo-accounts.mjs
 * Permanently resets all demo/seed user accounts to 'active' status in the SQLite database.
 * Run with: node fix-demo-accounts.mjs
 */
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, 'data', 'database.db');

if (!fs.existsSync(DB_PATH)) {
  console.error('❌ Database not found at:', DB_PATH);
  process.exit(1);
}

const db = new Database(DB_PATH);

// Demo accounts that should always be active
const demoEmails = [
  'student@sarathi.ai',
  'recruiter@sarathi.ai',
  'admin@apex.edu',
  'admin@sarathi.dev',
];

console.log('🔧 Fixing demo account statuses...\n');

const stmt = db.prepare(`
  UPDATE users 
  SET status = 'active', updated_at = datetime('now')
  WHERE email = ? AND status != 'active'
`);

// Also fix ALL suspended users (since this is a dev/demo environment)
const fixAll = db.prepare(`
  UPDATE users 
  SET status = 'active', updated_at = datetime('now')
  WHERE status = 'suspended' OR status IS NULL
`);

const result = fixAll.run();
console.log(`✅ Reset ${result.changes} suspended/null accounts to 'active'\n`);

// Verify
const users = db.prepare(`
  SELECT email, role, status FROM users 
  WHERE email IN (${demoEmails.map(() => '?').join(',')})
  ORDER BY role
`).all(...demoEmails);

console.log('Demo account statuses after fix:');
users.forEach(u => {
  const icon = u.status === 'active' ? '✅' : '❌';
  console.log(`  ${icon} ${u.email} (${u.role}) → ${u.status}`);
});

db.close();
console.log('\n✨ Done! Restart your server to apply changes.');
