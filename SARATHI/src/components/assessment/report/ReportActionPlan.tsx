import React from 'react';
import { Sparkles, RotateCcw, ArrowRight } from 'lucide-react';
import type { SkillGapItem } from './reportUtils';

interface ReportActionPlanProps {
  sortedSkills: SkillGapItem[];
  activeRoleTitle: string;
  onRetake: () => void;
  onNavigateRoadmap: () => void;
  onNavigateSkillGap: () => void;
}

export const ReportActionPlan: React.FC<ReportActionPlanProps> = ({
  sortedSkills,
  activeRoleTitle,
  onRetake,
  onNavigateRoadmap,
  onNavigateSkillGap,
}) => {
  const topGaps = sortedSkills.slice(0, 3);

  return (
    <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold mb-2">
          <Sparkles className="w-3.5 h-3.5" /> Next Steps & Recommendations
        </div>
        <h2 className="text-xl font-bold tracking-tight">Recommended Action Plan</h2>
        <p className="text-xs text-indigo-200/90 mt-1 max-w-xl">
          Focus your learning efforts on the largest competency gaps identified for{' '}
          <strong className="text-white">{activeRoleTitle}</strong>.
        </p>
      </div>

      {/* Top 3 Prioritized Gaps */}
      {topGaps.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {topGaps.map((s) => (
            <div
              key={s.skillName}
              className="p-4 rounded-xl bg-white/5 border border-white/10 flex flex-col justify-between text-xs space-y-3"
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-sm text-white">{s.skillName}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      s.gap >= 0
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : s.gap === -1
                        ? 'bg-amber-500/20 text-amber-300'
                        : 'bg-rose-500/20 text-rose-300'
                    }`}
                  >
                    {s.gap >= 0 ? 'Benchmark Met' : `${s.gap} Level Gap`}
                  </span>
                </div>
                <p className="text-indigo-200/80 text-[11px] leading-relaxed line-clamp-2">{s.importance}</p>
              </div>

              <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-indigo-300 font-semibold">
                <span>Action:</span>
                <span>{s.nextAction}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Retake Prompt and Navigation Actions */}
      <div className="pt-5 border-t border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-white">Would you like to take the assessment again?</h3>
          <p className="text-xs text-indigo-200/80 mt-0.5">
            Retaking creates a distinct attempt with a new session while preserving your score history.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onRetake}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl flex items-center gap-2 transition-colors cursor-pointer shadow-sm"
          >
            <RotateCcw className="w-4 h-4" /> Retake Assessment
          </button>

          <button
            type="button"
            onClick={onNavigateSkillGap}
            className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs rounded-xl transition-colors cursor-pointer"
          >
            Skill Gap Analysis
          </button>

          <button
            type="button"
            onClick={onNavigateRoadmap}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl flex items-center gap-2 transition-colors cursor-pointer shadow-sm"
          >
            View My Roadmap <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
