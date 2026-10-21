import { describe, it, expect } from 'vitest';
import {
  mapSkillRadar,
  mapTopGaps,
  mapReadinessTrend,
  mapAssessmentHistory,
  mapLearningActivity,
  mapRoadmapStages,
  mapApplicationFunnel,
} from '../pages/student/dashboard/chartMappers';

describe('Dashboard Chart Mappers & Fixtures (PRD §5 & §6)', () => {
  describe('0 Data Scenario (Empty / New Student)', () => {
    it('handles empty category scores cleanly for radar', () => {
      const radar = mapSkillRadar([]);
      expect(radar).toEqual([]);
    });

    it('handles empty top gaps cleanly', () => {
      const gaps = mapTopGaps([]);
      expect(gaps).toEqual([]);
    });

    it('handles empty readiness trend cleanly', () => {
      const trend = mapReadinessTrend([], 0);
      expect(trend.length).toBe(1);
      expect(trend[0].score).toBe(0);
      expect(trend[0].target).toBe(85);
    });

    it('handles empty assessment history cleanly', () => {
      const history = mapAssessmentHistory([]);
      expect(history).toEqual([]);
    });

    it('handles empty activity data cleanly with empty weeks and 0 totals', () => {
      const activity = mapLearningActivity([]);
      expect(activity.weeks).toHaveLength(0);
      expect(activity.totalTasks).toBe(0);
      expect(activity.totalHours).toBe(0);
    });

    it('handles empty roadmap stages with default baseline stages at 0%', () => {
      const roadmap = mapRoadmapStages([]);
      expect(roadmap).toHaveLength(4);
      expect(roadmap.every(stage => stage.progress === 0 && stage.completed === 0)).toBe(true);
    });

    it('handles empty application funnel cleanly with default 0-count stages', () => {
      const funnel = mapApplicationFunnel([]);
      expect(funnel.length).toBe(5);
      expect(funnel.map(f => f.stage)).toEqual(['Applied', 'In Review', 'Shortlisted', 'Interview', 'Offer']);
      expect(funnel.every(item => item.count === 0)).toBe(true);
    });
  });

  describe('1 Data Point Scenario (Single Assessment / Single Activity)', () => {
    it('maps 1 category score for radar', () => {
      const radar = mapSkillRadar([{ category: 'Frontend', current: 70, required: 90, count: 1 }]);
      expect(radar).toHaveLength(1);
      expect(radar[0].category).toBe('Frontend');
      expect(radar[0].current).toBe(70);
      expect(radar[0].required).toBe(90);
    });

    it('maps 1 gap item', () => {
      const gaps = mapTopGaps([{ skill: 'React', category: 'Frontend', current: 2, required: 4, gap: 2, priority: 'High', status: 'assessed' }]);
      expect(gaps).toHaveLength(1);
      expect(gaps[0].gap).toBe(2);
      expect(gaps[0].skill).toBe('React');
    });

    it('maps 1 readiness trend point with baseline and target 85', () => {
      const trend = mapReadinessTrend([{ period: 'Week 1', score: 65, target: 85 }], 65);
      expect(trend).toHaveLength(1);
      expect(trend[0].period).toBe('Week 1');
      expect(trend[0].score).toBe(65);
      expect(trend[0].target).toBe(85);
    });

    it('maps 1 assessment attempt', () => {
      const history = mapAssessmentHistory([{ attempt: 1, title: 'JavaScript Core', scorePct: 80, passed: true, date: '2026-10-15' }]);
      expect(history).toHaveLength(1);
      expect(history[0].scorePct).toBe(80);
      expect(history[0].attempt).toBe(1);
      expect(history[0].title).toBe('JavaScript Core');
    });

    it('maps 1 stage of roadmap', () => {
      const roadmap = mapRoadmapStages([{ stage: 'Foundations', progress: 50, total: 4 }]);
      expect(roadmap).toHaveLength(1);
      expect(roadmap[0].stage).toBe('Foundations');
      expect(roadmap[0].progress).toBe(50);
    });
  });

  describe('Full Data Scenario (Production-Scale Telemetry)', () => {
    const fullCategories = [
      { category: 'Frontend Architecture', current: 85, required: 90, count: 6 },
      { category: 'Backend Systems', current: 75, required: 85, count: 5 },
      { category: 'Database & SQL', current: 80, required: 80, count: 4 },
      { category: 'DevOps & CI/CD', current: 60, required: 75, count: 3 },
      { category: 'Cloud Infrastructure', current: 55, required: 70, count: 3 },
      { category: 'Testing & QA', current: 90, required: 85, count: 4 },
      { category: 'System Design', current: 70, required: 80, count: 4 },
      { category: 'Soft Skills & Leadership', current: 88, required: 80, count: 4 },
      { category: 'Excess Category', current: 50, required: 60, count: 2 } // 9th should be sliced to 8 max
    ];

    it('caps skill radar at max 8 axes as mandated by PRD §5', () => {
      const radar = mapSkillRadar(fullCategories);
      expect(radar.length).toBe(8);
      expect(radar[0].category).toBe('Frontend Architecture');
    });

    it('caps top gaps at max 8 items sorted by gap descending', () => {
      const fullGaps = [
        { skill: 'Docker', category: 'DevOps', current: 1, required: 5, gap: 4, priority: 'High' as const, status: 'assessed' },
        { skill: 'Kubernetes', category: 'Cloud', current: 1, required: 4, gap: 3, priority: 'High' as const, status: 'assessed' },
        { skill: 'GraphQL', category: 'Backend', current: 2, required: 4, gap: 2, priority: 'High' as const, status: 'assessed' },
        { skill: 'TypeScript', category: 'Frontend', current: 3, required: 5, gap: 2, priority: 'High' as const, status: 'assessed' },
        { skill: 'Redis', category: 'Database', current: 2, required: 4, gap: 2, priority: 'High' as const, status: 'assessed' },
        { skill: 'Kafka', category: 'Backend', current: 1, required: 3, gap: 2, priority: 'High' as const, status: 'assessed' },
        { skill: 'Next.js', category: 'Frontend', current: 3, required: 4, gap: 1, priority: 'Medium' as const, status: 'assessed' },
        { skill: 'Jest', category: 'Testing', current: 4, required: 5, gap: 1, priority: 'Medium' as const, status: 'assessed' },
        { skill: 'Tailwind', category: 'Frontend', current: 4, required: 5, gap: 1, priority: 'Medium' as const, status: 'assessed' },
        { skill: 'Git', category: 'DevOps', current: 4, required: 5, gap: 1, priority: 'Medium' as const, status: 'assessed' }
      ];
      const gaps = mapTopGaps(fullGaps);
      expect(gaps.length).toBe(8);
      expect(gaps[0].skill).toBe('Docker');
      expect(gaps[0].gap).toBe(4);
    });

    it('maps readiness trend with target line 85 and syncs last point', () => {
      const history = [
        { period: 'Wk 1', score: 55 },
        { period: 'Wk 2', score: 65 },
        { period: 'Wk 3', score: 72 },
        { period: 'Current', score: 82 }
      ];
      const trend = mapReadinessTrend(history, 84);
      expect(trend).toHaveLength(4);
      // Last point should reflect verified current readinessScore
      expect(trend[trend.length - 1].score).toBe(84);
      expect(trend.every(p => p.target === 85)).toBe(true);
    });

    it('maps application funnel preserved standard stages and aggregates counts', () => {
      const rawFunnel = [
        { stage: 'Applied', count: 12 },
        { stage: 'In Review', count: 8 },
        { stage: 'Interview', count: 5 },
        { stage: 'Offer', count: 2 }
      ];
      const funnel = mapApplicationFunnel(rawFunnel);
      expect(funnel).toHaveLength(5);
      expect(funnel[0].stage).toBe('Applied');
      expect(funnel[0].count).toBe(12);
      expect(funnel[1].stage).toBe('In Review');
      expect(funnel[1].count).toBe(8);
      expect(funnel[2].stage).toBe('Shortlisted');
      expect(funnel[2].count).toBe(0);
      expect(funnel[3].stage).toBe('Interview');
      expect(funnel[3].count).toBe(5);
      expect(funnel[4].stage).toBe('Offer');
      expect(funnel[4].count).toBe(2);
    });
  });
});
