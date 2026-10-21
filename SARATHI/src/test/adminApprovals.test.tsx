import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AdminApprovalsPage } from '../pages/admin/approvals/AdminApprovalsPage';
import { ApprovalDrawer } from '../pages/admin/approvals/ApprovalDrawer';
import {
  adminApi,
  type AdminApprovalItem,
  type AdminApprovalDetail,
  type AdminApprovalStats,
  type AdminApprovalListResponse,
} from '../services/adminApi';

const mockApprovals: AdminApprovalItem[] = [
  {
    id: 'bv-1',
    orgId: 'org-1',
    company: 'Acme Cloud Corp',
    companySlug: 'acme-cloud-corp',
    recruiterUserId: 'usr-rec-1',
    recruiterName: 'Rachel Recruiter',
    recruiterEmail: 'rachel@acmecloud.com',
    emailVerified: true,
    documentType: 'gstin',
    documentName: 'acme-gstin.pdf',
    fileSize: 45000,
    mimeType: 'application/pdf',
    taxIdentifier: '27AAPCA1234C1Z5',
    status: 'pending',
    submittedAt: '2026-10-20T06:00:00.000Z',
    reviewedAt: null,
    waitingHours: 10.5,
    sla: 'ok',
    decisionReason: null,
    override: false,
  },
  {
    id: 'bv-2',
    orgId: 'org-2',
    company: 'Beta Logistics',
    companySlug: 'beta-logistics',
    recruiterUserId: 'usr-rec-2',
    recruiterName: 'Brian Beta',
    recruiterEmail: 'brian@gmail.com',
    emailVerified: false,
    documentType: 'pan',
    documentName: 'pan-card.jpg',
    fileSize: 22000,
    mimeType: 'image/jpeg',
    taxIdentifier: 'AABCB9999C',
    status: 'pending',
    submittedAt: '2026-10-18T00:00:00.000Z',
    reviewedAt: null,
    waitingHours: 60.0,
    sla: 'breached',
    decisionReason: null,
    override: false,
  },
];

const mockStats: AdminApprovalStats = {
  pendingCount: 2,
  avgTurnaroundHours30d: 14.2,
  approvalRate30d: 88,
  breaches: 1,
  decisionsPerDay: [
    { date: '2026-10-19', approved: 4, rejected: 1, needsInfo: 0 },
    { date: '2026-10-20', approved: 2, rejected: 0, needsInfo: 1 },
  ],
};

const mockDetail: AdminApprovalDetail = {
  id: 'bv-1',
  company: {
    id: 'org-1',
    name: 'Acme Cloud Corp',
    slug: 'acme-cloud-corp',
    verificationStatus: 'unverified',
    createdAt: '2026-10-01T00:00:00.000Z',
  },
  recruiter: {
    id: 'usr-rec-1',
    fullName: 'Rachel Recruiter',
    email: 'rachel@acmecloud.com',
    emailVerified: true,
    role: 'recruiter',
    status: 'active',
    lastLoginAt: '2026-10-20T08:00:00.000Z',
  },
  document: {
    id: 'bv-1',
    documentType: 'gstin',
    documentName: 'acme-gstin.pdf',
    fileSize: 45000,
    mimeType: 'application/pdf',
    submittedAt: '2026-10-20T06:00:00.000Z',
  },
  status: 'pending',
  submittedAt: '2026-10-20T06:00:00.000Z',
  waitingHours: 10.5,
  sla: 'ok',
  taxIdentifier: '27AAPCA1234C1Z5',
  decisionReason: null,
  decisionNotes: null,
  reviewedAt: null,
  reviewedBy: null,
  override: false,
  automatedHints: [
    {
      key: 'gstin_format',
      title: 'GSTIN Structure',
      status: 'pass',
      message: 'Valid GSTIN with embedded Company PAN (AAPCA1234C)',
    },
    {
      key: 'email_domain',
      title: 'Corporate Email Domain',
      status: 'pass',
      message: 'Corporate email domain (@acmecloud.com) verified',
    },
    {
      key: 'duplicate_document',
      title: 'Document Fingerprint',
      status: 'pass',
      message: 'Document fingerprint is unique across organisations',
    },
  ],
  earlierSubmissions: [],
  decisionHistory: [],
};

