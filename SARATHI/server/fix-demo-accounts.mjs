/**
 * fix-demo-accounts.mjs
 * Permanently resets all suspended user accounts to 'active' in the SQLite database.
 * Uses Node.js built-in node:sqlite (Node 22+).
 * Run with: node fix-demo-accounts.mjs  (from inside the server/ directory)
 */
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, 'data', 'database.db');

if (!fs.existsSync(DB_PATH)) {
  console.error('❌ Database not found at:', DB_PATH);
  process.exit(1);
}

const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA busy_timeout = 5000;');
db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA journal_mode = WAL;');

const demoEmails = [
  'student@sarathi.ai',
  'recruiter@sarathi.ai',
  'admin@apex.edu',
  'admin@sarathi.dev',
];

console.log('🔧 Fixing account statuses...\n');

// Reset ALL suspended accounts to active
const fixAll = db.prepare(`
  UPDATE users 
  SET status = 'active', updated_at = datetime('now')
  WHERE status != 'active'
`);
const result = fixAll.run();
console.log(`✅ Reset ${result.changes} account(s) to 'active'\n`);

// Verify demo accounts
const placeholders = demoEmails.map(() => '?').join(',');
const users = db.prepare(`
  SELECT email, role, status FROM users 
  WHERE email IN (${placeholders})
  ORDER BY role
`).all(...demoEmails);

console.log('Demo account statuses:');
users.forEach(u => {
  const icon = u.status === 'active' ? '✅' : '❌';
  console.log(`  ${icon} ${u.email} (${u.role}) → ${u.status}`);
});

// Summary
const counts = db.prepare(`SELECT status, COUNT(*) as cnt FROM users GROUP BY status`).all();
console.log('\nAll users by status:');
counts.forEach(c => console.log(`  ${c.status ?? 'null'}: ${c.cnt}`));

db.close();
console.log('\n✨ Done! Restart your backend server for changes to take effect.');
