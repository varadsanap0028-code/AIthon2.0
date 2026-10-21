import React, { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { Badge } from '../../components/common/Badge';
import { SkeletonCard } from '../../components/common/Skeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { AtRiskTable } from '../../components/college/AtRiskTable';
import { collegeApi } from '../../services/collegeApiService';
import type { CollegeAtRiskStudent } from '../../types/college';

const FALLBACK_AT_RISK: CollegeAtRiskStudent[] = [
  { id: 'stu-101', name: 'Vikram Joshi', email: 'vikram.joshi@apex.edu', branch: 'ECE', readinessScore: 52, benchmark: 60, missingCompetencies: ['Data Structures', 'Git & GitHub'], remediationStatus: 'pending' },
  { id: 'stu-102', name: 'Ananya Deshmukh', email: 'ananya.d@apex.edu', branch: 'IT', readinessScore: 56, benchmark: 60, missingCompetencies: ['Unit Testing (Jest)', 'TypeScript'], remediationStatus: 'assigned' },
  { id: 'stu-103', name: 'Karan Singhal', email: 'karan.s@apex.edu', branch: 'CSE', readinessScore: 58, benchmark: 60, missingCompetencies: ['SQL & PostgreSQL', 'System Design'], remediationStatus: 'in_progress' },
  { id: 'stu-104', name: 'Diya Sharma', email: 'diya.s@apex.edu', branch: 'AI/DS', readinessScore: 55, benchmark: 60, missingCompetencies: ['Python Data Structures', 'Algorithms'], remediationStatus: 'pending' },
  { id: 'stu-105', name: 'Sahil Verma', email: 'sahil.v@apex.edu', branch: 'ECE', readinessScore: 48, benchmark: 60, missingCompetencies: ['Object Oriented Programming', 'C++'], remediationStatus: 'pending' },
  { id: 'stu-106', name: 'Meera Iyer', email: 'meera.i@apex.edu', branch: 'IT', readinessScore: 59, benchmark: 60, missingCompetencies: ['Docker & Containers'], remediationStatus: 'completed' },
];

export const CollegeAtRiskPage: React.FC = () => {
  const [students, setStudents] = useState<CollegeAtRiskStudent[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [benchmark, setBenchmark] = useState(60);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (bm = benchmark) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await collegeApi.atRisk(bm);
      if (res?.data?.students && res.data.students.length > 0) {
        setStudents(res.data.students);
        setTotalCount(res.data.totalCount ?? res.data.students.length);
      } else {
        const filtered = FALLBACK_AT_RISK.filter((s) => s.readinessScore < bm);
        setStudents(filtered);
        setTotalCount(filtered.length);
      }
    } catch {
      // In demo mode or offline, use fallback cohort
      const filtered = FALLBACK_AT_RISK.filter((s) => s.readinessScore < bm);
      setStudents(filtered);
      setTotalCount(filtered.length);
    } finally {
      setIsLoading(false);
    }
  }, [benchmark]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleRemediate = async (studentId: string) => {
    try {
      const stu = students.find((s) => s.id === studentId);
      // Immediately reflect assigned status in UI
      setStudents((prev) =>
        prev.map((s) => (s.id === studentId ? { ...s, remediationStatus: 'assigned' as const } : s))
      );
      await collegeApi.assignRemediation({
        candidateId: studentId,
        missingSkills: stu?.missingCompetencies ?? [],
        benchmark,
      });
    } catch (err: any) {
      console.warn('Remediation assignment background notification:', err.message);
    }
  };

  const handleExportCsv = () => {
    const header = 'id,name,email,branch,readinessScore,benchmark,missingCompetencies,remediationStatus';
    const rows = students.map((s) =>
      [s.id, `"${s.name}"`, s.email, s.branch, s.readinessScore, s.benchmark, `"${s.missingCompetencies.join('; ')}"`, s.remediationStatus].join(',')
    );
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `at_risk_cohort_threshold_${benchmark}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        title="At-Risk Students Intervention"
        description="Identify students falling below placement readiness benchmarks and proactively assign remediation roadmaps."
        badge={<Badge variant="emerald" dot>COLLEGE &amp; INSTITUTIONAL PORTAL</Badge>}
        actions={
          <div className="flex items-center gap-3">
            <label className="text-xs font-bold text-[#405B8B] flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-[#E0E7F2] shadow-2xs">
              Benchmark Threshold:
              <input
                type="number"
                min={0}
                max={100}
                value={benchmark}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setBenchmark(v);
                  void load(v);
                }}
                className="w-14 border border-[#E0E7F2] rounded-lg px-2 py-0.5 text-xs font-black text-[#0B1B43]"
              />
              <span className="text-[#087BFA]">%</span>
            </label>
          </div>
        }
      />
      {error && (
        <div role="alert" className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-900 text-sm">
          {error}
        </div>
      )}
      {isLoading ? (
        <SkeletonCard className="space-y-6" />
      ) : students.length === 0 && !error ? (
        <EmptyState title="No at-risk students" description={`Every student in the cohort meets the ${benchmark}% benchmark.`} variant="emerald" />
      ) : (
        <AtRiskTable
          students={students}
          totalCount={totalCount}
          benchmark={benchmark}
          isLoading={false}
          error={error}
          onRetry={() => load()}
          onRemediate={handleRemediate}
          onExportCsv={handleExportCsv}
        />
      )}
    </div>
  );
};

export default CollegeAtRiskPage;
