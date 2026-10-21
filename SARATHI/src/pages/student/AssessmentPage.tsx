import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  XCircle,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Award,
  Terminal,
  Play,
  Clock,
  Sparkles,
  Layers,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  Code2,
  BookOpen,
  Briefcase
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { ProgressBar } from '../../components/common/ProgressBar';
import { Modal } from '../../components/common/Modal';
import { DomainRoleSelector } from '../../components/common/DomainRoleSelector';
import {
  getQuestionsForDomainAndRole,
  getPracticalTasksForDomain
} from '../../data/mockAssessments';
import { getRoleRequirements, getDomainByRoleTitle, techDomains } from '../../data/domainsCatalog';
import { useStudent } from '../../context/StudentContext';
import type { AssessmentQuestion, PracticalTask, AssessmentResult, SkillScoreBreakdown } from '../../types/assessment';
import { AssessmentV2Shell } from '../../components/assessment/AssessmentV2Shell';

const LegacyAssessmentPage: React.FC = () => {
  const {
    targetDomain,
    setTargetDomain,
    targetRole,
    setTargetRole,
    recordFullAssessmentResult
  } = useStudent();
  const navigate = useNavigate();

  // Assessment setup state
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [assessmentMode, setAssessmentMode] = useState<'combined' | 'knowledge-only' | 'practical-only'>('combined');
  const [assessmentState, setAssessmentState] = useState<'intro' | 'quiz' | 'practical' | 'confirm' | 'result'>('intro');
  const [roleModalOpen, setRoleModalOpen] = useState(false);

  // Quiz navigation state
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [activeDomainForTest, setActiveDomainForTest] = useState<string>(targetDomain || 'web-dev');

  // Practical task state
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [taskSubmissions, setTaskSubmissions] = useState<Record<string, string>>({});
  const [taskValidationResults, setTaskValidationResults] = useState<Record<string, { passed: boolean; feedback: string; testsRan: boolean }>>({});
  const [showTaskHints, setShowTaskHints] = useState(false);

  // Results review state
  const [calculatedResult, setCalculatedResult] = useState<AssessmentResult | null>(null);
  const [showAnswersAccordion, setShowAnswersAccordion] = useState(false);

  // Synchronize domain with role
  useEffect(() => {
    if (targetRole) {
      const d = getDomainByRoleTitle(targetRole);
      if (d) {
        setActiveDomainForTest(d.id);
      }
    }
  }, [targetRole]);

  // Session draft restore
  useEffect(() => {
    try {
      const savedAnswers = sessionStorage.getItem('sarathi_active_assessment_answers');
      if (savedAnswers) setSelectedAnswers(JSON.parse(savedAnswers));
      const savedTasks = sessionStorage.getItem('sarathi_active_assessment_tasks');
      if (savedTasks) setTaskSubmissions(JSON.parse(savedTasks));
    } catch {
      // Ignore
    }
  }, []);

  // Save session draft
  useEffect(() => {
    try {
      sessionStorage.setItem('sarathi_active_assessment_answers', JSON.stringify(selectedAnswers));
    } catch {
      // Ignore
    }
  }, [selectedAnswers]);

  useEffect(() => {
    try {
      sessionStorage.setItem('sarathi_active_assessment_tasks', JSON.stringify(taskSubmissions));
    } catch {
      // Ignore
    }
  }, [taskSubmissions]);

  // Role requirements & categories
  const currentRoleReqs = useMemo(() => {
    return getRoleRequirements(targetRole || 'Full-Stack Developer');
  }, [targetRole]);

  const activeDomain = useMemo(() => {
    return getDomainByRoleTitle(targetRole) || { id: activeDomainForTest, title: 'Technology' };
  }, [targetRole, activeDomainForTest]);

  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    currentRoleReqs.requiredSkills.forEach(s => cats.add(s.category));
    return ['All', ...Array.from(cats)];
  }, [currentRoleReqs]);

  // Questions and practical tasks
  const filteredQuestions: AssessmentQuestion[] = useMemo(() => {
    return getQuestionsForDomainAndRole(activeDomainForTest, targetRole, selectedCategory);
  }, [activeDomainForTest, targetRole, selectedCategory]);

  const practicalTasks: PracticalTask[] = useMemo(() => {
    return getPracticalTasksForDomain(activeDomainForTest, targetRole);
  }, [activeDomainForTest, targetRole]);

  const currentQ = filteredQuestions[currentQuestionIndex] || filteredQuestions[0];
  const currentTask = practicalTasks[currentTaskIndex] || practicalTasks[0];

  // Initialize practical task starter content
  useEffect(() => {
    if (currentTask && !taskSubmissions[currentTask.id]) {
      setTaskSubmissions(prev => ({
        ...prev,
        [currentTask.id]: currentTask.starterContent
      }));
    }
  }, [currentTask]);

  // Option selection
  const handleSelectOption = (optionIndex: number) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [currentQ.id]: optionIndex
    }));
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < filteredQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      if (assessmentMode === 'knowledge-only') {
        setAssessmentState('confirm');
      } else {
        setAssessmentState('practical');
      }
    }
  };

  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  // Run test check on practical task
  const handleValidateTask = (taskId: string) => {
    const task = practicalTasks.find(t => t.id === taskId);
    if (!task) return;

    const studentCode = taskSubmissions[taskId] || '';
    let matchesCount = 0;
    const requiredKeywords = task.expectedKeywordsOrOutputs;

    requiredKeywords.forEach(kw => {
      if (studentCode.toLowerCase().includes(kw.toLowerCase())) {
        matchesCount++;
      }
    });

    const passThreshold = Math.ceil(requiredKeywords.length * 0.7);
    const passed = matchesCount >= passThreshold;

    const feedback = passed
      ? `Passed ${matchesCount}/${requiredKeywords.length} automated test assertions.`
      : `Passed ${matchesCount}/${requiredKeywords.length} assertions. Check the task hints.`;

    setTaskValidationResults(prev => ({
      ...prev,
      [taskId]: { passed, feedback, testsRan: true }
    }));
  };

  // Final submission and grading
  const handleSubmitAssessment = () => {
    let totalQuestionsAnswered = 0;
    let totalKnowledgeCorrect = 0;
    const skillStats: Record<string, { total: number; correct: number; category: string; targetProficiency: number }> = {};
    const categoryStats: Record<string, { total: number; correct: number }> = {};

    filteredQuestions.forEach(q => {
      const userAns = selectedAnswers[q.id];
      const isAnswered = userAns !== undefined;
      const isCorrect = userAns === q.correctAnswerIndex;

      if (isAnswered) totalQuestionsAnswered++;
      if (isCorrect) totalKnowledgeCorrect++;

      if (!skillStats[q.skillName]) {
        skillStats[q.skillName] = {
          total: 0,
          correct: 0,
          category: q.category,
          targetProficiency: q.proficiencyTarget || 3
        };
      }
      skillStats[q.skillName].total++;
      if (isCorrect) skillStats[q.skillName].correct++;

      if (!categoryStats[q.category]) {
        categoryStats[q.category] = { total: 0, correct: 0 };
      }
      categoryStats[q.category].total++;
      if (isCorrect) categoryStats[q.category].correct++;
    });

    const knowledgeScore = filteredQuestions.length > 0
      ? Math.round((totalKnowledgeCorrect / filteredQuestions.length) * 100)
      : 0;

    let practicalPassedCount = 0;
    const practicalSummaryList: AssessmentResult['practicalSummary'] = [];

    practicalTasks.forEach(task => {
      const res = taskValidationResults[task.id];
      const isPassed = res ? res.passed : false;
      if (isPassed) practicalPassedCount++;

      practicalSummaryList.push({
        taskId: task.id,
        taskTitle: task.title,
        skillName: task.skillName,
        isPassed,
        feedback: res ? res.feedback : 'Submitted'
      });

      if (!skillStats[task.skillName]) {
        skillStats[task.skillName] = {
          total: 1,
          correct: isPassed ? 1 : 0,
          category: task.category,
          targetProficiency: task.proficiencyTarget || 4
        };
      } else {
        skillStats[task.skillName].total += 1;
        if (isPassed) skillStats[task.skillName].correct += 1;
      }
    });

    const practicalScore = practicalTasks.length > 0
      ? Math.round((practicalPassedCount / practicalTasks.length) * 100)
      : 100;

    const overallScore = assessmentMode === 'knowledge-only'
      ? knowledgeScore
      : assessmentMode === 'practical-only'
      ? practicalScore
      : Math.round(knowledgeScore * 0.6 + practicalScore * 0.4);

    const detailedSkillScores: SkillScoreBreakdown[] = Object.entries(skillStats).map(([sName, stat]) => {
      const skillScore = Math.round((stat.correct / stat.total) * 100);

      let demonstratedLevel = 1;
      let levelLabel: 'Beginner' | 'Developing' | 'Proficient' | 'Advanced' | 'Expert' = 'Beginner';

      if (skillScore >= 90) {
        demonstratedLevel = 5;
        levelLabel = 'Expert';
      } else if (skillScore >= 80) {
        demonstratedLevel = 4;
        levelLabel = 'Advanced';
      } else if (skillScore >= 60) {
        demonstratedLevel = 3;
        levelLabel = 'Proficient';
      } else if (skillScore >= 40) {
        demonstratedLevel = 2;
        levelLabel = 'Developing';
      }

      return {
        skillName: sName,
        category: stat.category,
        score: skillScore,
        demonstratedLevel,
        levelLabel,
        knowledgeScore,
        practicalScore,
        totalEvaluated: stat.total
      };
    });

    const detailedCategoryScores = Object.entries(categoryStats).map(([cat, stat]) => {
      const cScore = Math.round((stat.correct / stat.total) * 100);
      let levelLabel: 'Beginner' | 'Developing' | 'Proficient' | 'Advanced' | 'Expert' = 'Beginner';
      if (cScore >= 90) levelLabel = 'Expert';
      else if (cScore >= 80) levelLabel = 'Advanced';
      else if (cScore >= 60) levelLabel = 'Proficient';
      else if (cScore >= 40) levelLabel = 'Developing';

      return {
        category: cat,
        score: cScore,
        totalQuestions: stat.total,
        correctCount: stat.correct,
        level: levelLabel
      };
    });

    const strengths = detailedSkillScores.filter(s => s.score >= 60).map(s => s.skillName);
    const improvements = detailedSkillScores.filter(s => s.score < 60).map(s => s.skillName);

    const answersSummary = filteredQuestions.map(q => {
      const selected = selectedAnswers[q.id];
      return {
        questionId: q.id,
        question: q.question,
        skillName: q.skillName,
        selectedOption: selected ?? -1,
        correctOption: q.correctAnswerIndex,
        isCorrect: selected === q.correctAnswerIndex,
        explanation: q.explanation
      };
    });

    const finalResult: AssessmentResult = {
      id: `asmt-${Date.now()}`,
      domainId: activeDomainForTest,
      targetRole: targetRole || 'Full-Stack Developer',
      overallScore,
      knowledgeScore,
      practicalScore,
      completedAt: new Date().toISOString().split('T')[0],
      categoryScores: detailedCategoryScores,
      skillScores: detailedSkillScores,
      strengths,
      improvements,
      answersSummary,
      practicalSummary: practicalSummaryList
    };

    recordFullAssessmentResult(finalResult);
    setCalculatedResult(finalResult);

    sessionStorage.removeItem('sarathi_active_assessment_answers');
    sessionStorage.removeItem('sarathi_active_assessment_tasks');

    setAssessmentState('result');
  };

  const handleRetake = () => {
    setSelectedAnswers({});
    setTaskSubmissions({});
    setTaskValidationResults({});
    setCurrentQuestionIndex(0);
    setCurrentTaskIndex(0);
    setCalculatedResult(null);
    setAssessmentState('intro');
  };

  return (
    <div className="space-y-6 pb-12 max-w-4xl mx-auto">
      {/* 1. CLEAN, MODERN INTRO SCREEN */}
      {assessmentState === 'intro' && (
        <div className="space-y-6">
          {/* COMPACT HERO HEADER */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E0E7F2] shadow-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="purple" icon={<Sparkles className="w-3.5 h-3.5" />}>
                  DIAGNOSTIC ENGINE
                </Badge>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs font-semibold text-[#087BFA]">{activeDomain.title}</span>
              </div>
              <h1 className="text-2xl font-black text-[#0B1B43]">
                Technical Skill Assessment
              </h1>
              <p className="text-xs text-[#405B8B]">
                Objective evaluation benchmarking your abilities against industry requirements for <span className="font-bold text-[#0B1B43]">{targetRole || 'Full-Stack Developer'}</span>.
              </p>
            </div>

            {/* Target Role Selector Pill */}
            <div className="flex items-center gap-3 shrink-0">
              <Button
                variant="outline"
                size="md"
                onClick={() => setRoleModalOpen(true)}
                leftIcon={<Layers className="w-4 h-4 text-[#087BFA]" />}
              >
                Change Role
              </Button>
            </div>
          </div>

          {/* ACTIVE TARGET ROLE SUMMARY CARD */}
          <div className="bg-gradient-to-r from-blue-50/80 via-white to-indigo-50/60 p-5 rounded-2xl border border-blue-100/80 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#087BFA] flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5" /> Target Role Calibrated
              </span>
              <div className="flex items-center gap-2.5">
                <h3 className="text-lg font-black text-[#0B1B43]">
                  {targetRole || 'Full-Stack Developer'}
                </h3>
                <span className="text-xs text-slate-400">in</span>
                <Badge variant="blue">{activeDomain.title}</Badge>
              </div>
              <p className="text-xs text-[#405B8B] max-w-xl line-clamp-1">
                {currentRoleReqs.description}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="primary"
                size="md"
                onClick={() => {
                  if (assessmentMode === 'practical-only') setAssessmentState('practical');
                  else setAssessmentState('quiz');
                }}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Start Assessment
              </Button>
            </div>
          </div>

          {/* 4 SCANNABLE METRIC TILES */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="p-4 text-center space-y-1">
              <span className="text-[10px] font-bold text-[#405B8B] uppercase block">Format</span>
              <div className="text-sm font-extrabold text-[#0B1B43] flex items-center justify-center gap-1">
                <BookOpen className="w-3.5 h-3.5 text-[#087BFA]" />
                {filteredQuestions.length} Quiz + {practicalTasks.length} Practical
              </div>
            </Card>

            <Card className="p-4 text-center space-y-1">
              <span className="text-[10px] font-bold text-[#405B8B] uppercase block">Est. Time</span>
              <div className="text-sm font-extrabold text-[#0B1B43] flex items-center justify-center gap-1">
                <Clock className="w-3.5 h-3.5 text-[#603DF5]" />
                ~15 Mins
              </div>
            </Card>

            <Card className="p-4 text-center space-y-1">
              <span className="text-[10px] font-bold text-[#405B8B] uppercase block">Competencies</span>
              <div className="text-sm font-extrabold text-[#0B1B43] flex items-center justify-center gap-1">
                <Code2 className="w-3.5 h-3.5 text-emerald-600" />
                {currentRoleReqs.requiredSkills.length} Skills
              </div>
            </Card>

            <Card className="p-4 text-center space-y-1">
              <span className="text-[10px] font-bold text-[#405B8B] uppercase block">Proficiency</span>
              <div className="text-sm font-extrabold text-[#0B1B43] flex items-center justify-center gap-1">
                <Award className="w-3.5 h-3.5 text-amber-500" />
                Levels 1 to 5
              </div>
            </Card>
          </div>

          {/* COMPACT CONFIGURATION & SCOPE BAR */}
          <Card className="p-5 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#E0E7F2] pb-3">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-[#087BFA]" />
                <span className="text-xs font-bold text-[#0B1B43] uppercase">Assessment Scope</span>
              </div>

              {/* Mode segmented toggle */}
              <div className="flex p-1 bg-[#F4F7FC] rounded-xl border border-[#E0E7F2] text-xs">
                <button
                  type="button"
                  onClick={() => setAssessmentMode('combined')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all ${
                    assessmentMode === 'combined'
                      ? 'bg-white text-[#087BFA] shadow-xs'
                      : 'text-[#405B8B] hover:text-[#0B1B43]'
                  }`}
                >
                  Full (Quiz + Task)
                </button>
                <button
                  type="button"
                  onClick={() => setAssessmentMode('knowledge-only')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all ${
                    assessmentMode === 'knowledge-only'
                      ? 'bg-white text-[#087BFA] shadow-xs'
                      : 'text-[#405B8B] hover:text-[#0B1B43]'
                  }`}
                >
                  Quiz Only
                </button>
                <button
                  type="button"
                  onClick={() => setAssessmentMode('practical-only')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all ${
                    assessmentMode === 'practical-only'
                      ? 'bg-white text-[#087BFA] shadow-xs'
                      : 'text-[#405B8B] hover:text-[#0B1B43]'
                  }`}
                >
                  Practical Only
                </button>
              </div>
            </div>

            {/* Category Filter + Skills Pills */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="w-full sm:w-56 shrink-0">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full p-2 rounded-xl border border-[#E0E7F2] text-xs font-bold text-[#0B1B43] bg-[#F4F7FC] focus:bg-white focus:ring-2 focus:ring-[#087BFA]"
                >
                  {availableCategories.map(cat => (
                    <option key={cat} value={cat}>
                      {cat === 'All' ? 'All Skills Filter' : `Filter: ${cat}`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Skill chips */}
              <div className="flex flex-wrap gap-1.5 items-center flex-1">
                {currentRoleReqs.requiredSkills.map(s => (
                  <span
                    key={s.skillName}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-[#405B8B] font-medium"
                  >
                    {s.skillName}
                  </span>
                ))}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* 2. SLICK QUIZ SLIDE (PART A) */}
      {assessmentState === 'quiz' && (
        <div className="max-w-2xl mx-auto space-y-4">
          {/* Header Bar */}
          <div className="flex items-center justify-between text-xs font-semibold text-[#405B8B] px-1">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-[#0B1B43]">Knowledge Quiz</span>
              <span>•</span>
              <span className="text-[#087BFA]">{currentQ.skillName}</span>
            </div>
            <span>
              Question <span className="font-extrabold text-[#0B1B43]">{currentQuestionIndex + 1}</span> of {filteredQuestions.length}
            </span>
          </div>

          {/* Slim Progress Bar */}
          <ProgressBar
            progress={Math.round(((currentQuestionIndex + 1) / filteredQuestions.length) * 100)}
            color="gradient"
            size="sm"
          />

          {/* MAIN QUESTION CARD */}
          <Card className="p-6 sm:p-8 space-y-6 shadow-xs border-[#E0E7F2]">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <Badge variant={currentQ.difficulty === 'Beginner' ? 'blue' : currentQ.difficulty === 'Intermediate' ? 'purple' : 'danger'}>
                  {currentQ.difficulty}
                </Badge>
                <span className="text-slate-400 font-medium">Benchmark Level {currentQ.proficiencyTarget}/5</span>
              </div>

              <h2 className="text-lg sm:text-xl font-extrabold text-[#0B1B43] leading-snug">
                {currentQ.question}
              </h2>
            </div>

            {/* Code Snippet if present */}
            {currentQ.codeSnippet && (
              <pre className="p-4 rounded-2xl bg-slate-900 text-slate-100 text-xs font-mono overflow-x-auto border border-slate-800">
                <code>{currentQ.codeSnippet}</code>
              </pre>
            )}

            {/* TACTILE OPTION CARDS */}
            <div className="space-y-2.5 pt-1">
              {currentQ.options.map((option, idx) => {
                const isSelected = selectedAnswers[currentQ.id] === idx;
                return (
                  <div
                    key={idx}
                    onClick={() => handleSelectOption(idx)}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-start gap-3.5 text-xs sm:text-sm ${
                      isSelected
                        ? 'border-[#087BFA] bg-blue-50/70 text-[#0B1B43] font-bold shadow-xs ring-2 ring-[#087BFA]/20'
                        : 'border-[#E0E7F2] bg-white text-[#405B8B] hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 transition-colors ${
                      isSelected ? 'bg-[#087BFA] text-white' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span className="leading-relaxed pt-0.5">{option}</span>
                  </div>
                );
              })}
            </div>

            {/* NAVIGATION FOOTER */}
            <div className="flex items-center justify-between pt-4 border-t border-[#E0E7F2]">
              <Button
                variant="secondary"
                size="md"
                onClick={handlePrevQuestion}
                disabled={currentQuestionIndex === 0}
                leftIcon={<ArrowLeft className="w-4 h-4" />}
              >
                Previous
              </Button>

              <Button
                variant="primary"
                size="md"
                onClick={handleNextQuestion}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                {currentQuestionIndex === filteredQuestions.length - 1
                  ? (assessmentMode === 'knowledge-only' ? 'Review Submission' : 'Continue to Practical Task')
                  : 'Next Question'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* 3. SLICK PRACTICAL WORKBENCH SLIDE (PART B) */}
      {assessmentState === 'practical' && (
        <div className="max-w-3xl mx-auto space-y-4">
          {/* Header Bar */}
          <div className="flex items-center justify-between text-xs font-semibold text-[#405B8B] px-1">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-[#0B1B43]">Part B: Practical Exercise</span>
              <span>•</span>
              <span className="text-[#087BFA]">{currentTask.skillName}</span>
            </div>
            <Badge variant="purple">Interactive Workbench</Badge>
          </div>

          <Card className="p-6 space-y-5 border-[#E0E7F2]">
            {/* Task Info */}
            <div className="space-y-1.5">
              <h2 className="text-lg font-black text-[#0B1B43]">{currentTask.title}</h2>
              <p className="text-xs text-[#405B8B] leading-relaxed">
                {currentTask.scenario}
              </p>
            </div>

            {/* Quick 2-line instructions */}
            <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-100 text-xs space-y-1">
              <span className="font-bold text-[#0B1B43]">Instructions:</span>
              <ul className="text-[#405B8B] space-y-0.5 list-disc list-inside text-[11px]">
                {currentTask.instructions.slice(0, 3).map((ins, i) => (
                  <li key={i}>{ins}</li>
                ))}
              </ul>
            </div>

            {/* Code / Solution Editor */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#0B1B43] flex items-center gap-1.5">
                  <Terminal className="w-4 h-4 text-[#087BFA]" />
                  Code Solution
                </span>

                <button
                  type="button"
                  onClick={() => setShowTaskHints(!showTaskHints)}
                  className="text-xs font-bold text-[#087BFA] hover:underline"
                >
                  {showTaskHints ? 'Hide Hints' : 'View Hints'}
                </button>
              </div>

              {showTaskHints && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                  <span className="font-bold block mb-1">Hints:</span>
                  <ul className="list-disc list-inside text-[11px] space-y-0.5">
                    {currentTask.validationHints.map((hint, hIdx) => (
                      <li key={hIdx}>{hint}</li>
                    ))}
                  </ul>
                </div>
              )}

              <textarea
                rows={10}
                value={taskSubmissions[currentTask.id] || ''}
                onChange={(e) => setTaskSubmissions(prev => ({ ...prev, [currentTask.id]: e.target.value }))}
                className="w-full p-4 rounded-2xl bg-slate-900 text-slate-100 font-mono text-xs border border-slate-800 focus:ring-2 focus:ring-[#087BFA] leading-relaxed"
                placeholder="Type your code solution..."
              />
            </div>

            {/* Test Run & Feedback */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
              <Button
                variant="secondary"
                size="md"
                onClick={() => handleValidateTask(currentTask.id)}
                leftIcon={<Play className="w-4 h-4 text-[#087BFA]" />}
              >
                Run Verification Check
              </Button>

              {taskValidationResults[currentTask.id] && (
                <div className={`p-2.5 rounded-xl text-xs flex items-center gap-2 border flex-1 ${
                  taskValidationResults[currentTask.id].passed
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold'
                    : 'bg-rose-50 text-rose-800 border-rose-200'
                }`}>
                  {taskValidationResults[currentTask.id].passed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span>{taskValidationResults[currentTask.id].feedback}</span>
                </div>
              )}
            </div>

            {/* Bottom Controls */}
            <div className="flex items-center justify-between pt-4 border-t border-[#E0E7F2]">
              <Button
                variant="secondary"
                size="md"
                onClick={() => setAssessmentState('quiz')}
                leftIcon={<ArrowLeft className="w-4 h-4" />}
              >
                Back to Quiz
              </Button>

              <Button
                variant="primary"
                size="md"
                onClick={() => setAssessmentState('confirm')}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Proceed to Submit
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* 4. CLEAN CONFIRMATION MODAL */}
      <Modal
        isOpen={assessmentState === 'confirm'}
        onClose={() => setAssessmentState(assessmentMode === 'knowledge-only' ? 'quiz' : 'practical')}
        title="Ready to Submit Diagnostic Assessment?"
        subtitle="Finalize your answers to generate your skill intelligence scores."
      >
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-100 text-xs space-y-2">
            <div className="flex justify-between font-bold text-[#0B1B43]">
              <span>Target Role:</span>
              <span className="text-[#087BFA]">{targetRole || 'Full-Stack Developer'}</span>
            </div>
            <div className="flex justify-between text-[#405B8B]">
              <span>Knowledge Questions:</span>
              <span className="font-bold text-[#0B1B43]">
                {Object.keys(selectedAnswers).length} / {filteredQuestions.length} answered
              </span>
            </div>
            {assessmentMode !== 'knowledge-only' && (
              <div className="flex justify-between text-[#405B8B]">
                <span>Practical Exercise:</span>
                <span className="font-bold text-[#0B1B43]">
                  {Object.values(taskValidationResults).some(v => v.passed) ? 'Verified' : 'Draft submitted'}
                </span>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={() => setAssessmentState(assessmentMode === 'knowledge-only' ? 'quiz' : 'practical')}
            >
              Resume
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmitAssessment}
            >
              Submit & Score
            </Button>
          </div>
        </div>
      </Modal>

      {/* 5. VISUAL & CLEAN RESULTS SLIDE */}
      {assessmentState === 'result' && calculatedResult && (
        <div className="space-y-6">
          {/* Header Card */}
          <Card className="p-6 sm:p-8 space-y-6 border-[#E0E7F2]">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#E0E7F2] pb-6">
              <div className="space-y-1">
                <Badge variant="success" icon={<Award className="w-3.5 h-3.5" />}>
                  ASSESSMENT COMPLETED
                </Badge>
                <h2 className="text-2xl font-black text-[#0B1B43]">
                  Demonstrated Competency Report
                </h2>
                <p className="text-xs text-[#405B8B]">
                  Calibrated for <span className="font-bold text-[#0B1B43]">{calculatedResult.targetRole}</span>
                </p>
              </div>

              {/* Score Badge */}
              <div className="text-center bg-[#F4F7FC] p-4 rounded-2xl border border-[#E0E7F2] min-w-36">
                <span className="text-[10px] font-bold text-[#405B8B] uppercase">Overall Score</span>
                <div className="text-3xl font-black text-[#087BFA]">
                  {calculatedResult.overallScore}%
                </div>
                <span className="text-[10px] text-emerald-600 font-bold block mt-0.5">
                  {calculatedResult.overallScore >= 80 ? 'Advanced Ready' : calculatedResult.overallScore >= 60 ? 'Proficient' : 'Developing'}
                </span>
              </div>
            </div>

            {/* Split Score Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-[#405B8B] uppercase">Knowledge Quiz</span>
                  <span className="text-[#0B1B43]">{calculatedResult.knowledgeScore}%</span>
                </div>
                <ProgressBar progress={calculatedResult.knowledgeScore} color="blue" size="sm" />
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-[#405B8B] uppercase">Practical Exercise</span>
                  <span className="text-[#0B1B43]">{calculatedResult.practicalScore}%</span>
                </div>
                <ProgressBar progress={calculatedResult.practicalScore} color="purple" size="sm" />
              </div>
            </div>

            {/* Per-Skill Demonstrated Proficiency */}
            <div className="space-y-3">
              <h3 className="text-sm font-extrabold text-[#0B1B43] uppercase tracking-wider">
                Assessed Skill Proficiencies
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {calculatedResult.skillScores.map((s) => {
                  const badgeVariant =
                    s.levelLabel === 'Expert' ? 'purple' :
                    s.levelLabel === 'Advanced' ? 'blue' :
                    s.levelLabel === 'Proficient' ? 'success' :
                    s.levelLabel === 'Developing' ? 'warning' : 'gray';

                  return (
                    <div key={s.skillName} className="p-3.5 rounded-2xl bg-white border border-[#E0E7F2] space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-xs text-[#0B1B43]">{s.skillName}</span>
                        <Badge variant={badgeVariant}>
                          Level {s.demonstratedLevel}: {s.levelLabel}
                        </Badge>
                      </div>

                      <ProgressBar progress={s.score} color="gradient" size="sm" />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Expandable Answers Review Accordion */}
            <div className="pt-2 border-t border-[#E0E7F2]">
              <button
                type="button"
                onClick={() => setShowAnswersAccordion(!showAnswersAccordion)}
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-[#F8FAFC] hover:bg-slate-100 transition-all text-xs font-bold text-[#0B1B43]"
              >
                <span>Review Question Answers & Explanations ({calculatedResult.answersSummary.length} items)</span>
                {showAnswersAccordion ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
              </button>

              {showAnswersAccordion && (
                <div className="mt-3 space-y-2 max-h-72 overflow-y-auto pr-1">
                  {calculatedResult.answersSummary.map((ans, idx) => (
                    <div
                      key={ans.questionId}
                      className={`p-3 rounded-xl border text-xs space-y-1 ${
                        ans.isCorrect ? 'bg-emerald-50/50 border-emerald-200' : 'bg-rose-50/50 border-rose-200'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <span className="font-bold text-[#0B1B43]">{idx + 1}. {ans.question}</span>
                        <Badge variant={ans.isCorrect ? 'success' : 'danger'}>
                          {ans.isCorrect ? 'Correct' : 'Review'}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-[#405B8B] leading-relaxed">{ans.explanation}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-[#E0E7F2]">
              <Button
                variant="secondary"
                size="md"
                onClick={handleRetake}
                leftIcon={<RotateCcw className="w-4 h-4" />}
              >
                Retake Assessment
              </Button>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => navigate('/student/roadmap')}
                >
                  View Roadmap
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => navigate('/student/skill-gap')}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Skill Gap Analysis
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ROLE SELECTION MODAL */}
      <Modal
        isOpen={roleModalOpen}
        onClose={() => setRoleModalOpen(false)}
        title="Select Target Career Role"
        subtitle="Choose your domain and specialization to calibrate assessment questions."
        maxWidth="5xl"
      >
        <div className="space-y-4">
          <DomainRoleSelector
            selectedDomainId={activeDomainForTest}
            selectedRoleTitle={targetRole}
            onSelectRole={(roleTitle, domainId) => {
              setTargetRole(roleTitle, domainId);
              setActiveDomainForTest(domainId);
              setTargetDomain(domainId);
              setRoleModalOpen(false);
            }}
            variant="modal"
            showOverview={false}
          />
        </div>
      </Modal>
    </div>
  );
};

export const AssessmentPage: React.FC = () => {
  const isV2 = import.meta.env.VITE_ASSESSMENT_V2 === 'true';
  const { targetDomain, targetRole } = useStudent();

  if (isV2) {
    const curDomainId = targetDomain || 'web-dev';
    const curDomain = techDomains.find(d => d.id === curDomainId);
    const domainTitle = curDomain?.title || 'Web Development';
    return (
      <AssessmentV2Shell
        domainId={curDomainId}
        domainTitle={domainTitle}
        roleTitle={targetRole || 'Full-Stack Developer'}
      />
    );
  }

  return <LegacyAssessmentPage />;
};

