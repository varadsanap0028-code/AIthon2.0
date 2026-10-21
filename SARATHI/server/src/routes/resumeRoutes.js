import { Router } from 'express';
import { z } from 'zod';
import { resumeService } from '../services/resumeService.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { validateBody } from '../middleware/validate.js';

const router = Router();

const createResumeSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100),
  targetRole: z.string().max(100).optional().nullable(),
  templateId: z.enum(['modern-ats', 'technical', 'fresher']).default('modern-ats'),
  sectionsConfig: z.record(z.any()).optional().default({}),
  customContent: z.record(z.any()).optional().default({}),
  isDefault: z.boolean().optional().default(false),
});

const updateResumeSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  targetRole: z.string().max(100).optional().nullable(),
  templateId: z.enum(['modern-ats', 'technical', 'fresher']).optional(),
  sectionsConfig: z.record(z.any()).optional(),
  customContent: z.record(z.any()).optional(),
  isDefault: z.boolean().optional(),
});

// List student's resume drafts
router.get('/', requireAuth, (req, res, next) => {
  try {
    const resumes = resumeService.listResumes(req.user.id);
    res.json({
      success: true,
      data: resumes,
    });
  } catch (err) {
    next(err);
  }
});

// Compile student's factual profile, skills, projects, and assessments into a structured resume
router.get('/compile', requireAuth, (req, res, next) => {
  try {
    const { targetRole } = req.query;
    const compiled = resumeService.compileStudentResume(req.user.id, {
      targetRole: targetRole ? String(targetRole) : null,
    });
    res.json({
      success: true,
      data: compiled,
    });
  } catch (err) {
    next(err);
  }
});

// Get specific resume draft
router.get('/:id', requireAuth, (req, res, next) => {
  try {
    const resume = resumeService.getResume(req.user.id, req.params.id);
    if (!resume) {
      return res.status(404).json({ error: 'Resume draft not found' });
    }
    res.json({
      success: true,
      data: resume,
    });
  } catch (err) {
    next(err);
  }
});

// Create new resume draft
router.post('/', requireAuth, validateBody(createResumeSchema), (req, res, next) => {
  try {
    const created = resumeService.createResume(req.user.id, req.body);
    res.status(201).json({
      success: true,
      data: created,
      message: 'Resume draft saved successfully',
    });
  } catch (err) {
    next(err);
  }
});

// Update existing resume draft
router.put('/:id', requireAuth, validateBody(updateResumeSchema), (req, res, next) => {
  try {
    const updated = resumeService.updateResume(req.user.id, req.params.id, req.body);
    res.json({
      success: true,
      data: updated,
      message: 'Resume updated successfully',
    });
  } catch (err) {
    next(err);
  }
});

// Delete resume draft
router.delete('/:id', requireAuth, (req, res, next) => {
  try {
    const result = resumeService.deleteResume(req.user.id, req.params.id);
    res.json({
      success: true,
      data: result,
      message: 'Resume draft deleted',
    });
  } catch (err) {
    next(err);
  }
});

export default router;
