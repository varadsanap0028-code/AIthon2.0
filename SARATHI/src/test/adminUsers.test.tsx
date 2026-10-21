import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AdminUsersPage } from '../pages/admin/users/AdminUsersPage';
import { adminApi, type AdminUserItem, type AdminUserDetailResponse } from '../services/adminApi';

const mockUsers: AdminUserItem[] = [
  {
    id: 'usr-1',
    email: 'alice@sarathi.dev',
    fullName: 'Alice Admin',
    role: 'platform_admin',
    status: 'active',
    emailVerified: true,
    avatarUrl: null,
    lastLoginAt: '2026-10-20T10:00:00.000Z',
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
  },
  {
    id: 'usr-2',
    email: 'bob@example.com',
    fullName: 'Bob Candidate',
    role: 'candidate',
    status: 'active',
    emailVerified: false,
    avatarUrl: null,
    lastLoginAt: null,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
  },
];

const mockUserDetail: AdminUserDetailResponse = {
  user: {
    id: 'usr-2',
    email: 'bob@example.com',
    fullName: 'Bob Candidate',
    role: 'candidate',
    status: 'active',
    companyName: null,
    institution: 'IIT Bombay',
    institutionId: null,
    timezone: 'Asia/Kolkata',
    avatarUrl: null,
    lastLoginAt: null,
    emailVerified: false,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
  },
  profile: {
    headline: 'Software Engineer Intern',
    target_role: 'Full Stack Engineer',
    experience_years: 1,
    location: 'Mumbai, India',
  },
  organisations: [],
  identities: [],
  counts: {
    applications: 5,
    tests: 2,
    jobs: 0,
    tickets: 0,
  },
  recentAudit: [
    {
      id: 'aud-1',
      adminId: 'usr-1',
      action: 'user.create',
      entityType: 'user',
      entityId: 'usr-2',
      reason: 'User registered',
      createdAt: '2026-09-01T00:00:00.000Z',
    },
  ],
};

