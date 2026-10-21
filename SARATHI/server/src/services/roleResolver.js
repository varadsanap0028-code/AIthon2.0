import { randomUUID as uuidv4 } from 'node:crypto';
import { repository } from '../data/repository.js';

export const roleResolver = {
  /**
   * Resolves a user from verified Google identity claims following strict security rules.
   *
   * @param {object} googleClaims
   * @param {string} googleClaims.sub - Google subject ID (authoritative key)
   * @param {string} googleClaims.email - Google account email
   * @param {boolean} googleClaims.emailVerified - Whether email is verified by Google
   * @param {string} [googleClaims.name] - User full name
   * @param {string} [googleClaims.picture] - User avatar URL
   * @param {string} [googleClaims.hd] - Hosted GSuite domain (if applicable)
   * @param {string} [portalHint] - UI hint only: 'student' | 'recruiter' | 'college'
   * @returns {Promise<{ user: object, orgId: string|null, orgRole: string|null, isNew: boolean, linked: boolean }>}
   */
  async resolveGoogleIdentity(googleClaims, portalHint = 'student') {
    const { sub, email, emailVerified, name, picture } = googleClaims;

    if (!sub) {
      const err = new Error('Invalid Google identity payload: missing subject identifier');
      err.code = 'GOOGLE_TOKEN_INVALID';
      throw err;
    }

    if (!emailVerified) {
      const err = new Error('Google email is not verified. Unverified accounts cannot authenticate.');
      err.code = 'GOOGLE_TOKEN_INVALID';
      throw err;
    }

    const cleanEmail = (email || '').toLowerCase().trim();
    const now = new Date().toISOString();

    // 1. Check known (provider='google', provider_subject=sub)
    const existingIdentity = repository.queryOne(
      'SELECT * FROM auth_identities WHERE provider = ? AND provider_subject = ?;',
      ['google', sub]
    );

    if (existingIdentity) {
      const user = repository.queryOne(
        'SELECT * FROM users WHERE id = ? AND deleted_at IS NULL;',
        [existingIdentity.user_id]
      );

      if (!user) {
        const err = new Error('Account associated with Google identity has been removed.');
        err.code = 'ACCOUNT_SUSPENDED';
        throw err;
      }

      // Check account status
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

      // Update last login timestamp
      repository.execute(
        'UPDATE auth_identities SET last_login_at = ? WHERE id = ?;',
        [now, existingIdentity.id]
      );

      const orgContext = this.getUserOrgContext(user.id);
      return {
        user,
        orgId: orgContext.orgId,
        orgRole: orgContext.orgRole,
        isNew: false,
        linked: false,
      };
    }

    // 2. Check if a user with this email already exists in users table
    const existingUser = repository.queryOne(
      'SELECT * FROM users WHERE email = ? AND deleted_at IS NULL;',
      [cleanEmail]
    );

    if (existingUser) {
      // Check account status
      if (existingUser.status === 'suspended') {
        const err = new Error('Your account has been suspended. Please contact platform administration.');
        err.code = 'ACCOUNT_SUSPENDED';
        throw err;
      }

      if (existingUser.status === 'pending_approval') {
        const err = new Error('Your account is awaiting administrative approval.');
        err.code = 'PENDING_APPROVAL';
        throw err;
      }

      // Linking Policy D-02:
      // Auto-link candidate (student) accounts if email_verified is true
      if (existingUser.role === 'candidate') {
        const identityId = `ident-${uuidv4()}`;
        repository.execute(
          `INSERT INTO auth_identities (id, user_id, provider, provider_subject, email_at_link, created_at, last_login_at)
           VALUES (?, ?, 'google', ?, ?, ?, ?);`,
          [identityId, existingUser.id, sub, cleanEmail, now, now]
        );

        // Optionally update avatar if missing
        if (!existingUser.avatar_url && picture) {
          repository.execute('UPDATE users SET avatar_url = ? WHERE id = ?;', [picture, existingUser.id]);
          existingUser.avatar_url = picture;
        }

        const orgContext = this.getUserOrgContext(existingUser.id);
        return {
          user: existingUser,
          orgId: orgContext.orgId,
          orgRole: orgContext.orgRole,
          isNew: false,
          linked: true,
        };
      }

      // For privileged roles (recruiter, college, platform_admin): require password proof
      const err = new Error(
        `This email is registered as an institutional/recruiter account (${existingUser.role}). To protect your organization, please sign in with your password to connect your Google account in Settings.`
      );
      err.code = 'LINK_REQUIRES_PASSWORD';
      throw err;
    }

    // 3. New User Registration
    const normalizedHint = (portalHint || '').toLowerCase().trim();

    // Privileged self-registration through Google is strictly blocked without prior invitation
    if (normalizedHint === 'recruiter' || normalizedHint === 'college') {
      // Check for an active invitation
      const invitation = repository.queryOne(
        `SELECT * FROM account_invitations 
         WHERE email = ? AND role = ? AND status = 'pending' AND expires_at > ?;`,
        [cleanEmail, normalizedHint, now]
      );

      if (!invitation) {
        const err = new Error(
          `No active invitation found for ${cleanEmail} as a ${normalizedHint}. Institutional accounts must be provisioned or invited by an administrator.`
        );
        err.code = 'ROLE_NOT_PROVISIONED';
        throw err;
      }

      // Provision user from invitation
      const userId = `usr-${uuidv4().substring(0, 8)}`;
      const fullName = name || 'Invited User';

      return repository.transaction(() => {
        repository.execute(
          `INSERT INTO users (id, email, password_hash, full_name, role, status, institution_id, avatar_url, created_at, updated_at)
           VALUES (?, ?, NULL, ?, ?, 'active', ?, ?, ?, ?);`,
          [userId, cleanEmail, fullName, invitation.role, invitation.institution_id || null, picture || null, now, now]
        );

        if (invitation.org_id && invitation.role === 'recruiter') {
          repository.execute(
            `INSERT INTO organisation_memberships (id, org_id, user_id, role, status, created_at, updated_at)
             VALUES (?, ?, ?, 'recruiter', 'active', ?, ?);`,
            [`mem-${uuidv4().substring(0, 8)}`, invitation.org_id, userId, now, now]
          );
        }

        // Link Google Identity
        repository.execute(
          `INSERT INTO auth_identities (id, user_id, provider, provider_subject, email_at_link, created_at, last_login_at)
           VALUES (?, ?, 'google', ?, ?, ?, ?);`,
          [`ident-${uuidv4()}`, userId, sub, cleanEmail, now, now]
        );

        // Mark invitation accepted
        repository.execute(
          `UPDATE account_invitations SET status = 'accepted' WHERE id = ?;`,
          [invitation.id]
        );

        const newUser = repository.queryOne('SELECT * FROM users WHERE id = ?;', [userId]);
        return {
          user: newUser,
          orgId: invitation.org_id || null,
          orgRole: invitation.role,
          isNew: true,
          linked: true,
        };
      });
    }

    // Default: Self-serve Candidate (Student) Registration
    const newUserId = `usr-${uuidv4().substring(0, 8)}`;
    const displayName = name || cleanEmail.split('@')[0] || 'Student Candidate';

    return repository.transaction(() => {
      // Create user
      repository.execute(
        `INSERT INTO users (id, email, password_hash, full_name, role, status, avatar_url, created_at, updated_at)
         VALUES (?, ?, NULL, ?, 'candidate', 'active', ?, ?, ?);`,
        [newUserId, cleanEmail, displayName, picture || null, now, now]
      );

      // Create candidate profile
      repository.execute(
        `INSERT INTO candidate_profiles (id, headline, target_role, visibility, created_at, updated_at)
         VALUES (?, 'Software Engineer', 'Full-Stack Developer', 'public', ?, ?);`,
        [newUserId, now, now]
      );

      // Link Google identity
      repository.execute(
        `INSERT INTO auth_identities (id, user_id, provider, provider_subject, email_at_link, created_at, last_login_at)
         VALUES (?, ?, 'google', ?, ?, ?, ?);`,
        [`ident-${uuidv4()}`, newUserId, sub, cleanEmail, now, now]
      );

      // Insert welcome notification
      repository.execute(
        `INSERT INTO notifications (id, user_id, type, title, body, is_read, created_at)
         VALUES (?, ?, 'success', 'Welcome to Sarathi AI!', 'Your Google account has been connected. Start your skill assessment to generate your personalized career roadmap.', 0, ?);`,
        [`notif-${uuidv4().substring(0, 8)}`, newUserId, now]
      );

      const createdUser = repository.queryOne('SELECT * FROM users WHERE id = ?;', [newUserId]);
      return {
        user: createdUser,
        orgId: null,
        orgRole: null,
        isNew: true,
        linked: true,
      };
    });
  },

  /**
   * Helper to fetch active organization membership context for a user.
   */
  getUserOrgContext(userId) {
    const membership = repository.queryOne(
      `SELECT m.org_id, m.role FROM organisation_memberships m 
       WHERE m.user_id = ? AND m.status = 'active' LIMIT 1;`,
      [userId]
    );

    return {
      orgId: membership?.org_id || null,
      orgRole: membership?.role || null,
    };
  },
};
