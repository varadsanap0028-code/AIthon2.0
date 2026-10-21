import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { paths } from './index.js';

let db = null;

export function initDb(dbFile = paths.dbFile) {
  if (db) return db;

  if (dbFile && dbFile !== ':memory:') {
    mkdirSync(dirname(dbFile), { recursive: true });
    db = new DatabaseSync(dbFile);
  } else {
    db = new DatabaseSync(':memory:');
  }

  // Enable busy timeout first, then foreign key constraints and WAL mode
  db.exec('PRAGMA busy_timeout = 5000;');
  db.exec('PRAGMA foreign_keys = ON;');
  try {
    db.exec('PRAGMA journal_mode = WAL;');
  } catch {}

  return db;
}

export function getDb() {
  if (!db) {
    return initDb();
  }
  return db;
}

export function closeDb() {
  if (db) {
    try {
      db.close();
    } catch {
      // ignore on exit
    }
    db = null;
  }
}
