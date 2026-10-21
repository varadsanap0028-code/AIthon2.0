import React from 'react';
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip,
  Legend
} from 'recharts';
import { Card } from '../../../components/common/Card';
import type { CategoryScore } from './chartMappers';

interface SkillRadarCardProps {
  categoryScores: CategoryScore[];
}

export const SkillRadarCard: React.FC<SkillRadarCardProps> = ({ categoryScores }) => {
  return (
    <Card className="p-6 border-[#E0E7F2] space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-extrabold text-[#0B1B43]">
            Competency Radar by Category
          </h3>
          <p className="text-[11px] text-[#405B8B]">
            Current demonstrated vs benchmark requirement (0 - 100%)
          </p>
        </div>
        <span className="text-[10px] font-bold text-slate-400 uppercase">Max 8 Axes</span>
      </div>

      {/* Desktop/Tablet Radar */}
      <div className="h-64 w-full hidden sm:block" aria-label="Skill Radar Chart">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={categoryScores}>
            <PolarGrid stroke="#E0E7F2" />
            <PolarAngleAxis dataKey="category" tick={{ fill: '#0B1B43', fontSize: 11, fontWeight: 600 }} />
            <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#8FA1C0" fontSize={10} />
            <Radar
              name="Demonstrated"
              dataKey="current"
              stroke="#087BFA"
              fill="#087BFA"
              fillOpacity={0.45}
            />
            <Radar
              name="Required"
              dataKey="required"
              stroke="#603DF5"
              fill="#603DF5"
              fillOpacity={0.15}
              strokeDasharray="3 3"
            />
            <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
            <Tooltip
              formatter={(val: any, name: any) => [`${val}%`, name === 'current' ? 'Demonstrated' : 'Required']}
              contentStyle={{ backgroundColor: '#0B1B43', color: '#fff', borderRadius: '12px', fontSize: '11px' }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Mobile Fallback (<400px): Replaced with Category List Bars (PRD §6) */}
      <div className="sm:hidden space-y-3 pt-2" aria-label="Mobile Category Proficiency List">
        {categoryScores.map((cat) => (
          <div key={cat.category} className="space-y-1">
            <div className="flex justify-between text-xs font-bold text-[#0B1B43]">
              <span>{cat.category}</span>
              <span className="text-[#087BFA]">{cat.current}% / {cat.required}%</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden flex">
              <div style={{ width: `${cat.current}%` }} className="bg-[#087BFA] rounded-full" />
            </div>
          </div>
        ))}
      </div>

      {/* Text-table fallback (PRD §6) */}
      <details className="text-xs text-[#405B8B] pt-2 border-t border-slate-100 cursor-pointer">
        <summary className="font-semibold hover:text-[#0B1B43] select-none">
          View data table (Accessible Fallback)
        </summary>
        <table className="w-full mt-2 text-left text-[11px] border border-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="p-1.5">Category</th>
              <th className="p-1.5">Demonstrated</th>
              <th className="p-1.5">Required</th>
            </tr>
          </thead>
          <tbody>
            {categoryScores.map((c) => (
              <tr key={c.category} className="border-t border-slate-100">
                <td className="p-1.5 font-bold text-[#0B1B43]">{c.category}</td>
                <td className="p-1.5">{c.current}%</td>
                <td className="p-1.5">{c.required}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </Card>
  );
};
