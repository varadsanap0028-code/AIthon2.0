/**
 * SARATHI Admin Portal — Feature Flag & Switch Service
 * PRD Phase 10
 * High-performance cached flag evaluation with fallback to environment/defaults.
 */

import { initDb } from '../../config/db.js';
import { logAdminAction } from './adminAuditService.js';

const CACHE_TTL_MS = 10 * 1000; // 10s TTL
let flagCache = null;
let lastCacheTime = 0;

export const DEFAULT_FEATURE_FLAGS = [
  {
    key: 'signups_open',
    enabled: 1,
    description: 'Controls public student, recruiter, and college registration.',
  },
  {
    key: 'recruiter_requires_verification',
    enabled: 1,
    description: 'Requires platform admin verification before recruiters can post jobs or view full applicant profiles.',
  },
  {
    key: 'assessment_engine',
    enabled: 1,
    description: 'Enables automated coding, MCQ, and technical assessments.',
  },
  {
    key: 'camera_proctoring',
    enabled: 1,
    description: 'Enables camera and proctoring anomaly checks during secure tests.',
  },
  {
    key: 'ai_copilot',
    enabled: 1,
    description: 'Enables Platform Admin Copilot assistant and slide-over.',
  },
  {
    key: 'ai_chatbot',
    enabled: 1,
    description: 'Enables student-facing AI career assistant chatbot.',
  },
  {
    key: 'maintenance_mode',
    enabled: 0,
    description: 'Suspends non-admin traffic with 503 MAINTENANCE while keeping admin access open.',
  },
];

export class FeatureFlagService {
  constructor(db = null) {
    this.db = db || initDb();
    this.ensureSeed();
  }

  ensureSeed() {
    const check = this.db.prepare(`SELECT count(*) as c FROM feature_flags`).get();
    if (check.c === 0) {
      const now = new Date().toISOString();
      const insert = this.db.prepare(`
        INSERT INTO feature_flags (key, enabled, description, updated_at)
        VALUES (?, ?, ?, ?)
      `);
      DEFAULT_FEATURE_FLAGS.forEach((f) => {
        try {
          insert.run(f.key, f.enabled, f.description, now);
        } catch {}
      });
    }
  }

  async refreshCache() {
    const rows = this.db.prepare(`SELECT * FROM feature_flags`).all();
    const map = new Map();
    rows.forEach((r) => map.set(r.key, Boolean(r.enabled)));
    flagCache = map;
    lastCacheTime = Date.now();
  }

  isEnabled(key, envFallback = true) {
    const now = Date.now();
    if (!flagCache || now - lastCacheTime > CACHE_TTL_MS) {
      try {
        const rows = this.db.prepare(`SELECT * FROM feature_flags`).all();
        const map = new Map();
        rows.forEach((r) => map.set(r.key, Boolean(r.enabled)));
        flagCache = map;
        lastCacheTime = now;
      } catch {
        return envFallback;
      }
    }

    if (flagCache.has(key)) {
      return flagCache.get(key);
    }
    return envFallback;
  }

  getAllFlags() {
    return this.db.prepare(`
      SELECT f.key, f.enabled, f.description, f.updated_by, f.updated_at,
             u.full_name as updated_by_name
      FROM feature_flags f
      LEFT JOIN users u ON f.updated_by = u.id
      ORDER BY f.key ASC
    `).all();
  }

  setFlag(key, enabled, adminId, reason = 'Administrative switch update', req = null) {
    const existing = this.db.prepare(`SELECT * FROM feature_flags WHERE key = ?`).get(key);
    const now = new Date().toISOString();
    const boolVal = enabled ? 1 : 0;

    if (existing) {
      this.db.prepare(`
        UPDATE feature_flags
        SET enabled = ?, updated_by = ?, updated_at = ?
        WHERE key = ?
      `).run(boolVal, adminId, now, key);
    } else {
      this.db.prepare(`
        INSERT INTO feature_flags (key, enabled, description, updated_by, updated_at)
        VALUES (?, ?, 'Custom feature switch', ?, ?)
      `).run(key, boolVal, adminId, now);
    }

    // Invalidate cache immediately
    flagCache = null;

    // Audit action
    logAdminAction(this.db, {
      adminId,
      action: 'system.flag_toggle',
      entityType: 'feature_flag',
      entityId: key,
      before: existing ? { enabled: Boolean(existing.enabled) } : null,
      after: { enabled: Boolean(boolVal) },
      reason,
      req,
    });

    return { key, enabled: Boolean(boolVal), updated_at: now };
  }
}

export const featureFlagService = new FeatureFlagService();
