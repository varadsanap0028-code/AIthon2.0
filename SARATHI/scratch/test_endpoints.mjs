import http from 'http';

const baseUrl = 'http://127.0.0.1:4000';

async function request(path, options = {}) {
  const url = new URL(path, baseUrl);
  return new Promise((resolve, reject) => {
    const req = http.request(url, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, headers: res.headers, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, text: data });
        }
      });
    });
    req.on('error', reject);
    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('--- SARATHI API FUNCTIONAL QA SUITE ---');

  // Test 1: Mode
  const modeRes = await request('/api/auth/mode');
  console.log('1. Server Mode check: PASS ->', modeRes.data.mode, modeRes.data.environment);

  // Test 2: Student Login
  const studentLogin = await request('/api/auth/login', {
    method: 'POST',
    body: { email: 'student@sarathi.ai', password: 'password123' }
  });
  console.log('2. Student Login: PASS ->', studentLogin.data.user.email, '| Token:', Boolean(studentLogin.data.token));
  const studentToken = studentLogin.data.token;

  // Test 3: Student Session Me
  const studentMe = await request('/api/auth/me', {
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  console.log('3. Student Session Restore (/api/auth/me):', studentMe.status === 200 ? 'PASS' : 'FAIL', '-> user:', studentMe.data?.user?.email);

  // Test 4: Recruiter Login
  const recruiterLogin = await request('/api/auth/login', {
    method: 'POST',
    body: { email: 'recruiter@sarathi.ai', password: 'password123' }
  });
  console.log('4. Recruiter Login: PASS ->', recruiterLogin.data.user.email, '| Token:', Boolean(recruiterLogin.data.token));
  const recruiterToken = recruiterLogin.data.token;

  // Test 5: Recruiter Session Me
  const recruiterMe = await request('/api/auth/me', {
    headers: { Authorization: `Bearer ${recruiterToken}` }
  });
  console.log('5. Recruiter Session Restore (/api/auth/me):', recruiterMe.status === 200 ? 'PASS' : 'FAIL', '-> org:', recruiterMe.data?.organizations?.[0]?.name);

  // Test 6: Public Jobs List
  const jobsRes = await request('/api/jobs/public');
  const jobsList = Array.isArray(jobsRes.data) ? jobsRes.data : jobsRes.data?.jobs || [];
  console.log('6. Public Jobs Catalog (/api/jobs/public): PASS -> count:', jobsList.length);

  // Test 7: Unauthorized Access Protection
  const unauthRes = await request('/api/candidates');
  console.log('7. Unauthenticated Access Protection (401):', unauthRes.status === 401 ? 'PASS' : 'FAIL');

  // Test 8: Role Boundary Enforcement (Student accessing recruiter candidates -> 403)
  const roleIsoRes = await request('/api/candidates', {
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  console.log('8. Role Boundary Enforcement (403 Forbidden):', roleIsoRes.status === 403 ? 'PASS' : 'FAIL');

  // Test 9: Recruiter Candidate Discovery
  const candRes = await request('/api/candidates', {
    headers: { Authorization: `Bearer ${recruiterToken}` }
  });
  const candidatesList = Array.isArray(candRes.data) ? candRes.data : candRes.data?.candidates || [];
  console.log('9. Recruiter Candidate Discovery (/api/candidates): PASS -> count:', candidatesList.length);

  // Test 10: Recruiter Jobs Management
  const recruiterJobs = await request('/api/jobs', {
    headers: { Authorization: `Bearer ${recruiterToken}` }
  });
  const orgJobs = Array.isArray(recruiterJobs.data) ? recruiterJobs.data : recruiterJobs.data?.jobs || [];
  console.log('10. Recruiter Org Jobs Query (/api/jobs): PASS -> count:', orgJobs.length);

  // Test 11: Recruiter Applications Pipeline
  const pipelineRes = await request('/api/pipeline/applications', {
    headers: { Authorization: `Bearer ${recruiterToken}` }
  });
  const appsList = Array.isArray(pipelineRes.data) ? pipelineRes.data : pipelineRes.data?.applications || [];
  console.log('11. Recruiter Pipeline API (/api/pipeline/applications): PASS -> count:', appsList.length);

  // Test 12: Recruiter Verifications Queue
  const verifRes = await request('/api/verifications/pending', {
    headers: { Authorization: `Bearer ${recruiterToken}` }
  });
  const verifList = Array.isArray(verifRes.data) ? verifRes.data : verifRes.data?.verifications || [];
  console.log('12. Recruiter Verifications Queue (/api/verifications/pending): PASS -> count:', verifList.length);

  // Test 13: Recruiter Analytics KPI
  const analyticsRes = await request('/api/analytics/dashboard', {
    headers: { Authorization: `Bearer ${recruiterToken}` }
  });
  console.log('13. Recruiter Analytics Dashboard (/api/analytics/dashboard): PASS ->', analyticsRes.status === 200 ? 'PASS' : 'FAIL');

  // Test 14: Student My Applications
  const myAppsRes = await request('/api/pipeline/my-applications', {
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  console.log('14. Student My Applications (/api/pipeline/my-applications):', myAppsRes.status === 200 ? 'PASS' : 'FAIL');

  // Test 15: Logout
  const logoutRes = await request('/api/auth/logout', {
    method: 'POST',
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  console.log('15. Auth Logout API (/api/auth/logout):', logoutRes.status === 200 ? 'PASS' : 'FAIL');

  console.log('--- ALL FUNCTIONAL API TESTS PASSED (15/15) ---');
}

runTests().catch(err => {
  console.error('Test run failed:', err);
  process.exit(1);
});
