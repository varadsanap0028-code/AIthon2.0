import { randomUUID as uuidv4 } from 'node:crypto';
import { repository } from '../data/repository.js';

export const assessmentService = {
  getTemplates({ domainId = null, activeOnly = true } = {}) {
    let sql = `
      SELECT at.*, d.title as domain_title, d.badge_color
      FROM assessment_templates at
      JOIN domains d ON d.id = at.domain_id
      WHERE 1=1
    `;
    const params = [];
    if (activeOnly) {
      sql += ' AND at.active = 1';
    }
    if (domainId) {
      sql += ' AND at.domain_id = ?';
      params.push(domainId);
    }
    sql += ' ORDER BY d.title ASC, at.title ASC;';

    const rows = repository.query(sql, params);
    return rows.map(r => ({
      ...r,
      scoring_rubric: JSON.parse(r.scoring_rubric || '{}'),
      assessed_skills: JSON.parse(r.assessed_skills || '[]'),
    }));
  },

  getTemplateById(templateId) {
    const r = repository.queryOne(
      `SELECT at.*, d.title as domain_title
       FROM assessment_templates at
       JOIN domains d ON d.id = at.domain_id
       WHERE at.id = ?;`,
      [templateId]
    );
    if (!r) return null;
    return {
      ...r,
      scoring_rubric: JSON.parse(r.scoring_rubric || '{}'),
      assessed_skills: JSON.parse(r.assessed_skills || '[]'),
    };
  },

  getAssignments(orgId, { candidateId, jobId, status, limit = 50, offset = 0 } = {}) {
    let sql = `
      SELECT aa.*, at.title as template_title, at.type as assessment_type, at.duration_minutes,
             at.passing_score, d.title as domain_title,
             u.full_name as candidate_name, u.email as candidate_email, u.avatar_url as candidate_avatar,
             j.title as job_title, u_assign.full_name as assigned_by_name,
             ar.score as result_score, ar.passed as result_passed, ar.reviewer_feedback
      FROM assessment_assignments aa
      JOIN assessment_templates at ON at.id = aa.template_id
      JOIN domains d ON d.id = at.domain_id
      JOIN users u ON u.id = aa.candidate_id
      LEFT JOIN jobs j ON j.id = aa.job_id
      LEFT JOIN users u_assign ON u_assign.id = aa.assigned_by
      LEFT JOIN assessment_attempts att ON att.assignment_id = aa.id
      LEFT JOIN assessment_results ar ON ar.attempt_id = att.id
      WHERE aa.org_id = ?
    `;
    const params = [orgId];

    if (candidateId) {
      sql += ' AND aa.candidate_id = ?';
      params.push(candidateId);
    }
    if (jobId) {
      sql += ' AND aa.job_id = ?';
      params.push(jobId);
    }
    if (status && status !== 'all') {
      sql += ' AND aa.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY aa.created_at DESC LIMIT ? OFFSET ?;';
    params.push(Number(limit), Number(offset));

    return repository.query(sql, params);
  },

  assignAssessment({ orgId, templateId, candidateId, jobId = null, assignedBy, deadlineDays = 7 }) {
    const template = this.getTemplateById(templateId);
    if (!template) throw new Error('Assessment template not found');

    const id = `aa-${uuidv4().slice(0, 8)}`;
    const now = new Date();
    const deadline = new Date(now.getTime() + (deadlineDays * 24 * 60 * 60 * 1000)).toISOString();

    repository.execute(
      `INSERT INTO assessment_assignments (
        id, org_id, template_id, candidate_id, job_id, assigned_by,
        deadline_at, status, attempt_count, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'invited', 0, ?, ?);`,
      [
        id, orgId, templateId, candidateId, jobId, assignedBy,
        deadline, now.toISOString(), now.toISOString()
      ]
    );

    // Audit event
    repository.execute(
      `INSERT INTO audit_events (
        id, org_id, actor_id, action, resource_type, resource_id, payload, created_at
      ) VALUES (?, ?, ?, 'assessment.assign', 'assessment_assignments', ?, ?, ?);`,
      [
        `ae-${uuidv4().slice(0, 8)}`,
        orgId,
        assignedBy,
        id,
        JSON.stringify({ templateId, candidateId, jobId }),
        now.toISOString()
      ]
    );

    return {
      success: true,
      assignmentId: id,
      deadlineAt: deadline,
      status: 'invited',
    };
  },

  recordAttemptResult({
    assignmentId,
    candidateId,
    score,
    maxScore = 100,
    rubricScores = {},
    reviewerFeedback = '',
    gradedBy = null
  }) {
    const assignment = repository.queryOne('SELECT * FROM assessment_assignments WHERE id = ?;', [assignmentId]);
    if (!assignment) throw new Error('Assignment not found');

    const template = this.getTemplateById(assignment.template_id);
    const passed = score >= (template?.passing_score || 70) ? 1 : 0;
    const now = new Date().toISOString();

    return repository.transaction((repo) => {
      // 1. Create or update attempt
      const attemptId = `att-${uuidv4().slice(0, 8)}`;
      repo.execute(
        `INSERT INTO assessment_attempts (
          id, assignment_id, candidate_id, attempt_number, started_at,
          submitted_at, submission_payload, status, created_at, updated_at
        ) VALUES (?, ?, ?, 1, ?, ?, '{}', 'graded', ?, ?);`,
        [attemptId, assignmentId, candidateId, now, now, now, now]
      );

      // 2. Insert result
      const resultId = `ar-${uuidv4().slice(0, 8)}`;
      const verifiedSkillAwards = passed ? template.assessed_skills : [];

      repo.execute(
        `INSERT INTO assessment_results (
          id, attempt_id, candidate_id, template_id, score, max_score,
          passed, rubric_scores, reviewer_feedback, verified_skill_awards,
          graded_by, graded_at, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          resultId, attemptId, candidateId, template.id, score, maxScore,
          passed, JSON.stringify(rubricScores), reviewerFeedback,
          JSON.stringify(verifiedSkillAwards), gradedBy, now, now
        ]
      );

      // 3. Update assignment status
      repo.execute(
        'UPDATE assessment_assignments SET status = "completed", attempt_count = 1, updated_at = ? WHERE id = ?;',
        [now, assignmentId]
      );

      // 4. If passed, automatically verify assessed skills
      if (passed && Array.isArray(template.assessed_skills)) {
        for (const skillId of template.assessed_skills) {
          const existing = repo.queryOne(
            'SELECT * FROM candidate_skills WHERE candidate_id = ? AND skill_id = ?;',
            [candidateId, skillId]
          );

          if (existing) {
            repo.execute(
              `UPDATE candidate_skills SET
                proficiency = MAX(proficiency, 4),
                verification_status = 'verified',
                source = 'practical_assessment',
                last_verified_at = ?,
                verified_by = ?,
                updated_at = ?
              WHERE candidate_id = ? AND skill_id = ?;`,
              [now, gradedBy, now, candidateId, skillId]
            );
          } else {
            repo.execute(
              `INSERT INTO candidate_skills (
                id, candidate_id, skill_id, proficiency, verification_status,
                source, last_verified_at, verified_by, notes, created_at, updated_at
              ) VALUES (?, ?, ?, 4, 'verified', 'practical_assessment', ?, ?, 'Passed official technical assessment', ?, ?);`,
              [`cs-${uuidv4().slice(0, 8)}`, candidateId, skillId, now, gradedBy, now, now]
            );
          }
        }
      }

      return {
        success: true,
        resultId,
        score,
        passed: passed === 1,
        verifiedSkillsAwarded: verifiedSkillAwards,
      };
    });
  },

  /**
   * Persists a student diagnostic assessment attempt and result.
   * Updates candidate skills as 'diagnostic_tested' without misrepresenting as recruiter-verified.
   */
  recordStudentAssessment({
    candidateId,
    domainId,
    targetRole,
    overallScore,
    knowledgeScore = null,
    practicalScore = null,
    categoryScores = [],
    skillScores = [],
    strengths = [],
    improvements = []
  }) {
    if (!candidateId) throw new Error('Candidate ID is required');
    const now = new Date().toISOString();

    return repository.transaction((repo) => {
      // 1. Ensure or find assessment template for this domain
      let template = repo.queryOne(
        'SELECT * FROM assessment_templates WHERE domain_id = ? ORDER BY created_at ASC LIMIT 1;',
        [domainId]
      );
      if (!template) {
        const tplId = `at-${uuidv4().slice(0, 8)}`;
        const domain = repo.queryOne('SELECT * FROM domains WHERE id = ?;', [domainId]);
        const domainTitle = domain ? domain.title : (domainId || 'General Technology');
        repo.execute(
          `INSERT INTO assessment_templates (
            id, domain_id, title, description, type, duration_minutes, passing_score, scoring_rubric, assessed_skills, active, created_at, updated_at
          ) VALUES (?, ?, ?, ?, 'diagnostic_quiz_practical', 45, 60.0, '{}', '[]', 1, ?, ?);`,
          [tplId, domainId || 'dom-fullstack', `${domainTitle} Diagnostic Evaluation`, `Comprehensive skills diagnostic for ${domainTitle}`, now, now]
        );
        template = repo.queryOne('SELECT * FROM assessment_templates WHERE id = ?;', [tplId]);
      }

      // 2. Ensure or find a self-initiated assignment for the candidate
      let assignment = repo.queryOne(
        `SELECT * FROM assessment_assignments 
         WHERE candidate_id = ? AND template_id = ?
         ORDER BY created_at DESC LIMIT 1;`,
        [candidateId, template.id]
      );
      if (!assignment) {
        const assignmentId = `aa-self-${uuidv4().slice(0, 8)}`;
        repo.execute(
          `INSERT INTO assessment_assignments (
            id, org_id, template_id, candidate_id, job_id, assigned_by, deadline_at, status, attempt_count, created_at, updated_at
          ) VALUES (?, 'org-demo-1', ?, ?, NULL, ?, NULL, 'completed', 0, ?, ?);`,
          [assignmentId, template.id, candidateId, candidateId, now, now]
        );
        assignment = repo.queryOne('SELECT * FROM assessment_assignments WHERE id = ?;', [assignmentId]);
      }

      // 3. Count prior attempts for accurate attempt numbering
      const priorAttemptsRow = repo.queryOne(
        'SELECT COUNT(*) as count FROM assessment_attempts WHERE assignment_id = ?;',
        [assignment.id]
      );
      const attemptNumber = (priorAttemptsRow?.count || 0) + 1;

      // 4. Create attempt record with payload
      const attemptId = `att-${uuidv4().slice(0, 8)}`;
      const submissionPayload = JSON.stringify({
        targetRole,
        overallScore,
        knowledgeScore,
        practicalScore,
        categoryScores,
        skillScores,
        strengths,
        improvements
      });

      repo.execute(
        `INSERT INTO assessment_attempts (
          id, assignment_id, candidate_id, attempt_number, started_at, submitted_at, submission_payload, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'graded', ?, ?);`,
        [attemptId, assignment.id, candidateId, attemptNumber, now, now, submissionPayload, now, now]
      );

      // 5. Update assignment attempt count & status
      repo.execute(
        "UPDATE assessment_assignments SET attempt_count = ?, status = 'completed', updated_at = ? WHERE id = ?;",
        [attemptNumber, now, assignment.id]
      );

      // 6. Record result
      const resultId = `ar-${uuidv4().slice(0, 8)}`;
      const passed = overallScore >= (template.passing_score || 60) ? 1 : 0;
      const rubricScores = {
        knowledge: knowledgeScore,
        practical: practicalScore,
        categoryScores
      };

      repo.execute(
        `INSERT INTO assessment_results (
          id, attempt_id, candidate_id, template_id, score, max_score, passed, rubric_scores, reviewer_feedback, verified_skill_awards, graded_by, graded_at, created_at
        ) VALUES (?, ?, ?, ?, ?, 100.0, ?, ?, ?, '[]', ?, ?, ?);`,
        [
          resultId,
          attemptId,
          candidateId,
          template.id,
          overallScore,
          passed,
          JSON.stringify(rubricScores),
          passed ? 'Diagnostic benchmarks met.' : 'Target proficiency not met; foundational review recommended.',
          candidateId,
          now,
          now
        ]
      );

      // 7. Update or insert candidate_skills as 'diagnostic_tested' (NOT 'verified')
      if (Array.isArray(skillScores)) {
        for (const item of skillScores) {
          const sName = item.skillName || item.name;
          if (!sName) continue;
          let level = item.demonstratedLevel || 1;
          if (!item.demonstratedLevel && typeof item.score === 'number') {
            if (item.score >= 90) level = 5;
            else if (item.score >= 80) level = 4;
            else if (item.score >= 60) level = 3;
            else if (item.score >= 40) level = 2;
            else level = 1;
          }

          // Resolve skill from skills table or create if not present
          let skillRow = repo.queryOne(
            'SELECT id FROM skills WHERE LOWER(name) = LOWER(?);',
            [sName.trim()]
          );
          if (!skillRow) {
            const newSkillId = `sk-${uuidv4().slice(0, 8)}`;
            repo.execute(
              `INSERT INTO skills (
                id, domain_id, name, description, category, proficiency_scale, accepted_evidence_types, assessment_types, active, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, '1-5', '["github_pr","project_repo","assessment_score"]', '["practical_coding","mcq"]', 1, ?, ?);`,
              [newSkillId, domainId || 'dom-fullstack', sName.trim(), `${sName} assessed skill`, item.category || 'General', now, now]
            );
            skillRow = { id: newSkillId };
          }

          // Check candidate_skills
          const existingCS = repo.queryOne(
            'SELECT * FROM candidate_skills WHERE candidate_id = ? AND skill_id = ?;',
            [candidateId, skillRow.id]
          );

          if (existingCS) {
            // Never overwrite recruiter-verified credential
            const keepStatus = existingCS.verification_status === 'verified' ? 'verified' : 'diagnostic_tested';
            const updatedProf = Math.max(existingCS.proficiency, level);
            repo.execute(
              `UPDATE candidate_skills SET
                proficiency = ?,
                verification_status = ?,
                source = CASE WHEN verification_status = 'verified' THEN source ELSE 'diagnostic_assessment' END,
                last_verified_at = ?,
                updated_at = ?
              WHERE candidate_id = ? AND skill_id = ?;`,
              [updatedProf, keepStatus, now, now, candidateId, skillRow.id]
            );
          } else {
            repo.execute(
              `INSERT INTO candidate_skills (
                id, candidate_id, skill_id, proficiency, verification_status, source, last_verified_at, verified_by, notes, created_at, updated_at
              ) VALUES (?, ?, ?, ?, 'diagnostic_tested', 'diagnostic_assessment', ?, NULL, 'Demonstrated in student diagnostic assessment', ?, ?);`,
              [`cs-${uuidv4().slice(0, 8)}`, candidateId, skillRow.id, level, now, now, now]
            );
          }
        }
      }

      return {
        success: true,
        resultId,
        attemptNumber,
        overallScore,
        passed: passed === 1,
        completedAt: now
      };
    });
  },

  getStudentAssessmentHistory(candidateId) {
    const rows = repository.query(
      `SELECT ar.*, at.title as template_title, at.type as assessment_type,
              d.title as domain_title, d.id as domain_id, att.attempt_number, att.started_at, att.submitted_at,
              att.submission_payload
       FROM assessment_results ar
       JOIN assessment_attempts att ON att.id = ar.attempt_id
       JOIN assessment_templates at ON at.id = ar.template_id
       LEFT JOIN domains d ON d.id = at.domain_id
       WHERE ar.candidate_id = ?
       ORDER BY ar.created_at DESC;`,
      [candidateId]
    );

    return rows.map(r => ({
      ...r,
      rubric_scores: JSON.parse(r.rubric_scores || '{}'),
      submission_payload: JSON.parse(r.submission_payload || '{}')
    }));
  }
};
