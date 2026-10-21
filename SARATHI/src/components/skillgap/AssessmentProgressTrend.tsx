import React from 'react';
import { TrendingUp, Calendar, Award, RotateCcw } from 'lucide-react';
import type { AssessmentResult } from '../../types/assessment';
import { Button } from '../common/Button';

interface AssessmentProgressTrendProps {
  history: AssessmentResult[];
  onRetakeAssessment?: () => void;
  className?: string;
}

export const AssessmentProgressTrend: React.FC<AssessmentProgressTrendProps> = ({
  history,
  onRetakeAssessment,
  className = ''
}) => {
  // Filter for genuine attempts with recorded scores and valid completion dates
  const genuineAttempts = (history || [])
    .filter((a) => a && a.completedAt && typeof a.overallScore === 'number')
    .sort((a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime());

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  // Case 1: Less than 2 genuine attempts - Explain why chart cannot be displayed yet
  if (genuineAttempts.length < 2) {
    const singleAttempt = genuineAttempts[0];

    return (
      <div className={`bg-white p-5 sm:p-6 rounded-2xl border border-[#E0E7F2] shadow-xs space-y-3.5 ${className}`}>
        <div className="flex items-center justify-between border-b border-[#E0E7F2] pb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#405B8B]" />
            <h3 className="text-sm font-extrabold text-[#0B1B43]">
              Historical Assessment Progress
            </h3>
          </div>
          <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
            {genuineAttempts.length} of 2 Attempts Recorded
          </span>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#087BFA] flex items-center justify-center shrink-0 mt-0.5">
              <Calendar className="w-4 h-4" />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-[#0B1B43]">
                {singleAttempt ? 'Baseline Assessment Recorded' : 'No Assessment Attempts Yet'}
              </h4>
              <p className="text-[11px] text-[#405B8B] leading-relaxed">
                {singleAttempt ? (
                  <>
                    Baseline established on <strong className="text-[#0B1B43]">{formatDate(singleAttempt.completedAt)}</strong> with an overall score of <strong className="text-[#0B1B43]">{singleAttempt.overallScore}%</strong> (Knowledge: {singleAttempt.knowledgeScore}%, Practical: {singleAttempt.practicalScore}%). Historical trend visualization activates after at least <strong>two completed attempts</strong> to chart genuine competency growth.
                  </>
                ) : (
                  'Historical competency analytics require at least two completed assessments to compute verified score velocity and skill progression over time.'
                )}
              </p>
            </div>
          </div>

          {onRetakeAssessment && (
            <div className="flex justify-end pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={onRetakeAssessment}
                leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                className="text-xs font-bold text-[#087BFA]"
              >
                {singleAttempt ? 'Take Second Assessment to Enable Growth Chart' : 'Take Diagnostic Assessment'}
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Case 2: At least 2 genuine attempts - Render genuine historical progress
  const firstAttempt = genuineAttempts[0];
  const latestAttempt = genuineAttempts[genuineAttempts.length - 1];
  const scoreDelta = latestAttempt.overallScore - firstAttempt.overallScore;

  return (
    <div className={`bg-white p-5 sm:p-6 rounded-2xl border border-[#E0E7F2] shadow-xs space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E0E7F2] pb-3">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#087BFA]" />
            <h3 className="text-sm font-extrabold text-[#0B1B43]">
              Verified Assessment Progress
            </h3>
          </div>
          <p className="text-[11px] text-[#405B8B] mt-0.5">
            Historical growth across {genuineAttempts.length} dated assessment attempts.
          </p>
        </div>

        {/* Growth Delta Badge */}
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border flex items-center gap-1 ${
            scoreDelta >= 0
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-amber-50 text-amber-700 border-amber-200'
          }`}>
            <Award className="w-3.5 h-3.5" />
            Growth: {scoreDelta >= 0 ? `+${scoreDelta}` : scoreDelta} pts
          </span>
        </div>
      </div>

      {/* Attempts Timeline List */}
      <div className="space-y-2.5">
        {genuineAttempts.map((attempt, index) => {
          const isBaseline = index === 0;
          const isLatest = index === genuineAttempts.length - 1;

          return (
            <div
              key={attempt.id || `${attempt.completedAt}-${index}`}
              className={`p-3 rounded-xl border transition-all ${
                isLatest
                  ? 'bg-blue-50/40 border-blue-200'
                  : 'bg-slate-50/60 border-slate-200'
              } flex flex-col sm:flex-row sm:items-center justify-between gap-3`}
            >
              <div className="flex items-center gap-3">
                <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-extrabold shrink-0 ${
                  isLatest
                    ? 'bg-[#087BFA] text-white shadow-xs'
                    : 'bg-slate-200 text-[#0B1B43]'
                }`}>
                  #{index + 1}
                </span>

                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold text-[#0B1B43]">
                      {isBaseline ? 'Initial Baseline' : isLatest ? 'Latest Evaluation' : `Assessment Round ${index + 1}`}
                    </span>
                    <span className="text-[10px] text-slate-500 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      {formatDate(attempt.completedAt)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-[#405B8B]">
                    <span>Knowledge: <strong className="text-[#0B1B43]">{attempt.knowledgeScore}%</strong></span>
                    <span>•</span>
                    <span>Practical: <strong className="text-[#0B1B43]">{attempt.practicalScore}%</strong></span>
                  </div>
                </div>
              </div>

              {/* Score Bar & Numeric Value */}
              <div className="flex items-center gap-3 sm:w-48 shrink-0">
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      isLatest ? 'bg-[#087BFA]' : 'bg-slate-400'
                    }`}
                    style={{ width: `${Math.min(100, attempt.overallScore)}%` }}
                  />
                </div>
                <span className="text-sm font-black text-[#0B1B43] w-12 text-right">
                  {attempt.overallScore}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
