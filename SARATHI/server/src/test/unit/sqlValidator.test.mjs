import test from 'node:test';
import assert from 'node:assert/strict';
import { validateSqlQuery } from '../../services/runner/sqlDriver.js';

test('validateSqlQuery - permits valid SELECT queries', () => {
  const validQueries = [
    'SELECT * FROM orders',
    'SELECT id, name FROM users WHERE id = 1;',
    'SELECT COUNT(*), AVG(amount) FROM orders GROUP BY customer_id',
    'SELECT u.name, o.amount FROM users u JOIN orders o ON u.id = o.customer_id',
    `SELECT 'This is a test with a semicolon ; inside string' AS greeting`,
  ];

  for (const q of validQueries) {
    const res = validateSqlQuery(q);
    assert.equal(res.valid, true, `Expected valid for: ${q}, got error: ${res.error}`);
  }
});

test('validateSqlQuery - permits valid WITH (CTE) queries', () => {
  const cte = `
    WITH high_value AS (
      SELECT customer_id, SUM(amount) AS total
      FROM orders
      GROUP BY customer_id
      HAVING total > 500
    )
    SELECT * FROM high_value;
  `;
  const res = validateSqlQuery(cte);
  assert.equal(res.valid, true, `Expected valid CTE, got: ${res.error}`);
});

test('validateSqlQuery - rejects multiple statements', () => {
  const multiStatements = [
    'SELECT 1; DROP TABLE orders;',
    'SELECT 1; SELECT 2;',
    'SELECT * FROM users; DELETE FROM orders;',
  ];

  for (const q of multiStatements) {
    const res = validateSqlQuery(q);
    assert.equal(res.valid, false, `Expected reject multi statement: ${q}`);
    assert.match(res.error, /Multiple SQL statements are not permitted/i);
  }
});

test('validateSqlQuery - rejects mutating and administrative statements', () => {
  const dangerous = [
    'INSERT INTO users (id, name) VALUES (99, "Hacker")',
    'UPDATE orders SET amount = 0',
    'DELETE FROM orders WHERE id = 1',
    'DROP TABLE users',
    'ALTER TABLE users ADD COLUMN is_admin INT',
    'CREATE TABLE evil (data TEXT)',
    'PRAGMA table_info(orders)',
    'ATTACH DATABASE ":memory:" AS evil',
    'DETACH DATABASE evil',
    'VACUUM',
  ];

  for (const q of dangerous) {
    const res = validateSqlQuery(q);
    assert.equal(res.valid, false, `Expected rejection for dangerous query: ${q}`);
  }
});

test('validateSqlQuery - rejects empty strings and comment-only inputs', () => {
  assert.equal(validateSqlQuery('').valid, false);
  assert.equal(validateSqlQuery('   ').valid, false);
  assert.equal(validateSqlQuery('-- just a comment').valid, false);
  assert.equal(validateSqlQuery('/* block comment */').valid, false);
});
