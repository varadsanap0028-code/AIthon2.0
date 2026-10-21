import { Router } from 'express';
import { verificationService } from '../services/verificationService.js';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';

const router = Router();

const VERIFICATION_ROLES = ['platform_admin', 'org_owner', 'recruiter', 'assessor'];

router.get('/pending', requireAuth, requireRole(VERIFICATION_ROLES), (req, res, next) => {
  try {
    if (!req.orgId) return res.status(403).json({ error: 'Organization context required' });
    const { domainId, skillId, limit, offset } = req.query;
    const items = verificationService.getPendingVerifications(req.orgId, { domainId, skillId, limit, offset });
    res.json(items);
  } catch (err) {
    next(err);
  }
});

router.post('/review', requireAuth, requireRole(['platform_admin', 'org_owner', 'recruiter', 'assessor']), (req, res, next) => {
  try {
    const { evidenceId, decision, decisionRationale, rubricEvaluations, awardedProficiency } = req.body;
    const result = verificationService.submitReview({
      evidenceId,
      reviewerId: req.user.id,
      decision,
      decisionRationale,
      rubricEvaluations,
      awardedProficiency,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/request', requireAuth, requireRole(['platform_admin', 'org_owner', 'recruiter']), (req, res, next) => {
  try {
    const { candidateId, skillId, message } = req.body;
    const result = verificationService.requestEvidence({
      orgId: req.orgId,
      recruiterId: req.user.id,
      candidateId,
      skillId,
      message,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
