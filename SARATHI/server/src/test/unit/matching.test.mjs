import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { matchingService } from '../../services/matchingService.js';
import { initDb } from '../../config/db.js';
import { runMigrations } from '../../data/migrate.mjs';

describe('Explainable Candidate Matching Engine', () => {
  test('separates match score, readiness score, and assessment bonuses', () => {
    initDb();
    const candidateId = 'usr-cand-1'; // Aarav Patel
    const jobId = 'job-1'; // Senior Full-Stack Engineer

    const result = matchingService.calculateJobMatch(candidateId, jobId);

    assert.ok(result.matchScore >= 0 && result.matchScore <= 100);
    assert.ok(result.requiredSkillCoverage >= 0 && result.requiredSkillCoverage <= 100);
    assert.ok(result.preferredSkillCoverage >= 0 && result.preferredSkillCoverage <= 100);
    assert.ok(result.readinessScore >= 0 && result.readinessScore <= 100);

    // Verify explanation is mathematically clear
    assert.ok(result.explanation.includes('Job match of'));
    assert.ok(result.explanation.includes('Required skills coverage is'));

    // Verify lists are populated
    assert.ok(Array.isArray(result.matchedRequired));
    assert.ok(Array.isArray(result.matchedPreferred));
    assert.ok(Array.isArray(result.unmetRequirements));
    assert.ok(Array.isArray(result.unverifiedSkills));

    // Candidate has verified React and TypeScript
    const hasReact = result.matchedRequired.some(s => s.skillName === 'React.js');
    assert.strictEqual(hasReact, true, 'Expected React.js to be in matchedRequired');
  });

  test('handles candidates applying for different domain roles gracefully', () => {
    initDb();
    const candidateId = 'usr-cand-3'; // Rohan Iyer (Backend)
    const jobId = 'job-1'; // Full-stack role seeking React & TypeScript

    const result = matchingService.calculateJobMatch(candidateId, jobId);

    assert.ok(result.matchScore < 80, 'Backend specialist should have lower match score for Frontend/Full-stack role');
    assert.ok(result.unmetRequirements.length > 0, 'Should identify missing frontend competencies');
    assert.ok(result.explanation.length > 20);
  });
});
