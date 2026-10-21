export type SkillCategory = 
  | 'Frontend' 
  | 'Backend' 
  | 'Database' 
  | 'DevOps' 
  | 'Soft Skills' 
  | 'System Design' 
  | 'Testing & QA'
  | 'AI & Machine Learning'
  | 'Data Science & Analytics'
  | 'Cybersecurity'
  | 'Cloud & Infrastructure'
  | 'Mobile Development'
  | 'UI/UX & Design'
  | 'Emerging Tech'
  | string;

export type VerificationStatus = 
  | 'self-reported' 
  | 'assessment-completed' 
  | 'evidence-submitted' 
  | 'verified'
  | 'rejected';

export type ProficiencyLevelLabel = 
  | 'Beginner'
  | 'Developing'
  | 'Proficient'
  | 'Advanced'
  | 'Expert';

export interface SkillItem {
  id: string;
  name: string;
  category: SkillCategory;
  proficiencyLevel: number; // 1 to 5
  status: VerificationStatus;
  lastAssessedAt?: string;
  verifiedBy?: string;
  domainId?: string;
}

export const getProficiencyLabel = (level: number): ProficiencyLevelLabel => {
  if (level >= 5) return 'Expert';
  if (level === 4) return 'Advanced';
  if (level === 3) return 'Proficient';
  if (level === 2) return 'Developing';
  return 'Beginner';
};
