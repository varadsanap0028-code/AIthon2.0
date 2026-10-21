import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Target,
  ArrowRight,
  Brain,
  Layers,
  RotateCcw,
  Search,
  Filter,
  Award,
  ChevronDown,
  ChevronUp,
  X,
  SlidersHorizontal,
  Sparkles
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { ProgressBar } from '../../components/common/ProgressBar';
import { DomainRoleSelector } from '../../components/common/DomainRoleSelector';
import { useStudent } from '../../context/StudentContext';
import { apiClient } from '../../services/apiClient';
import { getDomainByRoleTitle } from '../../data/domainsCatalog';
import { BenchmarkComparisonChart } from '../../components/skillgap/BenchmarkComparisonChart';
import { CompetencyDistributionCard } from '../../components/skillgap/CompetencyDistributionCard';
import { AssessmentProgressTrend } from '../../components/skillgap/AssessmentProgressTrend';
import { TopNextActions, type CuratedResource } from '../../components/skillgap/TopNextActions';
import { CompetencyCard } from '../../components/skillgap/CompetencyCard';

export const SkillGapPage: React.FC = () => {
  const {
    targetDomain,
    setTargetDomain,
    targetRole,
    setTargetRole,
    skillGaps,
    skills,
    assessmentHistory,
    otherAssessedSkills,
    overallReadinessScore,
    assessedSkillsCount,
    markGapsReviewed
  } = useStudent();
  const navigate = useNavigate();

  // Local State
  const [showRoleSelector, setShowRoleSelector] = useState(false);
  const [resources, setResources] = useState<CuratedResource[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'All' | 'High' | 'Below' | 'NeedsEvidence' | 'Met'>('All');
  const [sortOrder, setSortOrder] = useState<'gap' | 'priority' | 'alpha'>('gap');
  const [isTransferableOpen, setIsTransferableOpen] = useState(false);

  // Determine whether any assessment data or verified skill data exists
  const hasAssessmentData = useMemo(() => {
    return Boolean(
      assessedSkillsCount > 0 ||
      (assessmentHistory && assessmentHistory.length > 0) ||
      skills.some(s => s.status === 'assessment-completed' || s.status === 'verified')
    );
  }, [assessedSkillsCount, assessmentHistory, skills]);

  useEffect(() => {
    if (hasAssessmentData) {
      markGapsReviewed();
    }
  }, [hasAssessmentData, markGapsReviewed]);

  // Load Curated Learning Resources from backend API
  useEffect(() => {
    let isMounted = true;
    apiClient.get<{ success: boolean; data: CuratedResource[] }>('/api/resources')
      .then((res) => {
        if (isMounted && res?.data) {
          setResources(res.data);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  const activeDomain = useMemo(() => {
    return getDomainByRoleTitle(targetRole) || { id: targetDomain || 'web-dev', title: 'Technology' };
  }, [targetRole, targetDomain]);

  // Derived Filter Counts from authoritative data
  const highPriorityGaps = useMemo(
    () => skillGaps.filter(g => g.priority === 'High' && g.gapLevel > 0),
    [skillGaps]
  );

  const belowTargetGaps = useMemo(
    () => skillGaps.filter(g => g.currentProficiency > 0 && g.gapLevel > 0),
    [skillGaps]
  );

  const needsEvidenceGaps = useMemo(
    () => skillGaps.filter(g => g.currentProficiency === 0 || g.evidenceStatus === 'INSUFFICIENT_EVIDENCE' || g.gapStatus === 'EVIDENCE_NEEDED'),
    [skillGaps]
  );

  const goalsMetGaps = useMemo(
    () => skillGaps.filter(g => g.gapLevel === 0 || g.currentProficiency >= g.requiredProficiency),
    [skillGaps]
  );

  // Search & Filtered Competencies
  const filteredAndSortedGaps = useMemo(() => {
    let result = [...skillGaps];

    // Filter by Active Tab
    if (activeFilter === 'High') {
      result = result.filter(g => g.priority === 'High' && g.gapLevel > 0);
    } else if (activeFilter === 'Below') {
      result = result.filter(g => g.currentProficiency > 0 && g.gapLevel > 0);
    } else if (activeFilter === 'NeedsEvidence') {
      result = result.filter(g => g.currentProficiency === 0 || g.evidenceStatus === 'INSUFFICIENT_EVIDENCE' || g.gapStatus === 'EVIDENCE_NEEDED');
    } else if (activeFilter === 'Met') {
      result = result.filter(g => g.gapLevel === 0 || g.currentProficiency >= g.requiredProficiency);
    }

    // Filter by Search Query (skill name or category)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(g =>
        g.skillName.toLowerCase().includes(q) ||
        g.category.toLowerCase().includes(q)
      );
    }

    // Sort Order
    if (sortOrder === 'gap') {
      result.sort((a, b) => b.gapLevel - a.gapLevel);
    } else if (sortOrder === 'priority') {
      const pMap = { High: 3, Medium: 2, Low: 1 };
      result.sort((a, b) => (pMap[b.priority] || 0) - (pMap[a.priority] || 0));
    } else if (sortOrder === 'alpha') {
      result.sort((a, b) => a.skillName.localeCompare(b.skillName));
    }

    return result;
  }, [skillGaps, activeFilter, searchQuery, sortOrder]);

  // ZERO STATE: No Diagnostic Assessment Completed
  if (!hasAssessmentData) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto pb-12">
        {/* Simple Compact Page Header */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#E0E7F2] shadow-xs">
          <Badge variant="purple" icon={<Target className="w-3.5 h-3.5" />}>
            SKILL INTELLIGENCE ENGINE
          </Badge>
          <h1 className="text-2xl font-black text-[#0B1B43] mt-2">
            Skill Gap Analysis
          </h1>
          <p className="text-xs text-[#405B8B] mt-1 max-w-xl">
            Compares your demonstrated proficiency against verified industry benchmarks for <strong className="text-[#0B1B43]">{targetRole || 'your target career'}</strong>.
          </p>
        </div>

        {/* Single Clear Zero State Card */}
        <Card className="text-center p-10 sm:p-14 max-w-2xl mx-auto space-y-5 border-[#E0E7F2]">
          <div className="w-16 h-16 rounded-3xl bg-blue-50 text-[#087BFA] flex items-center justify-center mx-auto shadow-inner">
            <Brain className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-extrabold text-[#0B1B43]">
              No Diagnostic Skill Assessment Completed
            </h2>
            <p className="text-xs sm:text-sm text-[#405B8B] max-w-md mx-auto leading-relaxed">
              To calculate your benchmark competency gaps for <strong className="text-[#0B1B43]">{targetRole || 'your chosen role'}</strong>, take a diagnostic skill assessment. Your results will automatically populate your competency comparison, readiness score, and targeted learning path.
            </p>
          </div>

          <div className="pt-3">
            <Button
              size="lg"
              variant="primary"
              onClick={() => navigate('/student/assessment')}
              rightIcon={<ArrowRight className="w-5 h-5" />}
              className="px-8 py-3 text-sm font-bold shadow-md shadow-blue-500/20"
            >
              Start Diagnostic Skill Assessment
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // ACTIVE SKILL GAP VIEW
  return (
    <div className="space-y-7 pb-14 max-w-7xl mx-auto">
      {/* 1. COMPACT PAGE HEADER */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-[#E0E7F2] shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="purple" icon={<Target className="w-3.5 h-3.5" />}>
              SKILL INTELLIGENCE ENGINE
            </Badge>
            <Badge variant="blue">{activeDomain.title}</Badge>
          </div>
          <h1 className="text-2xl font-black text-[#0B1B43]">
            {targetRole || 'Selected Career Goal'}
          </h1>
          <p className="text-xs text-[#405B8B]">
            Demonstrated competencies calibrated against industry standards for <strong className="text-[#0B1B43]">{targetRole}</strong>.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 w-full lg:w-auto shrink-0">
          <Button
            variant={showRoleSelector ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setShowRoleSelector(!showRoleSelector)}
            leftIcon={<Layers className="w-4 h-4 text-[#087BFA]" />}
            className="text-xs font-bold"
          >
            {showRoleSelector ? 'Close Selector' : 'Change Target Role'}
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/student/assessment')}
            leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
            className="text-xs font-bold shadow-xs"
          >
            Retake Assessment
          </Button>
        </div>
      </div>

      {/* COLLAPSIBLE ROLE SELECTOR */}
      {showRoleSelector && (
        <div className="bg-white p-4 sm:p-6 rounded-2xl border-2 border-[#087BFA]/30 shadow-md animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-extrabold text-[#0B1B43] flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#087BFA]" />
                Select Career Benchmark Calibration
              </h2>
              <p className="text-[11px] text-[#405B8B]">
                Switching roles instantly recalibrates benchmark targets and preserves transferable skills.
              </p>
            </div>
            <button
              onClick={() => setShowRoleSelector(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              aria-label="Close role selector"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <DomainRoleSelector
            selectedDomainId={activeDomain.id}
            selectedRoleTitle={targetRole}
            onSelectRole={(newRole, domainId) => {
              setTargetRole(newRole, domainId);
              setTargetDomain(domainId);
              setShowRoleSelector(false);
            }}
            onDomainChange={(domainId) => {
              setTargetDomain(domainId);
            }}
          />
        </div>
      )}

      {/* 2. FOUR COMPACT KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Role Benchmark Readiness */}
        <Card borderAccent="blue" className="p-4 sm:p-5 flex flex-col justify-between space-y-2">
          <div>
            <span className="text-[11px] font-bold text-[#405B8B] uppercase tracking-wider block">
              Role Benchmark Readiness
            </span>
            <div className="text-2xl font-black text-[#0B1B43] my-1">
              {overallReadinessScore !== null ? `${overallReadinessScore}%` : '0%'}
            </div>
          </div>
          <div>
            <ProgressBar
              progress={overallReadinessScore || 0}
              color="gradient"
              size="sm"
            />
            <span className="text-[10px] text-[#405B8B] mt-1.5 block truncate">
              Calibrated for {targetRole}
            </span>
          </div>
        </Card>

        {/* KPI 2: High-Priority Gaps */}
        <Card borderAccent="rose" className="p-4 sm:p-5 flex flex-col justify-between space-y-2">
          <div>
            <span className="text-[11px] font-bold text-[#405B8B] uppercase tracking-wider block">
              High-Priority Gaps
            </span>
            <div className="text-2xl font-black text-rose-600 my-1">
              {highPriorityGaps.length}
            </div>
          </div>
          <span className="text-xs text-[#405B8B] block">
            {highPriorityGaps.length > 0 ? 'Critical core competencies to bridge' : 'No high-priority blockers'}
          </span>
        </Card>

        {/* KPI 3: Skills Requiring Evidence */}
        <Card borderAccent="amber" className="p-4 sm:p-5 flex flex-col justify-between space-y-2">
          <div>
            <span className="text-[11px] font-bold text-[#405B8B] uppercase tracking-wider block">
              Requires Evidence
            </span>
            <div className="text-2xl font-black text-amber-600 my-1">
              {needsEvidenceGaps.length}
            </div>
          </div>
          <span className="text-xs text-[#405B8B] block">
            {needsEvidenceGaps.length > 0 ? 'Awaiting diagnostic test or repo artifact' : 'All required skills assessed'}
          </span>
        </Card>

        {/* KPI 4: Competencies Meeting Target */}
        <Card className="p-4 sm:p-5 border-emerald-200 bg-emerald-50/20 flex flex-col justify-between space-y-2">
          <div>
            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
              Benchmark Goals Met
            </span>
            <div className="text-2xl font-black text-emerald-600 my-1">
              {goalsMetGaps.length}
            </div>
          </div>
          <span className="text-xs text-emerald-700 block font-medium">
            {goalsMetGaps.length} of {skillGaps.length} competencies ready
          </span>
        </Card>
      </div>

      {/* 3. MEANINGFUL ANALYTICS: BENCHMARK COMPARISON + DISTRIBUTION + PROGRESS */}
      <div className="space-y-4">
        {/* Horizontal Benchmark Comparison Chart */}
        <BenchmarkComparisonChart
          items={skillGaps}
          targetRole={targetRole}
        />

        {/* Competency Distribution & Historical Assessment Progress */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <CompetencyDistributionCard skills={skillGaps} />
          <AssessmentProgressTrend
            history={assessmentHistory}
            onRetakeAssessment={() => navigate('/student/assessment')}
          />
        </div>
      </div>

      {/* 4. FOCUSED TOP 3 NEXT ACTIONS SECTION */}
      <TopNextActions
        skillGaps={skillGaps}
        resources={resources}
        targetRole={targetRole}
      />

      {/* 5. SEARCHABLE / FILTERABLE REQUIRED-COMPETENCIES LIST */}
      <div className="space-y-4">
        {/* Controls Bar: Search, Filters, Sort */}
        <div className="bg-white p-4 rounded-2xl border border-[#E0E7F2] shadow-xs space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 min-w-0">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search required competencies by name or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-9 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#087BFA] focus:outline-hidden transition-all text-[#0B1B43]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2 shrink-0">
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs font-semibold text-slate-500">Sort:</span>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as any)}
                className="text-xs font-bold text-[#0B1B43] bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-hidden focus:border-[#087BFA] cursor-pointer"
              >
                <option value="gap">Largest Gap First</option>
                <option value="priority">Priority First</option>
                <option value="alpha">Skill Name (A–Z)</option>
              </select>
            </div>
          </div>

          {/* Filter Pills with Exact Counts */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 border-t border-slate-100">
            {[
              { id: 'All' as const, label: `All (${skillGaps.length})` },
              { id: 'High' as const, label: `High Priority (${highPriorityGaps.length})` },
              { id: 'Below' as const, label: `Below Target (${belowTargetGaps.length})` },
              { id: 'NeedsEvidence' as const, label: `Needs Evidence (${needsEvidenceGaps.length})` },
              { id: 'Met' as const, label: `Goals Met (${goalsMetGaps.length})` }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeFilter === tab.id
                    ? 'bg-[#087BFA] text-white shadow-xs'
                    : 'bg-slate-50 border border-slate-200 text-[#405B8B] hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Competencies List */}
        {filteredAndSortedGaps.length > 0 ? (
          <div className="space-y-3" role="list" aria-label="Required Competencies">
            {filteredAndSortedGaps.map((gap) => (
              <CompetencyCard
                key={gap.skillName}
                gap={gap}
                resources={resources}
              />
            ))}
          </div>
        ) : (
          <div className="p-10 bg-white rounded-2xl border border-[#E0E7F2] text-center space-y-3">
            <Filter className="w-8 h-8 text-slate-300 mx-auto" />
            <div className="space-y-1">
              <h3 className="text-sm font-extrabold text-[#0B1B43]">
                No competencies match your filter
              </h3>
              <p className="text-xs text-[#405B8B]">
                Try adjusting your search query or switching the filter tab.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setActiveFilter('All');
              }}
              className="text-xs font-bold"
            >
              Reset Filters
            </Button>
          </div>
        )}
      </div>

      {/* 6. SECONDARY, COLLAPSIBLE TRANSFERABLE SKILLS SECTION */}
      {otherAssessedSkills.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#E0E7F2] shadow-xs overflow-hidden">
          <button
            onClick={() => setIsTransferableOpen(!isTransferableOpen)}
            className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-slate-50/70 transition-colors cursor-pointer"
            aria-expanded={isTransferableOpen}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-[#603DF5] flex items-center justify-center shrink-0">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-extrabold text-[#0B1B43]">
                    Transferable Demonstrated Skills
                  </h2>
                  <Badge variant="purple" size="xs">
                    {otherAssessedSkills.length} Preserved
                  </Badge>
                </div>
                <p className="text-xs text-[#405B8B] mt-0.5">
                  Verified skills from previous assessments outside the {targetRole} requirements. Preserved in your Skill Passport.
                </p>
              </div>
            </div>

            <div className="p-1.5 rounded-lg border border-slate-200 text-slate-500 shrink-0 ml-3">
              {isTransferableOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </button>

          {isTransferableOpen && (
            <div className="px-4 sm:px-5 pb-5 pt-1 border-t border-slate-100">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-3">
                {otherAssessedSkills.map(skill => (
                  <div
                    key={skill.id}
                    className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-2"
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="font-extrabold text-xs text-[#0B1B43] truncate">
                        {skill.name}
                      </span>
                      <Badge variant="blue" size="xs">
                        Level {skill.proficiencyLevel}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>{skill.category}</span>
                      <span className="text-emerald-600 font-semibold capitalize">
                        {skill.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 7. ONE CLEAR PERSONALIZED ROADMAP CALL TO ACTION */}
      <Card className="p-6 bg-gradient-to-r from-blue-50/90 via-indigo-50/70 to-purple-50/90 border border-blue-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#087BFA]" />
            <h3 className="font-extrabold text-base text-[#0B1B43]">
              Ready to Bridge Your Benchmark Gaps?
            </h3>
          </div>
          <p className="text-xs text-[#405B8B] max-w-xl leading-relaxed">
            SARATHI has mapped your priority competency gaps directly to personalized milestones, curated free coursework, and practical hands-on capstone projects.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={() => navigate('/student/roadmap')}
          rightIcon={<ArrowRight className="w-4 h-4" />}
          className="shadow-sm font-bold shrink-0"
        >
          Open My Roadmap
        </Button>
      </Card>
    </div>
  );
};
