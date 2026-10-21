import { Router } from 'express';
import { pipelineService } from '../services/pipelineService.js';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';
import { repository } from '../data/repository.js';

const router = Router();

const RECRUITER_ROLES = ['platform_admin', 'org_owner', 'recruiter', 'hiring_manager'];

// Student-facing application submission (server-derived candidate identity)
router.post('/apply', requireAuth, (req, res, next) => {
  try {
    const { jobId, coverNote } = req.body;
    if (!jobId) {
      return res.status(400).json({ error: 'jobId is required' });
    }

    if (req.user.globalRole !== 'candidate' && req.user.globalRole !== 'student') {
      return res.status(403).json({ error: 'Only student candidates can submit job applications' });
    }

    // Applicant identity strictly derived from validated token
    const candidateId = req.user.id;

    // Verify job exists, is published, and not deleted
    const job = repository.queryOne(
      'SELECT id, org_id, status FROM jobs WHERE id = ? AND deleted_at IS NULL;',
      [jobId]
    );

    if (!job) {
      return res.status(404).json({ error: 'Opportunity not found' });
    }

    if (job.status !== 'published') {
      return res.status(400).json({ error: 'This opportunity is not currently open for applications' });
    }

    // Prevent duplicate application
    const existing = repository.queryOne(
      'SELECT id, applied_at, stage FROM applications WHERE job_id = ? AND candidate_id = ?;',
      [jobId, candidateId]
    );
    if (existing) {
      return res.status(409).json({
        error: 'You have already submitted an application for this position',
        applicationId: existing.id,
        appliedAt: existing.applied_at,
        stage: existing.stage
      });
    }

    const app = pipelineService.createApplication(job.org_id, jobId, candidateId, coverNote || '');
    res.status(201).json({
      success: true,
      message: 'Application submitted successfully to hiring team',
      data: app,
      application: app
    });
  } catch (err) {
    if (err.message && err.message.includes('already applied')) {
      return res.status(409).json({ error: 'You have already submitted an application for this position' });
    }
    next(err);
  }
});

// Student-facing list of their submitted applications with live stages and history
router.get('/my-applications', requireAuth, (req, res, next) => {
  try {
    if (req.user.globalRole !== 'candidate' && req.user.globalRole !== 'student') {
      return res.status(403).json({ error: 'Only student candidates can view student applications' });
    }
    const apps = repository.query(
      `SELECT a.*,
              j.title as job_title, j.location, j.work_arrangement, j.employment_type as job_type,
              j.experience_level, j.salary_min, j.salary_max, j.currency,
              o.name as company_name
       FROM applications a
       JOIN jobs j ON j.id = a.job_id
       JOIN organisations o ON o.id = a.org_id
       WHERE a.candidate_id = ?
       ORDER BY a.applied_at DESC;`,
      [req.user.id]
    );

    // Attach stage timeline history for each application
    const enrichedApps = apps.map((app) => {
      const stageHistory = repository.query(
        `SELECT ash.id, ash.from_stage, ash.to_stage, ash.reason, ash.created_at
         FROM application_stage_history ash
         WHERE ash.application_id = ?
         ORDER BY ash.created_at ASC;`,
        [app.id]
      );
      return {
        ...app,
        stageHistory
      };
    });

    res.json({
      success: true,
      data: enrichedApps
    });
  } catch (err) {
    next(err);
  }
});

// Recruiter: get all applications for active organization
router.get('/applications', requireAuth, requireRole(RECRUITER_ROLES), (req, res, next) => {
  try {
    const orgId = req.user.orgId || req.orgId;
    const { jobId, stage, search, limit, offset } = req.query;
    const apps = pipelineService.getApplications(orgId, { jobId, stage, search, limit, offset });
    res.json(apps);
  } catch (err) {
    next(err);
  }
});

