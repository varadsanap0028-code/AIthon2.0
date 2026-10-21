import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AdminDashboardPage } from '../pages/admin/AdminDashboardPage';
import { adminApi, type OverviewAnalyticsResponse } from '../services/adminApi';

// Mock Recharts ResponsiveContainer to avoid 0-dimension warnings in JSDOM
vi.mock('recharts', async () => {
  const original = await vi.importActual<any>('recharts');
  return {
    ...original,
    ResponsiveContainer: ({ children }: any) => (
      <div style={{ width: '500px', height: '300px' }}>{children}</div>
    ),
  };
});

const mockOverviewData: OverviewAnalyticsResponse = {
  range: '7d',
  generatedAt: '2026-10-20T10:00:00.000Z',
  kpis: {
    totalUsers: { value: 148, previous: 130, deltaPct: 14 },
    newUsers: { value: 18, previous: 12, deltaPct: 50 },
    activeStudents: { value: 64, previous: 50, deltaPct: 28 },
    activeRecruiters: { value: 15, previous: 10, deltaPct: 50 },
    openJobs: { value: 8, previous: 6, deltaPct: 33 },
    applications: { value: 85, previous: 60, deltaPct: 42 },
    testsCompleted: { value: 45, previous: 30, deltaPct: 50 },
    testPassRate: { value: 78, previous: 70, deltaPct: 11 },
    pendingApprovals: { value: 4, previous: 2, deltaPct: 100 },
    flaggedSessions: { value: 2, previous: 1, deltaPct: 100 },
  },
  series: {
    signupsByRole: [
      { date: '2026-10-14', student: 3, recruiter: 1, college: 0, reviewer: 0 },
      { date: '2026-10-15', student: 4, recruiter: 0, college: 1, reviewer: 0 },
    ],
    applicationsPerDay: [
      { date: '2026-10-14', count: 12 },
      { date: '2026-10-15', count: 18 },
    ],
    tests: [
      { date: '2026-10-14', started: 10, completed: 8, passed: 6 },
      { date: '2026-10-15', started: 12, completed: 10, passed: 8 },
    ],
  },
  roleMix: [
    { role: 'student', count: 120 },
    { role: 'recruiter', count: 20 },
    { role: 'college', count: 5 },
    { role: 'reviewer', count: 2 },
    { role: 'platform_admin', count: 1 },
  ],
  funnel: [
    { step: 'Signed up', count: 148 },
    { step: 'Profile completed', count: 112 },
    { step: 'Test started', count: 85 },
    { step: 'Test passed', count: 66 },
    { step: 'Applied', count: 54 },
  ],
  scoreDistribution: [
    { bucket: '0-10', count: 1 },
    { bucket: '11-20', count: 0 },
    { bucket: '21-30', count: 2 },
    { bucket: '31-40', count: 4 },
    { bucket: '41-50', count: 5 },
    { bucket: '51-60', count: 10 },
    { bucket: '61-70', count: 15 },
    { bucket: '71-80', count: 25 },
    { bucket: '81-90', count: 30 },
    { bucket: '91-100', count: 18 },
  ],
  topSkillsTested: [
    { skill: 'React', attempts: 50, avgScore: 78 },
    { skill: 'Node.js', attempts: 42, avgScore: 72 },
  ],
  attention: [
    {
      id: 'approvals_48h',
      severity: 'warning',
      title: 'Recruiter approvals waiting > 48 hours',
      count: 3,
      href: '/admin/recruiter-approvals?filter=pending_48h',
    },
    {
      id: 'flagged_24h',
      severity: 'danger',
      title: 'Suspicious test sessions unreviewed > 24 hours',
      count: 2,
      href: '/admin/test-integrity?filter=flagged_24h',
    },
  ],
};

