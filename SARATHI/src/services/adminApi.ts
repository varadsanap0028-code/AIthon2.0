import { useState, useEffect, useCallback, useRef } from 'react';
import { request } from './apiClient';

export interface AdminMeResponse {
  id: string;
  email: string;
  fullName: string;
  role: string;
  lastLoginAt: string | null;
}

export interface NavBadgesResponse {
  pendingApprovals: number;
  flaggedSessions: number;
  openTickets: number;
}

export interface KpiMetric {
  value: number;
  previous: number;
  deltaPct: number | null;
}

export interface OverviewAnalyticsResponse {
  range: '7d' | '30d' | '90d';
  generatedAt: string;
  kpis: {
    totalUsers: KpiMetric;
    newUsers: KpiMetric;
    activeStudents: KpiMetric;
    activeRecruiters: KpiMetric;
    openJobs: KpiMetric;
    applications: KpiMetric;
    testsCompleted: KpiMetric;
    testPassRate: KpiMetric;
    pendingApprovals: KpiMetric;
    flaggedSessions: KpiMetric;
  };
  series: {
    signupsByRole: { date: string; student: number; recruiter: number; college: number; reviewer: number }[];
    applicationsPerDay: { date: string; count: number }[];
    tests: { date: string; started: number; completed: number; passed: number }[];
  };
  roleMix: { role: string; count: number }[];
  funnel: { step: string; count: number }[];
  scoreDistribution: { bucket: string; count: number }[];
  topSkillsTested: { skill: string; attempts: number; avgScore: number }[];
  attention: { id: string; severity: 'warning' | 'danger' | 'info'; title: string; count: number; href: string }[];
}
export interface AdminUserItem {
  id: string;
  email: string;
  fullName: string;
  role: string;
  status: 'active' | 'suspended';
  emailVerified: boolean;
  avatarUrl: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminUserListResponse {
  items: AdminUserItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AdminUserDetailResponse {
  user: {
    id: string;
    email: string;
    fullName: string;
    role: string;
    status: 'active' | 'suspended';
    companyName: string | null;
    institution: string | null;
    institutionId: string | null;
    timezone: string;
    avatarUrl: string | null;
    lastLoginAt: string | null;
    emailVerified: boolean;
    createdAt: string;
    updatedAt: string;
  };
  profile: any;
  organisations: {
    id: string;
    orgId: string;
    name: string;
    slug: string;
    role: string;
    status: string;
  }[];
  identities: {
    provider: string;
    email: string;
    linkedAt: string;
    lastLoginAt: string;
  }[];
  counts: {
    applications: number;
    tests: number;
    jobs: number;
    tickets: number;
  };
  recentAudit: {
    id: string;
    adminId: string;
    action: string;
    entityType: string;
    entityId: string;
    reason: string | null;
    createdAt: string;
  }[];
}

export interface AutomatedHint {
  key: string;
  title: string;
  status: 'pass' | 'warn' | 'fail' | 'unknown';
  message: string;
}

export interface AdminApprovalItem {
  id: string;
  orgId: string;
  company: string;
  companySlug: string;
  recruiterUserId: string;
  recruiterName: string;
  recruiterEmail: string;
  emailVerified: boolean;
  documentType: string;
  documentName: string;
  fileSize: number;
  mimeType: string;
  taxIdentifier: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'needs_info';
  submittedAt: string;
  reviewedAt: string | null;
  waitingHours: number;
  sla: 'ok' | 'warning' | 'breached';
  decisionReason: string | null;
  override: boolean;
}

export interface AdminApprovalListResponse {
  items: AdminApprovalItem[];
  total: number;
  page: number;
  pageSize: number;
  statusCounts: {
    pending: number;
    needs_info: number;
    approved: number;
    rejected: number;
    all: number;
  };
}

export interface AdminApprovalStats {
  pendingCount: number;
  avgTurnaroundHours30d: number;
  approvalRate30d: number;
  breaches: number;
  decisionsPerDay: {
    date: string;
    approved: number;
    rejected: number;
    needsInfo: number;
  }[];
}

export interface AdminApprovalDetail {
  id: string;
  company: {
    id: string;
    name: string;
    slug: string;
    verificationStatus: string;
    createdAt: string;
  };
  recruiter: {
    id: string;
    fullName: string;
    email: string;
    emailVerified: boolean;
    role: string;
    status: string;
    lastLoginAt: string | null;
  };
  document: {
    id: string;
    documentType: string;
    documentName: string;
    fileSize: number;
    mimeType: string;
    submittedAt: string;
  };
  status: 'pending' | 'approved' | 'rejected' | 'needs_info';
  submittedAt: string;
  waitingHours: number;
  sla: 'ok' | 'warning' | 'breached';
  taxIdentifier: string | null;
  decisionReason: string | null;
  decisionNotes: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  override: boolean;
  automatedHints: AutomatedHint[];
  earlierSubmissions: {
    id: string;
    document_type: string;
    document_name: string;
    status: string;
    submitted_at: string;
    reviewed_at: string | null;
  }[];
  decisionHistory: {
    id: string;
    action: string;
    adminName: string;
    reason: string | null;
    createdAt: string;
    details: any;
  }[];
}

export const adminApi = {
  /**
   * Fetch current authenticated admin user profile
   */
  async getMe(signal?: AbortSignal): Promise<AdminMeResponse> {
    return request<AdminMeResponse>('/api/admin/me', { signal });
  },

  /**
   * Fetch badge counts for navigation sidebar
   */
  async getNavBadges(signal?: AbortSignal): Promise<NavBadgesResponse> {
    return request<NavBadgesResponse>('/api/admin/nav-badges', { signal });
  },

  /**
   * Fetch platform overview analytics
   */
  async getOverviewAnalytics(
    range: '7d' | '30d' | '90d' = '7d',
    fresh = false,
    signal?: AbortSignal
  ): Promise<OverviewAnalyticsResponse> {
    return request<OverviewAnalyticsResponse>('/api/admin/analytics/overview', {
      params: { range, fresh: fresh ? '1' : '0' },
      signal,
    });
  },

  /**
   * List users with multi-criteria filtering, sorting, and pagination.
   */
  async getUsers(
    params: {
      q?: string;
      role?: string;
      status?: string;
      emailVerified?: string | boolean;
      createdFrom?: string;
      createdTo?: string;
      inactiveDays?: number | string;
      sort?: string;
      order?: 'ASC' | 'DESC' | 'asc' | 'desc';
      page?: number;
      pageSize?: number;
    } = {},
    signal?: AbortSignal
  ): Promise<AdminUserListResponse> {
    return request<AdminUserListResponse>('/api/admin/users', {
      params: params as any,
      signal,
    });
  },

  /**
   * Get user detail by ID including profiles, org memberships, SSO links, and audit history.
   */
  async getUserDetail(id: string, signal?: AbortSignal): Promise<AdminUserDetailResponse> {
    return request<AdminUserDetailResponse>(`/api/admin/users/${id}`, { signal });
  },

  /**
   * Update user status (active / suspended) with required reason.
   */
  async updateUserStatus(
    id: string,
    body: { status: 'active' | 'suspended'; reason: string }
  ): Promise<{ id: string; status: string; previousStatus: string }> {
    return request<{ id: string; status: string; previousStatus: string }>(
      `/api/admin/users/${id}/status`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    );
  },

  /**
   * Update user platform role.
   */
  async updateUserRole(
    id: string,
    body: { role: string; reason?: string }
  ): Promise<{ id: string; role: string; previousRole: string; warning?: string | null }> {
    return request<{ id: string; role: string; previousRole: string; warning?: string | null }>(
      `/api/admin/users/${id}/role`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    );
  },

  /**
   * Invalidate prior tokens and generate a fresh one-time reset link.
   */
  async forcePasswordReset(
    id: string
  ): Promise<{ success: boolean; message: string; resetLink?: string }> {
    return request<{ success: boolean; message: string; resetLink?: string }>(
      `/api/admin/users/${id}/force-password-reset`,
      {
        method: 'POST',
      }
    );
  },

  /**
   * Bulk update status for up to 200 users.
   */
  async bulkUpdateStatus(body: {
    ids: string[];
    status: 'active' | 'suspended';
    reason: string;
  }): Promise<{
    results: { id: string; success: boolean; error?: string }[];
    totalRequested: number;
    updatedCount: number;
    skippedCount: number;
  }> {
    return request<{
      results: { id: string; success: boolean; error?: string }[];
      totalRequested: number;
      updatedCount: number;
      skippedCount: number;
    }>('/api/admin/users/bulk-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  },

  /**
   * Invite staff member (reviewer or platform_admin) with a 48h setup link.
   */
  async inviteStaff(body: {
    email: string;
    name: string;
    role: 'reviewer' | 'platform_admin';
  }): Promise<{
    success: boolean;
    user: { id: string; email: string; fullName: string; role: string };
    setupLink: string;
  }> {
    return request<{
      success: boolean;
      user: { id: string; email: string; fullName: string; role: string };
      setupLink: string;
    }>('/api/admin/users/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  },

  /**
   * Recruiter Approvals: List business verifications with filters and SLA
   */
  async getApprovals(
    params?: {
      status?: string;
      q?: string;
      olderThanHours?: number | string;
      documentType?: string;
      sort?: string;
      page?: number;
      pageSize?: number;
    },
    signal?: AbortSignal
  ): Promise<AdminApprovalListResponse> {
    return request<AdminApprovalListResponse>('/api/admin/approvals', {
      params,
      signal,
    });
  },

  /**
   * Recruiter Approvals: Aggregated stats for top strip
   */
  async getApprovalStats(signal?: AbortSignal): Promise<AdminApprovalStats> {
    return request<AdminApprovalStats>('/api/admin/approvals/stats', { signal });
  },

  /**
   * Recruiter Approvals: Predefined reason templates
   */
  async getReasonTemplates(signal?: AbortSignal): Promise<string[]> {
    return request<string[]>('/api/admin/approvals/reason-templates', { signal });
  },

  /**
   * Recruiter Approvals: Full item detail including hints & history
   */
  async getApprovalDetail(id: string, signal?: AbortSignal): Promise<AdminApprovalDetail> {
    return request<AdminApprovalDetail>(`/api/admin/approvals/${encodeURIComponent(id)}`, { signal });
  },

  /**
   * Recruiter Approvals: Submit review decision (approve, reject, needs_info)
   */
  async submitApprovalDecision(
    id: string,
    body: {
      decision: 'approve' | 'reject' | 'needs_info';
      reason?: string;
      notes?: string;
      override?: boolean;
    }
  ): Promise<{
    success: boolean;
    id: string;
    decision: string;
    companyVerificationStatus: string;
    reviewedAt: string;
  }> {
    return request(`/api/admin/approvals/${encodeURIComponent(id)}/decision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  },

  /**
   * Recruiter Approvals: Fetch document attachment as a blob URL for safe in-browser viewing
   */
  async fetchDocumentBlob(
    id: string,
    signal?: AbortSignal
  ): Promise<{ blobUrl: string; mimeType: string; filename: string }> {
    const token = typeof window !== 'undefined'
      ? (sessionStorage.getItem('sarathi_auth_token') || localStorage.getItem('sarathi_auth_token'))
      : null;

    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`/api/admin/approvals/${encodeURIComponent(id)}/document`, {
      headers,
      signal,
    });

    if (!response.ok) {
      let errorMsg = 'Failed to load document';
      try {
        const errJson = await response.json();
        errorMsg = errJson.error || errorMsg;
      } catch {}
      throw new Error(errorMsg);
    }

    const mimeType = response.headers.get('content-type') || 'application/octet-stream';
    const disposition = response.headers.get('content-disposition') || '';
    const filenameMatch = disposition.match(/filename="?([^"]+)"?/i);
    const filename = filenameMatch ? filenameMatch[1] : 'document';

    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);

    return { blobUrl, mimeType, filename };
  },

  /**
   * Fetch aggregate test integrity statistics and trends
   */
  async getIntegrityStats(signal?: AbortSignal): Promise<IntegrityStatsResponse> {
    return request<IntegrityStatsResponse>('/api/admin/integrity/stats', { signal });
  },

  /**
   * Fetch paginated assessment sessions for integrity review
   */
  async getIntegritySessions(
    params: {
      band?: string;
      reviewStatus?: string;
      question?: string;
      dateRange?: string;
      q?: string;
      page?: number;
      pageSize?: number;
    } = {},
    signal?: AbortSignal
  ): Promise<IntegritySessionsResponse> {
    const searchParams = new URLSearchParams();
    if (params.band && params.band !== 'all') searchParams.set('band', params.band);
    if (params.reviewStatus && params.reviewStatus !== 'all') searchParams.set('reviewStatus', params.reviewStatus);
    if (params.question) searchParams.set('question', params.question);
    if (params.dateRange && params.dateRange !== 'all') searchParams.set('dateRange', params.dateRange);
    if (params.q) searchParams.set('q', params.q);
    if (params.page) searchParams.set('page', String(params.page));
    if (params.pageSize) searchParams.set('pageSize', String(params.pageSize));

    const qs = searchParams.toString();
    return request<IntegritySessionsResponse>(`/api/admin/integrity/sessions${qs ? `?${qs}` : ''}`, { signal });
  },

  /**
   * Fetch detailed session attempt and proctoring logs for inspection
   */
  async getIntegritySessionDetail(sessionId: string, signal?: AbortSignal): Promise<IntegritySessionDetailResponse> {
    return request<IntegritySessionDetailResponse>(`/api/admin/integrity/sessions/${encodeURIComponent(sessionId)}`, { signal });
  },

  /**
   * Fetch diff comparison between two submissions with peer anonymized
   */
  async getIntegrityComparison(
    sessionId: string,
    otherSessionId: string,
    signal?: AbortSignal
  ): Promise<IntegrityComparisonResponse> {
    return request<IntegrityComparisonResponse>(
      `/api/admin/integrity/sessions/${encodeURIComponent(sessionId)}/compare/${encodeURIComponent(otherSessionId)}`,
      { signal }
    );
  },

  /**
   * Submit human review decision (clean, violation, escalate) with optional score invalidation
   */
  async submitIntegrityReview(
    sessionId: string,
    payload: {
      decision: 'clean' | 'violation' | 'escalate';
      notes: string;
      invalidateScore?: boolean;
    }
  ): Promise<{ success: boolean; sessionId: string; decision: string; isOverride: boolean; scoreInvalidated: boolean }> {
    return request(`/api/admin/integrity/sessions/${encodeURIComponent(sessionId)}/review`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Trigger on-demand recalculation of integrity risk score
   */
  async recomputeIntegrityRisk(sessionId: string): Promise<any> {
    return request(`/api/admin/integrity/sessions/${encodeURIComponent(sessionId)}/recompute`, {
      method: 'POST',
    });
  },

  // =================== CONTENT MANAGEMENT ===================
  async getDomains(signal?: AbortSignal): Promise<{ domains: any[] }> {
    return request('/api/admin/content/domains', { signal });
  },

  async createDomain(body: { title: string; description?: string; iconName?: string; badgeColor?: string }): Promise<any> {
    return request('/api/admin/content/domains', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  },

  async updateDomain(id: string, body: any): Promise<any> {
    return request(`/api/admin/content/domains/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  },

  async archiveDomain(id: string): Promise<any> {
    return request(`/api/admin/content/domains/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  async getSkills(params?: any, signal?: AbortSignal): Promise<any> {
    return request('/api/admin/content/skills', { params, signal });
  },

  async getSkill(id: string, signal?: AbortSignal): Promise<any> {
    return request(`/api/admin/content/skills/${encodeURIComponent(id)}`, { signal });
  },

  async getSkillUsage(id: string, signal?: AbortSignal): Promise<any> {
    return request(`/api/admin/content/skills/${encodeURIComponent(id)}/usage`, { signal });
  },

  async createSkill(body: any): Promise<any> {
    return request('/api/admin/content/skills', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  },

  async updateSkill(id: string, body: any): Promise<any> {
    return request(`/api/admin/content/skills/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  },

  async archiveSkill(id: string): Promise<any> {
    return request(`/api/admin/content/skills/${encodeURIComponent(id)}/archive`, {
      method: 'POST',
    });
  },

  async deleteSkill(id: string, archive?: boolean): Promise<any> {
    return request(`/api/admin/content/skills/${encodeURIComponent(id)}${archive ? '?archive=true' : ''}`, {
      method: 'DELETE',
    });
  },

  async addSkillAlias(skillId: string, alias: string): Promise<any> {
    return request(`/api/admin/content/skills/${encodeURIComponent(skillId)}/aliases`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alias }),
    });
  },

  async removeSkillAlias(skillId: string, aliasId: string): Promise<any> {
    return request(`/api/admin/content/skills/${encodeURIComponent(skillId)}/aliases/${encodeURIComponent(aliasId)}`, {
      method: 'DELETE',
    });
  },

  async getDuplicateSkills(signal?: AbortSignal): Promise<{ duplicates: any[] }> {
    return request('/api/admin/content/skills/duplicates', { signal });
  },

  async mergeSkills(payload: { sourceId: string; targetId: string; reason?: string; dryRun?: boolean }): Promise<any> {
    return request('/api/admin/content/skills/merge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },

  async getBenchmarks(signal?: AbortSignal): Promise<{ benchmarks: any[] }> {
    return request('/api/admin/content/benchmarks', { signal });
  },

  async getBenchmark(id: string, signal?: AbortSignal): Promise<{ benchmark: any }> {
    return request(`/api/admin/content/benchmarks/${encodeURIComponent(id)}`, { signal });
  },

  async saveBenchmark(body: any): Promise<{ benchmark: any }> {
    return request('/api/admin/content/benchmarks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  },

  async getResources(params?: any, signal?: AbortSignal): Promise<any> {
    return request('/api/admin/content/resources', { params, signal });
  },

  async checkResourceLink(id: string): Promise<any> {
    return request(`/api/admin/content/resources/${encodeURIComponent(id)}/check-link`, {
      method: 'POST',
    });
  },

  async checkAllResourceLinks(): Promise<any> {
    return request('/api/admin/content/resources/check-links', {
      method: 'POST',
    });
  },

  async importResources(items: any[], preview?: boolean): Promise<any> {
    return request(`/api/admin/content/resources/import${preview ? '?preview=true' : ''}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    });
  },

  // =================== SUPPORT DESK ===================
  async getSupportTickets(params?: any, signal?: AbortSignal): Promise<{ tickets: any[]; pagination: any }> {
    return request('/api/admin/support/tickets', { params, signal });
  },

  async getSupportTicketDetail(id: string, signal?: AbortSignal): Promise<{ ticket: any }> {
    return request(`/api/admin/support/tickets/${encodeURIComponent(id)}`, { signal });
  },

  async getSupportStats(signal?: AbortSignal): Promise<any> {
    return request('/api/admin/support/tickets/stats', { signal });
  },

  async replySupportTicket(id: string, body: { body: string; isInternalNote?: boolean; setStatus?: string }): Promise<any> {
    return request(`/api/admin/support/tickets/${encodeURIComponent(id)}/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  },

  async updateSupportTicket(id: string, body: any): Promise<any> {
    return request(`/api/admin/support/tickets/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  },

  async getCannedResponses(signal?: AbortSignal): Promise<{ canned: any[] }> {
    return request('/api/admin/support/canned', { signal });
  },

  async createCannedResponse(body: { title: string; body: string }): Promise<any> {
    return request('/api/admin/support/canned', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  },

  async deleteCannedResponse(id: string): Promise<any> {
    return request(`/api/admin/support/canned/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  // =================== ANNOUNCEMENTS ===================
  async getAnnouncements(signal?: AbortSignal): Promise<{ announcements: any[] }> {
    return request('/api/admin/announcements/announcements', { signal });
  },

  async createAnnouncement(body: any): Promise<any> {
    return request('/api/admin/announcements/announcements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  },

  async toggleAnnouncement(id: string, active?: boolean): Promise<any> {
    return request(`/api/admin/announcements/announcements/${encodeURIComponent(id)}/toggle`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active }),
    });
  },

  // =================== INSIGHTS (PHASE 8) ===================
  async getForecast(metric = 'applications', horizon = 14, signal?: AbortSignal): Promise<any> {
    return request(`/api/admin/insights/forecast?metric=${encodeURIComponent(metric)}&horizon=${horizon}`, { signal });
  },

  async getAnomalies(days = 60, signal?: AbortSignal): Promise<any> {
    return request(`/api/admin/insights/anomalies?days=${days}`, { signal });
  },

  async getRecruiterTrust(orgId?: string, signal?: AbortSignal): Promise<any> {
    const url = orgId ? `/api/admin/insights/recruiter-trust/${encodeURIComponent(orgId)}` : '/api/admin/insights/recruiter-trust';
    return request(url, { signal });
  },

  async getSkillGapMarket(signal?: AbortSignal): Promise<any> {
    return request('/api/admin/insights/skill-gap-market', { signal });
  },

  async getFunnelCohorts(weeks = 8, signal?: AbortSignal): Promise<any> {
    return request(`/api/admin/insights/funnel-cohorts?weeks=${weeks}`, { signal });
  },

  async getCorrelations(signal?: AbortSignal): Promise<any> {
    return request('/api/admin/insights/correlations', { signal });
  },

  // =================== COPILOT (PHASE 9) ===================
  async listCopilotSessions(signal?: AbortSignal): Promise<{ sessions: any[] }> {
    return request('/api/admin/copilot/sessions', { signal });
  },

  async startCopilotSession(message: string): Promise<any> {
    return request('/api/admin/copilot/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });
  },

  async getCopilotSession(id: string, signal?: AbortSignal): Promise<any> {
    return request(`/api/admin/copilot/sessions/${encodeURIComponent(id)}`, { signal });
  },

  async deleteCopilotSession(id: string): Promise<any> {
    return request(`/api/admin/copilot/sessions/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  async sendCopilotMessage(sessionId: string, message: string): Promise<any> {
    return request(`/api/admin/copilot/sessions/${encodeURIComponent(sessionId)}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });
  },

  async submitCopilotFeedback(messageId: string, value: number, comment?: string): Promise<any> {
    return request(`/api/admin/copilot/messages/${encodeURIComponent(messageId)}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value, comment }),
    });
  },

  // =================== SYSTEM, FLAGS & AUDIT (PHASE 10) ===================
  async getSystemHealth(signal?: AbortSignal): Promise<any> {
    return request('/api/admin/system/health', { signal });
  },

  async getSystemMetrics(signal?: AbortSignal): Promise<any> {
    return request('/api/admin/system/metrics', { signal });
  },

  async getSystemErrors(signal?: AbortSignal): Promise<any> {
    return request('/api/admin/system/errors', { signal });
  },

  async getSystemBackups(signal?: AbortSignal): Promise<any> {
    return request('/api/admin/system/backups', { signal });
  },

  async createSystemBackup(): Promise<any> {
    return request('/api/admin/system/backups', { method: 'POST' });
  },

  async runSystemRetention(dryRun = true, days = 90): Promise<any> {
    return request('/api/admin/system/retention/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dryRun, days }),
    });
  },

  async getFeatureFlags(signal?: AbortSignal): Promise<{ flags: any[] }> {
    return request('/api/admin/flags', { signal });
  },

  async setFeatureFlag(key: string, enabled: boolean, reason?: string): Promise<any> {
    return request(`/api/admin/flags/${encodeURIComponent(key)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled, reason }),
    });
  },

  async getAuditLogs(params: Record<string, any> = {}, signal?: AbortSignal): Promise<any> {
    const query = new URLSearchParams(params as any).toString();
    return request(`/api/admin/audit?${query}`, { signal });
  },

  async verifyAuditChain(): Promise<any> {
    return request('/api/admin/audit/verify');
  },
};

export interface IntegrityStatsResponse {
  unreviewedHighRisk: number;
  totalGraded: number;
  flaggedCount: number;
  flagRatePct: number;
  avgReviewHours: number;
  overturnRate: number;
  bandDistribution: {
    low: number;
    medium: number;
    high: number;
  };
  flagsPerDay: { date: string; count: number }[];
  topQuestions: {
    id: string;
    title: string;
    totalSessions: number;
    flaggedSessions: number;
    flagRatePct: number;
  }[];
}

export interface IntegritySessionListItem {
  id: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  role: string;
  domainId: string;
  score: number;
  band: 'low' | 'medium' | 'high';
  reasons: string[];
  reviewStatus: 'unreviewed' | 'clean' | 'violation' | 'escalated';
  reviewDecision: string | null;
  reviewNote: string | null;
  reviewedAt: string | null;
  reviewerName: string | null;
  submittedAt: string;
  startedAt: string;
  technicalScore: number;
}

export interface IntegritySessionsResponse {
  sessions: IntegritySessionListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface IntegritySessionDetailResponse {
  session: {
    id: string;
    userId: string;
    candidateName: string;
    candidateEmail: string;
    mode: string;
    domainId: string;
    role: string;
    status: string;
    startedAt: string;
    submittedAt: string;
  };
  scores: {
    technicalScore: number;
    knowledgeScore: number;
    practicalScore: number;
    skillScores: Record<string, any>;
    rubric: any;
  };
  questions: any[];
  snapshots: {
    question_id: string;
    code: string;
    language: string;
    reason: string;
    created_at: string;
  }[];
  runResults: any[];
  timeline: {
    id: string;
    type: string;
    ts: string;
    relativeSeconds: number;
    meta: any;
  }[];
  risk: {
    sessionId: string;
    score: number;
    band: 'low' | 'medium' | 'high';
    features: {
      paste: number;
      pasteRatio: number;
      blur: number;
      blurTime: number;
      fast: number;
      camera: number;
      similarity: number;
      firstTry: number;
    };
    contributions: Record<string, number>;
    reasons: string[];
    matchedSessionIds?: { sessionId: string; similarity: number }[];
    modelVersion: string;
    computedAt: string;
  };
  similarSessions: {
    sessionId: string;
    pseudonym: string;
    similarityPct: number;
    submittedAt: string;
  }[];
  reviews: {
    id: string;
    reviewer_id: string;
    decision: string;
    note: string;
    created_at: string;
    reviewer_name?: string;
  }[];
}

export interface IntegrityComparisonResponse {
  sessionId: string;
  otherSessionId: string;
  sessionCode: string;
  sessionLanguage: string;
  otherCode: string;
  otherLanguage: string;
  sessionCandidateLabel: string;
  otherCandidateLabel: string;
  similarityPct: number;
}

export interface UseAdminQueryResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Custom hook for executing admin queries with loading, error states, and abort-on-unmount.
 *
 * @param queryFn Function executing the API request accepting an optional AbortSignal
 * @param deps Dependency array triggering refetch on change
 */
export function useAdminQuery<T>(
  queryFn: (signal?: AbortSignal) => Promise<T>,
  deps: any[] = []
): UseAdminQueryResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const execute = useCallback(async () => {
    // Cancel previous ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const result = await queryFn(controller.signal);
      if (!controller.signal.aborted) {
        setData(result);
        setLoading(false);
      }
    } catch (err: any) {
      if (!controller.signal.aborted) {
        setError(err instanceof Error ? err : new Error(String(err)));
        setLoading(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    execute();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [execute]);

  return { data, loading, error, refetch: execute };
}

export default adminApi;
