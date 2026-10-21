import { readdirSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { initDb } from '../../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function seedAssessmentBank(dbInstance = null) {
  const db = dbInstance || initDb();
  const seedsDir = resolve(__dirname, 'assessment');
  const files = readdirSync(seedsDir).filter(f => f.endsWith('.json'));

  let questionCount = 0;
  let testCount = 0;
  let rubricCount = 0;

  const insertQuestion = db.prepare(`
    INSERT INTO assessment_questions (
      id, version, domain_id, skill_id, type, difficulty, prompt,
      options, correct, explanation, starter_code, language, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      version = excluded.version,
      domain_id = excluded.domain_id,
      skill_id = excluded.skill_id,
      type = excluded.type,
      difficulty = excluded.difficulty,
      prompt = excluded.prompt,
      options = excluded.options,
      correct = excluded.correct,
      explanation = excluded.explanation,
      starter_code = excluded.starter_code,
      language = excluded.language,
      status = excluded.status;
  `);

  const insertTest = db.prepare(`
    INSERT INTO code_tests (
      id, question_id, kind, input, expected_output, weight, timeout_ms
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      question_id = excluded.question_id,
      kind = excluded.kind,
      input = excluded.input,
      expected_output = excluded.expected_output,
      weight = excluded.weight,
      timeout_ms = excluded.timeout_ms;
  `);

  const insertRubric = db.prepare(`
    INSERT INTO project_rubrics (
      id, question_id, criteria
    ) VALUES (?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      question_id = excluded.question_id,
      criteria = excluded.criteria;
  `);

  const now = new Date().toISOString();

  for (const file of files) {
    const raw = readFileSync(resolve(seedsDir, file), 'utf-8');
    const data = JSON.parse(raw);
    const domainId = data.domainId;
    const version = data.version || 1;

    // 1. Seed MCQs
    if (Array.isArray(data.questions)) {
      for (const q of data.questions) {
        insertQuestion.run(
          q.id,
          version,
          domainId,
          q.skillId,
          q.type || 'mcq',
          q.difficulty || 1,
          q.prompt,
          JSON.stringify(q.options || []),
          JSON.stringify(q.correct || {}),
          q.explanation || '',
          q.starterCode || null,
          q.language || null,
          'active',
          now
        );
        questionCount++;
      }
    }

    // 2. Seed Coding Tasks
    if (Array.isArray(data.codingTasks)) {
      for (const task of data.codingTasks) {
        insertQuestion.run(
          task.id,
          version,
          domainId,
          task.skillId,
          task.type || 'code',
          task.difficulty || 2,
          task.prompt,
          '[]',
          '{}',
          task.explanation || '',
          task.starterCode || '',
          task.language || 'javascript',
          'active',
          now
        );
        questionCount++;

        if (Array.isArray(task.visibleTests)) {
          for (const vt of task.visibleTests) {
            insertTest.run(
              vt.id,
              task.id,
              'visible',
              vt.input,
              vt.expectedOutput,
              vt.weight || 1.0,
              vt.timeoutMs || 3000
            );
            testCount++;
          }
        }

        if (Array.isArray(task.hiddenTests)) {
          for (const ht of task.hiddenTests) {
            insertTest.run(
              ht.id,
              task.id,
              'hidden',
              ht.input,
              ht.expectedOutput,
              ht.weight || 1.0,
              ht.timeoutMs || 3000
            );
            testCount++;
          }
        }
      }
    }

    // 3. Seed SQL Tasks
    if (Array.isArray(data.sqlTasks)) {
      for (const task of data.sqlTasks) {
        insertQuestion.run(
          task.id,
          version,
          domainId,
          task.skillId,
          task.type || 'sql',
          task.difficulty || 2,
          task.prompt,
          '[]',
          '{}',
          task.explanation || '',
          task.starterCode || '',
          'sql',
          'active',
          now
        );
        questionCount++;

        if (Array.isArray(task.visibleTests)) {
          for (const vt of task.visibleTests) {
            insertTest.run(
              vt.id,
              task.id,
              'visible',
              vt.input,
              vt.expectedOutput,
              vt.weight || 1.0,
              vt.timeoutMs || 3000
            );
            testCount++;
          }
        }

        if (Array.isArray(task.hiddenTests)) {
          for (const ht of task.hiddenTests) {
            insertTest.run(
              ht.id,
              task.id,
              'hidden',
              ht.input,
              ht.expectedOutput,
              ht.weight || 1.0,
              ht.timeoutMs || 3000
            );
            testCount++;
          }
        }
      }
    }

    // 4. Seed Projects
    if (Array.isArray(data.projects)) {
      for (const proj of data.projects) {
        insertQuestion.run(
          proj.id,
          version,
          domainId,
          proj.skillId,
          proj.type || 'project',
          proj.difficulty || 3,
          proj.prompt,
          '[]',
          '{}',
          proj.explanation || '',
          proj.starterCode || '',
          null,
          'active',
          now
        );
        questionCount++;

        if (Array.isArray(proj.rubric)) {
          insertRubric.run(
            `rubric-${proj.id}`,
            proj.id,
            JSON.stringify(proj.rubric)
          );
          rubricCount++;
        }
      }
    }
  }

  return { questionCount, testCount, rubricCount };
}

// If invoked directly
if (process.argv[1]?.endsWith('assessmentSeeder.js')) {
  try {
    const res = seedAssessmentBank();
    console.log(`Seeded question bank: ${res.questionCount} questions, ${res.testCount} tests, ${res.rubricCount} rubrics.`);
  } catch (err) {
    console.error('Failed to seed assessment bank:', err);
    process.exit(1);
  }
}
