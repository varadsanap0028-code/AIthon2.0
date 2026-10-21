import { z } from 'zod';
import { Router } from 'express';
import { authService } from '../services/authService.js';
import { googleAuthService } from '../services/googleAuthService.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { validateBody } from '../middleware/validate.js';
import { createAuthRateLimiter, clearRateLimit } from '../middleware/rateLimiter.js';
import { auth as authConfig, app as appConfig, google as googleConfig } from '../config/index.js';
import { repository } from '../data/repository.js';

const router = Router();

const loginLimiter = createAuthRateLimiter({ prefix: 'login', maxAttempts: 20, windowMs: 15 * 60 * 1000 });
const googleLimiter = createAuthRateLimiter({ prefix: 'google', maxAttempts: 20, windowMs: 15 * 60 * 1000 });
const recoveryLimiter = createAuthRateLimiter({ prefix: 'recovery', maxAttempts: 10, windowMs: 15 * 60 * 1000 });

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters long'),
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters long'),
});

router.get('/mode', (req, res) => {
  res.json({
    mode: appConfig.mode,
    demoAuthEnabled: authConfig.enableDemoAuth,
    googleAuthEnabled: Boolean(googleConfig.clientId) || (authConfig.enableDemoAuth && appConfig.mode === 'demo'),
    googleClientId: googleConfig.clientId || null,
    environment: appConfig.env,
    activeDatabase: 'sqlite',
  });
});

// Demo-only: clears in-memory rate-limit counters so the admin auto-login
// page isn't blocked after repeated dev restarts / failed attempts.
router.post('/clear-rate-limit', (req, res) => {
  if (appConfig.mode !== 'demo') {
    return res.status(403).json({ error: 'Only available in demo mode' });
  }
  const { prefix } = req.body || {};
  clearRateLimit(prefix || null);
  res.json({ ok: true, message: 'Rate limit cleared' });
});


router.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const { email, password, orgId } = req.body || {};
    if (!email || !password) {
      req.recordAuthFailure?.();
      return res.status(400).json({
        error: 'Email and password are required',
        code: 'INVALID_CREDENTIALS',
        message: 'Email and password are required',
        errorDetail: { code: 'INVALID_CREDENTIALS', message: 'Email and password are required' },
      });
    }

    const result = await authService.login(email, password, orgId);
    req.recordAuthSuccess?.();
    res.json(result);
  } catch (err) {
    req.recordAuthFailure?.();
    const code = err.code || 'INVALID_CREDENTIALS';
    const status = (code === 'ACCOUNT_SUSPENDED' || code === 'PENDING_APPROVAL') ? 403 : 400;
    res.status(status).json({
      error: err.message,
      code,
      message: err.message,
      errorDetail: {
        code,
        message: err.message,
      },
    });
  }
});

import { featureFlagService } from '../services/admin/featureFlagService.js';

