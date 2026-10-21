export type OpportunityType = 'Full-time' | 'Internship' | 'Contract' | 'Remote';

export interface OpportunityItem {
  id: string;
  title: string;
  companyName: string;
  companyLogoUrl?: string;
  location: string;
  isRemote: boolean;
  opportunityType: OpportunityType;
  experienceLevel: 'Entry-level' | 'Junior' | 'Mid-level' | 'Student';
  stipendOrSalary: string;
  deadline?: string;
  postedDate: string;
  description: string;
  requiredSkills: string[];
}

export interface MatchResult {
  opportunityId: string;
  overallMatchScore: number; // 0 - 100%
  matchingSkills: string[];
  missingSkills: string[];
  unassessedSkills: string[];
  suggestedAction: string;
}
