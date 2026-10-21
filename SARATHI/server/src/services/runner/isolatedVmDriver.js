import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { assessmentV2 } from '../../config/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const WORKER_PATH = resolve(__dirname, 'isolatedVmWorker.js');

export class IsolatedVmDriver {
  /**
   * Execute code in a separate child process running inside an isolated-vm V8 Isolate.
   * Candidate code NEVER runs inside the API server process.
   */
  async run({ language = 'javascript', code, tests = [], limits = {} }) {
    const timeoutMs = limits.timeoutMs || assessmentV2.executionTimeoutMs || 5000;
    const memoryLimitMb = limits.memoryLimitMb || 128;
    const outputMaxBytes = limits.outputMaxBytes || assessmentV2.codeMaxBytes || 20480;

    const totalWorkerTimeoutMs = Math.max(timeoutMs * (tests.length || 1) + 2000, 7000);

    return new Promise((resolveResult) => {
      let stdout = '';
      let stderr = '';
      let killed = false;

      // Spawn worker process completely isolated from main API server process
      const child = spawn(process.execPath, [WORKER_PATH], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          PATH: process.env.PATH,
          NODE_ENV: 'sandbox',
        },
      });

      const watchdog = setTimeout(() => {
        killed = true;
        try { child.kill('SIGKILL'); } catch {}
        resolveResult({
          status: 'timeout',
          passed: 0,
          failed: tests.length,
          total: tests.length,
          timedOut: true,
          stdout,
          stderr: 'Execution exceeded total time limit.',
          results: tests.map(t => ({
            id: t.id,
            kind: t.kind,
            passed: false,
            actual: 'TIMEOUT',
            expected: t.expectedOutput,
            executionTimeMs: timeoutMs,
            error: 'TIMEOUT',
          })),
        });
      }, totalWorkerTimeoutMs);

      child.stdout.on('data', (d) => {
        stdout += d.toString('utf8');
      });

      child.stderr.on('data', (d) => {
        stderr += d.toString('utf8');
      });

      child.on('error', (err) => {
        clearTimeout(watchdog);
        if (!killed) {
          resolveResult({
            status: 'error',
            passed: 0,
            failed: tests.length,
            total: tests.length,
            timedOut: false,
            stdout,
            stderr: err.message || 'Worker spawn failure',
            results: [],
          });
        }
      });

      child.on('close', (code) => {
        clearTimeout(watchdog);
        if (killed) return;

        try {
          const parsed = JSON.parse(stdout);
          resolveResult({
            status: parsed.status || (parsed.failed === 0 ? 'success' : 'failed'),
            passed: parsed.passed ?? 0,
            failed: parsed.failed ?? (parsed.total - (parsed.passed || 0)),
            total: parsed.total ?? tests.length,
            timedOut: Boolean(parsed.timedOut),
            stdout: parsed.stdout || '',
            stderr: parsed.stderr || (code !== 0 ? `Worker exited with code ${code}` : ''),
            results: parsed.results || [],
          });
        } catch {
          resolveResult({
            status: 'error',
            passed: 0,
            failed: tests.length,
            total: tests.length,
            timedOut: false,
            stdout,
            stderr: stderr || `Non-JSON output from worker (exit code ${code})`,
            results: [],
          });
        }
      });

      // Send payload to worker process via stdin
      child.stdin.write(JSON.stringify({
        code,
        tests,
        limits: {
          timeoutMs,
          memoryLimitMb,
          outputMaxBytes,
        },
      }));
      child.stdin.end();
    });
  }
}
