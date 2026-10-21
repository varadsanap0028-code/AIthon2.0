/**
 * In-memory sliding window rate limiter for authentication endpoints.
 * Limits failed attempts per client key (IP + email).
 */

const attemptsMap = new Map();
const DEFAULT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const DEFAULT_MAX_ATTEMPTS = 10;

import { app as appConfig } from '../config/index.js';

const DEMO_EXEMPT_EMAILS = new Set([
  'admin@sarathi.dev',
  'recruiter@sarathi.ai',
  'student@sarathi.ai',
  'admin@apex.edu',
  'alex.morgan@sarathi.dev',
  'vikram.mehta@sarathi.ai',
  'priya.sharma@sarathi.ai',
]);

/**
 * Creates an Express middleware for rate-limiting auth endpoints.
 * @param {object} options
 * @param {number} [options.windowMs]
 * @param {number} [options.maxAttempts]
 * @param {string} [options.prefix]
 */
export function createAuthRateLimiter({
  windowMs = DEFAULT_WINDOW_MS,
  maxAttempts = DEFAULT_MAX_ATTEMPTS,
  prefix = 'auth',
} = {}) {
  return function authRateLimiter(req, res, next) {
    const ip = req.ip || req.socket?.remoteAddress || 'unknown-ip';
    const email = (req.body?.email || req.body?.portalHint || '').toLowerCase().trim();
    const key = `${prefix}:${ip}:${email || 'general'}`;
    const now = Date.now();

    // In demo/development mode, exempt standard demo accounts and relax limits
    const isDemoMode = appConfig.mode === 'demo' || appConfig.env !== 'production';
    if (isDemoMode && DEMO_EXEMPT_EMAILS.has(email)) {
      req.recordAuthFailure = () => {};
      req.recordAuthSuccess = () => {};
      return next();
    }

    const effectiveMaxAttempts = isDemoMode ? Math.max(maxAttempts, 100) : maxAttempts;

    const record = attemptsMap.get(key) || { count: 0, resetAt: now + windowMs };

    if (now > record.resetAt) {
      record.count = 0;
      record.resetAt = now + windowMs;
    }

    if (record.count >= effectiveMaxAttempts) {
      const retryAfterSeconds = Math.max(1, Math.ceil((record.resetAt - now) / 1000));
      res.setHeader('Retry-After', retryAfterSeconds);
      return res.status(429).json({
        error: {
          code: 'RATE_LIMITED',
          message: `Too many attempts. Please try again in ${Math.ceil(retryAfterSeconds / 60)} minutes.`,
        },
        message: 'Too many attempts. Please try again later.',
      });
    }

    // Attach function to record failure
    req.recordAuthFailure = () => {
      record.count += 1;
      attemptsMap.set(key, record);
    };

    // Attach function to reset on success
    req.recordAuthSuccess = () => {
      attemptsMap.delete(key);
    };

    next();
  };
}

// Global cleanup every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of attemptsMap.entries()) {
    if (now > value.resetAt) {
      attemptsMap.delete(key);
    }
  }
}, 10 * 60 * 1000).unref();

export function clearRateLimit(keyPrefix) {
  if (!keyPrefix) {
    attemptsMap.clear();
    return;
  }
  const cleanPrefix = keyPrefix.toLowerCase().trim();
  for (const key of attemptsMap.keys()) {
    if (key.toLowerCase().startsWith(cleanPrefix) || key.toLowerCase().includes(cleanPrefix)) {
      attemptsMap.delete(key);
    }
  }
}

/**
 * Creates an admin sliding window rate limiter (default 120 req/min per admin/IP).
 */
export function createAdminRateLimiter({ windowMs = 60 * 1000, maxRequests = 120 } = {}) {
  const requests = new Map();

  return function adminRateLimiter(req, res, next) {
    const key = req.user?.id || req.ip || 'anon-admin';
    const now = Date.now();
    const timestamps = (requests.get(key) || []).filter((t) => now - t < windowMs);

    if (timestamps.length >= maxRequests) {
      return res.status(429).json({
        error: 'Too many administrative requests. Please slow down.',
        code: 'ADMIN_RATE_LIMITED',
      });
    }

    timestamps.push(now);
    requests.set(key, timestamps);
    next();
  };
}

