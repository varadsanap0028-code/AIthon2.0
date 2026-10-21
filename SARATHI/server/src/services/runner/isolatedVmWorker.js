import ivm from 'isolated-vm';

async function main() {
  let inputData = '';
  process.stdin.setEncoding('utf8');

  for await (const chunk of process.stdin) {
    inputData += chunk;
  }

  if (!inputData.trim()) {
    process.stdout.write(JSON.stringify({ error: 'No input provided' }));
    process.exit(1);
  }

  const payload = JSON.parse(inputData);
  const { code, tests = [], limits = {} } = payload;
  const memoryLimitMb = limits.memoryLimitMb || 128;
  const globalTimeoutMs = limits.timeoutMs || 4000;
  const outputMaxBytes = limits.outputMaxBytes || 20480;

  const isolate = new ivm.Isolate({ memoryLimit: memoryLimitMb });
  const context = isolate.createContextSync();
  const jail = context.global;
  jail.setSync('global', jail.derefInto());

  let capturedStdout = '';
  let capturedStderr = '';

  const appendStdout = (msg) => {
    if (capturedStdout.length < outputMaxBytes) {
      capturedStdout += msg + '\n';
      if (capturedStdout.length > outputMaxBytes) {
        capturedStdout = capturedStdout.slice(0, outputMaxBytes) + '\n[Output truncated: limit reached]';
      }
    }
  };

  const appendStderr = (msg) => {
    if (capturedStderr.length < outputMaxBytes) {
      capturedStderr += msg + '\n';
      if (capturedStderr.length > outputMaxBytes) {
        capturedStderr = capturedStderr.slice(0, outputMaxBytes) + '\n[Error output truncated]';
      }
    }
  };

  jail.setSync('_log', new ivm.Callback((...args) => appendStdout(args.join(' '))));
  jail.setSync('_err', new ivm.Callback((...args) => appendStderr(args.join(' '))));

  // Initialize CommonJS environment inside isolate (completely sandboxed from Node host)
  context.evalSync(`
    var module = { exports: {} };
    var exports = module.exports;
    function require(p) {
      if (typeof p === 'string' && (p.includes('solution') || p === '.' || p === './solution')) {
        return module.exports;
      }
      throw new Error('Access denied: require(' + JSON.stringify(p) + ') is prohibited in sandbox.');
    }
    var console = {
      log: (...args) => _log(...args),
      warn: (...args) => _log(...args),
      error: (...args) => _err(...args),
    };
  `);

  // Evaluate candidate code in a module closure
  let evalError = null;
  try {
    const wrappedCandidateCode = `
      (function(module, exports) {
        ${code || ''}
      })(module, exports);
    `;
    const script = isolate.compileScriptSync(wrappedCandidateCode, { filename: 'candidate.js' });
    script.runSync(context, { timeout: globalTimeoutMs });
  } catch (err) {
    evalError = err.message || String(err);
    appendStderr('Compilation/Initialization Error: ' + evalError);
  }

  const results = [];
  let timedOut = false;
  let testStdout = '';

  for (const t of tests) {
    if (evalError) {
      results.push({
        id: t.id,
        kind: t.kind,
        passed: false,
        actual: '',
        expected: t.expectedOutput,
        executionTimeMs: 0,
        error: evalError,
      });
      continue;
    }

    const tTimeout = t.timeoutMs || globalTimeoutMs;
    const testCode = `
      (function() {
        ${t.input || ''}
      })();
    `;

    const start = Date.now();
    let passed = false;
    let actual = '';
    let testErr = null;

    // Reset single-test capture
    const prevStdoutLen = capturedStdout.length;

    try {
      const script = isolate.compileScriptSync(testCode, { filename: `test_${t.id}.js` });
      script.runSync(context, { timeout: tTimeout });
      actual = capturedStdout.slice(prevStdoutLen).trim();
      const expected = (t.expectedOutput || '').trim();
      passed = actual === expected;
    } catch (err) {
      const isTimeout = err.message?.includes('Script execution timed out') || err.message?.includes('timed out');
      if (isTimeout) timedOut = true;
      testErr = isTimeout ? 'TIMEOUT' : (err.message || String(err));
      actual = testErr;
      appendStderr(`Test ${t.id} Error: ${testErr}`);
    }

    const duration = Date.now() - start;

    results.push({
      id: t.id,
      kind: t.kind,
      passed,
      actual,
      expected: t.expectedOutput,
      executionTimeMs: duration,
      error: testErr,
    });
  }

  try { isolate.dispose(); } catch {}

  const passedCount = results.filter(r => r.passed).length;
  const failedCount = results.length - passedCount;

  process.stdout.write(JSON.stringify({
    status: (failedCount === 0 && !timedOut) ? 'success' : 'failed',
    passed: passedCount,
    failed: failedCount,
    total: tests.length,
    timedOut,
    stdout: capturedStdout.trim(),
    stderr: capturedStderr.trim(),
    results,
  }));
}

main().catch(err => {
  process.stdout.write(JSON.stringify({
    status: 'error',
    passed: 0,
    failed: 1,
    total: 1,
    timedOut: false,
    stdout: '',
    stderr: err.message || String(err),
    results: [],
  }));
  process.exit(0);
});
