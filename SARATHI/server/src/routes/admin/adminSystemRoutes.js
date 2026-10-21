/**
 * SARATHI Admin Portal — System Operations, Feature Flags & Audit Routes
 * PRD Phase 10
 */

import express from 'express';
import { adminSystemService } from '../../services/admin/adminSystemService.js';
import { featureFlagService } from '../../services/admin/featureFlagService.js';
import { listAuditLogs, verifyAuditChain, exportAuditCsv } from '../../services/admin/adminAuditService.js';
import { metricsCollector } from '../../middleware/requestMetricsMiddleware.js';

const router = express.Router();

// =================== SYSTEM HEALTH & METRICS ===================

router.get('/health', async (req, res) => {
  try {
    const health = await adminSystemService.getHealth();
    res.json(health);
  } catch (err) {
    res.status(500).json({ error: { code: 'HEALTH_CHECK_FAILED', message: err.message } });
  }
});

router.get('/metrics', (req, res) => {
  try {
    const metrics = metricsCollector.getMetrics();
    res.json(metrics);
  } catch (err) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

router.get('/errors', (req, res) => {
  try {
    const errors = metricsCollector.getRecentErrors();
    res.json({ errors });
  } catch (err) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

router.get('/backups', (req, res) => {
  try {
    const backups = adminSystemService.getBackups();
    res.json(backups);
  } catch (err) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

router.post('/backups', (req, res) => {
  try {
    const result = adminSystemService.createBackup(req.user.id, req);
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: { code: 'BACKUP_FAILED', message: err.message } });
  }
});

router.post('/retention/run', (req, res) => {
  try {
    const { dryRun = true, days = 90 } = req.body;
    const result = adminSystemService.runRetention({ dryRun, days }, req.user.id, req);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: { code: 'RETENTION_FAILED', message: err.message } });
  }
});

// =================== FEATURE FLAGS & SWITCHES ===================

router.get('/flags', (req, res) => {
  try {
    const flags = featureFlagService.getAllFlags();
    res.json({ flags });
  } catch (err) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

router.patch('/flags/:key', (req, res) => {
  try {
    const { key } = req.params;
    const { enabled, reason = 'Administrative toggle' } = req.body;
    if (enabled === undefined) {
      return res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'enabled boolean required' } });
    }
    const result = featureFlagService.setFlag(key, Boolean(enabled), req.user.id, reason, req);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: { code: 'FLAG_UPDATE_FAILED', message: err.message } });
  }
});

// =================== AUDIT LOG & TAMPER EVIDENCE ===================

router.get('/audit', (req, res) => {
  try {
    const result = listAuditLogs(req.query);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

router.get('/audit/verify', (req, res) => {
  try {
    const result = verifyAuditChain();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: { code: 'VERIFICATION_FAILED', message: err.message } });
  }
});

router.get('/audit/export.csv', (req, res) => {
  try {
    const csv = exportAuditCsv(50000);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="admin_audit_log_${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: { code: 'EXPORT_FAILED', message: err.message } });
  }
});

export default router;
