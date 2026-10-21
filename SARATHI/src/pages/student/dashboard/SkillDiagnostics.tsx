import React, { useMemo } from 'react';
import { Brain, ArrowRight } from 'lucide-react';
import { Card } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import type { CategoryScore, SkillGapItem } from './chartMappers';
import { SkillRadarCard } from './SkillRadarCard';
import { TopGapsCard } from './TopGapsCard';

interface SkillDiagnosticsProps {
  categoryScores: CategoryScore[];
  topGaps: SkillGapItem[];
  hasData: boolean;
  onNavigate: (path: string) => void;
}

export const SkillDiagnostics: React.FC<SkillDiagnosticsProps> = ({
  categoryScores,
  topGaps,
  hasData,
  onNavigate,
}) => {
  // Priority count chips
  const highGapsCount = topGaps.filter((g) => g.priority === 'High').length;
  const medGapsCount = topGaps.filter((g) => g.priority === 'Medium').length;
  const lowGapsCount = topGaps.filter((g) => g.priority === 'Low').length;

  // Computed "so what" caption
  const computedCaption = useMemo(() => {
    if (topGaps.length === 0) return 'Take a diagnostic assessment to analyze required domain competencies.';
    const highInCat = topGaps.filter((g) => g.priority === 'High');
    if (highInCat.length > 0) {
      const topCat = highInCat[0].category;
      return `${highInCat.length} of your high-priority gaps are concentrated in ${topCat}.`;
    }
    return 'All evaluated competencies are tracking close to role benchmarks.';
  }, [topGaps]);

  if (!hasData) {
    return (
      <Card className="p-8 text-center space-y-4 border-[#E0E7F2]">
        <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#087BFA] flex items-center justify-center mx-auto">
          <Brain className="w-7 h-7" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-black text-[#0B1B43]">
            No Skill Diagnostics Baseline Yet
          </h2>
          <p className="text-xs text-[#405B8B] max-w-md mx-auto leading-relaxed">
            Complete your first diagnostic assessment to generate your category competency radar and benchmark gap breakdown.
          </p>
        </div>
        <Button variant="primary" size="md" onClick={() => onNavigate('/student/assessment')}>
          Take Diagnostic Assessment
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* SECTION HEADER & PRIORITY COUNT CHIPS */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-[#0B1B43]">
            Skill Diagnostics & Benchmark Gaps
          </h2>
          <p className="text-xs text-[#405B8B] mt-0.5">{computedCaption}</p>
        </div>

        {/* 3 Count Chips */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-2.5 py-1 rounded-xl text-xs font-bold border bg-rose-50/80 border-rose-200 text-rose-700">
            {highGapsCount} High Priority
          </span>
          <span className="px-2.5 py-1 rounded-xl text-xs font-bold border bg-amber-50/80 border-amber-200 text-amber-700">
            {medGapsCount} Medium Priority
          </span>
          <span className="px-2.5 py-1 rounded-xl text-xs font-bold border bg-emerald-50/80 border-emerald-200 text-emerald-700">
            {lowGapsCount} On Track
          </span>
        </div>
      </div>

      {/* CHARTS DUAL GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SkillRadarCard categoryScores={categoryScores} />
        <TopGapsCard topGaps={topGaps} />
      </div>

      {/* REPLACED DUPLICATE TABLE WITH LINK TO DEDICATED SKILL GAP ANALYSIS PAGE */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-[#E0E7F2] shadow-2xs">
        <div className="text-xs text-slate-600 space-y-0.5">
          <strong className="text-[#0B1B43] text-sm font-extrabold block">
            Looking for detailed competency gap breakdowns & resource recommendations?
          </strong>
          <span className="text-[#405B8B]">
            Explore benchmark levels, missing skills, and curated tutorials on the dedicated Skill Gap Analysis page.
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onNavigate('/student/skill-gap')}
          rightIcon={<ArrowRight className="w-3.5 h-3.5 text-[#087BFA]" />}
          className="shrink-0"
        >
          Open Skill Gap Analysis
        </Button>
      </div>
    </div>
  );
};
