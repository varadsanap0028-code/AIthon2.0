import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { jobService } from '../../services/jobService.js';
import { authService } from '../../services/authService.js';
import { pipelineService } from '../../services/pipelineService.js';
import { initDb, getDb } from '../../config/db.js';

describe('Stage 1: Jobs & Opportunities Connection Integration', () => {
  test('getPublicJobs returns only published, non-deleted jobs with required skills and org metadata', () => {
    initDb();
    const jobs = jobService.getPublicJobs({ limit: 50, offset: 0 });

    assert.ok(Array.isArray(jobs), 'Expected jobs array to be returned');
    assert.ok(jobs.length > 0, 'Expected published jobs to be returned');

    // Verify all returned jobs are strictly published
    for (const job of jobs) {
      assert.strictEqual(job.status, 'published', `Job ${job.id} must be published`);
      assert.ok(job.company_name, 'Job must have company name');
      assert.ok(Array.isArray(job.required_skills), 'Job must have required_skills array');
      // Must not leak private recruiter notes
      assert.strictEqual(job.recruiter_notes, undefined);
    }

    // Verify draft or archived jobs are excluded
    const draftJob = jobs.find(j => j.id === 'job-5');
    assert.strictEqual(draftJob, undefined, 'Draft job-5 must not be included in public jobs');
  });

  test('getPublicJobById returns public job details and returns null for non-published jobs', () => {
    initDb();
    const pubJob = jobService.getPublicJobById('job-1');
    assert.ok(pubJob, 'job-1 is published and should be found');
    assert.strictEqual(pubJob.id, 'job-1');
    assert.strictEqual(pubJob.status, 'published');
    assert.ok(Array.isArray(pubJob.required_skills));

    const draftJob = jobService.getPublicJobById('job-5');
    assert.strictEqual(draftJob, null, 'Draft job-5 must return null for public lookup');

    const nonExistent = jobService.getPublicJobById('non-existent-id');
    assert.strictEqual(nonExistent, null, 'Non-existent job must return null');
  });

  test('Student candidate session provisioning ensures user & profile transactionally', async () => {
    initDb();
    const testStudent = {
      id: `usr-test-${Date.now()}`,
      email: `test-${Date.now()}@sarathi.test`,
      fullName: 'Integration Test Student',
      institution: 'Sarathi Test University',
      targetRole: 'Full-Stack Developer'
    };

    const session = await authService.getOrCreateStudentSession(testStudent);
    assert.ok(session.token, 'Session token should be generated');
    assert.strictEqual(session.user.id, testStudent.id);
    assert.strictEqual(session.user.role, 'candidate');

    // Verify in SQLite
    const db = getDb();
    const userRow = db.prepare('SELECT id, role, email FROM users WHERE id = ?').get(testStudent.id);
    assert.ok(userRow, 'User must exist in users table');
    assert.strictEqual(userRow.role, 'candidate');

    const profileRow = db.prepare('SELECT id FROM candidate_profiles WHERE id = ?').get(testStudent.id);
    assert.ok(profileRow, 'Candidate profile must exist in candidate_profiles table');
  });

  test('Application submission connects candidate to recruiter pipeline and prevents duplicates', async () => {
    initDb();

    // Ensure candidate
    const candidateId = `cand-stage1-test-${Date.now()}`;
    const studentUser = {
      id: candidateId,
      email: `cand-${Date.now()}@test.com`,
      fullName: 'Pipeline Applicant Test',
      institution: 'Test College',
      targetRole: 'Full-Stack Developer'
    };
    await authService.getOrCreateStudentSession(studentUser);

    // Get published job
    const job = jobService.getPublicJobById('job-1');
    assert.ok(job);

    // Create application
    const app = pipelineService.createApplication(
      job.org_id,
      job.id,
      candidateId,
      'Integration test application cover note'
    );

    assert.ok(app.id, 'Application ID should be returned');
    assert.strictEqual(app.stage, 'new_applicant', 'Initial stage must be new_applicant');

    // Verify application appears in recruiter pipeline applications list
    const applications = pipelineService.getApplications(job.org_id, { jobId: job.id });
    const appInPipeline = applications.find(a => a.candidate_id === candidateId);
    assert.ok(appInPipeline, 'Applicant must be visible in recruiter pipeline');
    assert.strictEqual(appInPipeline.stage, 'new_applicant');

    // Verify duplicate application rejection
    assert.throws(
      () => {
        pipelineService.createApplication(job.org_id, job.id, candidateId);
      },
      (err) => {
        return err.message.includes('already applied') || err.message.includes('UNIQUE constraint');
      },
      'Duplicate application must be rejected'
    );
  });
});
