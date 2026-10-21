import type { SkillItem } from '../types/skill';
import {
  allCareerRoleRequirements,
  availableTargetRoles,
  getRoleRequirements as getRoleRequirementsFromCatalog
} from './domainsCatalog';

// Demo skills for demo user (Alex Morgan) only
export const initialStudentSkills: SkillItem[] = [
  { id: 'sk-1', name: 'HTML5 & Semantic Markup', category: 'Frontend', proficiencyLevel: 4, status: 'verified', lastAssessedAt: '2026-09-15' },
  { id: 'sk-2', name: 'JavaScript (ES6+)', category: 'Frontend', proficiencyLevel: 4, status: 'evidence-submitted', lastAssessedAt: '2026-09-20' },
  { id: 'sk-3', name: 'React.js Architecture', category: 'Frontend', proficiencyLevel: 3, status: 'assessment-completed', lastAssessedAt: '2026-10-01' },
  { id: 'sk-4', name: 'TypeScript', category: 'Frontend', proficiencyLevel: 2, status: 'self-reported', lastAssessedAt: '2026-10-05' },
  { id: 'sk-5', name: 'Node.js & Express', category: 'Backend', proficiencyLevel: 3, status: 'evidence-submitted', lastAssessedAt: '2026-09-28' },
  { id: 'sk-6', name: 'SQL & Relational Databases', category: 'Database', proficiencyLevel: 2, status: 'assessment-completed', lastAssessedAt: '2026-09-10' },
  { id: 'sk-7', name: 'Git & Version Control', category: 'DevOps', proficiencyLevel: 4, status: 'verified', lastAssessedAt: '2026-08-30' },
  { id: 'sk-8', name: 'RESTful API Architecture', category: 'Backend', proficiencyLevel: 3, status: 'assessment-completed', lastAssessedAt: '2026-10-02' }
];

export { availableTargetRoles };
export const roleRequirementsMap = allCareerRoleRequirements;
export const getRoleRequirements = getRoleRequirementsFromCatalog;
export const targetRoleRequirementsData = allCareerRoleRequirements['Full-Stack Developer'];
