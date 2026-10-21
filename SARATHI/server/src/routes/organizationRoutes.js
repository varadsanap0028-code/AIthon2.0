import { Router } from 'express';
import { organizationService } from '../services/organizationService.js';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';

const router = Router();

const ORG_VIEW_ROLES = ['platform_admin', 'org_owner', 'recruiter', 'hiring_manager', 'assessor', 'interviewer', 'member'];

router.get('/', requireAuth, requireRole(ORG_VIEW_ROLES), (req, res, next) => {
  try {
    if (!req.orgId) return res.status(403).json({ error: 'Organization context required' });
    const org = organizationService.getOrganizationById(req.orgId);
    if (!org) return res.status(404).json({ error: 'Organization not found' });
    res.json(org);
  } catch (err) {
    next(err);
  }
});

router.put('/settings', requireAuth, requireRole(['platform_admin', 'org_owner']), (req, res, next) => {
  try {
    const org = organizationService.updateOrganizationSettings(req.orgId, req.body);
    res.json(org);
  } catch (err) {
    next(err);
  }
});

router.get('/members', requireAuth, requireRole(ORG_VIEW_ROLES), (req, res, next) => {
  try {
    if (!req.orgId) return res.status(403).json({ error: 'Organization context required' });
    const members = organizationService.getOrganizationMembers(req.orgId);
    res.json(members);
  } catch (err) {
    next(err);
  }
});

router.post('/members', requireAuth, requireRole(['platform_admin', 'org_owner']), (req, res, next) => {
  try {
    const result = organizationService.addMember(req.orgId, {
      ...req.body,
      invitedBy: req.user.id,
    });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

router.patch('/members/:id/role', requireAuth, requireRole(['platform_admin', 'org_owner']), (req, res, next) => {
  try {
    const { role } = req.body;
    const result = organizationService.updateMemberRole(req.orgId, req.params.id, role);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
