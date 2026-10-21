import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Briefcase,
  Users,
  UserCheck,
  BadgeCheck,
  Calendar,
  ArrowRight,
  Plus,
  Search,
  Sparkles,
  ChevronRight,
  ShieldAlert,
  ShieldCheck,
  Clock,
  ExternalLink,
  MapPin
} from 'lucide-react';
import { recruiterApi } from '../../services/recruiterApiService';
import type { DashboardMetrics, CandidatePassport, JobItem } from '../../services/recruiterApiService';
import { useRecruiter } from '../../context/RecruiterContext';
import { CandidatePassportModal } from '../../components/recruiter/CandidatePassportModal';
import { Badge, Button, EmptyState, Card } from '../../components/common';

export const RecruiterDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { activeOrgId, refreshKey, showToast } = useRecruiter();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [activeJobsList, setActiveJobsList] = useState<JobItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCandidatePassport, setSelectedCandidatePassport] = useState<CandidatePassport | null>(null);

  useEffect(() => {
    let mounted = true;
    const fetchData = async () => {
      try {
        setLoading(true);
        const [metricsData, jobsData] = await Promise.all([
          recruiterApi.getDashboardMetrics(),
          recruiterApi.getJobs()
        ]);
        if (mounted) {
          setMetrics(metricsData);
          setActiveJobsList(jobsData || []);
        }
      } catch (err: any) {
        showToast(err.message || 'Failed to load recruiter workspace data', 'error');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchData();
    return () => { mounted = false; };
  }, [activeOrgId, refreshKey]);

  const handleInspectCandidate = async (candidateId: string) => {
    try {
      const passport = await recruiterApi.getCandidatePassport(candidateId);
      setSelectedCandidatePassport(passport);
    } catch (err: any) {
      showToast(err.message || 'Failed to load candidate Skill Passport', 'error');
    }
  };

  const handleQuickSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/recruiter/candidates?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate('/recruiter/candidates');
    }
  };

  if (loading && !metrics) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-40 bg-slate-200 rounded-3xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-slate-200 rounded-2xl" />
          ))}
        </div>
        <div className="h-64 bg-slate-200 rounded-2xl" />
      </div>
    );
  }

  const kpis = metrics?.kpiCards || {
    activeJobs: 0,
    totalApplicants: 0,
    shortlistedCandidates: 0,
    skillVerifiedCandidates: 0,
    pendingAssessments: 0,
    interviewsScheduled: 0,
  };

  // Pipeline stage mapping for understandable stages
  const standardPipelineStages = [
    { key: 'applied', label: 'Applied', rawKeys: ['new_applicant', 'applied'], count: 0 },
    { key: 'screening', label: 'Screening', rawKeys: ['screening', 'in_review'], count: 0 },
    { key: 'shortlisted', label: 'Shortlisted', rawKeys: ['shortlisted'], count: 0 },
    { key: 'interview', label: 'Interview', rawKeys: ['interview', 'interview_scheduled'], count: 0 },
    { key: 'selected', label: 'Selected / Offer', rawKeys: ['selected', 'offered', 'hired'], count: 0 }
  ];

  // Aggregate funnel counts into standard stages
  (metrics?.hiringFunnel || []).forEach(step => {
    const rawStage = (step.key || step.stage || '').toLowerCase();
    for (const stage of standardPipelineStages) {
      if (stage.rawKeys.some(k => rawStage.includes(k))) {
        stage.count += step.count;
        return;
      }
    }
  });

  return (
    <div className="space-y-8 pb-12">
      {/* 1. ENTERPRISE RECRUITMENT WORKSPACE BANNER */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0F172A] via-[#1E1B4B] to-[#312E81] text-white p-6 sm:p-8 shadow-xl border border-indigo-900/40">
        <div className="absolute -right-10 -top-10 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 backdrop-blur-md border border-indigo-400/30 text-indigo-300 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
              <span>Skill-Verified Talent Acquisition</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-tight">
              Recruiter & Employer Operations Center
            </h1>
            <p className="text-xs sm:text-sm text-indigo-200 leading-relaxed max-w-xl">
              High-velocity recruitment workspace. Review candidates backed by peer-reviewed repository evidence, standardized diagnostic benchmarks, and tamper-proof skill passports.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Button
              variant="indigo"
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-600/30 text-xs"
              onClick={() => navigate('/recruiter/jobs?action=create')}
              leftIcon={<Plus className="w-4 h-4 text-white" />}
            >
              Post New Job
            </Button>
            <Button
              variant="outline"
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 font-bold text-xs"
              onClick={() => navigate('/recruiter/candidates')}
              leftIcon={<Users className="w-4 h-4 text-indigo-300" />}
            >
              Talent Pool
            </Button>
          </div>
        </div>

        {/* 7. QUICK CANDIDATE SEARCH & TALENT POOL DISCOVERY BAR */}
        <div className="mt-6 pt-5 border-t border-indigo-800/60 relative z-10">
          <form onSubmit={handleQuickSearch} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-indigo-300 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search candidates by skill, specialization, or role (e.g. React, Python, Machine Learning, Docker)..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-indigo-200/70 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white/15 transition-all"
              />
            </div>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              className="bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-bold shrink-0"
            >
              Search Candidates
            </Button>
          </form>
        </div>
      </div>

      {/* 2. HIRING OVERVIEW: 4 CORE HEADLINE METRICS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {[
          {
            label: 'Active Jobs',
            value: kpis.activeJobs,
            sub: `${activeJobsList.filter(j => j.status === 'published').length} actively published`,
            icon: Briefcase,
            color: 'text-blue-600',
            bg: 'bg-blue-50',
            border: 'border-blue-100',
            link: '/recruiter/jobs'
          },
          {
            label: 'Total Applications',
            value: kpis.totalApplicants,
            sub: 'Across all active openings',
            icon: Users,
            color: 'text-indigo-600',
            bg: 'bg-indigo-50',
            border: 'border-indigo-100',
            link: '/recruiter/pipeline'
          },
          {
            label: 'Shortlisted Candidates',
            value: kpis.shortlistedCandidates,
            sub: `${kpis.skillVerifiedCandidates} skill-verified candidates`,
            icon: UserCheck,
            color: 'text-purple-600',
            bg: 'bg-purple-50',
            border: 'border-purple-100',
            link: '/recruiter/pipeline?stage=shortlisted'
          },
          {
            label: 'Interviews Scheduled',
            value: kpis.interviewsScheduled,
            sub: 'Upcoming candidate rounds',
            icon: Calendar,
            color: 'text-rose-600',
            bg: 'bg-rose-50',
            border: 'border-rose-100',
            link: '/recruiter/interviews'
          },
        ].map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              onClick={() => navigate(card.link)}
              className={`p-5 rounded-2xl bg-white border ${card.border} shadow-xs hover:shadow-md transition-all cursor-pointer group hover:-translate-y-0.5 flex flex-col justify-between`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-2.5 rounded-xl ${card.bg}`}>
                    <Icon className={`w-4.5 h-4.5 ${card.color}`} />
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-all" />
                </div>
                <div className="text-3xl font-black text-slate-900 tracking-tight">{card.value}</div>
              </div>
              <div className="pt-2 border-t border-slate-100 mt-2">
                <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">{card.label}</div>
                <span className="text-[11px] text-slate-400 block truncate mt-0.5">{card.sub}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. HIRING PIPELINE WITH UNDERSTANDABLE STAGES */}
      <Card className="p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight">Active Recruitment Pipeline Stages</h2>
            <p className="text-xs text-slate-500">Live candidate volume across standard candidate lifecycle stages</p>
          </div>
          <button
            onClick={() => navigate('/recruiter/pipeline')}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer self-start sm:self-auto"
          >
            <span>Open Interactive Kanban</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {standardPipelineStages.map((stage, idx) => {
            const percentage = kpis.totalApplicants > 0
              ? Math.round((stage.count / kpis.totalApplicants) * 100)
              : 0;

            return (
              <div
                key={stage.key}
                onClick={() => navigate(`/recruiter/pipeline?stage=${stage.key}`)}
                className="p-4 rounded-2xl bg-slate-50/80 hover:bg-white border border-slate-100 hover:border-indigo-300 transition-all text-center relative overflow-hidden group cursor-pointer shadow-2xs"
              >
                <div className="flex items-center justify-between mb-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <span className="w-4.5 h-4.5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-black">
                    {idx + 1}
                  </span>
                  <span>{percentage}%</span>
                </div>
                <span className="text-xs font-bold text-slate-700 block truncate mb-1">
                  {stage.label}
                </span>
                <span className="text-2xl font-black text-slate-900">{stage.count}</span>
                <div className="h-1.5 w-full bg-slate-200 rounded-full mt-2.5 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(8, (stage.count / Math.max(1, kpis.totalApplicants)) * 100))}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* 4 & 5. ACTIVE JOB POSTINGS & RECENT APPLICANTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2 Cols): Active Job Postings & Recent Applicants */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Job Postings Summary */}
          <Card className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Active Job Postings</h3>
                <p className="text-xs text-slate-500">Current published roles and active applicant counts</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/recruiter/jobs?action=create')}
                  leftIcon={<Plus className="w-3.5 h-3.5" />}
                >
                  Create Job
                </Button>
                <Button variant="ghost" size="sm" onClick={() => navigate('/recruiter/jobs')}>
                  View All ({activeJobsList.length})
                </Button>
              </div>
            </div>

            {activeJobsList.length === 0 ? (
              <EmptyState
                icon={Briefcase}
                title="No active job postings"
                description="Post your first open technical role to start receiving skill-verified candidate applications."
                action={
                  <Button
                    variant="indigo"
                    size="sm"
                    onClick={() => navigate('/recruiter/jobs?action=create')}
                  >
                    Post a Job Opening
                  </Button>
                }
              />
            ) : (
              <div className="divide-y divide-slate-100">
                {activeJobsList.slice(0, 4).map((job) => (
                  <div
                    key={job.id}
                    className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 p-2 rounded-xl transition-all"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-bold text-slate-900 truncate">{job.title}</h4>
                        <Badge
                          variant={job.status === 'published' ? 'success' : 'purple'}
                          size="xs"
                        >
                          {job.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                        <span>{job.department}</span>
                        {job.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            <span>{job.location}</span>
                          </span>
                        )}
                        <span>{job.employment_type}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                      <div className="text-right">
                        <span className="text-sm font-black text-slate-900">{job.applicant_count || 0}</span>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block leading-tight">Applicants</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/recruiter/pipeline?jobId=${job.id}`)}
                        className="text-xs"
                      >
                        Pipeline
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Recent Applicants with Verified Skill Indicators */}
          <Card className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Recent Candidate Applications</h3>
                <p className="text-xs text-slate-500">Live applicant submissions with verified skill badges & match ratings</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate('/recruiter/candidates')}>
                Explore All
              </Button>
            </div>

            <div className="space-y-3">
              {(metrics?.recentApplicants || []).length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="No candidate applications yet"
                  description="When candidates apply to published roles, their profiles and skill passports will appear here."
                  action={
                    <Button
                      variant="indigo"
                      size="sm"
                      onClick={() => navigate('/recruiter/candidates')}
                    >
                      Browse Talent Pool
                    </Button>
                  }
                />
              ) : (
                (metrics?.recentApplicants || []).slice(0, 5).map(cand => {
                  const hasVerifiedSkills = cand.verified_skill_count > 0;

                  return (
                    <div
                      key={cand.application_id}
                      className="p-4 rounded-2xl border border-slate-100 hover:border-indigo-200 bg-slate-50/60 hover:bg-white transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <img
                          src={cand.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${cand.full_name}`}
                          alt={cand.full_name}
                          className="w-11 h-11 rounded-xl object-cover ring-2 ring-indigo-100 bg-slate-100 shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-bold text-slate-900 truncate">{cand.full_name}</h4>
                            <Badge variant="indigo" size="xs">
                              {cand.stage.replace(/_/g, ' ')}
                            </Badge>

                            {/* Verified vs Self-Reported Skill Indicator */}
                            {hasVerifiedSkills ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                                <span>{cand.verified_skill_count} Verified Skills</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                                <Clock className="w-3 h-3 text-amber-600" />
                                <span>Self-Reported Only</span>
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 truncate mt-0.5">
                            Applied for: <strong className="text-slate-700">{cand.job_title}</strong> {cand.headline ? `• ${cand.headline}` : ''}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                        <div className="text-right">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block leading-tight">Skill Match</span>
                          <span className="text-sm font-black text-emerald-600">{cand.match_score}%</span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleInspectCandidate(cand.candidate_id)}
                          className="text-xs"
                          leftIcon={<BadgeCheck className="w-3.5 h-3.5 text-indigo-600" />}
                        >
                          Inspect Passport
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </div>

        {/* Right Column (1 Col): Pending Actions & Upcoming Interviews */}
        <div className="space-y-6">
          {/* 6. PENDING RECRUITMENT ACTIONS (Verification Queue) */}
          <Card className="space-y-4" borderAccent="amber">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-500" />
                <h4 className="text-sm font-extrabold text-slate-900">Verification Actions Queue</h4>
              </div>
              <button
                onClick={() => navigate('/recruiter/verifications')}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
              >
                Review All ({metrics?.pendingReviews?.length || 0})
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Candidate project code repositories and assessment evidence pending recruiter or automated verification.
            </p>

            <div className="space-y-2.5">
              {(metrics?.pendingReviews || []).length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400 font-medium bg-slate-50 rounded-xl">
                  No pending verification requests in queue
                </div>
              ) : (
                (metrics?.pendingReviews || []).slice(0, 3).map(rev => (
                  <div key={rev.evidence_id} className="p-3.5 rounded-xl bg-amber-50/40 border border-amber-100 text-xs space-y-1.5">
                    <div className="flex items-center justify-between font-bold text-slate-800">
                      <span className="truncate">{rev.candidate_name}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-amber-100 text-amber-800 uppercase font-bold">
                        {rev.evidence_type.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 truncate">{rev.skill_name} • {rev.evidence_title}</p>
                    {rev.reference_url && (
                      <a
                        href={rev.reference_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] font-bold text-indigo-600 hover:underline flex items-center gap-1"
                      >
                        <span>Inspect Repository Evidence</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                ))
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs"
              onClick={() => navigate('/recruiter/verifications')}
            >
              Open Verification Workspace
            </Button>
          </Card>

          {/* 6. UPCOMING INTERVIEWS */}
          <Card className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-500" />
                <h4 className="text-sm font-extrabold text-slate-900">Upcoming Interviews</h4>
              </div>
              <button
                onClick={() => navigate('/recruiter/interviews')}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
              >
                Calendar
              </button>
            </div>

            <div className="space-y-2.5">
              {(metrics?.upcomingInterviews || []).length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400 font-medium bg-slate-50 rounded-xl">
                  No technical interviews scheduled
                </div>
              ) : (
                (metrics?.upcomingInterviews || []).slice(0, 3).map(int => (
                  <div key={int.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1.5">
                    <div className="flex items-center justify-between font-bold text-slate-900">
                      <span>{int.candidate_name}</span>
                      <span className="text-[10px] text-indigo-600 font-bold px-2 py-0.5 rounded bg-indigo-50">
                        {new Date(int.scheduled_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate">{int.title} • {int.job_title}</p>
                    {int.meeting_link && (
                      <a
                        href={int.meeting_link}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] font-bold text-indigo-600 hover:underline flex items-center gap-1"
                      >
                        <span>Join Video Room</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                ))
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs"
              onClick={() => navigate('/recruiter/interviews')}
            >
              Schedule Interview
            </Button>
          </Card>

          {/* TALENT POOL DISCOVERY QUICK CARD */}
          <Card className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white p-6 space-y-3.5 border border-indigo-900/40">
            <div className="flex items-center gap-2 text-indigo-300">
              <Users className="w-5 h-5" />
              <h4 className="font-extrabold text-sm text-white">Pre-Assessed Talent Pool</h4>
            </div>
            <p className="text-xs text-indigo-200 leading-relaxed">
              Discover candidate profiles with pre-evaluated benchmark scores in Web Development, Machine Learning, Cybersecurity, and Cloud.
            </p>
            <Button
              variant="indigo"
              className="w-full text-xs bg-indigo-600 hover:bg-indigo-500 font-bold text-white shadow-md"
              onClick={() => navigate('/recruiter/candidates')}
            >
              Browse Talent Directory
            </Button>
          </Card>
        </div>
      </div>

      {/* SKILL PASSPORT INSPECTOR MODAL */}
      <CandidatePassportModal
        passport={selectedCandidatePassport}
        onClose={() => setSelectedCandidatePassport(null)}
      />
    </div>
  );
};
