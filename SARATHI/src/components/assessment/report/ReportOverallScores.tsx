import React, { useState } from 'react';
import { Award, BookOpen, Code2, HelpCircle, Info, AlertTriangle } from 'lucide-react';
import type { V2SessionResult } from '../../../types/assessmentV2';
import type { PerformanceTier } from './reportUtils';
import { ASSESSMENT_SCORING_CONFIG } from '../../../config/assessmentConfig';

interface ReportOverallScoresProps {
  result: V2SessionResult;
  tier: PerformanceTier;
}

export const ReportOverallScores: React.FC<ReportOverallScoresProps> = ({ result, tier }) => {
  const [showFormulaModal, setShowFormulaModal] = useState(false);

  const overallScore = Math.round(result.overallScore ?? result.technicalScore ?? 0);
  const knowledgeScore = Math.round(result.knowledgeScore ?? 0);
  const practicalScore = Math.round(result.practicalScore ?? 0);

  const hasMcq = (result.answersSummary || []).length > 0;
  const hasPractical = (result.practicalSummary || []).length > 0;

  const correctAnswersCount = (result.answersSummary || []).filter((q) => q.isCorrect).length;
  const totalQuestionsCount = (result.answersSummary || []).length;
  const passedTasksCount = (result.practicalSummary || []).filter((t) => t.isPassed).length;
  const totalTasksCount = (result.practicalSummary || []).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Demonstrated Technical Score Highlight - Clean Light Card */}
        <div className="lg:col-span-5 bg-white border border-[#E0E7F2] rounded-2xl p-6 sm:p-8 flex flex-col justify-between shadow-[var(--shadow-card)] relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
            <Award className="w-48 h-48 text-[#4F46E5]" />
          </div>

          <div>
            <div className="flex items-center justify-between text-[#405B8B] text-xs font-bold uppercase tracking-wider mb-2">
              <span>Demonstrated Technical Score</span>
              <button
                type="button"
                onClick={() => setShowFormulaModal(!showFormulaModal)}
                className="hover:text-[#0B1B43] flex items-center gap-1 transition-colors cursor-pointer text-[#4F46E5]"
                title="View Scoring Calculation Formula"
              >
                <HelpCircle className="w-3.5 h-3.5" /> Formula
              </button>
            </div>
            <div className="flex items-baseline gap-3 my-2">
              <span className="text-6xl sm:text-7xl font-black text-[#0B1B43] tracking-tight">{overallScore}%</span>
              <span className="text-sm font-semibold text-[#405B8B] uppercase">Overall</span>
            </div>
            <div className="text-xs font-bold text-[#16A34A] mt-1">
              {tier.readyLabel}
            </div>
            <p className="text-xs text-[#405B8B] leading-relaxed mt-1.5">{tier.summary}</p>
          </div>

          {/* Scoring Transparency Sub-Card */}
          <div className="mt-6 pt-4 border-t border-[#E0E7F2] text-[11px] text-[#405B8B] flex flex-col gap-1.5">
            <div className="flex items-center justify-between font-mono">
              <span>Scoring Weighting:</span>
              <span className="font-semibold text-[#0B1B43]">
                {hasMcq && hasPractical
                  ? ASSESSMENT_SCORING_CONFIG.weightingLabel
                  : hasMcq
                  ? '100% Knowledge Quiz'
                  : '100% Practical Workbench'}
              </span>
            </div>
            {result.hasInfrastructureError && (
              <div className="text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200 flex items-center gap-1.5 mt-1">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                Unexecuted tasks due to runtime unavailability did not penalize your score.
              </div>
            )}
          </div>
        </div>

        {/* Secondary Metrics: Knowledge & Practical Split */}
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Knowledge Score Card */}
          <div className="bg-white border border-[#E0E7F2] rounded-2xl p-6 flex flex-col justify-between shadow-[var(--shadow-card)]">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 rounded-xl bg-blue-50 text-[#087BFA] border border-blue-100">
                  <BookOpen className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-[#405B8B]">
                  {hasMcq && hasPractical ? '40% Weighted' : 'Direct'}
                </span>
              </div>
              <h3 className="text-sm font-bold text-[#0B1B43]">Knowledge Quiz Score</h3>
              <p className="text-xs text-[#405B8B] mt-1">
                Foundational architecture, syntax, and domain concepts.
              </p>
            </div>

            <div className="mt-5">
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-3xl font-extrabold text-[#087BFA]">
                  {knowledgeScore}%
                </span>
                <span className="text-xs text-[#405B8B] font-mono">
                  {correctAnswersCount}/{totalQuestionsCount} Correct
                </span>
              </div>
              <div
                className="w-full h-2.5 bg-[#EEF2F6] rounded-full overflow-hidden"
                role="progressbar"
                aria-valuenow={knowledgeScore}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="h-full bg-[#087BFA] rounded-full transition-all duration-500"
                  style={{ width: `${knowledgeScore}%` }}
                />
              </div>
            </div>
          </div>

          {/* Practical Workbench Card */}
          <div className="bg-white border border-[#E0E7F2] rounded-2xl p-6 flex flex-col justify-between shadow-[var(--shadow-card)]">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 rounded-xl bg-[#F0FDF4] text-[#16A34A] border border-emerald-100">
                  <Code2 className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-[#405B8B]">
                  {hasMcq && hasPractical ? '60% Weighted' : 'Direct'}
                </span>
              </div>
              <h3 className="text-sm font-bold text-[#0B1B43]">Practical Workbench</h3>
              <p className="text-xs text-[#405B8B] mt-1">
                Automated tests, algorithmic logic, and SQL assertions.
              </p>
            </div>

            <div className="mt-5">
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-3xl font-extrabold text-[#16A34A]">
                  {practicalScore}%
                </span>
                <span className="text-xs text-[#405B8B] font-mono">
                  {passedTasksCount}/{totalTasksCount} Tasks Passed
                </span>
              </div>
              <div
                className="w-full h-2.5 bg-[#EEF2F6] rounded-full overflow-hidden"
                role="progressbar"
                aria-valuenow={practicalScore}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="h-full bg-[#16A34A] rounded-full transition-all duration-500"
                  style={{ width: `${practicalScore}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Formula Explanation Banner */}
      {showFormulaModal && (
        <div className="p-4 bg-[#EEF2FF] border border-indigo-200 rounded-xl text-xs text-[#0B1B43] space-y-1.5 shadow-[var(--shadow-card)]">
          <div className="font-bold flex items-center gap-1.5 text-sm text-[#4F46E5]">
            <Info className="w-4 h-4 text-[#4F46E5]" />
            Official SARATHI Scoring &amp; Verification Methodology
          </div>
          <p className="text-[#405B8B]">
            Overall score is calculated mathematically from validly evaluated items:
            <code className="mx-1 px-1.5 py-0.5 rounded bg-white border border-indigo-200 font-mono text-[11px] text-[#4F46E5]">
              Overall = {ASSESSMENT_SCORING_CONFIG.formulaDisplay}
            </code>
            when both sections are evaluated. If an assessment only has questions or practical tasks, the score reflects
            100% of the active modality.
          </p>
        </div>
      )}
    </div>
  );
};
