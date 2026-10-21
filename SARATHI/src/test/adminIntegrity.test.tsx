import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AdminIntegrityPage } from '../pages/admin/integrity/AdminIntegrityPage';
import { adminApi } from '../services/adminApi';

// Mock adminApi
vi.mock('../services/adminApi', async () => {
  const actual = await vi.importActual<any>('../services/adminApi');
  return {
    ...actual,
    adminApi: {
      ...actual.adminApi,
      getIntegrityStats: vi.fn(),
      getIntegritySessions: vi.fn(),
      getIntegritySessionDetail: vi.fn(),
      getIntegrityComparison: vi.fn(),
      submitIntegrityReview: vi.fn(),
      recomputeIntegrityRisk: vi.fn(),
    },
  };
});

// Mock Recharts ResponsiveContainer to avoid SVG size errors in jsdom
vi.mock('recharts', async () => {
  const actual = await vi.importActual<any>('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  };
});

describe('Phase 5: AdminIntegrityPage Component Suite', () => {
  const mockStats = {
    unreviewedHighRisk: 3,
    totalGraded: 300,
    flaggedCount: 12,
    flagRatePct: 4.0,
    avgReviewHours: 1.8,
    overturnRate: 0.0,
    bandDistribution: { low: 240, medium: 48, high: 12 },
    flagsPerDay: [{ date: '2026-10-20', count: 3 }],
    topQuestions: [
      { id: 'q-1', title: 'Euclidean Distance Vector', totalSessions: 25, flaggedSessions: 3, flagRatePct: 12 },
    ],
  };

  const mockSessions = {
    sessions: [
      {
        id: 'ses-101',
        candidateId: 'usr-1',
        candidateName: 'Aarav Sharma',
        candidateEmail: 'aarav@demo.sarathi.test',
        role: 'AI/ML Engineer',
        domainId: 'dom-aiml',
        score: 88,
        band: 'high' as const,
        reasons: ['Pasted code covers 85% of final solution', 'Code shares 92% similarity with peer'],
        reviewStatus: 'unreviewed' as const,
        reviewDecision: null,
        reviewNote: null,
        reviewedAt: null,
        reviewerName: null,
        submittedAt: '2026-10-20T10:00:00Z',
        startedAt: '2026-10-20T09:40:00Z',
        technicalScore: 85,
      },
      {
        id: 'ses-102',
        candidateId: 'usr-2',
        candidateName: 'Diya Patel',
        candidateEmail: 'diya@demo.sarathi.test',
        role: 'Frontend Developer',
        domainId: 'dom-frontend',
        score: 22,
        band: 'low' as const,
        reasons: ['Clean progress recorded'],
        reviewStatus: 'clean' as const,
        reviewDecision: 'no_concern',
        reviewNote: 'Valid solution.',
        reviewedAt: '2026-10-20T11:00:00Z',
        reviewerName: 'Admin',
        submittedAt: '2026-10-20T10:30:00Z',
        startedAt: '2026-10-20T10:00:00Z',
        technicalScore: 92,
      },
    ],
    total: 2,
    page: 1,
    pageSize: 15,
    totalPages: 1,
  };

  const mockDetail = {
    session: {
      id: 'ses-101',
      userId: 'usr-1',
      candidateName: 'Aarav Sharma',
      candidateEmail: 'aarav@demo.sarathi.test',
      mode: 'secure',
      domainId: 'dom-aiml',
      role: 'AI/ML Engineer',
      status: 'graded',
      startedAt: '2026-10-20T09:40:00Z',
      submittedAt: '2026-10-20T10:00:00Z',
    },
    scores: {
      technicalScore: 85,
      knowledgeScore: 80,
      practicalScore: 90,
      skillScores: {},
      rubric: {},
    },
    questions: [{ id: 'q-1', title: 'Euclidean Distance' }],
    snapshots: [
      {
        question_id: 'q-1',
        code: 'def solve(): pass',
        language: 'python',
        reason: 'autosave',
        created_at: '2026-10-20T09:41:00Z',
      },
      {
        question_id: 'q-1',
        code: 'def solve(): return 42',
        language: 'python',
        reason: 'submit',
        created_at: '2026-10-20T10:00:00Z',
      },
    ],
    runResults: [],
    timeline: [
      { id: 'evt-1', type: 'paste_blocked', ts: '2026-10-20T09:45:00Z', relativeSeconds: 300, meta: { pastedLength: 200 } },
    ],
    risk: {
      sessionId: 'ses-101',
      score: 88,
      band: 'high' as const,
      features: {
        paste: 0.8,
        pasteRatio: 0.85,
        blur: 0.2,
        blurTime: 0.3,
        fast: 0.0,
        camera: 0.0,
        similarity: 0.92,
        firstTry: 0.0,
      },
      contributions: { paste: 1.12, pasteRatio: 1.36, similarity: 2.21 },
      reasons: ['Pasted code covers 85% of final solution', 'Code shares 92% similarity with peer'],
      modelVersion: '1.0.0',
      computedAt: '2026-10-20T10:00:05Z',
    },
    similarSessions: [
      { sessionId: 'ses-peer-9', pseudonym: 'Candidate B', similarityPct: 92, submittedAt: '2026-10-19T10:00:00Z' },
    ],
    reviews: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (adminApi.getIntegrityStats as any).mockResolvedValue(mockStats);
    (adminApi.getIntegritySessions as any).mockResolvedValue(mockSessions);
    (adminApi.getIntegritySessionDetail as any).mockResolvedValue(mockDetail);
  });

  it('1. Renders PageHeader and stats strip with live metrics', async () => {
    render(
      <MemoryRouter>
        <AdminIntegrityPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Test Integrity & Anti-Cheat Review')).toBeDefined();
    await waitFor(() => {
      expect(screen.getByText('Unreviewed High Risk')).toBeDefined();
      expect(screen.getByText('Platform Flag Rate')).toBeDefined();
      expect(screen.getByText('3')).toBeDefined(); // Unreviewed count
      expect(screen.getByText('4%')).toBeDefined(); // Flag rate
    });
  });

  it('2. Renders filter bar with Search input and dropdowns', async () => {
    render(
      <MemoryRouter>
        <AdminIntegrityPage />
      </MemoryRouter>
    );

    expect(screen.getByPlaceholderText(/Search candidate name, email, or session ID/i)).toBeDefined();
    expect(screen.getByDisplayValue('All Risk Bands')).toBeDefined();
    expect(screen.getByDisplayValue('All Review Statuses')).toBeDefined();
    expect(screen.getByDisplayValue('All Dates')).toBeDefined();
  });

  it('3. Renders data table with risk meters, candidate details, and band pills', async () => {
    render(
      <MemoryRouter>
        <AdminIntegrityPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Aarav Sharma')).toBeDefined();
      expect(screen.getByText('aarav@demo.sarathi.test')).toBeDefined();
      expect(screen.getByText('88')).toBeDefined(); // Risk score
      expect(screen.getByText('high')).toBeDefined(); // Band pill
      expect(screen.getByText('Diya Patel')).toBeDefined();
      expect(screen.getByText('22')).toBeDefined();
      expect(screen.getByText('low')).toBeDefined();
    });
  });

  it('4. Clicking "How Score Works" opens mathematical model modal', async () => {
    render(
      <MemoryRouter>
        <AdminIntegrityPage />
      </MemoryRouter>
    );

    const helpBtn = screen.getByText('How Score Works');
    fireEvent.click(helpBtn);

    await waitFor(() => {
      expect(screen.getByText('Anti-Cheat Risk Model Architecture')).toBeDefined();
      expect(screen.getByText(/Calibrated Feature Weights/i)).toBeDefined();
      expect(screen.getByText('pasteRatio')).toBeDefined();
      expect(screen.getByText('similarity')).toBeDefined();
    });
  });

  it('5. Clicking a row or Inspect button opens IntegrityDetailDrawer with code diff and decision form', async () => {
    render(
      <MemoryRouter>
        <AdminIntegrityPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Aarav Sharma')).toBeDefined();
    });

    const inspectBtns = screen.getAllByText('Inspect');
    fireEvent.click(inspectBtns[0]);

    await waitFor(() => {
      expect(screen.getByText('Proctoring Timeline')).toBeDefined();
      expect(screen.getByText('Code Inspection & Diff')).toBeDefined();
      expect(screen.getByText('Risk Factor Contributions')).toBeDefined();
      expect(screen.getByText('Admin Proctoring Judgment')).toBeDefined();
    });
  });
});
