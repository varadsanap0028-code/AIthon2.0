/**
 * Pure mapping functions for Student Dashboard charts.
 * Adheres strictly to SARATHI_DASHBOARD_MERGE_PRD.md §5 and §6.
 */

export interface CategoryScore {
  category: string;
  current: number; // 0 - 100
  required: number; // 0 - 100
  count?: number;
}

export interface SkillGapItem {
  skill: string;
  category: string;
  current: number; // 0 - 5
  required: number; // 0 - 5
  gap: number; // required - current
  priority: 'High' | 'Medium' | 'Low';
  status?: string;
}

export interface ReadinessPoint {
  period: string;
  score: number;
  target?: number;
}

export interface AssessmentAttempt {
  attempt: number;
  title: string;
  category?: string;
  scorePct: number;
  passed: boolean;
  date: string;
}

export interface ActivityWeek {
  week: string;
  tasksCompleted: number;
  hoursSpent: number;
}

export interface RoadmapStageItem {
  stage: string;
  progress: number;
  completed: number;
  total: number;
  pct: number;
}

export interface FunnelStageItem {
  stage: string;
  count: number;
}

/**
 * 1. Skill Radar: max 8 axes, current vs required
 */
export function mapSkillRadar(scores: CategoryScore[] | undefined): CategoryScore[] {
  if (!scores || scores.length === 0) {
    return [];
  }
  return scores.slice(0, 8).map((s) => ({
    category: s.category || 'Core Skill',
    current: Math.max(0, Math.min(100, Math.round(s.current))),
    required: Math.max(0, Math.min(100, Math.round(s.required || 80))),
    count: s.count || 1,
  }));
}

/**
 * 2. Top Gaps: top 8 gaps only, sorted by gap size descending
 */
export function mapTopGaps(gaps: SkillGapItem[] | undefined): SkillGapItem[] {
  if (!gaps || gaps.length === 0) {
    return [];
  }
  return gaps
    .slice()
    .sort((a, b) => b.gap - a.gap)
    .slice(0, 8)
    .map((g) => ({
      skill: g.skill,
      category: g.category || 'Engineering',
      current: g.current,
      required: g.required,
      gap: Math.max(0, g.required - g.current),
      priority: g.gap >= 2 ? 'High' : g.gap === 1 ? 'Medium' : 'Low',
      status: g.status || 'evaluated',
    }));
}

/**
 * 3. Readiness Trend: includes target line (default 85)
 */
export function mapReadinessTrend(
  trend: ReadinessPoint[] | undefined,
  currentScore?: number | null
): ReadinessPoint[] {
  if (!trend || trend.length === 0) {
    if (typeof currentScore === 'number') {
      return [{ period: 'Current', score: currentScore, target: 85 }];
    }
    return [];
  }

  const mapped = trend.map((t) => ({
    period: t.period,
    score: Math.max(0, Math.min(100, Math.round(t.score))),
    target: t.target || 85,
  }));

  // Synchronize latest point with current readiness score if provided
  if (typeof currentScore === 'number' && mapped.length > 0) {
    mapped[mapped.length - 1].score = currentScore;
  }

  return mapped;
}

/**
 * 4. Assessment History: scores per attempt
 */
export function mapAssessmentHistory(
  history: AssessmentAttempt[] | undefined
): AssessmentAttempt[] {
  if (!history || history.length === 0) {
    return [];
  }
  return history.map((a, idx) => ({
    attempt: a.attempt || idx + 1,
    title: a.title || `Assessment #${idx + 1}`,
    category: a.category || 'General',
    scorePct: Math.max(0, Math.min(100, Math.round(a.scorePct))),
    passed: Boolean(a.passed),
    date: a.date || 'Recent',
  }));
}

/**
 * 5. Learning Activity: calculate streak and total completions
 */
export function mapLearningActivity(activity: ActivityWeek[] | undefined): {
  weeks: ActivityWeek[];
  totalTasks: number;
  totalHours: number;
} {
  if (!activity || activity.length === 0) {
    return { weeks: [], totalTasks: 0, totalHours: 0 };
  }
  const weeks = activity.slice(-12).map((w, idx) => ({
    week: w.week || `Wk ${idx + 1}`,
    tasksCompleted: Math.max(0, w.tasksCompleted || 0),
    hoursSpent: Math.max(0, w.hoursSpent || 0),
  }));

  const totalTasks = weeks.reduce((acc, w) => acc + w.tasksCompleted, 0);
  const totalHours = weeks.reduce((acc, w) => acc + w.hoursSpent, 0);

  return { weeks, totalTasks, totalHours };
}

/**
 * 6. Roadmap by Stage: segmented progress
 */
export function mapRoadmapStages(
  stages: Array<{ stage: string; progress?: number; completed?: number; total?: number; pct?: number }> | undefined
): RoadmapStageItem[] {
  if (!stages || stages.length === 0) {
    return [
      { stage: 'Foundations', progress: 0, completed: 0, total: 4, pct: 0 },
      { stage: 'Core Architecture', progress: 0, completed: 0, total: 4, pct: 0 },
      { stage: 'Advanced Patterns', progress: 0, completed: 0, total: 4, pct: 0 },
      { stage: 'Capstone & Production', progress: 0, completed: 0, total: 3, pct: 0 },
    ];
  }
  return stages.map((s) => {
    const total = s.total || 4;
    const completed = typeof s.completed === 'number' ? s.completed : Math.round(((s.progress || 0) / 100) * total);
    const pct = s.pct !== undefined ? s.pct : s.progress !== undefined ? s.progress : Math.round((completed / total) * 100);
    return {
      stage: s.stage,
      progress: Math.min(100, Math.max(0, pct)),
      completed,
      total,
      pct: Math.min(100, Math.max(0, pct)),
    };
  });
}

/**
 * 7. Application Funnel: standard 5-stage conversion
 */
export function mapApplicationFunnel(
  funnel: Array<{ stage: string; count: number }> | undefined
): FunnelStageItem[] {
  const standardStages = ['Applied', 'In Review', 'Shortlisted', 'Interview', 'Offer'];
  if (!funnel || funnel.length === 0) {
    return standardStages.map((stage) => ({ stage, count: 0 }));
  }

  const stageMap: Record<string, number> = {};
  funnel.forEach((f) => {
    const norm = f.stage.toLowerCase();
    if (norm.includes('applied') || norm.includes('new')) stageMap['Applied'] = (stageMap['Applied'] || 0) + f.count;
    else if (norm.includes('review')) stageMap['In Review'] = (stageMap['In Review'] || 0) + f.count;
    else if (norm.includes('shortlist')) stageMap['Shortlisted'] = (stageMap['Shortlisted'] || 0) + f.count;
    else if (norm.includes('interview')) stageMap['Interview'] = (stageMap['Interview'] || 0) + f.count;
    else if (norm.includes('offer')) stageMap['Offer'] = (stageMap['Offer'] || 0) + f.count;
    else stageMap[f.stage] = f.count;
  });

  return standardStages.map((stage) => ({
    stage,
    count: stageMap[stage] || 0,
  }));
}
