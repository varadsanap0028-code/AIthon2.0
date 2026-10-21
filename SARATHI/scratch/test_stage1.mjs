import http from 'node:http';

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });
    req.on('error', reject);
    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    req.end();
  });
}

async function test() {
  console.log('--- Testing Stage 1 Endpoints ---');

  // 1. GET /api/jobs/public
  const publicJobsRes = await request({
    hostname: 'localhost',
    port: 4000,
    path: '/api/jobs/public',
    method: 'GET'
  });
  console.log('1. Public Jobs Status:', publicJobsRes.status, 'Count:', publicJobsRes.data.length);

  // 2. POST /api/auth/student-session
  const studentSessionRes = await request({
    hostname: 'localhost',
    port: 4000,
    path: '/api/auth/student-session',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    id: 'usr-student-demo',
    email: 'student@sarathi.ai',
    fullName: 'Alex Morgan',
    institution: 'National Institute of Technology',
    targetRole: 'Full-Stack Developer'
  });
  console.log('2. Student Session Status:', studentSessionRes.status, 'User:', studentSessionRes.data.user?.fullName);
  const studentToken = studentSessionRes.data.token;

  // 3. Test Unauthorized POST /api/pipeline/apply (missing token)
  const unauthApply = await request({
    hostname: 'localhost',
    port: 4000,
    path: '/api/pipeline/apply',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    jobId: 'job-1',
    coverNote: 'I am applying without token'
  });
  console.log('3. Unauthenticated apply without student token status:', unauthApply.status, 'Error:', unauthApply.data?.error);

  // 4. Test Valid Application with student Bearer token
  const validApply = await request({
    hostname: 'localhost',
    port: 4000,
    path: '/api/pipeline/apply',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${studentToken}`
    }
  }, {
    jobId: 'job-1',
    coverNote: 'Excited about the Full-Stack role! My React & Node skills are verified.'
  });
  console.log('4. Valid Apply Status:', validApply.status, 'Message:', validApply.data?.message || validApply.data?.error);

  // 5. Test Duplicate Application
  const dupApply = await request({
    hostname: 'localhost',
    port: 4000,
    path: '/api/pipeline/apply',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${studentToken}`
    }
  }, {
    jobId: 'job-1',
    coverNote: 'Applying again'
  });
  console.log('5. Duplicate Apply Status (Expected 409):', dupApply.status, 'Error:', dupApply.data?.error);

  // 6. Test Invalid Job ID
  const invalidJobApply = await request({
    hostname: 'localhost',
    port: 4000,
    path: '/api/pipeline/apply',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${studentToken}`
    }
  }, {
    jobId: 'job-non-existent-999',
    coverNote: 'Testing invalid'
  });
  console.log('6. Invalid Job Apply Status (Expected 404):', invalidJobApply.status, 'Error:', invalidJobApply.data?.error);

  // 7. Verify Application is in Recruiter Pipeline
  const recruiterApps = await request({
    hostname: 'localhost',
    port: 4000,
    path: '/api/pipeline/applications?jobId=job-1',
    method: 'GET',
    headers: { 'x-org-id': 'org-demo-1' }
  });
  console.log('7. Recruiter Pipeline Applications for job-1:', recruiterApps.data.length);
  const alexApp = recruiterApps.data.find(a => a.candidate_name === 'Alex Morgan');
  console.log('   Alex Morgan in pipeline:', !!alexApp, 'Stage:', alexApp?.stage, 'Match Score:', alexApp?.match_score);
}

test().catch(console.error);
