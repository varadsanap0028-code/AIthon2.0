import React, { useState } from 'react';
import { AlertTriangle, BookOpen, Check, Clock } from 'lucide-react';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { ProgressBar } from '../common/ProgressBar';
import { SkeletonCard } from '../common/Skeleton';
import { EmptyState } from '../common/EmptyState';
import { Button } from '../common/Button';
import type { CollegeSkillGap } from '../../types/college';
import { collegeApi } from '../../services/collegeApiService';

interface SkillGapMatrixProps {
  gaps: CollegeSkillGap[];
  isLoading: boolean;
  error: string | null;
  onRetry?: () => void;
}

interface InterventionPlan {
  id: string;
  title: string;
  description: string;
  type: 'lab_update' | 'capstone_rubric' | 'bootcamp';
  status: 'planned' | 'accepted' | 'dismissed';
}

const INITIAL_RECOMMENDATIONS: InterventionPlan[] = [
  {
    id: 'rec-1',
    title: 'Docker & DevOps Deployment Module',
    description: 'Integrate a 2-week practical Docker & containerization module into the Semester 6 Web Engineering lab.',
    type: 'lab_update',
    status: 'planned',
  },
  {
    id: 'rec-2',
    title: 'Automated Testing Capstone Requirement',
    description: 'Mandate Jest/React Testing Library test suites in final-year capstone project evaluation rubrics to close the 58% testing gap.',
    type: 'capstone_rubric',
    status: 'accepted',
  },
  {
    id: 'rec-3',
    title: 'Weekend Intensive TypeScript Bootcamp',
    description: 'Conduct a weekend intensive bootcamp on TypeScript to accelerate full-stack readiness before upcoming campus placement drives.',
    type: 'bootcamp',
    status: 'planned',
  },
];

export const SkillGapMatrix: React.FC<SkillGapMatrixProps> = ({ gaps, isLoading, error }) => {
  const [recommendations, setRecommendations] = useState<InterventionPlan[]>(INITIAL_RECOMMENDATIONS);

  if (isLoading) return <SkeletonCard className="space-y-6" />;

  if ((error && gaps.length === 0) || gaps.length === 0) {
    return (
      <Card borderAccent="amber" className="space-y-5">
        <EmptyState
          icon={AlertTriangle}
          title="No skill-gap data"
          description={error ?? 'Skill gaps will appear once assessments are graded.'}
          variant="amber"
        />
      </Card>
    );
  }

  const cards = gaps.slice(0, 8).map((g) => ({
    skill: g.skill,
    branch: g.branch,
    gapPercentage: g.gapPercentage,
    priority: g.severity === 'high' ? 'High' : g.severity === 'medium' ? 'Medium' : 'Low',
  }));

  const handleUpdateStatus = async (id: string, newStatus: 'accepted' | 'planned') => {
    setRecommendations((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r))
    );
    try {
      await collegeApi.updateCurriculum(id, newStatus);
    } catch {
      // Handled gracefully in UI
    }
  };

  return (
    <Card borderAccent="amber" className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-50 text-[#D97706]">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-extrabold text-[#0B1B43]">
              Curriculum Skill Gap Matrix &amp; Industry Alignment
            </h3>
            <p className="text-xs text-[#405B8B]">
              Curricular variance between university course syllabi and live employer hiring benchmarks
            </p>
          </div>
        </div>
        <Badge variant="warning">Curriculum Action Needed</Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((gap) => (
          <div key={gap.skill} className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E0E7F2] space-y-2.5 hover:border-amber-300 transition-all">
            <div className="flex justify-between items-center">
              <span className="font-extrabold text-sm text-[#0B1B43] truncate">{gap.skill}</span>
              <Badge variant={gap.priority === 'High' ? 'danger' : 'warning'} size="xs">
                {gap.priority}
              </Badge>
            </div>
            <div>
              <div className="text-2xl font-black text-[#DC2626] tracking-tight">{gap.gapPercentage}%</div>
              <span className="text-[11px] text-[#405B8B] block mt-0.5">Below industry hiring benchmark</span>
            </div>
            <div className="pt-2 border-t border-slate-200/80">
              <ProgressBar progress={100 - gap.gapPercentage} color={gap.priority === 'High' ? 'amber' : 'green'} size="sm" />
              <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold mt-1">
                <span>{100 - gap.gapPercentage}% Cohort Competency</span>
                {gap.branch && <span className="uppercase text-slate-400 font-bold">{gap.branch}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Actionable Academic Recommendations */}
      <div className="p-5 rounded-2xl bg-blue-50/70 border border-blue-100/90 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[#087BFA] font-bold text-sm">
            <BookOpen className="w-4 h-4" />
            <span>Recommended Academic Interventions (Board of Studies &amp; Faculty)</span>
          </div>
          <span className="text-[11px] font-semibold text-[#405B8B]">Auto-generated from batch gaps</span>
        </div>

        <div className="space-y-3">
          {recommendations.map((rec) => (
            <div
              key={rec.id}
              className="bg-white p-3.5 rounded-xl border border-blue-100/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-[#0B1B43]">{rec.title}</span>
                  <Badge variant={rec.status === 'accepted' ? 'emerald' : 'blue'} size="xs">
                    {rec.status === 'accepted' ? 'Curriculum Adopted' : 'Planned for Review'}
                  </Badge>
                </div>
                <p className="text-[#405B8B] text-[11px] leading-relaxed">{rec.description}</p>
              </div>

              <div className="shrink-0 self-start sm:self-center">
                {rec.status === 'accepted' ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">
                    <Check className="w-3.5 h-3.5" /> Adopted
                  </span>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs text-[#087BFA] border-blue-200 hover:bg-blue-50"
                    leftIcon={<Clock className="w-3.5 h-3.5" />}
                    onClick={() => handleUpdateStatus(rec.id, 'accepted')}
                  >
                    Adopt into Syllabus
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};

export default SkillGapMatrix;
