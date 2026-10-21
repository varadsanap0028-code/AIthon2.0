import { spawn, execFile } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { assessmentV2 } from '../../config/index.js';

let cachedPythonPath = null;
let pythonChecked = false;

/**
 * Detect available Python 3 executable on host system.
 * Returns path/command string or null if unavailable.
 */
export async function detectPythonExecutable() {
  if (pythonChecked && cachedPythonPath) {
    return cachedPythonPath;
  }

  const localAppData = process.env.LOCALAPPDATA || '';
  const programFiles = process.env.ProgramFiles || 'C:\\Program Files';
  const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';

  const candidates = [
    process.env.PYTHON_PATH,
    // Standard Windows installation paths
    join(localAppData, 'Programs', 'Python', 'Python312', 'python.exe'),
    join(localAppData, 'Programs', 'Python', 'Python311', 'python.exe'),
    join(localAppData, 'Programs', 'Python', 'Python310', 'python.exe'),
    join(programFiles, 'Python312', 'python.exe'),
    join(programFiles, 'Python311', 'python.exe'),
    join(programFiles, 'Python310', 'python.exe'),
    join(programFilesX86, 'Python312', 'python.exe'),
    // Standard Unix / macOS paths
    '/usr/bin/python3',
    '/usr/local/bin/python3',
    '/opt/homebrew/bin/python3',
    // System PATH binaries
    'python3',
    'python',
    'py',
  ].filter(Boolean);

  for (const cmd of candidates) {
    if ((cmd.includes('\\') || cmd.includes('/')) && !existsSync(cmd)) {
      continue;
    }

    const isWorking = await new Promise((resolve) => {
      try {
        const proc = execFile(cmd, ['-c', 'import sys; print(f"Python {sys.version_info.major}.{sys.version_info.minor}")'], { timeout: 3000 }, (error, stdout, stderr) => {
          if (error) {
            return resolve(false);
          }
          const output = (stdout || stderr || '').trim();
          // Reject Windows Store stub messages
          if (output.includes('Python was not found') || output.includes('Microsoft Store')) {
            return resolve(false);
          }
          // Verify Python 3
          if (output.startsWith('Python 3') || output.toLowerCase().includes('python 3')) {
            return resolve(true);
          }
          resolve(false);
        });

        proc.on('error', () => resolve(false));
      } catch {
        resolve(false);
      }
    });

    if (isWorking) {
      cachedPythonPath = cmd;
      pythonChecked = true;
      return cmd;
    }
  }

  pythonChecked = true;
  cachedPythonPath = null;
  return null;
}

