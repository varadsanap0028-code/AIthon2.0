import bcrypt from 'bcryptjs';
import { getDb } from '../server/src/config/db.js';

async function main() {
  const db = getDb();
  const hash = await bcrypt.hash('password123', 10);
  
  db.prepare(`
    UPDATE users 
    SET status = 'active', password_hash = ?, role = 'platform_admin'
    WHERE email IN ('admin@sarathi.dev', 'admin@sarathi.ai', 'unit-admin@sarathi.dev');
  `).run(hash);

  const admins = db.prepare(`
    SELECT id, email, role, status FROM users WHERE role = 'platform_admin';
  `).all();

  console.log('[ACTIVATE ADMIN] Current platform admins:');
  console.table(admins);
}

main().catch(console.error);
