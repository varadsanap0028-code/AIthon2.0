import { initDb } from '../../config/db.js';
import { IntegrityRiskService } from './integrityRiskService.js';
import { ReviewService } from '../assessmentV2/reviewService.js';
import { SkillEvidenceEngine } from '../skillEvidenceEngine.js';
import { logAdminAction } from './adminAuditService.js';

export class AdminIntegrityService {
  /**
   * List assessment sessions for anti-cheat proctoring review with filtering and risk sorting.
   */
  static listSessions({
    band = 'all',
    reviewStatus = 'all',
    question = '',
    dateRange = 'all',
    q = '',
    page = 1,
    pageSize = 20,
  } = {}) {
    const db = initDb();
    const limit = Math.max(1, Math.min(100, Number(pageSize) || 20));
    const pageNum = Math.max(1, Number(page) || 1);
    const offset = (pageNum - 1) * limit;

    let query = `
      SELECT s.id, s.user_id, s.mode, s.domain_id, s.role, s.started_at, s.submitted_at, s.status,
             u.full_name as candidate_name, u.email as candidate_email,
             sc.technical_score, sc.knowledge_score, sc.practical_score,
             irs.score as risk_score, irs.band as risk_band, irs.reasons_json, irs.computed_at,
             ir.id as review_id, ir.decision as review_decision, ir.note as review_note, ir.created_at as reviewed_at,
             rev_user.full_name as reviewer_name
      FROM assessment_sessions s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN session_scores sc ON s.id = sc.session_id
      LEFT JOIN integrity_risk_scores irs ON s.id = irs.session_id
      LEFT JOIN integrity_reviews ir ON s.id = ir.session_id
      LEFT JOIN users rev_user ON ir.reviewer_id = rev_user.id
      WHERE s.status IN ('graded', 'submitted')
    `;

    const params = [];

    // Filter by risk band
    if (band && band !== 'all') {
      query += ` AND irs.band = ?`;
      params.push(band.toLowerCase());
    }

    // Filter by review status
    if (reviewStatus && reviewStatus !== 'all') {
      if (reviewStatus === 'unreviewed') {
        query += ` AND ir.id IS NULL`;
      } else if (reviewStatus === 'clean') {
        query += ` AND ir.decision IN ('clean', 'no_concern', 'cleared', 'verified', 'dismissed')`;
      } else if (reviewStatus === 'violation') {
        query += ` AND ir.decision IN ('violation', 'concern_confirmed', 'flagged')`;
      } else if (reviewStatus === 'escalated') {
        query += ` AND ir.decision IN ('escalate', 'needs_followup')`;
      }
    }

    // Filter by search query (candidate name, email, or session ID)
    if (q && q.trim()) {
      query += ` AND (u.full_name LIKE ? OR u.email LIKE ? OR s.id LIKE ?)`;
      const term = `%${q.trim()}%`;
      params.push(term, term, term);
    }

    // Filter by date range
    if (dateRange && dateRange !== 'all') {
      const now = Date.now();
      let days = 30;
      if (dateRange === '7d') days = 7;
      else if (dateRange === '90d') days = 90;
      else if (dateRange === '24h') days = 1;
      const cutoff = new Date(now - days * 24 * 60 * 60 * 1000).toISOString();
      query += ` AND s.submitted_at >= ?`;
      params.push(cutoff);
    }

    // Filter by question text / ID if provided
    if (question && question.trim()) {
      query += ` AND EXISTS (
        SELECT 1 FROM submission_snapshots sn
        JOIN assessment_questions aq ON sn.question_id = aq.id
        WHERE sn.session_id = s.id AND (aq.prompt LIKE ? OR aq.id = ?)
      )`;
      const qTerm = `%${question.trim()}%`;
      params.push(qTerm, question.trim());
    }

    // Count total matches
    const countSql = `SELECT COUNT(*) as total FROM (${query})`;
    const countRow = db.prepare(countSql).get(...params);
    const total = countRow ? Number(countRow.total) : 0;
    const totalPages = Math.ceil(total / limit) || 1;

    // Order by risk score desc, then newest submitted
    query += ` ORDER BY COALESCE(irs.score, 0) DESC, s.submitted_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const rows = db.prepare(query).all(...params);

    const sessions = rows.map(r => {
      // Map review status
      let statusLabel = 'unreviewed';
      if (r.review_id) {
        if (['clean', 'no_concern', 'cleared', 'verified', 'dismissed'].includes(r.review_decision)) {
          statusLabel = 'clean';
        } else if (['violation', 'concern_confirmed', 'flagged'].includes(r.review_decision)) {
          statusLabel = 'violation';
        } else if (['escalate', 'needs_followup'].includes(r.review_decision)) {
          statusLabel = 'escalated';
        }
      }

      let reasons = [];
      try { reasons = JSON.parse(r.reasons_json || '[]'); } catch {}

      return {
        id: r.id,
        candidateId: r.user_id,
        candidateName: r.candidate_name,
        candidateEmail: r.candidate_email,
        role: r.role,
        domainId: r.domain_id,
        score: r.risk_score ?? 0,
        band: r.risk_band || 'low',
        reasons,
        reviewStatus: statusLabel,
        reviewDecision: r.review_decision,
        reviewNote: r.review_note,
        reviewedAt: r.reviewed_at,
        reviewerName: r.reviewer_name,
        submittedAt: r.submitted_at,
        startedAt: r.started_at,
        technicalScore: r.technical_score ?? 0,
      };
    });

    return {
      sessions,
      total,
      page: pageNum,
      pageSize: limit,
      totalPages,
    };
  }

  /**
   * Get detailed session attempt for anti-cheat inspection.
   * Redacts identities of any comparison candidates.
   */
  static getSessionDetail(sessionId) {
    const db = initDb();

    // Ensure risk score exists or compute it
    const risk = IntegrityRiskService.getOrCompute(sessionId, db);

    // Fetch review detail using shared ReviewService
    const baseDetail = ReviewService.getSessionReviewDetail(sessionId);

    // Fetch question snapshots
    const snapshots = db.prepare(`
      SELECT question_id, code, language, reason, created_at
      FROM submission_snapshots
      WHERE session_id = ?
      ORDER BY created_at ASC
    `).all(sessionId);

    // Fetch similar sessions anonymously if similarity detected
    const similarSessions = [];
    const questionId = snapshots[0]?.question_id;
    if (questionId && snapshots[0]?.code) {
      const candidates = db.prepare(`
        SELECT session_id, code, created_at
        FROM submission_snapshots
        WHERE question_id = ? AND session_id != ?
        ORDER BY created_at DESC
        LIMIT 50
      `).all(questionId, sessionId);

      const thisTokens = IntegrityRiskService.tokenizeCode(snapshots[snapshots.length - 1]?.code || '');
      const thisShingles = IntegrityRiskService.getShingles(thisTokens);

      let peerIdx = 1;
      const seenSessions = new Set();
      for (const cand of candidates) {
        if (seenSessions.has(cand.session_id)) continue;
        seenSessions.add(cand.session_id);

        const candTokens = IntegrityRiskService.tokenizeCode(cand.code);
        const candShingles = IntegrityRiskService.getShingles(candTokens);
        const sim = IntegrityRiskService.jaccardSimilarity(thisShingles, candShingles);

        if (sim >= 0.4) {
          similarSessions.push({
            sessionId: cand.session_id,
            pseudonym: `Candidate ${String.fromCharCode(65 + peerIdx)}`, // Candidate B, Candidate C...
            similarityPct: Math.round(sim * 100),
            submittedAt: cand.created_at,
          });
          peerIdx++;
        }
      }
    }

    // Format timeline events with relative seconds from started_at
    const startTime = baseDetail.session.startedAt ? new Date(baseDetail.session.startedAt).getTime() : 0;
    const timeline = (baseDetail.integrity.timeline || []).map(evt => {
      const evtTime = new Date(evt.ts).getTime();
      const relativeSeconds = startTime > 0 ? Math.max(0, Math.round((evtTime - startTime) / 1000)) : 0;
      let meta = {};
      try { meta = typeof evt.meta === 'string' ? JSON.parse(evt.meta) : (evt.meta || {}); } catch {}

      return {
        id: evt.id,
        type: evt.type,
        ts: evt.ts,
        relativeSeconds,
        meta,
      };
    });

    return {
      session: baseDetail.session,
      scores: baseDetail.scores,
      questions: baseDetail.questions,
      snapshots,
      runResults: baseDetail.runResults,
      timeline,
      risk,
      similarSessions,
      reviews: baseDetail.reviews,
    };
  }

  /**
   * Return code comparison between two sessions with candidate identity strictly protected.
   */
  static getComparison(sessionId, otherSessionId) {
    const db = initDb();

    const snapA = db.prepare(`
      SELECT code, language, created_at FROM submission_snapshots
      WHERE session_id = ? ORDER BY created_at DESC LIMIT 1
    `).get(sessionId);

    const snapB = db.prepare(`
      SELECT code, language, created_at FROM submission_snapshots
      WHERE session_id = ? ORDER BY created_at DESC LIMIT 1
    `).get(otherSessionId);

    if (!snapA || !snapB) {
      const err = new Error('One or both submission snapshots could not be found.');
      err.code = 'NOT_FOUND';
      throw err;
    }

    const tokensA = IntegrityRiskService.tokenizeCode(snapA.code);
    const tokensB = IntegrityRiskService.tokenizeCode(snapB.code);
    const shinglesA = IntegrityRiskService.getShingles(tokensA);
    const shinglesB = IntegrityRiskService.getShingles(tokensB);
    const similarity = IntegrityRiskService.jaccardSimilarity(shinglesA, shinglesB);

    return {
      sessionId,
      otherSessionId,
      sessionCode: snapA.code,
      sessionLanguage: snapA.language || 'javascript',
      otherCode: snapB.code,
      otherLanguage: snapB.language || 'javascript',
      sessionCandidateLabel: 'Current Candidate',
      otherCandidateLabel: 'Candidate B', // Identity anonymized
      similarityPct: Math.round(similarity * 100),
    };
  }

  /**
   * Record human review decision for an assessment session.
   * Refactored to share logic with ReviewService and support score invalidation.
   */
  static submitReview(sessionId, reviewerId, { decision, notes, invalidateScore = false } = {}, req = null) {
    const db = initDb();

    if (!notes || typeof notes !== 'string' || notes.trim().length < 5) {
      const err = new Error('Review notes/rationale must be at least 5 characters long.');
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    if (!['clean', 'violation', 'escalate'].includes(decision)) {
      const err = new Error("Decision must be 'clean', 'violation', or 'escalate'.");
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    const session = db.prepare(`SELECT * FROM assessment_sessions WHERE id = ?`).get(sessionId);
    if (!session) {
      const err = new Error('Assessment session not found.');
      err.code = 'NOT_FOUND';
      throw err;
    }

    const existingReview = db.prepare(`
      SELECT * FROM integrity_reviews WHERE session_id = ? ORDER BY created_at DESC LIMIT 1
    `).get(sessionId);

    const isOverride = Boolean(existingReview);

    // Map admin decision to internal integrity_reviews decision format
    const dbDecisionMap = {
      clean: 'no_concern',
      violation: 'concern_confirmed',
      escalate: 'needs_followup',
    };
    const dbDecision = dbDecisionMap[decision];

    // Execute review recording and optional invalidation atomically
    const now = new Date().toISOString();
    let reviewResult;

    db.exec('BEGIN IMMEDIATE;');
    try {
      // Record review using ReviewService logic
      reviewResult = ReviewService.recordReview(sessionId, reviewerId, {
        decision: dbDecision,
        note: notes.trim(),
      });

      // If violation + invalidateScore: invalidate candidate score across all stores
      if (decision === 'violation' && invalidateScore) {
        // 1. Zero out session_scores
        db.prepare(`
          UPDATE session_scores
          SET technical_score = 0, knowledge_score = 0, practical_score = 0,
              rubric_json = json_set(COALESCE(rubric_json, '{}'), '$.invalidated', true, '$.invalidatedReason', ?)
          WHERE session_id = ?
        `).run(notes.trim(), sessionId);

        // 2. Mark assessment_results as failed with 0 score
        db.prepare(`
          UPDATE assessment_results
          SET score = 0.0, passed = 0,
              reviewer_feedback = 'Score invalidated due to confirmed proctoring violation.'
          WHERE attempt_id = ? OR id = ?
        `).run(sessionId, `res-${sessionId}`);

        // 3. Mark candidate_skills unverified
        db.prepare(`
          UPDATE candidate_skills
          SET verification_status = 'unverified'
          WHERE candidate_id = ?
        `).run(session.user_id);

        // 4. Invalidate related skill_evidence_ledger records
        db.prepare(`
          UPDATE skill_evidence_ledger
          SET validity_status = 'INVALID'
          WHERE candidate_id = ? AND metadata LIKE ?
        `).run(session.user_id, `%"sessionId":"${sessionId}"%`);

        // 5. Recalculate canonical student profile
        try {
          SkillEvidenceEngine.aggregateStudentProfile(session.user_id);
        } catch (aggErr) {
          console.warn('[AdminIntegrityService] Profile recalculation note:', aggErr.message);
        }
      }

      // Audit the admin action
      const actionName = isOverride ? 'integrity.override' : 'integrity.review';
      logAdminAction(db, {
        adminId: reviewerId,
        action: actionName,
        entityType: 'assessment_session',
        entityId: sessionId,
        before: existingReview ? { decision: existingReview.decision, note: existingReview.note } : null,
        after: { decision, notes: notes.trim(), invalidateScore },
        reason: notes.trim(),
        req,
      });

      db.exec('COMMIT;');
    } catch (err) {
      try { db.exec('ROLLBACK;'); } catch {}
      throw err;
    }

    return {
      success: true,
      sessionId,
      decision,
      isOverride,
      scoreInvalidated: Boolean(decision === 'violation' && invalidateScore),
      reviewedAt: now,
    };
  }

  /**
   * Recompute risk score for a session on demand.
   */
  static recomputeRisk(sessionId, adminId, req = null) {
    const db = initDb();
    const updated = IntegrityRiskService.computeAndSave(sessionId, db);

    logAdminAction(db, {
      adminId,
      action: 'integrity.recompute',
      entityType: 'assessment_session',
      entityId: sessionId,
      before: null,
      after: { score: updated.score, band: updated.band },
      reason: 'Manual risk score recalculation requested',
      req,
    });

    return updated;
  }

  /**
   * Get aggregate integrity metrics, band distributions, and trends.
   */
  static getStats() {
    const db = initDb();

    // 1. Unreviewed high risk sessions count
    const unreviewedHighRow = db.prepare(`
      SELECT COUNT(DISTINCT s.id) as cnt
      FROM assessment_sessions s
      JOIN integrity_risk_scores irs ON s.id = irs.session_id
      LEFT JOIN integrity_reviews ir ON s.id = ir.session_id
      WHERE s.status IN ('graded', 'submitted') AND irs.band = 'high' AND ir.id IS NULL
    `).get();
    const unreviewedHighRisk = unreviewedHighRow?.cnt || 0;

    // 2. Total graded sessions and overall flag rate
    const totalRow = db.prepare(`
      SELECT COUNT(*) as total_graded,
             SUM(CASE WHEN irs.band = 'high' THEN 1 ELSE 0 END) as flagged_count
      FROM assessment_sessions s
      LEFT JOIN integrity_risk_scores irs ON s.id = irs.session_id
      WHERE s.status IN ('graded', 'submitted')
    `).get();
    const totalGraded = totalRow?.total_graded || 0;
    const flaggedCount = totalRow?.flagged_count || 0;
    const flagRatePct = totalGraded > 0 ? Math.round((flaggedCount / totalGraded) * 1000) / 10 : 0;

    // 3. Band distribution
    const bandRows = db.prepare(`
      SELECT band, COUNT(*) as count
      FROM integrity_risk_scores
      GROUP BY band
    `).all();
    const bandDistribution = { low: 0, medium: 0, high: 0 };
    for (const b of bandRows) {
      if (b.band) bandDistribution[b.band] = b.count;
    }

    // 4. Average review turnaround time in hours
    const turnaroundRow = db.prepare(`
      SELECT AVG((strftime('%s', ir.created_at) - strftime('%s', s.submitted_at)) / 3600.0) as avg_hours
      FROM integrity_reviews ir
      JOIN assessment_sessions s ON ir.session_id = s.id
      WHERE s.submitted_at IS NOT NULL AND ir.created_at >= s.submitted_at
    `).get();
    const avgReviewHours = turnaroundRow?.avg_hours ? Math.round(Number(turnaroundRow.avg_hours) * 10) / 10 : 1.5;

    // 5. Overturn rate (admin overrides vs total reviews)
    const totalReviewsRow = db.prepare(`SELECT COUNT(*) as cnt FROM integrity_reviews`).get();
    const overrideAuditRow = db.prepare(`SELECT COUNT(*) as cnt FROM admin_audit_log WHERE action = 'integrity.override'`).get();
    const totalReviews = totalReviewsRow?.cnt || 0;
    const overrides = overrideAuditRow?.cnt || 0;
    const overturnRate = totalReviews > 0 ? Math.round((overrides / totalReviews) * 1000) / 10 : 0;

    // 6. Flags per day for the last 14 days
    const flagsPerDay = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dateStr = d.toISOString().slice(0, 10);
      const row = db.prepare(`
        SELECT COUNT(*) as cnt
        FROM integrity_risk_scores irs
        JOIN assessment_sessions s ON irs.session_id = s.id
        WHERE irs.band = 'high' AND s.submitted_at LIKE ?
      `).get(`${dateStr}%`);
      flagsPerDay.push({ date: dateStr, count: row?.cnt || 0 });
    }

    // 7. Top 10 questions by flag rate
    const topQuestions = db.prepare(`
      SELECT aq.id, aq.prompt as title,
             COUNT(DISTINCT s.id) as total_sessions,
             SUM(CASE WHEN irs.band = 'high' THEN 1 ELSE 0 END) as flagged_sessions
      FROM assessment_questions aq
      JOIN submission_snapshots sn ON aq.id = sn.question_id
      JOIN assessment_sessions s ON sn.session_id = s.id
      LEFT JOIN integrity_risk_scores irs ON s.id = irs.session_id
      WHERE s.status IN ('graded', 'submitted')
      GROUP BY aq.id
      HAVING total_sessions >= 1
      ORDER BY flagged_sessions DESC, total_sessions DESC
      LIMIT 10
    `).all().map(q => ({
      id: q.id,
      title: q.title ? (q.title.length > 50 ? q.title.slice(0, 50) + '...' : q.title) : 'Practical Challenge',
      totalSessions: q.total_sessions,
      flaggedSessions: q.flagged_sessions,
      flagRatePct: q.total_sessions > 0 ? Math.round((q.flagged_sessions / q.total_sessions) * 100) : 0,
    }));

    return {
      unreviewedHighRisk,
      totalGraded,
      flaggedCount,
      flagRatePct,
      avgReviewHours,
      overturnRate,
      bandDistribution,
      flagsPerDay,
      topQuestions,
    };
  }
}
