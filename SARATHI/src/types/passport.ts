import type { SkillItem } from './skill';
import type { ProjectItem } from './project';

export interface PassportSummary {
  passportId: string;
  studentName: string;
  targetRole: string;
  institution: string;
  degree: string;
  graduationYear: string;
  overallReadinessScore: number;
  assessedSkills: SkillItem[];
  verifiedProjects: ProjectItem[];
  learningMilestonesCount: number;
  issuedAt: string;
  verificationBadgeUrl?: string;
}
