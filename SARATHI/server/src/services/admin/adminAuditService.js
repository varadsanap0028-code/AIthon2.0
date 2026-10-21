/**
 * SARATHI Admin Portal — Tamper-Evident Admin Audit Logging Service
 * PRD Phase 10
 * Cryptographic SHA-256 hash-chaining, audit verification, and immutable trail.
 */

import { randomUUID as uuidv4, createHash } from 'node:crypto';
import { initDb } from '../../config/db.js';

const SENSITIVE_KEY_PATTERN = /password|token|hash|secret|otp/i;
export const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

/**
 * Deeply traverses an object or array and redacts values whose keys match sensitive terms.
 */
export function redactSensitiveData(value) {
  if (value === null || value === undefined) return value;
  if (typeof value !== 'object') return value;

  if (Array.isArray(value)) {
    return value.map((item) => redactSensitiveData(item));
  }

  const redacted = {};
  for (const [key, val] of Object.entries(value)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      redacted[key] = '[REDACTED]';
    } else if (typeof val === 'object' && val !== null) {
      redacted[key] = redactSensitiveData(val);
    } else {
      redacted[key] = val;
    }
  }

  return redacted;
}

/**
 * Canonical JSON serializer ensuring deterministic key order for hashing.
 */
export function canonicalJson(obj) {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return `[${obj.map((item) => canonicalJson(item)).join(',')}]`;
  }
  const keys = Object.keys(obj).sort();
  const pairs = keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(obj[k])}`);
  return `{${pairs.join(',')}}`;
}

/**
 * Compute SHA-256 hex digest.
 */
export function sha256(str) {
  return createHash('sha256').update(str, 'utf8').digest('hex');
}

/**
 * Extract client IP from an Express request object.
 */
export function extractClientIp(req) {
  if (!req) return null;
  const forwarded = req.headers?.['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || null;
}

/**
 * Compute hash of an audit record given its previous hash.
 */
export function computeAuditHash(prevHash, payload) {
  const serialized = canonicalJson({
    id: payload.id,
    admin_id: payload.admin_id,
    action: payload.action,
    entity_type: payload.entity_type,
    entity_id: payload.entity_id || null,
    before_json: payload.before_json || null,
    after_json: payload.after_json || null,
    reason: payload.reason || null,
    ip: payload.ip || null,
    user_agent: payload.user_agent || null,
    created_at: payload.created_at,
  });
  return sha256(`${prevHash}:${serialized}`);
}

/**
 * Logs an administrative mutation into admin_audit_log with SHA-256 hash chaining.
 */
export function logAdminAction(txOrDb, {
  adminId,
  action,
  entityType,
  entityId = null,
  before = null,
  after = null,
  reason = null,
  req = null,
}) {
  if (!adminId) throw new Error('adminId is required for admin audit logging');
  if (!action || typeof action !== 'string') throw new Error('action must be in entity.verb format');
  if (!entityType || typeof entityType !== 'string') throw new Error('entityType is required');

  const db = txOrDb?.prepare ? txOrDb : initDb();
  const id = `aud-${uuidv4()}`;
  const createdAt = new Date().toISOString();

  const redactedBefore = before !== null ? redactSensitiveData(before) : null;
  const redactedAfter = after !== null ? redactSensitiveData(after) : null;

  const beforeJson = redactedBefore !== null ? JSON.stringify(redactedBefore) : null;
  const afterJson = redactedAfter !== null ? JSON.stringify(redactedAfter) : null;

  const ip = extractClientIp(req);
  const userAgent = req?.headers?.['user-agent'] || null;

  // Retrieve latest row to chain hash
  let prevHash = GENESIS_HASH;
  try {
    sealHistoricalAuditLogs(db);
    const latest = db.prepare(`SELECT hash FROM admin_audit_log WHERE hash IS NOT NULL ORDER BY rowid DESC LIMIT 1`).get();
    if (latest && latest.hash) {
      prevHash = latest.hash;
    }
  } catch {}

  const payload = {
    id,
    admin_id: adminId,
    action,
    entity_type: entityType,
    entity_id: entityId ? String(entityId) : null,
    before_json: beforeJson,
    after_json: afterJson,
    reason: reason ? String(reason) : null,
    ip,
    user_agent: userAgent,
    created_at: createdAt,
  };

  const hash = computeAuditHash(prevHash, payload);

  const sql = `
    INSERT INTO admin_audit_log (
      id, admin_id, action, entity_type, entity_id,
      before_json, after_json, reason, ip, user_agent, prev_hash, hash, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
  `;

  db.prepare(sql).run(
    id,
    adminId,
    action,
    entityType,
    payload.entity_id,
    beforeJson,
    afterJson,
    payload.reason,
    ip,
    userAgent,
    prevHash,
    hash,
    createdAt
  );

  return {
    id,
    adminId,
    action,
    entityType,
    entityId,
    before: redactedBefore,
    after: redactedAfter,
    reason,
    prevHash,
    hash,
    createdAt,
  };
}

/**
 * Backfill legacy unhashed audit logs into an unbroken chain.
 */
export function sealHistoricalAuditLogs(dbOrTx = null, force = false) {
  const db = dbOrTx?.prepare ? dbOrTx : initDb();
  if (!force) {
    const unhashed = db.prepare(`SELECT count(*) as c FROM admin_audit_log WHERE hash IS NULL`).get().c;
    if (unhashed === 0) return;
  }

  const rows = db.prepare(`
    SELECT rowid, id, admin_id, action, entity_type, entity_id,
           before_json, after_json, reason, ip, user_agent,
           prev_hash, hash, created_at
    FROM admin_audit_log
    ORDER BY rowid ASC
  `).all();

  let prev = GENESIS_HASH;
  const update = db.prepare(`UPDATE admin_audit_log SET prev_hash = ?, hash = ? WHERE id = ?`);

  for (const r of rows) {
    const expectedHash = computeAuditHash(prev, r);
    update.run(prev, expectedHash, r.id);
    prev = expectedHash;
  }
}

/**
 * Verify cryptographic hash chain integrity across all audit records.
 */
export function verifyAuditChain(dbOrTx = null) {
  const db = dbOrTx?.prepare ? dbOrTx : initDb();
  sealHistoricalAuditLogs(db);
  const rows = db.prepare(`
    SELECT id, admin_id, action, entity_type, entity_id,
           before_json, after_json, reason, ip, user_agent,
           prev_hash, hash, created_at
    FROM admin_audit_log
    ORDER BY rowid ASC
  `).all();

  if (rows.length === 0) {
    return { ok: true, checked: 0, headHash: GENESIS_HASH, firstBrokenId: null };
  }

  let expectedPrevHash = GENESIS_HASH;

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    // Check prev_hash matches
    if (r.prev_hash && r.prev_hash !== expectedPrevHash) {
      return {
        ok: false,
        checked: i,
        firstBrokenId: r.id,
        reason: `Mismatched prev_hash on record #${i + 1} (${r.id}). Expected ${expectedPrevHash}, found ${r.prev_hash}`,
      };
    }

    // Recompute current hash
    const expectedHash = computeAuditHash(expectedPrevHash, r);
    if (r.hash && r.hash !== expectedHash) {
      return {
        ok: false,
        checked: i,
        firstBrokenId: r.id,
        reason: `Hash mismatch on record #${i + 1} (${r.id}). Expected ${expectedHash}, found ${r.hash}`,
      };
    }

    expectedPrevHash = r.hash || expectedHash;
  }

  return {
    ok: true,
    checked: rows.length,
    headHash: expectedPrevHash,
    firstBrokenId: null,
  };
}

