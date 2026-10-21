import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';
import { SessionService } from '../services/assessmentV2/sessionService.js';
import { GradingService } from '../services/assessmentV2/gradingService.js';
import { IntegrityService } from '../services/assessmentV2/integrityService.js';
import { ReviewService } from '../services/assessmentV2/reviewService.js';
import { initDb } from '../config/db.js';

const router = Router();

// Validation Schemas
const createSessionSchema = z.object({
  mode: z.enum(['practice', 'secure']).default('practice'),
  domainId: z.string().min(1, 'domainId is required'),
  role: z.string().optional().default('Software Engineer'),
  scope: z.enum(['full', 'quiz_only', 'practical_only']).default('full'),
  consent: z.record(z.any()).optional().default({}),
  accommodation: z.record(z.any()).optional().default({}),
});

const saveAnswersSchema = z.object({
  answers: z.record(z.any()).default({}),
  saveVersion: z.number().optional(),
});

const saveSnapshotSchema = z.object({
  questionId: z.string().min(1, 'questionId is required'),
  code: z.string().default(''),
  language: z.string().default('javascript'),
  reason: z.enum(['autosave', 'run', 'submit']).default('autosave'),
});

const submitSessionSchema = z.object({
  answers: z.record(z.any()).optional().default({}),
  tasks: z.record(z.any()).optional().default({}),
});

/**
 * POST /api/assessments/v2/sessions
 * Start a new assessment session
 */
router.post('/sessions', requireAuth, (req, res, next) => {
  try {
    const parsed = createSessionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.issues.map(i => i.message).join(', '),
        },
      });
    }

    const session = SessionService.createSession({
      userId: req.user.id,
      ...parsed.data,
    });

    if (session.isResumed) {
      return res.status(200).json({ resumed: true, session, ...session });
    }

    res.status(201).json(session);
  } catch (err) {
    if (err.message?.includes('Consent is required')) {
      return res.status(400).json({
        error: { code: 'CONSENT_REQUIRED', message: err.message },
      });
    }
    next(err);
  }
});

/**
 * GET /api/assessments/v2/sessions/active
 * Retrieve active in-progress assessment session for the authenticated student
 */
router.get('/sessions/active', requireAuth, (req, res, next) => {
  try {
    const session = SessionService.getActiveSession(req.user.id, req.query.domainId);
    if (!session) {
      return res.status(404).json({ active: false, session: null });
    }
    res.json({ active: true, session });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/assessments/v2/sessions/:id/abandon
 * Explicitly abandon an in-progress session
 */
router.post('/sessions/:id/abandon', requireAuth, (req, res, next) => {
  try {
    const result = SessionService.abandonSession(req.params.id, req.user.id);
    res.json(result);
  } catch (err) {
    if (err.code === 'NOT_FOUND') {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: err.message } });
    }
    if (err.code === 'FORBIDDEN') {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: err.message } });
    }
    next(err);
  }
});

/**
 * GET /api/assessments/v2/sessions/latest-result
 * Retrieve latest completed assessment result for the authenticated student
 */
