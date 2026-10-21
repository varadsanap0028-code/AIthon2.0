import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { GraduationCap, ShieldAlert } from 'lucide-react';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { SkeletonCard } from '../common/Skeleton';
import { EmptyState } from '../common/EmptyState';
import type { CollegeDepartment } from '../../types/college';

interface DepartmentBreakdownProps {
  departments: CollegeDepartment[];
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
}

export const DepartmentBreakdown: React.FC<DepartmentBreakdownProps> = ({
  departments,
  isLoading,
  error,
  onRetry,
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const branchFilter = searchParams.get('branch') ?? 'all';
  const branches = ['all', ...Array.from(new Set(departments.map((d) => d.code)))];
  const visible = departments.filter((d) => branchFilter === 'all' || d.code === branchFilter);

  const setBranch = (b: string) => {
    const next = new URLSearchParams(searchParams);
    if (b === 'all') next.delete('branch');
    else next.set('branch', b);
    setSearchParams(next);
  };

  if (isLoading) {
    return (
      <Card className="space-y-5">
        <SkeletonCard />
      </Card>
    );
  }

  if (error && departments.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={GraduationCap}
          title="Could not load department breakdown"
          description={error ?? 'No department data is available.'}
          action={<Button variant="outline" size="sm" onClick={onRetry}>Retry</Button>}
        />
      </Card>
    );
  }

  return (
    <Card className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <GraduationCap className="w-4 h-4 text-[#087BFA]" />
            <h3 className="text-base sm:text-lg font-black text-[#0B1B43]">Departmental Readiness</h3>
          </div>
          <p className="text-xs text-[#405B8B]">Readiness and placement rates across branches</p>
        </div>
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-semibold self-start sm:self-auto" role="group" aria-label="Branch filter">
          {branches.map((filter) => (
            <button
              key={filter}
              onClick={() => setBranch(filter)}
              aria-pressed={branchFilter === filter}
              className={`px-3 py-1 rounded-lg uppercase tracking-wider cursor-pointer transition-all ${
                branchFilter === filter
                  ? 'bg-white text-[#0B1B43] shadow-xs font-black'
                  : 'text-slate-500 hover:text-slate-900 font-semibold'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>
      {visible.length === 0 ? (
        <EmptyState icon={GraduationCap} title="No departments match this filter" description="Try a different branch filter." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {visible.map((dept) => (
            <div key={dept.id}>
              {dept.suppressed ? (
                <div role="status" className="p-4 rounded-2xl bg-slate-50 border border-dashed border-slate-300 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-sm text-[#0B1B43]">{dept.name}</span>
                    <Badge variant="gray" size="xs">{dept.code}</Badge>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-slate-500">
                    <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{dept.notice ?? 'Insufficient cohort size'}</span>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-400">{dept.studentsCount} enrolled</span>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E0E7F2] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-sm text-[#0B1B43]">{dept.name}</span>
                    <Badge variant="blue" size="xs">{dept.code}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                    <div className="p-2 rounded-xl bg-white border border-slate-100">
                      <span className="text-[10px] text-slate-400 block font-bold uppercase">Enrolled</span>
                      <span className="text-base font-black text-[#0B1B43]">{dept.studentsCount}</span>
                    </div>
                    <div className="p-2 rounded-xl bg-white border border-slate-100">
                      <span className="text-[10px] text-slate-400 block font-bold uppercase">Readiness</span>
                      <span className="text-base font-black text-[#16A34A]">{dept.avgReadiness}%</span>
                    </div>
                    <div className="p-2 rounded-xl bg-white border border-slate-100">
                      <span className="text-[10px] text-slate-400 block font-bold uppercase">Assessed</span>
                      <span className="text-base font-black text-[#603DF5]">{dept.assessedRate}%</span>
                    </div>
                    <div className="p-2 rounded-xl bg-white border border-slate-100">
                      <span className="text-[10px] text-slate-400 block font-bold uppercase">Placed</span>
                      <span className="text-base font-black text-[#087BFA]">{dept.placedRate}%</span>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-slate-200/80 text-[11px] text-[#405B8B]">
                    <span>Leading Skill: <strong className="text-[#0B1B43]">{dept.topSkill ?? '—'}</strong></span>
                  </div>
                  <div className="text-[11px] text-[#405B8B]">
                    At-risk: <strong className="text-[#DC2626]">{dept.atRiskCount}</strong>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};
