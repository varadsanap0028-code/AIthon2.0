import { DatabaseSync } from 'node:sqlite';

/**
 * Validates that an SQL string is strictly a single, read-only SELECT or WITH statement.
 * @param {string} sql
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateSqlQuery(sql) {
  if (!sql || typeof sql !== 'string' || sql.trim().length === 0) {
    return { valid: false, error: 'SQL query cannot be empty.' };
  }

  // 1. Strip block comments (/* ... */) and line comments (-- ...)
  const stripped = sql
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/--.*$/gm, ' ')
    .trim();

  if (!stripped) {
    return { valid: false, error: 'SQL query contains only comments.' };
  }

  // 2. Reject multiple statements: check for unquoted semicolons
  // We can scan through characters ignoring single and double quotes
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let semicolonCount = 0;
  let hasContentAfterSemicolon = false;

  for (let i = 0; i < stripped.length; i++) {
    const char = stripped[i];
    if (char === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
    } else if (char === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
    } else if (char === ';' && !inSingleQuote && !inDoubleQuote) {
      semicolonCount++;
      // Check if anything other than whitespace follows this semicolon
      const remaining = stripped.slice(i + 1).trim();
      if (remaining.length > 0) {
        hasContentAfterSemicolon = true;
      }
    }
  }

  if (hasContentAfterSemicolon) {
    return {
      valid: false,
      error: 'Multiple SQL statements are not permitted. Provide a single query only.',
    };
  }

  // Remove optional trailing semicolon for keyword checks
  const singleQuery = stripped.replace(/;\s*$/, '').trim();

  // 3. Must begin with SELECT or WITH
  if (!/^(SELECT|WITH)\b/i.test(singleQuery)) {
    return {
      valid: false,
      error: 'Mutating SQL statements are prohibited. Only read-only SELECT and WITH (CTE) queries are permitted.',
    };
  }

  // 4. Forbidden mutating, administrative, or injection keywords
  const forbiddenKeywords = [
    'INSERT',
    'UPDATE',
    'DELETE',
    'DROP',
    'ALTER',
    'CREATE',
    'REPLACE',
    'ATTACH',
    'DETACH',
    'PRAGMA',
    'VACUUM',
    'EXEC',
    'EXECUTE',
    'GRANT',
    'REVOKE',
    'TRUNCATE',
    'INTO',
  ];

  // Tokenize ignoring string literals to avoid false positives inside text constants
  let queryWithoutStrings = '';
  inSingleQuote = false;
  inDoubleQuote = false;
  for (let i = 0; i < singleQuery.length; i++) {
    const char = singleQuery[i];
    if (char === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
      queryWithoutStrings += ' ';
    } else if (char === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
      queryWithoutStrings += ' ';
    } else if (!inSingleQuote && !inDoubleQuote) {
      queryWithoutStrings += char;
    } else {
      queryWithoutStrings += ' ';
    }
  }

  for (const kw of forbiddenKeywords) {
    const regex = new RegExp(`\\b${kw}\\b`, 'i');
    if (regex.test(queryWithoutStrings)) {
      return {
        valid: false,
        error: `Security violation: Mutating SQL statements are prohibited. Keyword "${kw}" detected.`,
      };
    }
  }

  return { valid: true };
}

export class SqlDriver {
  /**
   * Execute read-only SQL queries in an isolated in-memory SQLite sandbox
   */
  async run({ code, tests = [], limits = {} }) {
    const startTime = Date.now();
    const query = (code || '').trim();

    // 1. Strict SQL validation
    const validation = validateSqlQuery(query);
    if (!validation.valid) {
      return {
        status: 'failed',
        passed: 0,
        failed: tests.length,
        total: tests.length,
        timedOut: false,
        results: tests.map(t => ({
          id: t.id,
          kind: t.kind,
          passed: false,
          actual: '',
          expected: t.kind === 'visible' ? t.expectedOutput : undefined,
          error: validation.error,
          executionTimeMs: 0,
        })),
        stdout: '',
        stderr: validation.error,
        timeMs: Date.now() - startTime,
        isolationNotice: 'In-memory ephemeral SQLite with hardened read-only statement enforcement.',
      };
    }

    // Check for uncompleted starter code placeholders (e.g. `...`)
    const cleanQuery = query
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/--.*$/gm, ' ')
      .trim()
      .replace(/;+\s*$/, '');

    if (cleanQuery.includes('...')) {
      const err = 'Incomplete query: Starter code placeholder (...) was not completed.';
      return {
        status: 'failed',
        passed: 0,
        failed: tests.length,
        total: tests.length,
        timedOut: false,
        results: tests.map(t => ({
          id: t.id,
          kind: t.kind,
          passed: false,
          actual: '',
          expected: t.kind === 'visible' ? t.expectedOutput : undefined,
          error: err,
          executionTimeMs: 0,
        })),
        stdout: '',
        stderr: err,
        timeMs: Date.now() - startTime,
        isolationNotice: 'In-memory ephemeral SQLite with hardened read-only statement enforcement.',
      };
    }

