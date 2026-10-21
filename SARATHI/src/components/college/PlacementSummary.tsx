import React from 'react';
import { Briefcase, Building2, ShieldCheck, ArrowUpRight } from 'lucide-react';
import { Badge } from '../common/Badge';
import { SkeletonCard } from '../common/Skeleton';
import type { CollegeKPIs } from '../../types/college';

interface PlacementSummaryProps {
  kpis: CollegeKPIs | null;
  isLoading: boolean;
  lastSyncedAt?: string | null;
}

export const PlacementSummary: React.FC<PlacementSummaryProps> = ({ kpis, isLoading, lastSyncedAt }) => {
  if (isLoading || !kpis) {
    return <SkeletonCard />;
  }

  const placementPct = kpis.totalStudents > 0
    ? Math.round(((kpis.offersAccepted ?? 0) / kpis.totalStudents) * 100)
    : 0;

  return (
    <div className="bg-white rounded-3xl border border-[#E0E7F2] p-6 shadow-xs space-y-5" role="region" aria-label="Placement outcomes summary">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="indigo" size="xs">Institutional Outcomes</Badge>
            <span className="text-xs font-bold text-slate-400">• Verified Placement Statistics</span>
          </div>
          <h2 className="text-base sm:text-lg font-black text-[#0B1B43] tracking-tight">
            Placement Readiness &amp; Career Outcomes Summary
          </h2>
        </div>
        <div className="text-xs text-[#405B8B] bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 self-start sm:self-auto font-medium">
          {lastSyncedAt
            ? `Live Synchronized Cohort Data · ${new Date(lastSyncedAt).toLocaleString()}`
            : 'Live Synchronized Cohort Data'}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100/80 space-y-1">
          <div className="flex items-center justify-between text-emerald-700">
            <span className="text-[11px] font-bold uppercase tracking-wider">Offers Accepted</span>
            <Briefcase className="w-4 h-4" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-800">{kpis.offersAccepted ?? 0}</div>
          <p className="text-[11px] text-emerald-700/80 font-medium">{placementPct}% of graduating cohort placed</p>
        </div>

        <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100/80 space-y-1">
          <div className="flex items-center justify-between text-indigo-700">
            <span className="text-[11px] font-bold uppercase tracking-wider">Active In Pipeline</span>
            <Building2 className="w-4 h-4" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-indigo-900">{kpis.activeInPipeline ?? 0}</div>
          <p className="text-[11px] text-indigo-700/80 font-medium">Under active employer review</p>
        </div>

        <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100/80 space-y-1">
          <div className="flex items-center justify-between text-blue-700">
            <span className="text-[11px] font-bold uppercase tracking-wider">Verified Passports</span>
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-blue-900">{kpis.verifiedPassportCount ?? 0}</div>
          <p className="text-[11px] text-blue-700/80 font-medium">Students with peer-reviewed repos</p>
        </div>

        <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-100/80 space-y-1">
          <div className="flex items-center justify-between text-purple-700">
            <span className="text-[11px] font-bold uppercase tracking-wider">Partner Companies</span>
            <ArrowUpRight className="w-4 h-4" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-purple-900">{kpis.partnerCompanies ?? 0}</div>
          <p className="text-[11px] text-purple-700/80 font-medium">Tech companies recruiting on Sarathi</p>
        </div>
      </div>
    </div>
  );
};
