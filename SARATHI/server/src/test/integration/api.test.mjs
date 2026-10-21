import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { jobService } from '../../services/jobService.js';
import { candidateService } from '../../services/candidateService.js';
import { analyticsService } from '../../services/analyticsService.js';
import { organizationService } from '../../services/organizationService.js';
import { initDb } from '../../config/db.js';

describe('Recruiter Platform Core Workflows & Multi-Tenancy', () => {
  test('Organization live KPI analytics are computed dynamically from persisted data', () => {
    initDb();
    const orgId = 'org-demo-1';
    const metrics = analyticsService.getDashboardMetrics(orgId);

    assert.ok(metrics.kpiCards.activeJobs >= 4, `Expected activeJobs >= 4, got ${metrics.kpiCards.activeJobs}`);
    assert.ok(metrics.kpiCards.totalApplicants >= 4, `Expected totalApplicants >= 4, got ${metrics.kpiCards.totalApplicants}`);
    assert.ok(metrics.kpiCards.shortlistedCandidates >= 1);
    assert.ok(metrics.kpiCards.skillVerifiedCandidates >= 1);
    assert.ok(metrics.hiringFunnel.length === 6);
    assert.ok(metrics.recentApplicants.length > 0);
  });

  test('Candidate discovery filters correctly by domain, skills, and experience', () => {
    initDb();
    // Search candidates in AI/ML domain
    const aimlResult = candidateService.searchCandidates({
      domainId: 'dom-aiml',
      limit: 10,
    });
    assert.ok(aimlResult.candidates.length > 0);
    const hasDiya = aimlResult.candidates.some(c => c.full_name === 'Diya Sharma');
    assert.strictEqual(hasDiya, true, 'Diya Sharma should appear in AI/ML candidates');

    // Experience filter
    const expResult = candidateService.searchCandidates({
      minExperience: 3,
      limit: 10,
    });
    for (const cand of expResult.candidates) {
      assert.ok(cand.experience_years >= 3);
    }
  });

  test('Tenant isolation: jobs and applicants are scoped to active organization', () => {
    initDb();
    const org1Jobs = jobService.getJobs('org-demo-1');
    const org2Jobs = jobService.getJobs('org-demo-2');

    assert.ok(org1Jobs.length > 0);
    assert.strictEqual(org2Jobs.length, 0, 'Org 2 should have zero jobs initially');

    // Attempting to retrieve Org 1 job with Org 2 ID should return null
    const crossOrgJob = jobService.getJobById('org-demo-2', 'job-1');
    assert.strictEqual(crossOrgJob, null, 'Cross-org access must be denied');
  });

  test('Job CRUD lifecycle enforces valid state transitions and manages skill requirements', () => {
    initDb();
    const orgId = 'org-demo-1';
    const creatorId = 'usr-recruiter-1';

    const newJob = jobService.createJob(orgId, creatorId, {
      title: 'QA Automation Engineer (Integration Test)',
      description: 'End-to-end Playwright and Vitest testing suite development.',
      skills: [
        { skillId: 'sk-playwright', requirementType: 'required', targetProficiency: 4, weight: 1.5 },
        { skillId: 'sk-jest', requirementType: 'preferred', targetProficiency: 3, weight: 1.0 },
      ]
    });

    assert.ok(newJob.id);
    assert.strictEqual(newJob.status, 'draft');
    assert.strictEqual(newJob.skills.length, 2);

    // Transition from draft -> published
    const published = jobService.updateJob(orgId, newJob.id, { status: 'published' });
    assert.strictEqual(published.status, 'published');

    // Transition from published -> paused
    const paused = jobService.updateJob(orgId, newJob.id, { status: 'paused' });
    assert.strictEqual(paused.status, 'paused');

    // Clean up
    jobService.deleteJob(orgId, newJob.id);
  });
});
