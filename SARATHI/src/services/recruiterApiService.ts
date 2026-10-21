// API Client for the SARATHI Recruiter & Employer Platform
const API_BASE = '/api';

export interface DomainItem {
  id: string;
  title: string;
  description: string;
  icon_name: string;
  badge_color: string;
  active: number;
}

export interface SkillItem {
  id: string;
  domain_id: string;
  domain_title?: string;
  badge_color?: string;
  name: string;
  description: string;
  category: string;
  proficiency_scale: string;
  accepted_evidence_types: string[];
  assessment_types: string[];
}

export interface JobSkillReq {
  skillId: string;
  skill_name?: string;
  requirementType: 'required' | 'preferred';
  targetProficiency: number;
  weight: number;
  acceptedEvidenceTypes?: string[];
  assessmentRequired?: boolean;
}

export interface JobItem {
  id: string;
  org_id: string;
  creator_id: string;
  creator_name?: string;
  title: string;
  description: string;
  responsibilities: string[];
  department: string;
  domain_id: string | null;
  domain_title?: string | null;
  experience_level: string;
  employment_type: string;
  work_arrangement: string;
  location: string;
  salary_min: number | null;
  salary_max: number | null;
  currency: string;
  application_deadline: string | null;
  status: 'draft' | 'published' | 'paused' | 'closed' | 'archived';
  applicant_count?: number;
  shortlisted_count?: number;
  skills?: JobSkillReq[];
  created_at: string;
  updated_at: string;
}

export interface CandidatePassport {
  candidate: {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
    company_name: string | null;
    institution: string | null;
    headline: string | null;
    target_role: string | null;
    bio: string | null;
    experience_years: number;
    location: string | null;
    work_preference: string;
    resume_url: string | null;
    github_url: string | null;
    portfolio_url: string | null;
    repo_count: number;
    visibility: string;
    consent_at: string | null;
  };
  skills: Array<{
    skill_id: string;
    skill_name: string;
    skill_category: string;
    domain_id: string;
    domain_title: string;
    badge_color: string;
    proficiency: number;
    verification_status: 'self_reported' | 'evidence_submitted' | 'verification_pending' | 'verified' | 'verification_rejected';
    source: string;
    last_verified_at: string | null;
    verified_by_name: string | null;
    notes: string | null;
    evidence_count: number;
  }>;
  evidence: Array<{
    id: string;
    skill_id: string;
    skill_name: string;
    domain_title: string;
    evidence_type: string;
    title: string;
    reference_url: string;
    verification_status: string;
    decision_rationale: string | null;
    verified_by_name: string | null;
    created_at: string;
  }>;
  verificationReviews: Array<{
    id: string;
    reviewer_name: string;
    previous_status: string;
    new_status: string;
    decision_rationale: string;
    created_at: string;
    skill_name: string;
  }>;
  assessments: Array<{
    id: string;
    template_title: string;
    assessment_type: string;
    duration_minutes: number;
    passing_score: number;
    score: number;
    max_score: number;
    passed: number;
    reviewer_feedback: string;
    graded_at: string;
  }>;
  jobMatch?: ExplainableMatch | null;
}

export interface ExplainableMatch {
  matchScore: number;
  requiredSkillCoverage: number;
  preferredSkillCoverage: number;
  readinessScore: number;
  matchedRequired: Array<{
    skillId: string;
    skillName: string;
    targetProficiency: number;
    candidateProficiency: number;
    verificationStatus: string;
  }>;
  matchedPreferred: Array<{
    skillId: string;
    skillName: string;
    targetProficiency: number;
    candidateProficiency: number;
    verificationStatus: string;
  }>;
  unmetRequirements: Array<{
    skillId: string;
    skillName: string;
    requirementType: string;
    targetProficiency: number;
    candidateProficiency: number;
    status: string;
    reason: string;
  }>;
  unverifiedSkills: Array<{
    skillId: string;
    skillName: string;
    requirementType: string;
    targetProficiency: number;
    candidateProficiency: number;
    verificationStatus: string;
    reason: string;
  }>;
  explanation: string;
}

export interface DashboardMetrics {
  kpiCards: {
    activeJobs: number;
    totalApplicants: number;
    shortlistedCandidates: number;
    skillVerifiedCandidates: number;
    pendingAssessments: number;
    interviewsScheduled: number;
  };
  hiringFunnel: Array<{ stage: string; count: number; key: string }>;
  recentApplicants: Array<{
    application_id: string;
    applied_at: string;
    stage: string;
    match_score: number;
    job_id: string;
    job_title: string;
    candidate_id: string;
    full_name: string;
    email: string;
    avatar_url: string;
    headline: string;
    experience_years: number;
    verified_skill_count: number;
  }>;
  upcomingInterviews: Array<{
    id: string;
    title: string;
    interview_type: string;
    scheduled_at: string;
    status: string;
    job_title: string;
    candidate_name: string;
    meeting_link: string;
  }>;
  pendingReviews: Array<{
    evidence_id: string;
    evidence_title: string;
    evidence_type: string;
    reference_url: string;
    created_at: string;
    skill_name: string;
    domain_title: string;
    candidate_id: string;
    candidate_name: string;
  }>;
  recentlyVerified: Array<{
    candidate_id: string;
    candidate_name: string;
    skill_name: string;
    domain_title: string;
    proficiency: number;
    last_verified_at: string;
  }>;
  recentActivity: Array<{
    id: string;
    action: string;
    actor_name: string;
    resource_type: string;
    created_at: string;
    payload: Record<string, unknown>;
  }>;
}

