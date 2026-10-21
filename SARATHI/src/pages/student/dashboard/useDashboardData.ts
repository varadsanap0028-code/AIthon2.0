import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiClient } from '../../../services/apiClient';
import { useAuth } from '../../../context/AuthContext';
import { useStudent } from '../../../context/StudentContext';
import {
  mapSkillRadar,
  mapTopGaps,
  mapReadinessTrend,
  mapAssessmentHistory,
  mapLearningActivity,
  mapRoadmapStages,
  mapApplicationFunnel,
  type CategoryScore,
  type SkillGapItem,
  type ReadinessPoint,
  type AssessmentAttempt,
  type ActivityWeek,
  type RoadmapStageItem,
  type FunnelStageItem,
} from './chartMappers';

export interface DashboardJobMatch {
  id: string;
  title: string;
  company: string;
  location: string;
  type: string;
  salary: string;
  matchScore: number;
}

export interface DashboardKPIs {
  readinessScore: number;
  readinessChange: number;
  verifiedSkillsCount: number;
  highPriorityGapsCount: number;
  roadmapProgressPct: number;
  streakDays: number;
  totalHoursLearned: number;
}

export interface DashboardData {
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  hasData: boolean;
  targetRole: string;
  kpis: DashboardKPIs;
  categoryScores: CategoryScore[];
  topGaps: SkillGapItem[];
  readinessTrend: ReadinessPoint[];
  assessmentHistory: AssessmentAttempt[];
  learningActivity: {
    weeks: ActivityWeek[];
    totalTasks: number;
    totalHours: number;
  };
  roadmapByStage: RoadmapStageItem[];
  applicationFunnel: FunnelStageItem[];
  topJobMatches: DashboardJobMatch[];
}

export function useDashboardData(): DashboardData {
  const { user } = useAuth();
  const {
    targetRole,
    skills,
    skillGaps,
    overallReadinessScore,
    assessedSkillsCount,
    roadmap,
    projects,
  } = useStudent();

  const [rawServerData, setRawServerData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<{ success: boolean; data: any }>('/api/analytics/student');
      if (res && res.data) {
        setRawServerData(res.data);
      } else {
        setRawServerData(null);
      }
    } catch (err: any) {
      console.warn('Failed to fetch analytics payload, using local context fallback:', err);
      setError(err?.message || 'Unable to sync analytics with server.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Merge server telemetry with client context to ensure single source of truth
  const kpis: DashboardKPIs = useMemo(() => {
    const verifiedCount = skills.filter((s) => s.status === 'verified').length;
    const highGapsCount = skillGaps.filter((g) => g.priority === 'High').length;

    // Use evaluated readiness score from StudentContext if available, otherwise server
    const currentReadiness =
      overallReadinessScore !== null
        ? overallReadinessScore
        : rawServerData?.kpis?.readinessScore ?? rawServerData?.summary?.readinessScore ?? 0;

    const streak = rawServerData?.kpis?.streakDays ?? rawServerData?.summary?.streakDays ?? 0;
    const hours = rawServerData?.kpis?.totalHoursLearned ?? rawServerData?.summary?.totalHoursLearned ?? 0;

    const roadmapPct = roadmap?.overallProgress ?? rawServerData?.kpis?.roadmapProgressPct ?? 0;

    return {
      readinessScore: currentReadiness,
      readinessChange: rawServerData?.kpis?.readinessChange ?? rawServerData?.summary?.readinessChange ?? 0,
      verifiedSkillsCount: verifiedCount,
      highPriorityGapsCount: highGapsCount,
      roadmapProgressPct: roadmapPct,
      streakDays: streak,
      totalHoursLearned: hours,
    };
  }, [skills, skillGaps, overallReadinessScore, rawServerData, roadmap]);

  const categoryScores = useMemo(() => {
    const fromServer = rawServerData?.skillRadar || rawServerData?.categoryScores || rawServerData?.charts?.skillRadar;
    return mapSkillRadar(fromServer);
  }, [rawServerData]);

  const topGaps = useMemo(() => {
    if (skillGaps && skillGaps.length > 0) {
      return mapTopGaps(
        skillGaps.map((g) => ({
          skill: g.skillName,
          category: g.category || 'Core Skill',
          current: g.currentProficiency,
          required: g.requiredProficiency,
          gap: g.gapLevel,
          priority: g.priority,
          status: g.verificationStatus,
        }))
      );
    }
    const fromServer = rawServerData?.topGaps || rawServerData?.charts?.benchmarkGaps;
    return mapTopGaps(fromServer);
  }, [skillGaps, rawServerData]);

  const readinessTrend = useMemo(() => {
    const fromServer = rawServerData?.readinessTrend || rawServerData?.charts?.readinessTrend;
    return mapReadinessTrend(fromServer, kpis.readinessScore);
  }, [rawServerData, kpis.readinessScore]);

  const assessmentHistory = useMemo(() => {
    const fromServer = rawServerData?.assessmentHistory || rawServerData?.charts?.assessmentHistory;
    return mapAssessmentHistory(fromServer);
  }, [rawServerData]);

  const learningActivity = useMemo(() => {
    const fromServer = rawServerData?.activityByDay || rawServerData?.charts?.learningActivity;
    return mapLearningActivity(fromServer);
  }, [rawServerData]);

  const roadmapByStage = useMemo(() => {
    const fromServer = rawServerData?.roadmapByStage || rawServerData?.charts?.roadmapProgress;
    return mapRoadmapStages(fromServer);
  }, [rawServerData]);

  const applicationFunnel = useMemo(() => {
    const fromServer = rawServerData?.applicationFunnel || rawServerData?.charts?.applicationFunnel;
    return mapApplicationFunnel(fromServer);
  }, [rawServerData]);

  const topJobMatches = useMemo<DashboardJobMatch[]>(() => {
    if (rawServerData?.topJobMatches && rawServerData.topJobMatches.length > 0) {
      return rawServerData.topJobMatches;
    }
    // Return empty list for students without real active matches
    return [];
  }, [rawServerData]);

  const hasData = Boolean(
    assessedSkillsCount > 0 ||
      projects.length > 0 ||
      (rawServerData?.assessmentHistory && rawServerData.assessmentHistory.length > 0)
  );

  return {
    isLoading,
    error,
    refetch: fetchDashboardData,
    hasData,
    targetRole: targetRole || user?.targetRole || 'Full-Stack Developer',
    kpis,
    categoryScores,
    topGaps,
    readinessTrend,
    assessmentHistory,
    learningActivity,
    roadmapByStage,
    applicationFunnel,
    topJobMatches,
  };
}
