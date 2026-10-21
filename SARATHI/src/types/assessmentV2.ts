export type AssessmentMode = 'practice' | 'secure';
export type SessionStatus = 'in_progress' | 'submitted' | 'graded' | 'expired' | 'abandoned';
export type V2QuestionType = 'mcq' | 'code' | 'sql' | 'project';

export interface CodeTestVisible {
  id: string;
  kind: 'visible';
  input: string;
  expectedOutput: string;
  timeoutMs?: number;
}

export interface RubricCriterion {
  key: string;
  label: string;
  weight: number;
  description: string;
}

export interface V2QuestionClient {
  id: string;
  version: number;
  domainId: string;
  skillId: string;
  skillName: string;
  category: string;
  type: V2QuestionType;
  difficulty: 1 | 2 | 3;
  prompt: string;
  options?: string[];
  starterCode?: string;
  language?: string;
  visibleTests?: CodeTestVisible[];
  rubric?: RubricCriterion[];
}

export interface SessionRules {
  timeLimitMinutes: number;
  pasteAllowed: boolean;
  blurTracking: boolean;
  cameraRequired: boolean;
  accommodationsAllowed: boolean;
}

export interface SessionAccommodation {
  extendedTimeMultiplier?: number;
  disabledRestrictions?: boolean;
  notes?: string;
}

export interface AssessmentSessionClient {
  sessionId: string;
  mode: AssessmentMode;
  domainId: string;
  role: string;
  status: SessionStatus;
  startedAt: string;
  expiresAt: string;
  deadlineAt?: string;
  saveVersion?: number;
  questions: V2QuestionClient[];
  rules: SessionRules;
  accommodation?: SessionAccommodation;
  draftAnswers?: Record<string, any>;
  snapshots?: Record<string, any>;
}

export interface SkillScoreV2 {
  skillName: string;
  category: string;
  score: number;
  level: number;
  levelLabel: 'Beginner' | 'Developing' | 'Proficient' | 'Advanced' | 'Expert';
  evidenceCount: number;
  confidence: 'low' | 'medium' | 'high';
  knowledgeScore: number;
  practicalScore: number;
}

export interface V2SessionResult {
  sessionId: string;
  mode: AssessmentMode;
  domainId: string;
  role: string;
  overallScore?: number;
  technicalScore: number;
  knowledgeScore: number;
  practicalScore: number;
  completedAt: string;
  skillScores: Record<string, SkillScoreV2>;
  categoryScores: {
    category: string;
    score: number;
    totalQuestions: number;
    correctCount: number;
    level: 'Beginner' | 'Developing' | 'Proficient' | 'Advanced' | 'Expert';
  }[];
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
  hasInfrastructureError?: boolean;
  practicalSummary?: {
    taskId: string;
    taskTitle: string;
    skillName: string;
    isPassed: boolean;
    isInfrastructureError?: boolean;
    executionStatus?: string;
    feedback: string;
    visiblePassed?: number;
    visibleTotal?: number;
    hiddenPassed?: number;
    hiddenTotal?: number;
    score?: number;
  }[];
  integritySummary?: {
    eventCount: number;
    longestAwaySec: number;
    level: 'none' | 'notable';
    offlinePeriods?: number;
  };
  rubricBreakdown?: Record<string, {
    score: number;
    maxScore: number;
    status: 'provisional' | 'finalized';
    notes?: string;
  }>;
}
