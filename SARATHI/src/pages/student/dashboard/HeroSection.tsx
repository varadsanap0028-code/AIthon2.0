import React from 'react';
import { Target, ListChecks, CheckCircle2, ChevronRight, X, Sparkles } from 'lucide-react';
import { Button } from '../../../components/common/Button';
import { Card } from '../../../components/common/Card';
import { ProgressBar } from '../../../components/common/ProgressBar';

export interface OnboardingStep {
  id: number;
  title: string;
  isDone: boolean;
  path?: string;
  action?: () => void;
}

interface HeroSectionProps {
  userName: string;
  targetRole: string;
  targetDomain: string;
  hasTargetRole: boolean;
  hasCompletedAssessment: boolean;
  overallReadinessScore: number | null;
  onOpenRoleModal: () => void;
  showOnboardingGuide: boolean;
  onDismissOnboarding: () => void;
  onboardingSteps: OnboardingStep[];
  completedStepsCount: number;
  onNavigate: (path: string) => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  userName,
  targetRole,
  hasTargetRole,
  hasCompletedAssessment,
  overallReadinessScore,
  onOpenRoleModal,
  showOnboardingGuide,
  onDismissOnboarding,
  onboardingSteps,
  completedStepsCount,
  onNavigate,
}) => {
  return (
    <div className="space-y-6">
      {/* 1. HERO BANNER */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0B1B43] via-[#087BFA] to-[#603DF5] p-6 sm:p-8 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2.5 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-white/20 backdrop-blur-md text-white border border-white/30">
                <Target className="w-3.5 h-3.5 text-blue-200" />
                <span>
                  Target Role: <strong>{hasTargetRole ? targetRole : 'Not selected yet'}</strong>
                </span>
              </span>

              {overallReadinessScore !== null && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
                  <Sparkles className="w-3 h-3" />
                  <span>{overallReadinessScore}% Verified Readiness</span>
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
              {userName ? `Welcome back, ${userName}!` : 'Welcome to SARATHI!'}
            </h1>

            <p className="text-blue-100 text-xs sm:text-sm leading-relaxed max-w-xl">
              {!hasTargetRole ? (
                'Your career journey starts here. Select your target role to calibrate industry benchmarks, unlock diagnostic assessments, and generate your personalized roadmap.'
              ) : !hasCompletedAssessment ? (
                `You are tracking towards ${targetRole}. Take your diagnostic skill assessment to uncover competency benchmarks and generate proof-backed learning milestones.`
              ) : (
                `You are calibrated for ${targetRole}. Complete verified roadmap tasks, submit GitHub project evidence, and unlock direct recruiter job matches.`
              )}
            </p>
          </div>

          <div className="shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <Button
              variant="secondary"
              size="md"
              onClick={onOpenRoleModal}
              className="bg-white/10 hover:bg-white/20 text-white border border-white/30 font-bold backdrop-blur-xs"
            >
              {hasTargetRole ? 'Switch Role / Domain' : 'Select Target Role'}
            </Button>
          </div>
        </div>
      </div>

      {/* 2. ONBOARDING CHECKLIST (PRD §4 #8) */}
      {showOnboardingGuide && (
        <Card className="border-[#087BFA]/30 bg-blue-50/40 p-5 sm:p-6 transition-all shadow-xs">
          <div className="flex items-start justify-between gap-4 pb-3 border-b border-blue-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-[#087BFA]/10 text-[#087BFA]">
                <ListChecks className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-black text-[#0B1B43]">
                  Getting Started with SARATHI
                </h2>
                <p className="text-xs text-[#405B8B]">
                  {completedStepsCount} of {onboardingSteps.length} milestones completed
                </p>
              </div>
            </div>

            <button
              onClick={onDismissOnboarding}
              className="text-[#405B8B] hover:text-[#0B1B43] p-1.5 rounded-lg hover:bg-white transition-colors cursor-pointer"
              title="Dismiss checklist"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="pt-3 space-y-3">
            <ProgressBar
              progress={Math.round((completedStepsCount / onboardingSteps.length) * 100)}
              color="gradient"
              size="sm"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
              {onboardingSteps.map((step) => (
                <div
                  key={step.id}
                  onClick={() => {
                    if (step.action) step.action();
                    else if (step.path) onNavigate(step.path);
                  }}
                  className={`flex items-center justify-between p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    step.isDone
                      ? 'bg-white border-emerald-200 text-emerald-800'
                      : 'bg-white border-[#E0E7F2] text-[#0B1B43] hover:border-[#087BFA] hover:shadow-xs'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <CheckCircle2
                      className={`w-4 h-4 shrink-0 ${
                        step.isDone ? 'text-emerald-600' : 'text-slate-300'
                      }`}
                    />
                    <span className="truncate">{step.title}</span>
                  </div>
                  {!step.isDone && <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
