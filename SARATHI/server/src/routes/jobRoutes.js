import { Router } from 'express';
import { jobService } from '../services/jobService.js';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';

const router = Router();

const RECRUITER_JOB_ROLES = ['platform_admin', 'org_owner', 'recruiter', 'hiring_manager'];

router.get('/', requireAuth, requireRole(RECRUITER_JOB_ROLES), (req, res, next) => {
  try {
    if (!req.orgId) return res.status(403).json({ error: 'Organization context required' });
    const { status, domainId, search, limit, offset } = req.query;
    const jobs = jobService.getJobs(req.orgId, { status, domainId, search, limit, offset });
    res.json(jobs);
  } catch (err) {
    next(err);
  }
});

router.get('/public', (req, res, next) => {
  try {
    const { domainId, search, limit, offset } = req.query;
    const jobs = jobService.getPublicJobs({ domainId, search, limit, offset });
    res.json(jobs);
  } catch (err) {
    next(err);
  }
});

router.get('/public/:id', (req, res, next) => {
  try {
    const job = jobService.getPublicJobById(req.params.id);
    if (!job) {
      return res.status(404).json({ error: 'Published job not found' });
    }
    res.json(job);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', requireAuth, requireRole(RECRUITER_JOB_ROLES), (req, res, next) => {
  try {
    if (!req.orgId) return res.status(403).json({ error: 'Organization context required' });
    const job = jobService.getJobById(req.orgId, req.params.id);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    res.json(job);
  } catch (err) {
    next(err);
  }
});

router.post('/', requireAuth, requireRole(['platform_admin', 'org_owner', 'recruiter']), (req, res, next) => {
  try {
    const job = jobService.createJob(req.orgId, req.user.id, req.body);
    res.status(201).json(job);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', requireAuth, requireRole(['platform_admin', 'org_owner', 'recruiter']), (req, res, next) => {
  try {
    const job = jobService.updateJob(req.orgId, req.params.id, req.body);
    res.json(job);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireAuth, requireRole(['platform_admin', 'org_owner', 'recruiter']), (req, res, next) => {
  try {
    const result = jobService.deleteJob(req.orgId, req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
