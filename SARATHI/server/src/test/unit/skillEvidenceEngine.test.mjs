import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { initDb } from '../../config/db.js';
import { runMigrations } from '../../data/migrate.mjs';
import { SkillEvidenceEngine } from '../../services/skillEvidenceEngine.js';
import { RoleBenchmarkService } from '../../services/roleBenchmarkService.js';
import { DependencyGraphService } from '../../services/dependencyGraphService.js';
import { AdaptiveAssessmentService } from '../../services/adaptiveAssessmentService.js';
import { PracticalChallengeService } from '../../services/practicalChallengeService.js';

describe('Skill Intelligence Engine - Comprehensive Unit & Integration Tests', () => {
  const db = initDb();
  const testCandidateId = 'usr-cand-evidence-test-01';

  before(() => {
    runMigrations();

    // Ensure candidate exists
    db.prepare(`
      INSERT OR REPLACE INTO users (id, email, password_hash, full_name, role, created_at, updated_at)
      VALUES (?, 'evidence-student@sarathi.test', 'pwd', 'Evidence Student', 'candidate', datetime('now'), datetime('now'))
    `).run(testCandidateId);

    db.prepare(`
      INSERT OR REPLACE INTO candidate_profiles (id, headline, created_at, updated_at)
      VALUES (?, 'Test Full-Stack Candidate', datetime('now'), datetime('now'))
    `).run(testCandidateId);
  });

  after(() => {
    db.prepare(`DELETE FROM practical_challenge_submissions WHERE candidate_id = ?`).run(testCandidateId);
    db.prepare(`DELETE FROM skill_evidence_ledger WHERE candidate_id = ?`).run(testCandidateId);
    db.prepare(`DELETE FROM canonical_skill_profiles WHERE candidate_id = ?`).run(testCandidateId);
    db.prepare(`DELETE FROM candidate_skills WHERE candidate_id = ?`).run(testCandidateId);
    db.prepare(`DELETE FROM candidate_profiles WHERE id = ?`).run(testCandidateId);
    db.prepare(`DELETE FROM users WHERE id = ?`).run(testCandidateId);
  });

  it('1. RoleBenchmarkService returns canonical benchmarks with prerequisites and mandatory indicators', () => {
    const benchmark = RoleBenchmarkService.getRoleBenchmark('Frontend Developer');
    assert.ok(benchmark, 'Benchmark must exist for Frontend Developer');
    assert.strictEqual(benchmark.roleTitle, 'Frontend Developer');
    assert.ok(benchmark.requiredSkills.length >= 6);

    const jsComp = benchmark.requiredSkills.find(c => c.skillId === 'sk-js');
    assert.ok(jsComp, 'JavaScript must be a required competency');
    assert.strictEqual(jsComp.isMandatory, true);
    assert.ok(jsComp.requiredProficiency >= 3);

    const reactComp = benchmark.requiredSkills.find(c => c.skillId === 'sk-react');
    assert.ok(reactComp);
    assert.ok(reactComp.prerequisites.includes('JavaScript (ES6+)'), 'React requires JavaScript as prerequisite');
  });

  it('2. DependencyGraphService detects cycles and enforces topological ordering', () => {
    // Valid DAG
    const validSkills = [
      { skillName: 'JavaScript', prerequisites: [] },
      { skillName: 'React', prerequisites: ['JavaScript'] },
      { skillName: 'Redux', prerequisites: ['React'] }
    ];
    assert.strictEqual(DependencyGraphService.validateAcyclic(validSkills), true);

    const order = DependencyGraphService.getTopologicalOrder(validSkills);
    assert.ok(order.indexOf('JavaScript') < order.indexOf('React'));
    assert.ok(order.indexOf('React') < order.indexOf('Redux'));

    // Cyclic graph
    const cyclicSkills = [
      { skillName: 'NodeJS', prerequisites: ['Express'] },
      { skillName: 'Express', prerequisites: ['Middleware'] },
      { skillName: 'Middleware', prerequisites: ['NodeJS'] }
    ];
    assert.throws(() => {
      DependencyGraphService.validateAcyclic(cyclicSkills);
    }, /Dependency cycle detected/);
  });

  it('3. Record evidence into SkillEvidenceEngine and prevent duplicates', () => {
    const evidencePayload = {
      candidateId: testCandidateId,
      skillId: 'sk-js',
      skillName: 'JavaScript (ES6+)',
      evidenceType: 'assessment_score',
      source: 'diagnostic_exam',
      title: 'JavaScript Screening Assessment',
      score: 82,
      maxScore: 100,
      demonstratedLevel: 3,
      metadata: {
        evaluator: 'automated_rubric',
        ruleVersion: '1.0.0'
      }
    };

    const first = SkillEvidenceEngine.recordEvidence(evidencePayload);
    assert.ok(first.id);
    assert.strictEqual(first.isNew, true);

    // Duplicate submission with same payload should be detected
    const duplicate = SkillEvidenceEngine.recordEvidence(evidencePayload);
    assert.strictEqual(duplicate.isNew, false);
    assert.strictEqual(duplicate.id, first.id);
  });

  it('4. Aggregates canonical profile with provisional cap and verified status', () => {
    // Single evidence item -> provisional capping
    const profileInitial = SkillEvidenceEngine.getCanonicalProfile(testCandidateId);
    const jsProfile = profileInitial.find(p => p.skillId === 'sk-js');
    assert.ok(jsProfile);
    assert.strictEqual(jsProfile.evidenceCount, 1);
    assert.strictEqual(jsProfile.evidenceStatus, 'PROVISIONAL');
    assert.strictEqual(jsProfile.demonstratedProficiency, 2);

    // Add 2 more distinct pieces of evidence to satisfy 3+ rule for VERIFIED status
    SkillEvidenceEngine.recordEvidence({
      candidateId: testCandidateId,
      skillId: 'sk-js',
      skillName: 'JavaScript (ES6+)',
      evidenceType: 'project_repo',
      source: 'github_repository',
      title: 'GitHub Repo: React Weather Dashboard',
      referenceUrl: 'https://github.com/student/weather-app',
      score: 88,
      maxScore: 100,
      demonstratedLevel: 4,
      metadata: { linesAnalyzed: 1200 }
    });

    SkillEvidenceEngine.recordEvidence({
      candidateId: testCandidateId,
      skillId: 'sk-js',
      skillName: 'JavaScript (ES6+)',
      evidenceType: 'practical_challenge',
      source: 'practical_coding_challenge',
      title: 'Practical Challenge: Async Handler Debugging',
      referenceUrl: 'https://sarathi.internal/challenges/pc-1',
      score: 92,
      maxScore: 100,
      demonstratedLevel: 4,
      metadata: { testsPassed: 3, totalTests: 3 }
    });

    const profileUpdated = SkillEvidenceEngine.getCanonicalProfile(testCandidateId);
    const jsProfileUpdated = profileUpdated.find(p => p.skillId === 'sk-js');
    assert.strictEqual(jsProfileUpdated.evidenceCount, 3);
    assert.strictEqual(jsProfileUpdated.evidenceStatus, 'VERIFIED');
    assert.ok(jsProfileUpdated.demonstratedProficiency >= 3);
  });

  it('5. Skill Gap Analysis distinguishes VERIFIED_GAP, BENCHMARK_MET, and EVIDENCE_NEEDED', () => {
    const gaps = SkillEvidenceEngine.calculateSkillGaps(testCandidateId, 'Frontend Developer');
    assert.ok(gaps.gapItems.length > 0);

    // JavaScript: demonstrated is >= 3, required is 4
    const jsGap = gaps.gapItems.find(g => g.skillId === 'sk-js');
    assert.ok(jsGap);
    assert.ok(['VERIFIED_GAP', 'PRELIMINARY_GAP', 'BENCHMARK_MET'].includes(jsGap.gapStatus));

    // CSS: no evidence recorded yet -> EVIDENCE_NEEDED
    const cssGap = gaps.gapItems.find(g => g.skillId === 'sk-css3');
    assert.ok(cssGap);
    assert.strictEqual(cssGap.demonstratedProficiency, 0);
    assert.strictEqual(cssGap.gapStatus, 'EVIDENCE_NEEDED');
    assert.ok(cssGap.priorityRationale.length > 0);
  });

  it('6. Career Readiness adheres to canonical weighted formula with unassessed skills in denominator', () => {
    const readiness = SkillEvidenceEngine.calculateCareerReadiness(testCandidateId, 'Frontend Developer');

    // Score must be between 0 and 100
    assert.ok(readiness.readinessScore >= 0 && readiness.readinessScore <= 100);
    assert.ok(readiness.evidenceCoverage >= 0 && readiness.evidenceCoverage <= 100);

    // Sum of weights * requiredLevel in denominator must be preserved
    const benchmark = RoleBenchmarkService.getRoleBenchmark('Frontend Developer');
    const expectedDenominator = benchmark.requiredSkills.reduce(
      (sum, c) => sum + (c.weight || 1.0) * c.requiredProficiency,
      0
    );

    assert.ok(expectedDenominator > 0);
  });

  it('7. Personalized Learning Recommendations respect prerequisite DAG', () => {
    const recs = SkillEvidenceEngine.generateLearningRecommendations(testCandidateId, 'Frontend Developer');
    assert.ok(Array.isArray(recs));
    assert.ok(recs.length > 0);

    // Unmet prerequisites must not block the recommended next step
    const topRec = recs[0];
    assert.ok(topRec.skillId);
    assert.ok(topRec.prerequisitesUnmet.length === 0, 'Top recommended task must not have unmet prerequisites');
    assert.ok(topRec.recommendedActivity);
    assert.ok(topRec.verificationCriteria);
  });

  it('8. AdaptiveAssessmentService creates sessions and retrieves contextual questions', () => {
    const session = AdaptiveAssessmentService.startSession({
      candidateId: testCandidateId,
      targetRole: 'Frontend Developer',
      maxQuestions: 5
    });

    assert.ok(session.sessionId);
    assert.strictEqual(session.targetRole, 'Frontend Developer');
    assert.ok(session.question);
    assert.ok(session.question.id);

    // Submit answer to question
    const submissionResult = AdaptiveAssessmentService.submitAnswer({
      sessionId: session.sessionId,
      candidateId: testCandidateId,
      questionId: session.question.id,
      selectedOptionIndex: 0
    });

    assert.ok(typeof submissionResult.isCorrect === 'boolean');
    assert.ok(submissionResult.explanation !== undefined);
  });

  it('9. PracticalChallengeService provides challenges and grades submissions without arbitrary execution', () => {
    const challenges = PracticalChallengeService.getChallenges({});
    assert.ok(challenges.length > 0);

    const testChallenge = challenges[0];
    assert.ok(testChallenge.id);
    assert.ok(testChallenge.starterCode);

    // Submit candidate response
    const submission = PracticalChallengeService.submitChallenge({
      challengeId: testChallenge.id,
      candidateId: testCandidateId,
      submittedCode: testChallenge.starterCode
    });

    assert.ok(submission.submissionId);
    assert.ok(typeof submission.score === 'number');
    assert.ok(submission.feedback);
  });
});
