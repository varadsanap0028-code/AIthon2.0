import type { UserProfile } from '../types/user';
import type { AssessmentResult } from '../types/assessment';
import type { ProjectItem } from '../types/project';
import type { SkillItem, VerificationStatus } from '../types/skill';
import { OpportunityService } from './opportunityService';

export interface BackendPassportData {
  candidate: any;
  skills: any[];
  evidence: any[];
  verificationReviews: any[];
  assessments: any[];
  jobMatch?: any;
}

export class SkillSyncService {
  /**
   * Synchronize completed diagnostic assessment attempt and skill scores to backend SQLite.
   */
  public static async submitAssessmentResult(
    result: AssessmentResult,
    user: UserProfile
  ): Promise<{ success: boolean; resultId?: string; attemptNumber?: number; message?: string }> {
    const token = await OpportunityService.getStudentToken(user);
    if (!token) {
      return { success: false, message: 'Could not obtain candidate session token.' };
    }

    try {
      const response = await fetch('/api/assessments/student-submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          domainId: result.domainId,
          targetRole: result.targetRole,
          overallScore: result.overallScore,
          knowledgeScore: result.knowledgeScore,
          practicalScore: result.practicalScore,
          categoryScores: result.categoryScores,
          skillScores: result.skillScores,
          strengths: result.strengths,
          improvements: result.improvements
        })
      });

      if (response.status === 410) {
        // V2 server-side grading is active and has already persisted the attempt
        return {
          success: true,
          resultId: result.id,
          message: 'Server-side V2 grading verified and synchronized.'
        };
      }

      if (!response.ok) {
        const errorJson = await response.json().catch(() => ({}));
        throw new Error(errorJson.error || `Server responded with HTTP ${response.status}`);
      }

      const json = await response.json();
      return {
        success: true,
        resultId: json.data?.resultId,
        attemptNumber: json.data?.attemptNumber,
        message: json.message
      };
    } catch (err: any) {
      console.warn('Backend assessment sync failed (offline or network error):', err.message);
      return { success: false, message: err.message };
    }
  }

  /**
   * Synchronize student project evidence to backend SQLite.
   * Associates with skills and places into 'pending_review' state for recruiter audit.
   */
  public static async submitProjectEvidence(
    project: ProjectItem,
    user: UserProfile,
    domainId?: string
  ): Promise<{ success: boolean; createdCount?: number; message?: string }> {
    const token = await OpportunityService.getStudentToken(user);
    if (!token) {
      return { success: false, message: 'Could not obtain candidate session token.' };
    }

    try {
      const response = await fetch('/api/candidates/evidence', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: project.title,
          description: project.description,
          repositoryUrl: project.repositoryUrl,
          liveDemoUrl: project.liveDemoUrl,
          skillsDemonstrated: project.skillsDemonstrated,
          technologies: project.technologies,
          domainId: domainId || 'dom-fullstack'
        })
      });

      if (!response.ok) {
        const errorJson = await response.json().catch(() => ({}));
        throw new Error(errorJson.error || `Server responded with HTTP ${response.status}`);
      }

      const json = await response.json();
      return {
        success: true,
        createdCount: json.data?.createdCount,
        message: json.message
      };
    } catch (err: any) {
      console.warn('Backend project evidence sync failed (offline or network error):', err.message);
      return { success: false, message: err.message };
    }
  }

  /**
   * Fetch authoritative candidate passport from SQLite, including verified skills and evidence reviews.
   */
  public static async fetchMyPassport(user: UserProfile): Promise<BackendPassportData | null> {
    const token = await OpportunityService.getStudentToken(user);
    if (!token) {
      return null;
    }

    try {
      const response = await fetch('/api/candidates/my-passport', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        return null;
      }

      const json = await response.json();
      return json?.data || null;
    } catch (err: any) {
      console.warn('Could not fetch candidate passport from backend:', err.message);
      return null;
    }
  }

  /**
   * Fetch candidate assessment attempts history from SQLite.
   */
  public static async fetchMyAssessmentHistory(user: UserProfile): Promise<any[]> {
    const token = await OpportunityService.getStudentToken(user);
    if (!token) {
      return [];
    }

    try {
      const response = await fetch('/api/assessments/my-history', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        return [];
      }

      const json = await response.json();
      return Array.isArray(json?.data) ? json.data : [];
    } catch {
      return [];
    }
  }

  /**
   * Map backend candidate_skills to frontend SkillItem
   */
  public static mapBackendSkillToFrontend(backendSkill: any): SkillItem {
    let status: VerificationStatus = 'self-reported';
    const rawStatus = (backendSkill.verification_status || '').toLowerCase();

    if (rawStatus === 'verified') {
      status = 'verified';
    } else if (rawStatus === 'diagnostic_tested' || rawStatus === 'assessment_completed') {
      status = 'assessment-completed';
    } else if (rawStatus === 'pending_review' || rawStatus === 'evidence_submitted') {
      status = 'evidence-submitted';
    }

    return {
      id: backendSkill.skill_id || backendSkill.id,
      name: backendSkill.skill_name || backendSkill.name,
      category: backendSkill.skill_category || backendSkill.category || 'General',
      proficiencyLevel: backendSkill.proficiency || 1,
      status,
      lastAssessedAt: backendSkill.last_verified_at || backendSkill.updated_at,
      verifiedBy: backendSkill.verified_by_name || backendSkill.verified_by,
      domainId: backendSkill.domain_id
    };
  }
}
