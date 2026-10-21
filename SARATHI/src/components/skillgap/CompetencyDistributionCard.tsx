import React, { useMemo } from 'react';
import { PieChart, CheckCircle2, TrendingDown, HelpCircle, ShieldCheck } from 'lucide-react';

export interface DistributionSkillInput {
  skillName: string;
  requiredProficiency: number;
  currentProficiency: number;
  gapLevel: number;
  evidenceStatus?: string;
  gapStatus?: string;
}

interface CompetencyDistributionCardProps {
  skills: DistributionSkillInput[];
  className?: string;
}

export const CompetencyDistributionCard: React.FC<CompetencyDistributionCardProps> = ({
  skills,
  className = ''
}) => {
  const distribution = useMemo(() => {
    let metTarget = 0;
    let belowTarget = 0;
    let insufficientEvidence = 0;

    skills.forEach((s) => {
      // 1. Goal met: current meets or exceeds required proficiency
      if (s.gapLevel === 0 || s.currentProficiency >= s.requiredProficiency) {
        metTarget++;
      }
      // 2. Insufficient evidence / unassessed: level 0 or marked insufficient
      else if (s.currentProficiency === 0 || s.evidenceStatus === 'INSUFFICIENT_EVIDENCE' || s.gapStatus === 'EVIDENCE_NEEDED') {
        insufficientEvidence++;
      }
      // 3. Below target: demonstrated level > 0 but less than target
      else {
        belowTarget++;
      }
    });

    const total = skills.length;
    const metPct = total > 0 ? Math.round((metTarget / total) * 100) : 0;
    const belowPct = total > 0 ? Math.round((belowTarget / total) * 100) : 0;
    // Insufficient percentage accounts for rounding difference to reach 100% when total > 0
    const insufficientPct = total > 0 ? Math.max(0, 100 - metPct - belowPct) : 0;

    return {
      metTarget,
      belowTarget,
      insufficientEvidence,
      total,
      metPct,
      belowPct,
      insufficientPct
    };
  }, [skills]);

  return (
    <div className={`bg-white p-5 sm:p-6 rounded-2xl border border-[#E0E7F2] shadow-xs space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#E0E7F2] pb-3">
        <div className="flex items-center gap-2">
          <PieChart className="w-4 h-4 text-[#603DF5]" />
          <h3 className="text-sm font-extrabold text-[#0B1B43]">
            Competency Gap Distribution
          </h3>
        </div>
        <span className="text-[11px] font-bold text-[#405B8B] bg-slate-100 px-2.5 py-0.5 rounded-full">
          {distribution.total} Total Required
        </span>
      </div>

      {/* Segmented Visual Stacked Bar */}
      <div className="space-y-1.5">
        <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden flex shadow-inner">
          {distribution.metPct > 0 && (
            <div
              className="h-full bg-emerald-500 transition-all duration-500 hover:opacity-90"
              style={{ width: `${distribution.metPct}%` }}
              title={`Benchmark Met: ${distribution.metTarget} (${distribution.metPct}%)`}
            />
          )}
          {distribution.belowPct > 0 && (
            <div
              className="h-full bg-amber-500 transition-all duration-500 hover:opacity-90"
              style={{ width: `${distribution.belowPct}%` }}
              title={`Below Benchmark: ${distribution.belowTarget} (${distribution.belowPct}%)`}
            />
          )}
          {distribution.insufficientPct > 0 && (
            <div
              className="h-full bg-slate-400 transition-all duration-500 hover:opacity-90"
              style={{ width: `${distribution.insufficientPct}%` }}
              title={`Requires Evidence: ${distribution.insufficientEvidence} (${distribution.insufficientPct}%)`}
            />
          )}
        </div>
        <div className="flex justify-between text-[10px] text-slate-400 font-semibold px-0.5">
          <span>0%</span>
          <span>Role Coverage: {distribution.metPct}% Ready</span>
          <span>100%</span>
        </div>
      </div>

      {/* Three Mutually Exclusive Distribution Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Met Target */}
        <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200/90 flex flex-col justify-between space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-extrabold text-emerald-800 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Met Target
            </span>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/70 px-1.5 py-0.5 rounded">
              {distribution.metPct}%
            </span>
          </div>
          <div className="text-xl font-black text-emerald-700">
            {distribution.metTarget}
          </div>
          <p className="text-[10px] text-emerald-800/80 leading-tight">
            Demonstrated level meets or exceeds target.
          </p>
        </div>

        {/* Below Target */}
        <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/90 flex flex-col justify-between space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-extrabold text-amber-800 flex items-center gap-1.5">
              <TrendingDown className="w-3.5 h-3.5 text-amber-600" />
              Below Target
            </span>
            <span className="text-[10px] font-bold text-amber-700 bg-amber-100/70 px-1.5 py-0.5 rounded">
              {distribution.belowPct}%
            </span>
          </div>
          <div className="text-xl font-black text-amber-700">
            {distribution.belowTarget}
          </div>
          <p className="text-[10px] text-amber-800/80 leading-tight">
            Demonstrated, but gap remains to target level.
          </p>
        </div>

        {/* Insufficient Evidence / Unassessed */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-extrabold text-slate-700 flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
              Needs Evidence
            </span>
            <span className="text-[10px] font-bold text-slate-600 bg-slate-200/70 px-1.5 py-0.5 rounded">
              {distribution.insufficientPct}%
            </span>
          </div>
          <div className="text-xl font-black text-slate-700">
            {distribution.insufficientEvidence}
          </div>
          <p className="text-[10px] text-slate-500 leading-tight">
            Unassessed or awaiting diagnostic proof.
          </p>
        </div>
      </div>

      {/* Non-duplication Data Guarantee Note */}
      <div className="flex items-center gap-1.5 text-[10px] text-[#405B8B] bg-slate-50 p-2 rounded-lg border border-slate-100">
        <ShieldCheck className="w-3.5 h-3.5 text-[#087BFA] shrink-0" />
        <span>
          Derived from active skill assessment records without double-counting ({distribution.metTarget} + {distribution.belowTarget} + {distribution.insufficientEvidence} = {distribution.total} competencies).
        </span>
      </div>
    </div>
  );
};
