import { Router } from 'express';
import { assessmentService } from '../services/assessmentService.js';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';
import { assessmentV2 } from '../config/index.js';

const router = Router();

router.get('/templates', (req, res, next) => {
  try {
    const { domainId } = req.query;
    const templates = assessmentService.getTemplates({ domainId });
    res.json(templates);
  } catch (err) {
    next(err);
  }
});

const ASSIGNMENT_VIEW_ROLES = ['platform_admin', 'org_owner', 'recruiter', 'hiring_manager', 'assessor'];

router.get('/assignments', requireAuth, requireRole(ASSIGNMENT_VIEW_ROLES), (req, res, next) => {
  try {
    if (!req.orgId) return res.status(403).json({ error: 'Organization context required' });
    const { candidateId, jobId, status, limit, offset } = req.query;
    const assignments = assessmentService.getAssignments(req.orgId, { candidateId, jobId, status, limit, offset });
    res.json(assignments);
  } catch (err) {
    next(err);
  }
});

router.post('/assign', requireAuth, requireRole(['platform_admin', 'org_owner', 'recruiter']), (req, res, next) => {
  try {
    const { templateId, candidateId, jobId, deadlineDays } = req.body;
    const result = assessmentService.assignAssessment({
      orgId: req.orgId,
      templateId,
      candidateId,
      jobId,
      assignedBy: req.user.id,
      deadlineDays,
    });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/record-result', requireAuth, requireRole(['platform_admin', 'org_owner', 'recruiter', 'assessor']), (req, res, next) => {
  try {
    const { assignmentId, candidateId, score, maxScore, rubricScores, reviewerFeedback } = req.body;
    const result = assessmentService.recordAttemptResult({
      assignmentId,
      candidateId,
      score,
      maxScore,
      rubricScores,
      reviewerFeedback,
      gradedBy: req.user.id,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Student diagnostic assessment submission
router.post('/student-submit', requireAuth, (req, res, next) => {
  try {
    if (assessmentV2.enabled) {
      return res.status(410).json({
        error: {
          code: 'GONE',
          message: 'Client-computed assessment submission is deprecated and disabled under ASSESSMENT_V2_ENABLED. Please use /api/assessments/v2/sessions/:id/submit.'
        }
      });
    }

    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (req.user.globalRole !== 'candidate') {
      return res.status(403).json({ error: 'Only candidates can submit student assessments' });
    }

    const {
      domainId,
      targetRole,
      overallScore,
      knowledgeScore,
      practicalScore,
      categoryScores,
      skillScores,
      strengths,
      improvements
    } = req.body;

    if (typeof overallScore !== 'number') {
      return res.status(400).json({ error: 'overallScore is required and must be a number' });
    }

    const result = assessmentService.recordStudentAssessment({
      candidateId: req.user.id,
      domainId: domainId || 'dom-fullstack',
      targetRole: targetRole || 'Full-Stack Developer',
      overallScore,
      knowledgeScore,
      practicalScore,
      categoryScores: categoryScores || [],
      skillScores: skillScores || [],
      strengths: strengths || [],
      improvements: improvements || []
    });

    res.status(201).json({
      success: true,
      data: result,
      message: 'Assessment attempt and diagnostic results recorded successfully.'
    });
  } catch (err) {
    next(err);
  }
});

// Student candidate assessment history
router.get('/my-history', requireAuth, (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const history = assessmentService.getStudentAssessmentHistory(req.user.id);
    res.json({
      success: true,
      data: history
    });
  } catch (err) {
    next(err);
  }
});

export default router;
