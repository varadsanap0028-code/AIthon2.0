import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { SkeletonCard } from '../common/Skeleton';
import { EmptyState } from '../common/EmptyState';
import type { CollegeAtRiskStudent } from '../../types/college';

interface AtRiskTableProps {
  students: CollegeAtRiskStudent[];
  totalCount: number;
  benchmark: number;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  onRemediate?: (studentId: string) => void;
  onExportCsv?: () => void;
}

export const AtRiskTable: React.FC<AtRiskTableProps> = ({
  students,
  totalCount,
  benchmark,
  isLoading,
  error,
  onRetry,
  onRemediate,
  onExportCsv,
}) => {
  if (isLoading) return <SkeletonCard />;

  if (error && students.length === 0) {
    return (
      <Card borderAccent="amber">
        <EmptyState
          icon={ShieldAlert}
          title="Could not load at-risk students"
          description={error ?? 'No data available.'}
          action={<Button variant="outline" size="sm" onClick={onRetry}>Retry</Button>}
        />
      </Card>
    );
  }

  return (
    <Card borderAccent="amber" className="space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-500" />
          <h4 className="text-sm font-extrabold text-[#0B1B43]">At-Risk Students Intervention</h4>
        </div>
        <Badge variant="warning" size="xs">{totalCount} Total</Badge>
      </div>
      <p className="text-xs text-[#405B8B] leading-relaxed">
        Students falling below the {benchmark}% placement benchmark. Proactively assign remediation roadmaps before drive deadlines.
      </p>
      {students.length === 0 ? (
        <EmptyState icon={ShieldAlert} title="No at-risk students" description="Every student in the cohort meets the benchmark." variant="emerald" />
      ) : (
        <div className="space-y-2.5">
          {students.map((stu) => (
            <div key={stu.id} className="p-3 rounded-xl bg-amber-50/40 border border-amber-100 text-xs space-y-1.5">
              <div className="flex items-center justify-between font-bold text-[#0B1B43]">
                <span>{stu.name} ({stu.branch})</span>
                <span className="text-red-600 font-black">{stu.readinessScore}%</span>
              </div>
              <div className="text-[11px] text-[#405B8B]">
                Gaps: {stu.missingCompetencies.join(', ') || '—'}
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-amber-100/80">
                <Badge
                  variant={stu.remediationStatus === 'completed' ? 'success' : stu.remediationStatus === 'assigned' || stu.remediationStatus === 'in_progress' ? 'blue' : 'warning'}
                  size="xs"
                >
                  {stu.remediationStatus === 'pending' ? 'Needs Mentoring' : stu.remediationStatus}
                </Badge>
                {stu.remediationStatus === 'pending' ? (
                  <button
                    onClick={() => onRemediate?.(stu.id)}
                    className="text-[11px] font-bold text-[#087BFA] hover:text-blue-800 hover:underline cursor-pointer transition-colors"
                  >
                    Assign Remediation
                  </button>
                ) : (
                  <span className="text-[10px] font-bold text-emerald-700">✓ Roadmap Sent</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      <Button variant="outline" size="sm" className="w-full text-xs text-[#D97706] border-amber-300 hover:bg-amber-50" onClick={onExportCsv}>
        Export Full At-Risk Cohort (CSV)
      </Button>
    </Card>
  );
};
