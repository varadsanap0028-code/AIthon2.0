import React from 'react';
import { StatCard, Skeleton } from '../../../components/admin';
import type { OverviewAnalyticsResponse } from '../../../services/adminApi';

export interface OverviewKpiCardsProps {
  kpis: OverviewAnalyticsResponse['kpis'] | null;
  loading: boolean;
}

export const OverviewKpiCards: React.FC<OverviewKpiCardsProps> = ({ kpis, loading }) => {
  if (loading && !kpis) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white border border-[#E5E7EB] rounded-[8px] p-5 h-[116px] flex flex-col justify-between">
            <Skeleton width="50%" height={16} />
            <div className="flex items-baseline justify-between mt-3">
              <Skeleton width="40%" height={28} />
              <Skeleton width="25%" height={16} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!kpis) return null;

  const formatDelta = (deltaPct: number | null): { value: string; positive: boolean } | undefined => {
    if (deltaPct === null || deltaPct === undefined) {
      return { value: '0%', positive: true };
    }
    const prefix = deltaPct > 0 ? '+' : '';
    return {
      value: `${prefix}${deltaPct}%`,
      positive: deltaPct >= 0,
    };
  };

  const newUsersDelta = kpis.newUsers.value;
  const newUsersChange = {
    value: `+${newUsersDelta.toLocaleString()} new`,
    positive: newUsersDelta >= 0,
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        label="Total People"
        value={kpis.totalUsers.value.toLocaleString()}
        change={newUsersChange}
        calculationInfo="Total registered accounts across all roles; delta shows new accounts registered in this period."
      />
      <StatCard
        label="Active Students"
        value={kpis.activeStudents.value.toLocaleString()}
        change={formatDelta(kpis.activeStudents.deltaPct)}
        calculationInfo="Students who logged in, completed a test, or submitted a job application within this period compared to the previous period."
      />
      <StatCard
        label="Active Recruiters"
        value={kpis.activeRecruiters.value.toLocaleString()}
        change={formatDelta(kpis.activeRecruiters.deltaPct)}
        calculationInfo="Recruiters who logged in, posted a job opening, or managed candidates within this period compared to the previous period."
      />
      <StatCard
        label="Test Pass Rate"
        value={`${kpis.testPassRate.value}%`}
        change={formatDelta(kpis.testPassRate.deltaPct)}
        calculationInfo="Percentage of completed assessment sessions scoring 70% or higher within this period compared to the previous period."
      />
    </div>
  );
};

export default OverviewKpiCards;
