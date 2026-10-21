import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  XCircle,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { recruiterApi } from '../../services/recruiterApiService';
import type { JobItem } from '../../services/recruiterApiService';
import { useRecruiter } from '../../context/RecruiterContext';

export const RecruiterSkillGapPage: React.FC = () => {
  const { activeOrgId, refreshKey, showToast } = useRecruiter();
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [selectedCandidateId, setSelectedCandidateId] = useState('');
  const [gapAnalysis, setGapAnalysis] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchSelectableData = async () => {
      try {
        const [jobsData, candsData] = await Promise.all([
          recruiterApi.getJobs('published'),
          recruiterApi.searchCandidates({ limit: 50 }),
        ]);
        setJobs(jobsData);
        setCandidates(candsData.candidates);
        if (jobsData.length > 0) setSelectedJobId(jobsData[0].id);
        if (candsData.candidates.length > 0) setSelectedCandidateId(candsData.candidates[0].id);
      } catch (err: any) {
        showToast('Failed to load comparison data', 'error');
      }
    };
    fetchSelectableData();
  }, [activeOrgId, refreshKey]);

  useEffect(() => {
    if (!selectedJobId || !selectedCandidateId) return;

    const runAnalysis = async () => {
      try {
        setLoading(true);
        const data = await recruiterApi.getSkillGapAnalysis(selectedCandidateId, selectedJobId);
        setGapAnalysis(data);
      } catch (err: any) {
        showToast(err.message || 'Failed to compute skill gap analysis', 'error');
      } finally {
        setLoading(false);
      }
    };

    runAnalysis();
  }, [selectedJobId, selectedCandidateId]);

  
  

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Role-Specific Skill Gap Analysis</h1>
        <p className="text-xs text-slate-500 mt-1">
          Objective evaluation comparing candidate verified competencies directly against target job benchmarks.
        </p>

        {/* SELECTORS ROW */}
        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Select Active Job Benchmark *</label>
            <select
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-slate-50"
            >
              {jobs.map(j => (
                <option key={j.id} value={j.id}>{j.title} ({j.department})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Select Candidate *</label>
            <select
              value={selectedCandidateId}
              onChange={(e) => setSelectedCandidateId(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-slate-50"
            >
              {candidates.map(c => (
                <option key={c.id} value={c.id}>{c.full_name} ({c.target_role || 'Candidate'})</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 animate-pulse text-slate-400">
          Computing deterministic skill gap analysis...
        </div>
      ) : gapAnalysis ? (
        <div className="space-y-6">
          {/* SUMMARY SCORECARD */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Overall Match Score</span>
              <span className="text-3xl font-black text-emerald-600">{gapAnalysis.overallMatchScore}%</span>
              <p className="text-[11px] text-slate-500 mt-1">Weighted composite score</p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Required Skills Coverage</span>
              <span className="text-3xl font-black text-indigo-600">{gapAnalysis.requiredSkillCoverage}%</span>
              <p className="text-[11px] text-slate-500 mt-1">Fulfillment of non-negotiable skills</p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Preferred Skills Coverage</span>
              <span className="text-3xl font-black text-purple-600">{gapAnalysis.preferredSkillCoverage}%</span>
              <p className="text-[11px] text-slate-500 mt-1">Bonus and secondary competencies</p>
            </div>
          </div>

          {/* GAP SUMMARY CALLOUT */}
          <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 text-xs text-indigo-950 font-medium flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-indigo-600 shrink-0" />
            <span>{gapAnalysis.summary}</span>
          </div>

          {/* COMPETENCY GAP BREAKDOWN MATRIX */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h3 className="text-base font-extrabold text-slate-900">Competency Comparison Matrix</h3>

            <div className="space-y-3">
              {(gapAnalysis.items || []).map((item: any) => {
                const isMet = item.gapStatus === 'met';
                const isBelow = item.gapStatus === 'below_target';
                const isUnverified = item.gapStatus === 'unverified';
                const isMissing = item.gapStatus === 'missing';

                return (
                  <div
                    key={item.skillId}
                    className={`p-4 rounded-2xl border transition-all ${
                      isMet
                        ? 'border-emerald-200 bg-emerald-50/20'
                        : isBelow
                        ? 'border-amber-200 bg-amber-50/20'
                        : isUnverified
                        ? 'border-blue-200 bg-blue-50/20'
                        : 'border-slate-200 bg-slate-50/40'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-extrabold text-slate-900">{item.skillName}</h4>
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                            item.requirementType === 'required' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {item.requirementType}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Target Level: <strong>L{item.targetProficiency}</strong> • Demonstrated: <strong>L{item.candidateProficiency}</strong> ({item.verificationStatus.replace('_', ' ')})
                        </p>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        {isMet && (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Target Met</span>
                          </span>
                        )}
                        {isBelow && (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-extrabold bg-amber-100 text-amber-800">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>Below Target</span>
                          </span>
                        )}
                        {isUnverified && (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-extrabold bg-blue-100 text-blue-800">
                            <HelpCircle className="w-3.5 h-3.5" />
                            <span>Unverified Claim</span>
                          </span>
                        )}
                        {isMissing && (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-extrabold bg-slate-100 text-slate-600">
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Missing Competency</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {item.recommendation && (
                      <div className="mt-3 pt-3 border-t border-slate-100 text-xs flex items-center gap-2 text-slate-600">
                        <ArrowRight className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        <span className="font-semibold text-slate-700">Recommended Next Step:</span>
                        <span>{item.recommendation}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
