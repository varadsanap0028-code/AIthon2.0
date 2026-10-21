import React, { useMemo, useState } from 'react';
import type { V2SessionResult } from '../../types/assessmentV2';
import { useAuth } from '../../context/AuthContext';
import { useStudent } from '../../context/StudentContext';
import { AssessmentV2Service } from '../../services/assessmentV2Service';
import { getTier, computeSkillList } from './report/reportUtils';
import { ReportHeader } from './report/ReportHeader';
import { ReportOverallScores } from './report/ReportOverallScores';
import { ReportSkillGaps } from './report/ReportSkillGaps';
import { ReportHistoricalTrend } from './report/ReportHistoricalTrend';
import { ReportTasksReview } from './report/ReportTasksReview';
import { ReportQuizReview } from './report/ReportQuizReview';
import { ReportActionPlan } from './report/ReportActionPlan';

export interface ResultsReportProps {
  result: V2SessionResult;
  domainTitle?: string;
  roleTitle?: string;
  inProgressSessionId?: string | null;
  onResumeInProgress?: () => void;
  onRetake: () => void;
  onNavigateRoadmap: () => void;
  onNavigateSkillGap: () => void;
}

export const ResultsReport: React.FC<ResultsReportProps> = ({
  result,
  roleTitle,
  inProgressSessionId,
  onResumeInProgress,
  onRetake,
  onNavigateRoadmap,
  onNavigateSkillGap,
}) => {
  const { user } = useAuth();
  const { targetRole, assessmentHistory } = useStudent();
  const [activeResult, setActiveResult] = useState<V2SessionResult>(result);

  React.useEffect(() => {
    setActiveResult(result);
  }, [result]);

  const activeRoleTitle = activeResult.role || roleTitle || targetRole || 'Full-Stack Developer';
  const tier = useMemo(() => getTier(activeResult.overallScore ?? activeResult.technicalScore ?? 0), [activeResult]);
  const skillList = useMemo(() => computeSkillList(activeResult, activeRoleTitle), [activeResult, activeRoleTitle]);

  const sortedSkillsForAction = useMemo(() => {
    return [...skillList].sort((a, b) => a.gap - b.gap || a.score - b.score);
  }, [skillList]);

  const genuineHistory = useMemo(() => {
    if (!assessmentHistory || assessmentHistory.length === 0) return [];
    return [...assessmentHistory]
      .filter((h) => h.overallScore !== undefined)
      .sort((a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime());
  }, [assessmentHistory]);

  const handleSelectAttempt = async (sid: string) => {
    try {
      const full = await AssessmentV2Service.getSessionResult(sid, user || undefined);
      if (full) {
        setActiveResult(full);
        return;
      }
    } catch {}

    const found = genuineHistory.find((h: any) => (h.sessionId || h.id) === sid) as any;
    if (found) {
      setActiveResult((prev) => ({
        ...prev,
        sessionId: found.sessionId || found.id || prev.sessionId,
        overallScore: found.overallScore ?? found.technicalScore ?? prev.overallScore,
        technicalScore: found.overallScore ?? found.technicalScore ?? prev.technicalScore,
        knowledgeScore: found.knowledgeScore ?? prev.knowledgeScore,
        practicalScore: found.practicalScore ?? prev.practicalScore,
        completedAt: found.completedAt || prev.completedAt,
      }));
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      <ReportHeader
        result={activeResult}
        tier={tier}
        activeRoleTitle={activeRoleTitle}
        inProgressSessionId={inProgressSessionId}
        onResumeInProgress={onResumeInProgress}
        history={genuineHistory}
        onSelectAttempt={handleSelectAttempt}
      />

      <ReportOverallScores result={activeResult} tier={tier} />

      <div className="space-y-6">
        <ReportSkillGaps skillList={skillList} activeRoleTitle={activeRoleTitle} />
        {genuineHistory.length >= 2 && (
          <div className="bg-white border border-[#E0E7F2] rounded-2xl p-6 shadow-[var(--shadow-card)]">
            <ReportHistoricalTrend
              history={genuineHistory}
              activeSessionId={activeResult.sessionId}
              onSelectAttempt={handleSelectAttempt}
            />
          </div>
        )}
      </div>

      <ReportTasksReview tasks={activeResult.practicalSummary || []} />

      <ReportQuizReview questions={activeResult.answersSummary || []} />

      <ReportActionPlan
        sortedSkills={sortedSkillsForAction}
        activeRoleTitle={activeRoleTitle}
        onRetake={onRetake}
        onNavigateRoadmap={onNavigateRoadmap}
        onNavigateSkillGap={onNavigateSkillGap}
      />
    </div>
  );
};
