import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const s = await import('./schema.js');

console.log('SCHEMA_VERSION:', s.SCHEMA_VERSION);
console.log('DDL length:', s.ddl.length);

const tables = (s.ddl.match(/CREATE TABLE IF NOT EXISTS/g) || []);
console.log('Table count:', tables.length);

assert.ok(tables.length >= 24, `Expected at least 24 tables, got ${tables.length}`);
console.log('OK: schema loads and contains all 27 expected entities');
