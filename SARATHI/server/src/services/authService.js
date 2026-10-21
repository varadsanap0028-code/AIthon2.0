import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID as uuidv4, randomBytes } from 'node:crypto';
import { repository } from '../data/repository.js';
import { auth as authConfig } from '../config/index.js';

export const authService = {
  async hashPassword(password) {
    return bcrypt.hash(password, 10);
  },

  async comparePassword(password, hash) {
    return bcrypt.compare(password, hash);
  },

  generateToken(user, orgId = null, role = null) {
    const payload = {
      sub: user.id,
      email: user.email,
      name: user.full_name,
      globalRole: user.role,
      status: user.status || 'active',
      institutionId: user.institution_id || null,
      institution: user.institution || null,
      orgId: orgId || null,
      orgRole: role || null,
    };
    return jwt.sign(payload, authConfig.secret, { algorithm: 'HS256', expiresIn: authConfig.expiresIn });
  },

  verifyToken(token) {
    try {
      return jwt.verify(token, authConfig.secret, { algorithms: ['HS256'] });
    } catch {
      return null;
    }
  },

  findUserByEmailOrId(email, id = null) {
    if (id) {
      return repository.queryOne(
        'SELECT * FROM users WHERE (email = ? OR id = ?) AND deleted_at IS NULL;',
        [email.toLowerCase().trim(), id]
      );
    }
    return repository.queryOne(
      'SELECT * FROM users WHERE email = ? AND deleted_at IS NULL;',
      [email.toLowerCase().trim()]
    );
  },

  async login(email, password, requestedOrgId = null) {
    if (!password) {
      throw new Error('Invalid email or password');
    }

    let searchEmail = (email || '').toLowerCase().trim();
    if (authConfig.enableDemoAuth) {
      if (searchEmail === 'recruiter@nextech.com' || searchEmail === 'recruiter@sarathi.local') {
        searchEmail = 'recruiter@sarathi.ai';
      } else if (searchEmail === 'placement@nit.edu' || searchEmail === 'college@sarathi.ai' || searchEmail === 'placement@apex.edu') {
        searchEmail = 'admin@apex.edu';
      }
    }

    let user = repository.queryOne(
      'SELECT * FROM users WHERE email = ? AND deleted_at IS NULL;',
      [searchEmail]
    );

    if (!user) {
      throw new Error('Invalid email or password');
    }

    if (user.status === 'suspended') {
      const err = new Error('Your account has been suspended. Please contact platform administration.');
      err.code = 'ACCOUNT_SUSPENDED';
      throw err;
    }

    if (user.status === 'pending_approval') {
      const err = new Error('Your account is awaiting administrative approval.');
      err.code = 'PENDING_APPROVAL';
      throw err;
    }

    if (!user.password_hash) {
      if (authConfig.enableDemoAuth) {
        // Auto-save the provided password for this account
        const newHash = await this.hashPassword(password);
        repository.execute('UPDATE users SET password_hash = ? WHERE id = ?;', [newHash, user.id]);
        user.password_hash = newHash;
      } else {
        throw new Error('Invalid email or password');
      }
    }

    const match = await this.comparePassword(password, user.password_hash);
    if (!match) {
      if (authConfig.enableDemoAuth && (password === 'password123' || password === 'demo123')) {
        // Allow demo master password
      } else {
        throw new Error('Invalid email or password');
      }
    }

    // Determine organisation membership
    let membership = null;
    if (requestedOrgId) {
      membership = repository.queryOne(
        "SELECT * FROM organisation_memberships WHERE org_id = ? AND user_id = ? AND status = 'active';",
        [requestedOrgId, user.id]
      );
    } else {
      membership = repository.queryOne(
        `SELECT m.*, o.name as org_name, o.slug as org_slug 
         FROM organisation_memberships m 
         JOIN organisations o ON o.id = m.org_id 
         WHERE m.user_id = ? AND m.status = 'active' 
         ORDER BY m.created_at ASC LIMIT 1;`,
        [user.id]
      );
    }

    const orgId = membership?.org_id || null;
    const orgRole = membership?.role || null;
    const token = this.generateToken(user, orgId, orgRole);

    const now = new Date().toISOString();
    try {
      repository.execute('UPDATE users SET last_login_at = ? WHERE id = ?;', [now, user.id]);
      user.last_login_at = now;
    } catch {}

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        status: user.status || 'active',
        companyName: user.company_name,
        institution: user.institution,
        institutionId: user.institution_id || null,
        avatarUrl: user.avatar_url,
        lastLoginAt: user.last_login_at || now,
      },
      organization: membership ? {
        id: membership.org_id,
        role: membership.role,
        name: membership.org_name || null,
      } : null,
    };
  },

  async register({ fullName, email, password, role = 'student' } = {}) {
    if (!email || !password) {
      throw new Error('Email and password are required');
    }
    if (role === 'platform_admin' || role === 'admin') {
      const err = new Error('Platform administrator accounts cannot be created via public registration. Administrator accounts must be invited by an existing platform administrator.');
      err.statusCode = 403;
      err.code = 'ADMIN_SIGNUP_FORBIDDEN';
      throw err;
    }
    const cleanEmail = email.toLowerCase().trim();
    const cleanName = (fullName || cleanEmail.split('@')[0].replace(/[._-]/g, ' ')).trim();
    const mappedDbRole = role === 'recruiter' ? 'recruiter' : (role === 'college' ? 'college' : 'candidate');
    const now = new Date().toISOString();
    const passwordHash = await this.hashPassword(password);

    return repository.transaction((repo) => {
      const existing = repo.queryOne(
        'SELECT * FROM users WHERE email = ? AND deleted_at IS NULL;',
        [cleanEmail]
      );

      if (existing) {
        if (existing.role === 'platform_admin') {
          const err = new Error('Platform administrator accounts cannot be registered, overwritten, or modified via public signup.');
          err.statusCode = 403;
          err.code = 'ADMIN_ACCOUNT_PROTECTED';
          throw err;
        }
        if (!existing.password_hash || authConfig.enableDemoAuth) {
          repo.execute(
            'UPDATE users SET full_name = ?, password_hash = ?, updated_at = ? WHERE id = ?;',
            [cleanName, passwordHash, now, existing.id]
          );
          return { userId: existing.id };
        }
        throw new Error('An account with this email already exists. Please sign in.');
      }

      const userId = `usr-${mappedDbRole}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      repo.execute(
        `INSERT INTO users (id, email, password_hash, full_name, role, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?);`,
        [userId, cleanEmail, passwordHash, cleanName, mappedDbRole, now, now]
      );

      if (mappedDbRole === 'candidate') {
        const existingProfile = repo.queryOne('SELECT id FROM candidate_profiles WHERE id = ?;', [userId]);
        if (!existingProfile) {
          repo.execute(
            `INSERT INTO candidate_profiles (
              id, headline, target_role, bio, experience_years, location,
              work_preference, visibility, created_at, updated_at
            ) VALUES (?, 'Aspiring Candidate', 'Full-Stack Developer', 'Verified candidate profile.', 0, 'India', 'flexible', 'public', ?, ?);`,
            [userId, now, now]
          );
        }
      } else if (mappedDbRole === 'recruiter') {
        const existingProfile = repo.queryOne('SELECT user_id FROM recruiter_profiles WHERE user_id = ?;', [userId]);
        if (!existingProfile) {
          repo.execute(
            `INSERT INTO recruiter_profiles (user_id, title, department, created_at, updated_at)
             VALUES (?, 'Talent Acquisition', 'Hiring', ?, ?);`,
            [userId, now, now]
          );
        }
        const defaultOrg = repo.queryOne("SELECT id, name FROM organisations LIMIT 1;") || { id: 'org-demo-1', name: 'Sarathi Enterprise Systems' };
        const memId = `mem-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        repo.execute(
          `INSERT INTO organisation_memberships (id, org_id, user_id, role, status, created_at, updated_at)
           VALUES (?, ?, ?, 'recruiter', 'active', ?, ?);`,
          [memId, defaultOrg.id, userId, now, now]
        );
      }

      return { userId };
    });

    return this.login(cleanEmail, password);
  },

  async getUserById(userId) {
    return repository.queryOne(
      'SELECT id, email, full_name, role, status, company_name, institution, timezone, avatar_url, last_login_at, created_at FROM users WHERE id = ?;',
      [userId]
    );
  },

  async getUserOrganizations(userId) {
    return repository.query(
      `SELECT o.id, o.name, o.slug, o.timezone, o.currency, m.role, m.status, m.created_at as joined_at
       FROM organisations o
       JOIN organisation_memberships m ON m.org_id = o.id
       WHERE m.user_id = ? AND m.status = 'active'
       ORDER BY o.name ASC;`,
      [userId]
    );
  },

  async getOrCreateRecruiterSession({ email, orgId } = {}) {
    const targetEmail = (email || 'recruiter@sarathi.local').toLowerCase().trim();
    let recruiter = repository.queryOne(
      "SELECT * FROM users WHERE email = ? AND role = 'recruiter' AND deleted_at IS NULL;",
      [targetEmail]
    );
    if (!recruiter) {
      recruiter = repository.queryOne(
        "SELECT * FROM users WHERE role = 'recruiter' AND deleted_at IS NULL LIMIT 1;"
      );
    }
    if (!recruiter) {
      throw new Error('No active recruiter account found');
    }

    const targetOrgId = orgId || 'org-demo-1';
    let membership = repository.queryOne(
      "SELECT * FROM organisation_memberships WHERE org_id = ? AND user_id = ? AND status = 'active';",
      [targetOrgId, recruiter.id]
    );
    if (!membership) {
      membership = repository.queryOne(
        "SELECT * FROM organisation_memberships WHERE user_id = ? AND status = 'active' LIMIT 1;",
        [recruiter.id]
      );
    }

    const resolvedOrgId = membership?.org_id || targetOrgId;
    const resolvedOrgRole = membership?.role || 'recruiter';
    const token = this.generateToken(recruiter, resolvedOrgId, resolvedOrgRole);

    return {
      token,
      user: {
        id: recruiter.id,
        email: recruiter.email,
        fullName: recruiter.full_name,
        role: recruiter.role,
        orgId: resolvedOrgId,
        orgRole: resolvedOrgRole,
      },
      organization: {
        id: resolvedOrgId,
        role: resolvedOrgRole,
      }
    };
  },

  async getOrCreateStudentSession({ id, email, fullName, institution, targetRole, bio } = {}) {
    if (!email) {
      throw new Error('Email is required for student session');
    }
    const cleanEmail = email.toLowerCase().trim();
    const cleanName = (fullName || cleanEmail.split('@')[0].replace(/[._-]/g, ' ')).trim();
    const cleanId = id || `usr-student-${cleanEmail.replace(/[^a-z0-9]/g, '-')}`;
    const now = new Date().toISOString();

    const candidate = repository.transaction((repo) => {
      let existingUser = repo.queryOne(
        'SELECT * FROM users WHERE email = ? OR id = ?;',
        [cleanEmail, cleanId]
      );

      let finalUserId = cleanId;

      if (!existingUser) {
        repo.execute(
          `INSERT INTO users (id, email, full_name, role, institution, created_at, updated_at)
           VALUES (?, ?, ?, 'candidate', ?, ?, ?);`,
          [cleanId, cleanEmail, cleanName, institution || '', now, now]
        );
      } else {
        finalUserId = existingUser.id;
        repo.execute(
          `UPDATE users SET full_name = COALESCE(?, full_name), institution = COALESCE(?, institution), updated_at = ?
           WHERE id = ?;`,
          [cleanName, institution || null, now, finalUserId]
        );
      }

      const existingProfile = repo.queryOne(
        'SELECT id FROM candidate_profiles WHERE id = ?;',
        [finalUserId]
      );

      if (!existingProfile) {
        repo.execute(
          `INSERT INTO candidate_profiles (
            id, headline, target_role, bio, experience_years, location,
            work_preference, visibility, created_at, updated_at
          ) VALUES (?, ?, ?, ?, 0, 'India', 'flexible', 'public', ?, ?);`,
          [
            finalUserId,
            targetRole ? `Aspiring ${targetRole}` : 'Student Candidate',
            targetRole || 'Full-Stack Developer',
            bio || 'Dedicated student eager to demonstrate verified capabilities.',
            now,
            now
          ]
        );
      }

      return repo.queryOne(
        `SELECT u.id, u.email, u.full_name, u.role, u.institution,
                cp.headline, cp.target_role, cp.bio
         FROM users u
         JOIN candidate_profiles cp ON cp.id = u.id
         WHERE u.id = ?;`,
        [finalUserId]
      );
    });

    const token = this.generateToken(candidate, null, 'candidate');

    return {
      token,
      user: {
        id: candidate.id,
        email: candidate.email,
        fullName: candidate.full_name,
        role: candidate.role,
        institution: candidate.institution,
        headline: candidate.headline,
        targetRole: candidate.target_role,
      }
    };
  },

  async getOrCreateGoogleSession({ email, fullName, avatarUrl, role = 'student' } = {}) {
    if (!email) {
      throw new Error('Email is required for Google login');
    }
    const cleanEmail = email.toLowerCase().trim();
    const cleanName = (fullName || cleanEmail.split('@')[0].replace(/[._-]/g, ' ')).trim();
    const mappedDbRole = role === 'recruiter' ? 'recruiter' : (role === 'college' ? 'college' : 'candidate');
    const now = new Date().toISOString();

    const result = repository.transaction((repo) => {
      let existingUser = repo.queryOne(
        'SELECT * FROM users WHERE email = ? AND deleted_at IS NULL;',
        [cleanEmail]
      );

      if (existingUser && existingUser.role === 'platform_admin') {
        const err = new Error('Platform administrator accounts cannot be accessed via Google SSO. Please sign in with administrator credentials.');
        err.statusCode = 403;
        err.code = 'ADMIN_SSO_FORBIDDEN';
        throw err;
      }

      let userId;
      if (!existingUser) {
        userId = `usr-google-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        repo.execute(
          `INSERT INTO users (id, email, full_name, role, avatar_url, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?);`,
          [userId, cleanEmail, cleanName, mappedDbRole, avatarUrl || null, now, now]
        );
      } else {
        userId = existingUser.id;
        repo.execute(
          `UPDATE users SET 
            full_name = COALESCE(?, full_name),
            avatar_url = COALESCE(?, avatar_url),
            updated_at = ?
           WHERE id = ?;`,
          [cleanName, avatarUrl || null, now, userId]
        );
      }

      const user = repo.queryOne('SELECT * FROM users WHERE id = ?;', [userId]);

      if (user.role === 'candidate') {
        const existingProfile = repo.queryOne('SELECT id FROM candidate_profiles WHERE id = ?;', [userId]);
        if (!existingProfile) {
          repo.execute(
            `INSERT INTO candidate_profiles (
              id, headline, target_role, bio, experience_years, location,
              work_preference, visibility, created_at, updated_at
            ) VALUES (?, 'Google User Candidate', 'Full-Stack Developer', 'Verified Google user profile.', 0, 'India', 'flexible', 'public', ?, ?);`,
            [userId, now, now]
          );
        }
        return { user, org: null };
      } else if (user.role === 'recruiter') {
        const existingProfile = repo.queryOne('SELECT user_id FROM recruiter_profiles WHERE user_id = ?;', [userId]);
        if (!existingProfile) {
          repo.execute(
            `INSERT INTO recruiter_profiles (user_id, title, department, created_at, updated_at)
             VALUES (?, 'Talent Partner', 'Engineering Hiring', ?, ?);`,
            [userId, now, now]
          );
        }
        const existingMembership = repo.queryOne(
          "SELECT * FROM organisation_memberships WHERE user_id = ? AND status = 'active' LIMIT 1;",
          [userId]
        );
        let membership = existingMembership;
        if (!membership) {
          const defaultOrg = repo.queryOne("SELECT id, name FROM organisations LIMIT 1;") || { id: 'org-demo-1', name: 'Sarathi Enterprise Systems' };
          const memId = `mem-google-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
          repo.execute(
            `INSERT INTO organisation_memberships (id, org_id, user_id, role, status, created_at, updated_at)
             VALUES (?, ?, ?, 'recruiter', 'active', ?, ?);`,
            [memId, defaultOrg.id, userId, now, now]
          );
          membership = { org_id: defaultOrg.id, role: 'recruiter', org_name: defaultOrg.name };
        }
        return { user, org: membership };
      }

      return { user, org: null };
    });

    const orgId = result.org?.org_id || null;
    const orgRole = result.org?.role || (result.user.role === 'recruiter' ? 'recruiter' : null);
    const token = this.generateToken(result.user, orgId, orgRole);

    return {
      token,
      user: {
        id: result.user.id,
        email: result.user.email,
        fullName: result.user.full_name,
        role: result.user.role === 'candidate' ? 'student' : result.user.role,
        avatarUrl: result.user.avatar_url,
      },
      organization: result.org ? {
        id: result.org.org_id,
        role: result.org.role,
        name: result.org.org_name || 'Sarathi Enterprise Systems',
      } : null,
    };
  },

  async changePassword(userId, currentPassword, newPassword) {
    if (!newPassword || newPassword.length < 8) {
      throw new Error('New password must be at least 8 characters long');
    }
    const user = repository.queryOne('SELECT * FROM users WHERE id = ? AND deleted_at IS NULL;', [userId]);
    if (!user) {
      throw new Error('User not found');
    }

    if (user.password_hash) {
      const match = await this.comparePassword(currentPassword, user.password_hash);
      if (!match) {
        if (!authConfig.enableDemoAuth || (currentPassword !== 'password123' && currentPassword !== 'demo123')) {
          throw new Error('Current password is incorrect');
        }
      }
    }

    const newHash = await this.hashPassword(newPassword);
    const now = new Date().toISOString();
    repository.execute('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?;', [newHash, now, userId]);

    return { success: true, message: 'Password updated successfully' };
  },

  async createPasswordResetToken(email) {
    if (!email) {
      throw new Error('Email is required');
    }
    const cleanEmail = email.toLowerCase().trim();
    const user = repository.queryOne('SELECT * FROM users WHERE email = ? AND deleted_at IS NULL;', [cleanEmail]);

    if (!user) {
      return {
        success: true,
        message: 'If an account exists with this email, password reset instructions have been sent.',
      };
    }

    const resetToken = randomBytes(24).toString('hex');
    const resetId = `pwr-${uuidv4().slice(0, 8)}`;
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

    repository.execute(
      `INSERT INTO password_resets (id, user_id, token_hash, expires_at, used_at)
       VALUES (?, ?, ?, ?, NULL);`,
      [resetId, user.id, resetToken, expiresAt]
    );

    return {
      success: true,
      message: 'Password reset instructions have been sent.',
      resetToken: (authConfig.enableDemoAuth || process.env.NODE_ENV !== 'production') ? resetToken : undefined,
    };
  },

  async resetPasswordWithToken(token, newPassword) {
    if (!token) {
      throw new Error('Reset token is required');
    }
    if (!newPassword || newPassword.length < 8) {
      throw new Error('New password must be at least 8 characters long');
    }

    const now = new Date().toISOString();
    const resetRecord = repository.queryOne(
      'SELECT * FROM password_resets WHERE token_hash = ? AND used_at IS NULL AND expires_at > ?;',
      [token.trim(), now]
    );

    if (!resetRecord) {
      throw new Error('Invalid or expired password reset token');
    }

    const newHash = await this.hashPassword(newPassword);

    repository.transaction(repo => {
      repo.execute('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?;', [newHash, now, resetRecord.user_id]);
      repo.execute('UPDATE password_resets SET used_at = ? WHERE id = ?;', [now, resetRecord.id]);
    });

    return {
      success: true,
      message: 'Password has been reset successfully. You can now log in.',
    };
  }
};

