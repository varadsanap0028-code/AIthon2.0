import React from 'react';
import {
  TrendingUp,
  Award,
  AlertTriangle,
  Map,
  HelpCircle,
  ArrowUpRight
} from 'lucide-react';
import { Card } from '../../../components/common/Card';
import { ProgressBar } from '../../../components/common/ProgressBar';

interface KpiRowProps {
  readinessScore: number;
  readinessChange: number;
  verifiedSkillsCount: number;
  highPriorityGapsCount: number;
  roadmapProgressPct: number;
  onOpenExplainer: () => void;
  onNavigate: (path: string) => void;
}

export const KpiRow: React.FC<KpiRowProps> = ({
  readinessScore,
  readinessChange,
  verifiedSkillsCount,
  highPriorityGapsCount,
  roadmapProgressPct,
  onOpenExplainer,
  onNavigate,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
      {/* 1. Readiness Score */}
      <Card
        hoverEffect
        className="p-5 flex flex-col justify-between border-[#E0E7F2] cursor-pointer"
        onClick={onOpenExplainer}
      >
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-[#405B8B] uppercase tracking-wider">
            <span>Career Readiness</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenExplainer();
              }}
              className="text-[#087BFA] hover:text-[#065ec0] cursor-pointer"
              title="How is this score calculated?"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-[#0B1B43]">
              {readinessScore > 0 ? `${readinessScore}%` : 'Not Assessed'}
            </span>
            {readinessScore > 0 && readinessChange > 0 && (
              <span className="inline-flex items-center text-xs font-bold text-emerald-600">
                <TrendingUp className="w-3.5 h-3.5 mr-0.5" />
                +{readinessChange}%
              </span>
            )}
          </div>

          <ProgressBar progress={readinessScore} color="gradient" size="sm" />
        </div>

        <p className="text-[11px] text-[#405B8B] mt-3">
          {readinessScore >= 80 ? 'Market Ready for Tier-1 roles' : 'Diagnostic baseline tracking'}
        </p>
      </Card>

      {/* 2. Verified Skills */}
      <Card
        hoverEffect
        className="p-5 flex flex-col justify-between border-[#E0E7F2] cursor-pointer"
        onClick={() => onNavigate('/student/skill-passport')}
      >
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-[#405B8B] uppercase tracking-wider">
            <span>Verified Skills</span>
            <Award className="w-4 h-4 text-[#603DF5]" />
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-[#0B1B43]">
              {verifiedSkillsCount}
            </span>
            <span className="text-xs text-[#405B8B] font-bold">in Passport</span>
          </div>

          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full bg-[#603DF5] rounded-full transition-all"
              style={{ width: `${Math.min(100, verifiedSkillsCount * 12)}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-[#603DF5] font-bold mt-3">
          <span>View Verified Passport</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </div>
      </Card>

      {/* 3. High-Priority Gaps */}
      <Card
        hoverEffect
        className="p-5 flex flex-col justify-between border-[#E0E7F2] cursor-pointer"
        onClick={() => onNavigate('/student/skill-gap')}
      >
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-[#405B8B] uppercase tracking-wider">
            <span>Priority Skill Gaps</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-amber-600">
              {highPriorityGapsCount}
            </span>
            <span className="text-xs text-[#405B8B] font-bold">Critical Gaps</span>
          </div>

          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full bg-amber-500 rounded-full transition-all"
              style={{ width: `${Math.min(100, highPriorityGapsCount * 25)}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-amber-700 font-bold mt-3">
          <span>Bridge High Priority Gaps</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </div>
      </Card>

      {/* 4. Roadmap Progress */}
      <Card
        hoverEffect
        className="p-5 flex flex-col justify-between border-[#E0E7F2] cursor-pointer"
        onClick={() => onNavigate('/student/roadmap')}
      >
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-[#405B8B] uppercase tracking-wider">
            <span>Roadmap Progress</span>
            <Map className="w-4 h-4 text-[#087BFA]" />
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-[#0B1B43]">
              {roadmapProgressPct}%
            </span>
            <span className="text-xs text-[#405B8B] font-bold">Completed</span>
          </div>

          <ProgressBar progress={roadmapProgressPct} color="blue" size="sm" />
        </div>

        <div className="flex items-center justify-between text-[11px] text-[#087BFA] font-bold mt-3">
          <span>Open Career Roadmap</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </div>
      </Card>
    </div>
  );
};
