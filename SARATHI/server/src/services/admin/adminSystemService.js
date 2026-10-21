/**
 * SARATHI Admin Portal — System Operations & Probes Service
 * PRD Phase 10
 * Server health monitoring, SQLite backups, and audited retention management.
 */

import fs from 'node:fs';
import path from 'node:path';
import { initDb } from '../../config/db.js';
import { paths, app } from '../../config/index.js';
import { logAdminAction } from './adminAuditService.js';
import { featureFlagService } from './featureFlagService.js';

let lastIntegrityCheck = null;
let lastIntegrityTime = 0;
const INTEGRITY_CACHE_TTL_MS = 10 * 60 * 1000; // 10 min

export class AdminSystemService {
  constructor(db = null) {
    this.db = db || initDb();
    this.backupDir = path.resolve(paths.dataDir || 'data', 'backups');
    try {
      if (!fs.existsSync(this.backupDir)) {
        fs.mkdirSync(this.backupDir, { recursive: true });
      }
    } catch {}
  }

  /**
   * Health Probes with timeout isolation
   */
  async getHealth() {
    // 1. Process Probe
    const mem = process.memoryUsage();
    const processProbe = {
      uptimeSeconds: Math.round(process.uptime()),
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
      heapTotalMb: Math.round(mem.heapTotal / 1024 / 1024),
      rssMb: Math.round(mem.rss / 1024 / 1024),
    };

    // 2. Database Probe
    let dbFileSizeBytes = 0;
    let walFileSizeBytes = 0;
    try {
      const dbPath = paths.dbFile;
      if (fs.existsSync(dbPath)) {
        dbFileSizeBytes = fs.statSync(dbPath).size;
      }
      const walPath = `${dbPath}-wal`;
      if (fs.existsSync(walPath)) {
        walFileSizeBytes = fs.statSync(walPath).size;
      }
    } catch {}

    // Key table counts
    const tableCounts = {};
    const countTables = ['users', 'organisations', 'jobs', 'applications', 'assessment_sessions', 'admin_audit_log', 'support_tickets'];
    for (const t of countTables) {
      try {
        tableCounts[t] = this.db.prepare(`SELECT count(*) as c FROM ${t}`).get().c;
      } catch {
        tableCounts[t] = 0;
      }
    }

    // Integrity check (cached 10 min)
    const now = Date.now();
    if (!lastIntegrityCheck || now - lastIntegrityTime > INTEGRITY_CACHE_TTL_MS) {
      try {
        const row = this.db.prepare('PRAGMA integrity_check(1);').get();
        lastIntegrityCheck = row ? Object.values(row)[0] : 'ok';
        lastIntegrityTime = now;
      } catch (err) {
        lastIntegrityCheck = err.message;
      }
    }

    let schemaVersion = 16;
    try {
      const v = this.db.prepare('PRAGMA user_version;').get();
      schemaVersion = v ? Object.values(v)[0] : 16;
    } catch {}

    const databaseProbe = {
      fileSizeMb: Math.round((dbFileSizeBytes / 1024 / 1024) * 100) / 100,
      walSizeMb: Math.round((walFileSizeBytes / 1024 / 1024) * 100) / 100,
      schemaVersion,
      integrityCheck: lastIntegrityCheck,
      tableCounts,
    };

    // 3. Code Runner Probe
    let runnerProbe = { status: 'not_configured', details: 'No external runner configured' };
    try {
      const { detectPythonExecutable } = await import('../runner/pythonDriver.js');
      const pyPath = await Promise.race([
        detectPythonExecutable(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Runner timeout')), 2000)),
      ]);
      if (pyPath) {
        runnerProbe = { status: 'ready', executable: pyPath, driver: 'local_process' };
      }
    } catch (err) {
      runnerProbe = { status: 'degraded', error: err.message };
    }

    // 4. AI Readiness Probe
    const aiKeyConfigured = Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY);
    const aiProbe = {
      configured: aiKeyConfigured,
      model: 'gemini-1.5-flash',
      fallbackActive: !aiKeyConfigured,
      status: aiKeyConfigured ? 'ready' : 'fallback_mode',
    };

    // 5. Rate Limiter Probe
    const rateLimiterProbe = {
      status: 'active',
      windowMs: 60000,
      adminLimit: 120,
    };

    // 6. Non-secret flags
    const configFlags = {
      env: process.env.NODE_ENV || 'development',
      port: app.port,
      maintenanceMode: featureFlagService.isEnabled('maintenance_mode', false),
      signupsOpen: featureFlagService.isEnabled('signups_open', true),
    };

    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      process: processProbe,
      database: databaseProbe,
      codeRunner: runnerProbe,
      ai: aiProbe,
      rateLimiter: rateLimiterProbe,
      config: configFlags,
    };
  }

  /**
   * Backups: List & Create
   */
  getBackups() {
    try {
      const files = fs.readdirSync(this.backupDir);
      const backups = files
        .filter((f) => f.endsWith('.sqlite') || f.endsWith('.db'))
        .map((f) => {
          const fullPath = path.join(this.backupDir, f);
          const stat = fs.statSync(fullPath);
          return {
            filename: f,
            sizeBytes: stat.size,
            sizeMb: Math.round((stat.size / 1024 / 1024) * 100) / 100,
            createdAt: stat.birthtime.toISOString(),
          };
        })
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

      return {
        backups,
        policy: 'SQLite WAL safe snapshots stored in internal server storage. Direct restore/download via web is prohibited to protect user integrity and prevent data exfiltration.',
      };
    } catch {
      return { backups: [], policy: 'No backups found' };
    }
  }

  createBackup(adminId, req = null) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `sarathi_backup_${timestamp}.sqlite`;
    const targetPath = path.join(this.backupDir, filename);

    // Flush WAL checkpoint to disk safely
    try {
      this.db.exec('PRAGMA wal_checkpoint(TRUNCATE);');
    } catch {}

    // Copy DB file
    fs.copyFileSync(paths.dbFile, targetPath);
    const stat = fs.statSync(targetPath);

    // Log audited action
    logAdminAction(this.db, {
      adminId,
      action: 'system.backup_create',
      entityType: 'backup',
      entityId: filename,
      after: { filename, sizeBytes: stat.size },
      reason: 'Manual administrative backup creation',
      req,
    });

    return {
      filename,
      sizeBytes: stat.size,
      sizeMb: Math.round((stat.size / 1024 / 1024) * 100) / 100,
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Data Retention Cleaner (Dry Run & Execution)
   */
  runRetention({ dryRun = true, days = 90 }, adminId, req = null) {
    const cutoffDate = new Date(Date.now() - days * 86400000).toISOString();

    const countEvents = this.db.prepare(`
      SELECT count(*) as c FROM integrity_events WHERE ts < ?
    `).get(cutoffDate).c;

    const countLogs = this.db.prepare(`
      SELECT count(*) as c FROM integrity_risk_scores WHERE computed_at < ?
    `).get(cutoffDate).c;

    const affected = {
      integrityEvents: countEvents,
      integrityRiskScores: countLogs,
      cutoffDate,
      days,
    };

    if (dryRun) {
      return {
        dryRun: true,
        affected,
        message: `Dry-run: ${countEvents + countLogs} records older than ${days} days would be purged.`,
      };
    }

    // Execute deletion inside atomic transaction
    this.db.exec('BEGIN IMMEDIATE TRANSACTION;');
    try {
      this.db.prepare(`DELETE FROM integrity_events WHERE ts < ?`).run(cutoffDate);
      this.db.prepare(`DELETE FROM integrity_risk_scores WHERE computed_at < ?`).run(cutoffDate);

      logAdminAction(this.db, {
        adminId,
        action: 'system.retention_purge',
        entityType: 'retention_policy',
        entityId: `days-${days}`,
        after: affected,
        reason: `Purged integrity events older than ${days} days`,
        req,
      });

      this.db.exec('COMMIT;');
      return {
        dryRun: false,
        affected,
        purgedTotal: countEvents + countLogs,
        message: `Successfully purged ${countEvents + countLogs} records.`,
      };
    } catch (err) {
      this.db.exec('ROLLBACK;');
      throw err;
    }
  }
}

export const adminSystemService = new AdminSystemService();
