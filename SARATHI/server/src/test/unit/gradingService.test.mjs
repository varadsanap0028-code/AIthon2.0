import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { initDb } from '../../config/db.js';
import { GradingService } from '../../services/assessmentV2/gradingService.js';
import { SessionService } from '../../services/assessmentV2/sessionService.js';
import { QuestionBankService } from '../../services/assessmentV2/questionBankService.js';
import { seedAssessmentBank } from '../../data/seeds/assessmentSeeder.js';

describe('GradingService Unit Tests', () => {
  const db = initDb();
  const testCandidateId = 'usr-cand-unit-grading';

  before(() => {
    seedAssessmentBank();

    // Seed test candidate
    db.prepare(`
      INSERT OR REPLACE INTO users (id, email, password_hash, full_name, role, created_at, updated_at)
      VALUES (?, 'test-grader@example.com', 'hash', 'Test Grader', 'candidate', datetime('now'), datetime('now'))
    `).run(testCandidateId);

    db.prepare(`
      INSERT OR REPLACE INTO candidate_profiles (id, headline, created_at, updated_at)
      VALUES (?, 'Junior Developer', datetime('now'), datetime('now'))
    `).run(testCandidateId);
  });

  after(() => {
    // Cleanup candidate and test data
    db.prepare(`DELETE FROM assessment_results WHERE candidate_id = ?`).run(testCandidateId);
    db.prepare(`DELETE FROM assessment_attempts WHERE candidate_id = ?`).run(testCandidateId);
    db.prepare(`DELETE FROM assessment_assignments WHERE candidate_id = ?`).run(testCandidateId);
    db.prepare(`DELETE FROM skill_evidence WHERE candidate_id = ?`).run(testCandidateId);
    db.prepare(`DELETE FROM skill_evidence_ledger WHERE candidate_id = ?`).run(testCandidateId);
    db.prepare(`DELETE FROM canonical_skill_profiles WHERE candidate_id = ?`).run(testCandidateId);
    db.prepare(`DELETE FROM assessment_sessions WHERE user_id = ?`).run(testCandidateId);
    db.prepare(`DELETE FROM candidate_skills WHERE candidate_id = ?`).run(testCandidateId);
    db.prepare(`DELETE FROM candidate_profiles WHERE id = ?`).run(testCandidateId);
    db.prepare(`DELETE FROM users WHERE id = ?`).run(testCandidateId);
  });

  it('correctly applies evidence capping and confidence levels', async () => {
    // 1. Create a session in secure mode
    const session = SessionService.createSession({
      userId: testCandidateId,
      mode: 'secure',
      domainId: 'web-dev',
      scope: 'full',
      consent: { agreed: true },
    });

    const fullQuestions = QuestionBankService.getQuestionsForGrading(session.questions.map(q => q.id));

    // Construct answers with 100% correct
    const answers = {};
    for (const q of fullQuestions) {
      if (q.type === 'mcq') {
        answers[q.id] = q.correct?.index ?? 0;
      }
    }

    const tasks = {};
    for (const q of fullQuestions) {
      if (q.type !== 'mcq') {
        tasks[q.id] = {
          code: 'function test() { return true; }',
          runResults: { visiblePassed: 3, hiddenPassed: 5 },
        };
      }
    }

    const graded = await GradingService.gradeSession(session.sessionId, testCandidateId, {
      answers,
      tasks,
    });

    assert.ok(graded.technicalScore > 80, `Technical score should be high, got: ${graded.technicalScore}`);
    assert.ok(graded.knowledgeScore === 100, `Knowledge score should be 100, got: ${graded.knowledgeScore}`);

    // Check skill scores evidence capping
    for (const [skillName, s] of Object.entries(graded.skillScores)) {
      if (s.evidenceCount === 1) {
        assert.ok(s.level <= 2, `Skill ${skillName} with 1 evidence count should be capped at <= 2, got ${s.level}`);
        assert.equal(s.confidence, 'low', `Skill ${skillName} with 1 item should have low confidence`);
      } else if (s.evidenceCount === 2) {
        assert.ok(s.level <= 3, `Skill ${skillName} with 2 evidence count should be capped at <= 3, got ${s.level}`);
        assert.equal(s.confidence, 'medium', `Skill ${skillName} with 2 items should have medium confidence`);
      } else if (s.evidenceCount >= 3) {
        assert.equal(s.confidence, 'high', `Skill ${skillName} with >= 3 items should have high confidence`);
        if (s.score >= 90) {
          assert.equal(s.level, 5, `Skill ${skillName} with >= 3 items and >=90% score should achieve Level 5`);
        }
      }
    }
  });

  it('caps practice mode at level 2 (Developing) regardless of score', async () => {
    const session = SessionService.createSession({
      userId: testCandidateId,
      mode: 'practice',
      domainId: 'web-dev',
      scope: 'quiz_only',
    });

    const fullQuestions = QuestionBankService.getQuestionsForGrading(session.questions.map(q => q.id));

    const answers = {};
    for (const q of fullQuestions) {
      answers[q.id] = q.correct?.index ?? 0;
    }

    const graded = await GradingService.gradeSession(session.sessionId, testCandidateId, {
      answers,
    });

    for (const [skillName, s] of Object.entries(graded.skillScores)) {
      assert.ok(s.level <= 2, `Practice mode must cap skill ${skillName} at <= 2, got ${s.level}`);
    }
  });

  it('preserves existing verified status on candidate_skills', async () => {
    // Manually insert a skill with 'verified' status
    db.prepare(`
      INSERT OR REPLACE INTO candidate_skills (id, candidate_id, skill_id, proficiency, verification_status, source, created_at, updated_at)
      VALUES ('cs-preserve-test', ?, 'sk-typescript', 4, 'verified', 'recruiter_check', datetime('now'), datetime('now'))
    `).run(testCandidateId);

    const session = SessionService.createSession({
      userId: testCandidateId,
      mode: 'secure',
      domainId: 'web-dev',
      scope: 'quiz_only',
      consent: { agreed: true },
    });

    await GradingService.gradeSession(session.sessionId, testCandidateId, {
      answers: {},
    });

    const skillRow = db.prepare(`
      SELECT verification_status, proficiency FROM candidate_skills WHERE candidate_id = ? AND skill_id = 'sk-typescript'
    `).get(testCandidateId);

    assert.equal(skillRow.verification_status, 'verified', 'Verified skill status must never be downgraded');
    assert.equal(skillRow.proficiency, 4, 'Verified proficiency should not be lowered');
  });

  it('is idempotent on duplicate grading requests', async () => {
    const session = SessionService.createSession({
      userId: testCandidateId,
      mode: 'practice',
      domainId: 'web-dev',
      scope: 'quiz_only',
    });

    const firstResult = await GradingService.gradeSession(session.sessionId, testCandidateId, { answers: {} });
    const secondResult = await GradingService.gradeSession(session.sessionId, testCandidateId, { answers: {} });

    assert.equal(firstResult.sessionId, secondResult.sessionId);
    assert.equal(firstResult.technicalScore, secondResult.technicalScore);
  });
});
