import { z } from 'zod';
import { Router } from 'express';
import { candidateService } from '../services/candidateService.js';
import { matchingService } from '../services/matchingService.js';
import { skillGapService } from '../services/skillGapService.js';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();

const candidateProfileSchema = z.object({
  fullName: z.string().min(1, 'Full name cannot be empty').max(100).optional(),
  institution: z.string().max(150).optional().nullable(),
  targetRole: z.string().max(100).optional().nullable(),
  headline: z.string().max(150).optional().nullable(),
  bio: z.string().max(2000).optional().nullable(),
  experienceYears: z.union([z.number(), z.string()]).optional().nullable(),
  location: z.string().max(100).optional().nullable(),
  workPreference: z.enum(['remote', 'hybrid', 'onsite', 'flexible']).optional().nullable(),
  githubUrl: z.string().url('Must be a valid URL').or(z.literal('')).optional().nullable(),
  linkedinUrl: z.string().url('Must be a valid URL').or(z.literal('')).optional().nullable(),
  portfolioUrl: z.string().url('Must be a valid URL').or(z.literal('')).optional().nullable(),
  resumeUrl: z.string().url('Must be a valid URL').or(z.literal('')).optional().nullable(),
  degree: z.string().max(100).optional().nullable(),
  graduationYear: z.union([z.number().int().min(1970).max(2100), z.string()]).optional().nullable(),
});

const CANDIDATE_VIEW_ROLES = ['platform_admin', 'org_owner', 'recruiter', 'hiring_manager', 'assessor'];

router.get('/profile', requireAuth, (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const profile = candidateService.getCandidateProfile(req.user.id);
    if (!profile) {
      return res.status(404).json({ error: 'Candidate profile not found' });
    }
    res.json({
      success: true,
      data: profile,
    });
  } catch (err) {
    next(err);
  }
});

router.put('/profile', requireAuth, validateBody(candidateProfileSchema), (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const updated = candidateService.updateCandidateProfile(req.user.id, req.body);
    res.json({
      success: true,
      data: updated,
      message: 'Profile updated successfully',
    });
  } catch (err) {
    next(err);
  }
});

const githubImportSchema = z.object({
  repoUrl: z.string().min(1, 'GitHub repository URL or slug is required')
});

router.post('/github/import', requireAuth, validateBody(githubImportSchema), async (req, res, next) => {
  try {
    const { GitHubService } = await import('../services/githubService.js');
    const repoData = await GitHubService.importRepo(req.body.repoUrl);
    res.json({
      success: true,
      data: repoData
    });
  } catch (err) {
    res.status(400).json({
      error: {
        code: 'GITHUB_IMPORT_ERROR',
        message: err.message || 'Failed to import GitHub repository'
      }
    });
  }
});

router.get('/', requireAuth, requireRole(CANDIDATE_VIEW_ROLES), (req, res, next) => {
  try {
    const {
      query,
      domainId,
      skillId,
      minProficiency,
      verificationStatus,
      minExperience,
      workPreference,
      jobId,
      sortBy,
      sortOrder,
      limit,
      offset,
    } = req.query;

    const result = candidateService.searchCandidates({
      query,
      domainId,
      skillId,
      minProficiency,
      verificationStatus,
      minExperience,
      workPreference,
      jobId,
      sortBy,
      sortOrder,
      limit,
      offset,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Authenticated candidate routes mounted before /:id parameter to prevent collision
router.get('/my-passport', requireAuth, (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (req.user.globalRole !== 'candidate' && req.user.globalRole !== 'student') {
      return res.status(403).json({ error: 'Only candidates and students can access their personal passport' });
    }
    const { jobId } = req.query;
    const passport = candidateService.getCandidatePassport(req.user.id, jobId);
    if (!passport) {
      return res.status(404).json({ error: 'Candidate passport not found' });
    }
    res.json({
      success: true,
      data: passport
    });
  } catch (err) {
    next(err);
  }
});

router.post('/evidence', requireAuth, (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (req.user.globalRole !== 'candidate' && req.user.globalRole !== 'student') {
      return res.status(403).json({ error: 'Only candidates and students can submit evidence' });
    }
    const {
      title,
      description,
      repositoryUrl,
      liveDemoUrl,
      skillsDemonstrated,
      technologies,
      domainId,
      evidenceType,
    } = req.body;

    const result = candidateService.submitCandidateEvidence({
      candidateId: req.user.id,
      title,
      description,
      repositoryUrl,
      liveDemoUrl,
      skillsDemonstrated,
      technologies,
      domainId,
      evidenceType,
    });

    res.status(201).json({
      success: true,
      data: result,
      message: result.message
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/passport', requireAuth, requireRole(CANDIDATE_VIEW_ROLES), (req, res, next) => {
  try {
    const { jobId } = req.query;
    const passport = candidateService.getCandidatePassport(req.params.id, jobId);
    if (!passport) {
      return res.status(404).json({ error: 'Candidate profile not found' });
    }
    res.json(passport);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/match', requireAuth, requireRole(CANDIDATE_VIEW_ROLES), (req, res, next) => {
  try {
    const { jobId } = req.body;
    if (!jobId) {
      return res.status(400).json({ error: 'jobId is required in request body' });
    }
    const match = matchingService.calculateJobMatch(req.params.id, jobId);
    res.json(match);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/gap-analysis', requireAuth, requireRole(CANDIDATE_VIEW_ROLES), (req, res, next) => {
  try {
    const { jobId } = req.body;
    if (!jobId) {
      return res.status(400).json({ error: 'jobId is required in request body' });
    }
    const analysis = skillGapService.analyzeSkillGap(req.params.id, jobId);
    res.json(analysis);
  } catch (err) {
    next(err);
  }
});

router.post('/compare', requireAuth, requireRole(CANDIDATE_VIEW_ROLES), (req, res, next) => {
  try {
    const { candidateIds, jobId } = req.body;
    if (!Array.isArray(candidateIds) || candidateIds.length < 2 || candidateIds.length > 4) {
      return res.status(400).json({ error: 'Please provide between 2 and 4 candidateIds for comparison' });
    }

    const profiles = candidateIds.map(id => candidateService.getCandidatePassport(id, jobId));
    res.json({
      jobId: jobId || null,
      candidates: profiles.filter(Boolean),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
