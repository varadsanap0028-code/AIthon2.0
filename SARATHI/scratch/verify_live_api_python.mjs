import { authService } from '../server/src/services/authService.js';
import { initDb } from '../server/src/config/db.js';

const db = initDb();
const candidate = db.prepare(`SELECT * FROM users WHERE role = 'candidate' LIMIT 1`).get();
console.log('Using candidate:', candidate.id, candidate.email);

const token = authService.generateToken(candidate);

// 1. Create Data Science Assessment Session via API
console.log('\n--- 1. Calling POST /api/assessments/v2/sessions ---');
const startRes = await fetch('http://localhost:4000/api/assessments/v2/sessions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    domainId: 'data-science',
    role: 'Data Scientist',
    mode: 'secure',
    scope: 'full',
    consent: { agreed: true }
  })
});

const startData = await startRes.json();
console.log('Session create HTTP status:', startRes.status);
console.log('Session ID:', startData.sessionId);

const sessionId = startData.sessionId;

// 2. Run Code on q-ds-code-02 (detect_outliers_iqr) via API
console.log('\n--- 2. Calling POST /api/assessments/v2/sessions/:id/run ---');
const outlierCode = `
def detect_outliers_iqr(data):
    if not data or len(data) < 4:
        return []
    s = sorted(data)
    n = len(s)
    def median(lst):
        m = len(lst)
        return lst[m // 2] if m % 2 == 1 else (lst[m // 2 - 1] + lst[m // 2]) / 2.0
    lower = s[:n // 2]
    upper = s[n // 2:] if n % 2 == 0 else s[n // 2 + 1:]
    q1 = median(lower)
    q3 = median(upper)
    iqr = q3 - q1
    return [x for x in data if x < (q1 - 1.5 * iqr) or x > (q3 + 1.5 * iqr)]
`;

const runRes = await fetch(`http://localhost:4000/api/assessments/v2/sessions/${sessionId}/run`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    questionId: 'q-ds-code-02',
    language: 'python',
    code: outlierCode
  })
});

const runData = await runRes.json();
console.log('Run Code API Response Status:', runRes.status);
console.log('Runner Status:', runData.status);
console.log('Passed:', runData.passed, '/', runData.total);
console.log('Stdout:\n' + runData.stdout);
console.log('Stderr:', runData.stderr || '(none)');
console.log('Results:');
for (const r of (runData.results || [])) {
  console.log(` - ${r.id} (${r.kind}): passed=${r.passed}, actual=${r.actual}, expected=${r.expected}, err=${r.error}`);
}

// 3. Test Incorrect Code via API
console.log('\n--- 3. Testing Incorrect Code via API ---');
const wrongRes = await fetch(`http://localhost:4000/api/assessments/v2/sessions/${sessionId}/run`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    questionId: 'q-ds-code-02',
    language: 'python',
    code: 'def detect_outliers_iqr(data): return [9999]'
  })
});
const wrongData = await wrongRes.json();
console.log('Wrong Code Status:', wrongData.status, 'Passed:', wrongData.passed, '/', wrongData.total);
console.log('First test passed?:', wrongData.results?.[0]?.passed, 'Actual:', wrongData.results?.[0]?.actual);
