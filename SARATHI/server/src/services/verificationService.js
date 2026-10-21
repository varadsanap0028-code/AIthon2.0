import { randomUUID as uuidv4 } from 'node:crypto';
import { repository } from '../data/repository.js';

export const verificationService = {
  /**
   * Retrieves all pending evidence submissions for recruiter/assessor review.
   */
  getPendingVerifications(orgId = null, { domainId, skillId, limit = 50, offset = 0 } = {}) {
    let sql = `
      SELECT se.*, s.name as skill_name, s.category as skill_category,
             d.title as domain_title, d.badge_color,
             u.full_name as candidate_name, u.email as candidate_email, u.avatar_url as candidate_avatar,
             cp.target_role, cp.experience_years
      FROM skill_evidence se
      JOIN skills s ON s.id = se.skill_id
      JOIN domains d ON d.id = s.domain_id
      JOIN users u ON u.id = se.candidate_id
      JOIN candidate_profiles cp ON cp.id = u.id
      WHERE se.verification_status IN ('pending_review', 'verification_pending')
    `;
    const params = [];

    if (domainId) {
      sql += ' AND s.domain_id = ?';
      params.push(domainId);
    }
    if (skillId) {
      sql += ' AND se.skill_id = ?';
      params.push(skillId);
    }

    sql += ' ORDER BY se.created_at ASC LIMIT ? OFFSET ?;';
    params.push(Number(limit), Number(offset));

    const rows = repository.query(sql, params);
    return rows.map(r => ({
      ...r,
      metadata: JSON.parse(r.metadata || '{}'),
    }));
  },

  /**
   * Records an official verification decision on submitted skill evidence.
   */
  submitReview({
    evidenceId,
    reviewerId,
    decision, // 'verified' or 'rejected'
    decisionRationale,
    rubricEvaluations = {},
    awardedProficiency = null,
  }) {
    if (!['verified', 'rejected'].includes(decision)) {
      throw new Error('Decision must be either verified or rejected');
    }
    if (!decisionRationale || decisionRationale.trim().length < 10) {
      throw new Error('A detailed decision rationale of at least 10 characters is mandatory');
    }

    const evidence = repository.queryOne(
      'SELECT * FROM skill_evidence WHERE id = ?;',
      [evidenceId]
    );
    if (!evidence) {
      throw new Error('Evidence item not found');
    }

    const now = new Date().toISOString();
    const reviewId = `vr-${uuidv4().slice(0, 8)}`;

    return repository.transaction((repo) => {
      // 1. Insert immutable verification review audit record
      repo.execute(
        `INSERT INTO verification_reviews (
          id, evidence_id, reviewer_id, previous_status, new_status,
          decision_rationale, rubric_evaluations, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          reviewId,
          evidenceId,
          reviewerId,
          evidence.verification_status,
          decision,
          decisionRationale.trim(),
          JSON.stringify(rubricEvaluations),
          now,
        ]
      );

      // 2. Update skill_evidence record
      repo.execute(
        `UPDATE skill_evidence SET
          verification_status = ?,
          decision_rationale = ?,
          verified_by = ?,
          verified_at = ?,
          updated_at = ?
        WHERE id = ?;`,
        [decision, decisionRationale.trim(), reviewerId, now, now, evidenceId]
      );

      // 3. Update candidate_skills record
      const cSkill = repo.queryOne(
        'SELECT * FROM candidate_skills WHERE candidate_id = ? AND skill_id = ?;',
        [evidence.candidate_id, evidence.skill_id]
      );

      const targetProf = awardedProficiency ? Number(awardedProficiency) : (cSkill?.proficiency || 3);
      const newStatus = decision === 'verified' ? 'verified' : 'verification_rejected';

      if (cSkill) {
        repo.execute(
          `UPDATE candidate_skills SET
            proficiency = ?,
            verification_status = ?,
            last_verified_at = ?,
            verified_by = ?,
            notes = ?,
            updated_at = ?
          WHERE candidate_id = ? AND skill_id = ?;`,
          [
            targetProf,
            newStatus,
            decision === 'verified' ? now : cSkill.last_verified_at,
            decision === 'verified' ? reviewerId : cSkill.verified_by,
            decisionRationale.trim(),
            now,
            evidence.candidate_id,
            evidence.skill_id
          ]
        );
      } else {
        repo.execute(
          `INSERT INTO candidate_skills (
            id, candidate_id, skill_id, proficiency, verification_status,
            source, last_verified_at, verified_by, notes, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, 'evidence_review', ?, ?, ?, ?, ?);`,
          [
            `cs-${uuidv4().slice(0, 8)}`,
            evidence.candidate_id,
            evidence.skill_id,
            targetProf,
            newStatus,
            decision === 'verified' ? now : null,
            decision === 'verified' ? reviewerId : null,
            decisionRationale.trim(),
            now,
            now
          ]
        );
      }

      // Log to audit events
      repo.execute(
        `INSERT INTO audit_events (
          id, actor_id, action, resource_type, resource_id, payload, created_at
        ) VALUES (?, ?, 'evidence.verify', 'skill_evidence', ?, ?, ?);`,
        [
          `ae-${uuidv4().slice(0, 8)}`,
          reviewerId,
          evidenceId,
          JSON.stringify({ decision, skillId: evidence.skill_id, candidateId: evidence.candidate_id }),
          now
        ]
      );

      return {
        success: true,
        reviewId,
        decision,
        verifiedAt: now
      };
    });
  },

  /**
   * Request additional evidence from a candidate for a specific skill.
   */
  requestEvidence({ orgId, recruiterId, candidateId, skillId, message }) {
    const now = new Date().toISOString();
    const id = `req-${uuidv4().slice(0, 8)}`;

    repository.execute(
      `INSERT INTO recruiter_notes (
        id, org_id, candidate_id, author_id, note, is_private, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 0, ?, ?);`,
      [
        id,
        orgId,
        candidateId,
        recruiterId,
        `[Evidence Request] Recruiter requested additional evidence for skill: ${message}`,
        now,
        now,
      ]
    );

    return { success: true, requestId: id, requestedAt: now };
  }
};
