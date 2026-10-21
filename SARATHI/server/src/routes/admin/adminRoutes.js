import fs from 'node:fs';
import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/authMiddleware.js';
import { createAdminRateLimiter } from '../../middleware/rateLimiter.js';
import { authService } from '../../services/authService.js';
import { adminAnalyticsService } from '../../services/admin/adminAnalyticsService.js';
import { adminUserService } from '../../services/admin/adminUserService.js';
import { adminApprovalService } from '../../services/admin/adminApprovalService.js';
import { AdminIntegrityService } from '../../services/admin/adminIntegrityService.js';
import adminContentRoutes from './adminContentRoutes.js';
import adminSupportRoutes from './adminSupportRoutes.js';
import adminInsightsRoutes from './adminInsightsRoutes.js';
import adminCopilotRoutes from './adminCopilotRoutes.js';
import adminSystemRoutes from './adminSystemRoutes.js';
import { initDb } from '../../config/db.js';

const router = Router();
const adminLimiter = createAdminRateLimiter({ windowMs: 60 * 1000, maxRequests: 120 });

// Router-level guard: Authentication + platform_admin role + sliding-window rate limit
router.use(requireAuth);
router.use(requireRole(['platform_admin']));
router.use(adminLimiter);

router.use('/content', adminContentRoutes);
router.use('/support', adminSupportRoutes);
router.use('/announcements', adminSupportRoutes);
router.use('/insights', adminInsightsRoutes);
router.use('/copilot', adminCopilotRoutes);
router.use('/system', adminSystemRoutes);
router.use('/', adminSystemRoutes);

/**
 * GET /api/admin/me
 * Returns current authenticated platform admin identity.
 */
