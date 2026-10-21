import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCountdown } from '../hooks/useCountdown';
import { toLegacyAssessmentResult } from '../adapters/toLegacyAssessmentResult';
import type { V2SessionResult } from '../types/assessmentV2';

describe('Assessment V2 Engine & Countdown Hooks', () => {
  it('formats remaining time correctly into MM:SS', () => {
    const futureDate = new Date(Date.now() + 600 * 1000).toISOString(); // 10 minutes
    const { result } = renderHook(() => useCountdown({ expiresAt: futureDate }));

    expect(result.current.formattedTime).toMatch(/^(09|10):[0-5][0-9]$/);
    expect(result.current.isExpired).toBe(false);
    expect(result.current.isLowTime).toBe(false);
  });

  it('detects low time status when <= 5 minutes remaining', () => {
    const lowTimeDate = new Date(Date.now() + 180 * 1000).toISOString(); // 3 minutes
    const { result } = renderHook(() => useCountdown({ expiresAt: lowTimeDate }));

    expect(result.current.isLowTime).toBe(true);
    expect(result.current.isExpired).toBe(false);
  });

  it('triggers onExpire callback when countdown reaches zero', () => {
    vi.useFakeTimers();
    const onExpire = vi.fn();
    const almostDone = new Date(Date.now() + 1000).toISOString();

    const { result } = renderHook(() =>
      useCountdown({ expiresAt: almostDone, onExpire, enabled: true })
    );

    expect(result.current.isExpired).toBe(false);

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(result.current.isExpired).toBe(true);
    expect(onExpire).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  });

  it('purely adapts V2SessionResult to legacy assessment result structure without mutating', () => {
    const mockV2: V2SessionResult = {
      sessionId: 'sess-unit-123',
      mode: 'secure',
      domainId: 'web-dev',
      role: 'Full-Stack Developer',
      technicalScore: 88,
      knowledgeScore: 90,
      practicalScore: 86,
      completedAt: '2026-10-17T20:00:00.000Z',
      skillScores: {
        'React.js': {
          skillName: 'React.js',
          category: 'Frontend',
          score: 85,
          level: 4,
          levelLabel: 'Advanced',
          evidenceCount: 4,
          confidence: 'high',
          knowledgeScore: 90,
          practicalScore: 80,
        },
      },
      categoryScores: [
        {
          category: 'Frontend',
          score: 85,
          totalQuestions: 4,
          correctCount: 4,
          level: 'Advanced',
        },
      ],
      strengths: ['React.js'],
      improvements: [],
      answersSummary: [
        {
          questionId: 'q-1',
          question: 'What is useEffect?',
          skillName: 'React.js',
          selectedOption: 1,
          correctOption: 1,
          isCorrect: true,
          explanation: 'Side-effects',
        },
      ],
      practicalSummary: [
        {
          taskId: 't-1',
          taskTitle: 'Build Hook',
          skillName: 'React.js',
          isPassed: true,
          feedback: 'Passed',
        },
      ],
    };

    const legacy = toLegacyAssessmentResult(mockV2);

    expect(legacy.overallScore).toBe(88);
    expect(legacy.knowledgeScore).toBe(90);
    expect(legacy.practicalScore).toBe(86);
    expect(legacy.strengths).toEqual(['React.js']);
    const reactSkill = legacy.skillScores.find(s => s.skillName === 'React.js');
    expect(reactSkill).toBeDefined();
    expect(reactSkill?.demonstratedLevel).toBe(4);
    expect(reactSkill?.levelLabel).toBe('Advanced');
  });
});
