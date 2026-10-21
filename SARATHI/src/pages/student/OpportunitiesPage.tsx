import React, { useState, useEffect, useCallback } from 'react';
import {
  Briefcase,
  Search,
  MapPin,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Building2,
  ArrowRight,
  RefreshCw,
  Clock,
  Send
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { PageHeader } from '../../components/common/PageHeader';
import { EmptyState } from '../../components/common/EmptyState';
import { OpportunityService, type CandidateApplication } from '../../services/opportunityService';
import type { OpportunityItem, MatchResult } from '../../types/opportunity';
import { useStudent } from '../../context/StudentContext';
import { useAuth } from '../../context/AuthContext';

export const OpportunitiesPage: React.FC = () => {
  const { skills } = useStudent();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'explore' | 'applications'>('explore');
  const [opportunities, setOpportunities] = useState<OpportunityItem[]>([]);
  const [myApplications, setMyApplications] = useState<CandidateApplication[]>([]);
  const [appliedJobIds, setAppliedJobIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [remoteOnly, setRemoteOnly] = useState(false);

  const [selectedOpportunity, setSelectedOpportunity] = useState<{
    opportunity: OpportunityItem;
    match: MatchResult;
  } | null>(null);

  const [selectedApplicationTimeline, setSelectedApplicationTimeline] = useState<CandidateApplication | null>(null);

  const [coverNote, setCoverNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  const getStageBadge = (stage: string) => {
    switch (stage) {
      case 'new_applicant':
        return { variant: 'blue' as const, label: 'Application Submitted' };
      case 'under_review':
        return { variant: 'purple' as const, label: 'Under Review' };
      case 'shortlisted':
        return { variant: 'indigo' as const, label: 'Shortlisted' };
      case 'assessment_invited':
        return { variant: 'amber' as const, label: 'Assessment Invited' };
      case 'assessment_completed':
        return { variant: 'blue' as const, label: 'Assessment Completed' };
      case 'interview_scheduled':
        return { variant: 'rose' as const, label: 'Interview Scheduled' };
      case 'interview_completed':
        return { variant: 'purple' as const, label: 'Interview Completed' };
      case 'offer_extended':
        return { variant: 'success' as const, label: 'Offer Extended' };
      case 'hired':
        return { variant: 'success' as const, label: 'Hired' };
      case 'rejected':
        return { variant: 'gray' as const, label: 'Not Selected' };
      case 'withdrawn':
        return { variant: 'gray' as const, label: 'Withdrawn' };
      default:
        return { variant: 'gray' as const, label: stage.replace(/_/g, ' ') };
    }
  };

  // Fetch opportunities and existing applications from real backend
  const loadOpportunities = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [fetchedJobs, myApps] = await Promise.all([
        OpportunityService.fetchPublicOpportunities(),
        OpportunityService.fetchMyApplications(user)
      ]);

      setOpportunities(fetchedJobs);
      setMyApplications(myApps);
      setAppliedJobIds(new Set(myApps.map((app) => app.job_id)));
    } catch (err: any) {
      console.error('Failed to load opportunities:', err);
      setError(err?.message || 'Unable to connect to live job listings. Please check backend service.');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadOpportunities();
  }, [loadOpportunities]);

  // Handle application submission
  const handleApply = async () => {
    if (!selectedOpportunity || !user) return;
    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      const result = await OpportunityService.applyForOpportunity(
        selectedOpportunity.opportunity.id,
        user,
        coverNote.trim() || undefined
      );

      if (result.success) {
        setSubmitSuccess(result.message);
        setAppliedJobIds((prev) => new Set(prev).add(selectedOpportunity.opportunity.id));
        setCoverNote('');
        // Refresh application records
        OpportunityService.fetchMyApplications(user).then((apps) => {
          setMyApplications(apps);
        });
        setTimeout(() => {
          setSelectedOpportunity(null);
          setSubmitSuccess(null);
        }, 1800);
      } else if (result.duplicate) {
        setSubmitError(result.message);
        setAppliedJobIds((prev) => new Set(prev).add(selectedOpportunity.opportunity.id));
      }
    } catch (err: any) {
      setSubmitError(err?.message || 'Failed to submit application. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter opportunities
  const filteredOpportunities = opportunities.filter((opp) => {
    const matchesSearch =
      opp.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      opp.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      opp.requiredSkills.some((s) => s.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesType = typeFilter === 'All' || opp.opportunityType === typeFilter;
    const matchesRemote = !remoteOnly || opp.isRemote;

    return matchesSearch && matchesType && matchesRemote;
  });

  return (
    <div className="space-y-8 pb-12">
      {/* HEADER BAR */}
      <PageHeader
        title="Jobs & Internships"
        description="Discover live verified opportunities matched directly against your assessed skills and verified projects."
        badge={
          <Badge variant="blue" icon={<Briefcase className="w-3.5 h-3.5" />}>
            LIVE RECRUITER LISTINGS
          </Badge>
        }
      />

      {/* TABS SELECTOR */}
      <div className="flex border-b border-[#E0E7F2] gap-8">
        <button
          onClick={() => setActiveTab('explore')}
          className={`pb-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'explore'
              ? 'border-[#087BFA] text-[#087BFA]'
              : 'border-transparent text-[#405B8B] hover:text-[#0B1B43]'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          <span>Explore Live Opportunities</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-[#087BFA]">
            {filteredOpportunities.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('applications')}
          className={`pb-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'applications'
              ? 'border-[#087BFA] text-[#087BFA]'
              : 'border-transparent text-[#405B8B] hover:text-[#0B1B43]'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>My Submitted Applications</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
            {myApplications.length}
          </span>
        </button>
      </div>

      {activeTab === 'applications' ? (
        /* MY APPLICATIONS VIEW */
        <div className="space-y-6">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2].map((n) => (
                <Card key={n} className="p-6 animate-pulse space-y-4">
                  <div className="h-6 bg-slate-200 rounded w-1/3" />
                  <div className="h-4 bg-slate-100 rounded w-1/4" />
                </Card>
              ))}
            </div>
          ) : myApplications.length === 0 ? (
            <Card className="max-w-2xl mx-auto">
              <EmptyState
                icon={<Briefcase className="w-8 h-8" />}
                title="No applications submitted yet"
                description="Explore verified opportunities matched with your assessed skills and apply with your comprehensive Skill Passport."
                variant="blue"
                action={
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => setActiveTab('explore')}
                  >
                    Explore Available Jobs
                  </Button>
                }
              />
            </Card>
          ) : (
            myApplications.map((app) => {
              const badge = getStageBadge(app.stage);
              return (
                <Card key={app.id} hoverEffect className="p-6 space-y-4">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="text-lg font-extrabold text-[#0B1B43]">{app.job_title}</h3>
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                        {app.job_type && <Badge variant="gray">{app.job_type}</Badge>}
                      </div>

                      <div className="flex items-center gap-4 text-xs text-[#405B8B] flex-wrap">
                        <span className="font-semibold text-[#0B1B43] flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5 text-[#087BFA]" /> {app.company_name}
                        </span>
                        {app.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" /> {app.location} {app.work_arrangement && `(${app.work_arrangement})`}
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-slate-400">
                          <Clock className="w-3.5 h-3.5" /> Submitted {new Date(app.applied_at).toLocaleDateString()}
                        </span>
                      </div>

                      {app.cover_note && (
                        <div className="p-3 bg-[#F4F7FC] rounded-xl text-xs text-[#405B8B] mt-2 border border-[#E0E7F2]">
                          <span className="font-bold text-[#0B1B43] block mb-0.5">Your Note to Recruiter:</span>
                          <p className="italic">"{app.cover_note}"</p>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row lg:flex-col gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedApplicationTimeline(app)}
                        rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                      >
                        View Status Timeline
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      ) : (
        /* EXPLORE OPPORTUNITIES VIEW */
        <>
          {/* FILTERS BAR */}
          <div className="bg-white p-6 rounded-2xl border border-[#E0E7F2] shadow-sm space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
              {/* Search bar */}
              <div className="md:col-span-2 relative">
                <Search className="w-4 h-4 text-[#405B8B] absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by role, company, or skill..."
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-[#E0E7F2] text-sm text-[#0B1B43] focus:outline-none focus:ring-2 focus:ring-[#087BFA]"
                />
              </div>

              {/* Type filter */}
              <div>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="w-full p-2 rounded-xl border border-[#E0E7F2] text-sm text-[#0B1B43] font-semibold bg-[#F4F7FC] focus:outline-none focus:ring-2 focus:ring-[#087BFA]"
                >
                  <option value="All">All Job Types</option>
                  <option value="Full-time">Full-time Roles</option>
                  <option value="Internship">Internships</option>
                  <option value="Contract">Contracts</option>
                </select>
              </div>

              {/* Remote toggle */}
              <div className="flex items-center">
                <label className="flex items-center gap-2 text-xs font-bold text-[#0B1B43] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={remoteOnly}
                    onChange={(e) => setRemoteOnly(e.target.checked)}
                    className="rounded text-[#087BFA] focus:ring-[#087BFA]"
                  />
                  <span>Remote Positions Only</span>
                </label>
              </div>
            </div>
          </div>

      {/* ERROR STATE */}
      {error && (
        <Card className="p-6 border-rose-200 bg-rose-50/50">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <div>
                <h4 className="font-bold text-sm text-rose-900">Failed to load live jobs</h4>
                <p className="text-xs text-rose-700">{error}</p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={loadOpportunities}
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              Retry Connection
            </Button>
          </div>
        </Card>
      )}

      {/* OPPORTUNITIES LIST */}
      <div className="space-y-6">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((n) => (
              <Card key={n} className="p-6 animate-pulse space-y-4">
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="h-6 bg-slate-200 rounded w-1/3" />
                    <div className="h-4 bg-slate-100 rounded w-1/4" />
                    <div className="h-3 bg-slate-100 rounded w-2/3" />
                  </div>
                  <div className="h-10 bg-slate-200 rounded w-24" />
                </div>
                <div className="h-4 bg-slate-100 rounded w-1/2 pt-2" />
              </Card>
            ))}
          </div>
        ) : filteredOpportunities.length === 0 ? (
          <Card className="max-w-2xl mx-auto">
            <EmptyState
              icon={<Briefcase className="w-8 h-8" />}
              title="No opportunities match your filters"
              description="Try adjusting your search terms or filters to discover active job postings from partner organizations."
              variant="blue"
              action={
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSearchTerm('');
                    setTypeFilter('All');
                    setRemoteOnly(false);
                  }}
                >
                  Reset Filters
                </Button>
              }
            />
          </Card>
        ) : (
          filteredOpportunities.map((opp) => {
            const match = OpportunityService.calculateSkillMatch(opp, skills);
            const isApplied = appliedJobIds.has(opp.id);

            return (
              <Card key={opp.id} hoverEffect className="p-6 space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  {/* Left: Role Info */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="text-lg font-extrabold text-[#0B1B43]">{opp.title}</h3>
                      <Badge variant={opp.opportunityType === 'Full-time' ? 'blue' : 'purple'}>
                        {opp.opportunityType}
                      </Badge>
                      <Badge variant="gray">{opp.experienceLevel}</Badge>
                      {isApplied && (
                        <Badge variant="success" icon={<CheckCircle2 className="w-3.5 h-3.5" />}>
                          Applied
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-xs text-[#405B8B] flex-wrap">
                      <span className="font-semibold text-[#0B1B43] flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-[#087BFA]" /> {opp.companyName}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" /> {opp.location} {opp.isRemote && '(Remote)'}
                      </span>
                      <span className="font-semibold text-[#16A34A]">{opp.stipendOrSalary}</span>
                      <span className="flex items-center gap-1 text-slate-400">
                        <Clock className="w-3.5 h-3.5" /> Posted {opp.postedDate}
                      </span>
                    </div>

                    <p className="text-xs text-[#405B8B] leading-relaxed max-w-2xl">{opp.description}</p>
                  </div>

                  {/* Right: Explainable Match Score & CTA */}
                  <div className="lg:text-right space-y-3 shrink-0">
                    <div className="inline-flex flex-col lg:items-end">
                      <span className="text-[10px] font-bold text-[#405B8B] uppercase">Explainable Match Score</span>
                      <div className="text-3xl font-black text-[#087BFA]">
                        {match.overallMatchScore}%
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row lg:flex-col gap-2">
                      <Button
                        size="sm"
                        variant={isApplied ? 'secondary' : 'primary'}
                        onClick={() => {
                          setSelectedOpportunity({ opportunity: opp, match });
                          setSubmitError(null);
                          setSubmitSuccess(null);
                        }}
                        rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                      >
                        {isApplied ? 'View Application Status' : 'View Skill Breakdown & Apply'}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Skills Tags Bar */}
                <div className="pt-3 border-t border-[#E0E7F2] flex items-center gap-2 flex-wrap text-xs">
                  <span className="font-semibold text-[#0B1B43]">Required Skills:</span>
                  {opp.requiredSkills.map((reqSkill) => {
                    const isMatching = match.matchingSkills.includes(reqSkill);
                    return (
                      <span
                        key={reqSkill}
                        className={`text-[11px] px-2 py-0.5 rounded-md font-semibold ${
                          isMatching
                            ? 'bg-emerald-50 text-[#16A34A] border border-emerald-200'
                            : 'bg-amber-50 text-[#D97706] border border-amber-200'
                        }`}
                      >
                        {isMatching ? '✓ ' : '⚠ '} {reqSkill}
                      </span>
                    );
                  })}
                </div>
              </Card>
            );
          })
        )}
      </div>
      </>
      )}

      {/* MATCH BREAKDOWN & APPLICATION MODAL */}
      {selectedOpportunity && (
        <Modal
          isOpen={!!selectedOpportunity}
          onClose={() => {
            if (!isSubmitting) {
              setSelectedOpportunity(null);
              setSubmitError(null);
              setSubmitSuccess(null);
            }
          }}
          title={`Skill Breakdown: ${selectedOpportunity.opportunity.title}`}
          subtitle={`Company: ${selectedOpportunity.opportunity.companyName} • Salary: ${selectedOpportunity.opportunity.stipendOrSalary}`}
          maxWidth="lg"
        >
          <div className="space-y-6">
            {/* Match score banner */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-[#0B1B43] to-[#087BFA] text-white flex items-center justify-between">
              <div>
                <span className="text-xs text-blue-200 font-semibold uppercase">Deterministic Match Score</span>
                <div className="text-3xl font-black text-white">{selectedOpportunity.match.overallMatchScore}% Match</div>
              </div>
              <Badge variant="purple" className="bg-white/20 text-white border-white/30">
                <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                Verified Evaluation
              </Badge>
            </div>

            {/* Application status banner if applied */}
            {appliedJobIds.has(selectedOpportunity.opportunity.id) && (() => {
              const appRecord = myApplications.find((a) => a.job_id === selectedOpportunity.opportunity.id);
              const badge = appRecord ? getStageBadge(appRecord.stage) : { variant: 'blue' as const, label: 'Application Submitted' };
              return (
                <div className="p-4 rounded-xl bg-blue-50/80 border border-blue-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-[#087BFA] shrink-0 mt-0.5" />
                    <div>
                      <div className="flex items-center gap-2">
                        <h5 className="font-bold text-xs text-[#0B1B43]">Current Hiring Status:</h5>
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                      </div>
                      <p className="text-xs text-[#405B8B] mt-0.5">
                        Applied on {appRecord?.applied_at ? new Date(appRecord.applied_at).toLocaleDateString() : 'recently'}. Your Skill Passport and verified competencies are in the hiring pipeline.
                      </p>
                    </div>
                  </div>
                  {appRecord && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedOpportunity(null);
                        setSelectedApplicationTimeline(appRecord);
                      }}
                    >
                      View Timeline
                    </Button>
                  )}
                </div>
              );
            })()}

            {/* Matching skills */}
            <div className="space-y-2">
              <h4 className="font-bold text-sm text-[#16A34A] flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Matching Skills ({selectedOpportunity.match.matchingSkills.length})
              </h4>
              <div className="flex gap-2 flex-wrap">
                {selectedOpportunity.match.matchingSkills.length > 0 ? (
                  selectedOpportunity.match.matchingSkills.map((s) => (
                    <span
                      key={s}
                      className="text-xs bg-emerald-50 text-[#16A34A] px-3 py-1 rounded-lg border border-emerald-200 font-semibold"
                    >
                      {s}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-400 italic">No direct verified skill matches yet.</span>
                )}
              </div>
            </div>

            {/* Missing or Unassessed skills */}
            <div className="space-y-2">
              <h4 className="font-bold text-sm text-[#D97706] flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" /> Skills Needing Improvement / Assessment
              </h4>
              <div className="flex gap-2 flex-wrap">
                {selectedOpportunity.match.missingSkills.concat(selectedOpportunity.match.unassessedSkills).length > 0 ? (
                  selectedOpportunity.match.missingSkills.concat(selectedOpportunity.match.unassessedSkills).map((s) => (
                    <span
                      key={s}
                      className="text-xs bg-amber-50 text-[#D97706] px-3 py-1 rounded-lg border border-amber-200 font-semibold"
                    >
                      {s}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-emerald-600 font-semibold">All required skills met or verified!</span>
                )}
              </div>
            </div>

            {/* Suggested Action */}
            <div className="p-4 rounded-2xl bg-[#F4F7FC] border border-[#E0E7F2] text-xs space-y-1">
              <span className="font-bold text-[#0B1B43]">Hiring Insights for Applicant:</span>
              <p className="text-[#405B8B] leading-relaxed">{selectedOpportunity.match.suggestedAction}</p>
            </div>

            {/* Cover Note Section (only if not applied) */}
            {!appliedJobIds.has(selectedOpportunity.opportunity.id) && (
              <div className="space-y-2 pt-2 border-t border-[#E0E7F2]">
                <label className="block text-xs font-bold text-[#0B1B43]">
                  Candidate Note to Recruiter (Optional)
                </label>
                <textarea
                  value={coverNote}
                  onChange={(e) => setCoverNote(e.target.value)}
                  placeholder="Share a brief note about your interest in this role, relevant projects, or availability..."
                  rows={3}
                  className="w-full p-3 rounded-xl border border-[#E0E7F2] text-xs text-[#0B1B43] focus:outline-none focus:ring-2 focus:ring-[#087BFA]"
                />
              </div>
            )}

            {/* Error or Success message */}
            {submitError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}
            {submitSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{submitSuccess}</span>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t border-[#E0E7F2]">
              <Button
                variant="secondary"
                disabled={isSubmitting}
                onClick={() => {
                  setSelectedOpportunity(null);
                  setSubmitError(null);
                  setSubmitSuccess(null);
                }}
              >
                Close
              </Button>

              {appliedJobIds.has(selectedOpportunity.opportunity.id) ? (
                <Button variant="outline" disabled icon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />}>
                  Already Applied
                </Button>
              ) : (
                <Button
                  variant="success"
                  isLoading={isSubmitting}
                  onClick={handleApply}
                  rightIcon={<Send className="w-3.5 h-3.5" />}
                >
                  Submit Skill Passport Application
                </Button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* APPLICATION STATUS TIMELINE MODAL */}
      {selectedApplicationTimeline && (
        <Modal
          isOpen={!!selectedApplicationTimeline}
          onClose={() => setSelectedApplicationTimeline(null)}
          title={`Application Status: ${selectedApplicationTimeline.job_title}`}
          subtitle={`Organization: ${selectedApplicationTimeline.company_name} • Submitted: ${new Date(
            selectedApplicationTimeline.applied_at
          ).toLocaleDateString()}`}
          maxWidth="md"
        >
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-slate-50 border border-[#E0E7F2] rounded-2xl">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#405B8B] block">Current Stage</span>
                <span className="text-base font-extrabold text-[#0B1B43]">
                  {getStageBadge(selectedApplicationTimeline.stage).label}
                </span>
              </div>
              <Badge variant={getStageBadge(selectedApplicationTimeline.stage).variant}>
                {selectedApplicationTimeline.stage.replace(/_/g, ' ')}
              </Badge>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#405B8B]">
                Stage History & Decision Audit
              </h4>
              <div className="space-y-3 border-l-2 border-blue-200 pl-4 ml-2">
                {selectedApplicationTimeline.stageHistory && selectedApplicationTimeline.stageHistory.length > 0 ? (
                  selectedApplicationTimeline.stageHistory.map((history, idx) => (
                    <div key={history.id || idx} className="relative space-y-1">
                      <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-[#087BFA]" />
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#0B1B43]">
                          {getStageBadge(history.to_stage).label}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(history.created_at).toLocaleString()}
                        </span>
                      </div>
                      {history.reason && (
                        <p className="text-xs text-[#405B8B] bg-slate-50 p-2 rounded-lg border border-slate-100">
                          {history.reason}
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="relative space-y-1">
                    <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-[#087BFA]" />
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#0B1B43]">Application Submitted</span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(selectedApplicationTimeline.applied_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-[#405B8B]">
                      Candidate profile and Skill Passport received by hiring team.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-[#E0E7F2]">
              <Button variant="secondary" onClick={() => setSelectedApplicationTimeline(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

