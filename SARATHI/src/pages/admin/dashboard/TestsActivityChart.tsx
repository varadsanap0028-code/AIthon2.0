import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { Download } from 'lucide-react';
import { ChartCard, downloadCsv } from '../../../components/admin';
import type { OverviewAnalyticsResponse } from '../../../services/adminApi';

export interface TestsActivityChartProps {
  data: OverviewAnalyticsResponse['series']['tests'];
}

export const TestsActivityChart: React.FC<TestsActivityChartProps> = ({ data }) => {
  const handleExportCsv = () => {
    downloadCsv('tests_activity.csv', data, ['date', 'started', 'completed', 'passed']);
  };

  const action = (
    <button
      type="button"
      onClick={handleExportCsv}
      title="Export test activity data to CSV"
      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[12px] font-medium text-[#4B5563] bg-white border border-[#E5E7EB] rounded-[6px] hover:bg-[#F9FAFB] hover:text-[#111827] transition-colors focus:outline-hidden"
    >
      <Download size={13} />
      <span>CSV</span>
    </button>
  );

  const formatDateTick = (tick: string): string => {
    if (!tick) return '';
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
      title="Tests: started vs completed"
      subtitle="Daily test sessions started, completed, and passed (>=70%)"
      action={action}
    >
      <div className="h-64 w-full">
        {data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-[13px] text-[#6B7280]">
            No test sessions recorded for this period.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
              <Bar dataKey="started" name="Started" fill="#94A3B8" radius={[2, 2, 0, 0]} />
              <Bar dataKey="completed" name="Completed" fill="#4F46E5" radius={[2, 2, 0, 0]} />
              <Bar dataKey="passed" name="Passed" fill="#16A34A" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </ChartCard>
  );
};

export default TestsActivityChart;
