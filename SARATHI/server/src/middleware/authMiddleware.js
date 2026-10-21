import { authService } from '../services/authService.js';
import { repository } from '../data/repository.js';

export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  let token = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  }

  if (token) {
    const decoded = authService.verifyToken(token);
    if (decoded) {
      // Check live status in database (a user suspended mid-session loses access)
      const liveUser = repository.queryOne(
        'SELECT id, status, role, institution_id, institution FROM users WHERE id = ? AND deleted_at IS NULL;',
        [decoded.sub]
      );

      if (liveUser && liveUser.status !== 'suspended') {
        req.user = {
          id: decoded.sub,
          email: decoded.email,
          fullName: decoded.name,
          role: liveUser.role || decoded.globalRole,
          globalRole: liveUser.role || decoded.globalRole,
          status: liveUser.status,
          institution: liveUser.institution || decoded.institution || null,
          institutionId: liveUser.institution_id || decoded.institutionId || null,
          institution_id: liveUser.institution_id || decoded.institutionId || null,
          orgId: decoded.orgId,
          orgRole: decoded.orgRole,
        };
      } else {
        req.user = null;
        req.isSuspended = liveUser?.status === 'suspended';
      }
    }
  }

  // Tenant identity handling:
  // If user is authenticated with an organization, lock strictly to their authenticated orgId.
  // Authenticated organization access cannot be overridden by client-supplied x-org-id header.
  // Platform admins may optionally supply x-org-id to inspect specific tenants.
  // Unauthenticated requests or users without an organization must receive null (never default to demoOrgId).
  if (req.user?.orgId) {
    req.orgId = req.user.orgId;
  } else if (req.user?.globalRole === 'platform_admin') {
    req.orgId = req.headers['x-org-id'] || null;
  } else {
    req.orgId = null;
  }

  next();
}

export function requireAuth(req, res, next) {
  if (req.isSuspended) {
    return res.status(403).json({
      error: {
        code: 'ACCOUNT_SUSPENDED',
        message: 'Your account has been suspended. Access denied.',
      },
      code: 'ACCOUNT_SUSPENDED',
      message: 'Account suspended. Access denied.',
      errorDetail: { code: 'ACCOUNT_SUSPENDED', message: 'Your account has been suspended.' },
    });
  }
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication required',
      errorDetail: { code: 'SESSION_EXPIRED', message: 'Authentication required' },
    });
  }
  next();
}

export function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userRole = req.user.orgRole || req.user.globalRole;
    if (userRole === 'platform_admin' || allowedRoles.includes(userRole) || allowedRoles.includes(req.user.globalRole)) {
      return next();
    }

    return res.status(403).json({
      error: `Access denied. Role '${userRole}' does not have sufficient permissions. Required: ${allowedRoles.join(', ')}`
    });
  };
}
