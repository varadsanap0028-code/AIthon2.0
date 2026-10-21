import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const p = path.resolve(__dirname, 'schema.js');
let s = fs.readFileSync(p, 'utf8');
const markers = [
  'test_step1',
  'test_tbl',
  'test_sq',
  'test_step',
  'long_test',
  'comment line',
  'test insert',
  'TEST',
];
let lines = s.split('\n');
lines = lines.filter((l) => !markers.some((m) => l.includes(m)));
s = lines.join('\n');
fs.writeFileSync(p, s, 'utf8');
console.log('cleaned, total lines =', s.split('\n').length);

