import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Map,
  CheckCircle2,
  Circle,
  ExternalLink,
  Clock,
  BookOpen,
  Sparkles,
  Layers,
  AlertTriangle,
  RotateCcw,
  RefreshCw,
  X,
  ShieldCheck,
  Check,
  ChevronDown,
  ChevronUp,
  Search,
  FolderGit2,
  Award,
  ArrowRight,
  Code2,
  CheckSquare
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { ProgressBar } from '../../components/common/ProgressBar';
import { DomainRoleSelector } from '../../components/common/DomainRoleSelector';
import { useStudent } from '../../context/StudentContext';

export const RoadmapPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    roadmap,
    toggleTaskCompletion,
    undoTaskCompletion,
    targetRole,
    targetDomain,
    setTargetRole,
    setTargetDomain,
    generateRoadmap,
    roadmapLoading,
    roadmapError,
    retryLoadRoadmap,
    roadmapToast,
    clearRoadmapToast
  } = useStudent();

  const [showRoleSelector, setShowRoleSelector] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'incomplete' | 'gaps' | 'strong' | 'projects'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedStages, setExpandedStages] = useState<Record<string, boolean>>({});
  const [expandedPractice, setExpandedPractice] = useState<Record<string, boolean>>({});

  // Auto-dismiss undo toast after 6 seconds
  useEffect(() => {
    if (!roadmapToast) return;
    const timer = setTimeout(() => {
      clearRoadmapToast();
    }, 6000);
    return () => clearTimeout(timer);
  }, [roadmapToast, clearRoadmapToast]);

  // Expand all stages by default when roadmap loads
  useEffect(() => {
    if (roadmap?.stages) {
      const initial: Record<string, boolean> = {};
      roadmap.stages.forEach(s => {
        initial[s.id] = true;
      });
      setExpandedStages(initial);
    }
  }, [roadmap?.stages?.length, targetDomain, targetRole]);

  const toggleStage = (stageId: string) => {
    setExpandedStages(prev => ({
      ...prev,
      [stageId]: !prev[stageId]
    }));
  };

  const togglePracticePrompt = (taskId: string) => {
    setExpandedPractice(prev => ({
      ...prev,
      [taskId]: !prev[taskId]
    }));
  };

  const expandAllStages = () => {
    if (!roadmap?.stages) return;
    const allExpanded: Record<string, boolean> = {};
    roadmap.stages.forEach(s => { allExpanded[s.id] = true; });
    setExpandedStages(allExpanded);
  };

  const collapseAllStages = () => {
    if (!roadmap?.stages) return;
    const allCollapsed: Record<string, boolean> = {};
    roadmap.stages.forEach(s => { allCollapsed[s.id] = false; });
    setExpandedStages(allCollapsed);
  };

  // Filter metrics
  const allTasks = useMemo(() => {
    return roadmap?.stages.flatMap(s => s.tasks) || [];
  }, [roadmap]);

  const gapTasksCount = useMemo(() => {
    return allTasks.filter(t => t.prioritySkillGap).length;
  }, [allTasks]);

  const strongTasksCount = useMemo(() => {
    return allTasks.filter(t => t.benchmarkMet || t.isStrong).length;
  }, [allTasks]);

  const incompleteTasksCount = useMemo(() => {
    return allTasks.filter(t => !t.isCompleted).length;
  }, [allTasks]);

  const projectTasksCount = useMemo(() => {
    return allTasks.filter(t => t.projectSubmissionEligible || t.resourceType === 'project').length;
  }, [allTasks]);

  // Find next recommended task object
  const recommendedTask = useMemo(() => {
    if (!roadmap?.recommendedNextTaskId) return null;
    return allTasks.find(t => t.id === roadmap.recommendedNextTaskId) || null;
  }, [roadmap?.recommendedNextTaskId, allTasks]);

  // Loading state with no cached roadmap
  if (roadmapLoading && !roadmap) {
    return (
      <div className="space-y-8 pb-32 sm:pb-36 animate-pulse">
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#E0E7F2] shadow-sm space-y-4">
          <div className="h-6 w-48 bg-slate-200 rounded-full"></div>
          <div className="h-8 w-72 bg-slate-200 rounded-lg"></div>
          <div className="h-4 w-96 bg-slate-100 rounded"></div>
        </div>
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-[#E0E7F2] text-center space-y-4">
          <RefreshCw className="w-8 h-8 text-[#087BFA] animate-spin" />
          <p className="text-sm font-semibold text-[#405B8B]">Loading your learning roadmap...</p>
        </div>
      </div>
    );
  }

  // Empty state: roadmap ready for generation
  if (!roadmap || !roadmap.stages || roadmap.stages.length === 0) {
    return (
      <div className="space-y-8 pb-32 sm:pb-36">
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#E0E7F2] shadow-sm space-y-4">
          <Badge variant="blue" icon={<Map className="w-3.5 h-3.5" />}>CAREER LEARNING ROADMAP</Badge>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-extrabold text-[#0B1B43]">
                Learning Path for {targetRole || 'Your Target Role'}
              </h2>
              <p className="text-xs text-[#405B8B]">Structured learning path with verified free curated resources.</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRoleSelector(!showRoleSelector)}
              leftIcon={<Layers className="w-4 h-4 text-[#087BFA]" />}
            >
              {showRoleSelector ? 'Hide Career Tracks' : 'Select Career Track'}
            </Button>
          </div>
        </div>

        {showRoleSelector && (
          <DomainRoleSelector
            selectedDomainId={targetDomain || 'web-dev'}
            selectedRoleTitle={targetRole || ''}
            onSelectRole={(newRole, domainId) => {
              setTargetRole(newRole, domainId);
              setTargetDomain(domainId);
              setShowRoleSelector(false);
            }}
            showOverview={false}
          />
        )}

        <Card className="text-center p-12 max-w-2xl mx-auto space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-blue-50 text-[#087BFA] flex items-center justify-center mx-auto shadow-inner">
            <Map className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-extrabold text-[#0B1B43]">Roadmap Ready for Generation</h3>
            <p className="text-xs text-[#405B8B] max-w-md mx-auto leading-relaxed">
              Your curriculum will be constructed for <strong className="text-[#0B1B43]">{targetRole || 'your chosen role'}</strong> and tailored with diagnostic skill gap priorities.
            </p>
          </div>
          <div className="pt-2">
            <Button
              size="lg"
              variant="primary"
              onClick={() => generateRoadmap()}
              leftIcon={<Sparkles className="w-5 h-5 text-yellow-300" />}
            >
              Generate Learning Roadmap
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-32 sm:pb-36 relative">
      {/* ERROR / OFFLINE BANNER (Never resets progress to 0%) */}
      {roadmapError && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-900 shadow-sm">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <div className="text-xs">
              <span className="font-bold">Offline Sync Notice: </span>
              <span>{roadmapError} Your local progress is safely preserved.</span>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={retryLoadRoadmap}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Retry Sync
          </Button>
        </div>
      )}

      {/* HEADER HERO */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#E0E7F2] shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              {roadmap.isPersonalized ? (
                <Badge variant="purple" icon={<Sparkles className="w-3.5 h-3.5 text-yellow-300" />}>
                  PERSONALIZED LEARNING ROADMAP
                </Badge>
              ) : (
                <Badge variant="blue" icon={<Map className="w-3.5 h-3.5" />}>
                  STANDARD CAREER CURRICULUM
                </Badge>
              )}

              {roadmap.targetRole && (
                <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                  Track: {roadmap.targetRole}
                </span>
              )}

              {roadmap.isPersonalized && roadmap.assessmentDate && (
                <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  Adapted from Assessment ({new Date(roadmap.assessmentDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })})
                </span>
              )}
            </div>

            <h2 className="text-2xl font-extrabold text-[#0B1B43]">
              Learning Path for {targetRole || roadmap.targetRole}
            </h2>
            <p className="text-xs text-[#405B8B]">
              Structured into {roadmap.stages.length} progressive stages with verified free curated resources and practical coding challenges.
            </p>
          </div>

          <div className="flex items-center gap-3 sm:shrink-0 flex-wrap justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/student/skill-passport')}
              leftIcon={<Award className="w-4 h-4 text-emerald-600" />}
            >
              Skill Passport
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRoleSelector(!showRoleSelector)}
              leftIcon={<Layers className="w-4 h-4 text-[#087BFA]" />}
            >
              {showRoleSelector ? 'Hide Career Tracks' : 'Change Career Domain'}
            </Button>

            <div className="text-right space-y-1 pl-2">
              <span className="text-xs font-bold text-[#405B8B]">Track Completion</span>
              <div className="text-3xl font-black text-[#087BFA]">{roadmap.overallProgress}%</div>
            </div>
          </div>
        </div>

        <ProgressBar progress={roadmap.overallProgress} color="gradient" size="md" />

        {/* HONEST UNASSESSED BANNER (Phase 2 Requirement) */}
        {!roadmap.isPersonalized && (
          <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[#0B1B43]">
            <div className="flex items-start gap-3">
              <Map className="w-5 h-5 text-[#087BFA] shrink-0 mt-0.5" />
              <div className="text-xs space-y-0.5">
                <p className="font-bold text-[#0B1B43]">
                  Standard Curriculum Mode (Unassessed)
                </p>
                <p className="text-[#405B8B] leading-relaxed">
                  You are currently following the standard foundational curriculum for <strong className="text-[#0B1B43]">{targetRole || roadmap.targetRole}</strong>. Take a 15-minute diagnostic assessment to adapt this roadmap to your verified skill gaps.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="primary"
              onClick={() => navigate('/student/assessment')}
              leftIcon={<Sparkles className="w-3.5 h-3.5 text-yellow-300" />}
              className="shrink-0"
            >
              Take Diagnostic Assessment
            </Button>
          </div>
        )}
      </div>

      {/* TWO-TIER DOMAIN & ROLE SELECTOR (Collapsible) */}
      {showRoleSelector && (
        <DomainRoleSelector
          selectedDomainId={targetDomain || 'web-dev'}
          selectedRoleTitle={targetRole || ''}
          onSelectRole={(newRole, domainId) => {
            setTargetRole(newRole, domainId);
            setTargetDomain(domainId);
            setShowRoleSelector(false);
          }}
          showOverview={false}
        />
      )}

      {/* RECOMMENDED NEXT TASK CALLOUT BANNER (Phase 4 Pacing Requirement) */}
      {recommendedTask && !recommendedTask.isCompleted && (
        <div className="bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 border border-blue-200 rounded-2xl p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#087BFA] bg-blue-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <ArrowRight className="w-3 h-3" />
                  Recommended Next Action
                </span>
                {recommendedTask.prioritySkillGap && (
                  <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-rose-500" />
                    Priority Skill Gap
                  </span>
                )}
              </div>
              <h3 className="font-extrabold text-base text-[#0B1B43]">
                {recommendedTask.topic}
              </h3>
              <p className="text-xs text-[#405B8B] max-w-2xl line-clamp-2">
                {recommendedTask.description}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <a
                href={recommendedTask.resourceUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#087BFA] bg-white border border-blue-200 px-3.5 py-2 rounded-xl hover:bg-blue-50 transition-colors"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Open Resource</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <Button
                size="sm"
                variant="primary"
                onClick={() => toggleTaskCompletion(recommendedTask.id)}
                leftIcon={<CheckSquare className="w-3.5 h-3.5" />}
              >
                Mark Completed
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* CONTROLS: FILTERS & SEARCH BAR (Phase 4 Pacing & Usability) */}
      <div className="bg-white p-4 rounded-2xl border border-[#E0E7F2] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setActiveFilter('all')}
            className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              activeFilter === 'all'
                ? 'bg-[#087BFA] text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Tasks ({allTasks.length})
          </button>
          <button
            onClick={() => setActiveFilter('incomplete')}
            className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              activeFilter === 'incomplete'
                ? 'bg-[#087BFA] text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Incomplete ({incompleteTasksCount})
          </button>
          <button
            onClick={() => setActiveFilter('gaps')}
            className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1 ${
              activeFilter === 'gaps'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
            }`}
          >
            <AlertTriangle className="w-3 h-3" />
            Priority Gaps ({gapTasksCount})
          </button>
          <button
            onClick={() => setActiveFilter('strong')}
            className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1 ${
              activeFilter === 'strong'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
            }`}
          >
            <ShieldCheck className="w-3 h-3" />
            Benchmark Met ({strongTasksCount})
          </button>
          <button
            onClick={() => setActiveFilter('projects')}
            className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1 ${
              activeFilter === 'projects'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200'
            }`}
          >
            <FolderGit2 className="w-3 h-3" />
            Projects ({projectTasksCount})
          </button>
        </div>

        {/* Search & Collapse Controls */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search topic or skill..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#087BFA]/20 focus:border-[#087BFA]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <button
            onClick={expandAllStages}
            className="text-[11px] font-semibold text-slate-500 hover:text-[#087BFA] whitespace-nowrap cursor-pointer"
          >
            Expand All
          </button>
          <span className="text-slate-300">|</span>
          <button
            onClick={collapseAllStages}
            className="text-[11px] font-semibold text-slate-500 hover:text-[#087BFA] whitespace-nowrap cursor-pointer"
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* STAGES LIST */}
      <div className="space-y-8">
        {roadmap.stages.map((stage) => {
          // Filter tasks based on activeFilter and searchQuery
          const filteredTasks = stage.tasks.filter((t) => {
            if (activeFilter === 'incomplete' && t.isCompleted) return false;
            if (activeFilter === 'gaps' && !t.prioritySkillGap) return false;
            if (activeFilter === 'strong' && !t.benchmarkMet && !t.isStrong) return false;
            if (activeFilter === 'projects' && !t.projectSubmissionEligible && t.resourceType !== 'project') return false;

            if (searchQuery.trim()) {
              const q = searchQuery.toLowerCase();
              const matchTopic = t.topic.toLowerCase().includes(q);
              const matchDesc = t.description.toLowerCase().includes(q);
              const matchSkill = t.relatedSkill?.toLowerCase().includes(q);
              return matchTopic || matchDesc || matchSkill;
            }
            return true;
          });

          const completedCount = stage.tasks.filter((t) => t.isCompleted).length;
          const isStageFinished = completedCount === stage.tasks.length && stage.tasks.length > 0;
          const isExpanded = expandedStages[stage.id] ?? true;

          // If a filter is applied and no tasks in this stage match, hide the stage
          if (filteredTasks.length === 0 && (activeFilter !== 'all' || searchQuery.trim())) {
            return null;
          }

          return (
            <div key={stage.id} className="space-y-4">
              {/* Stage Header (Collapsible) */}
              <div
                onClick={() => toggleStage(stage.id)}
                className="flex items-center justify-between bg-white px-6 py-4 rounded-2xl border border-[#E0E7F2] cursor-pointer hover:border-slate-300 transition-colors select-none"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl font-black text-sm flex items-center justify-center shrink-0 ${
                      isStageFinished
                        ? 'bg-emerald-500 text-white'
                        : 'bg-[#087BFA]/10 text-[#087BFA]'
                    }`}
                  >
                    {isStageFinished ? <CheckCircle2 className="w-5 h-5" /> : stage.stageNumber}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-[#0B1B43] flex items-center gap-2">
                      <span>{stage.title}</span>
                      <span className="text-xs font-normal text-slate-400">
                        ({stage.tasks.length} {stage.tasks.length === 1 ? 'task' : 'tasks'})
                      </span>
                    </h3>
                    <p className="text-xs text-[#405B8B]">{stage.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Badge variant={isStageFinished ? 'success' : 'blue'}>
                    {completedCount} / {stage.tasks.length} Done
                  </Badge>
                  <div className="p-1 text-slate-400 hover:text-slate-600 transition-colors">
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </div>
              </div>

              {/* Tasks List */}
              {isExpanded && (
                <div className="grid grid-cols-1 gap-4 pl-4 sm:pl-8 border-l-2 border-slate-200">
                  {filteredTasks.map((task) => {
                    const isPracticeOpen = expandedPractice[task.id] || false;

                    return (
                      <Card
                        key={task.id}
                        className={`transition-all duration-200 ${
                          task.isCompleted
                            ? 'bg-slate-50/70 border-emerald-200 opacity-90'
                            : task.prioritySkillGap
                            ? 'bg-rose-50/30 border-rose-200 hover:shadow-sm'
                            : 'bg-white hover:shadow-sm'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                          {/* Checkbox & Topic Details */}
                          <div className="flex items-start gap-4 flex-1 min-w-0">
                            <button
                              onClick={() => toggleTaskCompletion(task.id)}
                              aria-label={task.isCompleted ? `Mark ${task.topic} incomplete` : `Mark ${task.topic} complete`}
                              className="mt-1 shrink-0 p-1 text-slate-400 hover:text-[#087BFA] transition-colors cursor-pointer"
                            >
                              {task.isCompleted ? (
                                <CheckCircle2 className="w-6 h-6 text-[#16A34A]" />
                              ) : (
                                <Circle className="w-6 h-6 text-slate-300" />
                              )}
                            </button>

                            <div className="space-y-1.5 flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4
                                  className={`font-bold text-sm ${
                                    task.isCompleted ? 'line-through text-[#405B8B]' : 'text-[#0B1B43]'
                                  }`}
                                >
                                  {task.topic}
                                </h4>

                                <Badge
                                  variant={
                                    task.difficulty === 'Beginner'
                                      ? 'blue'
                                      : task.difficulty === 'Intermediate'
                                      ? 'purple'
                                      : 'warning'
                                  }
                                  size="sm"
                                >
                                  {task.difficulty}
                                </Badge>

                                {/* Priority Skill Gap Badge with diagnostic comparison */}
                                {task.prioritySkillGap && (
                                  <span className="text-[10px] bg-rose-50 text-rose-700 border border-rose-200 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3 text-rose-500" />
                                    Priority Skill Gap
                                    {task.diagnosticScore !== undefined && (
                                      <span className="font-normal opacity-90">
                                        ({task.diagnosticScore}% vs {task.benchmarkTargetScore}%)
                                      </span>
                                    )}
                                  </span>
                                )}

                                {/* Benchmark Met Badge */}
                                {task.benchmarkMet && (
                                  <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                                    Benchmark Met ({task.diagnosticScore}%)
                                  </span>
                                )}

                                {/* Completed Tag: Verified vs Self-Reported */}
                                {task.isCompleted && (
                                  <>
                                    {task.completionType === 'verified' ? (
                                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                        <ShieldCheck className="w-3 h-3 text-emerald-600" />
                                        Verified
                                      </span>
                                    ) : (
                                      <span className="text-[10px] bg-slate-100 text-slate-700 font-medium px-2 py-0.5 rounded-full flex items-center gap-1 border border-slate-200">
                                        <Check className="w-2.5 h-2.5 text-slate-500" />
                                        Self-Reported
                                      </span>
                                    )}
                                    {task.completedAt && (
                                      <span className="text-[10px] text-slate-400">
                                        {new Date(task.completedAt).toLocaleDateString(undefined, {
                                          month: 'short',
                                          day: 'numeric'
                                        })}
                                      </span>
                                    )}
                                  </>
                                )}

                                {task.isFreeResource && (
                                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">
                                    Free Resource
                                  </span>
                                )}
                              </div>

                              <p className="text-xs text-[#405B8B] leading-relaxed">{task.description}</p>

                              {/* Diagnostic Rationale or Role Relevance */}
                              <div className="text-[11px] text-[#405B8B] pt-0.5">
                                <span className="font-semibold text-[#0B1B43]">
                                  {task.whyThisTask ? 'Diagnostic Context: ' : 'Relevance: '}
                                </span>
                                <span>{task.whyThisTask || task.relevanceToRole}</span>
                              </div>

                              {/* EXPANDABLE STUDY GUIDE & HANDS-ON PRACTICE PROMPT (Phase 3 Requirement) */}
                              {task.practicePrompt && (
                                <div className="pt-2">
                                  <button
                                    onClick={() => togglePracticePrompt(task.id)}
                                    className="text-[11px] font-bold text-[#087BFA] hover:underline flex items-center gap-1 cursor-pointer"
                                  >
                                    <Code2 className="w-3.5 h-3.5" />
                                    <span>{isPracticeOpen ? 'Hide Hands-on Practice Exercise' : 'View Hands-on Practice Exercise'}</span>
                                    {isPracticeOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                  </button>

                                  {isPracticeOpen && (
                                    <div className="mt-2 p-3 bg-slate-900 text-slate-100 rounded-xl text-xs space-y-1.5 font-mono shadow-inner border border-slate-800 animate-in fade-in duration-150">
                                      <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase tracking-wider font-sans font-bold">
                                        <span>Hands-On Practical Challenge</span>
                                        <span className="text-emerald-400">Production Quality Prompt</span>
                                      </div>
                                      <p className="text-slate-200 leading-relaxed font-sans text-xs">
                                        {task.practicePrompt}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Resource Link & Ecosystem Actions */}
                          <div className="flex flex-col sm:items-end gap-2.5 shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
                            <div className="flex items-center gap-1.5 text-xs text-[#405B8B]">
                              <Clock className="w-3.5 h-3.5" />
                              <span>{task.estimatedDuration}</span>
                            </div>

                            <a
                              href={task.resourceUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-bold text-[#087BFA] hover:underline"
                            >
                              <BookOpen className="w-3.5 h-3.5" />
                              <span>{task.resourceName}</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>

                            <div className="flex items-center gap-2 flex-wrap sm:justify-end">
                              {/* Submit as Project Proof (Phase 5 Ecosystem connection) */}
                              {task.projectSubmissionEligible && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => navigate('/student/projects')}
                                  leftIcon={<FolderGit2 className="w-3.5 h-3.5 text-purple-600" />}
                                  className="text-xs"
                                >
                                  Submit Proof
                                </Button>
                              )}

                              {/* Complete Button */}
                              <Button
                                size="sm"
                                variant={task.isCompleted ? 'secondary' : 'primary'}
                                onClick={() => toggleTaskCompletion(task.id)}
                              >
                                {task.isCompleted ? 'Mark Incomplete' : 'Mark Completed'}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* FLOATING UNDO TOAST NOTIFICATION */}
      {roadmapToast && (
        <div className="fixed bottom-24 right-6 sm:right-8 z-40 bg-[#0B1B43] text-white px-4 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200 max-w-sm">
          <div className="text-xs font-medium flex-1 leading-snug">
            {roadmapToast.message}
          </div>

          {roadmapToast.taskId && (
            <Button
              size="sm"
              variant="outline"
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs px-2.5 py-1 h-7"
              onClick={() => {
                if (roadmapToast.taskId) {
                  undoTaskCompletion(roadmapToast.taskId);
                }
              }}
              leftIcon={<RotateCcw className="w-3 h-3 text-cyan-300" />}
            >
              Undo
            </Button>
          )}

          <button
            onClick={clearRoadmapToast}
            aria-label="Dismiss toast"
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
