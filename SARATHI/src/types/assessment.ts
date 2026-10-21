import type { SkillCategory, ProficiencyLevelLabel } from './skill';

export type AssessmentQuestionType = 'multiple-choice' | 'scenario-analysis';
export type PracticalTaskType = 
  | 'code-debug' 
  | 'sql-query' 
  | 'security-log' 
  | 'cloud-config' 
  | 'data-pipeline' 
  | 'system-design';

export interface AssessmentQuestion {
  id: string;
  domainId: string;
  roleTitle?: string;
  skillName: string;
  category: SkillCategory;
  question: string;
  codeSnippet?: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  proficiencyTarget: number; // 1 to 5
}

export interface PracticalTask {
  id: string;
  domainId: string;
  roleTitle?: string;
  skillName: string;
  category: SkillCategory;
  title: string;
  scenario: string;
  instructions: string[];
  taskType: PracticalTaskType;
  starterContent: string;
  expectedKeywordsOrOutputs: string[]; // Deterministic automated verification keywords
  validationRules?: {
    requiredMatches?: RegExp[];
    forbiddenPatterns?: RegExp[];
  };
  validationHints: string[];
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  proficiencyTarget: number;
  sampleSolution?: string;
}

export interface CategoryScore {
  category: SkillCategory;
  score: number; // Percentage 0-100
  totalQuestions: number;
  correctCount: number;
  level: ProficiencyLevelLabel;
}

export interface SkillScoreBreakdown {
  skillName: string;
  category: SkillCategory;
  score: number; // 0-100%
  demonstratedLevel: number; // 1-5
  levelLabel: ProficiencyLevelLabel;
  knowledgeScore: number;
  practicalScore?: number;
  totalEvaluated: number;
}

export interface AssessmentResult {
  id: string;
  domainId: string;
  targetRole: string;
  overallScore: number;
  knowledgeScore: number;
  practicalScore: number;
  completedAt: string;
  categoryScores: CategoryScore[];
  skillScores: SkillScoreBreakdown[];
  strengths: string[];
  improvements: string[];
  answersSummary: {
    questionId: string;
    question: string;
    skillName: string;
    selectedOption: number;
    correctOption: number;
    isCorrect: boolean;
    explanation: string;
  }[];
  practicalSummary?: {
    taskId: string;
    taskTitle: string;
    skillName: string;
    isPassed: boolean;
    feedback: string;
  }[];
}
