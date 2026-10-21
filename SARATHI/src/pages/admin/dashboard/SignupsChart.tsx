import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { Download } from 'lucide-react';
import { ChartCard, downloadCsv } from '../../../components/admin';
import type { OverviewAnalyticsResponse } from '../../../services/adminApi';

export interface SignupsChartProps {
  data: OverviewAnalyticsResponse['series']['signupsByRole'];
}

export const SignupsChart: React.FC<SignupsChartProps> = ({ data }) => {
  const handleExportCsv = () => {
    downloadCsv('signups_by_role.csv', data, ['date', 'student', 'recruiter', 'college', 'reviewer']);
  };

  const action = (
    <button
      type="button"
      onClick={handleExportCsv}
      title="Export signups data to CSV"
      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[12px] font-medium text-[#4B5563] bg-white border border-[#E5E7EB] rounded-[6px] hover:bg-[#F9FAFB] hover:text-[#111827] transition-colors focus:outline-hidden"
    >
      <Download size={13} />
      <span>CSV</span>
    </button>
  );

  const formatDateTick = (tick: string): string => {
    if (!tick) return '';
    // Format YYYY-MM-DD to "MMM D"
    const parts = tick.split('-');
    if (parts.length === 3) {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthIndex = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      return `${monthNames[monthIndex] || parts[1]} ${day}`;
    }
    return tick;
  };

  return (
    <ChartCard
      title="New people by role"
      subtitle="Daily user registrations stacked by role"
      action={action}
    >
      <div className="h-64 w-full">
        {data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-[13px] text-[#6B7280]">
            No signup activity recorded for this period.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={formatDateTick}
                tick={{ fontSize: 11, fill: '#6B7280' }}
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
                labelFormatter={(label) => `Date: ${formatDateTick(String(label))}`}
              />
              <Legend
                wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                iconType="circle"
                iconSize={8}
              />
              <Area
                type="monotone"
                dataKey="student"
                name="Students"
                stackId="1"
                stroke="#4F46E5"
                fill="#4F46E5"
                fillOpacity={0.8}
              />
              <Area
                type="monotone"
                dataKey="recruiter"
                name="Recruiters"
                stackId="1"
                stroke="#059669"
                fill="#059669"
                fillOpacity={0.7}
              />
              <Area
                type="monotone"
                dataKey="college"
                name="Colleges"
                stackId="1"
                stroke="#D97706"
                fill="#D97706"
                fillOpacity={0.6}
              />
              <Area
                type="monotone"
                dataKey="reviewer"
                name="Reviewers"
                stackId="1"
                stroke="#7C3AED"
                fill="#7C3AED"
                fillOpacity={0.5}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </ChartCard>
  );
};

export default SignupsChart;