describe('AdminApprovalsPage Component Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(adminApi, 'getApprovalStats').mockResolvedValue(mockStats);
    vi.spyOn(adminApi, 'getReasonTemplates').mockResolvedValue([
      'Document unreadable',
      'Name does not match company',
      'Registration expired',
    ]);
    vi.spyOn(adminApi, 'getApprovals').mockResolvedValue({
      items: mockApprovals,
      total: 2,
      page: 1,
      pageSize: 20,
      statusCounts: {
        pending: 2,
        needs_info: 0,
        approved: 0,
        rejected: 0,
        all: 2,
      },
    });
    vi.spyOn(adminApi, 'getApprovalDetail').mockResolvedValue(mockDetail);
    vi.spyOn(adminApi, 'fetchDocumentBlob').mockResolvedValue({
      blobUrl: 'blob:http://localhost/test-doc',
      mimeType: 'application/pdf',
      filename: 'acme-gstin.pdf',
    });
  });

  it('1. Renders aggregated stats strip, tabs, and approvals table with SLA dots', async () => {
    render(
      <MemoryRouter>
        <AdminApprovalsPage />
      </MemoryRouter>
    );

    // Verify stats
    await waitFor(() => {
      expect(screen.getByText('Waiting Queue')).toBeInTheDocument();
      expect(screen.getByText('14.2h')).toBeInTheDocument();
      expect(screen.getByText('88%')).toBeInTheDocument();
    });

    // Verify table items
    expect(screen.getByText('Acme Cloud Corp')).toBeInTheDocument();
    expect(screen.getByText('Beta Logistics')).toBeInTheDocument();
    expect(screen.getByText('Rachel Recruiter')).toBeInTheDocument();

    // Verify SLA badges
    expect(screen.getByText('ok')).toBeInTheDocument();
    expect(screen.getByText('breached')).toBeInTheDocument();
  });

  it('2. Clicking table row opens ApprovalDrawer with company info and automated hints', async () => {
    render(
      <MemoryRouter>
        <AdminApprovalsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Acme Cloud Corp')).toBeInTheDocument();
    });

    // Click on row
    fireEvent.click(screen.getByText('Acme Cloud Corp'));

    // Drawer opens with automated checks
    await waitFor(() => {
      expect(screen.getByText('Automated Advisory Checks')).toBeInTheDocument();
      expect(screen.getByText('Valid GSTIN with embedded Company PAN (AAPCA1234C)')).toBeInTheDocument();
    });
  });

  it('3. ApprovalDrawer enforces at least 10 characters reason for Rejection', async () => {
    const onDecisionSubmitted = vi.fn();
    const onClose = vi.fn();

    render(
      <ApprovalDrawer
        verificationId="bv-1"
        isOpen={true}
        onClose={onClose}
        onDecisionSubmitted={onDecisionSubmitted}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Verification Decision')).toBeInTheDocument();
    });

    // Select Reject decision
    fireEvent.click(screen.getByText('Reject'));

    // Submit with short reason (<10 characters)
    const textarea = screen.getByPlaceholderText(/Provide a clear explanation/i);
    fireEvent.change(textarea, { target: { value: 'Too blur' } });

    fireEvent.click(screen.getByRole('button', { name: /Submit Decision/i }));

    // Validation error must appear
    await waitFor(() => {
      expect(
        screen.getByText(/A detailed reason \(at least 10 characters\) is required/i)
      ).toBeInTheDocument();
    });

    expect(onDecisionSubmitted).not.toHaveBeenCalled();
  });

  it('4. Selecting a reason template populates the reason textarea', async () => {
    render(
      <ApprovalDrawer
        verificationId="bv-1"
        isOpen={true}
        onClose={vi.fn()}
        onDecisionSubmitted={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Verification Decision')).toBeInTheDocument();
    });

    // Switch to Needs Info
    fireEvent.click(screen.getByText('Needs Info'));

    // Select template
    await waitFor(() => {
      expect(screen.getByText('Document unreadable')).toBeInTheDocument();
    });

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'Document unreadable' } });

    const textarea = screen.getByPlaceholderText(/Provide a clear explanation/i) as HTMLTextAreaElement;
    expect(textarea.value).toBe('Document unreadable');
  });

  it('5. Successfully submitting decision calls API and triggers callback', async () => {
    const submitDecisionSpy = vi
      .spyOn(adminApi, 'submitApprovalDecision')
      .mockResolvedValue({
        success: true,
        id: 'bv-1',
        decision: 'approve',
        companyVerificationStatus: 'verified',
        reviewedAt: '2026-10-20T12:00:00.000Z',
      });

    const onDecisionSubmitted = vi.fn();
    const onClose = vi.fn();

    render(
      <ApprovalDrawer
        verificationId="bv-1"
        isOpen={true}
        onClose={onClose}
        onDecisionSubmitted={onDecisionSubmitted}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Verification Decision')).toBeInTheDocument();
    });

    // Approve selected by default; click submit
    fireEvent.click(screen.getByRole('button', { name: /Submit Decision/i }));

    // Confirm dialog opens
    await waitFor(() => {
      expect(screen.getByText('Approve Recruiter Verification?')).toBeInTheDocument();
    });

    // Confirm in dialog
    fireEvent.click(screen.getByRole('button', { name: /Confirm approve/i }));

    await waitFor(() => {
      expect(submitDecisionSpy).toHaveBeenCalledWith('bv-1', expect.objectContaining({
        decision: 'approve',
      }));
      expect(onDecisionSubmitted).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });
});
