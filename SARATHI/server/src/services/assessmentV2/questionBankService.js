import { initDb } from '../../config/db.js';

export class QuestionBankService {
  /**
   * Sample questions for an assessment session without leaking correct answers or hidden tests.
   */
  /**
   * Sample questions for an assessment session without leaking correct answers or hidden tests.
   * Supports seeded stratified selection, skill balancing, and overlap avoidance against previous attempts.
   */
  static sampleQuestionsForSession(domainOrOptions, roleTitle = null, scope = 'full') {
    const db = initDb();

    let domainId;
    let seed;
    let previousQuestionIds = [];

    if (typeof domainOrOptions === 'object' && domainOrOptions !== null) {
      domainId = domainOrOptions.domainId;
      roleTitle = domainOrOptions.roleTitle ?? null;
      scope = domainOrOptions.scope ?? 'full';
      seed = domainOrOptions.seed ?? Date.now();
      previousQuestionIds = Array.isArray(domainOrOptions.previousQuestionIds) ? domainOrOptions.previousQuestionIds : [];
    } else {
      domainId = domainOrOptions;
      seed = Date.now();
    }

    const previousSet = new Set(previousQuestionIds);

    // Seeded PRNG (Mulberry32)
    let s = typeof seed === 'number' ? seed : 123456789;
    if (typeof seed === 'string') {
      s = 0;
      for (let i = 0; i < seed.length; i++) {
        s = (s * 31 + seed.charCodeAt(i)) >>> 0;
      }
    }
    const rng = () => {
      s = (s + 0x6D2B79F5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };

    const seededShuffle = (arr) => {
      const copy = [...arr];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    };

    // Query active questions for the domain
    const questions = db.prepare(`
      SELECT q.id, q.version, q.domain_id, q.skill_id, s.name as skill_name, s.category,
             q.type, q.difficulty, q.prompt, q.options, q.starter_code, q.language
      FROM assessment_questions q
      LEFT JOIN skills s ON q.skill_id = s.id
      WHERE q.domain_id = ? AND q.status = 'active'
      ORDER BY q.difficulty ASC, q.id ASC
    `).all(domainId);

    if (!questions || questions.length === 0) {
      throw new Error(`No active assessment questions found for domain: ${domainId}`);
    }

    const selectedSkillCounts = new Map();

    const selectStratified = (pool, count) => {
      if (!pool || pool.length === 0 || count <= 0) return [];
      const unseen = pool.filter(q => !previousSet.has(q.id));
      const seen = pool.filter(q => previousSet.has(q.id));

      const sortByStrategy = (list) => {
        return [...list].sort((a, b) => {
          if (a.type === 'mcq') {
            const countA = selectedSkillCounts.get(a.skill_id) || 0;
            const countB = selectedSkillCounts.get(b.skill_id) || 0;
            if (countA !== countB) return countA - countB;
          }
          if (a.difficulty !== b.difficulty) return a.difficulty - b.difficulty;
          return a.id.localeCompare(b.id);
        });
      };

      const prioritizedUnseen = sortByStrategy(unseen);
      const prioritizedSeen = sortByStrategy(seen);

      const picked = [];
      for (const q of prioritizedUnseen) {
        if (picked.length >= count) break;
        picked.push(q);
        selectedSkillCounts.set(q.skill_id, (selectedSkillCounts.get(q.skill_id) || 0) + 1);
      }
      for (const q of prioritizedSeen) {
        if (picked.length >= count) break;
        picked.push(q);
        selectedSkillCounts.set(q.skill_id, (selectedSkillCounts.get(q.skill_id) || 0) + 1);
      }
      return picked;
    };

    // Stratify by type and difficulty
    const mcqsByDiff = {
      1: questions.filter(q => q.type === 'mcq' && q.difficulty === 1),
      2: questions.filter(q => q.type === 'mcq' && q.difficulty === 2),
      3: questions.filter(q => q.type === 'mcq' && q.difficulty === 3),
    };

    const codeByDiff = {
      1: questions.filter(q => q.type === 'code' && q.difficulty === 1),
      2: questions.filter(q => q.type === 'code' && q.difficulty >= 2),
    };

    const codingPool = questions.filter(q => q.type === 'code');
    const sqlPool = questions.filter(q => q.type === 'sql');
    const projectPool = questions.filter(q => q.type === 'project');

    let selectedMcqs = [];
    let selectedCoding = [];
    let selectedSql = [];
    let selectedProjects = [];

    const blueprintTarget = {};

    if (scope === 'quiz_only') {
      blueprintTarget.mcq = { 1: 3, 2: 5, 3: 2 };
      selectedMcqs = [
        ...selectStratified(mcqsByDiff[1], 3),
        ...selectStratified(mcqsByDiff[2], 5),
        ...selectStratified(mcqsByDiff[3], 2),
      ];
    } else if (scope === 'practical_only') {
      blueprintTarget.code = { 1: 1, 2: 1 };
      blueprintTarget.sql = 1;
      blueprintTarget.project = 1;
      const codePicked = [
        ...selectStratified(codeByDiff[1], 1),
        ...selectStratified(codeByDiff[2], 1),
      ];
      if (codePicked.length < 2) {
        const remaining = codingPool.filter(c => !codePicked.some(s => s.id === c.id));
        codePicked.push(...selectStratified(remaining, 2 - codePicked.length));
      }
      selectedCoding = codePicked;
      selectedSql = selectStratified(sqlPool, 1);
      selectedProjects = selectStratified(projectPool, 1);
    } else {
      // Combined / full (default): 8 MCQs (2 easy, 4 med, 2 hard), 2 Code (1 easy, 1 med), 1 SQL, 1 Project
      blueprintTarget.mcq = { 1: 2, 2: 4, 3: 2 };
      blueprintTarget.code = { 1: 1, 2: 1 };
      blueprintTarget.sql = 1;
      blueprintTarget.project = 1;

      selectedMcqs = [
        ...selectStratified(mcqsByDiff[1], 2),
        ...selectStratified(mcqsByDiff[2], 4),
        ...selectStratified(mcqsByDiff[3], 2),
      ];
      const codePicked = [
        ...selectStratified(codeByDiff[1], 1),
        ...selectStratified(codeByDiff[2], 1),
      ];
      if (codePicked.length < 2) {
        const remaining = codingPool.filter(c => !codePicked.some(s => s.id === c.id));
        codePicked.push(...selectStratified(remaining, 2 - codePicked.length));
      }
      selectedCoding = codePicked;
      selectedSql = selectStratified(sqlPool, 1);
      selectedProjects = selectStratified(projectPool, 1);
    }

    const combined = [...selectedMcqs, ...selectedCoding, ...selectedSql, ...selectedProjects];

    // Compute overlap statistics and audit metadata
    let actualOverlapCount = 0;
    const questionVersions = {};
    for (const q of combined) {
      questionVersions[q.id] = q.version || 1;
      if (previousSet.has(q.id)) {
        actualOverlapCount++;
      }
    }

    const audit = {
      seed,
      strategy: 'seeded_stratified_blueprint_v1',
      scope,
      blueprint: {
        target: blueprintTarget,
        counts: {
          mcq: selectedMcqs.length,
          code: selectedCoding.length,
          sql: selectedSql.length,
          project: selectedProjects.length,
          total: combined.length,
        },
      },
      overlap: {
        previousQuestionCount: previousQuestionIds.length,
        actualOverlapCount,
        overlapRatio: combined.length > 0 ? Number((actualOverlapCount / combined.length).toFixed(4)) : 0,
      },
      questionVersions,
    };

    // Hydrate visible tests and rubrics (HIDDEN tests are strictly excluded here!)
    const getVisibleTests = db.prepare(`
      SELECT id, kind, input, expected_output, timeout_ms
      FROM code_tests
      WHERE question_id = ? AND kind = 'visible'
      ORDER BY id ASC
    `);

    const getRubric = db.prepare(`
      SELECT criteria
      FROM project_rubrics
      WHERE question_id = ?
    `);

    const clientQuestions = combined.map(q => {
      let parsedOptions = [];
      try {
        parsedOptions = JSON.parse(q.options || '[]');
      } catch {}

      const clientQuestion = {
        id: q.id,
        version: q.version,
        domainId: q.domain_id,
        skillId: q.skill_id,
        skillName: q.skill_name || q.skill_id,
        category: q.category || 'General',
        type: q.type,
        difficulty: q.difficulty,
        prompt: q.prompt,
        options: q.type === 'mcq' ? parsedOptions : undefined,
        starterCode: q.starter_code || undefined,
        language: q.language || undefined,
      };

      if (q.type === 'code' || q.type === 'sql') {
        const tests = getVisibleTests.all(q.id);
        clientQuestion.visibleTests = tests.map(t => {
          if (q.type === 'sql') {
            return {
              id: t.id,
              kind: 'visible',
              input: 'Specification & Schema Validation',
              expectedOutput: 'Non-empty result set matching query specification',
              timeoutMs: t.timeout_ms,
            };
          }
          return {
            id: t.id,
            kind: 'visible',
            input: t.input,
            expectedOutput: t.expected_output,
            timeoutMs: t.timeout_ms,
          };
        });
      }

      if (q.type === 'project') {
        const rubricRow = getRubric.get(q.id);
        if (rubricRow) {
          try {
            clientQuestion.rubric = JSON.parse(rubricRow.criteria || '[]');
          } catch {}
        }
      }

      return clientQuestion;
    });

    // Attach audit metadata to the clientQuestions array
    clientQuestions.audit = audit;
    return clientQuestions;
  }

  /**
   * Fetch specific questions by IDs for client session hydration (preserving question_ids order, no answers/hidden tests leaked).
   */
  static getQuestionsForClient(questionIds) {
    const db = initDb();
    if (!questionIds || questionIds.length === 0) return [];

    const placeholders = questionIds.map(() => '?').join(',');
    const questions = db.prepare(`
      SELECT q.id, q.version, q.domain_id, q.skill_id, s.name as skill_name, s.category,
             q.type, q.difficulty, q.prompt, q.options, q.starter_code, q.language
      FROM assessment_questions q
      LEFT JOIN skills s ON q.skill_id = s.id
      WHERE q.id IN (${placeholders})
    `).all(...questionIds);

    const getVisibleTests = db.prepare(`
      SELECT id, kind, input, expected_output, timeout_ms
      FROM code_tests
      WHERE question_id = ? AND kind = 'visible'
      ORDER BY id ASC
    `);

    const getRubric = db.prepare(`
      SELECT criteria
      FROM project_rubrics
      WHERE question_id = ?
    `);

    const map = new Map();
    for (const q of questions) {
      let parsedOptions = [];
      try {
        parsedOptions = JSON.parse(q.options || '[]');
      } catch {}

      const clientQuestion = {
        id: q.id,
        version: q.version,
        domainId: q.domain_id,
        skillId: q.skill_id,
        skillName: q.skill_name || q.skill_id,
        category: q.category || 'General',
        type: q.type,
        difficulty: q.difficulty,
        prompt: q.prompt,
        options: q.type === 'mcq' ? parsedOptions : undefined,
        starterCode: q.starter_code || undefined,
        language: q.language || undefined,
      };

      if (q.type === 'code' || q.type === 'sql') {
        const tests = getVisibleTests.all(q.id);
        clientQuestion.visibleTests = tests.map(t => ({
          id: t.id,
          kind: 'visible',
          input: q.type === 'sql' ? 'Specification & Schema Validation' : t.input,
          expectedOutput: q.type === 'sql' ? 'Non-empty result set matching query specification' : t.expected_output,
          timeoutMs: t.timeout_ms,
        }));
      }

      if (q.type === 'project') {
        const rubricRow = getRubric.get(q.id);
        if (rubricRow) {
          try {
            clientQuestion.rubric = JSON.parse(rubricRow.criteria || '[]');
          } catch {}
        }
      }

      map.set(q.id, clientQuestion);
    }

    return questionIds.map(id => map.get(id)).filter(Boolean);
  }

  /**
   * Internal / Server-Only: fetch questions with correct answers, hidden tests, and rubrics for grading.
   */
  static getQuestionsForGrading(questionIds) {
    const db = initDb();
    if (!questionIds || questionIds.length === 0) return [];

    const placeholders = questionIds.map(() => '?').join(',');
    const questions = db.prepare(`
      SELECT q.id, q.version, q.domain_id, q.skill_id, s.name as skill_name, s.category,
             q.type, q.difficulty, q.prompt, q.options, q.correct, q.explanation,
             q.starter_code, q.language
      FROM assessment_questions q
      LEFT JOIN skills s ON q.skill_id = s.id
      WHERE q.id IN (${placeholders})
    `).all(...questionIds);

    const getAllTests = db.prepare(`
      SELECT id, kind, input, expected_output, weight, timeout_ms
      FROM code_tests
      WHERE question_id = ?
      ORDER BY kind ASC, id ASC
    `);

    const getRubric = db.prepare(`
      SELECT criteria
      FROM project_rubrics
      WHERE question_id = ?
    `);

    return questions.map(q => {
      let correct = {};
      let options = [];
      try { correct = JSON.parse(q.correct || '{}'); } catch {}
      try { options = JSON.parse(q.options || '[]'); } catch {}

      const item = {
        id: q.id,
        version: q.version,
        domainId: q.domain_id,
        skillId: q.skill_id,
        skillName: q.skill_name || q.skill_id,
        category: q.category || 'General',
        type: q.type,
        difficulty: q.difficulty,
        prompt: q.prompt,
        options,
        correct,
        explanation: q.explanation,
        starterCode: q.starter_code,
        language: q.language,
      };

      if (q.type === 'code' || q.type === 'sql') {
        item.tests = getAllTests.all(q.id);
      }

      if (q.type === 'project') {
        const rubricRow = getRubric.get(q.id);
        if (rubricRow) {
          try { item.rubric = JSON.parse(rubricRow.criteria || '[]'); } catch {}
        }
      }

      return item;
    });
  }
}