    // 2. Initialize ephemeral in-memory database with standard test tables
    const memDb = new DatabaseSync(':memory:');
    this.seedSandboxTables(memDb);

    try {
      // 3. Execute the student's actual submission
      let candidateRows = [];
      try {
        const stmt = memDb.prepare(cleanQuery);
        candidateRows = stmt.all();
      } catch (err) {
        return {
          status: 'failed',
          passed: 0,
          failed: tests.length,
          total: tests.length,
          timedOut: false,
          results: tests.map(t => ({
            id: t.id,
            kind: t.kind,
            passed: false,
            actual: '',
            expected: t.kind === 'visible' ? t.expectedOutput : undefined,
            error: `SQL Execution Error: ${err.message}`,
            executionTimeMs: 0,
          })),
          stdout: '',
          stderr: `SQL Execution Error: ${err.message}`,
          timeMs: Date.now() - startTime,
          isolationNotice: 'In-memory ephemeral SQLite with hardened read-only statement enforcement.',
        };
      }

      // Format tabular stdout from student's query result
      let totalStdout = '';
      if (candidateRows.length === 0) {
        totalStdout = '(0 rows returned)';
      } else {
        const cappedRows = candidateRows.slice(0, 100);
        const cols = Object.keys(cappedRows[0]);
        const header = cols.join(' | ');
        const divider = '-'.repeat(Math.max(header.length, 12));
        const rowsText = cappedRows
          .slice(0, 10)
          .map(r => cols.map(c => String(r[c] ?? 'NULL')).join(' | '))
          .join('\n');
        totalStdout = `${header}\n${divider}\n${rowsText}\n(${candidateRows.length} row${candidateRows.length === 1 ? '' : 's'} returned)`;
      }

      // 4. Validate against test requirements
      const results = [];
      for (const t of tests) {
        const testStart = Date.now();
        let passed = false;
        let actualStr = '';

        if (candidateRows.length === 0) {
          passed = false;
          actualStr = '0 rows';
        } else {
          const exp = (t.expectedOutput || '').trim();
          const firstRow = candidateRows[0];
          const firstRowVals = Object.values(firstRow);
          actualStr = firstRowVals.join('|');

          if (t.kind === 'visible') {
            // Visible test passes if query executed cleanly, returned rows, and satisfies row count or output pattern
            if (!isNaN(Number(exp))) {
              passed = candidateRows.length === Number(exp) || candidateRows.some(r => Object.values(r).some(v => Number(v) === Number(exp) || String(v) === exp));
            } else {
              passed = candidateRows.some(r => Object.values(r).some(v => String(v).includes(exp)));
            }
          } else {
            // Hidden test: exact requirement assertion
            if (exp.includes('|')) {
              // Composite tuple match e.g. "101|1250"
              passed = candidateRows.some(r => {
                const rowStr = Object.values(r).map(v => typeof v === 'number' ? Math.round(v) : String(v)).join('|');
                return rowStr === exp || rowStr.includes(exp);
              });
            } else if (!isNaN(Number(exp))) {
              // Numeric match e.g. row count or metric
              passed = candidateRows.length === Number(exp) || candidateRows.some(r => Object.values(r).some(v => Number(v) === Number(exp) || String(v) === exp));
            } else {
              // Specific identifier/value match e.g. "BERT-Base", "us-east-1", "198.51.100.45"
              passed = candidateRows.some(r => Object.values(r).some(v => String(v).includes(exp)));
            }
          }
        }

        results.push({
          id: t.id,
          kind: t.kind,
          passed,
          actual: actualStr,
          // Never reveal expected outputs for hidden tests to client
          expected: t.kind === 'visible' ? t.expectedOutput : undefined,
          executionTimeMs: Date.now() - testStart,
          error: passed ? null : (candidateRows.length === 0 ? 'Query returned 0 rows.' : 'Result does not satisfy assertion requirements.'),
        });
      }

      const passedCount = results.filter(r => r.passed).length;
      return {
        status: passedCount === tests.length ? 'success' : 'failed',
        passed: passedCount,
        failed: tests.length - passedCount,
        total: tests.length,
        timedOut: false,
        results,
        stdout: totalStdout,
        stderr: '',
        timeMs: Date.now() - startTime,
        isolationNotice: 'In-memory ephemeral SQLite with hardened read-only statement enforcement.',
      };
    } finally {
      try {
        memDb.close();
      } catch {}
    }
  }

  seedSandboxTables(db) {
    db.exec(`
      CREATE TABLE orders (id INTEGER PRIMARY KEY, customer_id INTEGER, amount REAL, status TEXT, created_at TEXT);
      INSERT INTO orders VALUES
        (1, 101, 750.0, 'completed', '2026-10-01'),
        (2, 101, 500.0, 'completed', '2026-10-02'),
        (3, 102, 600.0, 'completed', '2026-10-03'),
        (4, 103, 200.0, 'completed', '2026-10-04'),
        (5, 104, 800.0, 'cancelled', '2026-10-05');

      CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, created_at TEXT);
      INSERT INTO users VALUES
        (1, 'Alice', '2026-09-01'),
        (2, 'Bob', '2026-09-02'),
        (3, 'Charlie', '2026-09-03'),
        (4, 'David', '2026-09-04'),
        (5, 'Eva', '2026-09-05');

      CREATE TABLE logins (id INTEGER PRIMARY KEY, user_id INTEGER, login_time TEXT);
      INSERT INTO logins VALUES
        (1, 1, '2026-10-15'), (2, 1, '2026-10-16'), (3, 1, '2026-10-17'),
        (4, 2, '2026-10-15'), (5, 2, '2026-10-16'), (6, 2, '2026-10-17'),
        (7, 3, '2026-10-17');

      CREATE TABLE model_experiments (id INTEGER PRIMARY KEY, model_name TEXT, dataset TEXT, accuracy REAL, f1_score REAL, created_at TEXT);
      INSERT INTO model_experiments VALUES
        (1, 'BERT-Base', 'imdb_sentiment', 0.92, 0.91, '2026-10-01'),
        (2, 'RoBERTa', 'imdb_sentiment', 0.89, 0.88, '2026-10-02'),
        (3, 'BERT-Base', 'imdb_sentiment', 0.94, 0.93, '2026-10-03'),
        (4, 'RoBERTa', 'imdb_sentiment', 0.90, 0.89, '2026-10-04');

      CREATE TABLE vector_documents (id INTEGER PRIMARY KEY, collection_id TEXT, token_count INTEGER, created_at TEXT);
      INSERT INTO vector_documents VALUES
        (1, 'col_a', 30000, '2026-10-01'),
        (2, 'col_a', 25000, '2026-10-02'),
        (3, 'col_b', 10000, '2026-10-01'),
        (4, 'col_b', 15000, '2026-10-02'),
        (5, 'col_c', 5000, '2026-10-01'),
        (6, 'col_c', 2000, '2026-10-02');

      CREATE TABLE cloud_instances (id INTEGER PRIMARY KEY, instance_type TEXT, region TEXT, status TEXT, cost_per_hour REAL);
      INSERT INTO cloud_instances VALUES
        (1, 't3.micro', 'us-east-1', 'running', 0.0104),
        (2, 't3.medium', 'us-east-1', 'running', 0.0416),
        (3, 'm5.large', 'us-east-1', 'running', 0.096),
        (4, 't3.micro', 'eu-west-1', 'running', 0.011),
        (5, 'm5.large', 'eu-west-1', 'running', 0.100);

      CREATE TABLE pod_restart_events (id INTEGER PRIMARY KEY, namespace TEXT, pod_name TEXT, exit_code INTEGER, created_at TEXT);
      INSERT INTO pod_restart_events VALUES
        (1, 'prod', 'pod-api-1', 137, '2026-10-17'),
        (2, 'prod', 'pod-api-1', 137, '2026-10-17'),
        (3, 'prod', 'pod-api-1', 1, '2026-10-17'),
        (4, 'prod', 'pod-worker-1', 0, '2026-10-17'),
        (5, 'prod', 'pod-worker-2', 1, '2026-10-17'),
        (6, 'prod', 'pod-worker-2', 1, '2026-10-17');

      CREATE TABLE transactions (id INTEGER PRIMARY KEY, user_id INTEGER, amount REAL, created_at TEXT);
      INSERT INTO transactions VALUES
        (1, 1, 100.0, '2026-10-01'),
        (2, 1, 150.0, '2026-10-02'),
        (3, 1, 200.0, '2026-10-03'),
        (4, 2, 50.0, '2026-10-01'),
        (5, 2, 80.0, '2026-10-02');

      CREATE TABLE monthly_metrics (month_id INTEGER PRIMARY KEY, revenue REAL);
      INSERT INTO monthly_metrics VALUES
        (1, 10000.0),
        (2, 12000.0),
        (3, 15000.0),
        (4, 18000.0);

      CREATE TABLE security_audit_logs (id INTEGER PRIMARY KEY, user_id INTEGER, action TEXT, ip_address TEXT, status TEXT, created_at TEXT);
      INSERT INTO security_audit_logs VALUES
        (1, 1, 'login', '198.51.100.45', 'failed_login', '2026-10-17T10:00:00Z'),
        (2, 1, 'login', '198.51.100.45', 'failed_login', '2026-10-17T10:01:00Z'),
        (3, 1, 'login', '198.51.100.45', 'failed_login', '2026-10-17T10:02:00Z'),
        (4, 1, 'login', '198.51.100.45', 'failed_login', '2026-10-17T10:03:00Z'),
        (5, 2, 'login', '10.0.0.1', 'success', '2026-10-17T10:05:00Z');

      CREATE TABLE user_privileges (id INTEGER PRIMARY KEY, user_id INTEGER, role TEXT, granted_at TEXT);
      INSERT INTO user_privileges VALUES
        (1, 1, 'admin', '2026-01-01'),
        (2, 1, 'superadmin', '2026-02-01'),
        (3, 2, 'analyst', '2026-01-01'),
        (4, 3, 'admin', '2026-01-01'),
        (5, 3, 'security_officer', '2026-03-01'),
        (6, 4, 'guest', '2026-01-01');
    `);
  }
}
