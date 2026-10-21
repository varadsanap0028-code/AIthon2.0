import { OAuth2Client } from 'google-auth-library';
import { randomBytes, randomUUID as uuidv4 } from 'node:crypto';
import { google as googleConfig, auth as authConfig, app as appConfig } from '../config/index.js';
import { repository } from '../data/repository.js';
import { roleResolver } from './roleResolver.js';
import { authService } from './authService.js';

let customVerifier = null;

export const googleAuthService = {
  /**
   * Set custom verifier for testing / mocking.
   */
  setVerifier(verifierFn) {
    customVerifier = verifierFn;
  },

  /**
   * Reset custom verifier to default Google Identity client.
   */
  resetVerifier() {
    customVerifier = null;
  },

  /**
   * Generates and stores a single-use nonce for replay protection.
   */
  generateNonce() {
    const nonce = randomBytes(24).toString('hex');
    const now = Date.now();
    const expiresAt = now + (googleConfig.nonceTtlMs || 600000);

    repository.execute(
      'INSERT INTO auth_nonces (nonce, expires_at, used_at) VALUES (?, ?, NULL);',
      [nonce, expiresAt]
    );

    // Prune expired nonces
    repository.execute('DELETE FROM auth_nonces WHERE expires_at < ?;', [now]);

    return { nonce, expiresAt };
  },

  /**
   * Consumes a single-use nonce. Throws if invalid, expired, or already used.
   */
  consumeNonce(nonce) {
    if (!nonce) return false;
    const now = Date.now();

    const record = repository.queryOne(
      'SELECT * FROM auth_nonces WHERE nonce = ?;',
      [nonce]
    );

    if (!record) {
      const err = new Error('Invalid or unrecognized authentication nonce.');
      err.code = 'GOOGLE_TOKEN_INVALID';
      throw err;
    }

    if (record.used_at !== null) {
      const err = new Error('Authentication nonce has already been consumed (replay detected).');
      err.code = 'GOOGLE_TOKEN_INVALID';
      throw err;
    }

    if (now > record.expires_at) {
      const err = new Error('Authentication nonce has expired.');
      err.code = 'GOOGLE_TOKEN_INVALID';
      throw err;
    }

    repository.execute('UPDATE auth_nonces SET used_at = ? WHERE nonce = ?;', [now, nonce]);
    return true;
  },

  /**
   * Verifies Google ID Token cryptographically.
   */
  async verifyIdToken(idToken) {
    if (!idToken) {
      const err = new Error('Google credential token is required.');
      err.code = 'GOOGLE_TOKEN_INVALID';
      throw err;
    }

    // 1. If custom verifier injected (unit & integration tests)
    if (customVerifier) {
      return customVerifier(idToken);
    }

    // 2. If Google Client ID not configured
    if (!googleConfig.clientId) {
      // In demo mode, if simulated token
      if (authConfig.enableDemoAuth && appConfig.mode === 'demo') {
        try {
          const parts = idToken.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
            return {
              sub: payload.sub || `demo-sub-${payload.email}`,
              email: payload.email,
              emailVerified: payload.email_verified !== false,
              name: payload.name || payload.email?.split('@')[0],
              picture: payload.picture,
              hd: payload.hd,
              nonce: payload.nonce,
            };
          }
        } catch {
          // fall through
        }
      }

      const err = new Error('Google Sign-In is not configured on this server (GOOGLE_CLIENT_ID missing).');
      err.code = 'GOOGLE_NOT_CONFIGURED';
      throw err;
    }

    // 3. Official Google OAuth2Client Verification
    const client = new OAuth2Client(googleConfig.clientId);
    let ticket;
    try {
      ticket = await client.verifyIdToken({
        idToken,
        audience: googleConfig.clientId,
      });
    } catch (verifErr) {
      const err = new Error(`Google token verification failed: ${verifErr.message}`);
      err.code = 'GOOGLE_TOKEN_INVALID';
      throw err;
    }

    const payload = ticket.getPayload();
    if (!payload) {
      const err = new Error('Empty payload returned from Google verification.');
      err.code = 'GOOGLE_TOKEN_INVALID';
      throw err;
    }

    // Issuer validation
    const validIssuers = ['accounts.google.com', 'https://accounts.google.com'];
    if (!validIssuers.includes(payload.iss)) {
      const err = new Error(`Invalid Google token issuer: ${payload.iss}`);
      err.code = 'GOOGLE_TOKEN_INVALID';
      throw err;
    }

    // Domain (HD) check if configured
    if (googleConfig.allowedHd && payload.hd !== googleConfig.allowedHd) {
      const err = new Error(`Access restricted to accounts under domain: ${googleConfig.allowedHd}`);
      err.code = 'ROLE_NOT_PROVISIONED';
      throw err;
    }

    return {
      sub: payload.sub,
      email: payload.email,
      emailVerified: Boolean(payload.email_verified),
      name: payload.name || payload.given_name || payload.email?.split('@')[0],
      picture: payload.picture,
      hd: payload.hd,
      nonce: payload.nonce,
    };
  },

  /**
   * Full Google Authentication flow:
   * verifies token, consumes nonce, resolves role/user, issues JWT.
   */
  async authenticateGoogle({ credential, portalHint, nonce }) {
    const claims = await this.verifyIdToken(credential);

    // Consume nonce if supplied in payload or claims
    const effectiveNonce = nonce || claims.nonce;
    if (effectiveNonce) {
      this.consumeNonce(effectiveNonce);
    }

    // Authoritative role resolution from database
    const { user, orgId, orgRole, isNew, linked } = await roleResolver.resolveGoogleIdentity(
      claims,
      portalHint
    );

    // Issue standard Sarathi JWT
    const token = authService.generateToken(user, orgId, orgRole);

    let organization = null;
    if (orgId) {
      organization = repository.queryOne('SELECT id, name, slug FROM organisations WHERE id = ?;', [orgId]);
    }

    const now = new Date().toISOString();
    try {
      repository.execute('UPDATE users SET last_login_at = ? WHERE id = ?;', [now, user.id]);
      user.last_login_at = now;
    } catch {}

    // Compute canonical redirect route based on database role
    let portalRedirect = '/student/dashboard';
    if (user.role === 'recruiter') {
      portalRedirect = '/recruiter/dashboard';
    } else if (user.role === 'college') {
      portalRedirect = '/college/dashboard';
    } else if (user.role === 'platform_admin') {
      portalRedirect = '/admin';
    }

    return {
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        status: user.status,
        avatarUrl: user.avatar_url,
        institutionId: user.institution_id || null,
        lastLoginAt: user.last_login_at || now,
      },
      organization,
      portalRedirect,
      defaultDashboard: portalRedirect,
      isNewUser: isNew,
      wasLinked: linked,
    };
  },

  /**
   * Links a Google identity to an already-authenticated user.
   */
  async linkGoogleAccount(authenticatedUser, credential) {
    if (!authenticatedUser?.id) {
      const err = new Error('Authentication required');
      err.code = 'SESSION_EXPIRED';
      throw err;
    }

    const claims = await this.verifyIdToken(credential);
    const now = new Date().toISOString();

    // Check if this Google sub is already linked to another account
    const existing = repository.queryOne(
      'SELECT * FROM auth_identities WHERE provider = ? AND provider_subject = ?;',
      ['google', claims.sub]
    );

    if (existing) {
      if (existing.user_id === authenticatedUser.id) {
        return { success: true, message: 'Google account is already linked to your profile.' };
      }
      const err = new Error('This Google account is already linked to another Sarathi user.');
      err.code = 'LINK_REQUIRES_PASSWORD';
      throw err;
    }

    // Insert link
    repository.execute(
      `INSERT INTO auth_identities (id, user_id, provider, provider_subject, email_at_link, created_at, last_login_at)
       VALUES (?, ?, 'google', ?, ?, ?, ?);`,
      [`ident-${uuidv4()}`, authenticatedUser.id, claims.sub, claims.email, now, now]
    );

    return { success: true, message: 'Google account linked successfully.' };
  },
};
