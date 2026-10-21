import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell
} from 'recharts';
import { Card } from '../../../components/common/Card';
import type { SkillGapItem } from './chartMappers';

interface TopGapsCardProps {
  topGaps: SkillGapItem[];
}

export const TopGapsCard: React.FC<TopGapsCardProps> = ({ topGaps }) => {
  return (
    <Card className="p-6 border-[#E0E7F2] space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-extrabold text-[#0B1B43]">
            Top Skill Gaps (Sorted by Priority)
          </h3>
          <p className="text-[11px] text-[#405B8B]">
            Gap size = Required - Demonstrated Level (0 - 5 Scale)
          </p>
        </div>
        <span className="text-[10px] font-bold text-amber-600 uppercase">Top 8 Only</span>
      </div>

      <div className="h-64 w-full" aria-label="Top Skill Gaps Bar Chart">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={topGaps}
            layout="vertical"
            margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
          >
            <XAxis type="number" domain={[0, 5]} tick={{ fontSize: 10, fill: '#8FA1C0' }} />
            <YAxis
              type="category"
              dataKey="skill"
              tick={{ fontSize: 11, fill: '#0B1B43', fontWeight: 600 }}
              width={100}
            />
            <Tooltip
              formatter={(val: any, name: any) => [`Level ${val}`, name === 'current' ? 'Demonstrated' : 'Required']}
              contentStyle={{ backgroundColor: '#0B1B43', color: '#fff', borderRadius: '12px', fontSize: '11px' }}
            />
            <Bar dataKey="current" name="Demonstrated" fill="#087BFA" radius={[0, 4, 4, 0]}>
              {topGaps.map((entry) => (
                <Cell
                  key={entry.skill}
                  fill={entry.priority === 'High' ? '#EF4444' : entry.priority === 'Medium' ? '#F59E0B' : '#087BFA'}
                />
              ))}
            </Bar>
            <Bar dataKey="required" name="Benchmark" fill="#E0E7F2" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Text-table fallback (PRD §6) */}
      <details className="text-xs text-[#405B8B] pt-2 border-t border-slate-100 cursor-pointer">
        <summary className="font-semibold hover:text-[#0B1B43] select-none">
          View data table (Accessible Fallback)
        </summary>
        <table className="w-full mt-2 text-left text-[11px] border border-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="p-1.5">Skill</th>
              <th className="p-1.5">Demonstrated</th>
              <th className="p-1.5">Required</th>
              <th className="p-1.5">Priority</th>
            </tr>
          </thead>
          <tbody>
            {topGaps.map((g) => (
              <tr key={g.skill} className="border-t border-slate-100">
                <td className="p-1.5 font-bold text-[#0B1B43]">{g.skill}</td>
                <td className="p-1.5">Lvl {g.current}</td>
                <td className="p-1.5">Lvl {g.required}</td>
                <td className="p-1.5 font-bold">{g.priority}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </Card>
  );
};
