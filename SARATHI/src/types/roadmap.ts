export type CompletionType = 'self_reported' | 'verified';
export type TaskStatus = 'not_started' | 'in_progress' | 'completed';

export interface TaskProgressDetail {
  status: TaskStatus;
  completedAt?: string | null;
  completionType: CompletionType;
  verifiedBy?: string | null;
}

export interface RoadmapTask {
  id: string;
  stageId: string;
  topic: string;
  description: string;
  relevanceToRole: string;
  estimatedDuration: string; // e.g. "4 hours"
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  resourceName: string;
  resourceUrl: string;
  isFreeResource: boolean;
  isCompleted: boolean;
  status?: TaskStatus;
  completedAt?: string | null;
  completionType?: CompletionType;
  verifiedBy?: string | null;
  prioritySkillGap?: boolean;
  relatedSkill?: string;
  whyThisTask?: string;
  benchmarkLevel?: number;
  candidateLevel?: number;
  isStrong?: boolean;
  benchmarkMet?: boolean;
  diagnosticScore?: number;
  benchmarkTargetScore?: number;
  resourceType?: 'documentation' | 'tutorial' | 'interactive' | 'project' | 'video';
  keySkillsCovered?: string[];
  practicePrompt?: string;
  projectSubmissionEligible?: boolean;
}

export interface RoadmapStage {
  id: string;
  title: string;
  description: string;
  stageNumber: number;
  tasks: RoadmapTask[];
}

export interface StudentRoadmap {
  targetRole: string;
  domainId?: string;
  domainTitle?: string;
  overallProgress: number; // percentage 0-100
  stages: RoadmapStage[];
  recommendedNextTaskId: string;
  isPersonalized?: boolean;
  hasAssessmentData?: boolean;
  assessmentDate?: string;
  assessmentScore?: number;
  assessmentId?: string;
  priorityGapCount?: number;
  strongSkillsCount?: number;
}
