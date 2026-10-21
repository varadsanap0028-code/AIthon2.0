import { Router } from 'express';
import { z } from 'zod';
import { randomBytes } from 'node:crypto';
import { repository } from '../data/repository.js';
import { candidateService } from '../services/candidateService.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();

const toggleSchema = z.object({
  isPublic: z.boolean(),
});

const configSchema = z.object({
  sectionsConfig: z.object({
    includeSkills: z.boolean().optional(),
    includeProjects: z.boolean().optional(),
    includeContact: z.boolean().optional(),
    includeAssessments: z.boolean().optional(),
  }),
});

// Authenticated: Get or create candidate's shareable passport configuration
router.get('/share', requireAuth, (req, res, next) => {
  try {
    const userId = req.user.id;
    let share = repository.queryOne(
      'SELECT public_id, is_public, sections_config, created_at FROM passport_shares WHERE user_id = ?;',
      [userId]
    );

    const defaultConfig = {
      includeSkills: true,
      includeProjects: true,
      includeContact: false,
      includeAssessments: true,
    };

    if (!share) {
      const publicId = `pass-${randomBytes(6).toString('hex')}`;
      const now = new Date().toISOString();
      repository.execute(
        `INSERT INTO passport_shares (user_id, public_id, is_public, sections_config, created_at)
         VALUES (?, ?, 1, ?, ?);`,
        [userId, publicId, JSON.stringify(defaultConfig), now]
      );
      share = {
        public_id: publicId,
        is_public: 1,
        sections_config: JSON.stringify(defaultConfig),
        created_at: now,
      };
    }

    let parsedConfig = defaultConfig;
    try {
      parsedConfig = { ...defaultConfig, ...JSON.parse(share.sections_config || '{}') };
    } catch {
      parsedConfig = defaultConfig;
    }

    res.json({
      success: true,
      data: {
        publicId: share.public_id,
        isPublic: Boolean(share.is_public),
        sectionsConfig: parsedConfig,
        shareUrl: `/passport/${share.public_id}`,
        createdAt: share.created_at,
      },
    });
  } catch (err) {
    next(err);
  }
});

// Authenticated: Toggle public visibility on or off
router.post('/share/toggle', requireAuth, validateBody(toggleSchema), (req, res, next) => {
  try {
    const userId = req.user.id;
    const { isPublic } = req.body;
    const now = new Date().toISOString();

    let share = repository.queryOne(
      'SELECT public_id, sections_config FROM passport_shares WHERE user_id = ?;',
      [userId]
    );

    let publicId = share?.public_id;
    if (!share) {
      publicId = `pass-${randomBytes(6).toString('hex')}`;
      const defaultConfig = JSON.stringify({
        includeSkills: true,
        includeProjects: true,
        includeContact: false,
        includeAssessments: true,
      });
      repository.execute(
        `INSERT INTO passport_shares (user_id, public_id, is_public, sections_config, created_at)
         VALUES (?, ?, ?, ?, ?);`,
        [userId, publicId, isPublic ? 1 : 0, defaultConfig, now]
      );
    } else {
      repository.execute(
        'UPDATE passport_shares SET is_public = ? WHERE user_id = ?;',
        [isPublic ? 1 : 0, userId]
      );
    }

    res.json({
      success: true,
      data: {
        publicId,
        isPublic,
        shareUrl: `/passport/${publicId}`,
      },
      message: isPublic
        ? 'Skill Passport is now publicly visible via share link'
        : 'Skill Passport is now private',
    });
  } catch (err) {
    next(err);
  }
});

