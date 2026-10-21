import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { verificationService } from '../../services/verificationService.js';
import { initDb } from '../../config/db.js';

describe('Skill Verification and Review Workflow', () => {
  test('enforces mandatory rationale and records decision audit trail', () => {
    initDb();

    // Rejection without proper rationale must fail
    assert.throws(() => {
      verificationService.submitReview({
        evidenceId: 'evi-2',
        reviewerId: 'usr-assessor-1',
        decision: 'verified',
        decisionRationale: 'ok', // too short
      });
    }, /A detailed decision rationale/);

    // Valid review
    const result = verificationService.submitReview({
      evidenceId: 'evi-2',
      reviewerId: 'usr-assessor-1',
      decision: 'verified',
      decisionRationale: 'Verified live cloud formation templates and test execution artifacts.',
      awardedProficiency: 4,
    });

    assert.strictEqual(result.decision, 'verified');
    assert.ok(result.reviewId);
  });
});
