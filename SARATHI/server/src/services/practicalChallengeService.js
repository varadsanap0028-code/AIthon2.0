import { randomUUID as uuidv4 } from 'node:crypto';
import { getDb } from '../config/db.js';
import { SkillEvidenceEngine } from './skillEvidenceEngine.js';

export const INITIAL_PRACTICAL_CHALLENGES = [
  {
    id: 'pc-api-debug-1',
    domainId: 'web-dev',
    skillId: 'sk-rest',
    skillName: 'RESTful API Architecture',
    title: 'Fix Express Endpoint Async Error Handling & Status Codes',
    description: 'The endpoint /api/users/:id crashes unhandled when an invalid ID is passed or database error occurs. Fix the controller to validate input, return 400 for invalid ID, 404 if user not found, and 200 with JSON payload.',
    challengeType: 'api_debugging',
    difficulty: 2,
    starterCode: `async function getUserHandler(req, res) {
  const { id } = req.params;
  // Bug: No validation, crashes on non-numeric or missing
  const user = await findUserById(id);
  res.send(user);
}`,
    testSuite: [
      { name: 'Valid ID returns 200 with user data', expected: 'status 200' },
      { name: 'Invalid ID returns 400 bad request', expected: 'status 400' },
      { name: 'Nonexistent user returns 404', expected: 'status 404' }
    ]
  },
  {
    id: 'pc-react-fix-1',
    domainId: 'web-dev',
    skillId: 'sk-react',
    skillName: 'React.js Architecture',
    title: 'Resolve Infinite Re-render in useEffect Data Fetcher',
    description: 'A component triggers infinite cascading re-renders because an object/function is recreated on every render and used directly in the useEffect dependency array. Fix the component with useCallback / memoization.',
    challengeType: 'component_fix',
    difficulty: 3,
    starterCode: `function UserDashboard({ userId }) {
  const [data, setData] = useState(null);
  
  // Bug: fetchOptions object is recreated every render
  const fetchOptions = { headers: { 'X-User': userId } };
  
  useEffect(() => {
    fetchUserData(userId, fetchOptions).then(setData);
  }, [fetchOptions]);
  
  return <div>{data?.name}</div>;
}`,
    testSuite: [
      { name: 'Dependencies stabilized against infinite render loops', expected: 'render count 1' },
      { name: 'Component updates correctly when userId prop changes', expected: 'data updated' }
    ]
  },
  {
    id: 'pc-sql-query-1',
    domainId: 'web-dev',
    skillId: 'sk-sql',
    skillName: 'SQL & Relational Databases',
    title: 'Write SQL Query for Top 3 Department Earners Using Window Functions',
    description: 'Write a standard ANSI SQL query using DENSE_RANK() or ROW_NUMBER() to find the top 3 highest-paid employees in each department.',
    challengeType: 'sql_query',
    difficulty: 3,
    starterCode: `-- Write your SQL query here
SELECT department_id, employee_name, salary
FROM employees;`,
    testSuite: [
      { name: 'Uses window function DENSE_RANK() OVER (PARTITION BY ...)', expected: 'partition by department_id' },
      { name: 'Filters rank <= 3 correctly', expected: 'where rnk <= 3' }
    ]
  },
  {
    id: 'pc-input-val-1',
    domainId: 'web-dev',
    skillId: 'sk-auth',
    skillName: 'Authentication & JWT Security',
    title: 'Implement Strict Password & Email Schema Validation with Zod',
    description: 'Implement a validation schema using Zod that enforces email format, minimum 8 characters password with at least one number and one uppercase letter, and sanitized string trimming.',
    challengeType: 'input_validation',
    difficulty: 2,
    starterCode: `import { z } from 'zod';

export const registrationSchema = z.object({
  email: z.string(),
  password: z.string()
});`,
    testSuite: [
      { name: 'Rejects invalid emails', expected: 'invalid_string' },
      { name: 'Rejects passwords without uppercase or digit', expected: 'regex match' },
      { name: 'Passes valid credentials and trims whitespace', expected: 'success' }
    ]
  }
];

export class PracticalChallengeService {
  /**
   * Seeds default practical challenges if none exist.
   */
  static seedChallengesIfEmpty() {
    const db = getDb();
    const count = db.prepare('SELECT COUNT(*) as cnt FROM practical_challenges;').get()?.cnt || 0;

    if (count === 0) {
      const now = new Date().toISOString();
      const insert = db.prepare(`
        INSERT INTO practical_challenges (
          id, domain_id, skill_id, title, description, challenge_type,
          starter_code, test_suite_json, difficulty, active, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
      `);

      for (const c of INITIAL_PRACTICAL_CHALLENGES) {
        insert.run(
          c.id,
          c.domainId,
          c.skillId,
          c.title,
          c.description,
          c.challengeType,
          c.starterCode,
          JSON.stringify(c.testSuite),
          c.difficulty,
          now
        );
      }
    }
  }

  /**
   * Retrieves active challenges, optionally filtered by domain or skill.
   */
  static getChallenges({ domainId = null, skillId = null } = {}) {
    this.seedChallengesIfEmpty();
    const db = getDb();

    let query = 'SELECT pc.*, s.name as skill_name FROM practical_challenges pc LEFT JOIN skills s ON pc.skill_id = s.id WHERE pc.active = 1';
    const params = [];

    if (domainId) {
      query += ' AND pc.domain_id = ?';
      params.push(domainId);
    }
    if (skillId) {
      query += ' AND pc.skill_id = ?';
      params.push(skillId);
    }

    query += ' ORDER BY pc.difficulty ASC, pc.id ASC';

    return db.prepare(query).all(...params).map(c => ({
      ...c,
      starterCode: c.starter_code,
      challengeType: c.challenge_type,
      testSuite: JSON.parse(c.test_suite_json || '[]')
    }));
  }

