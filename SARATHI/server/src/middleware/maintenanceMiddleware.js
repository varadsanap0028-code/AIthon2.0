/**
 * SARATHI Admin Portal — Platform Maintenance Middleware
 * PRD Phase 10
 * Returns 503 MAINTENANCE to non-admin requests when maintenance_mode feature flag is ON.
 * Platform Admin login and admin management APIs remain always accessible.
 */

import { featureFlagService } from '../services/admin/featureFlagService.js';

export function maintenanceMiddleware(req, res, next) {
  try {
    const isMaintenanceOn = featureFlagService.isEnabled('maintenance_mode', false);
    if (!isMaintenanceOn) {
      return next();
    }

    const path = req.path || '';

    // Always permit admin routes, auth login, and user profile check
    if (
      path.startsWith('/api/admin') ||
      path === '/api/auth/login' ||
      path === '/api/auth/me' ||
      path === '/api/auth/refresh' ||
      path === '/health'
    ) {
      return next();
    }

    // If authenticated user is platform_admin, allow through
    if (req.user && req.user.role === 'platform_admin') {
      return next();
    }

    return res.status(503).json({
      error: {
        code: 'MAINTENANCE',
        message: 'Platform maintenance is currently in progress. Administrative and system operations remain online.',
      },
    });
  } catch {
    next();
  }
}
