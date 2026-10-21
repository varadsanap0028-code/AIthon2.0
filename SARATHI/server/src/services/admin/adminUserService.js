import { randomBytes, randomUUID as uuidv4 } from 'node:crypto';
import { getDb } from '../../config/db.js';
import { repository } from '../../data/repository.js';
import { auth } from '../../config/index.js';
import { logAdminAction } from './adminAuditService.js';

const FORMULA_PREFIXES = ['=', '+', '-', '@', '\t', '\r'];

/**
 * Sanitizes cell values to neutralize formula injection in exported CSVs.
 * @param {any} cell
 * @returns {string}
 */
export function sanitizeCsvCell(cell) {
  if (cell === null || cell === undefined) {
    return '""';
  }
  let str = String(cell);
  if (FORMULA_PREFIXES.some((prefix) => str.startsWith(prefix))) {
    str = `'${str}`;
  }
  str = str.replace(/"/g, '""');
  return `"${str}"`;
}

export const adminUserService = {
  /**
   * List users with multi-criteria filtering, sorting, and pagination.
   */
  getUsers({
    q = '',
    role = '',
    status = '',
    emailVerified = '',
    createdFrom = '',
    createdTo = '',
    inactiveDays = null,
    sort = 'createdAt',
    order = 'DESC',
    page = 1,
    pageSize = 20,
  } = {}) {
    const db = getDb();

    const whereClauses = ['deleted_at IS NULL'];
    const params = [];

    // Search query on name or email
    if (q && q.trim()) {
      const term = `%${q.trim().toLowerCase()}%`;
      whereClauses.push('(LOWER(full_name) LIKE ? OR LOWER(email) LIKE ?)');
      params.push(term, term);
    }

    // Role filter (can be single or comma-separated)
    if (role && role.trim()) {
      const roles = role.split(',').map((r) => r.trim()).filter(Boolean);
      if (roles.length === 1) {
        whereClauses.push('role = ?');
        params.push(roles[0]);
      } else if (roles.length > 1) {
        const placeholders = roles.map(() => '?').join(',');
        whereClauses.push(`role IN (${placeholders})`);
        params.push(...roles);
      }
    }

    // Status filter
    if (status && status.trim()) {
      whereClauses.push('status = ?');
      params.push(status.trim());
    }

    // Email verified filter
    if (emailVerified !== '' && emailVerified !== undefined && emailVerified !== null) {
      const isVerified = emailVerified === 'true' || emailVerified === true || emailVerified === '1';
      whereClauses.push('email_verified = ?');
      params.push(isVerified ? 1 : 0);
    }

    // Date range filters
    if (createdFrom) {
      whereClauses.push('created_at >= ?');
      params.push(new Date(createdFrom).toISOString());
    }
    if (createdTo) {
      whereClauses.push('created_at <= ?');
      params.push(new Date(createdTo).toISOString());
    }

    // Inactive for N days filter
    if (inactiveDays !== null && inactiveDays !== undefined && inactiveDays !== '') {
      const days = parseInt(inactiveDays, 10);
      if (!isNaN(days) && days > 0) {
        const thresholdDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
        whereClauses.push('(last_login_at < ? OR (last_login_at IS NULL AND created_at < ?))');
        params.push(thresholdDate, thresholdDate);
      }
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Total count query
    const countRow = db.prepare(`SELECT COUNT(*) as count FROM users ${whereSql};`).get(...params);
    const total = countRow ? Number(countRow.count) : 0;

    // Sorting column mapping
    const sortColumnMap = {
      createdAt: 'created_at',
      lastLoginAt: 'COALESCE(last_login_at, "")',
      name: 'full_name',
      email: 'email',
    };
    const sortCol = sortColumnMap[sort] || 'created_at';
    const sortDir = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Pagination
    const sanitizedPage = Math.max(1, parseInt(page, 10) || 1);
    const sanitizedPageSize = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 20));
    const offset = (sanitizedPage - 1) * sanitizedPageSize;

    const selectSql = `
      SELECT id, email, full_name, role, status, email_verified, avatar_url, last_login_at, created_at, updated_at
      FROM users
      ${whereSql}
      ORDER BY ${sortCol} ${sortDir}
      LIMIT ? OFFSET ?;
    `;

    const rows = db.prepare(selectSql).all(...params, sanitizedPageSize, offset);

    const items = rows.map((row) => ({
      id: row.id,
      email: row.email,
      fullName: row.full_name,
      role: row.role,
      status: row.status,
      emailVerified: Boolean(row.email_verified),
      avatarUrl: row.avatar_url || null,
      lastLoginAt: row.last_login_at || null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return {
      items,
      total,
      page: sanitizedPage,
      pageSize: sanitizedPageSize,
    };
  },

  /**
   * Get user detail including profile, organization memberships, linked SSO providers,
   * entity counts, and last 10 audit log entries.
   */
  getUserDetail(userId) {
    const db = getDb();

    const user = db
      .prepare(
        `SELECT id, email, full_name, role, status, company_name, institution, institution_id,
                timezone, avatar_url, last_login_at, email_verified, created_at, updated_at
         FROM users
         WHERE id = ? AND deleted_at IS NULL;`
      )
      .get(userId);

    if (!user) return null;

    // Role-specific profile summary
    let profile = null;
    if (user.role === 'candidate') {
      profile = db
        .prepare(
          `SELECT headline, target_role, experience_years, location, work_preference,
                  github_url, linkedin_url, portfolio_url, degree, graduation_year, branch
           FROM candidate_profiles WHERE id = ?;`
        )
        .get(userId) || null;
    } else if (user.role === 'recruiter') {
      profile = db
        .prepare(
          `SELECT title, department, bio, linkedin_url
           FROM recruiter_profiles WHERE user_id = ?;`
        )
        .get(userId) || null;
    }

    // Organisation memberships
    const organisations = db
      .prepare(
        `SELECT m.id, m.role, m.status, o.id as org_id, o.name as org_name, o.slug as org_slug
         FROM organisation_memberships m
         JOIN organisations o ON m.org_id = o.id
         WHERE m.user_id = ?;`
      )
      .all(userId)
      .map((m) => ({
        id: m.id,
        orgId: m.org_id,
        name: m.org_name,
        slug: m.org_slug,
        role: m.role,
        status: m.status,
      }));

    // Linked SSO identities (names only, no secrets)
    const identities = db
      .prepare(
        `SELECT provider, email_at_link, created_at, last_login_at
         FROM auth_identities
         WHERE user_id = ?;`
      )
      .all(userId)
      .map((id) => ({
        provider: id.provider,
        email: id.email_at_link,
        linkedAt: id.created_at,
        lastLoginAt: id.last_login_at,
      }));

    // Entity counts
    const applicationsCount = db
      .prepare('SELECT COUNT(*) as count FROM applications WHERE candidate_id = ?;')
      .get(userId)?.count || 0;

    const testsCount = db
      .prepare('SELECT COUNT(*) as count FROM assessment_sessions WHERE user_id = ?;')
      .get(userId)?.count || 0;

    const jobsCount = db
      .prepare('SELECT COUNT(*) as count FROM jobs WHERE creator_id = ? AND deleted_at IS NULL;')
      .get(userId)?.count || 0;

    const counts = {
      applications: Number(applicationsCount),
      tests: Number(testsCount),
      jobs: Number(jobsCount),
      tickets: 0,
    };

    // Last 10 audit entries regarding this user or performed by this user
    const recentAudit = db
      .prepare(
        `SELECT id, admin_id, action, entity_type, entity_id, reason, created_at
         FROM admin_audit_log
         WHERE (entity_type = 'user' AND entity_id = ?) OR admin_id = ?
         ORDER BY created_at DESC
         LIMIT 10;`
      )
      .all(userId, userId)
      .map((entry) => ({
        id: entry.id,
        adminId: entry.admin_id,
        action: entry.action,
        entityType: entry.entity_type,
        entityId: entry.entity_id,
        reason: entry.reason,
        createdAt: entry.created_at,
      }));

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        status: user.status,
        companyName: user.company_name || null,
        institution: user.institution || null,
        institutionId: user.institution_id || null,
        timezone: user.timezone,
        avatarUrl: user.avatar_url || null,
        lastLoginAt: user.last_login_at || null,
        emailVerified: Boolean(user.email_verified),
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      },
      profile,
      organisations,
      identities,
      counts,
      recentAudit,
    };
  },

  /**
   * Suspend or activate a user account with required guards and audit logging.
   */
  updateUserStatus(adminUser, targetUserId, { status, reason, req } = {}) {
    if (!['active', 'suspended'].includes(status)) {
      throw new Error("Invalid status. Allowed values are 'active' or 'suspended'.");
    }

    if (status === 'suspended' && (!reason || !reason.trim())) {
      throw new Error('A reason is required to suspend a user account.');
    }

    if (adminUser.id === targetUserId) {
      throw new Error('Cannot modify your own account status.');
    }

    const db = getDb();
    const target = db
      .prepare('SELECT id, status, role, email FROM users WHERE id = ? AND deleted_at IS NULL;')
      .get(targetUserId);

    if (!target) {
      throw new Error('User not found.');
    }

    // Protection: Cannot suspend the last active platform administrator
    if (status === 'suspended' && target.role === 'platform_admin') {
      const activeAdmins = db
        .prepare(
          "SELECT COUNT(*) as count FROM users WHERE role = 'platform_admin' AND status = 'active' AND deleted_at IS NULL;"
        )
        .get();
      if ((activeAdmins?.count || 0) <= 1) {
        throw new Error('Cannot suspend the last active platform administrator.');
      }
    }

    // Protection: The primary seeded admin account must never be suspended
    if (status === 'suspended' && target.id === 'usr-admin-seed') {
      throw new Error('The primary admin account cannot be suspended.');
    }

    const now = new Date().toISOString();
    const action = status === 'suspended' ? 'user.suspend' : 'user.activate';

    return repository.transaction((repo) => {
      repo.execute('UPDATE users SET status = ?, updated_at = ? WHERE id = ?;', [
        status,
        now,
        targetUserId,
      ]);

      logAdminAction(repo, {
        adminId: adminUser.id,
        action,
        entityType: 'user',
        entityId: targetUserId,
        before: { status: target.status },
        after: { status },
        reason: reason || (status === 'active' ? 'Account re-activated by admin' : 'Account suspended'),
        req,
      });

      return {
        id: targetUserId,
        status,
        previousStatus: target.status,
      };
    });
  },

  /**
   * Update a user's platform role with demotion guards and data migration warnings.
   */
  updateUserRole(adminUser, targetUserId, { role, reason, req } = {}) {
    const allowedRoles = ['candidate', 'recruiter', 'college', 'reviewer', 'platform_admin'];
    if (!allowedRoles.includes(role)) {
      throw new Error(`Invalid role. Allowed roles are: ${allowedRoles.join(', ')}.`);
    }

    if (adminUser.id === targetUserId) {
      throw new Error('Cannot change your own role.');
    }

    const db = getDb();
    const target = db
      .prepare('SELECT id, role, status, email FROM users WHERE id = ? AND deleted_at IS NULL;')
      .get(targetUserId);

    if (!target) {
      throw new Error('User not found.');
    }

    // Guard: Cannot demote the last active platform admin
    if (target.role === 'platform_admin' && role !== 'platform_admin') {
      const activeAdmins = db
        .prepare(
          "SELECT COUNT(*) as count FROM users WHERE role = 'platform_admin' AND status = 'active' AND deleted_at IS NULL;"
        )
        .get();
      if ((activeAdmins?.count || 0) <= 1) {
        throw new Error('Cannot demote the last active platform administrator.');
      }
    }

    let warning = null;
    if (
      (target.role === 'candidate' && role === 'recruiter') ||
      (target.role === 'recruiter' && role === 'candidate')
    ) {
      warning = 'Profile data does not migrate between candidate and recruiter roles.';
    }

    const now = new Date().toISOString();

    return repository.transaction((repo) => {
      repo.execute('UPDATE users SET role = ?, updated_at = ? WHERE id = ?;', [
        role,
        now,
        targetUserId,
      ]);

      logAdminAction(repo, {
        adminId: adminUser.id,
        action: 'user.change_role',
        entityType: 'user',
        entityId: targetUserId,
        before: { role: target.role },
        after: { role },
        reason: reason || 'Role updated by platform administrator',
        req,
      });

      return {
        id: targetUserId,
        role,
        previousRole: target.role,
        warning,
      };
    });
  },

  /**
   * Invalidate prior reset tokens and generate a fresh one for the user.
   */
  forcePasswordReset(adminUser, targetUserId, { req } = {}) {
    const db = getDb();
    const target = db
      .prepare('SELECT id, email FROM users WHERE id = ? AND deleted_at IS NULL;')
      .get(targetUserId);

    if (!target) {
      throw new Error('User not found.');
    }

    const now = new Date().toISOString();
    const resetToken = randomBytes(24).toString('hex');
    const resetId = `pwr-${uuidv4().slice(0, 8)}`;
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

    return repository.transaction((repo) => {
      // Invalidate existing pending tokens
      repo.execute(
        'UPDATE password_resets SET used_at = ? WHERE user_id = ? AND used_at IS NULL;',
        [now, targetUserId]
      );

      // Insert new token
      repo.execute(
        `INSERT INTO password_resets (id, user_id, token_hash, expires_at, used_at)
         VALUES (?, ?, ?, ?, NULL);`,
        [resetId, targetUserId, resetToken, expiresAt]
      );

      logAdminAction(repo, {
        adminId: adminUser.id,
        action: 'user.force_password_reset',
        entityType: 'user',
        entityId: targetUserId,
        before: null,
        after: { resetIssued: true, expiresAt },
        reason: 'Administrator triggered password reset',
        req,
      });

      const isNonProd =
        process.env.NODE_ENV !== 'production' || auth.enableDemoAuth === true;
      const resetLink = isNonProd ? `/reset-password?token=${resetToken}` : undefined;

      return {
        success: true,
        message: 'Password reset link generated successfully.',
        resetLink,
      };
    });
  },

  /**
   * Bulk update status for up to 200 users, skipping self and last active admin.
   */
  bulkUpdateStatus(adminUser, { ids = [], status, reason, req } = {}) {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new Error('User IDs list is required.');
    }
    if (ids.length > 200) {
      throw new Error('Cannot process more than 200 users at once.');
    }
    if (!['active', 'suspended'].includes(status)) {
      throw new Error("Invalid status. Allowed values are 'active' or 'suspended'.");
    }
    if (status === 'suspended' && (!reason || !reason.trim())) {
      throw new Error('A reason is required to suspend user accounts.');
    }

    const results = [];
    let updatedCount = 0;
    let skippedCount = 0;

    for (const id of ids) {
      if (id === adminUser.id) {
        results.push({ id, success: false, error: 'Cannot modify your own account' });
        skippedCount++;
        continue;
      }

      try {
        this.updateUserStatus(adminUser, id, { status, reason, req });
        results.push({ id, success: true });
        updatedCount++;
      } catch (err) {
        results.push({ id, success: false, error: err.message });
        skippedCount++;
      }
    }

    return {
      results,
      totalRequested: ids.length,
      updatedCount,
      skippedCount,
    };
  },

  /**
   * Invite a staff member (reviewer or platform_admin) with a 48h setup link.
   */
  inviteStaff(adminUser, { email, name, role, req } = {}) {
    if (!email || !email.includes('@')) {
      throw new Error('A valid email address is required.');
    }
    if (!name || !name.trim()) {
      throw new Error('Staff member full name is required.');
    }
    if (!['reviewer', 'platform_admin'].includes(role)) {
      throw new Error("Staff invitation role must be 'reviewer' or 'platform_admin'.");
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanName = name.trim();
    const db = getDb();

    const existing = db
      .prepare('SELECT id FROM users WHERE email = ? AND deleted_at IS NULL;')
      .get(cleanEmail);

    if (existing) {
      throw new Error('A user with this email address already exists.');
    }

    const now = new Date().toISOString();
    const userId = `usr-inv-${uuidv4().slice(0, 8)}`;
    const setupToken = randomBytes(24).toString('hex');
    const resetId = `pwr-${uuidv4().slice(0, 8)}`;
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(); // 48 hours

    return repository.transaction((repo) => {
      repo.execute(
        `INSERT INTO users (id, email, password_hash, full_name, role, status, email_verified, created_at, updated_at)
         VALUES (?, ?, NULL, ?, ?, 'active', 1, ?, ?);`,
        [userId, cleanEmail, cleanName, role, now, now]
      );

      repo.execute(
        `INSERT INTO password_resets (id, user_id, token_hash, expires_at, used_at)
         VALUES (?, ?, ?, ?, NULL);`,
        [resetId, userId, setupToken, expiresAt]
      );

      logAdminAction(repo, {
        adminId: adminUser.id,
        action: 'user.invite',
        entityType: 'user',
        entityId: userId,
        before: null,
        after: { email: cleanEmail, fullName: cleanName, role },
        reason: `Staff invitation issued for role ${role}`,
        req,
      });

      return {
        success: true,
        user: {
          id: userId,
          email: cleanEmail,
          fullName: cleanName,
          role,
        },
        setupLink: `/reset-password?token=${setupToken}`,
      };
    });
  },

  /**
   * Stream a formula-injection-safe CSV export of users matching given filters.
   */
  exportUsersCsv(adminUser, filters, res, req) {
    const db = getDb();
    const whereClauses = ['deleted_at IS NULL'];
    const params = [];

    if (filters.q && filters.q.trim()) {
      const term = `%${filters.q.trim().toLowerCase()}%`;
      whereClauses.push('(LOWER(full_name) LIKE ? OR LOWER(email) LIKE ?)');
      params.push(term, term);
    }
    if (filters.role && filters.role.trim()) {
      const roles = filters.role.split(',').map((r) => r.trim()).filter(Boolean);
      if (roles.length === 1) {
        whereClauses.push('role = ?');
        params.push(roles[0]);
      } else if (roles.length > 1) {
        const placeholders = roles.map(() => '?').join(',');
        whereClauses.push(`role IN (${placeholders})`);
        params.push(...roles);
      }
    }
    if (filters.status && filters.status.trim()) {
      whereClauses.push('status = ?');
      params.push(filters.status.trim());
    }
    if (filters.emailVerified !== '' && filters.emailVerified !== undefined && filters.emailVerified !== null) {
      const isVerified =
        filters.emailVerified === 'true' || filters.emailVerified === true || filters.emailVerified === '1';
      whereClauses.push('email_verified = ?');
      params.push(isVerified ? 1 : 0);
    }
    if (filters.createdFrom) {
      whereClauses.push('created_at >= ?');
      params.push(new Date(filters.createdFrom).toISOString());
    }
    if (filters.createdTo) {
      whereClauses.push('created_at <= ?');
      params.push(new Date(filters.createdTo).toISOString());
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const query = `
      SELECT id, full_name, email, role, status, email_verified, created_at, last_login_at
      FROM users
      ${whereSql}
      ORDER BY created_at DESC
      LIMIT 50000;
    `;

    const rows = db.prepare(query).all(...params);

    // Write audit entry
    logAdminAction(db, {
      adminId: adminUser.id,
      action: 'user.export',
      entityType: 'user',
      entityId: 'bulk',
      before: null,
      after: { exportedCount: rows.length, filters },
      reason: 'Exported users to CSV',
      req,
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="users_export.csv"');

    const headers = ['id', 'name', 'email', 'role', 'status', 'emailVerified', 'createdAt', 'lastLoginAt'];
    res.write(headers.join(',') + '\r\n');

    for (const r of rows) {
      const line = [
        sanitizeCsvCell(r.id),
        sanitizeCsvCell(r.full_name),
        sanitizeCsvCell(r.email),
        sanitizeCsvCell(r.role),
        sanitizeCsvCell(r.status),
        sanitizeCsvCell(Boolean(r.email_verified)),
        sanitizeCsvCell(r.created_at),
        sanitizeCsvCell(r.last_login_at || ''),
      ].join(',');
      res.write(line + '\r\n');
    }

    res.end();
  },
};
