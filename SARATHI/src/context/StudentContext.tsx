import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import type { SkillItem } from '../types/skill';
import type { StudentRoadmap, RoadmapTask } from '../types/roadmap';
import type { ProjectItem } from '../types/project';
import type { SkillGapItem } from '../types/gap';
import type { AssessmentResult } from '../types/assessment';
import { getRoleRequirements, getDomainByRoleTitle } from '../data/domainsCatalog';
import { initialStudentRoadmap } from '../data/mockRoadmaps';
import { getDomainRoadmap, resolveDomainTrack, personalizeRoadmapWithAssessmentAndGaps } from '../data/domainRoadmaps';
import { StorageService, DEMO_STUDENT_ID } from '../services/storageService';
import { SkillSyncService } from '../services/skillSyncService';
import { AssessmentV2Service } from '../services/assessmentV2Service';
import { apiClient } from '../services/apiClient';
import { useAuth } from './AuthContext';

interface StudentContextType {
  targetDomain: string;
  setTargetDomain: (domainId: string) => void;
  targetRole: string;
  setTargetRole: (role: string, domainId?: string) => void;
  skills: SkillItem[];
  roadmap: StudentRoadmap | null;
  projects: ProjectItem[];
  skillGaps: SkillGapItem[];
  otherAssessedSkills: SkillItem[]; // Skills assessed that are not required for the current target role
  overallReadinessScore: number | null; // null if not assessed yet
  assessedSkillsCount: number;
  selfReportedSkillsCount: number;
  assessmentHistory: AssessmentResult[];
  hasReviewedGaps: boolean;
  markGapsReviewed: () => void;
  hasReviewedPassport: boolean;
  markPassportReviewed: () => void;
  onboardingDismissed: boolean;
  setOnboardingDismissed: (dismissed: boolean) => void;
  roadmapLoading: boolean;
  roadmapError: string | null;
  roadmapToast: { message: string; taskId?: string; actionType?: 'completed' | 'uncompleted' } | null;
  clearRoadmapToast: () => void;
  retryLoadRoadmap: () => void;
  undoTaskCompletion: (taskId: string) => Promise<void>;
  generateRoadmap: (role?: string) => void;
  toggleTaskCompletion: (taskId: string) => void;
  addProject: (project: Omit<ProjectItem, 'id' | 'createdAt' | 'verificationStatus'>) => void;
  updateProject: (project: ProjectItem) => void;
  deleteProject: (projectId: string) => void;
  updateSkillLevel: (skillName: string, level: number) => void;
  addSelfReportedSkill: (skillName: string, category: any, level: number) => void;
  recordAssessmentResult: (
    categoryScores: { category: string; score: number }[],
    skillScores?: { skillName: string; category: any; score: number }[]
  ) => void;
  recordFullAssessmentResult: (result: AssessmentResult) => void;
}

const StudentContext = createContext<StudentContextType | undefined>(undefined);

