import { describe, it, expect } from 'vitest';
import { toLegacyAssessmentResult } from '../adapters/toLegacyAssessmentResult';
import type { V2SessionResult } from '../types/assessmentV2';
import type { AssessmentResult } from '../types/assessment';
import goldenFixture from './fixtures/legacyAssessmentResult.golden.json';

describe('Assessment Result Frozen Output Contract', () => {
  it('correctly adapts V2 session result to match legacy AssessmentResult golden contract', () => {
    const v2Mock: V2SessionResult = {
      sessionId: 'asmt-golden-fixture-001',
      mode: 'secure',
      domainId: 'web-dev',
      role: 'Full-Stack Developer',
      technicalScore: 85,
      knowledgeScore: 80,
      practicalScore: 90,
      completedAt: '2026-10-17T12:00:00.000Z',
      skillScores: {
        'React': {
          skillName: 'React',
          category: 'Frontend',
          score: 88,
          level: 4,
          levelLabel: 'Advanced',
          evidenceCount: 3,
          confidence: 'high',
          knowledgeScore: 85,
          practicalScore: 90,
        },
        'Node.js': {
          skillName: 'Node.js',
          category: 'Backend',
          score: 80,
          level: 4,
          levelLabel: 'Advanced',
          evidenceCount: 2,
          confidence: 'medium',
          knowledgeScore: 75,
          practicalScore: 85,
        },
      },
      categoryScores: [
        {
          category: 'Frontend',
          score: 85,
          totalQuestions: 4,
          correctCount: 3,
          level: 'Advanced',
        },
        {
          category: 'Backend',
          score: 80,
          totalQuestions: 3,
          correctCount: 2,
          level: 'Advanced',
        },
      ],
      strengths: ['React', 'Node.js'],
      improvements: [],
      answersSummary: [
        {
          questionId: 'q-react-01',
          question: 'What hook handles component side effects?',
          skillName: 'React',
          selectedOption: 1,
          correctOption: 1,
          isCorrect: true,
          explanation: 'useEffect manages side-effects.',
        },
      ],
      practicalSummary: [
        {
          taskId: 'task-node-01',
          taskTitle: 'Express Middleware Implementation',
          skillName: 'Node.js',
          isPassed: true,
          feedback: 'All test assertions satisfied.',
        },
      ],
      integritySummary: {
        eventCount: 0,
        longestAwaySec: 0,
        level: 'none',
      },
    };

    const legacyResult: AssessmentResult = toLegacyAssessmentResult(v2Mock);

    expect(legacyResult.id).toBe(goldenFixture.id);
    expect(legacyResult.domainId).toBe(goldenFixture.domainId);
    expect(legacyResult.targetRole).toBe(goldenFixture.targetRole);
    expect(legacyResult.overallScore).toBe(goldenFixture.overallScore);
    expect(legacyResult.knowledgeScore).toBe(goldenFixture.knowledgeScore);
    expect(legacyResult.practicalScore).toBe(goldenFixture.practicalScore);
    expect(legacyResult.completedAt).toBe(goldenFixture.completedAt);

    expect(legacyResult.categoryScores).toEqual(goldenFixture.categoryScores);
    expect(legacyResult.skillScores).toEqual(goldenFixture.skillScores);
    expect(legacyResult.strengths).toEqual(goldenFixture.strengths);
    expect(legacyResult.improvements).toEqual(goldenFixture.improvements);
    expect(legacyResult.answersSummary).toEqual(goldenFixture.answersSummary);
    expect(legacyResult.practicalSummary).toEqual(goldenFixture.practicalSummary);
  });

  it('guarantees required fields exist for StudentContext downstream consumers', () => {
    const minimalV2: V2SessionResult = {
      sessionId: 'sess-min-002',
      mode: 'practice',
      domainId: 'web-dev',
      role: 'Frontend Developer',
      technicalScore: 72,
      knowledgeScore: 70,
      practicalScore: 75,
      completedAt: '2026-10-17',
      skillScores: {},
      categoryScores: [],
      strengths: [],
      improvements: [],
      answersSummary: [],
      practicalSummary: [],
    };

    const legacy = toLegacyAssessmentResult(minimalV2);

    expect(typeof legacy.id).toBe('string');
    expect(typeof legacy.domainId).toBe('string');
    expect(typeof legacy.targetRole).toBe('string');
    expect(typeof legacy.overallScore).toBe('number');
    expect(Array.isArray(legacy.categoryScores)).toBe(true);
    expect(Array.isArray(legacy.skillScores)).toBe(true);
    expect(Array.isArray(legacy.strengths)).toBe(true);
    expect(Array.isArray(legacy.improvements)).toBe(true);
  });
});