// Authenticated: Update sections privacy configuration
router.put('/share/config', requireAuth, validateBody(configSchema), (req, res, next) => {
  try {
    const userId = req.user.id;
    const { sectionsConfig } = req.body;

    let share = repository.queryOne(
      'SELECT public_id, is_public, sections_config FROM passport_shares WHERE user_id = ?;',
      [userId]
    );

    let currentConfig = {
      includeSkills: true,
      includeProjects: true,
      includeContact: false,
      includeAssessments: true,
    };

    if (share?.sections_config) {
      try {
        currentConfig = { ...currentConfig, ...JSON.parse(share.sections_config) };
      } catch {
        // ignore
      }
    }

    const merged = { ...currentConfig, ...sectionsConfig };
    const now = new Date().toISOString();

    if (!share) {
      const publicId = `pass-${randomBytes(6).toString('hex')}`;
      repository.execute(
        `INSERT INTO passport_shares (user_id, public_id, is_public, sections_config, created_at)
         VALUES (?, ?, 1, ?, ?);`,
        [userId, publicId, JSON.stringify(merged), now]
      );
    } else {
      repository.execute(
        'UPDATE passport_shares SET sections_config = ? WHERE user_id = ?;',
        [JSON.stringify(merged), userId]
      );
    }

    res.json({
      success: true,
      data: {
        sectionsConfig: merged,
      },
      message: 'Passport sharing privacy configuration updated',
    });
  } catch (err) {
    next(err);
  }
});

// Authenticated: Regenerate / revoke old public share URL
router.post('/share/regenerate', requireAuth, (req, res, next) => {
  try {
    const userId = req.user.id;
    const newPublicId = `pass-${randomBytes(6).toString('hex')}`;
    const now = new Date().toISOString();

    let share = repository.queryOne(
      'SELECT public_id FROM passport_shares WHERE user_id = ?;',
      [userId]
    );

    if (!share) {
      const defaultConfig = JSON.stringify({
        includeSkills: true,
        includeProjects: true,
        includeContact: false,
        includeAssessments: true,
      });
      repository.execute(
        `INSERT INTO passport_shares (user_id, public_id, is_public, sections_config, created_at)
         VALUES (?, ?, 1, ?, ?);`,
        [userId, newPublicId, defaultConfig, now]
      );
    } else {
      repository.execute(
        'UPDATE passport_shares SET public_id = ? WHERE user_id = ?;',
        [newPublicId, userId]
      );
    }

    res.json({
      success: true,
      data: {
        publicId: newPublicId,
        shareUrl: `/passport/${newPublicId}`,
      },
      message: 'Previous share link was revoked. New public link generated.',
    });
  } catch (err) {
    next(err);
  }
});

// Public: View verified Skill Passport by public ID
router.get('/public/:publicId', (req, res, next) => {
  try {
    const { publicId } = req.params;
    const share = repository.queryOne(
      'SELECT user_id, is_public, sections_config FROM passport_shares WHERE public_id = ?;',
      [publicId]
    );

    if (!share || !share.is_public) {
      return res.status(404).json({
        error: 'Skill Passport not found or is currently private.',
        code: 'PASSPORT_NOT_FOUND',
      });
    }

    let config = {
      includeSkills: true,
      includeProjects: true,
      includeContact: false,
      includeAssessments: true,
    };
    try {
      if (share.sections_config) {
        config = { ...config, ...JSON.parse(share.sections_config) };
      }
    } catch {
      // ignore
    }

    const passport = candidateService.getCandidatePassport(share.user_id);
    if (!passport) {
      return res.status(404).json({
        error: 'Candidate profile details could not be found.',
        code: 'PROFILE_NOT_FOUND',
      });
    }

    // Exclude private candidate details by default unless explicit student consent
    const sanitizedCandidate = {
      id: `PUB-${share.user_id.slice(-6).toUpperCase()}`,
      full_name: passport.candidate.full_name,
      headline: passport.candidate.headline,
      target_role: passport.candidate.target_role,
      bio: passport.candidate.bio,
      institution: passport.candidate.institution,
      degree: passport.candidate.degree,
      graduation_year: passport.candidate.graduation_year,
      experience_years: passport.candidate.experience_years,
      repo_count: passport.candidate.repo_count,
      // Only include contact and external profile links if configured
      email: config.includeContact ? passport.candidate.email : null,
      location: config.includeContact ? passport.candidate.location : null,
      github_url: passport.candidate.github_url,
      linkedin_url: passport.candidate.linkedin_url,
      portfolio_url: passport.candidate.portfolio_url,
    };

    const sanitizedPassport = {
      candidate: sanitizedCandidate,
      skills: config.includeSkills ? passport.skills : [],
      evidence: config.includeProjects ? passport.evidence : [],
      assessments: config.includeAssessments ? passport.assessments : [],
      sectionsConfig: config,
    };

    res.json({
      success: true,
      data: sanitizedPassport,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
