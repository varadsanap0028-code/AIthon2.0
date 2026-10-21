import { QuestionBankService } from '../server/src/services/assessmentV2/questionBankService.js';
import { RunnerDriver } from '../server/src/services/runner/runnerDriver.js';

const q = QuestionBankService.getQuestionsForGrading(['q-ds-code-02'])[0];

const correctCode = `
def detect_outliers_iqr(data):
    if not data or len(data) < 4:
        return []
    s = sorted(data)
    n = len(s)
    def percentile(p):
        idx = (n - 1) * p
        i = int(idx)
        f = idx - i
        if i + 1 < n:
            return s[i] + f * (s[i + 1] - s[i])
        return s[i]
    q1 = percentile(0.25)
    q3 = percentile(0.75)
    iqr = q3 - q1
    lower = q1 - 1.5 * iqr
    upper = q3 + 1.5 * iqr
    return [x for x in data if x < lower or x > upper]
`;

const r = await RunnerDriver.run({ language: 'python', code: correctCode, tests: q.tests });
console.log('status:', r.status);
console.log('passed:', r.passed, '/', r.total);
for (const t of r.results) {
  console.log(t.id, t.kind, 'passed:', t.passed, 'actual:', t.actual, 'err:', t.error);
}
