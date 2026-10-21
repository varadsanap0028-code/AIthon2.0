import type { OpportunityItem, MatchResult } from '../types/opportunity';
import type { SkillItem } from '../types/skill';
import type { UserProfile } from '../types/user';

export interface CandidateApplication {
  id: string;
  job_id: string;
  stage: string;
  applied_at: string;
  updated_at?: string;
  job_title: string;
  company_name: string;
  location?: string;
  work_arrangement?: string;
  job_type?: string;
  experience_level?: string;
  salary_min?: number | null;
  salary_max?: number | null;
  currency?: string;
  cover_note?: string;
  match_score?: number;
  stageHistory?: Array<{
    id: string;
    from_stage: string | null;
    to_stage: string;
    reason: string | null;
    created_at: string;
  }>;
}

export class OpportunityService {
  private static readonly CANDIDATE_TOKEN_KEY = 'sarathi_candidate_token';

  /**
   * Set or sync the unified authentication token.
   */
  public static setAuthToken(token: string) {
    sessionStorage.setItem('sarathi_auth_token', token);
    sessionStorage.setItem(this.CANDIDATE_TOKEN_KEY, token);
  }

  /**
   * Clear authentication tokens on logout.
   */
  public static clearAuthToken() {
    sessionStorage.removeItem('sarathi_auth_token');
    sessionStorage.removeItem(this.CANDIDATE_TOKEN_KEY);
  }

  public static async getStudentToken(user?: UserProfile | null): Promise<string | null> {
    const primaryToken =
      typeof window !== 'undefined'
        ? sessionStorage.getItem('sarathi_auth_token') || localStorage.getItem('sarathi_auth_token')
        : null;
    if (primaryToken) {
      return primaryToken;
    }

    const cachedToken =
      typeof window !== 'undefined' ? sessionStorage.getItem(this.CANDIDATE_TOKEN_KEY) : null;
    if (cachedToken) {
      return cachedToken;
    }

    if (!user) {
      return null;
    }

    try {
      const response = await fetch('/api/auth/student-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          institution: user.institution,
          targetRole: user.targetRole,
          bio: user.bio
        })
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      if (data?.token) {
        this.setAuthToken(data.token);
        return data.token;
      }
    } catch {
      // offline/fallback
    }