router.get('/sessions/latest-result', requireAuth, (req, res, next) => {
  try {
    const db = initDb();
    let query = `
      SELECT s.id
      FROM assessment_sessions s
      JOIN session_scores sc ON s.id = sc.session_id
      WHERE s.user_id = ? AND s.status IN ('graded', 'submitted', 'completed')
    `;
    const params = [req.user.id];

    if (req.query.domainId) {
      query += ` AND s.domain_id = ?`;
      params.push(req.query.domainId);
    }

    query += ` ORDER BY s.submitted_at DESC, s.started_at DESC LIMIT 1`;

    const row = db.prepare(query).get(...params);

    if (!row) {
      return res.status(404).json({ success: false, result: null, message: 'No completed assessment found.' });
    }

    const result = GradingService.getSessionResult(row.id, req.user.id);
    res.json({ success: true, result });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/assessments/v2/sessions/history
 * Retrieve completed assessment attempts history for authenticated student
 */
const historyHandler = (req, res, next) => {
  try {
    const db = initDb();
    let query = `
      SELECT s.id, s.mode, s.domain_id, s.role, s.status, s.submitted_at, s.started_at,
             sc.technical_score, sc.knowledge_score, sc.practical_score
      FROM assessment_sessions s
      LEFT JOIN session_scores sc ON s.id = sc.session_id
      WHERE s.user_id = ?
    `;
    const params = [req.user.id];

    if (req.query.domainId) {
      query += ` AND s.domain_id = ?`;
      params.push(req.query.domainId);
    }

    query += ` ORDER BY COALESCE(s.submitted_at, s.started_at) DESC, s.started_at DESC`;

    const rows = db.prepare(query).all(...params);
    const history = rows.map(r => ({
      sessionId: r.id,
      id: r.id,
      mode: r.mode,
      domainId: r.domain_id,
      role: r.role,
      status: r.status,
      overallScore: r.technical_score ?? 0,
      technicalScore: r.technical_score ?? 0,
      knowledgeScore: r.knowledge_score ?? 0,
      practicalScore: r.practical_score ?? 0,
      completedAt: r.submitted_at || r.started_at,
    }));

    res.json({ success: true, history, data: history });
  } catch (err) {
    next(err);
  }
};

router.get('/sessions/history', requireAuth, historyHandler);
router.get('/history', requireAuth, historyHandler);

/**
 * GET /api/assessments/v2/sessions/:id
 * Resume an existing assessment session
 */
router.get('/sessions/:id', requireAuth, (req, res, next) => {
  try {
    const session = SessionService.getSession(req.params.id, req.user.id);
    res.json(session);
  } catch (err) {
    if (err.code === 'NOT_FOUND') {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: err.message } });
    }
    if (err.code === 'FORBIDDEN') {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: err.message } });
    }
    next(err);
  }
});

/**
 * GET /api/assessments/v2/sessions/:id/state
 * Lightweight authoritative timer and recovery state sync
 */
router.get(['/sessions/:id/state', '/attempts/:id/state'], requireAuth, (req, res, next) => {
  try {
    const state = SessionService.getSessionState(req.params.id, req.user.id);
    res.json(state);
  } catch (err) {
    if (err.code === 'NOT_FOUND') {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: err.message } });
    }
    if (err.code === 'FORBIDDEN') {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: err.message } });
    }
    next(err);
  }
});

/**
 * PUT /api/assessments/v2/sessions/:id/answers
 * Autosave draft answers with optimistic version conflict protection
 */
router.put('/sessions/:id/answers', requireAuth, (req, res, next) => {
  try {
    const parsed = saveAnswersSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.issues.map(i => i.message).join(', '),
        },
      });
    }

    const result = SessionService.saveAnswers(
      req.params.id,
      req.user.id,
      parsed.data.answers,
      parsed.data.saveVersion
    );
    res.json(result);
  } catch (err) {
    if (err.code === 'VERSION_CONFLICT') {
      return res.status(409).json({ error: { code: 'VERSION_CONFLICT', message: err.message } });
    }
    if (err.code === 'FORBIDDEN') {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: err.message } });
    }
    if (err.code === 'INVALID_STATE') {
      return res.status(400).json({ error: { code: 'INVALID_STATE', message: err.message } });
    }
    next(err);
  }
});

/**
 * POST /api/assessments/v2/sessions/:id/snapshots
 * Save a code snapshot
 */
router.post('/sessions/:id/snapshots', requireAuth, (req, res, next) => {
  try {
    const parsed = saveSnapshotSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.issues.map(i => i.message).join(', '),
        },
      });
    }

    const result = SessionService.saveSnapshot(req.params.id, req.user.id, parsed.data);
    res.json(result);
  } catch (err) {
    if (err.code === 'PAYLOAD_TOO_LARGE') {
      return res.status(413).json({ error: { code: 'PAYLOAD_TOO_LARGE', message: err.message } });
    }
    if (err.code === 'FORBIDDEN') {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: err.message } });
    }
    if (err.code === 'INVALID_STATE') {
      return res.status(400).json({ error: { code: 'INVALID_STATE', message: err.message } });
    }
    next(err);
  }
});

const runCodeSchema = z.object({
  questionId: z.string().min(1, 'questionId is required'),
  code: z.string().default(''),
  language: z.string().default('javascript'),
});

/**
 * POST /api/assessments/v2/sessions/:id/run
 * Execute code against VISIBLE test cases only (rate-limited, sandboxed)
 */