describe('Admin Users Page & Drawer Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(adminApi, 'getMe').mockResolvedValue({
      id: 'usr-1',
      email: 'alice@sarathi.dev',
      fullName: 'Alice Admin',
      role: 'platform_admin',
      lastLoginAt: null,
    });
  });

  it('1. Renders users table with rows, headers, and person avatars', async () => {
    vi.spyOn(adminApi, 'getUsers').mockResolvedValue({
      items: mockUsers,
      total: 2,
      page: 1,
      pageSize: 20,
    });

    render(
      <MemoryRouter initialEntries={['/admin/users']}>
        <AdminUsersPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Alice Admin')).toBeInTheDocument();
      expect(screen.getByText('Bob Candidate')).toBeInTheDocument();
    });

    expect(screen.getByText('alice@sarathi.dev')).toBeInTheDocument();
    expect(screen.getByText('bob@example.com')).toBeInTheDocument();
    expect(screen.getByText('Export CSV')).toBeInTheDocument();
    expect(screen.getByText('Invite Staff')).toBeInTheDocument();
  });

  it('2. Multi-select checkboxes reveal sticky action bar with action buttons', async () => {
    vi.spyOn(adminApi, 'getUsers').mockResolvedValue({
      items: mockUsers,
      total: 2,
      page: 1,
      pageSize: 20,
    });

    render(
      <MemoryRouter initialEntries={['/admin/users']}>
        <AdminUsersPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Alice Admin')).toBeInTheDocument();
    });

    // Check individual row checkbox
    const checkboxes = screen.getAllByRole('checkbox');
    // First checkbox is select-all in header, second is row 1
    fireEvent.click(checkboxes[1]);

    await waitFor(() => {
      expect(screen.getByText('1 user selected')).toBeInTheDocument();
      expect(screen.getByText('Suspend Selected')).toBeInTheDocument();
      expect(screen.getByText('Activate Selected')).toBeInTheDocument();
      expect(screen.getByText('Export Selected')).toBeInTheDocument();
    });
  });

  it('3. Clicking a user row opens UserDrawer with tabs and account details', async () => {
    vi.spyOn(adminApi, 'getUsers').mockResolvedValue({
      items: mockUsers,
      total: 2,
      page: 1,
      pageSize: 20,
    });
    const detailSpy = vi.spyOn(adminApi, 'getUserDetail').mockResolvedValue(mockUserDetail);

    render(
      <MemoryRouter initialEntries={['/admin/users']}>
        <AdminUsersPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Bob Candidate')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Bob Candidate'));

    await waitFor(() => {
      expect(detailSpy).toHaveBeenCalledWith('usr-2');
      expect(screen.getByText('Candidate Profile')).toBeInTheDocument();
      expect(screen.getByText('Software Engineer Intern')).toBeInTheDocument();
    });

    // Switch to Activity tab
    fireEvent.click(screen.getByText('Activity'));
    await waitFor(() => {
      expect(screen.getByText('Applications')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    // Switch to Security tab
    fireEvent.click(screen.getByText('Security'));
    await waitFor(() => {
      expect(screen.getByText('Account Actions')).toBeInTheDocument();
      expect(screen.getByText('Suspend User')).toBeInTheDocument();
      expect(screen.getByText('Change Role')).toBeInTheDocument();
      expect(screen.getByText('Force Reset')).toBeInTheDocument();
    });

    // Switch to History tab
    fireEvent.click(screen.getByText('History'));
    await waitFor(() => {
      expect(screen.getByText('user.create')).toBeInTheDocument();
      expect(screen.getByText('User registered')).toBeInTheDocument();
    });
  });

  it('4. Self-protection: Current admin user cannot suspend their own account in the drawer', async () => {
    vi.spyOn(adminApi, 'getUsers').mockResolvedValue({
      items: mockUsers,
      total: 2,
      page: 1,
      pageSize: 20,
    });
    vi.spyOn(adminApi, 'getUserDetail').mockResolvedValue({
      ...mockUserDetail,
      user: {
        ...mockUserDetail.user,
        id: 'usr-1',
        email: 'alice@sarathi.dev',
        fullName: 'Alice Admin',
        role: 'platform_admin',
      },
    });

    render(
      <MemoryRouter initialEntries={['/admin/users']}>
        <AdminUsersPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Alice Admin')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Alice Admin'));

    await waitFor(() => {
      expect(screen.getByText('Security')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Security'));

    await waitFor(() => {
      const suspendBtn = screen.getByText('Suspend User');
      expect(suspendBtn).toBeDisabled();
    });
  });

  it('5. Invite Staff modal opens and validates inputs', async () => {
    vi.spyOn(adminApi, 'getUsers').mockResolvedValue({
      items: mockUsers,
      total: 2,
      page: 1,
      pageSize: 20,
    });
    const inviteSpy = vi.spyOn(adminApi, 'inviteStaff').mockResolvedValue({
      success: true,
      user: { id: 'usr-new', email: 'rev@sarathi.dev', fullName: 'Reviewer Ray', role: 'reviewer' },
      setupLink: '/reset-password?token=mocktoken123',
    });

    render(
      <MemoryRouter initialEntries={['/admin/users']}>
        <AdminUsersPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Invite Staff')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Invite Staff'));

    await waitFor(() => {
      expect(screen.getByText('Invite Staff Member')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('e.g. Jane Doe'), {
      target: { value: 'Reviewer Ray' },
    });
    fireEvent.change(screen.getByPlaceholderText('jane.doe@sarathi.dev'), {
      target: { value: 'rev@sarathi.dev' },
    });

    fireEvent.click(screen.getByText('Create & Generate Link'));

    await waitFor(() => {
      expect(inviteSpy).toHaveBeenCalledWith({
        name: 'Reviewer Ray',
        email: 'rev@sarathi.dev',
        role: 'reviewer',
      });
      expect(screen.getByText('Staff member invited successfully! The one-time setup link is valid for 48 hours.')).toBeInTheDocument();
    });
  });
});
