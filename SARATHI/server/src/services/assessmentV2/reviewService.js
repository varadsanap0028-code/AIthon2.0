import { randomUUID as uuidv4 } from 'node:crypto';
import { initDb } from '../../config/db.js';
import { IntegrityService } from './integrityService.js';
import { QuestionBankService } from './questionBankService.js';

export class ReviewService {
  /**
   * Get review queue for colleges, admins, and recruiters.
   * Filters for secure-mode graded sessions with notable indicators or provisional scores.
   */
  static getReviewQueue({ domainId = null, status = null, limit = 50, offset = 0 } = {}) {
    const db = initDb();

    let query = `
      SELECT s.id as session_id, s.user_id, s.mode, s.domain_id, s.role, s.started_at, s.submitted_at, s.status,
             u.full_name as candidate_name, u.email as candidate_email,
             sc.technical_score, sc.knowledge_score, sc.practical_score, sc.rubric_json,
             ir.id as review_id, ir.decision as review_decision, ir.created_at as reviewed_at
      FROM assessment_sessions s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN session_scores sc ON s.id = sc.session_id
      LEFT JOIN integrity_reviews ir ON s.id = ir.session_id
      WHERE s.status = 'graded' AND s.mode = 'secure'
    `;

    const params = [];
    if (domainId) {
      query += ` AND s.domain_id = ?`;
      params.push(domainId);
    }

    query += ` ORDER BY s.submitted_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const rows = db.prepare(query).all(...params);

    const mapped = rows.map(r => {
      const integrity = IntegrityService.getIntegritySummary(r.session_id);
      let calculatedStatus = r.review_decision;
      if (!calculatedStatus) {
        calculatedStatus = integrity.level === 'notable' ? 'pending_review' : 'cleared';
      }

      return {
        sessionId: r.session_id,
        userId: r.user_id,
        candidateName: r.candidate_name,
        candidateEmail: r.candidate_email,
        domainId: r.domain_id,
        role: r.role,
        technicalScore: r.technical_score ?? 0,
        knowledgeScore: r.knowledge_score ?? 0,
        practicalScore: r.practical_score ?? 0,
        startedAt: r.started_at,
        submittedAt: r.submitted_at,
        integritySummary: integrity,
        reviewStatus: calculatedStatus,
        reviewedAt: r.reviewed_at,
      };
    });

    if (status) {
      return mapped.filter(item => {
        if (status === 'pending_review') {
          return item.reviewStatus === 'pending_review';
        }
        if (status === 'reviewed') {
          return ['cleared', 'verified', 'dismissed', 'flagged', 'concern_confirmed', 'no_concern'].includes(item.reviewStatus);
        }
        if (status === 'flagged') {
          return ['flagged', 'concern_confirmed'].includes(item.reviewStatus);
        }
        return item.reviewStatus === status;
      });
    }

    return mapped;
  }

  /**
   * Get detailed session attempt for reviewer inspection
   */
  static getSessionReviewDetail(sessionId) {
    const db = initDb();

    const session = db.prepare(`
      SELECT s.*, u.full_name as candidate_name, u.email as candidate_email
      FROM assessment_sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.id = ?
    `).get(sessionId);

    if (!session) {
      const err = new Error('Session not found');
      err.code = 'NOT_FOUND';
      throw err;
    }

    const scoresRow = db.prepare(`SELECT * FROM session_scores WHERE session_id = ?`).get(sessionId);
    let skillScores = {};
    let rubricJson = {};
    try { skillScores = JSON.parse(scoresRow?.skill_scores || '{}'); } catch {}
    try { rubricJson = JSON.parse(scoresRow?.rubric_json || '{}'); } catch {}

    let questionIds = [];
    try { questionIds = JSON.parse(session.question_ids || '[]'); } catch {}

    const questions = QuestionBankService.getQuestionsForGrading(questionIds);

    // Fetch code snapshots
    const snapshots = db.prepare(`
      SELECT question_id, code, language, reason, created_at
      FROM submission_snapshots
      WHERE session_id = ?
      ORDER BY created_at ASC
    `).all(sessionId);

    // Fetch run results
    const runResults = db.prepare(`
      SELECT question_id, visible_passed, visible_total, status, stdout, stderr, time_ms, created_at
      FROM run_results
      WHERE session_id = ?
      ORDER BY created_at ASC
    `).all(sessionId);

    // Fetch integrity timeline
    const integrityEvents = IntegrityService.getEventsForSession(sessionId);
    const integritySummary = IntegrityService.getIntegritySummary(sessionId);

    // Fetch existing reviews
    const reviews = db.prepare(`
      SELECT ir.id, ir.reviewer_id, ir.decision, ir.note, ir.created_at, u.full_name as reviewer_name
      FROM integrity_reviews ir
      JOIN users u ON ir.reviewer_id = u.id
      WHERE ir.session_id = ?
      ORDER BY ir.created_at DESC
    `).all(sessionId);

    return {
      session: {
        id: session.id,
        userId: session.user_id,
        candidateName: session.candidate_name,
        candidateEmail: session.candidate_email,
        mode: session.mode,
        domainId: session.domain_id,
        role: session.role,
        status: session.status,
        startedAt: session.started_at,
        submittedAt: session.submitted_at,
      },
      scores: {
        technicalScore: scoresRow?.technical_score ?? 0,
        knowledgeScore: scoresRow?.knowledge_score ?? 0,
        practicalScore: scoresRow?.practical_score ?? 0,
        skillScores,
        rubric: rubricJson,
      },
      questions,
      snapshots,
      runResults,
      integrity: {
        summary: integritySummary,
        timeline: integrityEvents,
      },
      reviews,
    };
  }

  /**
   * Submit reviewer decision and audit trail.
   * Modifies verification status on candidate_skills while strictly preserving technical score.
   */
  static recordReview(sessionId, reviewerId, { decision, note, rubricUpdates }) {
    const db = initDb();

    if (!note || typeof note !== 'string' || note.trim().length < 5) {
      const err = new Error('Review note/rationale is mandatory (minimum 5 characters).');
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    const session = db.prepare(`SELECT * FROM assessment_sessions WHERE id = ?`).get(sessionId);
    if (!session) {
      const err = new Error('Session not found');
      err.code = 'NOT_FOUND';
      throw err;
    }

    const reviewId = `rev-${uuidv4().slice(0, 10)}`;
    const now = new Date().toISOString();

    const decisionMap = {
      verified: 'no_concern',
      cleared: 'no_concern',
      dismissed: 'no_concern',
      no_concern: 'no_concern',
      flagged: 'concern_confirmed',
      concern_confirmed: 'concern_confirmed',
      needs_followup: 'needs_followup',
    };
    const dbDecision = decisionMap[decision] || 'no_concern';

    db.prepare(`
      INSERT INTO integrity_reviews (id, session_id, reviewer_id, decision, note, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(reviewId, sessionId, reviewerId, dbDecision, note.trim(), now);

    // If rubric updates provided, save to session_scores without altering raw technicalScore
    if (rubricUpdates) {
      db.prepare(`
        UPDATE session_scores
        SET rubric_json = ?
        WHERE session_id = ?
      `).run(JSON.stringify(rubricUpdates), sessionId);
    }

    // Update candidate_skills verification status based on review decision
    if (['concern_confirmed', 'flagged'].includes(decision)) {
      db.prepare(`
        UPDATE candidate_skills
        SET verification_status = 'unverified'
        WHERE candidate_id = ? AND verification_status IN ('diagnostic_tested', 'verified')
      `).run(session.user_id);
    } else if (['verified', 'cleared', 'no_concern'].includes(decision)) {
      db.prepare(`
        UPDATE candidate_skills
        SET verification_status = 'verified'
        WHERE candidate_id = ? AND verification_status IN ('diagnostic_tested', 'unverified')
      `).run(session.user_id);
    }

    return {
      success: true,
      reviewId,
      decision,
      note: note.trim(),
      reviewedAt: now,
    };
  }
}
