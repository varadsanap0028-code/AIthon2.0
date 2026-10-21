import { describe, it, expect } from 'vitest';
import { initDb } from '../../server/src/config/db.js';
import { GradingService } from '../../server/src/services/assessmentV2/gradingService.js';
import { SessionService } from '../../server/src/services/assessmentV2/sessionService.js';

describe('Phase 0 Regression: Assessment Submission & Refresh Persistence Failure', () => {
  it('FAILING REGRESSION: submitting answers with submit payload does not persist answers in session consent_json, so getSessionResult loses user answers', async () => {
    const db = initDb();
    const testUserId = `usr-regress-${Date.now()}`;

    // Seed test candidate in users
    db.prepare(`
      INSERT INTO users (id, email, password_hash, full_name, role, status, created_at, updated_at)
      VALUES (?, ?, 'hash', 'Regression Test Student', 'candidate', 'active', datetime('now'), datetime('now'))
    `).run(testUserId, `${testUserId}@sarathi.test`);

    // Create session
    const session = SessionService.createSession({
      userId: testUserId,
      mode: 'practice',
      domainId: 'web-dev',
      role: 'Full-Stack Developer',
      scope: 'quiz_only',
    });

    const q1 = session.questions[0];
    const userSelectedOption = 0; // selected option 0

    // Submit session with answer in payload
    await GradingService.gradeSession(session.sessionId, testUserId, {
      answers: { [q1.id]: userSelectedOption },
      tasks: {},
    });

    // Simulate retrieval on refresh via getSessionResult (which latest-result uses)
    const freshResult = GradingService.getSessionResult(session.sessionId, testUserId);

    // The result's answersSummary SHOULD have preserved the user's selected option!
    const summaryItem = freshResult.answersSummary.find((a: any) => a.questionId === q1.id);

    expect(summaryItem).toBeDefined();
    // In current buggy code, draftAnswers was not updated in consent_json on submit,
    // so summaryItem.selectedOption is -1 (UNANSWERED) instead of 0!
    expect(summaryItem?.selectedOption).toBe(userSelectedOption);
  });
});
