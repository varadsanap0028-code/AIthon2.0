import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { pipelineService, PIPELINE_STAGES } from '../../services/pipelineService.js';
import { initDb } from '../../config/db.js';

import { authService } from '../../services/authService.js';

describe('Recruitment Pipeline Service', () => {
  test('validates stage list and preserves stage history', async () => {
    initDb();
    const orgId = 'org-demo-1';
    const candidateSession = await authService.getOrCreateStudentSession({
      id: `usr-pipeline-test-${Date.now()}`,
      email: `pipeline.test.${Date.now()}@sarathi.local`,
      fullName: 'Pipeline Unit Candidate',
      institution: 'Sarathi University',
    });
    const firstApp = pipelineService.createApplication(
      orgId,
      'job-1',
      candidateSession.user.id,
      'Unit test application'
    );
    assert.ok(PIPELINE_STAGES.includes(firstApp.stage));

    // Update stage
    const updated = pipelineService.updateStage(
      orgId,
      firstApp.id,
      'interview_scheduled',
      'usr-recruiter-1',
      'Candidate passed initial phone screen'
    );

    assert.strictEqual(updated.stage, 'interview_scheduled');
    assert.ok(updated.stageHistory.length >= 2);
    const lastHistory = updated.stageHistory[updated.stageHistory.length - 1];
    assert.strictEqual(lastHistory.to_stage, 'interview_scheduled');
    assert.strictEqual(lastHistory.reason, 'Candidate passed initial phone screen');
  });

  test('rejects invalid pipeline stages', () => {
    initDb();
    const orgId = 'org-demo-1';
    assert.throws(() => {
      pipelineService.updateStage(orgId, 'app-1', 'invalid_bogus_stage', 'usr-recruiter-1');
    }, /Invalid pipeline stage/);
  });
});
