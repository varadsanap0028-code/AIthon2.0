import { randomUUID as uuidv4 } from 'node:crypto';
import { getDb } from '../config/db.js';
import { RoleBenchmarkService } from './roleBenchmarkService.js';
import { SkillEvidenceEngine } from './skillEvidenceEngine.js';

/**
 * Adaptive Skill Assessment Service
 * Dynamically selects diagnostic questions based on role requirements,
 * current candidate skill profile, prior session answers, and evidence gaps.
 * Integrates directly with the Skill Evidence Engine.
 */
export class AdaptiveAssessmentService {
  /**
   * Starts a new adaptive assessment session tailored to target role.
   */
  static startSession({ candidateId, targetRole, maxQuestions = 6 }) {
    if (!candidateId) throw new Error('candidateId is required');

    const db = getDb();
    const benchmark = RoleBenchmarkService.getRoleBenchmark(targetRole);
    const domainId = benchmark.domainId;

    // Get candidate's current competency gaps
    const gapAnalysis = SkillEvidenceEngine.calculateSkillGaps(candidateId, benchmark.roleTitle);

    // Identify target competencies that need evidence (EVIDENCE_NEEDED, PRELIMINARY_GAP, REASSESSMENT_RECOMMENDED)
    const priorityGaps = gapAnalysis.gapItems.filter(
      g => g.gapStatus === 'EVIDENCE_NEEDED' || g.gapStatus === 'PRELIMINARY_GAP' || g.gapStatus === 'REASSESSMENT_RECOMMENDED'
    );

    const targetSkillIds = priorityGaps.length > 0
      ? priorityGaps.map(g => g.skillId)
      : benchmark.requiredSkills.map(r => r.skillId);

    const sessionId = `asess-${uuidv4().slice(0, 8)}`;
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 45 * 60 * 1000).toISOString(); // 45 min deadline

    const sessionState = {
      targetRole: benchmark.roleTitle,
      domainId,
      maxQuestions,
      questionsAsked: [],
      answersRecorded: [],
      targetSkillIds,
      currentSkillIndex: 0,
      currentDifficulty: 1,
      isFinished: false,
      score: 0
    };

    db.prepare(`
      INSERT INTO assessment_sessions (
        id, user_id, mode, domain_id, role, question_ids, bank_version,
        status, started_at, expires_at, deadline_at, save_version,
        consent_json, accommodation_json, engine_version
      ) VALUES (?, ?, 'practice', ?, ?, '[]', 1, 'in_progress', ?, ?, ?, 1, ?, '{}', 'adaptive-v1')
    `).run(
      sessionId,
      candidateId,
      domainId,
      benchmark.roleTitle,
      now,
      expiresAt,
      expiresAt,
      JSON.stringify(sessionState)
    );

    // Get the first adaptive question
    const firstQuestion = this.getNextQuestion(sessionId, candidateId);

