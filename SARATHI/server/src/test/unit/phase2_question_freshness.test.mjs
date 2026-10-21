import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { QuestionBankService } from '../../services/assessmentV2/questionBankService.js';
import { SessionService } from '../../services/assessmentV2/sessionService.js';
import { initDb } from '../../config/db.js';

describe('Phase 2: Question Freshness & Controlled Selection Tests', () => {
  const db = initDb();
  const testCandidateId = 'usr-candidate-freshness-test';

  // Ensure test candidate exists
  db.prepare(`
    INSERT OR REPLACE INTO users (id, email, password_hash, role, full_name, status, created_at, updated_at)
    VALUES (?, 'freshness@sarathi.test', 'hash123', 'candidate', 'Freshness Candidate', 'active', datetime('now'), datetime('now'))
  `).run(testCandidateId);

  it('1. Strict Blueprint Compliance: Full scope adheres to target difficulty distribution', () => {
    const questions = QuestionBankService.sampleQuestionsForSession({
      domainId: 'web-dev',
      roleTitle: 'Frontend Engineer',
      scope: 'full',
    });

    assert.equal(questions.length, 12, 'Full assessment must contain exactly 12 questions');
    const mcqs = questions.filter(q => q.type === 'mcq');
    const code = questions.filter(q => q.type === 'code');
    const sql = questions.filter(q => q.type === 'sql');
    const project = questions.filter(q => q.type === 'project');

    assert.equal(mcqs.length, 8, 'Must have 8 MCQs');
    assert.equal(code.length, 2, 'Must have 2 Coding questions');
    assert.equal(sql.length, 1, 'Must have 1 SQL question');
    assert.equal(project.length, 1, 'Must have 1 Project question');

    // MCQ difficulty distribution: 2 easy (1), 4 medium (2), 2 hard (3)
    const easyMcqs = mcqs.filter(q => q.difficulty === 1);
    const medMcqs = mcqs.filter(q => q.difficulty === 2);
    const hardMcqs = mcqs.filter(q => q.difficulty === 3);

    assert.equal(easyMcqs.length, 2, 'Must have exactly 2 easy MCQs');
    assert.equal(medMcqs.length, 4, 'Must have exactly 4 medium MCQs');
    assert.equal(hardMcqs.length, 2, 'Must have exactly 2 hard MCQs');

    // Code difficulty distribution: 1 easy (1), 1 medium (2)
    assert.equal(code.filter(q => q.difficulty === 1).length, 1, 'Must have 1 easy code challenge');
    assert.equal(code.filter(q => q.difficulty >= 2).length, 1, 'Must have 1 medium code challenge');
  });

  it('2. Controlled Overlap Policy: Consecutive attempts receive fresh questions with minimal overlap', () => {
    // Attempt 1
    const attempt1 = QuestionBankService.sampleQuestionsForSession({
      domainId: 'web-dev',
      roleTitle: 'Frontend Engineer',
      scope: 'full',
      seed: 1001,
      previousQuestionIds: [],
    });

    const attempt1Ids = attempt1.map(q => q.id);

    // Attempt 2 (retake with attempt 1's questions passed)
    const attempt2 = QuestionBankService.sampleQuestionsForSession({
      domainId: 'web-dev',
      roleTitle: 'Frontend Engineer',
      scope: 'full',
      seed: 1002,
      previousQuestionIds: attempt1Ids,
    });

    const attempt2Ids = attempt2.map(q => q.id);

    const attempt1Mcqs = attempt1.filter(q => q.type === 'mcq').map(q => q.id);
    const attempt2Mcqs = attempt2.filter(q => q.type === 'mcq').map(q => q.id);
    const mcqOverlap = attempt2Mcqs.filter(id => attempt1Mcqs.includes(id));

    // Bank has 20 MCQs for web-dev, so Attempt 2 should have 0 overlapping MCQs
    assert.equal(mcqOverlap.length, 0, 'Consecutive retake must have 0% MCQ overlap when bank has sufficient items');

    // SQL questions: bank has 2 questions, Attempt 2 should pick the other SQL question
    const attempt1Sql = attempt1.find(q => q.type === 'sql').id;
    const attempt2Sql = attempt2.find(q => q.type === 'sql').id;
    assert.notEqual(attempt1Sql, attempt2Sql, 'Consecutive retake must alternate SQL questions');

    // Medium coding question: should differ
    const attempt1MedCode = attempt1.find(q => q.type === 'code' && q.difficulty >= 2).id;
    const attempt2MedCode = attempt2.find(q => q.type === 'code' && q.difficulty >= 2).id;
    assert.notEqual(attempt1MedCode, attempt2MedCode, 'Consecutive retake must alternate medium code challenges');

    // Overall overlap must be <= 25% (only small-bank fallback items repeat, like the single project)
    const totalOverlap = attempt2Ids.filter(id => attempt1Ids.includes(id));
    const overlapRatio = totalOverlap.length / attempt2Ids.length;
    assert.ok(overlapRatio <= 0.25, `Overlap ratio (${overlapRatio}) must not exceed 25%`);
  });

  it('3. Audit Metadata Generation: Seed, strategy, blueprint, and question versions are recorded', () => {
    const questions = QuestionBankService.sampleQuestionsForSession({
      domainId: 'web-dev',
      roleTitle: 'Frontend Engineer',
      scope: 'full',
      seed: 4242,
      previousQuestionIds: ['q-web-mcq-01'],
    });

    const audit = questions.audit;
    assert.ok(audit, 'Audit metadata must be present');
    assert.equal(audit.seed, 4242, 'Seed must match provided seed');
    assert.equal(audit.strategy, 'seeded_stratified_blueprint_v1', 'Strategy identifier must be recorded');
    assert.equal(audit.scope, 'full', 'Scope must be recorded');
    assert.equal(audit.blueprint.counts.total, 12, 'Total blueprint count must be 12');
    assert.ok(audit.questionVersions, 'Question versions map must be present');
    assert.ok(Object.keys(audit.questionVersions).length >= 12, 'Must record version for every selected question');
  });

  it('4. In-Progress Session Invariance: Refresh preserves exact question IDs, order, and draft answers', () => {
    // Clear any previous sessions for testCandidateId
    db.prepare(`DELETE FROM assessment_sessions WHERE user_id = ?`).run(testCandidateId);

    const session = SessionService.createSession({
      userId: testCandidateId,
      mode: 'practice',
      domainId: 'web-dev',
      role: 'Frontend Engineer',
      scope: 'full',
    });

    const initialQuestionIds = session.questions.map(q => q.id);

    // Save a draft answer
    SessionService.saveAnswers(session.sessionId, testCandidateId, {
      [initialQuestionIds[0]]: { selectedOption: 2 },
    });

    // Simulate page refresh by fetching session directly
    const refreshed = SessionService.getSession(session.sessionId, testCandidateId);
    const refreshedQuestionIds = refreshed.questions.map(q => q.id);

    assert.deepEqual(refreshedQuestionIds, initialQuestionIds, 'Refreshed session must preserve exact question IDs in original order');
    assert.equal(refreshed.draftAnswers[initialQuestionIds[0]]?.selectedOption, 2, 'Draft answer must persist across refresh');

    // Calling getActiveSession should also return the identical resumed session
    const active = SessionService.getActiveSession(testCandidateId, 'web-dev');
    assert.equal(active.sessionId, session.sessionId, 'Active session must match current session ID');
    assert.deepEqual(active.questions.map(q => q.id), initialQuestionIds, 'Active session must preserve exact question order');
  });

  it('5. New Deliberate Attempt: Retake creates new attempt ID with fresh question set, leaving previous attempt intact', () => {
    // Complete previous session
    const oldSession = SessionService.getActiveSession(testCandidateId, 'web-dev');
    assert.ok(oldSession, 'Must have active session from previous test');

    db.prepare(`UPDATE assessment_sessions SET status = 'graded' WHERE id = ?`).run(oldSession.sessionId);

    // Create a new session (retake)
    const newSession = SessionService.createSession({
      userId: testCandidateId,
      mode: 'practice',
      domainId: 'web-dev',
      role: 'Frontend Engineer',
      scope: 'full',
    });

    assert.notEqual(newSession.sessionId, oldSession.sessionId, 'New deliberate attempt must have a distinct session ID');
    const oldQuestionIds = oldSession.questions.map(q => q.id);
    const newQuestionIds = newSession.questions.map(q => q.id);

    // Questions must differ according to overlap policy
    const overlapping = newQuestionIds.filter(id => oldQuestionIds.includes(id));
    assert.ok(overlapping.length < newQuestionIds.length, 'New session must have fresh questions');

    // Verify old session in DB is unchanged
    const oldFromDb = SessionService.getSession(oldSession.sessionId, testCandidateId);
    assert.equal(oldFromDb.status, 'graded', 'Old session status must remain graded');
    assert.deepEqual(oldFromDb.questions.map(q => q.id), oldQuestionIds, 'Old session question IDs must remain unchanged');
  });
});
