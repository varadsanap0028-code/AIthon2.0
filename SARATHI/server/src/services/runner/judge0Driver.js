import { assessmentV2 } from '../../config/index.js';

export class Judge0Driver {
  constructor() {
    this.baseUrl = assessmentV2.judge0Url.replace(/\/$/, '');
    this.apiKey = assessmentV2.judge0ApiKey;
  }

  getLanguageId(language) {
    switch ((language || '').toLowerCase()) {
      case 'python':
        return 71; // Python (3.8.1)
      case 'sql':
        return 82; // SQL (SQLite 3.27.2)
      case 'javascript':
      default:
        return 63; // JavaScript (Node.js 12.14.0 or latest)
    }
  }

  /**
   * Execute code and test cases against a self-hosted Judge0 instance
   */
  async run({ language = 'javascript', code, tests = [], limits = {} }) {
    const startTime = Date.now();
    const languageId = this.getLanguageId(language);

    if (!tests || tests.length === 0) {
      return {
        status: 'success',
        passed: 0,
        total: 0,
        results: [],
        stdout: '',
        stderr: '',
        timeMs: 0,
        memKb: 0,
        isolationNotice: 'Judge0 isolated sandbox execution (cgroups + seccomp filter).',
      };
    }

    try {
      const submissions = tests.map(t => ({
        language_id: languageId,
        source_code: `${code}\n\n${t.input}`,
        expected_output: t.expectedOutput,
        cpu_time_limit: Math.min(limits.timeoutMs || 5000, 10000) / 1000,
        memory_limit: 128000, // 128 MB
        network: false, // Network access disabled
      }));

      const headers = { 'Content-Type': 'application/json' };
      if (this.apiKey) {
        headers['X-Auth-Token'] = this.apiKey;
      }

      // 1. Submit batch
      const submitRes = await fetch(`${this.baseUrl}/submissions/batch?base64_encoded=false`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ submissions }),
      });

      if (!submitRes.ok) {
        throw new Error(`Judge0 batch submission rejected with HTTP ${submitRes.status}`);
      }

      const tokens = await submitRes.json();
      const tokenList = tokens.map(t => t.token).join(',');

      // 2. Poll for completion (up to 10 seconds)
      let completedSubmissions = [];
      const maxPolls = 15;
      for (let i = 0; i < maxPolls; i++) {
        await new Promise(r => setTimeout(r, 600));
        const pollRes = await fetch(`${this.baseUrl}/submissions/batch?tokens=${tokenList}&base64_encoded=false&fields=status_id,status,stdout,stderr,time,memory`, {
          headers,
        });

        if (pollRes.ok) {
          const pollData = await pollRes.json();
          const pending = pollData.submissions?.some(s => s.status_id <= 2); // 1 = In Queue, 2 = Processing
          if (!pending) {
            completedSubmissions = pollData.submissions || [];
            break;
          }
        }
      }

      const results = tests.map((t, idx) => {
        const sub = completedSubmissions[idx] || {};
        const isAccepted = sub.status_id === 3; // 3 = Accepted
        return {
          id: t.id,
          kind: t.kind,
          passed: isAccepted,
          actual: (sub.stdout || '').trim(),
          expected: t.expectedOutput,
          executionTimeMs: Math.round((parseFloat(sub.time) || 0) * 1000),
          error: isAccepted ? null : (sub.stderr || sub.status?.description || 'Execution failed'),
        };
      });

      const passedCount = results.filter(r => r.passed).length;
      return {
        status: passedCount === tests.length ? 'success' : 'failed',
        passed: passedCount,
        total: tests.length,
        results,
        stdout: completedSubmissions.map(s => s.stdout || '').join('\n').trim(),
        stderr: completedSubmissions.map(s => s.stderr || '').join('\n').trim(),
        timeMs: Date.now() - startTime,
        memKb: Math.max(...completedSubmissions.map(s => s.memory || 0)),
        isolationNotice: 'Judge0 isolated sandbox execution (cgroups + seccomp filter).',
      };
    } catch (err) {
      return {
        status: 'error',
        passed: 0,
        total: tests.length,
        results: tests.map(t => ({
          id: t.id,
          passed: false,
          actual: '',
          expected: t.expectedOutput,
          error: `Judge0 runner unavailable: ${err.message}`,
        })),
        stdout: '',
        stderr: `Failed to connect to Judge0 at ${this.baseUrl}. Ensure Docker container is running or use RUNNER_DRIVER=local-dev in development.`,
        timeMs: Date.now() - startTime,
        memKb: 0,
        isolationNotice: 'Judge0 runner failure fallback.',
      };
    }
  }
}