export const StudentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, updateProfile } = useAuth();

  // State loaded from isolated user storage with backend profile fallback
  const [targetRole, setTargetRoleState] = useState<string>(() => {
    return user ? StorageService.getUserTargetRole(user.id, user.targetRole) : '';
  });

  const [targetDomain, setTargetDomainState] = useState<string>(() => {
    if (!user) return 'web-dev';
    const userRole = StorageService.getUserTargetRole(user.id, user.targetRole);
    let fallbackDomain: string | undefined;
    if (userRole) {
      const d = getDomainByRoleTitle(userRole);
      if (d) fallbackDomain = d.id;
    }
    const savedDomain = StorageService.getUserTargetDomain(user.id, fallbackDomain);
    if (savedDomain) return savedDomain;
    return fallbackDomain || 'web-dev';
  });

  const [skills, setSkills] = useState<SkillItem[]>(() => {
    return user ? StorageService.getUserSkills(user.id) : [];
  });

  const [roadmap, setRoadmap] = useState<StudentRoadmap | null>(() => {
    if (!user) return null;
    const userRole = StorageService.getUserTargetRole(user.id);
    const userDomain = StorageService.getUserTargetDomain(user.id);
    const resolved = resolveDomainTrack(userRole || userDomain);
    const saved = StorageService.getUserRoadmap(user.id, resolved.trackKey);
    if (saved) return saved;
    if (user.id === DEMO_STUDENT_ID && resolved.trackKey === 'web-dev') {
      return initialStudentRoadmap;
    }
    if (userRole || userDomain) {
      return getDomainRoadmap(userRole || userDomain);
    }
    return null;
  });

  const [projects, setProjects] = useState<ProjectItem[]>(() => {
    return user ? StorageService.getUserProjects(user.id) : [];
  });

  const [assessmentHistory, setAssessmentHistory] = useState<AssessmentResult[]>(() => {
    return user ? StorageService.getUserAssessmentHistory(user.id) : [];
  });

  const [hasReviewedGaps, setHasReviewedGaps] = useState<boolean>(() => {
    return user ? StorageService.getUserReviewedGaps(user.id) : false;
  });

  const [hasReviewedPassport, setHasReviewedPassport] = useState<boolean>(() => {
    return user ? StorageService.getUserPassportReviewed(user.id) : false;
  });

  const [onboardingDismissed, setOnboardingDismissedState] = useState<boolean>(() => {
    return user ? StorageService.getUserOnboardingDismissed(user.id) : false;
  });

  const [roadmapLoading, setRoadmapLoading] = useState<boolean>(false);
  const [roadmapError, setRoadmapError] = useState<string | null>(null);
  const [roadmapToast, setRoadmapToast] = useState<{
    message: string;
    taskId?: string;
    actionType?: 'completed' | 'uncompleted';
  } | null>(null);
  const [roadmapReloadToken, setRoadmapReloadToken] = useState<number>(0);

  const clearRoadmapToast = () => setRoadmapToast(null);
  const retryLoadRoadmap = () => setRoadmapReloadToken(v => v + 1);
  useEffect(() => {
    if (user) {
      const savedRole = StorageService.getUserTargetRole(user.id, user.targetRole);
      setTargetRoleState(savedRole);

      let fallbackDomain: string | undefined;
      if (savedRole) {
        const d = getDomainByRoleTitle(savedRole);
        if (d) fallbackDomain = d.id;
      }
      const savedDomain = StorageService.getUserTargetDomain(user.id, fallbackDomain);
      const effDomain = savedDomain || fallbackDomain || 'web-dev';
      setTargetDomainState(effDomain);

      const resolved = resolveDomainTrack(savedRole || effDomain);
      let userRoadmap = StorageService.getUserRoadmap(user.id, resolved.trackKey);
      if (!userRoadmap) {
        if (user.id === DEMO_STUDENT_ID && resolved.trackKey === 'web-dev') {
          userRoadmap = initialStudentRoadmap;
        } else if (savedRole || savedDomain) {
          userRoadmap = getDomainRoadmap(savedRole || savedDomain);
        }
      }

      setSkills(StorageService.getUserSkills(user.id));
      setRoadmap(userRoadmap);
      setProjects(StorageService.getUserProjects(user.id));
      setAssessmentHistory(StorageService.getUserAssessmentHistory(user.id));
      setHasReviewedGaps(StorageService.getUserReviewedGaps(user.id));
      setHasReviewedPassport(StorageService.getUserPassportReviewed(user.id));
      setOnboardingDismissedState(StorageService.getUserOnboardingDismissed(user.id));
    } else {
      setTargetRoleState('');
      setTargetDomainState('web-dev');
      setSkills([]);
      setRoadmap(null);
      setProjects([]);
      setAssessmentHistory([]);
      setHasReviewedGaps(false);
      setHasReviewedPassport(false);
      setOnboardingDismissedState(false);
    }
  }, [user?.id, user?.targetRole]);

  // Reconcile authoritative passport and verified status from SQLite backend
  useEffect(() => {
    if (!user) return;

    let isMounted = true;
    SkillSyncService.fetchMyPassport(user).then((passport) => {
      if (!isMounted || !passport) return;

      // 1. Reconcile verified skills from backend
      if (Array.isArray(passport.skills) && passport.skills.length > 0) {
        setSkills((prevSkills) => {
          const updated = [...prevSkills];
          const backendSkillMap = new Map<string, any>();
          passport.skills.forEach((bs: any) => {
            const name = (bs.skill_name || bs.name || '').toLowerCase();
            if (name) backendSkillMap.set(name, bs);
          });

          const matchedNames = new Set<string>();
          for (let i = 0; i < updated.length; i++) {
            const localName = updated[i].name.toLowerCase();
            const bSkill = backendSkillMap.get(localName);
            if (bSkill) {
              matchedNames.add(localName);
              const mapped = SkillSyncService.mapBackendSkillToFrontend(bSkill);
              if (mapped.status === 'verified') {
                updated[i] = {
                  ...updated[i],
                  status: 'verified',
                  proficiencyLevel: Math.max(updated[i].proficiencyLevel, mapped.proficiencyLevel),
                  verifiedBy: mapped.verifiedBy || updated[i].verifiedBy
                };
              } else if (mapped.status === 'assessment-completed' && updated[i].status === 'self-reported') {
                updated[i] = {
                  ...updated[i],
                  status: 'assessment-completed',
                  proficiencyLevel: Math.max(updated[i].proficiencyLevel, mapped.proficiencyLevel)
                };
              }
            }
          }

          passport.skills.forEach((bs: any) => {
            const bName = (bs.skill_name || bs.name || '').toLowerCase();
            if (!matchedNames.has(bName) && bs.skill_name) {
              updated.push(SkillSyncService.mapBackendSkillToFrontend(bs));
            }
          });

          return updated;
        });
      }

      // 2. Reconcile verified project evidence
      if (Array.isArray(passport.evidence) && passport.evidence.length > 0) {
        const verifiedUrls = new Set<string>();
        passport.evidence.forEach((ev: any) => {
          if (ev.verification_status === 'verified' && ev.reference_url) {
            verifiedUrls.add(ev.reference_url.toLowerCase().trim());
          }
        });

        if (verifiedUrls.size > 0) {
          setProjects((prevProjects) =>
            prevProjects.map((p) => {
              if (verifiedUrls.has(p.repositoryUrl.toLowerCase().trim())) {
                return { ...p, verificationStatus: 'verified' };
              }
              return p;
            })
          );
        }
      }

      // 3. Reconcile genuine assessment attempts from SQLite backend
      AssessmentV2Service.getHistory(undefined, user).then((histRes) => {
        if (!isMounted || !histRes?.data || !Array.isArray(histRes.data)) return;
        if (histRes.data.length > 0) {
          setAssessmentHistory((prev) => {
            const map = new Map<string, AssessmentResult>();
            prev.forEach((p) => map.set(p.id, p));
            histRes.data.forEach((item: any) => {
              const dateStr = item.completedAt ? item.completedAt.split('T')[0] : new Date().toISOString().split('T')[0];
              const converted: AssessmentResult = {
                id: item.id || item.sessionId,
                domainId: item.domainId || 'web-dev',
                targetRole: item.role || 'Full-Stack Developer',
                overallScore: item.score ?? item.technicalScore ?? item.overallScore ?? 0,
                knowledgeScore: item.knowledgeScore ?? 0,
                practicalScore: item.practicalScore ?? 0,
                completedAt: dateStr,
                categoryScores: [],
                skillScores: [],
                strengths: [],
                improvements: [],
                answersSummary: [],
                practicalSummary: [],
              };
              map.set(converted.id, { ...(map.get(converted.id) || {}), ...converted });
            });
            const merged = Array.from(map.values()).sort(
              (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
            );
            StorageService.saveUserAssessmentHistory(user.id, merged);
            return merged;
          });
        }
      }).catch(() => {});
    });

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  // Hydrate roadmap progress from SQLite backend
  useEffect(() => {
    if (!user || user.role !== 'student') return;

    let isMounted = true;
    const resolved = resolveDomainTrack(targetRole || targetDomain);
    const trackKey = resolved.trackKey;

    setRoadmapLoading(true);
    setRoadmapError(null);

    apiClient
      .get<{
        success: boolean;
        data: {
          trackKey: string;
          completedTaskIds?: string[];
          taskProgress?: Record<string, {
            status: 'not_started' | 'in_progress' | 'completed';
            completedAt?: string;
            completionType?: 'self_reported' | 'verified';
            verifiedBy?: string;
          }>;
        };
      }>(`/api/roadmap?trackKey=${encodeURIComponent(trackKey)}`)
      .then((res) => {
        if (!isMounted) return;
        setRoadmapLoading(false);
        setRoadmapError(null);

        const data = res?.data;
        const progressMap = data?.taskProgress || {};
        const completedIds = new Set(data?.completedTaskIds || Object.keys(progressMap));

        setRoadmap((prev) => {
          if (!prev) return prev;
          let totalTasks = 0;
          let completedCount = 0;

          const updatedStages = prev.stages.map((stage) => {
            const updatedTasks = stage.tasks.map((task) => {
              const pDetail = progressMap[task.id];
              const isCompleted = pDetail
                ? pDetail.status === 'completed'
                : completedIds.has(task.id) || task.isCompleted;

              if (isCompleted) completedCount++;

              return {
                ...task,
                isCompleted,
                status: pDetail?.status || (isCompleted ? ('completed' as const) : ('not_started' as const)),
                completedAt: pDetail?.completedAt || task.completedAt,
                completionType: pDetail?.completionType || (isCompleted ? (task.completionType || 'self_reported') : undefined),
                verifiedBy: pDetail?.verifiedBy || task.verifiedBy,
              };
            });
            totalTasks += updatedTasks.length;
            return { ...stage, tasks: updatedTasks };
          });

          const overallProgress = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;
          return {
            ...prev,
            stages: updatedStages,
            overallProgress,
          };
        });
      })
      .catch((err) => {
        if (!isMounted) return;
        setRoadmapLoading(false);
        console.warn('Roadmap hydration notice:', err?.message);
        // Do NOT reset cached progress to 0% on network error! Preserve cached roadmap.
        setRoadmapError(err?.message || 'Unable to sync roadmap with server. Showing cached progress.');
      });

    return () => {
      isMounted = false;
    };
  }, [user?.id, targetDomain, targetRole, roadmapReloadToken]);

  // Persist state changes to user-scoped storage
  useEffect(() => {
    if (user) {
      StorageService.saveUserSkills(user.id, skills);
    }
  }, [skills, user]);

  useEffect(() => {
    if (user) {
      StorageService.saveUserRoadmap(user.id, roadmap);
    }
  }, [roadmap, user]);

  useEffect(() => {
    if (user) {
      StorageService.saveUserProjects(user.id, projects);
    }
  }, [projects, user]);

  useEffect(() => {
    if (user) {
      StorageService.saveUserAssessmentHistory(user.id, assessmentHistory);
    }
  }, [assessmentHistory, user]);

  const setTargetDomain = (domainId: string) => {
    setTargetDomainState(domainId);
    if (user) {
      StorageService.saveUserTargetDomain(user.id, domainId);
    }

    const resolved = resolveDomainTrack(domainId);
    let roleToUse = targetRole;
    const currentDomain = getDomainByRoleTitle(targetRole);
    if (!currentDomain || currentDomain.id !== domainId) {
      roleToUse = resolved.canonicalRoleTitle;
      setTargetRoleState(roleToUse);
      if (user) {
        StorageService.saveUserTargetRole(user.id, roleToUse);
        updateProfile({ targetRole: roleToUse });
      }
    }

    // Immediately switch roadmap to match selected domain
    let targetRoadmap: StudentRoadmap | null = null;
    if (user) {
      targetRoadmap = StorageService.getUserRoadmap(user.id, resolved.trackKey);
    }
    if (!targetRoadmap) {
      if (user?.id === DEMO_STUDENT_ID && resolved.trackKey === 'web-dev') {
        targetRoadmap = initialStudentRoadmap;
      } else {
        targetRoadmap = getDomainRoadmap(roleToUse || domainId, skillGaps);
      }
    }
    targetRoadmap = personalizeRoadmapWithAssessmentAndGaps(targetRoadmap, skillGaps, assessmentHistory, roleToUse || domainId);

    setRoadmap(targetRoadmap);
    if (user) {
      StorageService.saveUserRoadmap(user.id, targetRoadmap, resolved.trackKey);
    }
  };

  const setTargetRole = (role: string, explicitDomainId?: string) => {
    setTargetRoleState(role);

    // Auto-detect or synchronize domain
    let domainIdToSave = explicitDomainId;
    if (!domainIdToSave && role) {
      const matchedDomain = getDomainByRoleTitle(role);
      if (matchedDomain) {
        domainIdToSave = matchedDomain.id;
      }
    }

    if (domainIdToSave) {
      setTargetDomainState(domainIdToSave);
      if (user) {
        StorageService.saveUserTargetDomain(user.id, domainIdToSave);
      }
    }

    if (user) {
      StorageService.saveUserTargetRole(user.id, role);
      updateProfile({ targetRole: role });
    }

    // Immediately switch to the corresponding domain roadmap
    const resolved = resolveDomainTrack(role || domainIdToSave);
    let targetRoadmap: StudentRoadmap | null = null;
    if (user) {
      targetRoadmap = StorageService.getUserRoadmap(user.id, resolved.trackKey);
    }
    if (!targetRoadmap) {
      if (user?.id === DEMO_STUDENT_ID && resolved.trackKey === 'web-dev') {
        targetRoadmap = initialStudentRoadmap;
      } else {
        targetRoadmap = getDomainRoadmap(role || domainIdToSave || 'web-dev', skillGaps);
      }
    }
    targetRoadmap = personalizeRoadmapWithAssessmentAndGaps(targetRoadmap, skillGaps, assessmentHistory, role || domainIdToSave);

    setRoadmap(targetRoadmap);
    if (user) {
      StorageService.saveUserRoadmap(user.id, targetRoadmap, resolved.trackKey);
    }
  };

  const markGapsReviewed = () => {
    setHasReviewedGaps(true);
    if (user) {
      StorageService.setUserReviewedGaps(user.id, true);
    }
  };

  const markPassportReviewed = () => {
    setHasReviewedPassport(true);
    if (user) {
      StorageService.setUserPassportReviewed(user.id, true);
    }
  };

  const setOnboardingDismissed = (dismissed: boolean) => {
    setOnboardingDismissedState(dismissed);
    if (user) {
      StorageService.setUserOnboardingDismissed(user.id, dismissed);
    }
  };

  // Generate clean roadmap tailored to selected role
  const generateRoadmap = (roleToGenerate?: string) => {
    const role = roleToGenerate || targetRole || targetDomain || 'Full-Stack Developer';
    const resolved = resolveDomainTrack(role);
    let newRoadmap = getDomainRoadmap(role, skillGaps);
    newRoadmap = personalizeRoadmapWithAssessmentAndGaps(newRoadmap, skillGaps, assessmentHistory, role);
    setRoadmap(newRoadmap);
    if (user) {
      StorageService.saveUserRoadmap(user.id, newRoadmap, resolved.trackKey);
    }
  };

  // Toggle tasks in student's roadmap with optimistic updates, rollback, and undo support
  const toggleTaskCompletion = async (taskId: string) => {
    if (!roadmap) return;

    let targetTask: RoadmapTask | undefined;
    for (const stage of roadmap.stages) {
      targetTask = stage.tasks.find(t => t.id === taskId);
      if (targetTask) break;
    }
    if (!targetTask) return;

    const previousRoadmap: StudentRoadmap = JSON.parse(JSON.stringify(roadmap));
    const nextStatus = !targetTask.isCompleted;

    let totalTasks = 0;
    let completedTasks = 0;

    const updatedStages = roadmap.stages.map(stage => {
      const updatedTasks = stage.tasks.map(task => {
        if (task.id === taskId) {
          if (nextStatus) completedTasks++;
          return {
            ...task,
            isCompleted: nextStatus,
            status: nextStatus ? ('completed' as const) : ('not_started' as const),
            completionType: nextStatus ? ('self_reported' as const) : undefined,
            completedAt: nextStatus ? new Date().toISOString() : undefined,
          };
        }
        if (task.isCompleted) completedTasks++;
        return task;
      });
      totalTasks += updatedTasks.length;
      return { ...stage, tasks: updatedTasks };
    });

    const overallProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Prioritize high-priority skill gap task for recommendation
    let nextTaskId = '';
    const incompletePriorityTask = updatedStages
      .flatMap(s => s.tasks)
      .find(t => !t.isCompleted && t.prioritySkillGap);

    if (incompletePriorityTask) {
      nextTaskId = incompletePriorityTask.id;
    } else {
      for (const stage of updatedStages) {
        const firstIncomplete = stage.tasks.find(t => !t.isCompleted);
        if (firstIncomplete) {
          nextTaskId = firstIncomplete.id;
          break;
        }
      }
    }

    const updatedRoadmap: StudentRoadmap = {
      ...roadmap,
      stages: updatedStages,
      overallProgress,
      recommendedNextTaskId: nextTaskId
    };

    // Optimistic UI update
    setRoadmap(updatedRoadmap);
    setRoadmapToast({
      message: nextStatus
        ? `Marked "${targetTask.topic}" as completed`
        : `Marked "${targetTask.topic}" as incomplete`,
      taskId,
      actionType: nextStatus ? 'completed' : 'uncompleted'
    });

    if (user) {
      const resolved = resolveDomainTrack(roadmap.targetRole || targetRole);
      StorageService.saveUserRoadmap(user.id, updatedRoadmap, resolved.trackKey);

      if (user.role === 'student') {
        try {
          const res = await apiClient.post<{
            success: boolean;
            data: {
              trackKey: string;
              taskProgress: Record<string, {
                status: 'not_started' | 'in_progress' | 'completed';
                completedAt?: string;
                completionType?: 'self_reported' | 'verified';
                verifiedBy?: string;
              }>;
              completedTaskIds: string[];
            };
          }>('/api/roadmap/task', {
            trackKey: resolved.trackKey,
            taskId,
            action: nextStatus ? 'complete' : 'uncomplete',
            completionType: 'self_reported'
          });

          if (res?.data?.taskProgress) {
            const tp = res.data.taskProgress[taskId];
            if (tp) {
              setRoadmap(prev => {
                if (!prev) return prev;
                return {
                  ...prev,
                  stages: prev.stages.map(s => ({
                    ...s,
                    tasks: s.tasks.map(t =>
                      t.id === taskId
                        ? {
                            ...t,
                            status: tp.status,
                            completedAt: tp.completedAt,
                            completionType: tp.completionType,
                            verifiedBy: tp.verifiedBy
                          }
                        : t
                    )
                  }))
                };
              });
            }
          }
        } catch (err: any) {
          console.error('Failed to sync task progress to backend:', err?.message);
          // Rollback on network failure
          setRoadmap(previousRoadmap);
          StorageService.saveUserRoadmap(user.id, previousRoadmap, resolved.trackKey);
          setRoadmapToast({
            message: `Could not save changes to server. Reverted "${targetTask.topic}".`,
            taskId: undefined
          });
        }
      }
    }
  };

  // Undo task completion with server synchronization and rollback
  const undoTaskCompletion = async (taskId: string) => {
    if (!roadmap) return;

    let targetTask: RoadmapTask | undefined;
    for (const stage of roadmap.stages) {
      targetTask = stage.tasks.find(t => t.id === taskId);
      if (targetTask) break;
    }
    if (!targetTask) return;

    const previousRoadmap: StudentRoadmap = JSON.parse(JSON.stringify(roadmap));
    const nextStatus = !targetTask.isCompleted;

    let totalTasks = 0;
    let completedTasks = 0;

    const updatedStages = roadmap.stages.map(stage => {
      const updatedTasks = stage.tasks.map(task => {
        if (task.id === taskId) {
          if (nextStatus) completedTasks++;
          return {
            ...task,
            isCompleted: nextStatus,
            status: nextStatus ? ('completed' as const) : ('not_started' as const),
            completionType: nextStatus ? ('self_reported' as const) : undefined,
            completedAt: nextStatus ? new Date().toISOString() : undefined,
          };
        }
        if (task.isCompleted) completedTasks++;
        return task;
      });
      totalTasks += updatedTasks.length;
      return { ...stage, tasks: updatedTasks };
    });

    const overallProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const updatedRoadmap: StudentRoadmap = {
      ...roadmap,
      stages: updatedStages,
      overallProgress
    };

    setRoadmap(updatedRoadmap);
    setRoadmapToast(null);

    if (user) {
      const resolved = resolveDomainTrack(roadmap.targetRole || targetRole);
      StorageService.saveUserRoadmap(user.id, updatedRoadmap, resolved.trackKey);

      if (user.role === 'student') {
        try {
          await apiClient.post('/api/roadmap/task', {
            trackKey: resolved.trackKey,
            taskId,
            action: 'undo'
          });
        } catch (err: any) {
          console.error('Failed to undo task completion on server:', err?.message);
          setRoadmap(previousRoadmap);
          StorageService.saveUserRoadmap(user.id, previousRoadmap, resolved.trackKey);
        }
      }
    }
  };

  // Project management: start as evidence-submitted
  const addProject = (projectData: Omit<ProjectItem, 'id' | 'createdAt' | 'verificationStatus'>) => {
    const newProject: ProjectItem = {
      ...projectData,
      id: `proj-${Date.now()}`,
      verificationStatus: 'evidence-submitted',
      createdAt: new Date().toISOString().split('T')[0]
    };
    setProjects(prev => [newProject, ...prev]);

    setSkills(prev => prev.map(s => {
      if (projectData.skillsDemonstrated.includes(s.name) && s.status === 'self-reported') {
        return { ...s, status: 'evidence-submitted' };
      }
      return s;
    }));

    if (user) {
      SkillSyncService.submitProjectEvidence(newProject, user, targetDomain);
    }
  };

  const updateProject = (updated: ProjectItem) => {
    setProjects(prev => prev.map(p => p.id === updated.id ? updated : p));
    if (user) {
      SkillSyncService.submitProjectEvidence(updated, user, targetDomain);
    }
  };

  const deleteProject = (projectId: string) => {
    setProjects(prev => prev.filter(p => p.id !== projectId));
  };

  const updateSkillLevel = (skillName: string, level: number) => {
    setSkills(prev => prev.map(s => {
      if (s.name.toLowerCase() === skillName.toLowerCase()) {
        return { ...s, proficiencyLevel: level };
      }
      return s;
    }));
  };

  const addSelfReportedSkill = (skillName: string, category: any, level: number) => {
    const existing = skills.find(s => s.name.toLowerCase() === skillName.toLowerCase());
    if (existing) {
      setSkills(prev => prev.map(s => s.name.toLowerCase() === skillName.toLowerCase() ? { ...s, proficiencyLevel: level } : s));
    } else {
      const newSkill: SkillItem = {
        id: `sk-${Date.now()}`,
        name: skillName,
        category,
        proficiencyLevel: level,
        status: 'self-reported'
      };
      setSkills(prev => [...prev, newSkill]);
    }
  };

  // Record comprehensive assessment results with per-skill objective proficiency
  const recordFullAssessmentResult = (result: AssessmentResult) => {
    setAssessmentHistory(prev => [result, ...prev]);

    setSkills(prev => {
      const updated = [...prev];
      const today = new Date().toISOString().split('T')[0];

      result.skillScores.forEach(item => {
        // Map 1-5 objective level:
        // Level 5: Expert (>=90%)
        // Level 4: Advanced (80-89%)
        // Level 3: Proficient (60-79%)
        // Level 2: Developing (40-59%)
        // Level 1: Beginner (<40%)
        let assessedLevel = item.demonstratedLevel || 1;
        if (!item.demonstratedLevel) {
          if (item.score >= 90) assessedLevel = 5;
          else if (item.score >= 80) assessedLevel = 4;
          else if (item.score >= 60) assessedLevel = 3;
          else if (item.score >= 40) assessedLevel = 2;
          else assessedLevel = 1;
        }

        const existingIdx = updated.findIndex(
          s => s.name.toLowerCase() === item.skillName.toLowerCase()
        );

        if (existingIdx >= 0) {
          updated[existingIdx] = {
            ...updated[existingIdx],
            proficiencyLevel: Math.max(updated[existingIdx].proficiencyLevel, assessedLevel),
            status: 'assessment-completed',
            lastAssessedAt: today,
            domainId: result.domainId
          };
        } else {
          updated.push({
            id: `sk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            name: item.skillName,
            category: item.category,
            proficiencyLevel: assessedLevel,
            status: 'assessment-completed',
            lastAssessedAt: today,
            domainId: result.domainId
          });
        }
      });

      return updated;
    });

    if (user) {
      SkillSyncService.submitAssessmentResult(result, user);
    }
  };

  // Backward-compatible record assessment result method
  const recordAssessmentResult = (
    categoryScores: { category: string; score: number }[],
    skillScores?: { skillName: string; category: any; score: number }[]
  ) => {
    const today = new Date().toISOString().split('T')[0];

    if (skillScores && skillScores.length > 0) {
      const detailedSkills = skillScores.map(ss => {
        let level = 1;
        if (ss.score >= 90) level = 5;
        else if (ss.score >= 80) level = 4;
        else if (ss.score >= 60) level = 3;
        else if (ss.score >= 40) level = 2;

        return {
          skillName: ss.skillName,
          category: ss.category,
          score: ss.score,
          demonstratedLevel: level,
          levelLabel: level >= 5 ? 'Expert' : level === 4 ? 'Advanced' : level === 3 ? 'Proficient' : level === 2 ? 'Developing' : 'Beginner',
          knowledgeScore: ss.score,
          totalEvaluated: 1
        } as const;
      });

      const totalScore = Math.round(skillScores.reduce((acc, s) => acc + s.score, 0) / skillScores.length);

      recordFullAssessmentResult({
        id: `asmt-${Date.now()}`,
        domainId: targetDomain || 'web-dev',
        targetRole: targetRole || 'Full-Stack Developer',
        overallScore: totalScore,
        knowledgeScore: totalScore,
        practicalScore: totalScore,
        completedAt: today,
        categoryScores: categoryScores.map(c => ({
          category: c.category,
          score: c.score,
          totalQuestions: 1,
          correctCount: c.score >= 60 ? 1 : 0,
          level: c.score >= 80 ? 'Advanced' : c.score >= 60 ? 'Proficient' : 'Developing'
        })),
        skillScores: detailedSkills,
        strengths: detailedSkills.filter(s => s.score >= 70).map(s => s.skillName),
        improvements: detailedSkills.filter(s => s.score < 70).map(s => s.skillName),
        answersSummary: []
      });
    }
  };

  // Metrics calculation
  const assessedSkillsCount = useMemo(() => {
    return skills.filter(s => s.status === 'assessment-completed' || s.status === 'verified').length;
  }, [skills]);

  const selfReportedSkillsCount = useMemo(() => {
    return skills.filter(s => s.status === 'self-reported').length;
  }, [skills]);

  // Skill Gaps calculation for the active target role
  const skillGaps: SkillGapItem[] = useMemo(() => {
    if (!targetRole || targetRole === 'Not selected yet') {
      return [];
    }

    const requirements = getRoleRequirements(targetRole);
    if (!requirements || requirements.requiredSkills.length === 0) {
      return [];
    }

    // Build map of prerequisite dependencies
    const prereqBlockers = new Map<string, number>();
    requirements.requiredSkills.forEach(req => {
      const name = req.skillName.toLowerCase();
      // Common foundational blockers
      if (name.includes('html5') || name.includes('javascript') || name.includes('python')) {
        prereqBlockers.set(name, 3);
      } else if (name.includes('node.js') || name.includes('react.js') || name.includes('machine learning fund')) {
        prereqBlockers.set(name, 2);
      }
    });

    return requirements.requiredSkills.map(req => {
      const studentSkill = skills.find(s => s.name.toLowerCase() === req.skillName.toLowerCase());
      const isVerified = studentSkill && (studentSkill.status === 'verified' || studentSkill.status === 'assessment-completed' || studentSkill.status === 'evidence-submitted');
      const currentProficiency = isVerified ? studentSkill.proficiencyLevel : 0;
      const gapLevel = Math.max(0, req.requiredProficiency - currentProficiency);

      let gapStatus: SkillGapItem['gapStatus'] = 'EVIDENCE_NEEDED';
      let confidence: SkillGapItem['confidence'] = 'NONE';
      let evidenceStatus: SkillGapItem['evidenceStatus'] = 'INSUFFICIENT_EVIDENCE';

      if (!isVerified || currentProficiency === 0) {
        gapStatus = 'EVIDENCE_NEEDED';
        confidence = 'NONE';
        evidenceStatus = 'INSUFFICIENT_EVIDENCE';
      } else if (currentProficiency >= req.requiredProficiency) {
        gapStatus = 'BENCHMARK_MET';
        confidence = studentSkill.status === 'verified' ? 'HIGH' : 'MEDIUM';
        evidenceStatus = studentSkill.status === 'verified' ? 'VERIFIED' : 'PROVISIONAL';
      } else if (studentSkill.status === 'verified') {
        gapStatus = 'VERIFIED_GAP';
        confidence = 'HIGH';
        evidenceStatus = 'VERIFIED';
      } else {
        gapStatus = 'PRELIMINARY_GAP';
        confidence = 'MEDIUM';
        evidenceStatus = 'PROVISIONAL';
      }

      // Priority and blocker scoring
      const blockerCount = prereqBlockers.get(req.skillName.toLowerCase()) || 0;
      let priority: 'High' | 'Medium' | 'Low' = 'Low';
      let priorityRationale = '';

      if (gapLevel === 0) {
        priority = 'Low';
        priorityRationale = 'Competency benchmark goal met.';
      } else if (blockerCount > 0) {
        priority = 'High';
        priorityRationale = `Foundational blocker: required before mastering ${blockerCount} dependent competencies.`;
      } else if (req.importance === 'Critical' || gapLevel >= 3) {
        priority = 'High';
        priorityRationale = `Critical core competency with a ${gapLevel}-level gap.`;
      } else if (gapLevel >= 1) {
        priority = 'Medium';
        priorityRationale = `Demonstrated proficiency is ${gapLevel} level below target benchmark.`;
      }

      let recommendedAction = 'Proficiency goal met. Keep practicing through capstones.';
      if (gapStatus === 'EVIDENCE_NEEDED') {
        recommendedAction = blockerCount > 0
          ? `Immediate foundational priority: Take diagnostic screening for ${req.skillName}.`
          : `Submit repository evidence or complete diagnostic test for ${req.skillName}.`;
      } else if (gapLevel >= 2) {
        recommendedAction = `Immediate priority: Start with foundational ${req.skillName} modules and take a diagnostic test.`;
      } else if (gapLevel === 1) {
        recommendedAction = `Build a hands-on project demonstrating ${req.skillName} to verify Level ${req.requiredProficiency}.`;
      }

      return {
        skillName: req.skillName,
        category: req.category,
        requiredProficiency: req.requiredProficiency,
        currentProficiency,
        gapLevel,
        gapStatus,
        confidence,
        evidenceStatus,
        priority,
        priorityRationale,
        whyItMatters: req.whyItMatters,
        recommendedAction,
        verificationStatus: studentSkill ? studentSkill.status : 'self-reported',
        isMandatory: req.importance === 'Critical' || blockerCount > 0
      };
    });
  }, [targetRole, skills]);

  // Skills the student has assessed/verified that are outside the current target role
  const otherAssessedSkills: SkillItem[] = useMemo(() => {
    if (!targetRole || targetRole === 'Not selected yet') {
      return skills.filter(s => s.status !== 'self-reported');
    }

    const requirements = getRoleRequirements(targetRole);
    const requiredNames = new Set(requirements.requiredSkills.map(r => r.skillName.toLowerCase()));

    return skills.filter(s => 
      (s.status === 'assessment-completed' || s.status === 'verified' || s.status === 'evidence-submitted') &&
      !requiredNames.has(s.name.toLowerCase())
    );
  }, [targetRole, skills]);

  // Career Readiness Score calculation:
  // Readiness = 100 * sum(weight * min(requiredLevel, demonstratedLevel)) / sum(weight * requiredLevel)
  const overallReadinessScore: number | null = useMemo(() => {
    if (!targetRole || targetRole === 'Not selected yet') {
      return null;
    }
    if (assessedSkillsCount === 0 && (!assessmentHistory || assessmentHistory.length === 0)) {
      return null;
    }

    const requirements = getRoleRequirements(targetRole);
    if (!requirements || requirements.requiredSkills.length === 0) {
      if (assessmentHistory && assessmentHistory.length > 0) {
        return assessmentHistory[0].overallScore;
      }
      return null;
    }

    // Role-specific weighted readiness formula
    let totalWeightedRequired = 0;
    let earnedWeightedDemonstrated = 0;

    requirements.requiredSkills.forEach(item => {
      // Core foundational skills receive 1.5x weight
      const isCore = item.importance === 'Critical' || item.skillName.includes('JavaScript') || item.skillName.includes('Python');
      const weight = isCore ? 1.5 : 1.0;

      const studentSkill = skills.find(
        s => s.name.toLowerCase() === item.skillName.toLowerCase() && s.status !== 'self-reported'
      );
      const demonstratedLevel = studentSkill ? studentSkill.proficiencyLevel : 0;

      totalWeightedRequired += weight * item.requiredProficiency;
      earnedWeightedDemonstrated += weight * Math.min(item.requiredProficiency, demonstratedLevel);
    });

    if (totalWeightedRequired === 0) return null;

    const calculated = Math.round((earnedWeightedDemonstrated / totalWeightedRequired) * 100);
    if (calculated === 0 && assessmentHistory && assessmentHistory.length > 0) {
      return assessmentHistory[0].overallScore;
    }
    return calculated;
  }, [targetRole, skills, assessedSkillsCount, assessmentHistory]);

  return (
    <StudentContext.Provider
      value={{
        targetDomain,
        setTargetDomain,
        targetRole,
        setTargetRole,
        skills,
        roadmap,
        projects,
        skillGaps,
        otherAssessedSkills,
        overallReadinessScore,
        assessedSkillsCount,
        selfReportedSkillsCount,
        assessmentHistory,
        hasReviewedGaps,
        markGapsReviewed,
        hasReviewedPassport,
        markPassportReviewed,
        onboardingDismissed,
        setOnboardingDismissed,
        roadmapLoading,
        roadmapError,
        roadmapToast,
        clearRoadmapToast,
        retryLoadRoadmap,
        undoTaskCompletion,
        generateRoadmap,
        toggleTaskCompletion,
        addProject,
        updateProject,
        deleteProject,
        updateSkillLevel,
        addSelfReportedSkill,
        recordAssessmentResult,
        recordFullAssessmentResult
      }}
    >
      {children}
    </StudentContext.Provider>
  );
};

export const useStudent = () => {
  const context = useContext(StudentContext);
  if (!context) {
    throw new Error('useStudent must be used within a StudentProvider');
  }
  return context;
};