router.post('/register', async (req, res, next) => {
  try {
    if (!featureFlagService.isEnabled('signups_open', true)) {
      return res.status(403).json({
        error: {
          code: 'SIGNUPS_CLOSED',
          message: 'User registration is temporarily closed for platform maintenance.',
        },
      });
    }

    const { email, password, fullName, role } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({
        error: 'Email and password are required',
        code: 'INVALID_CREDENTIALS',
        message: 'Email and password are required',
      });
    }

    if (role === 'platform_admin' || role === 'admin') {
      return res.status(403).json({
        error: {
          code: 'ADMIN_SIGNUP_FORBIDDEN',
          message: 'Platform administrator accounts cannot be created via public registration. Administrator accounts must be provisioned or invited by an existing platform administrator.',
        },
      });
    }

    const result = await authService.register({ email, password, fullName, role });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Nonce generation for Google SSO replay protection
router.get('/google/nonce', googleLimiter, (req, res) => {
  const nonceData = googleAuthService.generateNonce();
  res.json({ success: true, nonce: nonceData.nonce, expiresAt: nonceData.expiresAt });
});

// Real Google SSO token verification & authoritative role resolution
router.post('/google', googleLimiter, async (req, res, next) => {
  try {
    const { credential, portalHint, nonce, email, fullName, avatarUrl, role } = req.body || {};

    if (credential) {
      const result = await googleAuthService.authenticateGoogle({
        credential,
        portalHint,
        nonce,
      });
      req.recordAuthSuccess?.();
      return res.json(result);
    }

    // In demo mode only, fallback if simulated demo profile sent
    if (authConfig.enableDemoAuth && appConfig.mode === 'demo' && email) {
      const result = await authService.getOrCreateGoogleSession({
        email,
        fullName,
        avatarUrl,
        role: role || 'student',
      });
      req.recordAuthSuccess?.();
      return res.json(result);
    }

    req.recordAuthFailure?.();
    return res.status(400).json({
      error: {
        code: 'GOOGLE_TOKEN_INVALID',
        message: 'Google credential ID token is required.',
      },
      message: 'Google credential ID token is required.',
      code: 'GOOGLE_TOKEN_INVALID',
    });
  } catch (err) {
    req.recordAuthFailure?.();
    const code = err.code || 'GOOGLE_TOKEN_INVALID';
    const status = (code === 'ROLE_NOT_PROVISIONED' || code === 'ACCOUNT_SUSPENDED' || code === 'PENDING_APPROVAL') ? 403 : 401;

    res.status(status).json({
      error: {
        code,
        message: err.message,
      },
      message: err.message,
      code,
    });
  }
});

// Connect / Link Google account to authenticated user
router.post('/google/link', requireAuth, async (req, res, next) => {
  try {
    const { credential } = req.body || {};
    if (!credential) {
      return res.status(400).json({
        error: { code: 'GOOGLE_TOKEN_INVALID', message: 'Google credential token is required' },
      });
    }
    const result = await googleAuthService.linkGoogleAccount(req.user, credential);
    res.json(result);
  } catch (err) {
    const code = err.code || 'LINK_REQUIRES_PASSWORD';
    res.status(400).json({
      error: { code, message: err.message },
      message: err.message,
      code,
    });
  }
});

router.post('/student-session', async (req, res, next) => {
  try {
    if (!authConfig.enableDemoAuth || appConfig.env === 'production') {
      return res.status(403).json({
        error: 'Demo session generation is disabled. Please authenticate using verified credentials.',
      });
    }

    const { id, email, fullName, institution, targetRole, bio } = req.body || {};
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanId = id || `usr-student-${cleanEmail.replace(/[^a-z0-9]/g, '-')}`;

    const DEMO_STUDENT_EMAIL = 'student@sarathi.ai';
    const DEMO_STUDENT_ID = 'usr-student-demo';

    const existingUser = authService.findUserByEmailOrId(cleanEmail, cleanId);
    if (existingUser && existingUser.email !== DEMO_STUDENT_EMAIL && existingUser.id !== DEMO_STUDENT_ID) {
      return res.status(403).json({
        error: 'Cannot generate a demo session for an existing user account. Please authenticate with verified credentials.',
      });
    }

    const result = await authService.getOrCreateStudentSession({
      id: cleanId,
      email: cleanEmail,
      fullName,
      institution,
      targetRole,
      bio,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/recruiter-session', async (req, res, next) => {
  try {
    if (!authConfig.enableDemoAuth || appConfig.env === 'production') {
      return res.status(403).json({
        error: 'Demo session generation is disabled. Please authenticate using verified credentials.',
      });
    }

    const { email, orgId } = req.body || {};
    const DEMO_RECRUITER_EMAIL = 'recruiter@sarathi.ai';
    const DEMO_ORG_ID = 'org-demo-1';

    if (email && email.toLowerCase().trim() !== DEMO_RECRUITER_EMAIL && email.toLowerCase().trim() !== 'recruiter@sarathi.local') {
      return res.status(403).json({
        error: 'Demo recruiter sessions can only be issued for the designated demo recruiter account.',
      });
    }

    if (orgId && orgId !== DEMO_ORG_ID) {
      return res.status(403).json({
        error: 'Demo recruiter sessions are restricted to the default demo organization.',
      });
    }

    const result = await authService.getOrCreateRecruiterSession({
      email: DEMO_RECRUITER_EMAIL,
      orgId: DEMO_ORG_ID,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/logout', (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await authService.getUserById(req.user.id);
    const orgs = await authService.getUserOrganizations(req.user.id);

    // Fetch linked auth identities
    const identities = repository.queryAll(
      'SELECT provider, created_at, last_login_at FROM auth_identities WHERE user_id = ?;',
      [req.user.id]
    );

    const authMethods = ['password', ...identities.map((i) => i.provider)];

    res.json({
      user: {
        ...user,
        status: user?.status || 'active',
        institutionId: user?.institution_id || null,
      },
      activeOrgId: req.orgId,
      organizations: orgs,
      identities,
      authMethods: Array.from(new Set(authMethods)),
    });
  } catch (err) {
    next(err);
  }
});

router.post('/change-password', requireAuth, validateBody(changePasswordSchema), async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const result = await authService.changePassword(req.user.id, currentPassword, newPassword);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/forgot-password', recoveryLimiter, validateBody(forgotPasswordSchema), async (req, res, next) => {
  try {
    const { email } = req.body;
    const result = await authService.createPasswordResetToken(email);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/reset-password', recoveryLimiter, validateBody(resetPasswordSchema), async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;
    const result = await authService.resetPasswordWithToken(token, newPassword);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
