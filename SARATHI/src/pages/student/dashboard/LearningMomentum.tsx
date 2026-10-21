import React from 'react';
import {
  Flame,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import { Card } from '../../../components/common/Card';
import { Badge } from '../../../components/common/Badge';
import { Button } from '../../../components/common/Button';
import { ProgressBar } from '../../../components/common/ProgressBar';
import type { ActivityWeek, RoadmapStageItem } from './chartMappers';

interface LearningMomentumProps {
  activity: {
    weeks: ActivityWeek[];
    totalTasks: number;
    totalHours: number;
  };
  streakDays: number;
  roadmapStages: RoadmapStageItem[];
  onNavigate: (path: string) => void;
}

export const LearningMomentum: React.FC<LearningMomentumProps> = ({
  activity,
  streakDays,
  roadmapStages,
  onNavigate,
}) => {
  return (
    <div className="space-y-6">
      {/* SECTION HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-[#0B1B43] flex items-center gap-2">
            <span>Learning Momentum & Execution</span>
            <Badge variant="purple">Visuals 5 & 6</Badge>
          </h2>
          <p className="text-xs text-[#405B8B] mt-0.5">
            {streakDays > 0
              ? `Active streak of ${streakDays} days with ${activity.totalTasks} completed learning tasks over the last 12 weeks.`
              : 'No active learning streak yet. Complete roadmap milestones or diagnostic tasks to build your streak.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />
            <span>{streakDays > 0 ? `${streakDays} Day Learning Streak` : 'Start Your Streak'}</span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* VISUAL 5: ACTIVITY HEATMAP / WEEKLY MATRIX (12 WEEKS) */}
        <Card className="p-6 border-[#E0E7F2] space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-[#0B1B43]">
                12-Week Activity Heatmap
              </h3>
              <p className="text-[11px] text-[#405B8B]">
                Tasks and modules completed per week
              </p>
            </div>
            <span className="text-[10px] font-bold text-[#087BFA]">
              {activity.totalHours} Total Hours
            </span>
          </div>

          {/* Horizontally scrollable heatmap on mobile (PRD §6) */}
          <div className="overflow-x-auto pb-2" aria-label="12-Week Activity Matrix">
            <div className="min-w-[340px] space-y-2">
              <div className="grid grid-cols-12 gap-1.5">
                {activity.weeks.map((w) => {
                  const intensity =
                    w.tasksCompleted === 0
                      ? 'bg-slate-100'
                      : w.tasksCompleted <= 2
                      ? 'bg-blue-200 text-blue-900'
                      : w.tasksCompleted <= 4
                      ? 'bg-[#087BFA] text-white'
                      : 'bg-[#603DF5] text-white';

                  return (
                    <div
                      key={w.week}
                      className={`h-14 rounded-xl flex flex-col items-center justify-center p-1 text-center transition-all hover:scale-105 cursor-pointer ${intensity}`}
                      title={`${w.week}: ${w.tasksCompleted} tasks completed (${w.hoursSpent} hrs)`}
                    >
                      <span className="text-[10px] font-bold">{w.tasksCompleted}</span>
                      <span className="text-[9px] opacity-80">{w.week}</span>
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex items-center justify-between text-[11px] text-[#405B8B] pt-1">
                <span>Less Active</span>
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-xs bg-slate-100" />
                  <span className="w-3 h-3 rounded-xs bg-blue-200" />
                  <span className="w-3 h-3 rounded-xs bg-[#087BFA]" />
                  <span className="w-3 h-3 rounded-xs bg-[#603DF5]" />
                </div>
                <span>Most Active</span>
              </div>
            </div>
          </div>

          {/* Text-table fallback (PRD §6) */}
          <details className="text-xs text-[#405B8B] pt-2 border-t border-slate-100 cursor-pointer">
            <summary className="font-semibold hover:text-[#0B1B43] select-none">
              View data table (Accessible Fallback)
            </summary>
            <table className="w-full mt-2 text-left text-[11px] border border-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="p-1.5">Week</th>
                  <th className="p-1.5">Tasks Completed</th>
                  <th className="p-1.5">Hours Spent</th>
                </tr>
              </thead>
              <tbody>
                {activity.weeks.map((w) => (
                  <tr key={w.week} className="border-t border-slate-100">
                    <td className="p-1.5 font-bold text-[#0B1B43]">{w.week}</td>
                    <td className="p-1.5">{w.tasksCompleted} tasks</td>
                    <td className="p-1.5">{w.hoursSpent} hrs</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </Card>

        {/* VISUAL 6: ROADMAP BY STAGE (Segmented Progress Bars, PRD §5) */}
        <Card className="p-6 border-[#E0E7F2] space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-[#0B1B43]">
                Roadmap Completion by Stage
              </h3>
              <p className="text-[11px] text-[#405B8B]">
                Milestone progression across all 4 learning phases
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate('/student/roadmap')}
              rightIcon={<ArrowRight className="w-3.5 h-3.5 text-[#087BFA]" />}
            >
              Open Roadmap
            </Button>
          </div>

          <div className="space-y-4 pt-1" aria-label="Roadmap Progress by Stage">
            {roadmapStages.map((stage) => (
              <div key={stage.stage} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-extrabold text-[#0B1B43] flex items-center gap-1.5">
                    {stage.pct === 100 && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    )}
                    <span>{stage.stage}</span>
                  </span>
                  <span className="font-bold text-[#405B8B]">
                    {stage.completed} / {stage.total} ({stage.pct}%)
                  </span>
                </div>

                <ProgressBar
                  progress={stage.pct}
                  color={stage.pct === 100 ? 'green' : stage.pct > 0 ? 'gradient' : 'blue'}
                  size="sm"
                />
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
                  <th className="p-1.5">Stage</th>
                  <th className="p-1.5">Progress</th>
                  <th className="p-1.5">Tasks</th>
                </tr>
              </thead>
              <tbody>
                {roadmapStages.map((s) => (
                  <tr key={s.stage} className="border-t border-slate-100">
                    <td className="p-1.5 font-bold text-[#0B1B43]">{s.stage}</td>
                    <td className="p-1.5">{s.pct}%</td>
                    <td className="p-1.5">{s.completed} of {s.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </Card>
      </div>
    </div>
  );
};