/**
 * List audit log records with filtering, pagination, and diff parsing.
 */
export function listAuditLogs({
  action = '',
  adminId = '',
  entityType = '',
  q = '',
  page = 1,
  pageSize = 25,
} = {}) {
  const db = initDb();
  const pageNum = Math.max(1, Number(page) || 1);
  const limit = Math.max(1, Math.min(100, Number(pageSize) || 25));
  const offset = (pageNum - 1) * limit;

  const where = [];
  const params = [];

  if (action && action.trim()) {
    where.push('l.action LIKE ?');
    params.push(`${action.trim()}%`);
  }
  if (adminId && adminId.trim()) {
    where.push('l.admin_id = ?');
    params.push(adminId.trim());
  }
  if (entityType && entityType.trim()) {
    where.push('l.entity_type = ?');
    params.push(entityType.trim());
  }
  if (q && q.trim()) {
    where.push('(l.action LIKE ? OR l.reason LIKE ? OR l.entity_id LIKE ? OR u.full_name LIKE ?)');
    const pattern = `%${q.trim()}%`;
    params.push(pattern, pattern, pattern, pattern);
  }

  const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

  const total = db.prepare(`
    SELECT count(*) as c
    FROM admin_audit_log l
    LEFT JOIN users u ON l.admin_id = u.id
    ${whereClause}
  `).get(...params).c;

  const rows = db.prepare(`
    SELECT l.id, l.admin_id, l.action, l.entity_type, l.entity_id,
           l.before_json, l.after_json, l.reason, l.ip, l.user_agent,
           l.prev_hash, l.hash, l.created_at,
           u.full_name as admin_name, u.email as admin_email
    FROM admin_audit_log l
    LEFT JOIN users u ON l.admin_id = u.id
    ${whereClause}
    ORDER BY l.rowid DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  return {
    logs: rows.map((r) => {
      let before = null;
      let after = null;
      try { if (r.before_json) before = JSON.parse(r.before_json); } catch {}
      try { if (r.after_json) after = JSON.parse(r.after_json); } catch {}
      return {
        id: r.id,
        adminId: r.admin_id,
        adminName: r.admin_name || 'System Admin',
        adminEmail: r.admin_email || '',
        action: r.action,
        entityType: r.entity_type,
        entityId: r.entity_id,
        before,
        after,
        reason: r.reason,
        ip: r.ip,
        prevHash: r.prev_hash,
        hash: r.hash,
        createdAt: r.created_at,
      };
    }),
    total,
    page: pageNum,
    pageSize: limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Export audit log records as CSV with formula injection protection.
 */
export function exportAuditCsv(cap = 50000) {
  const db = initDb();
  const rows = db.prepare(`
    SELECT l.id, l.admin_id, u.full_name as admin_name, l.action, l.entity_type, l.entity_id,
           l.reason, l.ip, l.prev_hash, l.hash, l.created_at
    FROM admin_audit_log l
    LEFT JOIN users u ON l.admin_id = u.id
    ORDER BY l.rowid DESC
    LIMIT ?
  `).all(cap);

  const escapeCsv = (val) => {
    if (val === null || val === undefined) return '""';
    let str = String(val);
    // Formula injection protection
    if (/^[=+\-@\t\r]/.test(str)) {
      str = `'${str}`;
    }
    return `"${str.replace(/"/g, '""')}"`;
  };

  const headers = ['ID', 'Admin Name', 'Admin ID', 'Action', 'Entity Type', 'Entity ID', 'Reason', 'IP', 'Prev Hash', 'Hash', 'Timestamp'];
  const lines = [headers.join(',')];

  rows.forEach((r) => {
    lines.push([
      escapeCsv(r.id),
      escapeCsv(r.admin_name || 'Admin'),
      escapeCsv(r.admin_id),
      escapeCsv(r.action),
      escapeCsv(r.entity_type),
      escapeCsv(r.entity_id),
      escapeCsv(r.reason),
      escapeCsv(r.ip),
      escapeCsv(r.prev_hash),
      escapeCsv(r.hash),
      escapeCsv(r.created_at),
    ].join(','));
  });

  return lines.join('\n');
}
