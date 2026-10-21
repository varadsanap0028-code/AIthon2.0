import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { initDb } from '../../config/db.js';
import { SessionService } from '../../services/assessmentV2/sessionService.js';
import { GradingService } from '../../services/assessmentV2/gradingService.js';
import { QuestionBankService } from '../../services/assessmentV2/questionBankService.js';
import { RunnerDriver } from '../../services/runner/runnerDriver.js';
import { detectPythonExecutable } from '../../services/runner/pythonDriver.js';

describe('Real Python Assessment Execution & Outlier Task Suite', () => {
  const db = initDb();
  const candidateId = 'usr-cand-python-test';
  let sessionId = null;

  before(() => {
    const now = new Date().toISOString();
    db.prepare(`
      INSERT OR REPLACE INTO users (id, email, password_hash, role, full_name, created_at, updated_at)
      VALUES (?, 'py_candidate@test.com', 'hash', 'candidate', 'Python Candidate', ?, ?)
    `).run(candidateId, now, now);

    db.prepare(`
      INSERT OR IGNORE INTO candidate_profiles (id, target_role, created_at, updated_at)
      VALUES (?, 'Data Scientist', ?, ?)
    `).run(candidateId, now, now);
  });

  after(() => {
    db.exec('PRAGMA foreign_keys = OFF;');
    if (sessionId) {
      db.prepare(`DELETE FROM session_scores WHERE session_id = ?`).run(sessionId);
      db.prepare(`DELETE FROM assessment_sessions WHERE id = ?`).run(sessionId);
      db.prepare(`DELETE FROM run_results WHERE session_id = ?`).run(sessionId);
    }
    db.prepare(`DELETE FROM candidate_skills WHERE candidate_id = ?`).run(candidateId);
    db.prepare(`DELETE FROM skill_evidence_ledger WHERE candidate_id = ?`).run(candidateId);
    db.prepare(`DELETE FROM candidate_profiles WHERE id = ?`).run(candidateId);
    db.prepare(`DELETE FROM users WHERE id = ?`).run(candidateId);
    db.exec('PRAGMA foreign_keys = ON;');
  });

  it('1. Detects genuine Python 3 executable on host', async () => {
    const pyPath = await detectPythonExecutable();
    assert.ok(pyPath, 'Python 3 executable must be detected');
    assert.match(pyPath, /python(\.exe)?$/i);
  });

  it('2. Real smoke tests: simple print, valid func, wrong func, syntax error, timeout', async () => {
    // 2a. Simple print
    const resPrint = await RunnerDriver.run({
      language: 'python',
      code: '',
      tests: [{ id: 'p1', kind: 'visible', input: 'print("SARATHI_PYTHON_OK")', expectedOutput: 'SARATHI_PYTHON_OK' }],
    });
    assert.equal(resPrint.status, 'success');
    assert.equal(resPrint.results[0].actual, 'SARATHI_PYTHON_OK');

    // 2b. Valid func
    const resValid = await RunnerDriver.run({
      language: 'python',
      code: 'def add(a, b): return a + b',
      tests: [{ id: 'p2', kind: 'visible', input: 'from solution import add\nprint(add(2, 3))', expectedOutput: '5' }],
    });
    assert.equal(resValid.status, 'success');
    assert.equal(resValid.passed, 1);

    // 2c. Incorrect logic
    const resWrong = await RunnerDriver.run({
      language: 'python',
      code: 'def add(a, b): return a - b',
      tests: [{ id: 'p3', kind: 'visible', input: 'from solution import add\nprint(add(2, 3))', expectedOutput: '5' }],
    });
    assert.equal(resWrong.status, 'failed');
    assert.equal(resWrong.passed, 0);
    assert.equal(resWrong.results[0].actual, '-1');

    // 2d. Syntax error
    const resSyntax = await RunnerDriver.run({
      language: 'python',
      code: 'def bad(::: syntax error',
      tests: [{ id: 'p4', kind: 'visible', input: 'from solution import bad', expectedOutput: '' }],
    });
    assert.equal(resSyntax.status, 'failed');
    assert.ok(resSyntax.results[0].error.includes('SyntaxError'));

    // 2e. Timeout infinite loop
    const resTimeout = await RunnerDriver.run({
      language: 'python',
      code: 'def loop():\n    while True: pass',
      tests: [{ id: 'p5', kind: 'visible', input: 'from solution import loop\nloop()', expectedOutput: 'done', timeoutMs: 1500 }],
      limits: { timeoutMs: 1500 },
    });
    assert.equal(resTimeout.status, 'timeout');
    assert.equal(resTimeout.timedOut, true);
  });

  it('3. Real detect_outliers_iqr Python task passes visible tests and executes cleanly', async () => {
    const correctCode = `
def detect_outliers_iqr(data):
    if not data or len(data) < 4:
        return []
    sorted_data = sorted(data)
    n = len(sorted_data)
    def median(lst):
        m = len(lst)
        return lst[m // 2] if m % 2 == 1 else (lst[m // 2 - 1] + lst[m // 2]) / 2.0
    lower_half = sorted_data[:n // 2]
    upper_half = sorted_data[n // 2:] if n % 2 == 0 else sorted_data[n // 2 + 1:]
    q1 = median(lower_half)
    q3 = median(upper_half)
    iqr = q3 - q1
    return [x for x in data if x < (q1 - 1.5 * iqr) or x > (q3 + 1.5 * iqr)]
`;

    const q = QuestionBankService.getQuestionsForGrading(['q-ds-code-02'])[0];
    assert.ok(q, 'q-ds-code-02 must be found in QuestionBankService');

    const result = await RunnerDriver.run({
      language: 'python',
      code: correctCode,
      tests: q.tests,
    });

    const visibleTests = result.results.filter(r => r.kind === 'visible');
    assert.equal(visibleTests.length, 3, 'Must have 3 visible tests');
    for (const vt of visibleTests) {
      assert.equal(vt.passed, true, `Visible test ${vt.id} must pass`);
    }
    assert.ok(result.passed >= 7, 'Must pass at least 7 of 8 total tests');
  });

  it('4. Full Grading Pipeline: session with Python submission computes real practical score', async () => {
    const session = SessionService.createSession({
      userId: candidateId,
      mode: 'secure',
      domainId: 'data-science',
      role: 'Data Scientist',
      scope: 'full',
      consent: { agreed: true },
    });
    sessionId = session.sessionId;

    const correctCode = `
def detect_outliers_iqr(data):
    if not data or len(data) < 4:
        return []
    sorted_data = sorted(data)
    n = len(sorted_data)
    def median(lst):
        m = len(lst)
        return lst[m // 2] if m % 2 == 1 else (lst[m // 2 - 1] + lst[m // 2]) / 2.0
    lower_half = sorted_data[:n // 2]
    upper_half = sorted_data[n // 2:] if n % 2 == 0 else sorted_data[n // 2 + 1:]
    q1 = median(lower_half)
    q3 = median(upper_half)
    iqr = q3 - q1
    return [x for x in data if x < (q1 - 1.5 * iqr) or x > (q3 + 1.5 * iqr)]
`;

    const graded = await GradingService.gradeSession(sessionId, candidateId, {
      answers: {},
      tasks: {
        'q-ds-code-02': {
          code: correctCode,
        },
      },
    });

    assert.ok(graded.practicalSummary.length > 0, 'Practical summary must be present');
    const outlierSummary = graded.practicalSummary.find(p => p.taskId === 'q-ds-code-02');
    assert.ok(outlierSummary, 'Outlier task summary must be recorded');
    assert.equal(outlierSummary.isInfrastructureError, false, 'Must NOT have infrastructure error');
    assert.ok(outlierSummary.score >= 60, `Task score (${outlierSummary.score}) must meet pass threshold`);
    assert.equal(outlierSummary.isPassed, true, 'Task must be marked passed');
    assert.equal(outlierSummary.visiblePassed, 3, 'All 3 visible tests must pass');
  });
});