router.post('/sessions/:id/run', requireAuth, async (req, res, next) => {
  try {
    const parsed = runCodeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.issues.map(i => i.message).join(', '),
        },
      });
    }

    const db = initDb();
    const session = db.prepare(`SELECT * FROM assessment_sessions WHERE id = ?`).get(req.params.id);

    if (!session || session.user_id !== req.user.id) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Unauthorized session access.' } });
    }

    if (session.status !== 'in_progress') {
      return res.status(400).json({ error: { code: 'INVALID_STATE', message: 'Session is not active for code execution.' } });
    }

    const { questionId, code, language } = parsed.data;

    // Fetch ONLY visible tests (hidden tests are strictly excluded)
    const visibleTests = db.prepare(`
      SELECT id, kind, input, expected_output, timeout_ms
      FROM code_tests
      WHERE question_id = ? AND kind = 'visible'
      ORDER BY id ASC
    `).all(questionId);

    const { RunnerDriver } = await import('../services/runner/runnerDriver.js');
    const runnerRes = await RunnerDriver.run({
      language,
      code,
      tests: visibleTests.map(t => ({
        id: t.id,
        kind: 'visible',
        input: t.input,
        expectedOutput: t.expected_output,
        timeoutMs: t.timeout_ms,
      })),
    });

    // Save snapshot of execution
    SessionService.saveSnapshot(req.params.id, req.user.id, {
      questionId,
      code,
      language,
      reason: 'run',
    });

    // Record run_results
    const runResultId = `rr-${Date.now()}`;
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO run_results (id, session_id, question_id, visible_passed, visible_total, status, stdout, stderr, time_ms, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      runResultId,
      req.params.id,
      questionId,
      runnerRes.passed,
      runnerRes.total,
      runnerRes.status,
      runnerRes.stdout || '',
      runnerRes.stderr || '',
      runnerRes.timeMs || 0,
      now
    );

    res.json({
      status: runnerRes.status,
      visiblePassed: runnerRes.passed,
      visibleTotal: runnerRes.total,
      results: runnerRes.results,
      stdout: runnerRes.stdout,
      stderr: runnerRes.stderr,
      timeMs: runnerRes.timeMs,
      isolationNotice: runnerRes.isolationNotice,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/assessments/v2/sessions/:id/submit
 * Server grades session, records attempts and candidate_skills
 */
router.post('/sessions/:id/submit', requireAuth, async (req, res, next) => {
  try {
    const parsed = submitSessionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.issues.map(i => i.message).join(', '),
        },
      });
    }

    const result = await GradingService.gradeSession(req.params.id, req.user.id, parsed.data);
    res.json(result);
  } catch (err) {
    if (err.code === 'INVALID_STATE') {
      return res.status(400).json({ error: { code: 'INVALID_STATE', message: err.message } });
    }
    if (err.code === 'FORBIDDEN') {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: err.message } });
    }
    next(err);
  }
});

/**
 * GET /api/assessments/v2/sessions/:id/result
 * GET /api/assessments/v2/attempts/:id/result
 * Retrieve completed assessment result
 */
router.get(['/sessions/:id/result', '/attempts/:id/result'], requireAuth, (req, res, next) => {
  try {
    const result = GradingService.getSessionResult(req.params.id, req.user.id);
    res.json(result);
  } catch (err) {
    if (err.code === 'FORBIDDEN') {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: err.message } });
    }
    if (err.code === 'NOT_FOUND') {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: err.message } });
    }
    next(err);
  }
});

/**
 * GET /api/assessments/v2/history
 * Merged v1 + v2 candidate assessment attempts
 */
