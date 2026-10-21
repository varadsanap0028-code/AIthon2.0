import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import { SkillEvidenceEngine } from '../services/skillEvidenceEngine.js';
import { RoleBenchmarkService } from '../services/roleBenchmarkService.js';
import { AdaptiveAssessmentService } from '../services/adaptiveAssessmentService.js';
import { PracticalChallengeService } from '../services/practicalChallengeService.js';

const router = Router();

/**
 * GET /api/skills/benchmarks
 * Returns all available role benchmarks
 */
router.get('/benchmarks', (req, res, next) => {
  try {
    const benchmarks = RoleBenchmarkService.getAllBenchmarks();
    res.json({
      success: true,
      data: benchmarks
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/skills/benchmarks/:roleTitle
 * Returns requirements, weights, mandatory indicators, and prerequisites for a role
 */
router.get('/benchmarks/:roleTitle', (req, res, next) => {
  try {
    const benchmark = RoleBenchmarkService.getRoleBenchmark(req.params.roleTitle);
    res.json({
      success: true,
      data: benchmark
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/skills/canonical-profile (and alias /api/skills/profile)
 * Retrieves canonical profile for authenticated candidate
 */
const handleGetProfile = (req, res, next) => {
  try {
    const candidateId = req.query.candidateId && ['recruiter', 'platform_admin', 'college'].includes(req.user.globalRole)
      ? req.query.candidateId
      : req.user.id;

    const targetRole = req.query.targetRole || null;
    const profile = SkillEvidenceEngine.getCanonicalProfile(candidateId, targetRole);

    res.json({
      success: true,
      data: profile
    });
  } catch (err) {
    next(err);
  }
};

router.get('/canonical-profile', requireAuth, handleGetProfile);
router.get('/profile', requireAuth, handleGetProfile);

/**
 * GET /api/skills/recommendations
 * Retrieves dependency-aware personalized learning recommendations
 */
router.get('/recommendations', requireAuth, (req, res, next) => {
  try {
    const candidateId = req.query.candidateId && ['recruiter', 'platform_admin', 'college'].includes(req.user.globalRole)
      ? req.query.candidateId
      : req.user.id;

    const targetRole = req.query.targetRole || 'Full-Stack Developer';
    const recs = SkillEvidenceEngine.generateLearningRecommendations(candidateId, targetRole);

    res.json({
      success: true,
      data: recs
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/skills/gaps
 * Retrieves deterministic skill gap analysis for candidate and target role
 */
router.get('/gaps', requireAuth, (req, res, next) => {
  try {
    const candidateId = req.query.candidateId && ['recruiter', 'platform_admin', 'college'].includes(req.user.globalRole)
      ? req.query.candidateId
      : req.user.id;

    const targetRole = req.query.targetRole || 'Full-Stack Developer';
    const analysis = SkillEvidenceEngine.calculateSkillGaps(candidateId, targetRole);

    res.json({
      success: true,
      data: analysis
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/skills/readiness
 * Retrieves transparent weighted career readiness score and evidence coverage
 */
router.get('/readiness', requireAuth, (req, res, next) => {
  try {
    const candidateId = req.query.candidateId && ['recruiter', 'platform_admin', 'college'].includes(req.user.globalRole)
      ? req.query.candidateId
      : req.user.id;

    const targetRole = req.query.targetRole || 'Full-Stack Developer';
    const readiness = SkillEvidenceEngine.calculateCareerReadiness(candidateId, targetRole);

    res.json({
      success: true,
      data: readiness
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/skills/provenance/:skillId
 * Retrieves immutable provenance audit log for a competency
 */
router.get('/provenance/:skillId', requireAuth, (req, res, next) => {
  try {
    const candidateId = req.query.candidateId && ['recruiter', 'platform_admin', 'college'].includes(req.user.globalRole)
      ? req.query.candidateId
      : req.user.id;

    const provenance = SkillEvidenceEngine.getProvenance(candidateId, req.params.skillId);

    res.json({
      success: true,
      data: provenance
    });
  } catch (err) {
    next(err);
  }
});

const handleAdaptiveStart = (req, res, next) => {
  try {
    const { targetRole, maxQuestions } = req.body || {};
    const session = AdaptiveAssessmentService.startSession({
      candidateId: req.user.id,
      targetRole: targetRole || 'Full-Stack Developer',
      maxQuestions: maxQuestions || 6
    });

    res.status(200).json({
      success: true,
      data: session
    });
  } catch (err) {
    next(err);
  }
};

router.post('/adaptive/start', requireAuth, handleAdaptiveStart);
router.post('/assessment/adaptive/start', requireAuth, handleAdaptiveStart);

/**
 * GET /api/skills/adaptive/question/:sessionId
 * Retrieves next adaptive question for the active session
 */
router.get('/adaptive/question/:sessionId', requireAuth, (req, res, next) => {
  try {
    const question = AdaptiveAssessmentService.getNextQuestion(req.params.sessionId, req.user.id);
    res.json({
      success: true,
      data: question
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/skills/adaptive/answer (and alias /assessment/adaptive/submit)
 * Evaluates submitted answer, updates difficulty & records evidence
 */
const handleAdaptiveAnswer = (req, res, next) => {
  try {
    const { sessionId, questionId, selectedOptionIndex, codeAnswer } = req.body || {};
    if (!sessionId || !questionId) {
      return res.status(400).json({ error: 'sessionId and questionId are required' });
    }

    const result = AdaptiveAssessmentService.submitAnswer({
      sessionId,
      candidateId: req.user.id,
      questionId,
      selectedOptionIndex,
      codeAnswer
    });

    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
};

router.post('/adaptive/answer', requireAuth, handleAdaptiveAnswer);
router.post('/adaptive/submit', requireAuth, handleAdaptiveAnswer);
router.post('/assessment/adaptive/submit', requireAuth, handleAdaptiveAnswer);

/**
 * GET /api/skills/challenges
 * Lists practical coding & problem-solving challenges
 */
router.get('/challenges', (req, res, next) => {
  try {
    const { domainId, skillId } = req.query;
    const challenges = PracticalChallengeService.getChallenges({ domainId, skillId });
    res.json({
      success: true,
      data: challenges
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/skills/challenges/:id
 * Retrieves practical challenge by ID
 */
router.get('/challenges/:id', (req, res, next) => {
  try {
    const challenge = PracticalChallengeService.getChallengeById(req.params.id);
    if (!challenge) {
      return res.status(404).json({ error: 'Practical challenge not found' });
    }
    res.json({
      success: true,
      data: challenge
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/skills/challenges/:id/submit
 * Submits solution for practical challenge, tests deterministically, records verified evidence
 */
router.post('/challenges/:id/submit', requireAuth, (req, res, next) => {
  try {
    const { submittedCode } = req.body || {};
    if (!submittedCode) {
      return res.status(400).json({ error: 'submittedCode is required' });
    }

    const result = PracticalChallengeService.submitChallenge({
      challengeId: req.params.id,
      candidateId: req.user.id,
      submittedCode
    });

    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/skills/recalculate
 * Triggers aggregation and recalculation of canonical skill profile
 */
router.post('/recalculate', requireAuth, (req, res, next) => {
  try {
    const candidateId = req.body?.candidateId && ['recruiter', 'platform_admin', 'college'].includes(req.user.globalRole)
      ? req.body.candidateId
      : req.user.id;

    SkillEvidenceEngine.aggregateStudentProfile(candidateId);
    const targetRole = req.body?.targetRole || 'Full-Stack Developer';
    const profile = SkillEvidenceEngine.getCanonicalProfile(candidateId, targetRole);
    const gaps = SkillEvidenceEngine.calculateSkillGaps(candidateId, targetRole);
    const readiness = SkillEvidenceEngine.calculateCareerReadiness(candidateId, targetRole);

    res.json({
      success: true,
      data: {
        profile,
        gaps,
        readiness
      }
    });
  } catch (err) {
    next(err);
  }
});

export default router;
