import fs from 'node:fs';
import path from 'node:path';
import { initDb } from '../../config/db.js';
import { paths } from '../../config/index.js';
import { repository } from '../../data/repository.js';
import { logAdminAction } from './adminAuditService.js';
import { generateAllHints } from './approvalHintEngine.js';
import { notificationService } from '../notificationService.js';

const REASON_TEMPLATES = [
  'Document unreadable',
  'Name does not match company',
  'Registration expired',
  'Personal email used',
  'Unsupported document type',
];

const ALLOWED_EXTENSIONS = new Set(['.pdf', '.png', '.jpg', '.jpeg']);
const ALLOWED_MIME_TYPES = new Set(['application/pdf', 'image/png', 'image/jpeg', 'image/jpg']);

export const adminApprovalService = {
  /**
   * List business verifications with filters, SLA calculation, and status counts.
   */
  getApprovals({
    status = 'pending',
    q = '',
    olderThanHours = null,
    documentType = '',
    sort = 'oldest',
    page = 1,
    pageSize = 20,
  } = {}) {
    const db = initDb();
    const currentPage = Math.max(1, Number(page) || 1);
    const limit = Math.min(100, Math.max(1, Number(pageSize) || 20));
    const offset = (currentPage - 1) * limit;

    const whereClauses = [];
    const params = [];

    // Status filter
    if (status && status !== 'all') {
      whereClauses.push('bv.status = ?');
      params.push(status);
    }

    // Free text search
    if (q && q.trim()) {
      const sanitized = q.trim().replace(/[%_]/g, '\\$&');
      whereClauses.push(
        "(o.name LIKE ? ESCAPE '\\' OR u.full_name LIKE ? ESCAPE '\\' OR u.email LIKE ? ESCAPE '\\' OR bv.tax_identifier LIKE ? ESCAPE '\\')"
      );
      const queryPattern = `%${sanitized}%`;
      params.push(queryPattern, queryPattern, queryPattern, queryPattern);
    }

    // Older than hours filter
    if (olderThanHours !== null && olderThanHours !== undefined && olderThanHours !== '') {
      const hours = Number(olderThanHours);
      if (!Number.isNaN(hours) && hours > 0) {
        whereClauses.push("(CAST((strftime('%s', 'now') - strftime('%s', bv.submitted_at)) AS REAL) / 3600.0) >= ?");
        params.push(hours);
      }
    }

    // Document type filter
    if (documentType && documentType.trim()) {
      whereClauses.push('bv.document_type = ?');
      params.push(documentType.trim());
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Sorting
    let orderBySql = 'ORDER BY bv.submitted_at ASC';
    if (sort === 'newest') {
      orderBySql = 'ORDER BY bv.submitted_at DESC';
    } else if (sort === 'oldest') {
      orderBySql = 'ORDER BY bv.submitted_at ASC';
    }

    // Total count for current query
    const countSql = `
      SELECT COUNT(*) as total
      FROM business_verifications bv
      JOIN organisations o ON o.id = bv.org_id
      JOIN users u ON u.id = bv.user_id
      ${whereSql};
    `;
    const countRow = db.prepare(countSql).get(...params);
    const total = countRow?.total || 0;

    // Items query
    const itemsSql = `
      SELECT 
        bv.id,
        bv.org_id,
        o.name as company,
        o.slug as company_slug,
        u.id as recruiter_user_id,
        u.full_name as recruiter_name,
        u.email as recruiter_email,
        u.email_verified,
        bv.document_type,
        bv.document_name,
        bv.file_size,
        bv.mime_type,
        bv.tax_identifier,
        bv.status,
        bv.submitted_at,
        bv.reviewed_at,
        bv.decision_reason,
        bv.override
      FROM business_verifications bv
      JOIN organisations o ON o.id = bv.org_id
      JOIN users u ON u.id = bv.user_id
      ${whereSql}
      ${orderBySql}
      LIMIT ? OFFSET ?;
    `;
    const rows = db.prepare(itemsSql).all(...params, limit, offset);

    // Compute SLA and waiting hours for each item
    const now = Date.now();
    const items = rows.map((row) => {
      const submittedTime = new Date(row.submitted_at).getTime();
      const waitingTimeMs = row.status === 'pending'
        ? now - submittedTime
        : (row.reviewed_at ? new Date(row.reviewed_at).getTime() - submittedTime : 0);
      const waitingHours = Math.max(0, Number((waitingTimeMs / (1000 * 3600)).toFixed(1)));

      let sla = 'ok';
      if (waitingHours > 48) {
        sla = 'breached';
      } else if (waitingHours >= 24) {
        sla = 'warning';
      }

      return {
        id: row.id,
        orgId: row.org_id,
        company: row.company,
        companySlug: row.company_slug,
        recruiterUserId: row.recruiter_user_id,
        recruiterName: row.recruiter_name,
        recruiterEmail: row.recruiter_email,
        emailVerified: Boolean(row.email_verified),
        documentType: row.document_type,
        documentName: row.document_name,
        fileSize: row.file_size,
        mimeType: row.mime_type,
        taxIdentifier: row.tax_identifier || null,
        status: row.status,
        submittedAt: row.submitted_at,
        reviewedAt: row.reviewed_at || null,
        waitingHours,
        sla,
        decisionReason: row.decision_reason || null,
        override: Boolean(row.override),
      };
    });

    // Compute status counts for tabs
    const statusCountsRows = db.prepare(`
      SELECT status, COUNT(*) as cnt
      FROM business_verifications
      GROUP BY status;
    `).all();

    const statusCounts = {
      pending: 0,
      needs_info: 0,
      approved: 0,
      rejected: 0,
      all: 0,
    };

    let allCount = 0;
    for (const r of statusCountsRows) {
      if (r.status in statusCounts) {
        statusCounts[r.status] = r.cnt;
      }
      allCount += r.cnt;
    }
    statusCounts.all = allCount;

    return {
      items,
      total,
      page: currentPage,
      pageSize: limit,
      statusCounts,
    };
  },

  /**
   * Get single verification detail with automated advisory hints and earlier submissions.
   */
  getApprovalDetail(id) {
    const db = initDb();
    const row = db.prepare(`
      SELECT 
        bv.id,
        bv.org_id,
        o.name as company_name,
        o.slug as company_slug,
        o.verification_status as company_verification_status,
        o.created_at as company_created_at,
        u.id as recruiter_id,
        u.full_name as recruiter_name,
        u.email as recruiter_email,
        u.email_verified,
        u.role as recruiter_role,
        u.status as recruiter_status,
        u.last_login_at as recruiter_last_login,
        bv.document_type,
        bv.document_name,
        bv.file_size,
        bv.mime_type,
        bv.file_hash,
        bv.tax_identifier,
        bv.status,
        bv.submitted_at,
        bv.reviewed_at,
        bv.reviewed_by,
        rev.full_name as reviewer_name,
        bv.decision_reason,
        bv.decision_notes,
        bv.override
      FROM business_verifications bv
      JOIN organisations o ON o.id = bv.org_id
      JOIN users u ON u.id = bv.user_id
      LEFT JOIN users rev ON rev.id = bv.reviewed_by
      WHERE bv.id = ?;
    `).get(id);

    if (!row) {
      const err = new Error('Verification record not found');
      err.code = 'NOT_FOUND';
      err.status = 404;
      throw err;
    }

    const now = Date.now();
    const submittedTime = new Date(row.submitted_at).getTime();
    const waitingTimeMs = row.status === 'pending'
      ? now - submittedTime
      : (row.reviewed_at ? new Date(row.reviewed_at).getTime() - submittedTime : 0);
    const waitingHours = Math.max(0, Number((waitingTimeMs / (1000 * 3600)).toFixed(1)));

    let sla = 'ok';
    if (waitingHours > 48) {
      sla = 'breached';
    } else if (waitingHours >= 24) {
      sla = 'warning';
    }

    // Compute automated advisory hints
    const automatedHints = generateAllHints(db, row);

    // Earlier submissions from this organisation or recruiter
    const earlierSubmissions = db.prepare(`
      SELECT id, document_type, document_name, status, submitted_at, reviewed_at
      FROM business_verifications
      WHERE (org_id = ? OR user_id = ?) AND id != ?
      ORDER BY submitted_at DESC
      LIMIT 10;
    `).all(row.org_id, row.recruiter_id, row.id);

    // Decision history from audit log
    const decisionHistory = db.prepare(`
      SELECT 
        l.id,
        l.action,
        l.created_at,
        l.reason,
        l.after_json,
        u.full_name as admin_name
      FROM admin_audit_log l
      LEFT JOIN users u ON u.id = l.admin_id
      WHERE l.entity_type = 'business_verification' AND l.entity_id = ?
      ORDER BY l.created_at DESC
      LIMIT 10;
    `).all(row.id).map((entry) => ({
      id: entry.id,
      action: entry.action,
      adminName: entry.admin_name || 'System Admin',
      reason: entry.reason,
      createdAt: entry.created_at,
      details: entry.after_json ? JSON.parse(entry.after_json) : null,
    }));

    return {
      id: row.id,
      company: {
        id: row.org_id,
        name: row.company_name,
        slug: row.company_slug,
        verificationStatus: row.company_verification_status || 'unverified',
        createdAt: row.company_created_at,
      },
      recruiter: {
        id: row.recruiter_id,
        fullName: row.recruiter_name,
        email: row.recruiter_email,
        emailVerified: Boolean(row.email_verified),
        role: row.recruiter_role,
        status: row.recruiter_status,
        lastLoginAt: row.recruiter_last_login || null,
      },
      document: {
        id: row.id,
        documentType: row.document_type,
        documentName: row.document_name,
        fileSize: row.file_size,
        mimeType: row.mime_type,
        submittedAt: row.submitted_at,
      },
      status: row.status,
      submittedAt: row.submitted_at,
      waitingHours,
      sla,
      taxIdentifier: row.tax_identifier || null,
      decisionReason: row.decision_reason || null,
      decisionNotes: row.decision_notes || null,
      reviewedAt: row.reviewed_at || null,
      reviewedBy: row.reviewer_name || null,
      override: Boolean(row.override),
      automatedHints,
      earlierSubmissions,
      decisionHistory,
    };
  },

  /**
   * Securely stream verification document file to authenticated platform admin.
   * Defends against path traversal, symlinks, and unauthorized file access.
   */
  streamDocument(id, adminUser, req) {
    const db = initDb();
    const record = db.prepare('SELECT * FROM business_verifications WHERE id = ?;').get(id);

    if (!record) {
      const err = new Error('Verification document not found');
      err.code = 'NOT_FOUND';
      err.status = 404;
      throw err;
    }

    const uploadsDir = path.resolve(paths.uploadsDir);
    const resolvedPath = path.resolve(record.file_path);

    // Path traversal validation: path must strictly reside within uploadsDir
    if (!resolvedPath.startsWith(uploadsDir + path.sep) && resolvedPath !== uploadsDir) {
      const err = new Error('Access denied: document path is outside the authorized uploads directory');
      err.code = 'FORBIDDEN_PATH';
      err.status = 403;
      throw err;
    }

    if (!fs.existsSync(resolvedPath)) {
      const err = new Error('Document attachment file is missing on storage');
      err.code = 'FILE_NOT_FOUND';
      err.status = 404;
      throw err;
    }

    // Check for symlinks
    const stat = fs.lstatSync(resolvedPath);
    if (stat.isSymbolicLink()) {
      const err = new Error('Symbolic link access rejected');
      err.code = 'FORBIDDEN_SYMLINK';
      err.status = 403;
      throw err;
    }

    // Check file extension
    const ext = path.extname(resolvedPath).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      const err = new Error(`Unsupported document extension: ${ext}`);
      err.code = 'UNSUPPORTED_DOCUMENT_TYPE';
      err.status = 400;
      throw err;
    }

    // Audit document view action
    try {
      logAdminAction(db, {
        adminId: adminUser.id,
        action: 'approval.document_view',
        entityType: 'business_verification',
        entityId: id,
        before: null,
        after: {
          documentName: record.document_name,
          mimeType: record.mime_type,
          fileSize: record.file_size,
        },
        reason: 'Viewed verification attachment',
        req,
      });
    } catch (auditErr) {
      console.warn('Document view audit failed:', auditErr.message);
    }

    return {
      filePath: resolvedPath,
      documentName: record.document_name,
      mimeType: record.mime_type || (ext === '.pdf' ? 'application/pdf' : 'image/png'),
      fileSize: record.file_size || stat.size,
    };
  },

  /**
   * Submit decision for recruiter verification.
   * Atomic transaction updates verification, organisation status, creates notification, and logs audit.
   */
  submitDecision({
    id,
    decision,
    reason = '',
    notes = '',
    override = false,
    adminUser,
    req,
  }) {
    if (!['approve', 'reject', 'needs_info'].includes(decision)) {
      const err = new Error('Invalid decision. Must be "approve", "reject", or "needs_info"');
      err.code = 'INVALID_DECISION';
      err.status = 400;
      throw err;
    }

    // Reject and needs_info strictly require a reason of at least 10 characters
    if ((decision === 'reject' || decision === 'needs_info') && (!reason || reason.trim().length < 10)) {
      const err = new Error('A detailed reason (at least 10 characters) is required when rejecting or requesting information');
      err.code = 'REASON_REQUIRED';
      err.status = 400;
      throw err;
    }

    const db = initDb();
    const existing = db.prepare(`
      SELECT bv.*, o.name as company_name, o.settings as org_settings
      FROM business_verifications bv
      JOIN organisations o ON o.id = bv.org_id
      WHERE bv.id = ?;
    `).get(id);

    if (!existing) {
      const err = new Error('Verification record not found');
      err.code = 'NOT_FOUND';
      err.status = 404;
      throw err;
    }

    // If item was already decided, require override = true
    if (existing.status !== 'pending' && !override) {
      const err = new Error('This verification has already been decided. Set override=true to change the decision.');
      err.code = 'OVERRIDE_REQUIRED';
      err.status = 400;
      throw err;
    }

    const now = new Date().toISOString();
    const orgVerificationStatus = decision === 'approve'
      ? 'verified'
      : (decision === 'reject' ? 'rejected' : 'needs_info');

    return repository.transaction((repo) => {
      // 1. Update verification record
      repo.execute(
        `UPDATE business_verifications
         SET status = ?,
             reviewed_at = ?,
             reviewed_by = ?,
             decision_reason = ?,
             decision_notes = ?,
             override = ?,
             updated_at = ?
         WHERE id = ?;`,
        [
          decision,
          now,
          adminUser.id,
          reason.trim() || null,
          notes.trim() || null,
          override ? 1 : 0,
          now,
          id,
        ]
      );

      // 2. Update organisation status
      let currentSettings = {};
      try {
        currentSettings = JSON.parse(existing.org_settings || '{}');
      } catch {}
      currentSettings.verification_status = orgVerificationStatus;

      repo.execute(
        `UPDATE organisations
         SET verification_status = ?,
             settings = ?,
             updated_at = ?
         WHERE id = ?;`,
        [orgVerificationStatus, JSON.stringify(currentSettings), now, existing.org_id]
      );

      // 3. Notify recruiter
      const notifType = decision === 'approve' ? 'success' : (decision === 'reject' ? 'error' : 'warning');
      const notifTitle = decision === 'approve'
        ? 'Company Verification Approved'
        : (decision === 'reject' ? 'Company Verification Rejected' : 'Additional Verification Info Needed');

      const notifBody = decision === 'approve'
        ? `Your business verification for ${existing.company_name} has been approved.`
        : (decision === 'reject'
            ? `Your business verification for ${existing.company_name} was rejected: ${reason.trim()}`
            : `Additional details are required for ${existing.company_name}: ${reason.trim()}`);

      notificationService.createNotification({
        userId: existing.user_id,
        type: notifType,
        title: notifTitle,
        body: notifBody,
        link: '/recruiter',
      });

      // 4. Record audit log
      logAdminAction(repo, {
        adminId: adminUser.id,
        action: override ? 'approval.override' : 'approval.decision',
        entityType: 'business_verification',
        entityId: id,
        before: {
          status: existing.status,
          decisionReason: existing.decision_reason,
          companyVerificationStatus: existing.verification_status || 'unverified',
        },
        after: {
          status: decision,
          decisionReason: reason.trim() || null,
          decisionNotes: notes.trim() || null,
          companyVerificationStatus: orgVerificationStatus,
          override: Boolean(override),
        },
        reason: reason.trim() || (decision === 'approve' ? 'Approved company verification' : 'Decision submitted'),
        req,
      });

      return {
        success: true,
        id,
        decision,
        companyVerificationStatus: orgVerificationStatus,
        reviewedAt: now,
      };
    });
  },

  /**
   * Aggregated approval metrics for the dashboard header strip.
   */
  getApprovalStats() {
    const db = initDb();

    // 1. Pending count
    const pendingRow = db.prepare("SELECT COUNT(*) as cnt FROM business_verifications WHERE status = 'pending';").get();
    const pendingCount = pendingRow?.cnt || 0;

    // 2. SLA breaches (pending > 48h)
    const breachRow = db.prepare(`
      SELECT COUNT(*) as cnt
      FROM business_verifications
      WHERE status = 'pending'
        AND (CAST((strftime('%s', 'now') - strftime('%s', submitted_at)) AS REAL) / 3600.0) > 48;
    `).get();
    const breaches = breachRow?.cnt || 0;

    // 3. Average turnaround hours in last 30 days
    const turnaroundRow = db.prepare(`
      SELECT AVG((strftime('%s', reviewed_at) - strftime('%s', submitted_at)) / 3600.0) as avg_turnaround
      FROM business_verifications
      WHERE reviewed_at IS NOT NULL
        AND reviewed_at >= datetime('now', '-30 days');
    `).get();
    const avgTurnaroundHours30d = turnaroundRow?.avg_turnaround
      ? Math.max(0, Number(turnaroundRow.avg_turnaround.toFixed(1)))
      : 0;

    // 4. Approval rate in last 30 days
    const rateRow = db.prepare(`
      SELECT 
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_cnt,
        COUNT(*) as total_decided
      FROM business_verifications
      WHERE reviewed_at IS NOT NULL
        AND reviewed_at >= datetime('now', '-30 days');
    `).get();
    const approvalRate30d = rateRow?.total_decided > 0
      ? Math.round((rateRow.approved_cnt / rateRow.total_decided) * 100)
      : 100;

    // 5. Decisions per day for the last 14 days
    const decisionsPerDay = db.prepare(`
      WITH RECURSIVE dates(date) AS (
        SELECT date('now', '-13 days')
        UNION ALL
        SELECT date(date, '+1 day')
        FROM dates
        WHERE date < date('now')
      )
      SELECT 
        d.date,
        COUNT(CASE WHEN bv.status = 'approved' THEN 1 END) as approved,
        COUNT(CASE WHEN bv.status = 'rejected' THEN 1 END) as rejected,
        COUNT(CASE WHEN bv.status = 'needs_info' THEN 1 END) as needs_info
      FROM dates d
      LEFT JOIN business_verifications bv 
        ON date(bv.reviewed_at) = d.date
      GROUP BY d.date
      ORDER BY d.date ASC;
    `).all().map((r) => ({
      date: r.date,
      approved: r.approved || 0,
      rejected: r.rejected || 0,
      needsInfo: r.needs_info || 0,
    }));

    return {
      pendingCount,
      avgTurnaroundHours30d,
      approvalRate30d,
      breaches,
      decisionsPerDay,
    };
  },

  /**
   * Predefined reason templates for rejection or requesting info.
   */
  getReasonTemplates() {
    return REASON_TEMPLATES;
  },
};
