import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts';
import { Card } from '../common/Card';
import { SkeletonCard } from '../common/Skeleton';
import type { CollegeTechnicalDomain } from '../../types/college';

interface DomainBarsProps {
  domains: CollegeTechnicalDomain[];
  isLoading: boolean;
  selectedSkill: string | null;
  onSelectSkill: (skill: string | null) => void;
}

const BAR_COLORS = ['#087BFA', '#603DF5', '#16A34A', '#D97706', '#4F46E5'];

export const DomainBars: React.FC<DomainBarsProps> = ({ domains, isLoading, selectedSkill, onSelectSkill }) => {
  if (isLoading) return <SkeletonCard />;

  const data = domains.slice(0, 8).map((d) => ({ skill: d.skill, avgScore: d.cohortAvg, benchmark: d.benchmark }));
  const detail = selectedSkill ? domains.find((d) => d.skill === selectedSkill) : null;

  return (
    <Card className="flex flex-col justify-between">
      <div className="border-b border-slate-100 pb-4 mb-4">
        <h3 className="text-base sm:text-lg font-extrabold text-[#0B1B43]">Technical Domains</h3>
        <p className="text-xs text-[#405B8B]">Top assessed skills: cohort avg vs benchmark. Click a bar for detail.</p>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }} onClick={(s: any) => {
            const label = s?.activeLabel as string | undefined;
            onSelectSkill(label && label !== selectedSkill ? label : null);
          }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E0E7F2" />
            <XAxis dataKey="skill" tick={{ fontSize: 10, fill: '#405B8B' }} interval={0} angle={-18} height={60} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#405B8B' }} />
            <Tooltip />
            <Bar dataKey="avgScore" radius={[6, 6, 0, 0]}>
              {data.map((entry, i) => (
                <Cell key={entry.skill} fill={BAR_COLORS[i % BAR_COLORS.length]} opacity={!selectedSkill || selectedSkill === entry.skill ? 1 : 0.35} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="pt-3 border-t border-[#E0E7F2] text-xs text-[#405B8B]">
        {detail ? (
          <span>
            <strong className="text-[#0B1B43]">{detail.skill}</strong>: cohort {detail.cohortAvg}% vs benchmark {detail.benchmark}% · {detail.studentCount} students assessed.
            <button onClick={() => onSelectSkill(null)} className="ml-2 font-bold text-[#087BFA] hover:underline cursor-pointer">Clear</button>
          </span>
        ) : (
          <span>Strongest: {data[0]?.skill ?? '—'} ({data[0]?.avgScore ?? 0}%) · Target Benchmark: 70%+</span>
        )}
      </div>
    </Card>
  );
};
