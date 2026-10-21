import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { LocalDevDriver } from '../../services/runner/localDevDriver.js';
import { SqlDriver } from '../../services/runner/sqlDriver.js';
import { Judge0Driver } from '../../services/runner/judge0Driver.js';
import { RunnerDriver } from '../../services/runner/runnerDriver.js';

describe('RunnerDriver Architecture & Security Bounds', () => {
  test('1. LocalDevDriver: executes valid JavaScript and validates output', async () => {
    const driver = new LocalDevDriver();
    const result = await driver.run({
      language: 'javascript',
      code: 'function add(a, b) { return a + b; } module.exports = { add };',
      tests: [
        { id: 't1', kind: 'visible', input: 'const { add } = require("./solution"); console.log(add(2, 3));', expectedOutput: '5' },
        { id: 't2', kind: 'visible', input: 'const { add } = require("./solution"); console.log(add(10, -5));', expectedOutput: '5' },
      ],
      limits: { timeoutMs: 3000 },
    });

    assert.equal(result.status, 'success');
    assert.equal(result.passed, 2);
    assert.equal(result.total, 2);
    assert.ok(result.isolationNotice.includes('DEVELOPMENT ONLY'));
  });

  test('2. LocalDevDriver: strictly terminates infinite loops within timeout limit', async () => {
    const driver = new LocalDevDriver();
    const start = Date.now();
    const result = await driver.run({
      language: 'javascript',
      code: 'function loop() { while(true){} } module.exports = { loop };',
      tests: [
        { id: 't-inf', kind: 'visible', input: 'const { loop } = require("./solution"); loop();', expectedOutput: 'done', timeoutMs: 1500 },
      ],
      limits: { timeoutMs: 1500 },
    });

    const elapsed = Date.now() - start;
    assert.equal(result.passed, 0);
    assert.equal(result.results[0].error, 'TIMEOUT');
    assert.ok(elapsed < 4000, `Execution should be terminated around 1500ms, elapsed: ${elapsed}ms`);
  });

  test('3. LocalDevDriver: refuses to run when NODE_ENV=production', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const driver = new LocalDevDriver();

    await assert.rejects(
      async () => {
        await driver.run({ language: 'javascript', code: 'console.log(1);', tests: [] });
      },
      (err) => {
        assert.ok(err.message.includes('FATAL SECURITY VIOLATION'));
        return true;
      }
    );

    process.env.NODE_ENV = originalEnv;
  });

  test('4. SqlDriver: executes read-only SELECT queries on seeded tables', async () => {
    const driver = new SqlDriver();
    const result = await driver.run({
      code: "SELECT count(*) FROM orders WHERE status='completed';",
      tests: [
        { id: 's1', kind: 'visible', input: "SELECT count(*) FROM orders WHERE status='completed';", expectedOutput: '4' },
      ],
    });

    assert.equal(result.status, 'success');
    assert.equal(result.passed, 1);
  });

  test('5. SqlDriver: strictly blocks and rejects mutating statements (DROP, INSERT, UPDATE, DELETE)', async () => {
    const driver = new SqlDriver();
    const queries = [
      'DROP TABLE orders;',
      'INSERT INTO orders VALUES (99, 1, 10, "pending", "2026-10-17");',
      'UPDATE orders SET amount=0;',
      'DELETE FROM orders WHERE id=1;',
    ];

    for (const q of queries) {
      const result = await driver.run({
        code: q,
        tests: [{ id: 'sec-1', kind: 'visible', input: q, expectedOutput: '0' }],
      });

      assert.equal(result.status, 'failed', `Mutating statement should fail: ${q}`);
      assert.ok(result.stderr.includes('Mutating SQL statements are prohibited'));
    }
  });

  test('6. Judge0Driver: handles unreachable Docker service gracefully with diagnostic message', async () => {
    const driver = new Judge0Driver();
    // Point to non-existent endpoint
    driver.baseUrl = 'http://127.0.0.1:59999';

    const result = await driver.run({
      language: 'javascript',
      code: 'console.log("hello");',
      tests: [{ id: 'j1', kind: 'visible', input: '', expectedOutput: 'hello' }],
    });

    assert.equal(result.status, 'error');
    assert.ok(result.stderr.includes('Failed to connect to Judge0'));
  });

  test('7. RunnerDriver Factory: selects appropriate driver', () => {
    const sqlDriver = RunnerDriver.getDriver('sql');
    assert.ok(sqlDriver instanceof SqlDriver);

    const devDriver = RunnerDriver.getDriver('javascript', 'local-dev');
    assert.ok(devDriver instanceof LocalDevDriver);

    const j0Driver = RunnerDriver.getDriver('javascript', 'judge0');
    assert.ok(j0Driver instanceof Judge0Driver);
  });
});