router.get('/history', requireAuth, (req, res, next) => {
  try {
    const db = initDb();
    let query = `
      SELECT s.id as session_id, s.mode, s.domain_id, s.role, s.status, s.started_at, s.submitted_at, s.engine_version,
             sc.technical_score, sc.knowledge_score, sc.practical_score, sc.skill_scores
      FROM assessment_sessions s
      LEFT JOIN session_scores sc ON s.id = sc.session_id
      WHERE s.user_id = ?
    `;
    const params = [req.user.id];

    if (req.query.domainId) {
      query += ` AND s.domain_id = ?`;
      params.push(req.query.domainId);
    }

    query += ` ORDER BY s.started_at DESC`;
    const rows = db.prepare(query).all(...params);

    const formatted = rows.map(r => {
      let skillScores = {};
      try { skillScores = JSON.parse(r.skill_scores || '{}'); } catch {}

      return {
        id: r.session_id,
        mode: r.mode,
        domainId: r.domain_id,
        role: r.role,
        status: r.status,
        score: r.technical_score || 0,
        knowledgeScore: r.knowledge_score || 0,
        practicalScore: r.practical_score || 0,
        completedAt: r.submitted_at || r.started_at,
        engineVersion: r.engine_version || 'v2',
        skillScores,
      };
    });

    res.json({ success: true, data: formatted });
  } catch (err) {
    next(err);
  }
});

const recordIntegrityEventSchema = z.object({
  type: z.string().optional(),
  ts: z.string().optional(),
  meta: z.record(z.any()).optional().default({}),
  events: z.array(z.object({
    type: z.string(),
    ts: z.string().optional(),
    meta: z.record(z.any()).optional().default({}),
  })).optional(),
});

/**
 * POST /api/assessments/v2/sessions/:id/integrity-events
 * Log client-side integrity indicators (single event or batch)
 */
router.post('/sessions/:id/integrity-events', requireAuth, (req, res, next) => {
  try {
    const parsed = recordIntegrityEventSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: parsed.error.issues.map(i => i.message).join(', ') }
      });
    }

    if (parsed.data.events && parsed.data.events.length > 0) {
      const result = IntegrityService.recordBatch(req.params.id, req.user.id, parsed.data.events);
      return res.json(result);
    }

    if (!parsed.data.type) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Event type or non-empty events array is required' }
      });
    }

    const result = IntegrityService.recordEvent(req.params.id, req.user.id, parsed.data);
    res.json(result);
  } catch (err) {
    if (err.code === 'FORBIDDEN') {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: err.message } });
    }
    next(err);
  }
});

const REVIEWER_ROLES = ['recruiter', 'college', 'admin', 'hiring_manager', 'reviewer', 'platform_admin'];

/**
 * GET /api/assessments/v2/reviews/queue
 * List assessment sessions flagged or pending review with optional status filter
 */
router.get('/reviews/queue', requireAuth, requireRole(REVIEWER_ROLES), (req, res, next) => {
  try {
    const domainId = req.query.domainId || null;
    const status = req.query.status || null;
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '50', 10)));
    const offset = Math.max(0, parseInt(req.query.offset || '0', 10));

    const queue = ReviewService.getReviewQueue({ domainId, status, limit, offset });
    res.json({ success: true, count: queue.length, data: queue });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/assessments/v2/reviews/:sessionId
 * Full assessment session attempt details for reviewer inspection
 */
router.get('/reviews/:sessionId', requireAuth, requireRole(REVIEWER_ROLES), (req, res, next) => {
  try {
    const detail = ReviewService.getSessionReviewDetail(req.params.sessionId);
    res.json({ success: true, data: detail });
  } catch (err) {
    if (err.code === 'NOT_FOUND') {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: err.message } });
    }
    next(err);
  }
});

const recordReviewDecisionSchema = z.object({
  decision: z.enum([
    'no_concern',
    'needs_followup',
    'concern_confirmed',
    'verified',
    'cleared',
    'flagged',
    'dismissed',
  ]),
  note: z.string().min(5, 'Review rationale note is required (minimum 5 characters)'),
  rubricUpdates: z.record(z.any()).optional(),
});

/**
 * POST /api/assessments/v2/reviews/:sessionId
 * Submit human reviewer judgment and optional rubric score adjustments
 */
router.post('/reviews/:sessionId', requireAuth, requireRole(REVIEWER_ROLES), (req, res, next) => {
  try {
    const parsed = recordReviewDecisionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: parsed.error.issues.map(i => i.message).join(', ') }
      });
    }

    const result = ReviewService.recordReview(req.params.sessionId, req.user.id, parsed.data);
    res.json({ success: true, data: result });
  } catch (err) {
    if (err.code === 'NOT_FOUND') {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: err.message } });
    }
    if (err.code === 'VALIDATION_ERROR') {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: err.message } });
    }
    next(err);
  }
});

export default router;
