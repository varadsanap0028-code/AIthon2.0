import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { assessmentService } from '../../services/assessmentService.js';
import { candidateService } from '../../services/candidateService.js';
import { verificationService } from '../../services/verificationService.js';
import { authService } from '../../services/authService.js';
import { initDb, getDb } from '../../config/db.js';

describe('Stage 2: Assessment & Skill Evidence Synchronization Integration', () => {
  const testStudentId = `usr-test-sync-${Date.now()}`;

  test('0. Setup candidate session in database', async () => {
    initDb();
    const session = await authService.getOrCreateStudentSession({
      id: testStudentId,
      email: `sync-candidate-${Date.now()}@test.sarathi`,
      fullName: 'Sync Candidate Tester',
      institution: 'Sarathi Engineering Institute',
      targetRole: 'Full-Stack Developer'
    });

    assert.ok(session.token);
    assert.strictEqual(session.user.id, testStudentId);
    assert.strictEqual(session.user.role, 'candidate');
  });

  test('1. Student assessment persistence records attempt, result, and diagnostic status', () => {
    initDb();
    const result = assessmentService.recordStudentAssessment({
      candidateId: testStudentId,
      domainId: 'dom-fullstack',
      targetRole: 'Full-Stack Developer',
      overallScore: 82,
      knowledgeScore: 80,
      practicalScore: 84,
      categoryScores: [{ category: 'Frontend', score: 85 }],
      skillScores: [
        { skillName: 'React.js', demonstratedLevel: 4, score: 85 },
        { skillName: 'TypeScript', demonstratedLevel: 4, score: 82 }
      ],
      strengths: ['React.js', 'TypeScript'],
      improvements: []
    });

    assert.ok(result.success);
    assert.ok(result.resultId);
    assert.strictEqual(result.attemptNumber, 1);
    assert.strictEqual(result.passed, true);

    // Verify in SQLite candidate_skills table
    const db = getDb();
    const reactSkill = db.prepare(`
      SELECT cs.*, s.name as skill_name 
      FROM candidate_skills cs
      JOIN skills s ON s.id = cs.skill_id
      WHERE cs.candidate_id = ? AND LOWER(s.name) = 'react.js';
    `).get(testStudentId);

    assert.ok(reactSkill, 'React.js candidate skill must be persisted');
    assert.strictEqual(reactSkill.proficiency, 4);
    assert.strictEqual(reactSkill.verification_status, 'diagnostic_tested', 'Must be diagnostic_tested, NOT verified');
    assert.strictEqual(reactSkill.source, 'diagnostic_assessment');
  });

  test('2. Repeated assessment attempts are tracked with incremental attempt numbers', () => {
    initDb();
    const secondResult = assessmentService.recordStudentAssessment({
      candidateId: testStudentId,
      domainId: 'dom-fullstack',
      targetRole: 'Full-Stack Developer',
      overallScore: 90,
      knowledgeScore: 92,
      practicalScore: 88,
      categoryScores: [{ category: 'Frontend', score: 90 }],
      skillScores: [
        { skillName: 'React.js', demonstratedLevel: 5, score: 92 }
      ],
      strengths: ['React.js'],
      improvements: []
    });

    assert.ok(secondResult.success);
    assert.strictEqual(secondResult.attemptNumber, 2, 'Second attempt must be numbered 2');

    const history = assessmentService.getStudentAssessmentHistory(testStudentId);
    assert.ok(history.length >= 2, 'History must contain all attempts without overwriting');
    assert.strictEqual(history[0].attempt_number, 2);
    assert.strictEqual(history[1].attempt_number, 1);
  });

  test('3. Project evidence submission validates URLs and places evidence into pending_review', () => {
    initDb();

    // Invalid URL check
    assert.throws(() => {
      candidateService.submitCandidateEvidence({
        candidateId: testStudentId,
        title: 'Invalid URL Project',
        description: 'Test project description with invalid URL',
        repositoryUrl: 'invalid-git-url',
        skillsDemonstrated: ['React.js']
      });
    }, /must start with http/);

    // Valid submission
    const submission = candidateService.submitCandidateEvidence({
      candidateId: testStudentId,
      title: 'Cloud Scalable E-Commerce Web App',
      description: 'Production React and Node.js microservices app with payment gateway integration.',
      repositoryUrl: 'https://github.com/sync-candidate/ecommerce-platform',
      liveDemoUrl: 'https://ecommerce-platform.demo.dev',
      skillsDemonstrated: ['React.js', 'Node.js'],
      technologies: ['React.js', 'Node.js', 'Docker'],
      domainId: 'dom-fullstack'
    });

    assert.ok(submission.success);
    assert.strictEqual(submission.createdCount, 2, 'Should create evidence for both demonstrated skills');
    assert.ok(submission.evidenceIds.length === 2);

    // Verify candidate profile repo_count updated
    const db = getDb();
    const profile = db.prepare('SELECT repo_count FROM candidate_profiles WHERE id = ?;').get(testStudentId);
    assert.ok(profile.repo_count >= 1, 'Repo count should increment');
  });

  test('4. Retrying evidence submission updates existing record without duplicate creation', () => {
    initDb();
    const retrySubmission = candidateService.submitCandidateEvidence({
      candidateId: testStudentId,
      title: 'Cloud Scalable E-Commerce Web App (Updated README)',
      description: 'Updated description for existing repo.',
      repositoryUrl: 'https://github.com/sync-candidate/ecommerce-platform',
      skillsDemonstrated: ['React.js', 'Node.js'],
      domainId: 'dom-fullstack'
    });

    assert.ok(retrySubmission.success);
    assert.strictEqual(retrySubmission.createdCount, 0, 'Must not duplicate existing evidence');
    assert.strictEqual(retrySubmission.updatedCount, 2, 'Must update existing evidence');
  });

  test('5. Recruiter verification queue surfaces evidence and review updates candidate passport', () => {
    initDb();
    const pendingList = verificationService.getPendingVerifications(null, { limit: 200 });
    const candidateItem = pendingList.find(item => item.candidate_id === testStudentId);
    assert.ok(candidateItem, 'Evidence must appear in recruiter pending verification queue');
    assert.strictEqual(candidateItem.verification_status, 'pending_review');

    // Recruiter approves the evidence
    const reviewResult = verificationService.submitReview({
      evidenceId: candidateItem.id,
      reviewerId: 'usr-recruiter-1',
      decision: 'verified',
      decisionRationale: 'Verified GitHub repository code quality, unit tests, and architecture.',
      awardedProficiency: 4
    });

    assert.ok(reviewResult.success);
    assert.strictEqual(reviewResult.decision, 'verified');

    // Candidate Skill Passport now reflects verified status
    const passport = candidateService.getCandidatePassport(testStudentId);
    assert.ok(passport);
    const verifiedSkill = passport.skills.find(s => s.skill_id === candidateItem.skill_id);
    assert.ok(verifiedSkill, 'Skill must exist in passport');
    assert.strictEqual(verifiedSkill.verification_status, 'verified', 'Skill must now be authoritative verified');
    assert.ok(verifiedSkill.verified_by_name.includes('Vikram Mehta'), 'Verified by name should be recorded');
  });
});
