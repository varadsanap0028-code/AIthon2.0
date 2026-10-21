import React from 'react';
import {
  Sparkles,
  ArrowRight,
  BookOpen,
  ExternalLink,
  Target,
  Brain,
  FolderGit2
} from 'lucide-react';
import { Card } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { Badge } from '../../../components/common/Badge';
import type { SkillGapItem } from './chartMappers';

interface NextActionCardProps {
  targetRole: string;
  hasTargetRole: boolean;
  hasCompletedAssessment: boolean;
  topGap?: SkillGapItem;
  onOpenRoleModal: () => void;
  onNavigate: (path: string) => void;
}

export const NextActionCard: React.FC<NextActionCardProps> = ({
  targetRole,
  hasTargetRole,
  hasCompletedAssessment,
  topGap,
  onOpenRoleModal,
  onNavigate,
}) => {
  // Deterministic Next Action Resolution (PRD §4 #3)
  if (!hasTargetRole) {
    return (
      <Card className="p-6 border-[#087BFA]/30 bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-white shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-xl">
            <Badge variant="blue" icon={<Target className="w-3.5 h-3.5" />}>
              Immediate Priority
            </Badge>
            <h2 className="text-lg font-black text-[#0B1B43]">
              Calibrate Your Career Target
            </h2>
            <p className="text-xs text-[#405B8B] leading-relaxed">
              Select your career domain and target job title to unlock industry benchmarks, tailored assessments, and direct employer skill matching.
            </p>
          </div>
          <Button variant="primary" size="md" onClick={onOpenRoleModal} rightIcon={<ArrowRight className="w-4 h-4" />}>
            Choose Target Role
          </Button>
        </div>
      </Card>
    );
  }

  if (!hasCompletedAssessment) {
    return (
      <Card className="p-6 border-[#087BFA]/30 bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-white shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-xl">
            <Badge variant="purple" icon={<Brain className="w-3.5 h-3.5" />}>
              Diagnostic Required
            </Badge>
            <h2 className="text-lg font-black text-[#0B1B43]">
              Complete Your {targetRole} Diagnostic Assessment
            </h2>
            <p className="text-xs text-[#405B8B] leading-relaxed">
              Take a 15-minute diagnostic test to benchmark your current demonstrated proficiency against entry requirements and uncover high-priority gaps.
            </p>
          </div>
          <Button variant="primary" size="md" onClick={() => onNavigate('/student/assessment')} rightIcon={<ArrowRight className="w-4 h-4" />}>
            Start Assessment (15 min)
          </Button>
        </div>
      </Card>
    );
  }

  if (topGap && topGap.gap > 0) {
    return (
      <Card className="p-6 border-amber-200/80 bg-gradient-to-r from-amber-50/50 via-white to-blue-50/30 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="space-y-1 max-w-xl">
            <div className="flex items-center gap-2">
              <Badge variant="danger" icon={<Sparkles className="w-3.5 h-3.5" />}>
                Recommended Next Step
              </Badge>
              <Badge variant="gray">{topGap.category}</Badge>
            </div>
            <h2 className="text-lg font-black text-[#0B1B43]">
              Bridge High-Priority Gap: {topGap.skill}
            </h2>
            <p className="text-xs text-[#405B8B]">
              Your demonstrated proficiency is <strong>Level {topGap.current}/5</strong>. Industry benchmark requires <strong>Level {topGap.required}/5</strong>.
            </p>
          </div>

          <Button
            variant="primary"
            size="md"
            onClick={() => onNavigate('/student/skill-gap')}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Open Skill Gap Engine
          </Button>
        </div>

        {/* 2 Recommended Free Learning Resources (PRD §4 #3) */}
        <div className="space-y-2">
          <span className="text-xs font-bold text-[#0B1B43] flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-[#087BFA]" />
            Recommended Free Resources for {topGap.skill}:
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <a
              href="https://developer.mozilla.org"
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 rounded-xl bg-white border border-[#E0E7F2] hover:border-[#087BFA] hover:shadow-xs transition-all flex items-center justify-between gap-2 group"
            >
              <div className="space-y-0.5 min-w-0">
                <span className="text-xs font-bold text-[#0B1B43] group-hover:text-[#087BFA] truncate block">
                  {topGap.skill} Core Reference Guide
                </span>
                <div className="flex items-center gap-2 text-[10px] text-[#405B8B]">
                  <span className="font-semibold">MDN Docs</span>
                  <span>•</span>
                  <span className="text-emerald-600 font-bold">Free</span>
                  <span>•</span>
                  <span>Interactive</span>
                </div>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#087BFA] shrink-0" />
            </a>

            <a
              href="https://www.freecodecamp.org"
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 rounded-xl bg-white border border-[#E0E7F2] hover:border-[#087BFA] hover:shadow-xs transition-all flex items-center justify-between gap-2 group"
            >
              <div className="space-y-0.5 min-w-0">
                <span className="text-xs font-bold text-[#0B1B43] group-hover:text-[#087BFA] truncate block">
                  Practical {topGap.skill} Project Exercises
                </span>
                <div className="flex items-center gap-2 text-[10px] text-[#405B8B]">
                  <span className="font-semibold">freeCodeCamp</span>
                  <span>•</span>
                  <span className="text-emerald-600 font-bold">Free</span>
                  <span>•</span>
                  <span>Certification</span>
                </div>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#087BFA] shrink-0" />
            </a>
          </div>
        </div>
      </Card>
    );
  }

  // Fallback: Build project proof
  return (
    <Card className="p-6 border-[#603DF5]/30 bg-gradient-to-r from-purple-50/50 via-white to-blue-50/20 shadow-xs">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1.5 max-w-xl">
          <Badge variant="purple" icon={<FolderGit2 className="w-3.5 h-3.5" />}>
            Evidence & Verification
          </Badge>
          <h2 className="text-lg font-black text-[#0B1B43]">
            Submit Practical GitHub Projects to Prove Your Skills
          </h2>
          <p className="text-xs text-[#405B8B] leading-relaxed">
            Link demonstrable repositories with unit tests and live demos. Verified projects elevate your profile rank in recruiter searches.
          </p>
        </div>
        <Button variant="primary" size="md" onClick={() => onNavigate('/student/projects')} rightIcon={<ArrowRight className="w-4 h-4" />}>
          Add Project Evidence
        </Button>
      </div>
    </Card>
  );
};
