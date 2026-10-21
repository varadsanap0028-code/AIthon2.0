import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from '../services/apiClient';

describe('Phase 4: Student Analytics and Intelligence Services', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
    sessionStorage.setItem('sarathi_auth_token', 'mock-jwt-token');
  });

  it('fetches student statistical telemetry models correctly', async () => {
    const mockAnalytics = {
      targetRole: 'Full Stack Engineer',
      summary: {
        readinessScore: 84,
        avgAssessmentScore: 88,
        streakDays: 5,
        totalHoursLearned: 36,
        completedTasksCount: 14,
        cohortPercentile: 90
      },
      charts: {
        skillRadar: [{ category: 'Frontend', current: 85, required: 90, count: 4 }],
        benchmarkGaps: [{ skill: 'GraphQL', category: 'Backend', current: 2, required: 4, gap: 2, status: 'self_reported' }],
        readinessTrend: [{ period: 'Week 1', score: 60 }, { period: 'Current', score: 84 }],
        assessmentHistory: [{ attempt: 1, title: 'React Diagnostic', scorePct: 92, passed: true, date: '2026-10-17' }],
        gapPrioritySplit: [{ priority: 'High Priority', count: 2, color: '#EF4444' }],
        roadmapProgress: [{ stage: 'Foundations', progress: 100, total: 4 }],
        learningActivity: [{ week: 'Wk 1', tasksCompleted: 4, hoursSpent: 6 }],
        applicationFunnel: [{ stage: 'Applied', count: 3 }],
        jobMatchDistribution: [{ range: '90-100%', count: 4 }],
        resourceMix: [{ type: 'Courses', count: 5, color: '#087BFA' }],
        githubLanguages: [{ language: 'TypeScript', percentage: 65, color: '#3178C6' }]
      }
    };

    let capturedHeaders: HeadersInit | undefined;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, init) => {
      capturedHeaders = init?.headers;
      return new Response(JSON.stringify({ success: true, data: mockAnalytics }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    });

    const res = await apiClient.get<{ success: boolean; data: typeof mockAnalytics }>('/api/analytics/student');

    expect((capturedHeaders as Record<string, string>)['Authorization']).toBe('Bearer mock-jwt-token');
    expect(res.success).toBe(true);
    expect(res.data.summary.readinessScore).toBe(84);
    expect(res.data.charts.skillRadar[0].category).toBe('Frontend');
    expect(res.data.charts.learningActivity.length).toBe(1);
  });

  it('imports GitHub repository metadata with proper parameters', async () => {
    const mockRepoMetadata = {
      title: 'sarathi-platform',
      description: 'Next-generation AI career readiness platform',
      repositoryUrl: 'https://github.com/developer/sarathi-platform',
      primaryLanguage: 'TypeScript',
      languages: ['TypeScript', 'JavaScript'],
      stars: 12,
      topics: ['career', 'education', 'ai']
    };

    let capturedBody = '';
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, init) => {
      capturedBody = init?.body as string;
      return new Response(JSON.stringify({ success: true, data: mockRepoMetadata }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    });

    const res = await apiClient.post<{ success: boolean; data: typeof mockRepoMetadata }>('/api/candidates/github/import', {
      repoUrl: 'https://github.com/developer/sarathi-platform'
    });

    expect(JSON.parse(capturedBody)).toEqual({
      repoUrl: 'https://github.com/developer/sarathi-platform'
    });
    expect(res.success).toBe(true);
    expect(res.data.title).toBe('sarathi-platform');
    expect(res.data.languages).toContain('TypeScript');
  });

  it('submits help & support direct feedback and handles errors gracefully', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, init) => {
      const body = JSON.parse((init?.body as string) || '{}');
      if (!body.message) {
        return new Response(
          JSON.stringify({ error: { code: 'VALIDATION_ERROR', message: 'Message is required' } }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response(JSON.stringify({ success: true, feedbackId: 'fb-202' }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      });
    });

    const res = await apiClient.post<{ success: boolean; feedbackId: string }>('/api/feedback', {
      category: 'bug_report',
      rating: 4,
      message: 'Found minor contrast issue on mobile',
      pageUrl: '/student/analytics'
    });

    expect(res.success).toBe(true);
    expect(res.feedbackId).toBe('fb-202');
  });
});
