import React from 'react';
import { Target } from 'lucide-react';
import type { SkillGapItem } from './reportUtils';

interface ReportSkillGapsProps {
  skillList: SkillGapItem[];
  activeRoleTitle: string;
}

export const ReportSkillGaps: React.FC<ReportSkillGapsProps> = ({ skillList, activeRoleTitle }) => {
  return (
    <div className="bg-white border border-[#E0E7F2] rounded-2xl p-6 sm:p-8 shadow-[var(--shadow-card)] space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E0E7F2]">
        <div>
          <h2 className="text-lg font-bold text-[#0B1B43] flex items-center gap-2">
            <Target className="w-5 h-5 text-[#4F46E5]" />
            Skill Gap Analytics &amp; Role Benchmark Comparison
          </h2>
          <p className="text-xs text-[#405B8B] mt-1">
            Comparing your demonstrated assessment scores against required benchmarks for{' '}
            <strong className="text-[#0B1B43]">{activeRoleTitle}</strong>.
          </p>
        </div>
      </div>

      {/* Accessible Horizontal Bar Chart */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between text-xs text-[#405B8B] font-semibold uppercase tracking-wider px-1">
          <span>Evaluated Skill</span>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#4F46E5] inline-block" /> Your Score
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#CAD5E8] inline-block" /> Target Benchmark
            </span>
          </div>
        </div>

        <div className="space-y-3.5" role="region" aria-label="Skill Competency Horizontal Bar Chart">
          {skillList.map((skill) => {
            const benchmarkScore = Math.min(100, Math.max(20, skill.targetLevel * 20));
            return (
              <div key={skill.skillName} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#0B1B43]">
                    {skill.skillName}
                    <span className="ml-2 text-[10px] text-[#405B8B] font-normal">({skill.category})</span>
                  </span>
                  <span className="font-mono text-xs font-bold text-[#0B1B43]">
                    {skill.score}%{' '}
                    <span className="text-[11px] font-normal text-[#405B8B]">/ Benchmark {benchmarkScore}%</span>
                  </span>
                </div>

                <div className="relative w-full h-3 bg-[#EEF2F6] rounded-full overflow-hidden">
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-[#8FA1C0] z-10"
                    style={{ left: `${benchmarkScore}%` }}
                    title={`Benchmark Target: ${benchmarkScore}% (Level ${skill.targetLevel})`}
                  />
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      skill.score >= benchmarkScore
                        ? 'bg-[#16A34A]'
                        : skill.score >= 50
                        ? 'bg-[#4F46E5]'
                        : 'bg-[#D97706]'
                    }`}
                    style={{ width: `${Math.max(2, Math.min(100, skill.score))}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detailed Skill Table */}
      <div className="overflow-x-auto pt-4">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-[#E0E7F2] text-[#405B8B] uppercase tracking-wider text-[11px]">
              <th className="py-2.5 px-3 font-semibold">Skill &amp; Category</th>
              <th className="py-2.5 px-3 font-semibold text-center">Assessed Score</th>
              <th className="py-2.5 px-3 font-semibold text-center">Demonstrated</th>
              <th className="py-2.5 px-3 font-semibold text-center">Role Benchmark</th>
              <th className="py-2.5 px-3 font-semibold text-center">Gap Status</th>
              <th className="py-2.5 px-3 font-semibold">Recommended Next Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E0E7F2]">
            {skillList.map((skill) => (
              <tr key={skill.skillName} className="hover:bg-[#F4F7FC] transition-colors">
                <td className="py-3 px-3">
                  <div className="font-semibold text-[#0B1B43]">{skill.skillName}</div>
                  <div className="text-[10px] text-[#405B8B]">{skill.category}</div>
                </td>
                <td className="py-3 px-3 text-center font-mono font-bold text-[#0B1B43]">
                  {skill.score}%
                </td>
                <td className="py-3 px-3 text-center">
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#EEF2FF] text-[#4F46E5] border border-indigo-200">
                    Level {skill.level} ({skill.levelLabel})
                  </span>
                </td>
                <td className="py-3 px-3 text-center">
                  <span className="text-[#405B8B] font-medium">Level {skill.targetLevel}</span>
                </td>
                <td className="py-3 px-3 text-center">
                  {skill.gap >= 0 ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Benchmark Met
                    </span>
                  ) : skill.gap === -1 ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                      -1 Level Gap
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                      {skill.gap} Levels Gap
                    </span>
                  )}
                </td>
                <td className="py-3 px-3 text-[#405B8B] font-medium">{skill.nextAction}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
