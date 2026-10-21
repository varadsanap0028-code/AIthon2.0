import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';
import { validateBody } from '../middleware/validate.js';
import { createAuthRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

const COLLEGE_ROLES = ['college', 'platform_admin'];

const sensitiveLimiter = createAuthRateLimiter({ windowMs: 15 * 60 * 1000, maxAttempts: 60, prefix: 'college' });

const driveSchema = z.object({
  company: z.string().min(1).max(200),
  role: z.string().min(1).max(200),
  packageLpa: z.number().min(0).max(500).optional(),
  status: z.enum(['upcoming', 'in_progress', 'completed']).optional(),
  branches: z.array(z.string()).max(10).optional(),
  minReadiness: z.number().int().min(0).max(100).optional(),
  requiredSkills: z.array(z.string()).max(30).optional(),
  verifiedPassportRequired: z.boolean().optional(),
  startDate: z.string().max(30).optional(),
  endDate: z.string().max(30).optional(),
});

function collegeContext(req) {
  const instId = req.user.institution_id || req.query.institutionId || null;
  const instName = req.user.institution || req.query.institutionName || 'National Institute of Technology';
  // HODs are server-scoped to their own branch on read paths.
  const collegeRole = req.user.collegeRole || req.user.college_role || 'admin';
  const hodBranch = collegeRole === 'hod' ? (req.user.branch || null) : null;
  return { instId, instName, collegeRole, hodBranch };
}

const remediationSchema = z.object({
  candidateId: z.string().min(1).max(100),
  missingSkills: z.array(z.string().max(100)).max(30).default([]),
  benchmark: z.number().int().min(0).max(100).default(60),
});

const remediationStatusSchema = z.object({
  status: z.enum(['pending', 'assigned', 'in_progress', 'completed', 'dismissed']),
});

const curriculumSchema = z.object({
  skill: z.string().min(1).max(100),
  recType: z.enum(['lab_update', 'capstone_rubric', 'bootcamp']).default('bootcamp'),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  branches: z.array(z.string()).max(10).default([]),
});

const curriculumStatusSchema = z.object({
  status: z.enum(['accepted', 'planned', 'dismissed']),
});

const settingsSchema = z.object({
  benchmarkThreshold: z.number().int().min(0).max(100).optional(),
  branches: z.array(z.string().max(20)).max(10).optional(),
  batchYear: z.number().int().min(2000).max(2100).optional(),
});

// Placement drives
router.get('/drives', requireAuth, requireRole(COLLEGE_ROLES), async (req, res, next) => {
  try {
    const { collegeDrivesService } = await import('../services/collegeDrivesService.js');
    const { instName } = collegeContext(req);
    const drives = collegeDrivesService.listDrives(instName, req.query.status || null);
    res.json({ success: true, data: drives });
  } catch (err) {
    next(err);
  }
});

router.post('/drives', requireAuth, requireRole(COLLEGE_ROLES), sensitiveLimiter, validateBody(driveSchema), async (req, res, next) => {
  try {
    const { collegeDrivesService } = await import('../services/collegeDrivesService.js');
    const { instId, instName } = collegeContext(req);
    const drive = collegeDrivesService.createDrive(instId, instName, req.user.id, req.body);
    res.status(201).json({ success: true, data: drive });
  } catch (err) {
    next(err);
  }
});

router.patch('/drives/:id', requireAuth, requireRole(COLLEGE_ROLES), sensitiveLimiter, validateBody(driveSchema.partial()), async (req, res, next) => {
  try {
    const { collegeDrivesService } = await import('../services/collegeDrivesService.js');
    const drive = collegeDrivesService.updateDrive(req.params.id, req.user.id, req.body);
    res.json({ success: true, data: drive });
  } catch (err) {
    next(err);
  }
});

router.get('/drives/:id/eligible', requireAuth, requireRole(COLLEGE_ROLES), async (req, res, next) => {
  try {
    const { collegeDrivesService } = await import('../services/collegeDrivesService.js');
    const result = collegeDrivesService.eligibleStudents(req.params.id);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// At-risk students (server-computed, D-09 enforced)
router.get('/at-risk', requireAuth, requireRole(COLLEGE_ROLES), async (req, res, next) => {
  try {
    const { collegeAtRiskService } = await import('../services/collegeAtRiskService.js');
    const { instId, instName, hodBranch } = collegeContext(req);
    const benchmark = req.query.benchmark ? parseInt(req.query.benchmark, 10) : 60;
    const result = collegeAtRiskService.getAtRiskStudents(instId, instName, { benchmark, hodBranch });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

router.post('/remediation', requireAuth, requireRole(COLLEGE_ROLES), sensitiveLimiter, validateBody(remediationSchema), async (req, res, next) => {
  try {
    const { collegeAtRiskService } = await import('../services/collegeAtRiskService.js');
    const { instId } = collegeContext(req);
    const result = collegeAtRiskService.assignRemediation(instId, req.user.id, req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

router.patch('/remediation/:id', requireAuth, requireRole(COLLEGE_ROLES), sensitiveLimiter, validateBody(remediationStatusSchema), async (req, res, next) => {
  try {
    const { collegeAtRiskService } = await import('../services/collegeAtRiskService.js');
    const result = collegeAtRiskService.updateRemediation(req.params.id, req.user.id, req.body.status);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// Curriculum recommendations
router.get('/curriculum', requireAuth, requireRole(COLLEGE_ROLES), async (req, res, next) => {
  try {
    const { collegeCurriculumService } = await import('../services/collegeCurriculumService.js');
    const { instName } = collegeContext(req);
    const result = collegeCurriculumService.listRecommendations(instName);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

router.post('/curriculum', requireAuth, requireRole(COLLEGE_ROLES), sensitiveLimiter, validateBody(curriculumSchema), async (req, res, next) => {
  try {
    const { collegeCurriculumService } = await import('../services/collegeCurriculumService.js');
    const { instId, instName } = collegeContext(req);
    const result = collegeCurriculumService.createRecommendation(instId, instName, req.user.id, req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

router.patch('/curriculum/:id', requireAuth, requireRole(COLLEGE_ROLES), sensitiveLimiter, validateBody(curriculumStatusSchema), async (req, res, next) => {
  try {
    const { collegeCurriculumService } = await import('../services/collegeCurriculumService.js');
    const result = collegeCurriculumService.updateStatus(req.params.id, req.user.id, req.body.status);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// College settings
router.get('/settings', requireAuth, requireRole(COLLEGE_ROLES), async (req, res, next) => {
  try {
    const { collegeSettingsService } = await import('../services/collegeSettingsService.js');
    const { instId, instName } = collegeContext(req);
    const result = collegeSettingsService.getSettings(instId, instName);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

router.put('/settings', requireAuth, requireRole(COLLEGE_ROLES), sensitiveLimiter, validateBody(settingsSchema), async (req, res, next) => {
  try {
    const { collegeSettingsService } = await import('../services/collegeSettingsService.js');
    const { instId, instName } = collegeContext(req);
    const result = collegeSettingsService.updateSettings(instId, instName, req.user.id, req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// College users (Admin/TPO/HOD management)
router.get('/users', requireAuth, requireRole(COLLEGE_ROLES), async (req, res, next) => {
  try {
    const { collegeSettingsService } = await import('../services/collegeSettingsService.js');
    const { instId, instName } = collegeContext(req);
    const result = collegeSettingsService.listCollegeUsers(instId, instName);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

export default router;
