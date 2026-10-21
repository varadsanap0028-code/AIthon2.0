import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { Download } from 'lucide-react';
import { ChartCard, downloadCsv } from '../../../components/admin';
import type { OverviewAnalyticsResponse } from '../../../services/adminApi';

export interface ScoreDistributionCardProps {
  scoreDistribution: OverviewAnalyticsResponse['scoreDistribution'];
}

export const ScoreDistributionCard: React.FC<ScoreDistributionCardProps> = ({ scoreDistribution }) => {
  const handleExportCsv = () => {
    downloadCsv('score_distribution.csv', scoreDistribution, ['bucket', 'count']);
  };

  const action = (
    <button
      type="button"
      onClick={handleExportCsv}
      title="Export score distribution data to CSV"
      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[12px] font-medium text-[#4B5563] bg-white border border-[#E5E7EB] rounded-[6px] hover:bg-[#F9FAFB] hover:text-[#111827] transition-colors focus:outline-hidden"
    >
      <Download size={13} />
      <span>CSV</span>
    </button>
  );

  const totalScores = scoreDistribution.reduce((acc, curr) => acc + curr.count, 0);

  return (
    <ChartCard
      title="Score Distribution"
      subtitle="Completed test score histogram across 10-point buckets"
      action={action}
    >
      <div className="h-64 w-full">
        {scoreDistribution.length === 0 || totalScores === 0 ? (
          <div className="h-full flex items-center justify-center text-[13px] text-[#6B7280]">
            No test scores recorded for this period.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={scoreDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
              <XAxis
                dataKey="bucket"
                tick={{ fontSize: 10, fill: '#6B7280' }}
                axisLine={{ stroke: '#E5E7EB' }}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: '#6B7280' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  borderColor: '#E5E7EB',
                  borderRadius: 6,
                  fontSize: 12,
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                }}
                formatter={(val) => [`${val} sessions`, 'Score Bucket']}
                labelFormatter={(lbl) => `Score range: ${lbl}%`}
              />
              <Bar dataKey="count" name="Sessions" fill="#4F46E5" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </ChartCard>
  );
};

export default ScoreDistributionCard;