export class PythonDriver {
  /**
   * Universal runner execution interface for Python candidate code
   */
  async run({ language = 'python', code = '', tests = [], limits = {} }) {
    const pythonCmd = await detectPythonExecutable();
    const startTime = Date.now();
    const timeoutMs = limits.timeoutMs || assessmentV2.executionTimeoutMs || 5000;

    // Graceful structured diagnostic if host environment has no working Python runtime
    if (!pythonCmd) {
      return {
        status: 'runtime_unavailable',
        passed: 0,
        failed: 0,
        unexecuted: tests.length,
        total: tests.length,
        timedOut: false,
        stdout: '',
        stderr: 'Infrastructure Error: Python 3 runtime is not configured or available on the execution server. Please install Python 3.10+ or connect an isolated worker.',
        timeMs: Date.now() - startTime,
        results: tests.map(t => ({
          id: t.id,
          kind: t.kind,
          status: 'not_executed',
          passed: false,
          actual: '',
          expected: t.kind === 'visible' ? (t.expectedOutput ?? t.expected_output) : undefined,
          executionTimeMs: 0,
          error: 'Infrastructure Error: Python runtime unavailable on server.',
        })),
        isolationNotice: 'Execution halted: Host Python runtime unavailable. Test marked as NOT EXECUTED.',
      };
    }

    const tempDir = mkdtempSync(join(tmpdir(), 'sarathi-py-'));
    try {
      // Write solution file
      const solPath = join(tempDir, 'solution.py');
      writeFileSync(solPath, code || '', 'utf8');

      const results = [];
      let totalStdout = '';
      let totalStderr = '';
      let timedOutAny = false;

      for (const t of tests) {
        const expected = t.expectedOutput ?? t.expected_output;
        const testRes = await this.runSingleTest({
          pythonCmd,
          tempDir,
          testInput: t.input,
          expectedOutput: expected,
          timeoutMs: t.timeoutMs || t.timeout_ms || timeoutMs,
        });

        if (testRes.timedOut) {
          timedOutAny = true;
        }

        results.push({
          id: t.id,
          kind: t.kind,
          passed: testRes.passed,
          actual: testRes.actual,
          // Hide expectedOutput for hidden tests from client leakage
          expected: t.kind === 'visible' ? expected : undefined,
          executionTimeMs: testRes.timeMs,
          error: testRes.error,
        });

        if (testRes.stdout) totalStdout += testRes.stdout + '\n';
        if (testRes.stderr) totalStderr += testRes.stderr + '\n';
      }

      const passedCount = results.filter(r => r.passed).length;
      return {
        status: timedOutAny ? 'timeout' : (passedCount === tests.length ? 'success' : 'failed'),
        passed: passedCount,
        failed: tests.length - passedCount,
        total: tests.length,
        timedOut: timedOutAny,
        results,
        stdout: totalStdout.trim(),
        stderr: totalStderr.trim(),
        timeMs: Date.now() - startTime,
        isolationNotice: 'Executed in isolated child process with dedicated filesystem sandbox.',
      };
    } finally {
      try {
        rmSync(tempDir, { recursive: true, force: true });
      } catch {}
    }
  }

  runSingleTest({ pythonCmd, tempDir, testInput, expectedOutput, timeoutMs }) {
    return new Promise((resolve) => {
      const scriptPath = join(tempDir, `test_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.py`);
      writeFileSync(scriptPath, testInput || '', 'utf8');

      const startTime = Date.now();
      let stdout = '';
      let stderr = '';
      let timedOut = false;

      const safeEnv = {
        PATH: process.env.PATH,
        SYSTEMROOT: process.env.SYSTEMROOT || process.env.SystemRoot,
        WINDIR: process.env.WINDIR || process.env.windir,
        COMSPEC: process.env.COMSPEC || process.env.ComSpec,
        PATHEXT: process.env.PATHEXT,
        PYTHONPATH: tempDir,
        PYTHONDONTWRITEBYTECODE: '1',
        PYTHONUNBUFFERED: '1',
        PYTHONNOUSERSITE: '1',
        PYTHONHASHSEED: '0',
        TEMP: tempDir,
        TMP: tempDir,
      };

      const proc = spawn(pythonCmd, [scriptPath], {
        cwd: tempDir,
        env: safeEnv,
      });

      const timer = setTimeout(() => {
        timedOut = true;
        try {
          if (process.platform === 'win32' && proc.pid) {
            execFile('taskkill', ['/pid', String(proc.pid), '/f', '/t'], () => {});
          } else {
            proc.kill('SIGKILL');
          }
        } catch {}
      }, timeoutMs);

      proc.stdout.on('data', (d) => {
        stdout += d.toString('utf8');
        if (stdout.length > 20480) {
          proc.kill();
        }
      });

      proc.stderr.on('data', (d) => {
        stderr += d.toString('utf8');
        if (stderr.length > 20480) {
          proc.kill();
        }
      });

      proc.on('close', (exitCode) => {
        clearTimeout(timer);
        const timeMs = Date.now() - startTime;

        if (timedOut) {
          return resolve({
            passed: false,
            actual: 'TIMEOUT',
            stdout,
            stderr: 'Time limit exceeded',
            timeMs,
            timedOut: true,
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
          timedOut: false,
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
          timedOut: false,
          error: err.message,
        });
      });
    });
  }
}