router.get('/me', async (req, res, next) => {
  try {
    const user = await authService.getUserById(req.user.id);
    res.json({
      id: user?.id || req.user.id,
      email: user?.email || req.user.email,
      fullName: user?.full_name || req.user.fullName,
      role: user?.role || req.user.role,
      lastLoginAt: user?.last_login_at || null,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/nav-badges
 * Returns badge counts for pending action items:
 * - pendingApprovals: Pending recruiter verification applications
 * - flaggedSessions: Flagged assessment proctoring sessions awaiting review
 * - openTickets: Open support tickets
 */
router.get('/nav-badges', (req, res, next) => {
  try {
    const db = initDb();
    let pendingApprovals = 0;
    let flaggedSessions = 0;
    let openTickets = 0;

    // 1. Pending recruiter approvals
    try {
      const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='business_verifications';").get();
      if (tableCheck) {
        const row = db.prepare("SELECT COUNT(*) as cnt FROM business_verifications WHERE status = 'pending';").get();
        pendingApprovals = row?.cnt || 0;
      }
    } catch {}

    // 2. Flagged test integrity sessions (unreviewed high-risk sessions)
    try {
      const riskTableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='integrity_risk_scores';").get();
      if (riskTableCheck) {
        const row = db.prepare(`
          SELECT COUNT(DISTINCT s.id) as cnt
          FROM assessment_sessions s
          JOIN integrity_risk_scores irs ON s.id = irs.session_id
          LEFT JOIN integrity_reviews ir ON s.id = irs.session_id
          WHERE s.status IN ('graded', 'submitted') AND irs.band = 'high' AND ir.id IS NULL
        `).get();
        flaggedSessions = row?.cnt || 0;
      }
      if (flaggedSessions === 0) {
        const reviewTableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='integrity_reviews';").get();
        if (reviewTableCheck) {
          const row = db.prepare(`
            SELECT COUNT(DISTINCT s.id) as cnt
            FROM assessment_sessions s
            LEFT JOIN integrity_reviews ir ON s.id = ir.session_id
            WHERE s.mode = 'secure' AND (
              ir.decision IN ('needs_followup', 'concern_confirmed')
              OR (ir.id IS NULL AND EXISTS (
                SELECT 1 FROM integrity_events ie 
                WHERE ie.session_id = s.id 
                  AND ie.type IN ('fullscreen_exit', 'paste_blocked', 'camera_unauthorized')
              ))
            );
          `).get();
          flaggedSessions = row?.cnt || 0;
        }
      }
    } catch {}

    // 3. Open support tickets
    try {
      const ticketTableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='support_tickets';").get();
      if (ticketTableCheck) {
        const row = db.prepare("SELECT COUNT(*) as cnt FROM support_tickets WHERE status = 'open';").get();
        openTickets = row?.cnt || 0;
      }
    } catch {}

    res.json({
      pendingApprovals,
      flaggedSessions,
      openTickets,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/analytics/overview?range=7d|30d|90d&fresh=0|1
 * Returns platform overview analytics including KPIs, daily series, role mix, funnel, score distribution, and attention items.
 */
router.get('/analytics/overview', (req, res, next) => {
  try {
    const { range = '7d', fresh = '0' } = req.query;
    const data = adminAnalyticsService.getOverviewMetrics({
      range: String(range),
      fresh: fresh === '1' || fresh === 'true',
    });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// ==========================================
// USER MANAGEMENT ENDPOINTS (/api/admin/users)
// ==========================================

/**
 * GET /api/admin/users/export.csv
 * Stream a formula-injection-safe CSV export of users matching given filters.
 */
router.get('/users/export.csv', (req, res, next) => {
  try {
    adminUserService.exportUsersCsv(req.user, req.query, res, req);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/admin/users/bulk-status
 * Bulk update status for up to 200 users, skipping self and last active admin.
 */
router.post('/users/bulk-status', (req, res, next) => {
  try {
    const { ids, status, reason } = req.body || {};
    const result = adminUserService.bulkUpdateStatus(req.user, { ids, status, reason, req });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * POST /api/admin/users/invite
 * Invite a staff member (reviewer or platform_admin) with a 48h setup link.
 */
router.post('/users/invite', (req, res, next) => {
  try {
    const { email, name, role } = req.body || {};
    const result = adminUserService.inviteStaff(req.user, { email, name, role, req });
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * GET /api/admin/users
 * Search and filter platform users with pagination.
 */
router.get('/users', (req, res, next) => {
  try {
    const data = adminUserService.getUsers(req.query);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/users/:id
 * Retrieve comprehensive details for a single user.
 */
router.get('/users/:id', (req, res, next) => {
  try {
    const userDetail = adminUserService.getUserDetail(req.params.id);
    if (!userDetail) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(userDetail);
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/admin/users/:id/status
 * Update user status (active / suspended) with required reason and self-protection.
 */
router.patch('/users/:id/status', (req, res, next) => {
  try {
    const { status, reason } = req.body || {};
    const result = adminUserService.updateUserStatus(req.user, req.params.id, { status, reason, req });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * PATCH /api/admin/users/:id/role
 * Update user platform role with last-admin guard and migration warning.
 */
router.patch('/users/:id/role', (req, res, next) => {
  try {
    const { role, reason } = req.body || {};
    const result = adminUserService.updateUserRole(req.user, req.params.id, { role, reason, req });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * POST /api/admin/users/:id/force-password-reset
 * Invalidate prior reset tokens and generate a fresh one for the user.
 */
router.post('/users/:id/force-password-reset', (req, res, next) => {
  try {
    const result = adminUserService.forcePasswordReset(req.user, req.params.id, { req });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * GET /api/admin/approvals
 * List business verifications with filters, SLA calculation, and status counts.
 */
router.get('/approvals', (req, res, next) => {
  try {
    const result = adminApprovalService.getApprovals(req.query);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/approvals/stats
 * Aggregated metrics for header stats strip.
 */
router.get('/approvals/stats', (req, res, next) => {
  try {
    const stats = adminApprovalService.getApprovalStats();
    res.json(stats);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/approvals/reason-templates
 * Predefined rejection / request-info templates.
 */
router.get('/approvals/reason-templates', (req, res, next) => {
  try {
    const templates = adminApprovalService.getReasonTemplates();
    res.json(templates);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/approvals/:id
 * Detailed verification item with company, recruiter, document meta, hints, and history.
 */
router.get('/approvals/:id', (req, res, next) => {
  try {
    const detail = adminApprovalService.getApprovalDetail(req.params.id);
    res.json(detail);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message, code: err.code });
    }
    next(err);
  }
});

/**
 * GET /api/admin/approvals/:id/document
 * Securely stream document attachment with path traversal protection.
 */
router.get('/approvals/:id/document', (req, res, next) => {
  try {
    const doc = adminApprovalService.streamDocument(req.params.id, req.user, req);
    res.setHeader('Content-Type', doc.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${doc.documentName}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, no-store');
    fs.createReadStream(doc.filePath).pipe(res);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message, code: err.code });
    }
    next(err);
  }
});

/**
 * POST /api/admin/approvals/:id/decision
 * Submit decision (approve, reject, needs_info) with transaction, recruiter notification, and audit.
 */
router.post('/approvals/:id/decision', (req, res, next) => {
  try {
    const { decision, reason, notes, override } = req.body || {};
    const result = adminApprovalService.submitDecision({
      id: req.params.id,
      decision,
      reason,
      notes,
      override,
      adminUser: req.user,
      req,
    });
    res.json(result);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message, code: err.code });
    }
    res.status(400).json({ error: err.message });
  }
});

/**
 * ==========================================
 * PHASE 5: TEST INTEGRITY & PROCTORING REVIEW
 * ==========================================
 */

/**
 * GET /api/admin/integrity/stats
 * Summary stats: unreviewed high-risk count, flag rate, average turnaround, band distribution, 14d trend.
 */
router.get('/integrity/stats', (req, res, next) => {
  try {
    const stats = AdminIntegrityService.getStats();
    res.json(stats);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/integrity/sessions
 * List sessions with filtering, pagination, and sorting by risk score.
 */
router.get('/integrity/sessions', (req, res, next) => {
  try {
    const result = AdminIntegrityService.listSessions(req.query);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/integrity/sessions/:id
 * Detailed session view: code snapshots, run results, timeline, risk breakdown, peer comparison.
 */
router.get('/integrity/sessions/:id', (req, res, next) => {
  try {
    const detail = AdminIntegrityService.getSessionDetail(req.params.id);
    res.json(detail);
  } catch (err) {
    if (err.code === 'NOT_FOUND' || err.message?.includes('not found')) {
      return res.status(404).json({ error: err.message, code: 'NOT_FOUND' });
    }
    next(err);
  }
});

/**
 * GET /api/admin/integrity/sessions/:id/compare/:otherId
 * Diff inspection between two submissions with other candidate's identity strictly protected.
 */
router.get('/integrity/sessions/:id/compare/:otherId', (req, res, next) => {
  try {
    const diff = AdminIntegrityService.getComparison(req.params.id, req.params.otherId);
    res.json(diff);
  } catch (err) {
    if (err.code === 'NOT_FOUND') {
      return res.status(404).json({ error: err.message, code: 'NOT_FOUND' });
    }
    next(err);
  }
});

/**
 * POST /api/admin/integrity/sessions/:id/review
 * Record review decision (clean, violation, escalate) with optional score invalidation and audit log.
 */
router.post('/integrity/sessions/:id/review', (req, res, next) => {
  try {
    const { decision, notes, invalidateScore } = req.body || {};
    const result = AdminIntegrityService.submitReview(
      req.params.id,
      req.user.id,
      { decision, notes, invalidateScore },
      req
    );
    res.json(result);
  } catch (err) {
    if (err.code === 'VALIDATION_ERROR') {
      return res.status(400).json({ error: err.message, code: 'VALIDATION_ERROR' });
    }
    if (err.code === 'NOT_FOUND') {
      return res.status(404).json({ error: err.message, code: 'NOT_FOUND' });
    }
    next(err);
  }
});

/**
 * POST /api/admin/integrity/sessions/:id/recompute
 * Recompute risk score from raw events and snapshots.
 */
router.post('/integrity/sessions/:id/recompute', (req, res, next) => {
  try {
    const updated = AdminIntegrityService.recomputeRisk(req.params.id, req.user.id, req);
    res.json(updated);
  } catch (err) {
    if (err.message?.includes('not found')) {
      return res.status(404).json({ error: err.message, code: 'NOT_FOUND' });
    }
    next(err);
  }
});

export default router;
