import type { V2SessionResult } from '../../../types/assessmentV2';
import { getRoleRequirements } from '../../../data/domainsCatalog';

export interface PerformanceTier {
  label: string;
  badge: string;
  summary: string;
  readyLabel: string;
}

export function getTier(score: number): PerformanceTier {
  if (score >= 85) {
    return {
      label: 'Interview Ready (Tier 1)',
      badge: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      summary: 'Exceptional competency demonstrated across knowledge and practical problem-solving.',
      readyLabel: 'Interview Ready',
    };
  }
  if (score >= 70) {
    return {
      label: 'Benchmark Competent (Tier 2)',
      badge: 'bg-blue-50 text-blue-700 border border-blue-200',
      summary: 'Solid foundational and applied skills aligned with target industry expectations.',
      readyLabel: 'Proficient Ready',
    };
  }
  if (score >= 50) {
    return {
      label: 'Developing Competency (Tier 3)',
      badge: 'bg-amber-50 text-amber-700 border border-amber-200',
      summary: 'Core concepts understood. Recommended practical workbench practice to bridge gaps.',
      readyLabel: 'Developing Competence',
    };
  }
  return {
    label: 'Foundational Stage (Tier 4)',
    badge: 'bg-rose-50 text-rose-700 border border-rose-200',
    summary: 'Essential concepts need reinforcement through structured learning path milestones.',
    readyLabel: 'Foundational',
  };
}

export interface SkillGapItem {
  skillName: string;
  category: string;
  score: number;
  level: number;
  levelLabel: string;
  targetLevel: number;
  gap: number;
  isRoleRequired: boolean;
  importance: string;
  nextAction: string;
}

export function computeSkillList(result: V2SessionResult, activeRoleTitle: string): SkillGapItem[] {
  const roleReqs = getRoleRequirements(activeRoleTitle);
  const rawScores = Object.values(result.skillScores || {});

  return rawScores.map((s) => {
    const match = roleReqs.requiredSkills?.find(
      (r) => r.skillName.toLowerCase() === s.skillName.toLowerCase()
    );
    const targetLevel = match ? match.requiredProficiency : 3;
    const gap = s.level - targetLevel;

    let nextAction = 'Practice coding challenge';
    if (s.score < 40) {
      nextAction = 'Review fundamentals in Roadmap';
    } else if (s.score < 70) {
      nextAction = 'Hands-on practical workbench';
    } else {
      nextAction = 'Add portfolio project proof';
    }

    return {
      ...s,
      targetLevel,
      gap,
      isRoleRequired: Boolean(match),
      importance: match?.whyItMatters || 'Core technical competency for career track.',
      nextAction,
    };
  });
}
