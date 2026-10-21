import { apiClient } from './apiClient';

export interface CanonicalCompetency {
  skillId: string;
  skillName: string;
  category: string;
  demonstratedProficiency: number | null;
  evidenceStatus: 'VERIFIED' | 'PROVISIONAL' | 'INSUFFICIENT_EVIDENCE' | 'CONFLICTING' | 'OUTDATED';
  confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
  evidenceCount: number;
  lastEvidenceAt: string | null;
  reassessmentRecommended: boolean;
  requiredProficiency: number;
  weight: number;
  isMandatory: boolean;
  prerequisites: string[];
  whyItMatters: string;
}

export interface SkillGapAnalysisResult {
  targetRole: string;
  domainTitle: string;
  benchmarkVersion: string;
  totalCompetencies: number;
  metrics: {
    verifiedGaps: number;
    preliminaryGaps: number;
    evidenceNeeded: number;
    benchmarkMet: number;
    highPriorityGaps: number;
    mediumPriorityGaps: number;
  };
  gapItems: Array<{
    skillId: string;
    skillName: string;
    category: string;
    requiredProficiency: number;
    demonstratedProficiency: number;
    gapLevel: number;
    gapStatus: 'VERIFIED_GAP' | 'PRELIMINARY_GAP' | 'EVIDENCE_NEEDED' | 'BENCHMARK_MET' | 'REASSESSMENT_RECOMMENDED';
    confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
    evidenceStatus: 'VERIFIED' | 'PROVISIONAL' | 'INSUFFICIENT_EVIDENCE' | 'CONFLICTING' | 'OUTDATED';
    priority: 'High' | 'Medium' | 'Low';
    priorityScore: number;
    priorityRationale: string;
    whyItMatters: string;
    isMandatory: boolean;
    weight: number;
    prerequisites: string[];
    hasUnmetPrerequisites: boolean;
    unmetPrerequisites: string[];
    recommendedAction: string;
  }>;
}

export interface CareerReadinessResult {
  targetRole: string;
  benchmarkVersion: string;
  readinessScore: number;
  evidenceCoverage: number;
  mandatorySkillsStatus: {
    allMandatoryMet: boolean;
    mandatoryMetCount: number;
    mandatoryTotalCount: number;
  };
  evidenceSufficiency: {
    supportedSkillsCount: number;
    totalRequiredSkills: number;
    uncertainty: 'LOW' | 'MEDIUM' | 'HIGH';
  };
  scoringPolicyNotice: string;
}

export interface AdaptiveQuestion {
  id: string;
  skillId: string;
  skillName: string;
  category: string;
  type: 'mcq' | 'code' | 'sql' | 'project';
  difficulty: number;
  prompt: string;
  options?: string[];
  starterCode?: string;
  language?: string;
  questionNumber: number;
  totalBudget: number;
}

export interface AdaptiveAnswerResult {
  isCorrect: boolean;
  explanation: string;
  isFinished: boolean;
  nextQuestion: AdaptiveQuestion | null;
  finalSummary: any | null;
}

export interface PracticalChallenge {
  id: string;
  domain_id: string;
  skill_id: string;
  skill_name?: string;
  title: string;
  description: string;
  challenge_type: string;
  starter_code: string;
  testSuite: Array<{ name: string; expected: string }>;
  difficulty: number;
}

export class SkillEvidenceService {
  /**
   * Retrieves canonical profile for current authenticated user.
   */
  static async getCanonicalProfile(targetRole?: string): Promise<CanonicalCompetency[]> {
    const query = targetRole ? `?targetRole=${encodeURIComponent(targetRole)}` : '';
    const res = await apiClient.get<{ success: boolean; data: CanonicalCompetency[] }>(
      `/api/skills/canonical-profile${query}`
    );
    return res.data || [];
  }

  /**
   * Retrieves deterministic skill gap analysis for target role.
   */
  static async getSkillGaps(targetRole: string): Promise<SkillGapAnalysisResult> {
    const res = await apiClient.get<{ success: boolean; data: SkillGapAnalysisResult }>(
      `/api/skills/gaps?targetRole=${encodeURIComponent(targetRole)}`
    );
    return res.data;
  }

  /**
   * Retrieves transparent career readiness score and evidence coverage.
   */
  static async getCareerReadiness(targetRole: string): Promise<CareerReadinessResult> {
    const res = await apiClient.get<{ success: boolean; data: CareerReadinessResult }>(
      `/api/skills/readiness?targetRole=${encodeURIComponent(targetRole)}`
    );
    return res.data;
  }

  /**
   * Retrieves complete provenance audit log for a competency.
   */
  static async getProvenance(skillId: string): Promise<any[]> {
    const res = await apiClient.get<{ success: boolean; data: any[] }>(
      `/api/skills/provenance/${encodeURIComponent(skillId)}`
    );
    return res.data || [];
  }

  /**
   * Starts an adaptive diagnostic assessment session.
   */
  static async startAdaptiveAssessment(targetRole: string, maxQuestions = 6) {
    const res = await apiClient.post<{ success: boolean; data: any }>(
      '/api/skills/adaptive/start',
      { targetRole, maxQuestions }
    );
    return res.data;
  }

  /**
   * Submits an answer for the active adaptive question.
   */
  static async submitAdaptiveAnswer(payload: {
    sessionId: string;
    questionId: string;
    selectedOptionIndex?: number;
    codeAnswer?: string;
  }): Promise<AdaptiveAnswerResult> {
    const res = await apiClient.post<{ success: boolean; data: AdaptiveAnswerResult }>(
      '/api/skills/adaptive/answer',
      payload
    );
    return res.data;
  }

  /**
   * Lists available practical coding & debugging challenges.
   */
  static async getPracticalChallenges(domainId?: string, skillId?: string): Promise<PracticalChallenge[]> {
    const params = new URLSearchParams();
    if (domainId) params.append('domainId', domainId);
    if (skillId) params.append('skillId', skillId);
    const qs = params.toString() ? `?${params.toString()}` : '';

    const res = await apiClient.get<{ success: boolean; data: PracticalChallenge[] }>(
      `/api/skills/challenges${qs}`
    );
    return res.data || [];
  }

  /**
   * Submits a practical challenge solution for deterministic testing.
   */
  static async submitPracticalChallenge(challengeId: string, submittedCode: string) {
    const res = await apiClient.post<{ success: boolean; data: any }>(
      `/api/skills/challenges/${encodeURIComponent(challengeId)}/submit`,
      { submittedCode }
    );
    return res.data;
  }

  /**
   * Recalculates canonical skill profile from evidence ledger.
   */
  static async recalculateProfile(targetRole?: string) {
    const res = await apiClient.post<{ success: boolean; data: any }>(
      '/api/skills/recalculate',
      { targetRole }
    );
    return res.data;
  }
}
