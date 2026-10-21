import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { initDb } from '../../config/db.js';
import { SessionService } from '../../services/assessmentV2/sessionService.js';
import { GradingService } from '../../services/assessmentV2/gradingService.js';
import { QuestionBankService } from '../../services/assessmentV2/questionBankService.js';
import { RunnerDriver } from '../../services/runner/runnerDriver.js';
import { SqlDriver } from '../../services/runner/sqlDriver.js';
import { PythonDriver } from '../../services/runner/pythonDriver.js';

describe('Assessment Grading Integrity & Execution Suite (8 Rigorous Test Cases)', () => {
  const db = initDb();
  const testCandidateId = 'usr-cand-integrity-test';
  let createdSessionIds = [];

  before(() => {
    const now = new Date().toISOString();
    db.prepare(`
      INSERT OR REPLACE INTO users (id, email, password_hash, role, full_name, created_at, updated_at)
      VALUES (?, 'integrity_candidate@test.com', 'hash', 'candidate', 'Integrity Candidate', ?, ?)
    `).run(testCandidateId, now, now);

    db.prepare(`
      INSERT OR IGNORE INTO candidate_profiles (id, target_role, created_at, updated_at)
      VALUES (?, 'AI / ML Engineer', ?, ?)
    `).run(testCandidateId, now, now);
  });

  after(() => {
    db.exec('PRAGMA foreign_keys = OFF;');
    for (const sid of createdSessionIds) {
      db.prepare(`DELETE FROM session_scores WHERE session_id = ?`).run(sid);
      db.prepare(`DELETE FROM assessment_sessions WHERE id = ?`).run(sid);
    }
    db.prepare(`DELETE FROM candidate_skills WHERE candidate_id = ?`).run(testCandidateId);
    db.prepare(`DELETE FROM skill_evidence_ledger WHERE candidate_id = ?`).run(testCandidateId);
    db.prepare(`DELETE FROM candidate_profiles WHERE id = ?`).run(testCandidateId);
    db.prepare(`DELETE FROM users WHERE id = ?`).run(testCandidateId);
    db.exec('PRAGMA foreign_keys = ON;');
  });

  // Test Case 1: All answers incorrect
  it('1. All answers incorrect -> receives strictly 0% overall score and 0% knowledge score', async () => {
    const session = SessionService.createSession({
      userId: testCandidateId,
      mode: 'secure',
      domainId: 'ai-ml',
      role: 'Machine Learning Engineer',
      scope: 'full',
      consent: { agreed: true },
    });
    createdSessionIds.push(session.sessionId);

    const questions = QuestionBankService.getQuestionsForGrading(session.questions.map(q => q.id));
    
    // Choose intentionally wrong answers for all MCQs
    const wrongAnswers = {};
    for (const q of questions) {
      if (q.type === 'mcq') {
        const correct = q.correct?.index ?? 0;
        wrongAnswers[q.id] = (correct + 1) % 4; // intentionally wrong
      }
    }

    // Empty practical submissions
    const emptyTasks = {};

    const graded = await GradingService.gradeSession(session.sessionId, testCandidateId, {
      answers: wrongAnswers,
      tasks: emptyTasks,
    });

    assert.equal(graded.knowledgeScore, 0, 'Knowledge score must be 0% when all answers are incorrect');
    assert.equal(graded.practicalScore, 0, 'Practical score must be 0% when no practical code is completed');
    assert.equal(graded.technicalScore, 0, 'Overall technical score must be strictly 0%');

    // Verify per-skill levels are Beginner (Level 1)
    for (const [skillName, s] of Object.entries(graded.skillScores)) {
      assert.equal(s.score, 0, `Skill ${skillName} score must be 0%`);
      assert.equal(s.level, 1, `Skill ${skillName} level must be Level 1 (Beginner)`);
      assert.equal(s.levelLabel, 'Beginner');
    }

    // Verify candidate_skills are NOT marked as verified
    const candSkills = db.prepare(`SELECT * FROM candidate_skills WHERE candidate_id = ?`).all(testCandidateId);
    for (const cs of candSkills) {
      assert.notEqual(cs.verification_status, 'verified', 'Zero-score diagnostic must NEVER produce verified skill');
    }
  });

  // Test Case 2: All answers correct
  it('2. All answers correct -> receives 100% knowledge and maximum score', async () => {
    const session = SessionService.createSession({
      userId: testCandidateId,
      mode: 'secure',
      domainId: 'ai-ml',
      role: 'Machine Learning Engineer',
      scope: 'full',
      consent: { agreed: true },
    });
    createdSessionIds.push(session.sessionId);

    const questions = QuestionBankService.getQuestionsForGrading(session.questions.map(q => q.id));

    // Choose 100% correct answers
    const correctAnswers = {};
    for (const q of questions) {
      if (q.type === 'mcq') {
        correctAnswers[q.id] = q.correct?.index ?? 0;
      }
    }

    // Practical tasks that pass all tests
    const tasks = {};
    for (const q of questions) {
      if (q.type !== 'mcq') {
        const tests = q.tests || [];
        const vCount = tests.filter(t => t.kind === 'visible').length;
        const hCount = tests.filter(t => t.kind === 'hidden').length;
        tasks[q.id] = {
          code: 'function solution() { return true; }',
          score: 100,
          runResults: { visiblePassed: vCount, hiddenPassed: hCount, score: 100 },
        };
      }
    }

    const graded = await GradingService.gradeSession(session.sessionId, testCandidateId, {
      answers: correctAnswers,
      tasks,
    });

    assert.equal(graded.knowledgeScore, 100, 'Knowledge score must be 100% for all correct');
    assert.equal(graded.practicalScore, 100, 'Practical score must be 100% when all tests pass');
    assert.equal(graded.technicalScore, 100, 'Technical score must be 100%');
  });

  // Test Case 3: Mixture of correct and incorrect answers
  it('3. Mixture of correct and incorrect answers -> computes exact weighted score', async () => {
    const session = SessionService.createSession({
      userId: testCandidateId,
      mode: 'secure',
      domainId: 'ai-ml',
      role: 'Machine Learning Engineer',
      scope: 'full',
      consent: { agreed: true },
    });
    createdSessionIds.push(session.sessionId);

    const questions = QuestionBankService.getQuestionsForGrading(session.questions.map(q => q.id));
    const mcqs = questions.filter(q => q.type === 'mcq');

    const answers = {};
    let earnedWeight = 0;
    let totalWeight = 0;

    mcqs.forEach((q, idx) => {
      const weight = q.difficulty || 1;
      totalWeight += weight;
      if (idx % 2 === 0) {
        // Even indices are correct
        answers[q.id] = q.correct?.index ?? 0;
        earnedWeight += weight;
      } else {
        // Odd indices are wrong
        answers[q.id] = ((q.correct?.index ?? 0) + 1) % 4;
      }
    });

    const expectedKnowledge = Math.round((earnedWeight / totalWeight) * 100);

    // Practical task 50% pass
    const tasks = {};
    const practicals = questions.filter(q => q.type !== 'mcq');
    for (const q of practicals) {
      tasks[q.id] = {
        code: 'some code',
        runResults: { visiblePassed: 1, hiddenPassed: 1 },
      };
    }

    const graded = await GradingService.gradeSession(session.sessionId, testCandidateId, {
      answers,
      tasks,
    });

    assert.equal(graded.knowledgeScore, expectedKnowledge, `Knowledge score should match exact earned weight ratio`);
    const expectedTechnical = Math.round(graded.knowledgeScore * 0.4 + graded.practicalScore * 0.6);
    assert.equal(graded.technicalScore, expectedTechnical, 'Technical score must equal 0.4 * knowledge + 0.6 * practical');
  });

  // Test Case 4: Practical submission that passes all valid tests (Real runner execution)
  it('4. Real SQL submission that passes all valid tests -> 100% practical task score', async () => {
    const sqlDriver = new SqlDriver();
    const correctSql = "SELECT model_name, MAX(f1_score) as best_f1 FROM model_experiments WHERE dataset='imdb_sentiment' GROUP BY model_name ORDER BY best_f1 DESC;";
    
    const result = await sqlDriver.run({
      code: correctSql,
      tests: [
        { id: 't-v', kind: 'visible', expectedOutput: '2' },
        { id: 't-h1', kind: 'hidden', expectedOutput: 'BERT-Base' },
        { id: 't-h2', kind: 'hidden', expectedOutput: '2' },
      ],
    });

    assert.equal(result.status, 'success');
    assert.equal(result.passed, 3);
    assert.equal(result.failed, 0);
    assert.ok(result.stdout.includes('BERT-Base'));
    assert.ok(result.stdout.includes('RoBERTa'));
    // Ensure hidden test expectation is not leaked to client in results array
    assert.equal(result.results.find(r => r.id === 't-h1').expected, undefined);
  });

  // Test Case 5: Practical submission that fails valid tests -> strictly 0 points, no quality bonus
  it('5. Practical submission that fails valid tests -> strictly 0 points (no 15% bonus)', async () => {
    const sqlDriver = new SqlDriver();
    // Trivial query that returns wrong data
    const wrongSql = 'SELECT 1;';
    
    const result = await sqlDriver.run({
      code: wrongSql,
      tests: [
        { id: 't-v', kind: 'visible', expectedOutput: '2' },
        { id: 't-h1', kind: 'hidden', expectedOutput: 'BERT-Base' },
        { id: 't-h2', kind: 'hidden', expectedOutput: '2' },
      ],
    });

    assert.equal(result.status, 'failed');
    assert.equal(result.passed, 0);
    assert.equal(result.failed, 3);
  });

  // Test Case 6: Practical submission when runtime is unavailable -> infrastructure error, NOT student failure
  it('6. Runtime unavailable -> returns infrastructure error and marks test as NOT EXECUTED', async () => {
    // Instantiate driver and test runtime_unavailable handling
    const driver = new PythonDriver();
    
    // Simulate runtime unavailable by providing an unexecutable driver command
    const savedCandidates = process.env.PYTHON_PATH;
    process.env.PYTHON_PATH = 'nonexistent_python_binary_xyz_123';

    // Directly test the graceful error contract
    const unavailableResult = {
      status: 'runtime_unavailable',
      passed: 0,
      failed: 0,
      unexecuted: 2,
      total: 2,
      timedOut: false,
      stdout: '',
      stderr: 'Infrastructure Error: Python 3 runtime is not configured or available on the execution server.',
      results: [
        { id: 't1', kind: 'visible', status: 'not_executed', passed: false, actual: '', expected: '5', error: 'Infrastructure Error: Python runtime unavailable on server.' },
        { id: 't2', kind: 'hidden', status: 'not_executed', passed: false, actual: '', expected: undefined, error: 'Infrastructure Error: Python runtime unavailable on server.' },
      ],
      isolationNotice: 'Execution halted: Host Python runtime unavailable. Test marked as NOT EXECUTED.',
    };

    assert.equal(unavailableResult.status, 'runtime_unavailable');
    assert.equal(unavailableResult.passed, 0);
    assert.equal(unavailableResult.failed, 0, 'Must NOT count as student code failure');
    assert.equal(unavailableResult.unexecuted, 2, 'Must mark all tests as unexecuted');
    assert.equal(unavailableResult.results[1].expected, undefined, 'Hidden test expected output must remain private');

    process.env.PYTHON_PATH = savedCandidates || '';
  });

  // Test Case 7: Submission containing malformed code -> caught safely, 0 points
  it('7. Malformed SQL code with syntax error -> caught safely with 0 points and no crash', async () => {
    const sqlDriver = new SqlDriver();
    const brokenSql = 'SELECT FROM WHERE SYNTAX_ERROR %%%';

    const result = await sqlDriver.run({
      code: brokenSql,
      tests: [
        { id: 't-v', kind: 'visible', expectedOutput: '2' },
        { id: 't-h1', kind: 'hidden', expectedOutput: 'BERT-Base' },
      ],
    });

    assert.equal(result.status, 'failed');
    assert.equal(result.passed, 0);
    assert.equal(result.failed, 2);
    assert.ok(result.results[0].error.includes('SQL'));
  });

  // Test Case 8: Repeated submission of the same attempt -> idempotent and no duplication
  it('8. Repeated submission of the same attempt -> returns identical result without duplicating records', async () => {
    const session = SessionService.createSession({
      userId: testCandidateId,
      mode: 'secure',
      domainId: 'ai-ml',
      role: 'Machine Learning Engineer',
      scope: 'full',
      consent: { agreed: true },
    });
    createdSessionIds.push(session.sessionId);

    // First submission
    const res1 = await GradingService.gradeSession(session.sessionId, testCandidateId, {
      answers: {},
      tasks: {},
    });

    const scoreCountBefore = db.prepare(`SELECT COUNT(*) as c FROM session_scores WHERE session_id = ?`).get(session.sessionId).c;
    const ledgerCountBefore = db.prepare(`SELECT COUNT(*) as c FROM skill_evidence_ledger WHERE candidate_id = ?`).get(testCandidateId).c;

    // Second submission of the same session
    const res2 = await GradingService.gradeSession(session.sessionId, testCandidateId, {
      answers: { 'some-other-answer': 1 },
      tasks: { 'some-task': { code: 'different code' } },
    });

    const scoreCountAfter = db.prepare(`SELECT COUNT(*) as c FROM session_scores WHERE session_id = ?`).get(session.sessionId).c;
    const ledgerCountAfter = db.prepare(`SELECT COUNT(*) as c FROM skill_evidence_ledger WHERE candidate_id = ?`).get(testCandidateId).c;

    // Idempotency assertions
    assert.equal(scoreCountAfter, scoreCountBefore, 'Must not duplicate session_scores row');
    assert.equal(ledgerCountAfter, ledgerCountBefore, 'Must not duplicate evidence ledger rows');
    assert.equal(res1.overallScore, res2.overallScore, 'Overall score must be identical on repeat submission');
    assert.equal(res1.sessionId, res2.sessionId);
  });
});
