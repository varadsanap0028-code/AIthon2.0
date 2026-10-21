import React, { useState, useMemo } from 'react';
import { Filter, RotateCcw, Table as TableIcon } from 'lucide-react';
import { Card } from '../../../components/common/Card';
import { Badge } from '../../../components/common/Badge';
import { Button } from '../../../components/common/Button';
import type { SkillGapItem } from './chartMappers';

interface SkillGapsTableCardProps {
  topGaps: SkillGapItem[];
  onNavigate: (path: string) => void;
}

export const SkillGapsTableCard: React.FC<SkillGapsTableCardProps> = ({
  topGaps,
  onNavigate,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const categories = useMemo(() => {
    const set = new Set<string>();
    topGaps.forEach((g) => {
      if (g.category) set.add(g.category);
    });
    return ['All', ...Array.from(set)];
  }, [topGaps]);

  const filteredGaps = useMemo(() => {
    return topGaps.filter((g) => {
      return selectedCategory === 'All' || g.category === selectedCategory;
    });
  }, [topGaps, selectedCategory]);

  return (
    <Card className="p-6 border-[#E0E7F2] space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2">
          <TableIcon className="w-4 h-4 text-[#087BFA]" />
          <h3 className="text-sm font-extrabold text-[#0B1B43]">
            Required Competencies & Gap Details
          </h3>
          <Badge variant="blue">{filteredGaps.length} Skills</Badge>
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-[#405B8B]" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs font-bold text-[#0B1B43] bg-slate-50 border border-[#E0E7F2] rounded-xl px-2.5 py-1.5 outline-none focus:border-[#087BFA]"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat === 'All' ? 'All Categories' : cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-[#0B1B43]">
          <thead>
            <tr className="border-b border-slate-200 text-[11px] text-[#405B8B] font-bold uppercase tracking-wider">
              <th className="py-2.5 px-3">Competency</th>
              <th className="py-2.5 px-3">Category</th>
              <th className="py-2.5 px-3">Demonstrated</th>
              <th className="py-2.5 px-3">Benchmark</th>
              <th className="py-2.5 px-3">Priority</th>
              <th className="py-2.5 px-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredGaps.map((gap) => (
              <tr key={gap.skill} className="hover:bg-slate-50/60 transition-colors">
                <td className="py-3 px-3 font-bold">{gap.skill}</td>
                <td className="py-3 px-3 text-[#405B8B]">{gap.category}</td>
                <td className="py-3 px-3">
                  <span className="font-bold text-[#087BFA]">Level {gap.current}/5</span>
                </td>
                <td className="py-3 px-3">
                  <span className="font-bold text-slate-700">Level {gap.required}/5</span>
                </td>
                <td className="py-3 px-3">
                  <Badge
                    variant={
                      gap.priority === 'High'
                        ? 'danger'
                        : gap.priority === 'Medium'
                        ? 'warning'
                        : 'success'
                    }
                  >
                    {gap.priority}
                  </Badge>
                </td>
                <td className="py-3 px-3 text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onNavigate('/student/assessment')}
                    leftIcon={<RotateCcw className="w-3 h-3 text-[#087BFA]" />}
                  >
                    Retake
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};
