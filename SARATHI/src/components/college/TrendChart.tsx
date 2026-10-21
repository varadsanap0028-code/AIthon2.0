import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Card } from '../common/Card';
import { SkeletonCard } from '../common/Skeleton';
import type { CollegeReadinessTrendPoint } from '../../types/college';

interface TrendChartProps {
  trend: CollegeReadinessTrendPoint[];
  isLoading: boolean;
  showTable: boolean;
  onToggleTable: () => void;
}

export const TrendChart: React.FC<TrendChartProps> = ({ trend, isLoading, showTable, onToggleTable }) => {
  if (isLoading) return <SkeletonCard />;

  const data = trend.map((t) => ({ month: t.period, avgScore: t.score }));

  return (
    <Card className="flex flex-col justify-between">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
        <div>
          <h3 className="text-base sm:text-lg font-extrabold text-[#0B1B43]">Batch Benchmark Trends</h3>
          <p className="text-xs text-[#405B8B]">6-month readiness growth vs baseline</p>
        </div>
        <button onClick={onToggleTable} aria-pressed={showTable} className="text-xs font-bold text-[#087BFA] hover:underline cursor-pointer">
          {showTable ? 'Show chart' : 'Show data table'}
        </button>
      </div>
      {showTable ? (
        <table className="w-full text-xs" aria-label="Readiness trend data table">
          <thead>
            <tr className="text-left text-slate-400 uppercase text-[10px]">
              <th className="py-2 pr-2">Period</th>
              <th className="py-2">Avg score</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.month} className="border-t border-slate-100">
                <td className="py-2 pr-2 font-semibold text-[#0B1B43]">{row.month}</td>
                <td className="py-2 text-[#405B8B]">{row.avgScore}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E0E7F2" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#405B8B' }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#405B8B' }} />
              <Tooltip />
              <Line type="monotone" dataKey="avgScore" stroke="#087BFA" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
};
