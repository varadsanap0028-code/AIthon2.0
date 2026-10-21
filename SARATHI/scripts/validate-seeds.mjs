import { readdirSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SEEDS_DIR = resolve(__dirname, '../server/src/data/seeds/assessment');

function validateSeeds() {
  console.log(`[validate-seeds] Inspecting seed files in: ${SEEDS_DIR}`);
  const files = readdirSync(SEEDS_DIR).filter(f => f.endsWith('.json'));

  if (files.length === 0) {
    console.error('ERROR: No JSON seed files found in directory.');
    process.exit(1);
  }

  const seenIds = new Map();
  const errors = [];
  let totalMcqs = 0;
  let totalCode = 0;
  let totalProjects = 0;

  for (const file of files) {
    const filePath = resolve(SEEDS_DIR, file);
    let data;
    try {
      const content = readFileSync(filePath, 'utf8');
      data = JSON.parse(content);
    } catch (err) {
      errors.push(`[${file}] Invalid JSON: ${err.message}`);
      continue;
    }

    if (!data.domainId) {
      errors.push(`[${file}] Missing top-level domainId`);
    }

    // 1. Validate MCQs
    const mcqs = data.mcqs || data.questions || [];
    for (const q of mcqs) {
      totalMcqs++;
      if (!q.id) {
        errors.push(`[${file}] MCQ missing id`);
      } else {
        if (seenIds.has(q.id)) {
          errors.push(`[${file}] Duplicate question ID "${q.id}" (previously in ${seenIds.get(q.id)})`);
        }
        seenIds.set(q.id, file);
      }

      if (q.type && q.type !== 'mcq') {
        errors.push(`[${file}] Question ${q.id} in mcqs array has unexpected type: ${q.type}`);
      }

      if (![1, 2, 3].includes(q.difficulty)) {
        errors.push(`[${file}] Question ${q.id} has invalid difficulty: ${q.difficulty} (must be 1, 2, or 3)`);
      }

      if (!q.prompt || typeof q.prompt !== 'string') {
        errors.push(`[${file}] Question ${q.id} missing prompt`);
      }

      if (!Array.isArray(q.options) || q.options.length < 2) {
        errors.push(`[${file}] Question ${q.id} must have at least 2 options`);
      }

      if (q.correct === undefined || q.correct === null) {
        errors.push(`[${file}] Question ${q.id} missing correct answer`);
      }
    }

    // 2. Validate Coding / SQL Tasks
    const codeTasks = data.codingTasks || [];
    for (const c of codeTasks) {
      totalCode++;
      if (!c.id) {
        errors.push(`[${file}] Coding task missing id`);
      } else {
        if (seenIds.has(c.id)) {
          errors.push(`[${file}] Duplicate task ID "${c.id}" (previously in ${seenIds.get(c.id)})`);
        }
        seenIds.set(c.id, file);
      }

      if (!['code', 'sql'].includes(c.type)) {
        errors.push(`[${file}] Coding task ${c.id} has invalid type: ${c.type}`);
      }

      if (![1, 2, 3].includes(c.difficulty)) {
        errors.push(`[${file}] Coding task ${c.id} has invalid difficulty: ${c.difficulty}`);
      }

      if (!c.prompt) {
        errors.push(`[${file}] Coding task ${c.id} missing prompt`);
      }

      if (c.starterCode === undefined) {
        errors.push(`[${file}] Coding task ${c.id} missing starterCode`);
      }

      // Check visible tests
      const visible = c.visibleTests || [];
      if (!Array.isArray(visible) || visible.length === 0) {
        errors.push(`[${file}] Coding task ${c.id} must have at least 1 visible test case`);
      }

      // Check hidden tests: Must have at least 2 hidden tests per task
      const hidden = c.hiddenTests || [];
      if (!Array.isArray(hidden) || hidden.length < 2) {
        errors.push(`[${file}] Coding task ${c.id} must have >= 2 hidden tests (found ${hidden.length})`);
      }

      // Validate test structure
      const allTests = [...visible, ...hidden];
      for (const t of allTests) {
        if (!t.id || !t.kind || t.input === undefined || t.expectedOutput === undefined) {
          errors.push(`[${file}] Coding task ${c.id} test ${t.id || 'unknown'} missing required fields (id, kind, input, expectedOutput)`);
        }
      }
    }

    // 3. Validate Project Tasks (if present)
    const projectTasks = data.projectTasks || [];
    for (const p of projectTasks) {
      totalProjects++;
      if (!p.id) {
        errors.push(`[${file}] Project task missing id`);
      } else {
        if (seenIds.has(p.id)) {
          errors.push(`[${file}] Duplicate project ID "${p.id}" (previously in ${seenIds.get(p.id)})`);
        }
        seenIds.set(p.id, file);
      }

      if (p.type !== 'project') {
        errors.push(`[${file}] Project task ${p.id} must have type "project"`);
      }

      if (!p.prompt) {
        errors.push(`[${file}] Project task ${p.id} missing prompt`);
      }
    }
  }

  if (errors.length > 0) {
    console.error(`\nValidation FAILED with ${errors.length} error(s):`);
    for (const err of errors) {
      console.error(`  - ${err}`);
    }
    process.exit(1);
  }

  console.log(`\nValidation PASSED successfully!`);
  console.log(`  - Files checked: ${files.length}`);
  console.log(`  - Total Unique IDs: ${seenIds.size}`);
  console.log(`  - MCQs validated: ${totalMcqs}`);
  console.log(`  - Code/SQL Tasks validated: ${totalCode} (all have >= 2 hidden tests)`);
  console.log(`  - Project Tasks validated: ${totalProjects}`);
}

validateSeeds();
