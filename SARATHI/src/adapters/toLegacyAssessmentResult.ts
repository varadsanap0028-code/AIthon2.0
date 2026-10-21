import type { AssessmentResult, SkillScoreBreakdown, CategoryScore } from '../types/assessment';
import type { V2SessionResult, SkillScoreV2 } from '../types/assessmentV2';

/**
 * Adapter: Transforms a V2 server-graded session result into the frozen legacy AssessmentResult shape.
 * Ensures zero disruption to StudentContext, Dashboard, Skill Gap, and Skill Passport.
 */
export function toLegacyAssessmentResult(v2: V2SessionResult): AssessmentResult {
  const rawSkillScores = v2.skillScores ? Object.values(v2.skillScores) : [];

  const skillScores: SkillScoreBreakdown[] = rawSkillScores.map((s: SkillScoreV2) => ({
    skillName: s.skillName,
    category: s.category || 'General',
    score: Math.round(s.score),
    demonstratedLevel: s.level,
    levelLabel: s.levelLabel,
    knowledgeScore: Math.round(s.knowledgeScore ?? s.score),
    practicalScore: Math.round(s.practicalScore ?? s.score),
    totalEvaluated: s.evidenceCount || 1,
  }));

  const categoryScores: CategoryScore[] = (v2.categoryScores || []).map(c => ({
    category: c.category,
    score: Math.round(c.score),
    totalQuestions: c.totalQuestions,
    correctCount: c.correctCount,
    level: c.level,
  }));

  const strengths = v2.strengths && v2.strengths.length > 0
    ? v2.strengths
    : skillScores.filter(s => s.score >= 60).map(s => s.skillName);

  const improvements = v2.improvements && v2.improvements.length > 0
    ? v2.improvements
    : skillScores.filter(s => s.score < 60).map(s => s.skillName);

  const answersSummary = (v2.answersSummary || []).map(a => ({
    questionId: a.questionId,
    question: a.question,
    skillName: a.skillName,
    selectedOption: a.selectedOption ?? -1,
    correctOption: a.correctOption ?? -1,
    isCorrect: Boolean(a.isCorrect),
    explanation: a.explanation || '',
  }));

  const practicalSummary = (v2.practicalSummary || []).map(p => ({
    taskId: p.taskId,
    taskTitle: p.taskTitle,
    skillName: p.skillName,
    isPassed: Boolean(p.isPassed),
    feedback: p.feedback || (p.isPassed ? 'Tests passed successfully' : 'Tests did not pass'),
  }));

  // Ensure completedAt is YYYY-MM-DD
  const completedDate = v2.completedAt
    ? v2.completedAt.split('T')[0]
    : new Date().toISOString().split('T')[0];

  return {
    id: v2.sessionId,
    domainId: v2.domainId,
    targetRole: v2.role,
    overallScore: Math.round(v2.technicalScore),
    knowledgeScore: Math.round(v2.knowledgeScore),
    practicalScore: Math.round(v2.practicalScore),
    completedAt: completedDate,
    categoryScores,
    skillScores,
    strengths,
    improvements,
    answersSummary,
    practicalSummary,
  };
}