export interface ApplicationItem {
  id: string;
  job_id: string;
  job_title: string;
  job_department: string;
  candidate_id: string;
  candidate_name: string;
  candidate_email: string;
  candidate_avatar: string;
  headline: string;
  target_role: string;
  experience_years: number;
  location: string;
  stage: string;
  match_score: number;
  verified_skill_count: number;
  applied_at: string;
  updated_at: string;
}

class RecruiterApiService {
  private activeOrgId: string = 'org-demo-1';
  private tokenCache: Map<string, string> = new Map();

  public setOrgId(orgId: string) {
    this.activeOrgId = orgId;
  }

  public getOrgId(): string {
    return this.activeOrgId;
  }

  public setAuthToken(token: string, orgId?: string) {
    const targetOrg = orgId || this.activeOrgId;
    this.tokenCache.set(targetOrg, token);
    sessionStorage.setItem('sarathi_auth_token', token);
    sessionStorage.setItem(`sarathi_recruiter_token_${targetOrg}`, token);
  }

  public clearAuthCache() {
    this.tokenCache.clear();
    sessionStorage.removeItem('sarathi_auth_token');
    const toRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith('sarathi_recruiter_token_')) {
        toRemove.push(key);
      }
    }
    toRemove.forEach((key) => sessionStorage.removeItem(key));
  }

  private async getRecruiterToken(): Promise<string | null> {
    const memoryToken = this.tokenCache.get(this.activeOrgId);
    if (memoryToken) return memoryToken;

    const generalToken = sessionStorage.getItem('sarathi_auth_token');
    if (generalToken) {
      this.tokenCache.set(this.activeOrgId, generalToken);
      return generalToken;
    }

    const storedToken = sessionStorage.getItem(`sarathi_recruiter_token_${this.activeOrgId}`);
    if (storedToken) {
      this.tokenCache.set(this.activeOrgId, storedToken);
      return storedToken;
    }

    try {
      const response = await fetch('/api/auth/recruiter-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId: this.activeOrgId }),
      });
      if (response.ok) {
        const json = await response.json();
        if (json?.token) {
          this.setAuthToken(json.token, this.activeOrgId);
          return json.token;
        }
      }
    } catch {
      // offline/fallback
    }
    return null;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = await this.getRecruiterToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-org-id': this.activeOrgId,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...((options.headers as Record<string, string>) || {}),
    };

    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({ error: 'Network request failed' }));
      throw new Error(errBody.error || `HTTP error ${res.status}`);
    }

    return res.json();
  }

  // Analytics
  public getDashboardMetrics(): Promise<DashboardMetrics> {
    return this.request<DashboardMetrics>('/analytics/dashboard');
  }

  // Taxonomy
  public getDomains(): Promise<DomainItem[]> {
    return this.request<DomainItem[]>('/taxonomy/domains');
  }

  public getSkills(domainId?: string, query?: string): Promise<SkillItem[]> {
    const params = new URLSearchParams();
    if (domainId) params.append('domainId', domainId);
    if (query) params.append('query', query);
    return this.request<SkillItem[]>(`/taxonomy/skills?${params.toString()}`);
  }

  // Jobs
  public getJobs(status?: string, search?: string): Promise<JobItem[]> {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (search) params.append('search', search);
    return this.request<JobItem[]>(`/jobs?${params.toString()}`);
  }

  public getJobById(jobId: string): Promise<JobItem> {
    return this.request<JobItem>(`/jobs/${jobId}`);
  }

  public createJob(jobData: Partial<JobItem>): Promise<JobItem> {
    return this.request<JobItem>('/jobs', {
      method: 'POST',
      body: JSON.stringify(jobData),
    });
  }

  public updateJob(jobId: string, jobData: Partial<JobItem>): Promise<JobItem> {
    return this.request<JobItem>(`/jobs/${jobId}`, {
      method: 'PUT',
      body: JSON.stringify(jobData),
    });
  }

  public deleteJob(jobId: string): Promise<{ success: boolean; id: string }> {
    return this.request<{ success: boolean; id: string }>(`/jobs/${jobId}`, {
      method: 'DELETE',
    });
  }

  // Candidates
  public searchCandidates(params: {
    query?: string;
    domainId?: string;
    skillId?: string;
    minProficiency?: number;
    verificationStatus?: string;
    minExperience?: number;
    workPreference?: string;
    jobId?: string;
    sortBy?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ candidates: any[]; totalCount: number }> {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') queryParams.append(k, String(v));
    });
    return this.request<{ candidates: any[]; totalCount: number }>(`/candidates?${queryParams.toString()}`);
  }

  public getCandidatePassport(candidateId: string, jobId?: string): Promise<CandidatePassport> {
    const q = jobId ? `?jobId=${jobId}` : '';
    return this.request<CandidatePassport>(`/candidates/${candidateId}/passport${q}`);
  }

  public calculateMatch(candidateId: string, jobId: string): Promise<ExplainableMatch> {
    return this.request<ExplainableMatch>(`/candidates/${candidateId}/match`, {
      method: 'POST',
      body: JSON.stringify({ jobId }),
    });
  }

  public getSkillGapAnalysis(candidateId: string, jobId: string): Promise<any> {
    return this.request<any>(`/candidates/${candidateId}/gap-analysis`, {
      method: 'POST',
      body: JSON.stringify({ jobId }),
    });
  }

  public compareCandidates(candidateIds: string[], jobId?: string): Promise<{ candidates: CandidatePassport[] }> {
    return this.request<{ candidates: CandidatePassport[] }>('/candidates/compare', {
      method: 'POST',
      body: JSON.stringify({ candidateIds, jobId }),
    });
  }

  // Verifications
  public getPendingVerifications(): Promise<any[]> {
    return this.request<any[]>('/verifications/pending');
  }

  public submitReview(data: {
    evidenceId: string;
    decision: 'verified' | 'rejected';
    decisionRationale: string;
    awardedProficiency?: number;
  }): Promise<{ success: boolean; reviewId: string }> {
    return this.request<{ success: boolean; reviewId: string }>('/verifications/review', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public requestEvidence(data: {
    candidateId: string;
    skillId: string;
    message: string;
  }): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>('/verifications/request', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Assessments
  public getAssessmentTemplates(domainId?: string): Promise<any[]> {
    const q = domainId ? `?domainId=${domainId}` : '';
    return this.request<any[]>(`/assessments/templates${q}`);
  }

  public getAssessmentAssignments(): Promise<any[]> {
    return this.request<any[]>('/assessments/assignments');
  }

  public assignAssessment(data: {
    templateId: string;
    candidateId: string;
    jobId?: string;
    deadlineDays?: number;
  }): Promise<{ success: boolean; assignmentId: string }> {
    return this.request<{ success: boolean; assignmentId: string }>('/assessments/assign', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Pipeline
  public getApplications(jobId?: string, stage?: string, search?: string): Promise<ApplicationItem[]> {
    const params = new URLSearchParams();
    if (jobId) params.append('jobId', jobId);
    if (stage) params.append('stage', stage);
    if (search) params.append('search', search);
    return this.request<ApplicationItem[]>(`/pipeline/applications?${params.toString()}`);
  }

  public updateApplicationStage(applicationId: string, stage: string, reason?: string): Promise<any> {
    return this.request<any>(`/pipeline/applications/${applicationId}/stage`, {
      method: 'PATCH',
      body: JSON.stringify({ stage, reason }),
    });
  }

  public addRecruiterNote(candidateId: string, note: string, jobId?: string): Promise<any> {
    return this.request<any>('/pipeline/notes', {
      method: 'POST',
      body: JSON.stringify({ candidateId, note, jobId }),
    });
  }

  public getShortlists(): Promise<any[]> {
    return this.request<any[]>('/pipeline/shortlists');
  }

  public createShortlist(data: { title: string; description?: string; jobId?: string }): Promise<any> {
    return this.request<any>('/pipeline/shortlists', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public toggleShortlistMember(shortlistId: string, candidateId: string): Promise<any> {
    return this.request<any>(`/pipeline/shortlists/${shortlistId}/members`, {
      method: 'POST',
      body: JSON.stringify({ candidateId }),
    });
  }

  // Interviews
  public getInterviews(status?: string): Promise<any[]> {
    const q = status ? `?status=${status}` : '';
    return this.request<any[]>(`/interviews${q}`);
  }

  public scheduleInterview(data: {
    jobId: string;
    candidateId: string;
    title: string;
    interviewType: string;
    scheduledAt: string;
    durationMinutes?: number;
    meetingLink?: string;
  }): Promise<any> {
    return this.request<any>('/interviews', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public submitInterviewFeedback(interviewId: string, data: {
    technicalRating: number;
    communicationRating: number;
    overallRecommendation: string;
    feedbackNotes: string;
    confidentialNotes?: string;
  }): Promise<any> {
    return this.request<any>(`/interviews/${interviewId}/feedback`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Organization
  public getOrganization(): Promise<any> {
    return this.request<any>('/organization');
  }

  public getOrganizationMembers(): Promise<any[]> {
    return this.request<any[]>('/organization/members');
  }

  public addOrganizationMember(data: { email: string; fullName: string; role: string }): Promise<any> {
    return this.request<any>('/organization/members', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

export const recruiterApi = new RecruiterApiService();