    return null;
  }

  /**
   * Fetch only active, published jobs across verified organizations.
   */
  public static async fetchPublicOpportunities(options?: {
    domainId?: string;
    search?: string;
  }): Promise<OpportunityItem[]> {
    const params = new URLSearchParams();
    if (options?.domainId && options.domainId !== 'all') {
      params.append('domainId', options.domainId);
    }
    if (options?.search?.trim()) {
      params.append('search', options.search.trim());
    }

    const url = `/api/jobs/public${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch live job opportunities (HTTP ${response.status})`);
    }

    const json = await response.json();
    const rawJobs = Array.isArray(json)
      ? json
      : Array.isArray(json?.data)
      ? json.data
      : [];

    return rawJobs.map((job: any) => this.mapBackendJobToOpportunity(job));
  }

  /**
   * Submit a student application for a published job.
   */
  public static async applyForOpportunity(
    jobId: string,
    user: UserProfile,
    coverNote?: string
  ): Promise<{ success: boolean; message: string; duplicate?: boolean; applicationId?: string }> {
    const token = await this.getStudentToken(user);
    if (!token) {
      throw new Error('Unable to authenticate candidate session. Please refresh or re-login.');
    }

    const response = await fetch('/api/pipeline/apply', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        jobId,
        coverNote
      })
    });

    const json = await response.json().catch(() => ({}));

    if (response.status === 409) {
      return {
        success: false,
        duplicate: true,
        message: json.error || 'You have already submitted an application for this position.'
      };
    }

    if (!response.ok) {
      throw new Error(json.error || `Application submission failed (HTTP ${response.status})`);
    }

    return {
      success: true,
      message: json.message || 'Application submitted successfully to hiring team!',
      applicationId: json.data?.id
    };
  }

  /**
   * Fetch submitted applications for the current authenticated candidate.
   */
  public static async fetchMyApplications(
    user?: UserProfile | null
  ): Promise<CandidateApplication[]> {
    const token = await this.getStudentToken(user);
    if (!token) {
      return [];
    }

    try {
      const response = await fetch('/api/pipeline/my-applications', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        return [];
      }

      const json = await response.json();
      if (Array.isArray(json?.data)) {
        return json.data;
      }
      if (Array.isArray(json)) {
        return json;
      }
      return [];
    } catch {
      return [];
    }
  }

  /**
   * Convert backend SQLite Job model to frontend OpportunityItem
   */
  public static mapBackendJobToOpportunity(job: any): OpportunityItem {
    let opportunityType: OpportunityItem['opportunityType'] = 'Full-time';
    const jt = (job.employment_type || job.job_type || '').toLowerCase();
    if (jt.includes('intern')) opportunityType = 'Internship';
    else if (jt.includes('contract')) opportunityType = 'Contract';
    else if (jt.includes('remote')) opportunityType = 'Remote';

    let experienceLevel: OpportunityItem['experienceLevel'] = 'Entry-level';
    const exp = (job.experience_level || '').toLowerCase();
    if (exp.includes('junior')) experienceLevel = 'Junior';
    else if (exp.includes('mid')) experienceLevel = 'Mid-level';
    else if (exp.includes('student')) experienceLevel = 'Student';

    let stipendOrSalary = 'Competitive Compensation';
    if (job.salary_visible !== 0 && (job.salary_min || job.salary_max)) {
      const cur = job.currency || '$';
      const minStr = job.salary_min
        ? job.salary_min >= 1000
          ? `${Math.round(job.salary_min / 1000)}k`
          : `${job.salary_min}`
        : '';
      const maxStr = job.salary_max
        ? job.salary_max >= 1000
          ? `${Math.round(job.salary_max / 1000)}k`
          : `${job.salary_max}`
        : '';

      if (minStr && maxStr) stipendOrSalary = `${cur} ${minStr} - ${maxStr}`;
      else if (minStr) stipendOrSalary = `From ${cur} ${minStr}`;
      else if (maxStr) stipendOrSalary = `Up to ${cur} ${maxStr}`;
    }

    const isRemote =
      job.work_arrangement === 'remote' ||
      job.workplace_type === 'remote' ||
      Boolean(job.location && job.location.toLowerCase().includes('remote'));

    const skills: string[] = Array.isArray(job.required_skills)
      ? job.required_skills
      : Array.isArray(job.skill_requirements)
      ? job.skill_requirements.map((sr: any) => sr.skill_name || sr.skill_id)
      : [];

    return {
      id: job.id,
      title: job.title,
      companyName: job.company_name || job.org_name || 'Hiring Partner',
      companyLogoUrl: job.org_logo_url || undefined,
      location: job.location || (isRemote ? 'Remote' : 'Bengaluru, India'),
      isRemote,
      opportunityType,
      experienceLevel,
      stipendOrSalary,
      deadline: job.application_deadline || job.deadline || undefined,
      postedDate: job.created_at
        ? job.created_at.split('T')[0]
        : new Date().toISOString().split('T')[0],
      description: job.description || 'No job description provided.',
      requiredSkills: skills
    };
  }

  /**
   * Deterministic & Explainable Skill Matching Algorithm
   */
  public static calculateSkillMatch(
    opportunity: OpportunityItem,
    userSkills: SkillItem[]
  ): MatchResult {
    const required = opportunity.requiredSkills;
    const matching: string[] = [];
    const missing: string[] = [];
    const unassessed: string[] = [];

    const userSkillMap = new Map<string, SkillItem>();
    userSkills.forEach((s) => userSkillMap.set(s.name.toLowerCase(), s));

    required.forEach((reqSkillName) => {
      const userSkill = userSkillMap.get(reqSkillName.toLowerCase());
      if (!userSkill) {
        unassessed.push(reqSkillName);
      } else if (userSkill.proficiencyLevel >= 3 || userSkill.status === 'verified') {
        matching.push(reqSkillName);
      } else {
        missing.push(reqSkillName);
      }
    });

    const matchRatio = required.length > 0 ? matching.length / required.length : 0;
    const overallMatchScore = Math.round(matchRatio * 100);

    let suggestedAction = 'High match! Your core skills align with this position.';
    if (overallMatchScore < 50) {
      suggestedAction = `Work on missing skills: ${missing.concat(unassessed).slice(0, 2).join(', ')}`;
    } else if (overallMatchScore < 80) {
      suggestedAction = `Complete assessment or evidence for: ${unassessed.slice(0, 2).join(', ')}`;
    }

    return {
      opportunityId: opportunity.id,
      overallMatchScore,
      matchingSkills: matching,
      missingSkills: missing,
      unassessedSkills: unassessed,
      suggestedAction
    };
  }
}

