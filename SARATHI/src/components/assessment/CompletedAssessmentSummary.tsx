import React from 'react';
import type { V2SessionResult } from '../../types/assessmentV2';
import { ResultsReport } from './ResultsReport';
import { useNavigate } from 'react-router-dom';

export interface CompletedAssessmentSummaryProps {
  result: V2SessionResult;
  onRetake: () => void;
  domainTitle?: string;
  roleTitle?: string;
  inProgressSessionId?: string | null;
  onResumeInProgress?: () => void;
}

export const CompletedAssessmentSummary: React.FC<CompletedAssessmentSummaryProps> = ({
  result,
  onRetake,
  domainTitle,
  roleTitle,
  inProgressSessionId,
  onResumeInProgress,
}) => {
  const navigate = useNavigate();
  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <ResultsReport
        result={result}
        domainTitle={domainTitle}
        roleTitle={roleTitle}
        inProgressSessionId={inProgressSessionId}
        onResumeInProgress={onResumeInProgress}
        onRetake={onRetake}
        onNavigateRoadmap={() => navigate('/student/roadmap')}
        onNavigateSkillGap={() => navigate('/student/skill-gap')}
      />
    </div>
  );
};
