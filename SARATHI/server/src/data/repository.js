import { getDb } from '../config/db.js';

export const repository = {
  query(sql, params = []) {
    const db = getDb();
    const stmt = db.prepare(sql);
    return stmt.all(...params);
  },

  queryAll(sql, params = []) {
    return this.query(sql, params);
  },

  queryOne(sql, params = []) {
    const db = getDb();
    const stmt = db.prepare(sql);
    return stmt.get(...params) || null;
  },

  execute(sql, params = []) {
    const db = getDb();
    const stmt = db.prepare(sql);
    return stmt.run(...params);
  },

  transaction(callback) {
    const db = getDb();
    db.exec('BEGIN IMMEDIATE;');
    try {
      const result = callback(this);
      db.exec('COMMIT;');
      return result;
    } catch (err) {
      try {
        db.exec('ROLLBACK;');
      } catch {
        // ignore if already rolled back
      }
      throw err;
    }
  }
};
