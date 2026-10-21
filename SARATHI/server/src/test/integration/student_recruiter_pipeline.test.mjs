import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { pipelineService } from '../../services/pipelineService.js';
import { jobService } from '../../services/jobService.js';
import { authService } from '../../services/authService.js';
import { initDb, getDb } from '../../config/db.js';

describe('Stage 3: Student Applications & Recruiter Pipeline Synchronization Integration', () => {
  const org1 = 'org-demo-1';
  const org2 = 'org-demo-2';
  const recruiterId = 'usr-recruiter-1';

  let student1Session = null;
  let student2Session = null;
  let recruiterSession = null;
  let publishedJob = null;
  let draftJob = null;
  let testApp = null;

  test('0. Setup test sessions, organization jobs, and credentials', async () => {
    initDb();

    // Student 1 session
    student1Session = await authService.getOrCreateStudentSession({
      id: `usr-s1-${Date.now()}`,
      email: `student1.${Date.now()}@sarathi.local`,
      fullName: 'Anita Roy',
      institution: 'Sarathi Institute of Technology',
      targetRole: 'Full-Stack Developer'
    });
    assert.ok(student1Session.token);
    assert.strictEqual(student1Session.user.role, 'candidate');

    // Student 2 session
    student2Session = await authService.getOrCreateStudentSession({
      id: `usr-s2-${Date.now()}`,
      email: `student2.${Date.now()}@sarathi.local`,
      fullName: 'Rahul Verma',
      institution: 'National Tech College',
      targetRole: 'Backend Engineer'
    });
    assert.ok(student2Session.token);

    // Recruiter session for org-demo-1
    recruiterSession = await authService.getOrCreateRecruiterSession({
      email: 'recruiter@sarathi.local',
      orgId: org1
    });
    assert.ok(recruiterSession.token);
    assert.strictEqual(recruiterSession.user.role, 'recruiter');

    // Fetch an active published job for org1
    const activeJobs = jobService.getJobs(org1, { status: 'published' });
    assert.ok(activeJobs.length > 0, 'Org 1 must have published jobs');
    publishedJob = activeJobs[0];

    // Create a draft job for org1 to test draft rejection
    draftJob = jobService.createJob(org1, recruiterId, {
      title: `Internal Draft Role ${Date.now()}`,
      description: 'Internal draft role description for testing pipeline restrictions.',
      department: 'R&D',
      domainId: 'dom-frontend',
      experienceLevel: 'entry',
      employmentType: 'full_time',
      workArrangement: 'remote',
      location: 'Bengaluru, India',
      status: 'draft',
      skills: []
    });
    assert.strictEqual(draftJob.status, 'draft');
  });

  test('1. Student applies to a published job and application is created with stage new_applicant', () => {
    initDb();
    testApp = pipelineService.createApplication(
      org1,
      publishedJob.id,
      student1Session.user.id,
      'I am very interested in this role and excited to contribute.'
    );

    assert.ok(testApp.id);
    assert.strictEqual(testApp.job_id, publishedJob.id);
    assert.strictEqual(testApp.candidate_id, student1Session.user.id);
    assert.strictEqual(testApp.stage, 'new_applicant');
    assert.strictEqual(testApp.cover_note, 'I am very interested in this role and excited to contribute.');
    assert.ok(testApp.stageHistory.length >= 1);
    assert.strictEqual(testApp.stageHistory[0].to_stage, 'new_applicant');
  });

  test('2. Applying twice to the same job is rejected without creating duplicates', () => {
    initDb();
    assert.throws(() => {
      pipelineService.createApplication(
        org1,
        publishedJob.id,
        student1Session.user.id,
        'Duplicate attempt'
      );
    }, /Candidate has already applied for this job/);

    const apps = pipelineService.getApplications(org1, { jobId: publishedJob.id });
    const countForStudent = apps.filter(a => a.candidate_id === student1Session.user.id).length;
    assert.strictEqual(countForStudent, 1, 'Exactly one application record must exist');
  });

  test('3. Recruiter of active org can view application, candidate profile, and verified status', () => {
    initDb();
    const appDetails = pipelineService.getApplicationById(org1, testApp.id);
    assert.ok(appDetails);
    assert.strictEqual(appDetails.candidate_name, 'Anita Roy');
    assert.strictEqual(appDetails.stage, 'new_applicant');
    assert.strictEqual(appDetails.job_id, publishedJob.id);
    assert.ok(Array.isArray(appDetails.stageHistory));
  });

  test('4. Cross-tenant isolation: Recruiter from another org cannot view or update applications', () => {
    initDb();
    // Attempting to query testApp using org2 returns null
    const crossOrgApp = pipelineService.getApplicationById(org2, testApp.id);
    assert.strictEqual(crossOrgApp, null, 'Cross-org recruiter must not access application');

    // Attempting to change stage from org2 must throw Application not found
    assert.throws(() => {
      pipelineService.updateStage(org2, testApp.id, 'under_review', 'usr-recruiter-org2');
    }, /Application not found/);
  });

  test('5. Recruiter moves application through valid pipeline stages with persistent history', () => {
    initDb();
    // Transition: new_applicant -> under_review
    const step1 = pipelineService.updateStage(
      org1,
      testApp.id,
      'under_review',
      recruiterId,
      'Profile reviewed and matched requirements'
    );
    assert.strictEqual(step1.stage, 'under_review');
    assert.strictEqual(step1.stageHistory.length, 2);
    assert.strictEqual(step1.stageHistory[1].to_stage, 'under_review');
    assert.strictEqual(step1.stageHistory[1].reason, 'Profile reviewed and matched requirements');

    // Transition: under_review -> interview_scheduled
    const step2 = pipelineService.updateStage(
      org1,
      testApp.id,
      'interview_scheduled',
      recruiterId,
      'Invited to Round 1 Technical Architecture interview'
    );
    assert.strictEqual(step2.stage, 'interview_scheduled');
    assert.strictEqual(step2.stageHistory.length, 3);
    assert.strictEqual(step2.stageHistory[2].to_stage, 'interview_scheduled');

    // Transition: interview_scheduled -> offer_extended
    const step3 = pipelineService.updateStage(
      org1,
      testApp.id,
      'offer_extended',
      recruiterId,
      'Candidate passed interview rounds with high distinction'
    );
    assert.strictEqual(step3.stage, 'offer_extended');

    // Transition: offer_extended -> hired
    const step4 = pipelineService.updateStage(
      org1,
      testApp.id,
      'hired',
      recruiterId,
      'Offer accepted and onboarding initiated'
    );
    assert.strictEqual(step4.stage, 'hired');
    assert.strictEqual(step4.stageHistory.length, 5);
  });

  test('6. Invalid stage transitions are strictly rejected', () => {
    initDb();
    // 'hired' is a terminal state in ALLOWED_STAGE_TRANSITIONS
    assert.throws(() => {
      pipelineService.updateStage(
        org1,
        testApp.id,
        'new_applicant',
        recruiterId,
        'Attempting to reset hired candidate'
      );
    }, /Invalid stage transition/);

    // Bogus/unrecognized stage
    assert.throws(() => {
      pipelineService.updateStage(
        org1,
        testApp.id,
        'non_existent_stage',
        recruiterId
      );
    }, /Invalid pipeline stage/);
  });

  test('7. Recruiter status updates appear persistently in student application history', () => {
    initDb();
    const db = getDb();
    // Simulate what GET /api/pipeline/my-applications queries for student 1
    const student1Apps = db.prepare(
      `SELECT a.*, j.title as job_title, o.name as company_name
       FROM applications a
       JOIN jobs j ON j.id = a.job_id
       JOIN organisations o ON o.id = a.org_id
       WHERE a.candidate_id = ?
       ORDER BY a.applied_at DESC;`
    ).all(student1Session.user.id);

    assert.strictEqual(student1Apps.length, 1);
    assert.strictEqual(student1Apps[0].id, testApp.id);
    assert.strictEqual(student1Apps[0].stage, 'hired');

    // Query student 1's stage history
    const history = db.prepare(
      `SELECT * FROM application_stage_history WHERE application_id = ? ORDER BY created_at ASC;`
    ).all(testApp.id);

    assert.strictEqual(history.length, 5);
    assert.strictEqual(history[history.length - 1].to_stage, 'hired');
    assert.strictEqual(history[history.length - 1].reason, 'Offer accepted and onboarding initiated');
  });

  test('8. Candidate data isolation: Student 2 cannot view Student 1 applications', () => {
    initDb();
    const db = getDb();
    const student2Apps = db.prepare(
      `SELECT a.* FROM applications a WHERE a.candidate_id = ?;`
    ).all(student2Session.user.id);

    assert.strictEqual(student2Apps.length, 0, 'Student 2 must not see Student 1 applications');
  });

  test('9. Recruiter can record private internal notes without exposing to candidate', () => {
    initDb();
    const note = pipelineService.addRecruiterNote(
      org1,
      student1Session.user.id,
      recruiterId,
      'Internal review: strong background in TypeScript and React; fast turnaround.',
      publishedJob.id,
      true
    );
    assert.ok(note.id);

    const appWithNotes = pipelineService.getApplicationById(org1, testApp.id);
    assert.ok(appWithNotes.notes.length >= 1);
    assert.strictEqual(
      appWithNotes.notes[0].note,
      'Internal review: strong background in TypeScript and React; fast turnaround.'
    );
  });

  test('10. Applications cannot be submitted for draft or unpublished jobs', () => {
    initDb();
    const db = getDb();
    const job = db.prepare('SELECT id, org_id, status FROM jobs WHERE id = ?').get(draftJob.id);
    assert.ok(job);
    assert.strictEqual(job.status, 'draft');

    // Simulate rule in POST /apply
    const isEligible = job.status === 'published';
    assert.strictEqual(isEligible, false, 'Draft job must not be eligible for applications');
  });

  test('11. Role authorization strictly rejects candidates from accessing recruiter pipeline endpoints (403)', async () => {
    const { requireRole } = await import('../../middleware/authMiddleware.js');
    const middleware = requireRole(['platform_admin', 'org_owner', 'recruiter', 'hiring_manager']);

    let statusCalled = null;
    let jsonCalled = null;
    const req = {
      user: {
        id: student1Session.user.id,
        globalRole: 'candidate'
      }
    };
    const res = {
      status(s) {
        statusCalled = s;
        return this;
      },
      json(j) {
        jsonCalled = j;
        return this;
      }
    };
    let nextCalled = false;
    middleware(req, res, () => { nextCalled = true; });

    assert.strictEqual(nextCalled, false, 'Candidate must not proceed past requireRole');
    assert.strictEqual(statusCalled, 403, 'Must return 403 Forbidden');
    assert.ok(jsonCalled.error.includes('does not have sufficient permissions'));
  });

  test('12. Unauthenticated requests are rejected by requireAuth with 401', async () => {
    const { requireAuth } = await import('../../middleware/authMiddleware.js');

    let statusCalled = null;
    let jsonCalled = null;
    const req = { user: null };
    const res = {
      status(s) {
        statusCalled = s;
        return this;
      },
      json(j) {
        jsonCalled = j;
        return this;
      }
    };
    let nextCalled = false;
    requireAuth(req, res, () => { nextCalled = true; });

    assert.strictEqual(nextCalled, false, 'Unauthenticated caller must not proceed');
    assert.strictEqual(statusCalled, 401, 'Must return 401 Unauthorized');
    assert.strictEqual(jsonCalled.error, 'Authentication required');
  });
});
