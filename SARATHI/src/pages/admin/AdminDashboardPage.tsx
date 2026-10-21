import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { useUrlState, Skeleton } from '../../components/admin';
import { adminApi, type OverviewAnalyticsResponse } from '../../services/adminApi';
import { DashboardHeader } from './dashboard/DashboardHeader';
import { OverviewKpiCards } from './dashboard/OverviewKpiCards';
import { SignupsChart } from './dashboard/SignupsChart';
import { TestsActivityChart } from './dashboard/TestsActivityChart';
import { FunnelCard } from './dashboard/FunnelCard';
import { RoleMixCard } from './dashboard/RoleMixCard';
import { ScoreDistributionCard } from './dashboard/ScoreDistributionCard';
import { AttentionCard } from './dashboard/AttentionCard';

export const AdminDashboardPage: React.FC = () => {
  const { getParam, setParam } = useUrlState({ range: '7d' });
  const rawRange = getParam('range');
  const range: '7d' | '30d' | '90d' =
    rawRange === '30d' || rawRange === '90d' ? rawRange : '7d';

  const [data, setData] = useState<OverviewAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
  const [, setTick] = useState(0);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Fetch metrics function
  const fetchMetrics = useCallback(
    async (fresh = false) => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      if (!data) {
        setLoading(true);
      } else {
        setIsRefreshing(true);
      }
      setError(null);

      try {
        const response = await adminApi.getOverviewAnalytics(range, fresh, controller.signal);
        setData(response);
        setLastRefreshedAt(new Date());
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          setError(err?.message || 'Unable to load platform analytics. Please try again.');
        }
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    },
    [range, data]
  );

  // Handle range change
  const handleRangeChange = (newRange: '7d' | '30d' | '90d') => {
    if (newRange !== range) {
      setParam('range', newRange);
    }
  };

  // Re-fetch when range changes
  useEffect(() => {
    fetchMetrics(false);
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [range]);

  // Polling every 60s, paused when tab is hidden
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState !== 'hidden') {
        fetchMetrics(false);
      }
    }, 60000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchMetrics(false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchMetrics]);

  // Update relative timestamp every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setTick((prev) => prev + 1);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto">
      {/* Header */}
      <DashboardHeader
        range={range}
        onRangeChange={handleRangeChange}
        lastRefreshedAt={lastRefreshedAt}
        isRefreshing={isRefreshing || loading}
        onRefresh={() => fetchMetrics(true)}
      />

      {/* Error state alert */}
      {error && (
        <div className="bg-[#FEF2F2] border border-[#FEE2E2] rounded-[8px] p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertCircle size={18} className="text-[#DC2626] shrink-0" />
            <p className="text-[13px] text-[#991B1B] font-medium">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => fetchMetrics(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-white bg-[#DC2626] hover:bg-[#B91C1C] rounded-[6px] transition-colors shrink-0"
          >
            <RefreshCw size={12} />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* Loading Skeletons */}
      {loading && !data ? (
        <div className="space-y-6">
          <OverviewKpiCards kpis={null} loading={true} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white border border-[#E5E7EB] rounded-[8px] p-5 h-80 flex flex-col justify-between">
              <Skeleton width="40%" height={20} />
              <Skeleton width="100%" height={200} />
            </div>
            <div className="bg-white border border-[#E5E7EB] rounded-[8px] p-5 h-80 flex flex-col justify-between">
              <Skeleton width="40%" height={20} />
              <Skeleton width="100%" height={200} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border border-[#E5E7EB] rounded-[8px] p-5 h-80 flex flex-col justify-between">
              <Skeleton width="50%" height={20} />
              <Skeleton width="100%" height={200} />
            </div>
            <div className="bg-white border border-[#E5E7EB] rounded-[8px] p-5 h-80 flex flex-col justify-between">
              <Skeleton width="50%" height={20} />
              <Skeleton width="100%" height={200} />
            </div>
            <div className="bg-white border border-[#E5E7EB] rounded-[8px] p-5 h-80 flex flex-col justify-between">
              <Skeleton width="50%" height={20} />
              <Skeleton width="100%" height={200} />
            </div>
          </div>
        </div>
      ) : data ? (
        <>
          {/* Row 1: 4 StatCards */}
          <OverviewKpiCards kpis={data.kpis} loading={false} />

          {/* Row 2: 2 ChartCards (Area stack + Bar activity) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SignupsChart data={data.series.signupsByRole} />
            <TestsActivityChart data={data.series.tests} />
          </div>

          {/* Row 3: 3 ChartCards (Funnel + Role mix donut + Score distribution) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FunnelCard funnel={data.funnel} />
            <RoleMixCard roleMix={data.roleMix} />
            <ScoreDistributionCard scoreDistribution={data.scoreDistribution} />
          </div>

          {/* Row 4: Needs your attention */}
          <AttentionCard attention={data.attention} />
        </>
      ) : null}
    </div>
  );
};

export default AdminDashboardPage;