const emptyOverviewData: OverviewAnalyticsResponse = {
  range: '7d',
  generatedAt: '2026-10-20T10:00:00.000Z',
  kpis: {
    totalUsers: { value: 0, previous: 0, deltaPct: null },
    newUsers: { value: 0, previous: 0, deltaPct: null },
    activeStudents: { value: 0, previous: 0, deltaPct: null },
    activeRecruiters: { value: 0, previous: 0, deltaPct: null },
    openJobs: { value: 0, previous: 0, deltaPct: null },
    applications: { value: 0, previous: 0, deltaPct: null },
    testsCompleted: { value: 0, previous: 0, deltaPct: null },
    testPassRate: { value: 0, previous: 0, deltaPct: null },
    pendingApprovals: { value: 0, previous: 0, deltaPct: null },
    flaggedSessions: { value: 0, previous: 0, deltaPct: null },
  },
  series: {
    signupsByRole: [],
    applicationsPerDay: [],
    tests: [],
  },
  roleMix: [],
  funnel: [
    { step: 'Signed up', count: 0 },
    { step: 'Profile completed', count: 0 },
    { step: 'Test started', count: 0 },
    { step: 'Test passed', count: 0 },
    { step: 'Applied', count: 0 },
  ],
  scoreDistribution: [
    { bucket: '0-10', count: 0 },
    { bucket: '11-20', count: 0 },
    { bucket: '21-30', count: 0 },
    { bucket: '31-40', count: 0 },
    { bucket: '41-50', count: 0 },
    { bucket: '51-60', count: 0 },
    { bucket: '61-70', count: 0 },
    { bucket: '71-80', count: 0 },
    { bucket: '81-90', count: 0 },
    { bucket: '91-100', count: 0 },
  ],
  topSkillsTested: [],
  attention: [],
};

describe('Admin Dashboard Component Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. Renders StatCards, charts, funnel, role mix, and attention items with data', async () => {
    vi.spyOn(adminApi, 'getOverviewAnalytics').mockResolvedValue(mockOverviewData);

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <AdminDashboardPage />
      </MemoryRouter>
    );

    // Initial loading or immediate resolve
    await waitFor(() => {
      expect(screen.getByText('Total People')).toBeInTheDocument();
    });

    // Check KPI values
    expect(screen.getAllByText('148').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('+18 new')).toBeInTheDocument();
    expect(screen.getByText('Active Students')).toBeInTheDocument();
    expect(screen.getByText('64')).toBeInTheDocument();
    expect(screen.getByText('+28%')).toBeInTheDocument();
    expect(screen.getByText('Active Recruiters')).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('Test Pass Rate')).toBeInTheDocument();
    expect(screen.getByText('78%')).toBeInTheDocument();

    // Check chart section titles
    expect(screen.getByText('New people by role')).toBeInTheDocument();
    expect(screen.getByText('Tests: started vs completed')).toBeInTheDocument();
    expect(screen.getByText('Candidate Funnel')).toBeInTheDocument();
    expect(screen.getByText('Role Mix')).toBeInTheDocument();
    expect(screen.getByText('Score Distribution')).toBeInTheDocument();
    expect(screen.getByText('Needs your attention')).toBeInTheDocument();

    // Check attention items
    expect(screen.getByText('Recruiter approvals waiting > 48 hours')).toBeInTheDocument();
    expect(screen.getByText('Suspicious test sessions unreviewed > 24 hours')).toBeInTheDocument();
    expect(screen.getByText('3 pending')).toBeInTheDocument();
    expect(screen.getByText('2 pending')).toBeInTheDocument();
  });

  it('2. Changes range when clicking segmented range switch buttons', async () => {
    const getOverviewSpy = vi.spyOn(adminApi, 'getOverviewAnalytics').mockResolvedValue(mockOverviewData);

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <AdminDashboardPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Total People')).toBeInTheDocument();
    });

    const thirtyDaysButton = screen.getByText('30 days');
    fireEvent.click(thirtyDaysButton);

    await waitFor(() => {
      expect(getOverviewSpy).toHaveBeenCalledWith('30d', false, expect.any(AbortSignal));
    });
  });

  it('3. Renders gracefully on empty data without NaN or crashes', async () => {
    vi.spyOn(adminApi, 'getOverviewAnalytics').mockResolvedValue(emptyOverviewData);

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <AdminDashboardPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Total People')).toBeInTheDocument();
    });

    // Check that values are 0 and no NaN appears
    expect(screen.getByText('+0 new')).toBeInTheDocument();
    expect(screen.getAllByText('0%').length).toBeGreaterThan(0);
    expect(screen.getByText('All caught up. No urgent items require your attention right now.')).toBeInTheDocument();
    expect(screen.getByText('No signup activity recorded for this period.')).toBeInTheDocument();
  });

  it('4. Displays inline error message and allows retry on network failure', async () => {
    const getOverviewSpy = vi
      .spyOn(adminApi, 'getOverviewAnalytics')
      .mockRejectedValueOnce(new Error('Internal server error'))
      .mockResolvedValueOnce(mockOverviewData);

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <AdminDashboardPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Internal server error')).toBeInTheDocument();
    });

    const retryButton = screen.getByText('Retry');
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(screen.getByText('Total People')).toBeInTheDocument();
    });
    expect(getOverviewSpy).toHaveBeenCalledTimes(2);
  });
});
