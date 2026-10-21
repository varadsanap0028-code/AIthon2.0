import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { initDb, getDb } from '../../config/db.js';
import { authService } from '../../services/authService.js';
import { RoleBenchmarkService } from '../../services/roleBenchmarkService.js';
import { StudentAnalyticsService } from '../../services/studentAnalyticsService.js';
import { SessionService } from '../../services/assessmentV2/sessionService.js';
import { GradingService } from '../../services/assessmentV2/gradingService.js';
import { QuestionBankService } from '../../services/assessmentV2/questionBankService.js';
import { candidateService } from '../../services/candidateService.js';
import { seedAssessmentBank } from '../../data/seeds/assessmentSeeder.js';

describe('Phase 1: New Student Journey End-to-End Integration', () => {
  let db;
  const timestamp = Date.now();
  const testStudentId = `usr-test-p1-${timestamp}`;
  const testEmail = `newstudent-${timestamp}@test.sarathi.ai`;

  before(() => {
    initDb();
    seedAssessmentBank();
    db = getDb();
  });

  test('1. Registration and profile creation persists authoritative target role', async () => {
    const session = await authService.getOrCreateStudentSession({
      id: testStudentId,
      email: testEmail,
      fullName: 'New Student QA',
      institution: 'Sarathi Test Academy',
      targetRole: 'Full-Stack Developer'
    });

    assert.ok(session.token, 'Token must be issued');
    assert.strictEqual(session.user.id, testStudentId);
    assert.strictEqual(session.user.role, 'candidate');

    // Verify row in users table
    const userRow = db.prepare('SELECT id, email, role FROM users WHERE id = ?').get(testStudentId);
    assert.ok(userRow, 'User must exist in SQLite database');
    assert.strictEqual(userRow.email, testEmail);

    // Verify row in candidate_profiles table
    const profileRow = db.prepare('SELECT id, target_role FROM candidate_profiles WHERE id = ?').get(testStudentId);
    assert.ok(profileRow, 'Candidate profile must exist');
    assert.strictEqual(profileRow.target_role, 'Full-Stack Developer');
  });

  test('2. Role benchmark loads canonical competencies for target role', async () => {
    const benchmark = RoleBenchmarkService.getRoleBenchmark('Full-Stack Developer');
    assert.ok(benchmark, 'Benchmark must load for target role');
    assert.strictEqual(benchmark.roleTitle, 'Full-Stack Developer');
    assert.ok(benchmark.requiredSkills && benchmark.requiredSkills.length > 0, 'Benchmark must contain required skills');

    const hasReact = benchmark.requiredSkills.some((s) => s.skillName.toLowerCase().includes('react'));
    assert.ok(hasReact, 'Full-Stack Developer benchmark should include React');
  });

  test('3. Truthful zero-state analytics for new student with zero activity', async () => {
    const analytics = await StudentAnalyticsService.getStudentAnalytics(testStudentId);
    assert.ok(analytics, 'Analytics payload must be generated');

    // Verified zero-state requirements
    assert.strictEqual(analytics.streakDays, 0, 'Streak days must be 0 for new student');
    assert.strictEqual(analytics.totalHoursLearned, 0, 'Total hours learned must be 0');
    assert.strictEqual(analytics.avgAssessmentScore, null, 'Avg assessment score must be null (Not Assessed)');
    assert.strictEqual(analytics.completedAssessmentsCount, 0, 'Completed assessments count must be 0');
    assert.deepStrictEqual(analytics.githubLanguages, [], 'GitHub languages must be empty');
    assert.strictEqual(analytics.applicationFunnel[0].count, 0, 'Applications must be 0');
    analytics.applicationFunnel.forEach(f => assert.strictEqual(f.count, 0, 'All funnel stages must be 0'));
    assert.strictEqual(analytics.readinessTrend.length, 1, 'Readiness trend should have only current period');
    assert.strictEqual(analytics.readinessTrend[0].period, 'Current');
  });

  test('4. Assessment V2 session initialization, adaptive question delivery', async () => {
    const session = SessionService.createSession({
      userId: testStudentId,
      mode: 'practice',
      domainId: 'web-dev',
      role: 'Full-Stack Developer',
      scope: 'full'
    });

    assert.ok(session.sessionId, 'Session ID must be generated');
    assert.ok(session.questions && session.questions.length > 0, 'Questions must be delivered');

    // Confirm session row in assessment_sessions
    const sessionRow = db.prepare('SELECT id, status, domain_id FROM assessment_sessions WHERE id = ?').get(session.sessionId);
    assert.ok(sessionRow, 'Session must exist in assessment_sessions table');
    assert.strictEqual(sessionRow.status, 'in_progress');
  });

  test('5. Assessment V2 grading and database persistence with valid org_id', async () => {
    // Start a fresh session to grade
    const session = SessionService.createSession({
      userId: testStudentId,
      mode: 'practice',
      domainId: 'web-dev',
      role: 'Full-Stack Developer',
      scope: 'full'
    });

    // Prepare answers map with correct answers so student demonstrates proficiency
    const questionIds = session.questions.map((q) => q.id);
    const gradingQuestions = QuestionBankService.getQuestionsForGrading(questionIds);
    const answers = {};
    gradingQuestions.forEach((q) => {
      if (q.type === 'mcq') {
        answers[q.id] = q.correct?.index ?? 0;
      }
    });

    const result = await GradingService.gradeSession(session.sessionId, testStudentId, {
      answers
    });

    assert.ok(result, 'Result should be returned');
    assert.strictEqual(result.sessionId, session.sessionId);
    assert.strictEqual(typeof result.overallScore, 'number');

    // 1. Check assessment_sessions status
    const sessRow = db.prepare('SELECT status FROM assessment_sessions WHERE id = ?').get(session.sessionId);
    assert.strictEqual(sessRow.status, 'graded');

    // 2. Check assessment_assignments has valid non-null org_id referencing organisations
    const assignmentRow = db.prepare(`
      SELECT aa.*, o.name as org_name 
      FROM assessment_assignments aa
      JOIN organisations o ON o.id = aa.org_id
      WHERE aa.candidate_id = ?
    `).get(testStudentId);
    assert.ok(assignmentRow, 'Assignment record must exist with valid organisation reference');
    assert.ok(assignmentRow.org_id, 'org_id must not be empty');

    // 3. Check assessment_attempts has graded status
    const attemptRow = db.prepare('SELECT * FROM assessment_attempts WHERE candidate_id = ?').get(testStudentId);
    assert.ok(attemptRow, 'Attempt record must exist');
    assert.strictEqual(attemptRow.status, 'graded');

    // 4. Check assessment_results has rubric scores and reviewer feedback
    const resultRow = db.prepare('SELECT * FROM assessment_results WHERE candidate_id = ?').get(testStudentId);
    assert.ok(resultRow, 'Result record must exist');
    assert.ok(resultRow.rubric_scores, 'Rubric scores JSON must be persisted');
    assert.strictEqual(resultRow.graded_by, null);

    // 5. Check skill_evidence and skill_evidence_ledger have recorded verified evidence
    const evidenceRows = db.prepare('SELECT * FROM skill_evidence WHERE candidate_id = ?').all(testStudentId);
    assert.ok(evidenceRows.length > 0, 'Skill evidence ledger must contain entries');
    evidenceRows.forEach((ev) => {
      assert.strictEqual(ev.verification_status, 'verified');
    });

    const ledgerRows = db.prepare('SELECT * FROM skill_evidence_ledger WHERE candidate_id = ?').all(testStudentId);
    assert.ok(ledgerRows.length > 0, 'Central evidence ledger must contain entries');
    ledgerRows.forEach((lr) => {
      assert.strictEqual(lr.validity_status, 'VALID');
      const meta = JSON.parse(lr.metadata || '{}');
      assert.ok(meta.evidenceHash, 'Must contain cryptographic evidence hash');
    });

    // 6. Check candidate_skills table has been updated
    const candidateSkills = db.prepare('SELECT * FROM candidate_skills WHERE candidate_id = ?').all(testStudentId);
    assert.ok(candidateSkills.length > 0, 'Candidate skills must be updated with assessment results');
  });

  test('6. Re-grading an already graded session returns idempotent result without duplicate records', async () => {
    // Find graded session from test 5
    const latestSession = db.prepare("SELECT id FROM assessment_sessions WHERE user_id = ? AND status = 'graded'").get(testStudentId);
    assert.ok(latestSession, 'Graded session must exist');

    const evidenceCountBefore = db.prepare('SELECT COUNT(*) as count FROM skill_evidence WHERE candidate_id = ?').get(testStudentId).count;
    const attemptsCountBefore = db.prepare('SELECT COUNT(*) as count FROM assessment_attempts WHERE candidate_id = ?').get(testStudentId).count;

    // Call gradeSession again on already graded session
    const idempotentResult = await GradingService.gradeSession(latestSession.id, testStudentId, { answers: {} });
    assert.ok(idempotentResult, 'Should return cached session result');
    assert.strictEqual(idempotentResult.sessionId, latestSession.id);

    const evidenceCountAfter = db.prepare('SELECT COUNT(*) as count FROM skill_evidence WHERE candidate_id = ?').get(testStudentId).count;
    const attemptsCountAfter = db.prepare('SELECT COUNT(*) as count FROM assessment_attempts WHERE candidate_id = ?').get(testStudentId).count;

    assert.strictEqual(evidenceCountAfter, evidenceCountBefore, 'Must not duplicate evidence rows on repeated submit');
    assert.strictEqual(attemptsCountAfter, attemptsCountBefore, 'Must not duplicate assessment attempt rows');
  });

  test('7. Authoritative Skill Passport reflects verified assessment results', async () => {
    const passport = await candidateService.getCandidatePassport(testStudentId);
    assert.ok(passport, 'Passport must load');
    assert.ok(passport.skills && passport.skills.length > 0, 'Passport skills must contain assessed skills');

    const assessedSkills = passport.skills.filter((s) => s.verification_status === 'diagnostic_tested' || s.verification_status === 'self_practice' || s.verification_status === 'verified');
    assert.ok(assessedSkills.length > 0, 'Passport must have assessed skills');

    assert.ok(passport.assessments && passport.assessments.length > 0, 'Passport assessments must contain persisted assessment');
    assert.ok(passport.evidence && passport.evidence.length > 0, 'Passport evidence ledger must contain evidence items');

    assert.ok(passport.assessments && passport.assessments.length > 0, 'Passport assessments must contain persisted assessment');
    assert.ok(passport.evidence && passport.evidence.length > 0, 'Passport evidence ledger must contain evidence items');
  });

  test('8. Analytics reflects authoritative assessment data after completion', async () => {
    const analytics = await StudentAnalyticsService.getStudentAnalytics(testStudentId);
    assert.ok(analytics, 'Analytics must load');
    assert.ok(analytics.completedAssessmentsCount >= 1, 'Completed assessments count must be at least 1');
    assert.strictEqual(typeof analytics.avgAssessmentScore, 'number', 'Average assessment score must now be a number');
    assert.ok(analytics.avgAssessmentScore > 0, 'Average assessment score must be greater than 0');
  });
});