// Recruiter: get single application details
router.get('/applications/:id', requireAuth, requireRole(RECRUITER_ROLES), (req, res, next) => {
  try {
    const orgId = req.user.orgId || req.orgId;
    const app = pipelineService.getApplicationById(orgId, req.params.id);
    if (!app) return res.status(404).json({ error: 'Application not found in current organization' });
    res.json(app);
  } catch (err) {
    next(err);
  }
});

// Recruiter: manually record/create an application
router.post('/applications', requireAuth, requireRole(RECRUITER_ROLES), (req, res, next) => {
  try {
    const orgId = req.user.orgId || req.orgId;
    const { jobId, candidateId, coverNote } = req.body;
    if (!jobId || !candidateId) {
      return res.status(400).json({ error: 'jobId and candidateId are required' });
    }
    const app = pipelineService.createApplication(orgId, jobId, candidateId, coverNote || '');
    res.status(201).json(app);
  } catch (err) {
    if (err.message && err.message.includes('already applied')) {
      return res.status(409).json({ error: err.message });
    }
    next(err);
  }
});

// Recruiter: advance or update application stage
router.patch('/applications/:id/stage', requireAuth, requireRole(RECRUITER_ROLES), (req, res, next) => {
  try {
    const orgId = req.user.orgId || req.orgId;
    const { stage, reason } = req.body;
    if (!stage) {
      return res.status(400).json({ error: 'Target stage is required' });
    }

    const app = pipelineService.updateStage(orgId, req.params.id, stage, req.user.id, reason || '');
    res.json(app);
  } catch (err) {
    if (err.message && (err.message.includes('Invalid stage transition') || err.message.includes('Invalid pipeline stage'))) {
      return res.status(400).json({ error: err.message });
    }
    if (err.message && err.message.includes('not found')) {
      return res.status(404).json({ error: err.message });
    }
    next(err);
  }
});

// Recruiter: add internal candidate note
router.post('/notes', requireAuth, requireRole(RECRUITER_ROLES), (req, res, next) => {
  try {
    const orgId = req.user.orgId || req.orgId;
    const { candidateId, note, jobId, isPrivate } = req.body;
    const result = pipelineService.addRecruiterNote(orgId, candidateId, req.user.id, note, jobId, isPrivate);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

// Recruiter: view shortlists
router.get('/shortlists', requireAuth, requireRole(RECRUITER_ROLES), (req, res, next) => {
  try {
    const orgId = req.user.orgId || req.orgId;
    const lists = pipelineService.getShortlists(orgId);
    res.json(lists);
  } catch (err) {
    next(err);
  }
});

router.get('/shortlists/:id/members', requireAuth, requireRole(RECRUITER_ROLES), (req, res, next) => {
  try {
    const orgId = req.user?.orgId;
    if (!orgId) {
      return res.status(403).json({ error: 'Organization context required' });
    }
    const members = pipelineService.getShortlistMembers(req.params.id, orgId);
    if (members === null) {
      return res.status(404).json({ error: 'Shortlist not found' });
    }
    res.json(members);
  } catch (err) {
    next(err);
  }
});

router.post('/shortlists', requireAuth, requireRole(RECRUITER_ROLES), (req, res, next) => {
  try {
    const orgId = req.user?.orgId || req.orgId;
    const list = pipelineService.createShortlist(orgId, req.user.id, req.body);
    res.status(201).json(list);
  } catch (err) {
    next(err);
  }
});

router.post('/shortlists/:id/members', requireAuth, requireRole(RECRUITER_ROLES), (req, res, next) => {
  try {
    const orgId = req.user?.orgId;
    if (!orgId) {
      return res.status(403).json({ error: 'Organization context required' });
    }
    const { candidateId, notes } = req.body;
    const result = pipelineService.toggleShortlistMember(req.params.id, orgId, candidateId, req.user.id, notes);
    if (result === null) {
      return res.status(404).json({ error: 'Shortlist not found' });
    }
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
