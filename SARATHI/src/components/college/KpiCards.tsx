import React from 'react';
import { Users, CheckCircle2, Award, ShieldCheck } from 'lucide-react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { ProgressBar } from '../common/ProgressBar';
import { SkeletonCard } from '../common/Skeleton';
import { EmptyState } from '../common/EmptyState';
import type { CollegeKPIs } from '../../types/college';

interface KpiCardsProps {
  kpis: CollegeKPIs | null;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
}

export const KpiCards: React.FC<KpiCardsProps> = ({ kpis, isLoading, error, onRetry }) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5" aria-label="Loading readiness metrics">
        {[0, 1, 2, 3].map((i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (error || !kpis) {
    return (
      <Card>
        <EmptyState
          icon={Users}
          title="Could not load readiness metrics"
          description={error ?? 'No institutional data is available right now.'}
          action={
            <Button variant="outline" size="sm" onClick={onRetry}>
              Retry
            </Button>
          }
        />
      </Card>
    );
  }

  const passportRate = kpis.verifiedPassportRate ?? 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5" role="region" aria-label="Readiness overview metrics">
      <Card hoverEffect borderAccent="blue" className="flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#405B8B] uppercase tracking-wider">Total Enrolled</span>
            <div className="p-2 rounded-xl bg-blue-50 text-[#087BFA]">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-[#0B1B43] tracking-tight mb-1">{kpis.totalStudents}</div>
        </div>
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
          <span className="text-[#087BFA] font-bold">CSE, IT, AI/DS &amp; ECE</span>
          <span className="text-slate-400 font-medium">Batch of 2026</span>
        </div>
      </Card>

      <Card hoverEffect borderAccent="purple" className="flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#405B8B] uppercase tracking-wider">Diagnostic Tests Taken</span>
            <div className="p-2 rounded-xl bg-purple-50 text-[#603DF5]">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-[#0B1B43] tracking-tight mb-1">{kpis.assessedStudentsCount}</div>
        </div>
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
          <span className="text-[#603DF5] font-bold">{kpis.assessmentRate}% Cohort Participation</span>
          <span className="text-slate-400 font-medium">Objective Tests</span>
        </div>
      </Card>

      <Card hoverEffect borderAccent="green" className="flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#405B8B] uppercase tracking-wider">Average Readiness Score</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-[#16A34A]">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-[#16A34A] tracking-tight mb-1">{kpis.avgReadinessScore}%</div>
        </div>
        <div className="space-y-1.5 pt-1">
          <ProgressBar progress={kpis.avgReadinessScore} color="green" size="sm" />
          <span className="text-[11px] text-[#405B8B] block truncate">{kpis.placementRate}% Placement Rate</span>
        </div>
      </Card>

      <Card hoverEffect borderAccent="amber" className="flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#405B8B] uppercase tracking-wider">Verified Passport Rate</span>
            <div className="p-2 rounded-xl bg-amber-50 text-[#D97706]">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-[#D97706] tracking-tight mb-1">{passportRate}%</div>
        </div>
        <div className="space-y-1.5 pt-1">
          <ProgressBar progress={passportRate} color="amber" size="sm" />
          <span className="text-[11px] text-[#405B8B] block truncate">
            {kpis.verifiedPassportCount ?? kpis.verifiedSkillsCount} Students with Verified Repos
          </span>
        </div>
      </Card>
    </div>
  );
};
