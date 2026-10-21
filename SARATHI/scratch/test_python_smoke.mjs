import { RunnerDriver } from '../server/src/services/runner/runnerDriver.js';

console.log('=== Step 4: Python Smoke Test Suite ===');

// 1. print("SARATHI_PYTHON_OK")
console.log('\n--- 1. Simple print ---');
const res1 = await RunnerDriver.run({
  language: 'python',
  code: '',
  tests: [{ id: 't1', kind: 'visible', input: 'print("SARATHI_PYTHON_OK")', expectedOutput: 'SARATHI_PYTHON_OK' }]
});
console.log('Test 1 Passed:', res1.results[0].passed, 'Actual:', res1.results[0].actual);

// 2. Simple function with valid input
console.log('\n--- 2. Simple function valid ---');
const res2 = await RunnerDriver.run({
  language: 'python',
  code: 'def add(a, b): return a + b',
  tests: [{ id: 't2', kind: 'visible', input: 'from solution import add\nprint(add(2, 3))', expectedOutput: '5' }]
});
console.log('Test 2 Passed:', res2.results[0].passed, 'Actual:', res2.results[0].actual);

// 3. Function with incorrect logic
console.log('\n--- 3. Function incorrect logic ---');
const res3 = await RunnerDriver.run({
  language: 'python',
  code: 'def add(a, b): return a - b', // wrong!
  tests: [{ id: 't3', kind: 'visible', input: 'from solution import add\nprint(add(2, 3))', expectedOutput: '5' }]
});
console.log('Test 3 Correctly Failed:', !res3.results[0].passed, 'Actual:', res3.results[0].actual, 'Expected: 5');

// 4. Syntax error
console.log('\n--- 4. Syntax error ---');
const res4 = await RunnerDriver.run({
  language: 'python',
  code: 'def broken(:: def',
  tests: [{ id: 't4', kind: 'visible', input: 'from solution import broken', expectedOutput: '' }]
});
console.log('Test 4 Status:', res4.status, 'Error:', res4.results[0].error?.slice(0, 60));

// 5. Infinite loop timeout
console.log('\n--- 5. Infinite loop timeout ---');
const res5 = await RunnerDriver.run({
  language: 'python',
  code: 'def loop():\n    while True: pass',
  tests: [{ id: 't5', kind: 'visible', input: 'from solution import loop\nloop()', expectedOutput: 'done', timeoutMs: 1500 }],
  limits: { timeoutMs: 1500 }
});
console.log('Test 5 Timed Out:', res5.timedOut, 'Status:', res5.status, 'Error:', res5.results[0].error);