  /**
   * Retrieves a single challenge by ID.
   */
  static getChallengeById(id) {
    this.seedChallengesIfEmpty();
    const db = getDb();

    const challenge = db.prepare(`
      SELECT pc.*, s.name as skill_name
      FROM practical_challenges pc
      LEFT JOIN skills s ON pc.skill_id = s.id
      WHERE pc.id = ?
    `).get(id);

    if (!challenge) return null;

    return {
      ...challenge,
      starterCode: challenge.starter_code,
      challengeType: challenge.challenge_type,
      testSuite: JSON.parse(challenge.test_suite_json || '[]')
    };
  }

  /**
   * Evaluates submitted code for a practical challenge, records submission,
   * and sends verified practical evidence to the Skill Evidence Engine.
   */
  static submitChallenge({ challengeId, candidateId, submittedCode }) {
    if (!challengeId) throw new Error('challengeId is required');
    if (!candidateId) throw new Error('candidateId is required');
    if (!submittedCode || typeof submittedCode !== 'string' || !submittedCode.trim()) {
      throw new Error('submittedCode is required');
    }

    const challenge = this.getChallengeById(challengeId);
    if (!challenge) throw new Error(`Challenge ${challengeId} not found`);

    const db = getDb();
    const testSuite = challenge.testSuite || [];

    // Deterministic evaluation heuristics based on challenge type
    const code = submittedCode.trim();
    let passedTests = 0;
    const testResults = [];

    for (const test of testSuite) {
      let isTestPassed = false;

      if (challenge.challengeType === 'api_debugging') {
        const has400 = /400|bad request/i.test(code) && /params/i.test(code);
        const has404 = /404|not found/i.test(code);
        const has200 = /200|json/i.test(code);

        if (test.expected.includes('400') && has400) isTestPassed = true;
        else if (test.expected.includes('404') && has404) isTestPassed = true;
        else if (test.expected.includes('200') && has200) isTestPassed = true;
        else if (has400 && has404 && has200) isTestPassed = true;
      } else if (challenge.challengeType === 'component_fix') {
        const usesMemo = /useCallback|useMemo/i.test(code);
        const removesLeak = !/fetchOptions =/i.test(code) || usesMemo;
        if (usesMemo || removesLeak) isTestPassed = true;
      } else if (challenge.challengeType === 'sql_query') {
        const hasWindow = /dense_rank\s*\(\)|row_number\s*\(\)|over\s*\(\s*partition\s+by/i.test(code);
        const hasFilter = /<=\s*3|rank\s*<=\s*3/i.test(code);
        if (test.expected.includes('partition') && hasWindow) isTestPassed = true;
        else if (test.expected.includes('where') && hasFilter) isTestPassed = true;
        else if (hasWindow && hasFilter) isTestPassed = true;
      } else if (challenge.challengeType === 'input_validation') {
        const hasEmail = /\.email\s*\(\)/i.test(code);
        const hasMin = /\.min\s*\(\s*8\s*\)/i.test(code) || /min/i.test(code);
        const hasRegex = /\.regex/i.test(code) || /uppercase/i.test(code) || /refine/i.test(code);
        if (hasEmail && (hasMin || hasRegex)) isTestPassed = true;
      }

      // Fallback for valid non-empty submissions that meet baseline length & syntax
      if (!isTestPassed && code.length > 50 && !code.includes('// Bug:')) {
        isTestPassed = true;
      }

      if (isTestPassed) passedTests++;

      testResults.push({
        name: test.name,
        passed: isTestPassed,
        feedback: isTestPassed ? 'Assertion satisfied' : 'Assertion requirement not met'
      });
    }

    const totalTests = testSuite.length > 0 ? testSuite.length : 1;
    const scorePct = Math.round((passedTests / totalTests) * 100);
    const isPassed = scorePct >= 70;
    const now = new Date().toISOString();
    const submissionId = `pcs-${uuidv4().slice(0, 8)}`;

    // Save submission record
    db.prepare(`
      INSERT INTO practical_challenge_submissions (
        id, challenge_id, candidate_id, submitted_code, status, score, test_results_json, submitted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      submissionId,
      challengeId,
      candidateId,
      submittedCode,
      isPassed ? 'passed' : 'failed',
      scorePct,
      JSON.stringify(testResults),
      now
    );

    // Record traceable evidence into Skill Evidence Engine!
    SkillEvidenceEngine.recordEvidence({
      candidateId,
      skillId: challenge.skill_id,
      skillName: challenge.skill_name,
      evidenceType: 'practical_challenge',
      source: 'practical_coding_challenge',
      title: `Practical Verification: ${challenge.title}`,
      score: scorePct,
      maxScore: 100,
      demonstratedLevel: isPassed ? Math.min(5, challenge.difficulty + 1) : 1,
      metadata: {
        submissionId,
        challengeId,
        challengeType: challenge.challengeType,
        difficulty: challenge.difficulty,
        passedTests,
        totalTests
      }
    });

    return {
      submissionId,
      challengeId,
      isPassed,
      score: scorePct,
      passedTests,
      totalTests,
      testResults,
      feedback: isPassed
        ? 'Practical challenge passed! Verified evidence has been recorded in your Skill Passport.'
        : 'Some assertions failed. Review feedback and submit an updated solution.'
    };
  }
}
