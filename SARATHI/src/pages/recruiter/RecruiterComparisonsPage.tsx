import React, { useState, useEffect } from 'react';
import { Plus, Users, Sparkles } from 'lucide-react';
import { recruiterApi } from '../../services/recruiterApiService';
import type { JobItem, CandidatePassport } from '../../services/recruiterApiService';
import { useRecruiter } from '../../context/RecruiterContext';
import { PageHeader, Button, Badge, Card, Modal, EmptyState } from '../../components/common';

export const RecruiterComparisonsPage: React.FC = () => {
  const { activeOrgId, refreshKey, showToast } = useRecruiter();
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [candidatesPool, setCandidatesPool] = useState<any[]>([]);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>([]);
  const [comparedProfiles, setComparedProfiles] = useState<CandidatePassport[]>([]);
  const [, setShortlists] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Shortlist Modal
  const [newShortlistTitle, setNewShortlistTitle] = useState('');
  const [isShortlistModalOpen, setIsShortlistModalOpen] = useState(false);

  useEffect(() => {
    const fetchBase = async () => {
      try {
        const [jobsData, candsData, slData] = await Promise.all([
          recruiterApi.getJobs('published'),
          recruiterApi.searchCandidates({ limit: 50 }),
          recruiterApi.getShortlists(),
        ]);
        setJobs(jobsData);
        setCandidatesPool(candsData.candidates);
        setShortlists(slData);
        if (jobsData.length > 0) setSelectedJobId(jobsData[0].id);
        if (candsData.candidates.length >= 2) {
          setSelectedCandidateIds([candsData.candidates[0].id, candsData.candidates[1].id]);
        }
      } catch {
        showToast('Failed to load comparison data', 'error');
      }
    };
    fetchBase();
  }, [activeOrgId, refreshKey]);

  useEffect(() => {
    let active = true;
    if (selectedCandidateIds.length < 2) {
      setComparedProfiles([]);
      return;
    }

    const runCompare = async () => {
      try {
        setLoading(true);
        const res = await recruiterApi.compareCandidates(selectedCandidateIds, selectedJobId || undefined);
        if (active) setComparedProfiles(res.candidates);
      } catch (err: any) {
        if (active) showToast(err.message || 'Comparison failed', 'error');
      } finally {
        if (active) setLoading(false);
      }
    };

    runCompare();
    return () => { active = false; };
  }, [selectedCandidateIds, selectedJobId, showToast]);

  const toggleCandidateSelection = (candId: string) => {
    if (selectedCandidateIds.includes(candId)) {
      if (selectedCandidateIds.length <= 2) {
        showToast('Please keep at least 2 candidates selected for comparison', 'info');
        return;
      }
      setSelectedCandidateIds(selectedCandidateIds.filter(id => id !== candId));
    } else {
      if (selectedCandidateIds.length >= 4) {
        showToast('Maximum 4 candidates can be compared side-by-side', 'info');
        return;
      }
      setSelectedCandidateIds([...selectedCandidateIds, candId]);
    }
  };

  const handleCreateShortlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShortlistTitle.trim()) return;
    try {
      await recruiterApi.createShortlist({
        title: newShortlistTitle.trim(),
        jobId: selectedJobId || undefined,
      });
      showToast('Candidate shortlist created successfully', 'success');
      setNewShortlistTitle('');
      setIsShortlistModalOpen(false);
      const sl = await recruiterApi.getShortlists();
      setShortlists(sl);
    } catch (err: any) {
      showToast(err.message || 'Failed to create shortlist', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <PageHeader
        title="Candidate Side-by-Side Comparison"
        description="Compare 2 to 4 candidates objectively on required-skill coverage, verified proof, and practical scores."
        badge={
          <Badge variant="indigo" size="sm" dot>
            Side-by-Side Analytics
          </Badge>
        }
        actions={
          <Button
            variant="indigo"
            size="md"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => setIsShortlistModalOpen(true)}
          >
            New Shortlist
          </Button>
        }
      />

      {/* CONTROLS BAR: JOB & CANDIDATES PICKER */}
      <Card className="p-5 sm:p-6 space-y-4">
        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1">Evaluate Against Job Role *</label>
          <select
            value={selectedJobId}
            onChange={(e) => setSelectedJobId(e.target.value)}
            className="w-full sm:w-80 md:w-96 p-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-100"
          >
            {jobs.map(j => (
              <option key={j.id} value={j.id}>{j.title} ({j.department})</option>
            ))}
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-slate-700 block">
              Select 2 to 4 Candidates to Compare:
            </label>
            <span className="text-[11px] font-semibold text-indigo-600">
              {selectedCandidateIds.length} of 4 selected
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {candidatesPool.map(cand => {
              const isSelected = selectedCandidateIds.includes(cand.id);
              return (
                <button
                  key={cand.id}
                  type="button"
                  onClick={() => toggleCandidateSelection(cand.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <span>{cand.full_name}</span>
                  {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      {/* COMPARISON MATRIX TABLE */}
      {loading ? (
        <Card className="p-12 text-center animate-pulse text-slate-400">
          Generating candidate comparison matrix...
        </Card>
      ) : comparedProfiles.length < 2 ? (
        <Card>
          <EmptyState
            icon={Users}
            title="Select Candidates for Comparison"
            description="Choose at least 2 candidates above (up to 4) to benchmark their skills, assessments, and verified credentials side by side."
            variant="indigo"
          />
        </Card>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
          {/* Mobile swipe hint banner */}
          <div className="sm:hidden px-4 py-2.5 bg-indigo-50 border-b border-indigo-100 text-[11px] font-semibold text-indigo-700 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Scroll horizontally to view all candidates
            </span>
            <span className="font-extrabold">{comparedProfiles.length} Profiles</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="p-4 sm:p-5 text-xs font-extrabold text-slate-500 uppercase tracking-wider min-w-[160px] sm:min-w-[200px] sticky left-0 bg-slate-50 z-20 shadow-[2px_0_5px_rgba(0,0,0,0.03)]">
                    Evaluation Metric
                  </th>
                  {comparedProfiles.map(({ candidate }) => (
                    <th key={candidate.id} className="p-4 sm:p-5 text-center border-l border-slate-200 min-w-[200px] sm:min-w-[240px]">
                      <img
                        src={candidate.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${candidate.full_name}`}
                        alt={candidate.full_name}
                        className="w-12 h-12 rounded-2xl mx-auto mb-2 object-cover bg-slate-100 ring-2 ring-indigo-100"
                      />
                      <h4 className="text-sm font-black text-slate-900">{candidate.full_name}</h4>
                      <p className="text-[11px] text-indigo-600 font-semibold truncate max-w-[180px] mx-auto">
                        {candidate.target_role}
                      </p>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 text-xs">
                {/* 1. Job Match Score */}
                <tr className="hover:bg-slate-50/50">
                  <td className="p-4 font-bold text-slate-800 sticky left-0 bg-white z-10 shadow-[2px_0_5px_rgba(0,0,0,0.03)]">
                    Job Role Match Score
                  </td>
                  {comparedProfiles.map(({ candidate, jobMatch }) => (
                    <td key={candidate.id} className="p-4 text-center border-l border-slate-100">
                      <span className="text-xl font-black text-emerald-600">
                        {jobMatch ? `${jobMatch.matchScore}%` : 'N/A'}
                      </span>
                    </td>
                  ))}
                </tr>

                {/* 2. Required Skill Coverage */}
                <tr className="hover:bg-slate-50/50">
                  <td className="p-4 font-bold text-slate-800 sticky left-0 bg-white z-10 shadow-[2px_0_5px_rgba(0,0,0,0.03)]">
                    Required Skills Coverage
                  </td>
                  {comparedProfiles.map(({ candidate, jobMatch }) => (
                    <td key={candidate.id} className="p-4 text-center border-l border-slate-100 font-bold text-indigo-600">
                      {jobMatch ? `${jobMatch.requiredSkillCoverage}%` : 'N/A'}
                    </td>
                  ))}
                </tr>

                {/* 3. Verified Competencies Count */}
                <tr className="hover:bg-slate-50/50">
                  <td className="p-4 font-bold text-slate-800 sticky left-0 bg-white z-10 shadow-[2px_0_5px_rgba(0,0,0,0.03)]">
                    Verified Competencies
                  </td>
                  {comparedProfiles.map(({ candidate, skills }) => (
                    <td key={candidate.id} className="p-4 text-center border-l border-slate-100">
                      <span className="font-extrabold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg">
                        {skills.filter(s => s.verification_status === 'verified').length} Verified Skills
                      </span>
                    </td>
                  ))}
                </tr>

                {/* 4. Practical Assessments Passed */}
                <tr className="hover:bg-slate-50/50">
                  <td className="p-4 font-bold text-slate-800 sticky left-0 bg-white z-10 shadow-[2px_0_5px_rgba(0,0,0,0.03)]">
                    Standardized Assessments Passed
                  </td>
                  {comparedProfiles.map(({ candidate, assessments }) => (
                    <td key={candidate.id} className="p-4 text-center border-l border-slate-100 font-bold text-slate-700">
                      {assessments.filter(a => a.passed === 1).length} Technical Tests Passed
                    </td>
                  ))}
                </tr>

                {/* 5. Verified Code Repositories */}
                <tr className="hover:bg-slate-50/50">
                  <td className="p-4 font-bold text-slate-800 sticky left-0 bg-white z-10 shadow-[2px_0_5px_rgba(0,0,0,0.03)]">
                    Code Repositories
                  </td>
                  {comparedProfiles.map(({ candidate }) => (
                    <td key={candidate.id} className="p-4 text-center border-l border-slate-100 font-bold text-slate-700">
                      {candidate.repo_count ?? 0} Public Repos
                    </td>
                  ))}
                </tr>

                {/* 6. Relevant Experience */}
                <tr className="hover:bg-slate-50/50">
                  <td className="p-4 font-bold text-slate-800 sticky left-0 bg-white z-10 shadow-[2px_0_5px_rgba(0,0,0,0.03)]">
                    Relevant Experience
                  </td>
                  {comparedProfiles.map(({ candidate }) => (
                    <td key={candidate.id} className="p-4 text-center border-l border-slate-100 font-bold text-slate-700">
                      {candidate.experience_years} Years
                    </td>
                  ))}
                </tr>

                {/* 7. Work Preference */}
                <tr className="hover:bg-slate-50/50">
                  <td className="p-4 font-bold text-slate-800 sticky left-0 bg-white z-10 shadow-[2px_0_5px_rgba(0,0,0,0.03)]">
                    Work Preference
                  </td>
                  {comparedProfiles.map(({ candidate }) => (
                    <td key={candidate.id} className="p-4 text-center border-l border-slate-100 font-semibold capitalize text-slate-600">
                      {candidate.work_preference}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE SHORTLIST MODAL */}
      <Modal
        isOpen={isShortlistModalOpen}
        onClose={() => setIsShortlistModalOpen(false)}
        title="Create Candidate Shortlist"
        subtitle="Group compared candidate profiles for team review and pipeline progression"
        maxWidth="md"
      >
        <form onSubmit={handleCreateShortlist} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Shortlist Title *</label>
            <input
              type="text"
              value={newShortlistTitle}
              onChange={(e) => setNewShortlistTitle(e.target.value)}
              placeholder="e.g. Q3 Principal Full-Stack Finalists"
              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-indigo-100"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsShortlistModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="indigo"
              size="sm"
            >
              Save Shortlist
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
