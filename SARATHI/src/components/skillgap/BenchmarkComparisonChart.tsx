import React, { useState } from 'react';
import { BarChart2, CheckCircle2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '../common/Badge';
import { getProficiencyLabel } from '../../types/skill';

export interface BenchmarkComparisonItem {
  skillName: string;
  category: string;
  requiredProficiency: number; // 1-5
  currentProficiency: number;  // 0-5
  gapLevel: number;            // max(0, required - current)
  priority?: 'High' | 'Medium' | 'Low';
}

interface BenchmarkComparisonChartProps {
  items: BenchmarkComparisonItem[];
  targetRole: string;
  className?: string;
}

export const BenchmarkComparisonChart: React.FC<BenchmarkComparisonChartProps> = ({
  items,
  targetRole,
  className = ''
}) => {
  const [showAll, setShowAll] = useState(false);

  if (!items || items.length === 0) {
    return (
      <div className={`p-6 bg-white rounded-2xl border border-[#E0E7F2] text-center ${className}`}>
        <BarChart2 className="w-8 h-8 text-[#405B8B] mx-auto mb-2 opacity-50" />
        <p className="text-xs font-bold text-[#0B1B43]">No Competency Benchmarks Available</p>
        <p className="text-[11px] text-[#405B8B] mt-1">
          Select a career role to view calibrated benchmark comparison.
        </p>
      </div>
    );
  }

  // Display top 6 by default, or all if toggled
  const displayItems = showAll ? items : items.slice(0, 6);

  return (
    <div className={`bg-white p-5 sm:p-6 rounded-2xl border border-[#E0E7F2] shadow-xs space-y-4 ${className}`}>
      {/* Header and Legend */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E0E7F2] pb-3">
        <div>
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-[#087BFA]" />
            <h3 className="text-sm font-extrabold text-[#0B1B43]">
              Role Benchmark Competency Comparison
            </h3>
          </div>
          <p className="text-[11px] text-[#405B8B] mt-0.5">
            Demonstrated proficiency vs. industry benchmark requirements for <strong className="text-[#0B1B43]">{targetRole}</strong>.
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-[11px] font-semibold text-[#405B8B] shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-[#087BFA]" />
            <span>Demonstrated</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs border-2 border-dashed border-[#603DF5] bg-purple-50" />
            <span>Role Target</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-emerald-500" />
            <span>Target Met</span>
          </div>
        </div>
      </div>

      {/* Comparison Rows */}
      <div className="space-y-3.5" role="list" aria-label="Competency benchmark comparison list">
        {displayItems.map((item) => {
          const isMet = item.gapLevel === 0 || item.currentProficiency >= item.requiredProficiency;
          const demonstratedPct = Math.min(100, Math.round((item.currentProficiency / 5) * 100));
          const targetPct = Math.min(100, Math.round((item.requiredProficiency / 5) * 100));

          const demonstratedLabel = item.currentProficiency === 0
            ? 'Not Assessed (Lvl 0)'
            : `Lvl ${item.currentProficiency} • ${getProficiencyLabel(item.currentProficiency)}`;
          const targetLabel = `Lvl ${item.requiredProficiency} • ${getProficiencyLabel(item.requiredProficiency)}`;

          return (
            <div
              key={item.skillName}
              className="p-3 rounded-xl bg-slate-50/70 border border-slate-200/80 hover:bg-slate-50 transition-colors space-y-2"
              role="listitem"
              aria-label={`${item.skillName}: Demonstrated level ${item.currentProficiency} of 5, Target level ${item.requiredProficiency} of 5, ${isMet ? 'Target Met' : `Gap of ${item.gapLevel} levels`}`}
            >
              {/* Row Header: Skill Name, Category, Gap Badge */}
              <div className="flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-extrabold text-[#0B1B43] truncate">{item.skillName}</span>
                  <Badge variant="gray" size="xs">{item.category}</Badge>
                  {item.priority === 'High' && (
                    <Badge variant="rose" size="xs">High Priority</Badge>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isMet ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3" />
                      Target Met
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                      <AlertCircle className="w-3 h-3" />
                      Gap: -{item.gapLevel} {item.gapLevel === 1 ? 'Level' : 'Levels'}
                    </span>
                  )}
                </div>
              </div>

              {/* Numerical Indicators */}
              <div className="flex items-center justify-between text-[11px] text-[#405B8B] font-medium">
                <div>
                  Demonstrated: <strong className={item.currentProficiency > 0 ? (isMet ? 'text-emerald-700' : 'text-[#087BFA]') : 'text-slate-400'}>{demonstratedLabel}</strong>
                </div>
                <div>
                  Role Target: <strong className="text-[#0B1B43]">{targetLabel}</strong>
                </div>
              </div>

              {/* Dual-bar Chart Track (Scale 0 to 5) */}
              <div className="relative w-full h-3.5 bg-slate-200/70 rounded-full overflow-hidden">
                {/* Scale Grid Ticks (1 to 5) */}
                <div className="absolute inset-0 grid grid-cols-5 pointer-events-none z-10 divide-x divide-white/70">
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                </div>

                {/* Target Level Background Indicator */}
                <div
                  className="absolute top-0 bottom-0 left-0 bg-purple-200/50 border-r-2 border-purple-500 transition-all duration-300"
                  style={{ width: `${targetPct}%` }}
                  title={`Target Level: ${item.requiredProficiency}/5`}
                />

                {/* Demonstrated Proficiency Bar */}
                {demonstratedPct > 0 && (
                  <div
                    className={`absolute top-0 bottom-0 left-0 transition-all duration-500 rounded-full ${
                      isMet
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                        : 'bg-gradient-to-r from-[#087BFA] to-indigo-500'
                    }`}
                    style={{ width: `${demonstratedPct}%` }}
                    title={`Demonstrated Level: ${item.currentProficiency}/5`}
                  />
                )}
              </div>

              {/* Tick Scale Labels */}
              <div className="flex justify-between text-[9px] text-slate-400 font-mono px-0.5">
                <span>0</span>
                <span>1 Beginner</span>
                <span>2 Developing</span>
                <span>3 Proficient</span>
                <span>4 Advanced</span>
                <span>5 Expert</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Show More / Show Less Toggle */}
      {items.length > 6 && (
        <div className="pt-2 text-center">
          <button
            onClick={() => setShowAll(!showAll)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#087BFA] hover:text-[#0662c7] transition-colors cursor-pointer py-1 px-3 rounded-lg hover:bg-blue-50"
          >
            {showAll ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" />
                Show Top 6 Competencies
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" />
                Show All {items.length} Competencies ({items.length - 6} more)
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
