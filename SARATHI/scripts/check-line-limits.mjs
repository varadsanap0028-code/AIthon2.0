import { readdirSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ASSESSMENT_COMPONENTS_DIR = resolve(__dirname, '../src/components/assessment');
const MAX_LINES = 200;

function checkLineLimits() {
  console.log(`[check-line-limits] Verifying max ${MAX_LINES} lines in: ${ASSESSMENT_COMPONENTS_DIR}`);
  const files = readdirSync(ASSESSMENT_COMPONENTS_DIR).filter(f => f.endsWith('.tsx') || f.endsWith('.ts'));

  const violations = [];
  for (const file of files) {
    const fullPath = resolve(ASSESSMENT_COMPONENTS_DIR, file);
    const content = readFileSync(fullPath, 'utf8');
    const lineCount = content.split('\n').length;

    console.log(`  - ${file}: ${lineCount} lines`);
    if (lineCount > MAX_LINES) {
      violations.push({ file, lineCount });
    }
  }

  if (violations.length > 0) {
    console.error(`\nFAILED: ${violations.length} file(s) exceed the ${MAX_LINES} line limit:`);
    for (const v of violations) {
      console.error(`  - ${v.file}: ${v.lineCount} lines (exceeds limit by ${v.lineCount - MAX_LINES})`);
    }
    process.exit(1);
  }

  console.log(`\nSUCCESS: All ${files.length} assessment component files are strictly under ${MAX_LINES} lines.`);
}

checkLineLimits();
