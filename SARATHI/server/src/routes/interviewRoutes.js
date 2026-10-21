import { Router } from 'express';
import { interviewService } from '../services/interviewService.js';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';

const router = Router();

const INTERVIEW_VIEW_ROLES = ['platform_admin', 'org_owner', 'recruiter', 'hiring_manager', 'interviewer', 'assessor'];

router.get('/', requireAuth, requireRole(INTERVIEW_VIEW_ROLES), (req, res, next) => {
  try {
    if (!req.orgId) return res.status(403).json({ error: 'Organization context required' });
    const { candidateId, jobId, status, limit, offset } = req.query;
    const interviews = interviewService.getInterviews(req.orgId, { candidateId, jobId, status, limit, offset });
    res.json(interviews);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', requireAuth, requireRole(INTERVIEW_VIEW_ROLES), (req, res, next) => {
  try {
    if (!req.orgId) return res.status(403).json({ error: 'Organization context required' });
    const interview = interviewService.getInterviewById(req.orgId, req.params.id);
    if (!interview) return res.status(404).json({ error: 'Interview not found' });
    res.json(interview);
  } catch (err) {
    next(err);
  }
});

router.post('/', requireAuth, requireRole(['platform_admin', 'org_owner', 'recruiter']), (req, res, next) => {
  try {
    const interview = interviewService.scheduleInterview(req.orgId, req.user.id, req.body);
    res.status(201).json(interview);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/feedback', requireAuth, requireRole(['platform_admin', 'org_owner', 'recruiter', 'assessor']), (req, res, next) => {
  try {
    const result = interviewService.submitFeedback(req.orgId, req.params.id, req.user.id, req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/cancel', requireAuth, requireRole(['platform_admin', 'org_owner', 'recruiter']), (req, res, next) => {
  try {
    const { reason } = req.body;
    const result = interviewService.cancelInterview(req.orgId, req.params.id, reason);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
