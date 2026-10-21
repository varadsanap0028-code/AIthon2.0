import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { assessmentV2 } from '../../config/index.js';

export class LocalDevDriver {
  /**
   * Execute code in child process with hard timeouts and sandbox warnings.
   */
  async run({ language = 'javascript', code, tests = [], limits = {} }) {
    // SECURITY GATE: Prohibit local-dev runner in production
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'FATAL SECURITY VIOLATION: LocalDevDriver is strictly prohibited when NODE_ENV=production. ' +
        'Production deployments must configure an isolated runner driver (e.g. Judge0 in Docker).'
      );
    }

    const timeoutMs = limits.timeoutMs || assessmentV2.executionTimeoutMs || 4000;
    const tempDir = mkdtempSync(join(tmpdir(), 'sarathi-run-'));

    try {
      const results = [];
      let totalStdout = '';
      let totalStderr = '';
      let maxTimeMs = 0;

      for (const t of tests) {
        const testRes = await this.runSingleTest({
          language,
          code,
          testInput: t.input,
          expectedOutput: t.expectedOutput,
          timeoutMs: t.timeoutMs || timeoutMs,
          tempDir,
        });

        results.push({
          id: t.id,
          kind: t.kind,
          passed: testRes.passed,
          actual: testRes.actual,
          expected: t.expectedOutput,
          executionTimeMs: testRes.timeMs,
          error: testRes.error,
        });

        if (testRes.stdout) totalStdout += testRes.stdout + '\n';
        if (testRes.stderr) totalStderr += testRes.stderr + '\n';
        if (testRes.timeMs > maxTimeMs) maxTimeMs = testRes.timeMs;
      }

      const passedCount = results.filter(r => r.passed).length;
      const allPassed = tests.length === 0 || passedCount === tests.length;

      return {
        status: allPassed ? 'success' : 'failed',
        passed: passedCount,
        total: tests.length,
        results,
        stdout: totalStdout.trim(),
        stderr: totalStderr.trim(),
        timeMs: maxTimeMs,
        memKb: 0,
        isolationNotice: 'DEVELOPMENT ONLY: Executed via local child_process without OS-level namespace/cgroup isolation.',
      };
    } finally {
      try {
        rmSync(tempDir, { recursive: true, force: true });
      } catch {}
    }
  }

  runSingleTest({ language, code, testInput, expectedOutput, timeoutMs, tempDir }) {
    return new Promise((resolve) => {
      let scriptFile;
      let cmd;
      let args;

      if (language === 'python') {
        const solFile = join(tempDir, 'solution.py');
        writeFileSync(solFile, code || '', 'utf8');
        scriptFile = join(tempDir, `test_${Date.now()}.py`);
        writeFileSync(scriptFile, testInput || '', 'utf8');
        cmd = process.platform === 'win32' ? 'python' : 'python3';
        args = [scriptFile];
      } else {
        // JavaScript / TypeScript (Node.js runtime)
        const solFile = join(tempDir, 'solution.js');
        writeFileSync(solFile, code || '', 'utf8');
        scriptFile = join(tempDir, `test_${Date.now()}.js`);
        writeFileSync(scriptFile, testInput || '', 'utf8');
        cmd = process.execPath; // current node binary
        args = [scriptFile];
      }

      const startTime = Date.now();
      let stdout = '';
      let stderr = '';
      let timedOut = false;

      const proc = spawn(cmd, args, {
        cwd: tempDir,
        env: {
          PATH: process.env.PATH,
          NODE_ENV: 'test',
          // Strip out secret keys from child process environment
          JWT_SECRET: undefined,
        },
      });

      const timer = setTimeout(() => {
        timedOut = true;
        try {
          proc.kill('SIGKILL');
        } catch {}
      }, timeoutMs);

      proc.stdout.on('data', (d) => {
        stdout += d.toString('utf8');
        if (stdout.length > 32768) {
          proc.kill();
        }
      });

      proc.stderr.on('data', (d) => {
        stderr += d.toString('utf8');
        if (stderr.length > 16384) {
          proc.kill();
        }
      });

      proc.on('close', (exitCode) => {
        clearTimeout(timer);
        const timeMs = Date.now() - startTime;

        if (timedOut) {
          return resolve({
            passed: false,
            actual: 'Execution timed out',
            stdout,
            stderr: 'Time limit exceeded',
            timeMs,
            error: 'TIMEOUT',
          });
        }

        const trimmedActual = stdout.trim();
        const trimmedExpected = (expectedOutput || '').trim();
        const passed = exitCode === 0 && trimmedActual === trimmedExpected;

        resolve({
          passed,
          actual: trimmedActual,
          stdout: trimmedActual,
          stderr: stderr.trim(),
          timeMs,
          error: exitCode !== 0 ? (stderr.trim() || `Process exited with code ${exitCode}`) : null,
        });
      });

      proc.on('error', (err) => {
        clearTimeout(timer);
        resolve({
          passed: false,
          actual: '',
          stdout: '',
          stderr: err.message,
          timeMs: Date.now() - startTime,
          error: err.message,
        });
      });
    });
  }
}