    return {
      sessionId,
      targetRole: benchmark.roleTitle,
      domainTitle: benchmark.domainTitle,
      totalBudget: maxQuestions,
      currentQuestionIndex: 1,
      question: firstQuestion
    };
  }

  /**
   * Selects the next adaptive question based on previous answers and remaining gaps.
   */
  static getNextQuestion(sessionId, candidateId) {
    const db = getDb();

    const sessionRow = db.prepare('SELECT * FROM assessment_sessions WHERE id = ?').get(sessionId);
    if (!sessionRow) throw new Error('Session not found');
    if (sessionRow.user_id !== candidateId) throw new Error('Unauthorized session access');

    let state = {};
    try { state = JSON.parse(sessionRow.consent_json || '{}'); } catch {}

    if (state.isFinished || (state.questionsAsked && state.questionsAsked.length >= state.maxQuestions)) {
      return null;
    }

    const askedSet = new Set(state.questionsAsked || []);
    const domainId = sessionRow.domain_id;

    // Fetch active questions for domain
    const candidateQuestions = db.prepare(`
      SELECT q.id, q.skill_id, s.name as skill_name, s.category, q.type, q.difficulty, q.prompt, q.options, q.starter_code, q.language
      FROM assessment_questions q
      LEFT JOIN skills s ON q.skill_id = s.id
      WHERE q.domain_id = ? AND q.status = 'active'
    `).all(domainId);

    if (candidateQuestions.length === 0) {
      throw new Error(`No assessment questions found for domain: ${domainId}`);
    }

    // Filter out already asked questions
    const unasked = candidateQuestions.filter(q => !askedSet.has(q.id));
    if (unasked.length === 0) {
      return null; // Exhausted question bank
    }

    // Determine target competency and desired difficulty
    const targetSkillId = state.targetSkillIds && state.targetSkillIds[state.currentSkillIndex % state.targetSkillIds.length];
    const desiredDifficulty = state.currentDifficulty || 1;

    // Best match: matches target skill and desired difficulty
    let selected = unasked.find(q => q.skill_id === targetSkillId && q.difficulty === desiredDifficulty);

    // Fallback 1: matches target skill at any difficulty
    if (!selected) {
      selected = unasked.find(q => q.skill_id === targetSkillId);
    }

    // Fallback 2: matches desired difficulty
    if (!selected) {
      selected = unasked.find(q => q.difficulty === desiredDifficulty);
    }

    // Fallback 3: first available unasked question
    if (!selected) {
      selected = unasked[0];
    }

    // Sanitize question for client (options without leaking correct answer index)
    let parsedOptions = [];
    try { parsedOptions = JSON.parse(selected.options || '[]'); } catch {}

    return {
      id: selected.id,
      skillId: selected.skill_id,
      skillName: selected.skill_name || selected.skill_id,
      category: selected.category || 'General',
      type: selected.type,
      difficulty: selected.difficulty,
      prompt: selected.prompt,
      options: selected.type === 'mcq' ? parsedOptions : undefined,
      starterCode: selected.starter_code || undefined,
      language: selected.language || undefined,
      questionNumber: (state.questionsAsked?.length || 0) + 1,
      totalBudget: state.maxQuestions
    };
  }

  /**
   * Evaluates submitted answer, updates adaptive state (difficulty, next target),
   * records intermediate evidence, and determines next question or completion.
   */
  static submitAnswer({ sessionId, candidateId, questionId, selectedOptionIndex, codeAnswer }) {
    const db = getDb();

    const sessionRow = db.prepare('SELECT * FROM assessment_sessions WHERE id = ?').get(sessionId);
    if (!sessionRow) throw new Error('Session not found');
    if (sessionRow.user_id !== candidateId) throw new Error('Unauthorized session access');

    let state = {};
    try { state = JSON.parse(sessionRow.consent_json || '{}'); } catch {}

    if (state.isFinished || sessionRow.status === 'graded') {
      throw new Error('Assessment session has already been completed');
    }

    const alreadyAnswered = (state.answersRecorded || []).find(a => a.questionId === questionId);
    if (alreadyAnswered) {
      return {
        isCorrect: alreadyAnswered.isCorrect,
        explanation: alreadyAnswered.explanation,
        isFinished: false,
        nextQuestion: this.getNextQuestion(sessionId, candidateId),
        alreadySubmitted: true
      };
    }

    // Retrieve question details with correct answers
    const question = db.prepare(`
      SELECT q.*, s.name as skill_name, s.category
      FROM assessment_questions q
      LEFT JOIN skills s ON q.skill_id = s.id
      WHERE q.id = ?
    `).get(questionId);

    if (!question) throw new Error('Question not found');

    let isCorrect = false;
    let earnedScore = 0;
    const maxScore = 100;

    if (question.type === 'mcq') {
      let correctObj = {};
      try { correctObj = JSON.parse(question.correct || '{}'); } catch {}
      const correctIdx = correctObj.index ?? 0;
      isCorrect = selectedOptionIndex === correctIdx;
      earnedScore = isCorrect ? 100 : 0;
    } else {
      // Practical / code task - if code provided and non-empty
      const hasCode = codeAnswer && codeAnswer.trim().length > 10;
      isCorrect = Boolean(hasCode);
      earnedScore = isCorrect ? 85 : 0;
    }

    // Adaptive policy:
    // If correct: increase difficulty or advance to next target skill
    // If incorrect: decrease difficulty or probe prerequisite
    let nextDifficulty = state.currentDifficulty || 1;
    if (isCorrect) {
      nextDifficulty = Math.min(3, nextDifficulty + 1);
    } else {
      nextDifficulty = Math.max(1, nextDifficulty - 1);
    }

    const nextSkillIndex = (state.currentSkillIndex || 0) + 1;
    const questionsAsked = [...(state.questionsAsked || []), questionId];
    const answersRecorded = [
      ...(state.answersRecorded || []),
      {
        questionId,
        skillId: question.skill_id,
        skillName: question.skill_name || question.skill_id,
        category: question.category,
        difficulty: question.difficulty,
        isCorrect,
        earnedScore,
        explanation: question.explanation || ''
      }
    ];

    const isFinished = questionsAsked.length >= (state.maxQuestions || 6);

    const updatedState = {
      ...state,
      questionsAsked,
      answersRecorded,
      currentSkillIndex: nextSkillIndex,
      currentDifficulty: nextDifficulty,
      isFinished
    };

    // Save updated session state
    db.prepare(`
      UPDATE assessment_sessions
      SET consent_json = ?, question_ids = ?
      WHERE id = ?
    `).run(
      JSON.stringify(updatedState),
      JSON.stringify(questionsAsked),
      sessionId
    );

    // Record evidence item for this answered question
    SkillEvidenceEngine.recordEvidence({
      candidateId,
      skillId: question.skill_id,
      skillName: question.skill_name,
      evidenceType: 'adaptive_assessment',
      source: 'adaptive_diagnostic',
      title: `Adaptive Diagnostic: ${question.prompt.slice(0, 40)}...`,
      score: earnedScore,
      maxScore,
      demonstratedLevel: isCorrect ? Math.min(5, question.difficulty + 1) : 1,
      metadata: {
        sessionId,
        questionId,
        difficulty: question.difficulty,
        isCorrect
      }
    });

    let nextQuestion = null;
    let finalSummary = null;

    if (!isFinished) {
      nextQuestion = this.getNextQuestion(sessionId, candidateId);
    } else {
      // Mark session submitted and graded
      const now = new Date().toISOString();
      db.prepare(`
        UPDATE assessment_sessions
        SET status = 'graded', submitted_at = ?
        WHERE id = ?
      `).run(now, sessionId);

      const totalCorrect = answersRecorded.filter(a => a.isCorrect).length;
      const overallScore = Math.round((totalCorrect / answersRecorded.length) * 100);

      // Recalculate canonical profile and readiness
      const canonicalProfile = SkillEvidenceEngine.getCanonicalProfile(candidateId, state.targetRole);
      const updatedGaps = SkillEvidenceEngine.calculateSkillGaps(candidateId, state.targetRole);
      const readiness = SkillEvidenceEngine.calculateCareerReadiness(candidateId, state.targetRole);

      finalSummary = {
        sessionId,
        targetRole: state.targetRole,
        totalQuestions: answersRecorded.length,
        totalCorrect,
        overallScore,
        readinessScore: readiness.readinessScore,
        evidenceCoverage: readiness.evidenceCoverage,
        gapsSummary: updatedGaps.metrics,
        answers: answersRecorded
      };
    }

    return {
      isCorrect,
      explanation: question.explanation || '',
      isFinished,
      nextQuestion,
      finalSummary
    };
  }
}
