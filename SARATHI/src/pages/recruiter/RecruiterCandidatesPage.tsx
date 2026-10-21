import React, { useState, useEffect } from 'react';
import { Search, BadgeCheck, FolderGit2, MapPin, LayoutGrid, List, Sparkles, Users } from 'lucide-react';
import { recruiterApi } from '../../services/recruiterApiService';
import type { DomainItem, JobItem, CandidatePassport } from '../../services/recruiterApiService';
import { useRecruiter } from '../../context/RecruiterContext';
import { CandidatePassportModal } from '../../components/recruiter/CandidatePassportModal';
import { PageHeader, Card, Badge, EmptyState } from '../../components/common';

export const RecruiterCandidatesPage: React.FC = () => {
  const { activeOrgId, refreshKey, showToast } = useRecruiter();
  const [candidates, setCandidates] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Taxonomy & Active Jobs for Match Scoring
  const [domains, setDomains] = useState<DomainItem[]>([]);
  const [, setSkills] = useState<any[]>([]);
  const [jobs, setJobs] = useState<JobItem[]>([]);

  // Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDomain, setSelectedDomain] = useState('');
  const [selectedSkill, setSelectedSkill] = useState('');
  const [minProficiency] = useState(1);
  const [verificationFilter, setVerificationFilter] = useState('all');
  const [minExperience, setMinExperience] = useState<number>(0);
  const [workPreference, setWorkPreference] = useState('all');
  const [selectedJobForMatch, setSelectedJobForMatch] = useState('');
  const [sortBy, setSortBy] = useState('readiness');

  // Selected Passport for Inspection
  const [selectedPassport, setSelectedPassport] = useState<CandidatePassport | null>(null);

  // Initial Taxonomy & Jobs load
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [doms, sks, jbs] = await Promise.all([
          recruiterApi.getDomains(),
          recruiterApi.getSkills(),
          recruiterApi.getJobs('published'),
        ]);
        setDomains(doms);
        setSkills(sks);
        setJobs(jbs);
      } catch {
        showToast('Failed to load filter metadata', 'error');
      }
    };
    fetchMetadata();
  }, [activeOrgId, refreshKey]);

  // Candidate Search & Filter Execution
  const executeSearch = async () => {
    try {
      setLoading(true);
      const res = await recruiterApi.searchCandidates({
        query: searchQuery || undefined,
        domainId: selectedDomain || undefined,
        skillId: selectedSkill || undefined,
        minProficiency: minProficiency > 1 ? minProficiency : undefined,
        verificationStatus: verificationFilter === 'all' ? undefined : verificationFilter,
        minExperience: minExperience > 0 ? minExperience : undefined,
        workPreference: workPreference === 'all' ? undefined : workPreference,
        jobId: selectedJobForMatch || undefined,
        sortBy: selectedJobForMatch && sortBy === 'match' ? 'match' : sortBy,
      });
      setCandidates(res.candidates);
      setTotalCount(res.totalCount);
    } catch (err: any) {
      showToast(err.message || 'Candidate search failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    executeSearch();
  }, [selectedDomain, selectedSkill, minProficiency, verificationFilter, minExperience, workPreference, selectedJobForMatch, sortBy]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeSearch();
  };

  const inspectPassport = async (candidateId: string) => {
    try {
      const passport = await recruiterApi.getCandidatePassport(candidateId, selectedJobForMatch || undefined);
      setSelectedPassport(passport);
    } catch (err: any) {
      showToast(err.message || 'Failed to inspect passport', 'error');
    }
  };

  
  return (
    <div className="space-y-6">
      {/* HEADER */}
      <PageHeader
        title="Candidate Discovery & Skill Intelligence"
        description="Discover verified talent filtered by practical evidence, repo counts, and explainable role compatibility."
        badge={
          <Badge variant="indigo" size="sm" dot>
            Verified Talent Pool
          </Badge>
        }
        actions={
          <div className="p-1 rounded-xl bg-slate-100 border border-slate-200 flex gap-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                viewMode === 'grid' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-400 hover:text-slate-700'
              }`}
              title="Grid View"
              aria-label="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                viewMode === 'list' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-400 hover:text-slate-700'
              }`}
              title="List View"
              aria-label="List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        }
      />

      {/* FILTER CONTROLS BAR */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
        {/* Top Search & Active Role Match Picker */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
          <form onSubmit={handleSearchSubmit} className="lg:col-span-6 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search candidate by full name, target role, institution, or keyword..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all"
            />
          </form>

          {/* Job Match Selector */}
          <div className="lg:col-span-4 flex items-center gap-2.5 bg-indigo-50/70 border border-indigo-200/90 px-3.5 py-1.5 rounded-xl">
            <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-[10px] uppercase font-bold text-indigo-800 block leading-tight">Evaluate Match Against Job:</span>
              <select
                value={selectedJobForMatch}
                onChange={(e) => {
                  setSelectedJobForMatch(e.target.value);
                  if (e.target.value) setSortBy('match');
                }}
                className="w-full bg-transparent text-xs font-bold text-indigo-950 outline-none truncate cursor-pointer"
              >
                <option value="">-- None (General Readiness) --</option>
                {jobs.map(j => (
                  <option key={j.id} value={j.id}>{j.title}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Sort Control */}
          <div className="lg:col-span-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <option value="readiness">Sort by Readiness</option>
              {selectedJobForMatch && <option value="match">Sort by Job Match %</option>}
              <option value="experience">Sort by Experience</option>
              <option value="name">Sort by Name</option>
            </select>
          </div>
        </div>

        {/* Detailed Secondary Filters */}
        <div className="pt-3.5 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 text-xs">
          {/* Domain */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Domain</label>
            <select
              value={selectedDomain}
              onChange={(e) => setSelectedDomain(e.target.value)}
              className="w-full p-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-slate-50/50 hover:bg-white focus:bg-white transition-colors cursor-pointer"
            >
              <option value="">All 20 Domains</option>
              {domains.map(d => (
                <option key={d.id} value={d.id}>{d.title}</option>
              ))}
            </select>
          </div>

          {/* Verification Status */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Verification</label>
            <select
              value={verificationFilter}
              onChange={(e) => setVerificationFilter(e.target.value)}
              className="w-full p-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-slate-50/50 hover:bg-white focus:bg-white transition-colors cursor-pointer"
            >
              <option value="all">Any Status</option>
              <option value="verified">Verified Competency Only</option>
              <option value="evidence_submitted">Evidence Submitted</option>
            </select>
          </div>

          {/* Experience */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Min Experience</label>
            <select
              value={minExperience}
              onChange={(e) => setMinExperience(Number(e.target.value))}
              className="w-full p-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-slate-50/50 hover:bg-white focus:bg-white transition-colors cursor-pointer"
            >
              <option value="0">Any Experience</option>
              <option value="1">1+ Years</option>
              <option value="2">2+ Years</option>
              <option value="3">3+ Years</option>
              <option value="5">5+ Years</option>
            </select>
          </div>

          {/* Work Arrangement */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Arrangement</label>
            <select
              value={workPreference}
              onChange={(e) => setWorkPreference(e.target.value)}
              className="w-full p-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-slate-50/50 hover:bg-white focus:bg-white transition-colors cursor-pointer"
            >
              <option value="all">All Arrangements</option>
              <option value="remote">Fully Remote</option>
              <option value="hybrid">Hybrid</option>
              <option value="onsite">On-Site</option>
            </select>
          </div>

          {/* Reset Filters */}
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedDomain('');
                setSelectedSkill('');
                setVerificationFilter('all');
                setMinExperience(0);
                setWorkPreference('all');
                setSelectedJobForMatch('');
                setSortBy('readiness');
              }}
              className="w-full py-2 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs transition-colors cursor-pointer"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* CANDIDATES LISTING */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs font-bold text-slate-500 px-1">
          <span>Found {totalCount} verified candidates</span>
          {selectedJobForMatch && (
            <span className="text-indigo-600 font-semibold">
              Scoring candidates against selected job requirement profile
            </span>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 animate-pulse">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-64 bg-slate-200 rounded-3xl" />
            ))}
          </div>
        ) : candidates.length === 0 ? (
          <Card>
            <EmptyState
              icon={Users}
              title="No Candidates Match Your Filters"
              description="Try widening your search terms, technical domain, or minimum proficiency thresholds to expand results."
              variant="indigo"
            />
          </Card>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {candidates.map(cand => (
              <div
                key={cand.id}
                className="bg-white rounded-3xl border border-slate-200 hover:border-indigo-300 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 group"
              >
                <div className="space-y-3">
                  {/* Candidate Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={cand.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${cand.full_name}`}
                        alt={cand.full_name}
                        className="w-12 h-12 rounded-2xl object-cover ring-2 ring-indigo-100 bg-slate-100 shrink-0"
                      />
                      <div className="min-w-0">
                        <h4 className="font-extrabold text-sm text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                          {cand.full_name}
                        </h4>
                        <p className="text-xs text-indigo-600 font-semibold truncate">{cand.target_role}</p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      {selectedJobForMatch && cand.matchScore !== null ? (
                        <>
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">Match Score</span>
                          <span className="text-lg font-black text-emerald-600">{cand.matchScore}%</span>
                        </>
                      ) : (
                        <>
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">Readiness</span>
                          <span className="text-lg font-black text-indigo-600">{cand.readinessScore}%</span>
                        </>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{cand.headline}</p>

                  <div className="flex flex-wrap gap-2 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {cand.location || 'India'}
                    </span>
                    <span>•</span>
                    <span>{cand.experience_years} Yrs Exp</span>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-slate-600 font-semibold">
                      <FolderGit2 className="w-3.5 h-3.5 text-indigo-500" />
                      {cand.repo_count ?? 0} Repos
                    </span>
                  </div>

                  {/* Skills badges */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Evaluated Competencies:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {(cand.skills || []).slice(0, 4).map((sk: any) => (
                        <span
                          key={sk.skill_id}
                          className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
                            sk.verification_status === 'verified'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {sk.skill_name} (L{sk.proficiency})
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                    <BadgeCheck className="w-3.5 h-3.5" />
                    <span>{cand.verified_skill_count} Verified</span>
                  </span>

                  <button
                    onClick={() => inspectPassport(cand.id)}
                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs hover:shadow-md transition-all cursor-pointer"
                  >
                    Inspect Passport
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* LIST VIEW WITH STRUCTURED HEADER */
          <div className="bg-white rounded-3xl border border-slate-200 overflow-x-auto shadow-xs">
            <div className="min-w-[760px]">
              {/* Table Column Header */}
              <div className="grid grid-cols-12 px-5 py-3 border-b border-slate-100 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <div className="col-span-5">Candidate Profile</div>
                <div className="col-span-2">Location & Exp</div>
                <div className="col-span-2 text-center">Verified Skills</div>
                <div className="col-span-1 text-center">Score</div>
                <div className="col-span-2 text-right">Action</div>
              </div>

              <div className="divide-y divide-slate-100">
                {candidates.map(cand => (
                  <div key={cand.id} className="grid grid-cols-12 px-5 py-3.5 hover:bg-slate-50/80 transition-colors items-center">
                    <div className="col-span-5 flex items-center gap-3 min-w-0">
                      <img
                        src={cand.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${cand.full_name}`}
                        alt={cand.full_name}
                        className="w-10 h-10 rounded-xl object-cover bg-slate-100 shrink-0"
                      />
                      <div className="min-w-0">
                        <h4 className="text-sm font-extrabold text-slate-900 truncate">{cand.full_name}</h4>
                        <p className="text-xs text-indigo-600 font-medium truncate">{cand.target_role} • {cand.headline}</p>
                      </div>
                    </div>

                    <div className="col-span-2 text-xs text-slate-600">
                      <span className="block truncate">{cand.location || 'India'}</span>
                      <span className="text-[11px] text-slate-400">{cand.experience_years} Yrs Exp</span>
                    </div>

                    <div className="col-span-2 text-center">
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 px-2 py-0.5 rounded-full bg-emerald-50">
                        <BadgeCheck className="w-3.5 h-3.5" />
                        <span>{cand.verified_skill_count} Verified</span>
                      </span>
                    </div>

                    <div className="col-span-1 text-center">
                      <span className="text-sm font-black text-indigo-600">
                        {selectedJobForMatch && cand.matchScore !== null ? `${cand.matchScore}%` : `${cand.readinessScore}%`}
                      </span>
                    </div>

                    <div className="col-span-2 text-right">
                      <button
                        onClick={() => inspectPassport(cand.id)}
                        className="px-3.5 py-1.5 rounded-xl border border-slate-200 hover:bg-indigo-50 hover:text-indigo-600 text-xs font-bold transition-colors cursor-pointer"
                      >
                        Inspect Passport
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CANDIDATE PASSPORT MODAL */}
      <CandidatePassportModal
        passport={selectedPassport}
        onClose={() => setSelectedPassport(null)}
        onRefresh={executeSearch}
      />
    </div>
  );
};
