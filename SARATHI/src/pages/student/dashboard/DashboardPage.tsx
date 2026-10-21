import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useStudent } from '../../../context/StudentContext';
import { Modal } from '../../../components/common/Modal';
import { DomainRoleSelector } from '../../../components/common/DomainRoleSelector';
import { useDashboardData } from './useDashboardData';
import { HeroSection, type OnboardingStep } from './HeroSection';
import { KpiRow } from './KpiRow';
import { NextActionCard } from './NextActionCard';
import { SkillDiagnostics } from './SkillDiagnostics';
import { ProgressOverTime } from './ProgressOverTime';
import { LearningMomentum } from './LearningMomentum';
import { OpportunitiesPanel } from './OpportunitiesPanel';
import { ReadinessExplainerModal } from './ReadinessExplainerModal';
import { FirstRunOnboardingModal } from '../../../components/onboarding/FirstRunOnboardingModal';
import { StorageService } from '../../../services/storageService';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const {
    targetDomain,
    setTargetDomain,
    targetRole,
    setTargetRole,
    assessedSkillsCount,
    projects,
    roadmap,
    hasReviewedGaps,
    hasReviewedPassport,
    onboardingDismissed,
    setOnboardingDismissed,
    generateRoadmap,
  } = useStudent();
  const navigate = useNavigate();

  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [readinessExplainerOpen, setReadinessExplainerOpen] = useState(false);
  const [firstRunModalOpen, setFirstRunModalOpen] = useState<boolean>(() => {
    if (!user) return false;
    return !StorageService.getUserWelcomeModalSeen(user.id);
  });

  // Consolidated dashboard data hook
  const {
    hasData,
    targetRole: activeRole,
    kpis,
    categoryScores,
    topGaps,
    readinessTrend,
    assessmentHistory,
    learningActivity,
    roadmapByStage,
    applicationFunnel,
    topJobMatches,
  } = useDashboardData();

  const hasTargetRole = Boolean(targetRole && targetRole !== 'Not selected yet');
  const hasCompletedAssessment = Boolean(
    assessedSkillsCount > 0 ||
    (assessmentHistory && assessmentHistory.length > 0)
  );
  const verifiedProjectsCount = useMemo(
    () => projects.filter((p) => p.verificationStatus === 'verified').length,
    [projects]
  );

  const hasRoadmap = Boolean(roadmap && roadmap.stages && roadmap.stages.length > 0);
  const hasProjects = projects.length > 0;

  const onboardingSteps: OnboardingStep[] = [
    { id: 1, title: 'Select Target Career Role', isDone: hasTargetRole, action: () => setRoleModalOpen(true) },
    { id: 2, title: 'Take Diagnostic Assessment', isDone: hasCompletedAssessment, path: '/student/assessment' },
    { id: 3, title: 'Review Skill Gap Analysis', isDone: hasCompletedAssessment && hasReviewedGaps, path: '/student/skill-gap' },
    { id: 4, title: 'Generate Personalized Roadmap', isDone: hasRoadmap, action: () => generateRoadmap() },
    { id: 5, title: 'Add Project Evidence', isDone: hasProjects, path: '/student/projects' },
    { id: 6, title: 'Review Verified Skill Passport', isDone: hasReviewedPassport, path: '/student/skill-passport' },
  ];

  const completedStepsCount = onboardingSteps.filter((s) => s.isDone).length;
  const showOnboardingGuide = !onboardingDismissed && completedStepsCount < onboardingSteps.length;

  return (
    <div className="space-y-8 pb-16 max-w-7xl mx-auto">
      {/* 1. HERO SECTION (PRD §4 #1 & #8) */}
      <HeroSection
        userName={user?.fullName || ''}
        targetRole={activeRole}
        targetDomain={targetDomain || 'web-dev'}
        hasTargetRole={hasTargetRole}
        hasCompletedAssessment={hasCompletedAssessment}
        overallReadinessScore={kpis.readinessScore > 0 ? kpis.readinessScore : null}
        onOpenRoleModal={() => setRoleModalOpen(true)}
        showOnboardingGuide={showOnboardingGuide}
        onDismissOnboarding={() => setOnboardingDismissed(true)}
        onboardingSteps={onboardingSteps}
        completedStepsCount={completedStepsCount}
        onNavigate={navigate}
      />

      {/* 2. KPI ROW (PRD §4 #2) */}
      <KpiRow
        readinessScore={kpis.readinessScore}
        readinessChange={kpis.readinessChange}
        verifiedSkillsCount={kpis.verifiedSkillsCount}
        highPriorityGapsCount={kpis.highPriorityGapsCount}
        roadmapProgressPct={kpis.roadmapProgressPct}
        onOpenExplainer={() => setReadinessExplainerOpen(true)}
        onNavigate={navigate}
      />

      {/* 3. NEXT BEST ACTION (PRD §4 #3) */}
      <NextActionCard
        targetRole={activeRole}
        hasTargetRole={hasTargetRole}
        hasCompletedAssessment={hasCompletedAssessment}
        topGap={topGaps.length > 0 ? topGaps[0] : undefined}
        onOpenRoleModal={() => setRoleModalOpen(true)}
        onNavigate={navigate}
      />

      {/* 4. SKILL DIAGNOSTICS & BENCHMARK GAPS (PRD §4 #4, Visuals 1 & 2) */}
      <SkillDiagnostics
        categoryScores={categoryScores}
        topGaps={topGaps}
        hasData={hasData}
        onNavigate={navigate}
      />

      {/* 5. PROGRESS OVER TIME & TRAJECTORY (PRD §4 #5, Visuals 3 & 4) */}
      <ProgressOverTime
        readinessTrend={readinessTrend}
        assessmentHistory={assessmentHistory}
        hasData={hasData}
        onNavigate={navigate}
      />

      {/* 6. LEARNING MOMENTUM & EXECUTION (PRD §4 #6, Visuals 5 & 6) */}
      <LearningMomentum
        activity={learningActivity}
        streakDays={kpis.streakDays}
        roadmapStages={roadmapByStage}
        onNavigate={navigate}
      />

      {/* 7. OPPORTUNITIES & CONVERSION FUNNEL (PRD §4 #7, Visual 7) */}
      <OpportunitiesPanel
        applicationFunnel={applicationFunnel}
        topJobMatches={topJobMatches}
        onNavigate={navigate}
      />

      {/* READINESS EXPLAINER MODAL */}
      <ReadinessExplainerModal
        isOpen={readinessExplainerOpen}
        onClose={() => setReadinessExplainerOpen(false)}
        targetRole={activeRole}
        assessedSkillsCount={assessedSkillsCount}
        verifiedProjectsCount={verifiedProjectsCount}
      />

      {/* TARGET ROLE & DOMAIN CALIBRATION MODAL */}
      <Modal
        isOpen={roleModalOpen}
        onClose={() => setRoleModalOpen(false)}
        title="Calibrate Career Specialization & Target Role"
        subtitle="Updating your target role recalibrates your benchmark competencies, gap analysis, and roadmap."
      >
        <div className="space-y-4">
          <DomainRoleSelector
            selectedDomainId={targetDomain || 'web-dev'}
            selectedRoleTitle={activeRole}
            onSelectRole={(newRole, domainId) => {
              setTargetRole(newRole, domainId);
              setTargetDomain(domainId);
              setRoleModalOpen(false);
            }}
            onDomainChange={(domainId) => {
              setTargetDomain(domainId);
            }}
          />
        </div>
      </Modal>

      {/* FIRST-RUN ONBOARDING WIZARD MODAL */}
      <FirstRunOnboardingModal
        isOpen={firstRunModalOpen}
        onClose={() => setFirstRunModalOpen(false)}
      />
    </div>
  );
};
