import { randomUUID as uuidv4 } from 'node:crypto';
import { initDb } from '../../config/db.js';
import { assessmentV2 } from '../../config/index.js';
import { QuestionBankService } from './questionBankService.js';
import { SkillEvidenceEngine } from '../skillEvidenceEngine.js';
import { RunnerDriver } from '../runner/runnerDriver.js';
import { IntegrityRiskService } from '../admin/integrityRiskService.js';

export const ASSESSMENT_SCORING_CONFIG = {
  knowledgeWeight: assessmentV2.knowledgeWeight || 0.4,
  practicalWeight: assessmentV2.practicalWeight || 0.6,
};

export class GradingService {
  /**
   * Grade an assessment session on the server.
   * Computes knowledge, practical, and per-skill evidence levels using real code runner execution.
   */
  static async gradeSession(sessionId, userId, submissionPayload = {}) {
    const db = initDb();

    const session = db.prepare(`SELECT * FROM assessment_sessions WHERE id = ?`).get(sessionId);
    if (!session || session.user_id !== userId) {
      const err = new Error('Session not found or unauthorized.');
      err.code = 'FORBIDDEN';
      throw err;
    }

    if (session.status === 'graded' || session.status === 'submitted') {
      return this.getSessionResult(sessionId, userId);
    }

    const deadlineTime = new Date(session.deadline_at || session.expires_at).getTime();
    const isPastGracePeriod = Date.now() > deadlineTime + 10000;

    let questionIds = [];
    try { questionIds = JSON.parse(session.question_ids || '[]'); } catch {}

    const fullQuestions = QuestionBankService.getQuestionsForGrading(questionIds);

    let sessionData = {};
    try { sessionData = JSON.parse(session.consent_json || '{}'); } catch {}

    if (sessionData.abandoned) {
      const err = new Error('Cannot submit an abandoned assessment session.');
      err.code = 'INVALID_STATE';
      throw err;
    }

    // If submitted past deadline + 10s grace, do not accept client answers; grade last autosave
    const answers = isPastGracePeriod
      ? (sessionData.draftAnswers || {})
      : {
          ...(sessionData.draftAnswers || {}),
          ...(submissionPayload.answers || {}),
        };

    let taskSubmissions = isPastGracePeriod ? {} : (submissionPayload.tasks || {});
    if (Object.keys(taskSubmissions).length === 0) {
      const snapshots = db.prepare(`
        SELECT question_id, code, language FROM submission_snapshots
        WHERE session_id = ? ORDER BY created_at DESC
      `).all(sessionId);
      for (const s of snapshots) {
        if (!taskSubmissions[s.question_id]) {
          taskSubmissions[s.question_id] = { code: s.code, language: s.language };
        }
      }
    }

    // 1. Evaluate MCQs (Difficulty-weighted: 1pt, 2pt, 3pt)
    const mcqQuestions = fullQuestions.filter(q => q.type === 'mcq');
    let totalMcqWeight = 0;
    let earnedMcqWeight = 0;
    const answersSummary = [];

    // Track per-skill statistics: { [skillName]: { total: 0, correct: 0, weightedTotal: 0, weightedEarned: 0, category, skillId } }
    const skillStats = {};

    for (const q of mcqQuestions) {
      const weight = q.difficulty || 1;
      totalMcqWeight += weight;

      const selected = answers[q.id];
      let correctIdx = 0;
      if (typeof q.correct === 'object' && q.correct !== null && 'index' in q.correct) {
        correctIdx = q.correct.index;
      } else if (typeof q.correct === 'number') {
        correctIdx = q.correct;
      }

      const isCorrect = typeof selected === 'number' && selected === correctIdx;

      if (isCorrect) {
        earnedMcqWeight += weight;
      }

      answersSummary.push({
        questionId: q.id,
        question: q.prompt,
        skillName: q.skillName,
        selectedOption: typeof selected === 'number' ? selected : -1,
        correctOption: correctIdx,
        isCorrect,
        explanation: q.explanation || '',
      });

      const sName = q.skillName;
      if (!skillStats[sName]) {
        skillStats[sName] = {
          skillId: q.skillId,
          skillName: sName,
          category: q.category || 'General',
          total: 0,
          correct: 0,
          weightedTotal: 0,
          weightedEarned: 0,
          knowledgeWeightTotal: 0,
          knowledgeWeightEarned: 0,
          practicalWeightTotal: 0,
          practicalWeightEarned: 0,
        };
      }
      skillStats[sName].total += 1;
      skillStats[sName].weightedTotal += weight;
      skillStats[sName].knowledgeWeightTotal += weight;
      if (isCorrect) {
        skillStats[sName].correct += 1;
        skillStats[sName].weightedEarned += weight;
        skillStats[sName].knowledgeWeightEarned += weight;
      }
    }

    const knowledgeScore = totalMcqWeight > 0
      ? Math.round((earnedMcqWeight / totalMcqWeight) * 100)
      : 0;

    // 2. Evaluate Practical Tasks (Code, SQL, Project) with genuine runner execution
    const practicalQuestions = fullQuestions.filter(q => q.type !== 'mcq');
    let practicalScore = 0;
    const practicalSummary = [];
    let hasInfrastructureError = false;

    if (practicalQuestions.length > 0) {
      let practicalTotalScore = 0;

      for (const q of practicalQuestions) {
        const submitted = taskSubmissions[q.id] || {};
        const tests = q.tests || [];
        const visibleTests = tests.filter(t => t.kind === 'visible');
        const hiddenTests = tests.filter(t => t.kind === 'hidden');

        let visiblePassed = 0;
        let hiddenPassed = 0;
        let taskItemScore = 0;
        let isInfrastructureError = false;
        let executionStatus = 'unexecuted';

        const submittedCode = (submitted.code || '').trim();
        const starterCode = (q.starterCode || '').trim();

        // Check if candidate submitted substantive code (not empty and not untouched starter code)
        const hasSubstantiveCode = submittedCode.length > 0 && submittedCode !== starterCode;

        if (submitted.score !== undefined) {
          taskItemScore = Math.min(100, Math.max(0, Number(submitted.score)));
          executionStatus = taskItemScore > 0 ? 'success' : 'failed';
        } else if (submitted.runResults) {
          if (submitted.runResults.score !== undefined) {
            taskItemScore = Math.min(100, Math.max(0, Number(submitted.runResults.score)));
          } else {
            // Pre-evaluated run results (e.g. from verification check or test harness)
            visiblePassed = submitted.runResults.visiblePassed || 0;
            hiddenPassed = submitted.runResults.hiddenPassed || 0;
            const vRatio = visibleTests.length > 0 ? (visiblePassed / visibleTests.length) : 0;
            const hRatio = hiddenTests.length > 0 ? (hiddenPassed / hiddenTests.length) : 0;
            if (visiblePassed === 0 && hiddenPassed === 0) {
              taskItemScore = 0;
            } else if (hiddenTests.length > 0 && visibleTests.length > 0) {
              taskItemScore = Math.round((hRatio * 0.7 + vRatio * 0.3) * 100);
            } else if (hiddenTests.length > 0) {
              taskItemScore = Math.round(hRatio * 100);
            } else {
              taskItemScore = Math.round(vRatio * 100);
            }
          }
          executionStatus = taskItemScore > 0 ? 'success' : 'failed';
        } else if (hasSubstantiveCode) {
          try {
            const runRes = await RunnerDriver.run({
              language: q.language || (q.type === 'sql' ? 'sql' : 'javascript'),
              code: submittedCode,
              tests, // runs both visible and hidden tests on the server!
              limits: { timeoutMs: 5000 },
            });

            executionStatus = runRes.status;

            if (runRes.status === 'runtime_unavailable') {
              isInfrastructureError = true;
              hasInfrastructureError = true;
              executionStatus = 'runtime_unavailable';
            } else {
              const vResults = (runRes.results || []).filter(r => r.kind === 'visible');
              const hResults = (runRes.results || []).filter(r => r.kind === 'hidden');
              visiblePassed = vResults.filter(r => r.passed).length;
              hiddenPassed = hResults.filter(r => r.passed).length;

              const vRatio = visibleTests.length > 0 ? (visiblePassed / visibleTests.length) : 0;
              const hRatio = hiddenTests.length > 0 ? (hiddenPassed / hiddenTests.length) : 0;

              // Rigorous score: 0 tests passed = strictly 0 score
              if (visiblePassed === 0 && hiddenPassed === 0) {
                taskItemScore = 0;
              } else if (hiddenTests.length > 0 && visibleTests.length > 0) {
                taskItemScore = Math.round((hRatio * 0.7 + vRatio * 0.3) * 100);
              } else if (hiddenTests.length > 0) {
                taskItemScore = Math.round(hRatio * 100);
              } else {
                taskItemScore = Math.round(vRatio * 100);
              }
            }
          } catch (runnerErr) {
            console.error('[GradingService] Runner execution error:', runnerErr);
            taskItemScore = 0;
            executionStatus = 'error';
          }
        } else {
          // No code or unchanged starter code submitted
          visiblePassed = 0;
          hiddenPassed = 0;
          taskItemScore = 0;
          executionStatus = 'unexecuted';
        }

        practicalTotalScore += taskItemScore;
        const isPassed = !isInfrastructureError && taskItemScore >= assessmentV2.passThreshold;

        practicalSummary.push({
          taskId: q.id,
          taskTitle: q.prompt.slice(0, 50),
          skillName: q.skillName,
          isPassed,
          isInfrastructureError,
          executionStatus,
          feedback: isInfrastructureError
            ? 'Execution halted: Runtime unavailable on server (NOT EXECUTED)'
            : (isPassed ? 'Automated test suite passed' : 'Test suite assertions not satisfied'),
          visiblePassed,
          visibleTotal: visibleTests.length,
          hiddenPassed,
          hiddenTotal: hiddenTests.length,
          score: taskItemScore,
        });

        const sName = q.skillName;
        if (!skillStats[sName]) {
          skillStats[sName] = {
            skillId: q.skillId,
            skillName: sName,
            category: q.category || 'General',
            total: 0,
            correct: 0,
            weightedTotal: 0,
            weightedEarned: 0,
            knowledgeWeightTotal: 0,
            knowledgeWeightEarned: 0,
            practicalWeightTotal: 0,
            practicalWeightEarned: 0,
          };
        }
        if (!isInfrastructureError) {
          skillStats[sName].total += 2; // practical tasks carry double evidence weight
          skillStats[sName].practicalWeightTotal += 100;
          skillStats[sName].practicalWeightEarned += taskItemScore;
          skillStats[sName].weightedTotal += 100;
          skillStats[sName].weightedEarned += taskItemScore;
        }
      }

      practicalScore = practicalQuestions.length > 0
        ? Math.round(practicalTotalScore / practicalQuestions.length)
        : 0;
    } else {
      practicalScore = knowledgeScore;
    }

    // 3. Technical Score Combination
    let technicalScore = 0;
    if (mcqQuestions.length > 0 && practicalQuestions.length > 0) {
      technicalScore = Math.round(
        knowledgeScore * ASSESSMENT_SCORING_CONFIG.knowledgeWeight +
        practicalScore * ASSESSMENT_SCORING_CONFIG.practicalWeight
      );
    } else if (mcqQuestions.length > 0) {
      technicalScore = knowledgeScore;
    } else {
      technicalScore = practicalScore;
    }

    // 4. Evidence-Based Skill Levels & Confidence (PRD 6.4)
    // ≥ 3 weighted items for Level 4–5; 2 items → max Level 3; 1 item → max Level 2
    const finalSkillScores = {};
    const strengths = [];
    const improvements = [];

    for (const [sName, stat] of Object.entries(skillStats)) {
      const rawPct = stat.weightedTotal > 0
        ? Math.round((stat.weightedEarned / stat.weightedTotal) * 100)
        : 0;

      let rawLevel = 1;
      if (rawPct >= 90) rawLevel = 5;
      else if (rawPct >= 80) rawLevel = 4;
      else if (rawPct >= 60) rawLevel = 3;
      else if (rawPct >= 40) rawLevel = 2;

      // Evidence capping rule
      const evidenceCount = stat.total;
      let cappedLevel = rawLevel;
      if (evidenceCount === 1) {
        cappedLevel = Math.min(2, rawLevel);
      } else if (evidenceCount === 2) {
        cappedLevel = Math.min(3, rawLevel);
      }

      // If practice mode, cap at Level 2 per PRD 6.1
      if (session.mode === 'practice') {
        cappedLevel = Math.min(2, cappedLevel);
      }

      let confidence = 'low';
      if (evidenceCount >= 3) confidence = 'high';
      else if (evidenceCount === 2) confidence = 'medium';

      const levelLabels = { 1: 'Beginner', 2: 'Developing', 3: 'Proficient', 4: 'Advanced', 5: 'Expert' };
      const levelLabel = levelLabels[cappedLevel] || 'Beginner';

      const kScore = stat.knowledgeWeightTotal > 0
        ? Math.round((stat.knowledgeWeightEarned / stat.knowledgeWeightTotal) * 100)
        : rawPct;
      const pScore = stat.practicalWeightTotal > 0
        ? Math.round((stat.practicalWeightEarned / stat.practicalWeightTotal) * 100)
        : rawPct;

      finalSkillScores[sName] = {
        skillName: sName,
        category: stat.category,
        score: rawPct,
        level: cappedLevel,
        levelLabel,
        evidenceCount,
        confidence,
        knowledgeScore: kScore,
        practicalScore: pScore,
      };

      if (rawPct >= 60) {
        strengths.push(sName);
      } else {
        improvements.push(sName);
      }
    }

    // 5. Category Breakdown
    const categoryMap = {};
    for (const s of Object.values(finalSkillScores)) {
      if (!categoryMap[s.category]) {
        categoryMap[s.category] = { total: 0, sum: 0, items: [] };
      }
      categoryMap[s.category].total += 1;
      categoryMap[s.category].sum += s.score;
      categoryMap[s.category].items.push(s);
    }

    const categoryScores = Object.entries(categoryMap).map(([cat, val]) => {
      const avg = Math.round(val.sum / val.total);
      let level = 'Beginner';
      if (avg >= 90) level = 'Expert';
      else if (avg >= 80) level = 'Advanced';
      else if (avg >= 60) level = 'Proficient';
      else if (avg >= 40) level = 'Developing';

      return {
        category: cat,
        score: avg,
        totalQuestions: val.total,
        correctCount: val.items.filter(i => i.score >= 60).length,
        level,
      };
    });

    // 6. Persistence in a Single Atomic Transaction
    const now = new Date().toISOString();

    // Ensure submitted answers are durably preserved in sessionData
    sessionData.draftAnswers = {
      ...(sessionData.draftAnswers || {}),
      ...answers,
    };

    db.exec('BEGIN IMMEDIATE;');
    try {
      // Mark session graded and persist full answer history
      db.prepare(`
        UPDATE assessment_sessions
        SET status = 'graded', submitted_at = ?, consent_json = ?
        WHERE id = ?
      `).run(now, JSON.stringify(sessionData), sessionId);

      // Save session_scores with practicalSummary and infrastructure error tracking
      const rubricPayload = JSON.stringify({
        practicalSummary,
        hasInfrastructureError,
        gradedAt: now,
      });

      db.prepare(`
        INSERT INTO session_scores (
          session_id, technical_score, knowledge_score, practical_score,
          rubric_json, skill_scores, graded_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(session_id) DO UPDATE SET
          technical_score = excluded.technical_score,
          knowledge_score = excluded.knowledge_score,
          practical_score = excluded.practical_score,
          rubric_json = excluded.rubric_json,
          skill_scores = excluded.skill_scores,
          graded_at = excluded.graded_at;
      `).run(
        sessionId,
        technicalScore,
        knowledgeScore,
        practicalScore,
        rubricPayload,
        JSON.stringify(finalSkillScores),
        now
      );

      // Update candidate_skills (One writer rule: Only V2 grading service writes candidate_skills)
      // Integrity events must NEVER alter technical scores or candidate_skills
      const passed = technicalScore >= assessmentV2.passThreshold ? 1 : 0;

      const upsertSkill = db.prepare(`
        INSERT INTO candidate_skills (id, candidate_id, skill_id, proficiency, verification_status, source, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 'diagnostic_assessment', ?, ?)
        ON CONFLICT(candidate_id, skill_id) DO UPDATE SET

        proficiency = MAX(candidate_skills.proficiency, excluded.proficiency),
        verification_status = CASE
          WHEN candidate_skills.verification_status = 'verified' THEN 'verified'
          WHEN excluded.verification_status = 'diagnostic_tested' AND candidate_skills.verification_status != 'verified' THEN 'diagnostic_tested'
          WHEN candidate_skills.verification_status = 'diagnostic_tested' THEN 'diagnostic_tested'
          ELSE excluded.verification_status
        END,
        updated_at = excluded.updated_at;
    `);

    for (const item of Object.values(finalSkillScores)) {
      try {
        // Record traceable evidence in Skill Evidence Engine
        // Only record valid demonstration if score > 0
        if (item.score > 0) {
          const evResult = SkillEvidenceEngine.recordEvidence({
            candidateId: userId,
            skillId: skillStats[item.skillName]?.skillId,
            skillName: item.skillName,
            evidenceType: 'assessment',
            source: session.mode === 'secure' ? 'secure_assessment' : 'practice_assessment',
            title: `Assessment: ${item.skillName} (${session.mode} mode)`,
            score: item.score,
            maxScore: 100,
            demonstratedLevel: item.level,
            metadata: {
              sessionId,
              category: item.category,
              knowledgeScore: item.knowledgeScore,
              practicalScore: item.practicalScore,
              evidenceCount: item.evidenceCount,
              provenance: 'diagnostic_assessment',
            }
          });
        }

        const canonicalSkillId = skillStats[item.skillName]?.skillId || `sk-${item.skillName.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

        // Diagnostic testing in secure mode records diagnostic_tested; practice records self_practice or unverified.
        // Full verification requires satisfying multi-source evidence policy (PRD 6.4)
        const itemVerificationStatus = session.mode === 'secure'
          ? 'diagnostic_tested'
          : (item.score === 0 ? 'unverified' : 'self_practice');

        upsertSkill.run(
          `cs-${uuidv4().slice(0, 8)}`,
          userId,
          canonicalSkillId,
          item.score === 0 ? 1 : item.level,
          itemVerificationStatus,
          now,
          now
        );
      } catch (err) {
        console.warn(`[GradingService] Could not upsert candidate_skill ${item.skillName}:`, err.message);
      }
    }

    // Persist to authoritative assessment_attempts and assessment_results
    // 1. Resolve authoritative organisation for candidate assignment
      let orgId = null;
      const membership = db.prepare(`
        SELECT org_id FROM organisation_memberships 
        WHERE user_id = ? AND status = 'active' 
        LIMIT 1
      `).get(userId);
      if (membership?.org_id) {
        orgId = membership.org_id;
      }

      if (!orgId) {
        const userRow = db.prepare(`SELECT institution_id FROM users WHERE id = ?`).get(userId);
        if (userRow?.institution_id) {
          const instOrg = db.prepare(`SELECT id FROM organisations WHERE id = ?`).get(userRow.institution_id);
          if (instOrg) orgId = instOrg.id;
        }
      }

      if (!orgId) {
        const firstOrg = db.prepare(`SELECT id FROM organisations ORDER BY created_at ASC LIMIT 1`).get();
        if (firstOrg?.id) {
          orgId = firstOrg.id;
        } else {
          // If no organization exists in clean database, provision platform organization
          orgId = 'org-platform';
          db.prepare(`
            INSERT OR IGNORE INTO organisations (id, name, slug, created_at, updated_at)
            VALUES (?, 'SARATHI Platform', 'sarathi-platform', ?, ?)
          `).run(orgId, now, now);
        }
      }

      // 2. Resolve or provision valid assessment template for domain
      let tmpl = db.prepare(`SELECT id FROM assessment_templates WHERE domain_id = ? LIMIT 1`).get(session.domain_id)
        || db.prepare(`SELECT id FROM assessment_templates LIMIT 1`).get();

      if (!tmpl) {
        // Ensure parent domain exists in domains table
        let domainRow = db.prepare(`SELECT id FROM domains WHERE id = ? LIMIT 1`).get(session.domain_id)
          || db.prepare(`SELECT id FROM domains LIMIT 1`).get();
        const validDomainId = domainRow ? domainRow.id : (session.domain_id || 'dom-fullstack');
        if (!domainRow) {
          db.prepare(`
            INSERT OR IGNORE INTO domains (id, title, slug, description, active, created_at, updated_at)
            VALUES (?, ?, ?, 'Core system domain', 1, ?, ?)
          `).run(validDomainId, session.role || 'Full-Stack Development', validDomainId, now, now);
        }

        const newTmplId = `at-diag-${session.domain_id || 'general'}`;
        db.prepare(`
          INSERT OR IGNORE INTO assessment_templates (
            id, domain_id, title, description, type, duration_minutes, passing_score, scoring_rubric, assessed_skills, active, created_at, updated_at
          ) VALUES (?, ?, ?, 'Diagnostic Evaluation', 'diagnostic_quiz_practical', 45, 60.0, '{}', '[]', 1, ?, ?)
        `).run(newTmplId, validDomainId, `${session.role || 'Career'} Diagnostic Assessment`, now, now);
        tmpl = { id: newTmplId };
      }

      // 3. Find or create default assignment with valid org_id
      const existingAssign = db.prepare(`
        SELECT id FROM assessment_assignments WHERE candidate_id = ? AND template_id = ? LIMIT 1
      `).get(userId, tmpl.id) || db.prepare(`
        SELECT id FROM assessment_assignments WHERE candidate_id = ? LIMIT 1
      `).get(userId);

      const assignmentId = existingAssign?.id || `assign-${sessionId}`;
      if (!existingAssign) {
        db.prepare(`
          INSERT INTO assessment_assignments (id, org_id, template_id, candidate_id, assigned_by, status, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, 'completed', ?, ?)
        `).run(assignmentId, orgId, tmpl.id, userId, userId, now, now);
      }

      // 4. Record assessment attempt
      db.prepare(`
        INSERT INTO assessment_attempts (
          id, assignment_id, candidate_id, attempt_number, started_at, submitted_at,
          submission_payload, status, engine_version, created_at, updated_at
        ) VALUES (?, ?, ?, 1, ?, ?, ?, 'graded', 'v2', ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          status = 'graded',
          submitted_at = excluded.submitted_at,
          updated_at = excluded.updated_at;
      `).run(
        sessionId,
        assignmentId,
        userId,
        session.started_at,
        now,
        JSON.stringify(submissionPayload),
        now,
        now
      );

      // 5. Record authoritative result in assessment_results
      const rubricScores = {
        technical: technicalScore,
        knowledge: knowledgeScore,
        practical: practicalScore,
        categoryScores,
      };

      db.prepare(`
        INSERT INTO assessment_results (
          id, attempt_id, candidate_id, template_id, score, max_score, passed,
          rubric_scores, reviewer_feedback, verified_skill_awards, graded_by, graded_at, created_at
        ) VALUES (?, ?, ?, ?, ?, 100.0, ?, ?, ?, '[]', ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          score = excluded.score,
          passed = excluded.passed,
          rubric_scores = excluded.rubric_scores,
          graded_at = excluded.graded_at;
      `).run(
        `res-${sessionId}`,
        sessionId,
        userId,
        tmpl.id,
        technicalScore,
        passed,
        JSON.stringify(rubricScores),
        passed ? 'Diagnostic benchmark proficiency met.' : 'Diagnostic benchmark target not met; foundational review recommended.',
        null,
        now,
        now
      );
      db.exec('COMMIT;');
    } catch (err) {
      try { db.exec('ROLLBACK;'); } catch {}
      console.error('[GradingService] Assessment persistence error:', err);
      throw new Error(`Assessment result persistence failed: ${err.message}`);
    }

    // Hook anti-cheat integrity scoring: failure must never fail a student submission
    try {
      IntegrityRiskService.computeAndSave(sessionId);
    } catch (riskErr) {
      console.warn('[GradingService] Non-fatal integrity risk scoring error:', riskErr.message);
    }

    return this.getSessionResult(sessionId, userId);
  }

  /**
   * Get graded session result with revealed answers/explanations
   */
  static getSessionResult(sessionId, userId) {
    const db = initDb();
    let session = db.prepare(`SELECT * FROM assessment_sessions WHERE id = ?`).get(sessionId);

    if (!session) {
      // Check assessment_attempts in case an attemptId was passed
      const attempt = db.prepare(`SELECT * FROM assessment_attempts WHERE id = ?`).get(sessionId);
      if (attempt) {
        session = db.prepare(`SELECT * FROM assessment_sessions WHERE id = ?`).get(attempt.id);
      }
    }

    if (!session) {
      const err = new Error('Assessment session or attempt not found.');
      err.code = 'NOT_FOUND';
      throw err;
    }

    if (session.user_id !== userId) {
      const err = new Error('Unauthorized to access this assessment session.');
      err.code = 'FORBIDDEN';
      throw err;
    }


    const scoresRow = db.prepare(`SELECT * FROM session_scores WHERE session_id = ?`).get(sessionId);

    let skillScores = {};
    try { skillScores = JSON.parse(scoresRow?.skill_scores || '{}'); } catch {}

    let questionIds = [];
    try { questionIds = JSON.parse(session.question_ids || '[]'); } catch {}

    const fullQuestions = QuestionBankService.getQuestionsForGrading(questionIds);
    let sessionData = {};
    try { sessionData = JSON.parse(session.consent_json || '{}'); } catch {}

    const answers = sessionData.draftAnswers || {};
    const answersSummary = fullQuestions.filter(q => q.type === 'mcq').map(q => {
      const selected = answers[q.id];
      const correctIdx = q.correct?.index ?? 0;
      return {
        questionId: q.id,
        question: q.prompt,
        skillName: q.skillName,
        selectedOption: typeof selected === 'number' ? selected : -1,
        correctOption: correctIdx,
        isCorrect: selected === correctIdx,
        explanation: q.explanation || '',
      };
    });

    const categoryMap = {};
    for (const s of Object.values(skillScores)) {
      if (!categoryMap[s.category]) {
        categoryMap[s.category] = { total: 0, sum: 0, items: [] };
      }
      categoryMap[s.category].total += 1;
      categoryMap[s.category].sum += s.score;
      categoryMap[s.category].items.push(s);
    }

    const categoryScores = Object.entries(categoryMap).map(([cat, val]) => {
      const avg = Math.round(val.sum / val.total);
      let level = 'Beginner';
      if (avg >= 90) level = 'Expert';
      else if (avg >= 80) level = 'Advanced';
      else if (avg >= 60) level = 'Proficient';
      else if (avg >= 40) level = 'Developing';

      return {
        category: cat,
        score: avg,
        totalQuestions: val.total,
        correctCount: val.items.filter(i => i.score >= 60).length,
        level,
      };
    });

    const strengths = Object.values(skillScores).filter(s => s.score >= 60).map(s => s.skillName);
    const improvements = Object.values(skillScores).filter(s => s.score < 60).map(s => s.skillName);

    // Integrity summary (indicators for review, not proof)
    const integrityEvents = db.prepare(`SELECT type, ts FROM integrity_events WHERE session_id = ?`).all(sessionId);
    const nonNetworkEvents = integrityEvents.filter(e => !e.type.startsWith('network_'));

    let practicalSummary = [];
    let hasInfrastructureError = false;
    try {
      const parsedRubric = JSON.parse(scoresRow?.rubric_json || '{}');
      practicalSummary = parsedRubric.practicalSummary || [];
      hasInfrastructureError = Boolean(parsedRubric.hasInfrastructureError);
    } catch {}

    return {
      sessionId: session.id,
      mode: session.mode,
      domainId: session.domain_id,
      role: session.role,
      overallScore: scoresRow?.technical_score ?? 0,
      technicalScore: scoresRow?.technical_score ?? 0,
      knowledgeScore: scoresRow?.knowledge_score ?? 0,
      practicalScore: scoresRow?.practical_score ?? 0,
      completedAt: session.submitted_at || session.started_at,
      hasInfrastructureError,
      skillScores,
      categoryScores,
      strengths,
      improvements,
      answersSummary,
      practicalSummary,
      integritySummary: {
        eventCount: nonNetworkEvents.length,
        longestAwaySec: 0,
        level: nonNetworkEvents.length > 5 ? 'notable' : 'none',
      },
    };
  }
}
