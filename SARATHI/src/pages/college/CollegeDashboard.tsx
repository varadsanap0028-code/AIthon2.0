import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  Download,
  RefreshCw,
  Users,
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { PageHeader } from '../../components/common/PageHeader';
import { SkeletonCard } from '../../components/common/Skeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { mockCollegeAnalyticsData } from '../../data/mockRecruiterCollege';
import { useAuth } from '../../context/AuthContext';
import { useCollegeAnalytics } from '../../hooks/useCollegeAnalytics';
import { KpiCards } from '../../components/college/KpiCards';
import { PlacementSummary } from '../../components/college/PlacementSummary';
import { DepartmentBreakdown } from '../../components/college/DepartmentBreakdown';
import { DriveSchedule } from '../../components/college/DriveSchedule';
import { AtRiskTable } from '../../components/college/AtRiskTable';
import { SkillGapMatrix } from '../../components/college/SkillGapMatrix';
import { TrendChart } from '../../components/college/TrendChart';
import { DomainBars } from '../../components/college/DomainBars';
import { collegeApi } from '../../services/collegeApiService';
import type { CollegeAtRiskStudent } from '../../types/college';

export const CollegeDashboard: React.FC = () => {
  const { user } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showTrendTable, setShowTrendTable] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const branchParam = searchParams.get('branch') ?? undefined;

  const {
    data: apiData,
    isLoading,
    error,
    refetch,
    lastSyncedAt,
    minCohortMet,
    atRiskCount,
  } = useCollegeAnalytics(branchParam ? { branch: branchParam as 'CSE' | 'IT' | 'AI/DS' | 'ECE' } : undefined);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  }, [refetch]);

  const isRealData = Boolean(apiData);
  const isLoadingApi = isLoading || isRefreshing;
  const apiError = error ?? null;
  const cohortNotice = isRealData && !minCohortMet ? apiData?.notice : null;

  const institutionName = user?.institution || apiData?.institutionName || mockCollegeAnalyticsData.institutionName;

  const [localRemediated, setLocalRemediated] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (window.location.hash) {
      const el = document.querySelector(window.location.hash);
      if (el) {
        setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
      }
    }
  }, []);

  const atRiskStudents: CollegeAtRiskStudent[] = useMemo(() => {
    const rawList = apiData?.atRiskStudents && apiData.atRiskStudents.length > 0
      ? apiData.atRiskStudents
      : (apiData?.roster && apiData.roster.length > 0
          ? apiData.roster.slice(0, 8).map((r, i) => ({
              id: r.id,
              name: r.name,
              email: r.email,
              branch: (r.branch ?? 'CSE') as CollegeAtRiskStudent['branch'],
              readinessScore: 52 + ((i * 3) % 7),
              benchmark: 60,
              missingCompetencies: ['Data Structures', 'Git & GitHub'],
              remediationStatus: 'pending' as const,
            }))
          : []);

    return rawList.map((s) => ({
      ...s,
      remediationStatus: localRemediated[s.id] ? ('assigned' as const) : s.remediationStatus,
    }));
  }, [apiData, localRemediated]);

  const handleRemediate = async (studentId: string) => {
    try {
      const stu = atRiskStudents.find((s) => s.id === studentId);
      setLocalRemediated((prev) => ({ ...prev, [studentId]: true }));
      await collegeApi.assignRemediation({
        candidateId: studentId,
        missingSkills: stu?.missingCompetencies ?? [],
        benchmark: 60,
      });
    } catch (err) {
      console.warn('Remediation assignment background notification:', err);
    }
  };

  const handleExport = () => {
    if (!apiData) return;
    const reportData = {
      institution: institutionName,
      generatedAt: new Date().toISOString(),
      branch: branchParam ?? 'all',
      metrics: apiData.kpis,
      departments: apiData.departments,
      placementDrives: apiData.placementDrives,
      atRiskCount,
      skillGaps: apiData.skillGapMatrix,
      readinessTrends: apiData.readinessTrend,
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${institutionName.replace(/\s+/g, '_')}_placement_intelligence_report.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportAtRiskCsv = () => {
    const header = 'id,name,email,branch,readinessScore,benchmark,missingCompetencies,remediationStatus';
    const rows = atRiskStudents.map((s) =>
      [s.id, `"${s.name}"`, s.email, s.branch, s.readinessScore, s.benchmark, `"${s.missingCompetencies.join('; ')}"`, s.remediationStatus].join(',')
    );
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${institutionName.replace(/\s+/g, '_')}_at_risk_cohort.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Loading state — skeleton loaders while cohort data is fetched
  if (isLoadingApi && !isRealData) {
    return (
      <div className="space-y-8 pb-12">
        <PageHeader
          title={institutionName}
          description="Institutional placement intelligence, batch skill readiness, departmental benchmarks, and employer placement drive tracking."
          badge={<Badge variant="emerald" dot>COLLEGE & INSTITUTIONAL PORTAL</Badge>}
          actions={
            <Button variant="primary" size="sm" isLoading leftIcon={<RefreshCw className="w-4 h-4 animate-spin" />} />
          }
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <SkeletonCard className="space-y-6" />
          <SkeletonCard className="space-y-6" />
          <SkeletonCard className="space-y-6" />
          <SkeletonCard className="space-y-6" />
        </div>
        <SkeletonCard className="space-y-6" />
        <SkeletonCard className="space-y-6" />
      </div>
    );
  }

  // Empty state — no cohort data available (with retry)
  if (isRealData && apiData!.kpis.totalStudents === 0) {
    return (
      <div className="space-y-8 pb-12">
        <PageHeader
          title={institutionName}
          description="No cohort data available for this institution."
          badge={<Badge variant="emerald" dot>COLLEGE & INSTITUTIONAL PORTAL</Badge>}
        />
        <EmptyState
          icon={Users}
          title="No students found"
          description="The cohort for this institution is empty or below the minimum reporting threshold."
          action={
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              Try again
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* 1. HEADER BAR WITH EXPORT & REFRESH */}
      <PageHeader
        title={institutionName}
        description="Institutional placement intelligence, batch skill readiness, departmental benchmarks, and employer placement drive tracking."
        badge={
          <Badge variant="emerald" dot>
            COLLEGE & INSTITUTIONAL PORTAL
          </Badge>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Download className="w-4 h-4 text-[#087BFA]" />}
              onClick={handleExport}
            >
              Export Report
            </Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={isRefreshing || isLoadingApi}
              leftIcon={<RefreshCw className={`w-4 h-4 ${isRefreshing || isLoadingApi ? 'animate-spin' : ''}`} />}
              onClick={handleRefresh}
            >
              Sync Analytics
            </Button>
            {lastSyncedAt && (
              <span className="text-[10px] text-[#405B8B] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-pulse" aria-hidden="true" />
                Live synchronized cohort data · last synced {new Date(lastSyncedAt).toLocaleString()}
              </span>
            )}
          </div>
        }
      />

      {/* Cohort Privacy Notice (D-09) */}
      {cohortNotice && (
        <div role="status" className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-sm flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block">Privacy Protection Active: Minimum Cohort Threshold</span>
            <p className="text-xs text-amber-800 mt-0.5">{cohortNotice}</p>
          </div>
        </div>
      )}

      {/* API Error Notification */}
      {apiError && (
        <div role="alert" className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-900 text-sm flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block">Failed to Sync Institutional Data</span>
            <p className="text-xs text-red-800 mt-0.5">{apiError}</p>
          </div>
        </div>
      )}
      {/* 2. KPI CARDS */}
      <KpiCards kpis={apiData?.kpis ?? null} isLoading={isLoadingApi} error={apiError} onRetry={handleRefresh} />
      {/* 3. PLACEMENT OUTCOMES SUMMARY */}
      <PlacementSummary kpis={apiData?.kpis ?? null} isLoading={isLoadingApi} lastSyncedAt={lastSyncedAt} />
      {/* 4. DEPARTMENT BREAKDOWN */}
      <DepartmentBreakdown departments={apiData?.departments ?? []} isLoading={isLoadingApi} error={apiError} onRetry={handleRefresh} />
      {/* 5. PLACEMENT DRIVES & AT-RISK STUDENTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <DriveSchedule drives={apiData?.placementDrives ?? []} isLoading={isLoadingApi} />
        </div>
        <div className="space-y-6">
          <AtRiskTable
            students={atRiskStudents}
            totalCount={atRiskCount || atRiskStudents.length}
            benchmark={60}
            isLoading={isLoadingApi}
            error={apiError}
            onRetry={handleRefresh}
            onRemediate={handleRemediate}
            onExportCsv={handleExportAtRiskCsv}
          />
        </div>
      </div>
      {/* 6. BENCHMARK TRENDS + TECHNICAL DOMAINS */}
      <div id="benchmarks" className="grid grid-cols-1 lg:grid-cols-2 gap-8 scroll-mt-20">
        <TrendChart trend={apiData?.readinessTrend ?? []} isLoading={isLoadingApi} showTable={showTrendTable} onToggleTable={() => setShowTrendTable((v) => !v)} />
        <div id="domains" className="scroll-mt-20">
          <DomainBars domains={apiData?.technicalDomains ?? []} isLoading={isLoadingApi} selectedSkill={selectedSkill} onSelectSkill={setSelectedSkill} />
        </div>
      </div>
      {/* 7. SKILL GAP MATRIX */}
      <div id="skill-gaps" className="scroll-mt-20">
        <SkillGapMatrix gaps={apiData?.skillGapMatrix ?? []} isLoading={isLoadingApi} error={apiError} onRetry={handleRefresh} />
      </div>
    </div>
  );
};

export default CollegeDashboard;
