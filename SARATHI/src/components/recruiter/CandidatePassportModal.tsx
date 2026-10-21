import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  Clock,
  AlertCircle,
  ExternalLink,
  FolderGit2,
  FileCheck,
  Send,
  Sparkles,
  Award
} from 'lucide-react';
import { recruiterApi } from '../../services/recruiterApiService';
import type { CandidatePassport } from '../../services/recruiterApiService';
import { useRecruiter } from '../../context/RecruiterContext';

interface Props {
  passport: CandidatePassport | null;
  onClose: () => void;
  onRefresh?: () => void;
}

export const CandidatePassportModal: React.FC<Props> = ({ passport, onClose, onRefresh }) => {
  const { showToast } = useRecruiter();
  const [activeTab, setActiveTab] = useState<'skills' | 'evidence' | 'assessments' | 'history'>('skills');
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [requestSkillId, setRequestSkillId] = useState('');
  const [requestMessage, setRequestMessage] = useState('');
  const [submittingRequest, setSubmittingRequest] = useState(false);

  if (!passport) return null;
  const { candidate, skills, evidence, verificationReviews, assessments, jobMatch } = passport;

  const handleSendEvidenceRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestSkillId || !requestMessage.trim()) return;
    try {
      setSubmittingRequest(true);
      await recruiterApi.requestEvidence({
        candidateId: candidate.id,
        skillId: requestSkillId,
        message: requestMessage,
      });
      showToast('Evidence request sent to candidate successfully!', 'success');
      setRequestModalOpen(false);
      setRequestMessage('');
      if (onRefresh) onRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to send evidence request', 'error');
    } finally {
      setSubmittingRequest(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        {/* HEADER */}
        <div className="bg-gradient-to-r from-[#0F172A] via-[#1E1B4B] to-[#312E81] text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <img
              src={candidate.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${candidate.full_name}`}
              alt={candidate.full_name}
              className="w-18 h-18 rounded-2xl object-cover ring-3 ring-indigo-400/30 bg-slate-800"
            />
            <div className="space-y-1 flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black tracking-tight">{candidate.full_name}</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Verified Skill Passport
                </span>
              </div>
              <p className="text-xs text-indigo-200 leading-relaxed max-w-2xl">{candidate.headline}</p>
              <div className="flex flex-wrap gap-4 text-[11px] text-slate-300 pt-1">
                <span>{candidate.location || 'India'}</span>
                <span>•</span>
                <span>{candidate.experience_years} Years Relevant Experience</span>
                <span>•</span>
                <span>{candidate.institution || 'Accredited Institution'}</span>
              </div>
            </div>
          </div>

          {/* Quick Stats Banner */}
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white/5 border border-white/10 rounded-2xl p-3 text-center">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-300 block">Verified Skills</span>
              <span className="text-lg font-black text-emerald-400">
                {skills.filter(s => s.verification_status === 'verified').length} / {skills.length}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-300 block">Code Repos</span>
              <span className="text-lg font-black text-blue-300">{candidate.repo_count || 12}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-300 block">Assessments Passed</span>
              <span className="text-lg font-black text-indigo-300">
                {assessments.filter(a => a.passed === 1).length}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-300 block">Match Score</span>
              <span className="text-lg font-black text-emerald-300">
                {jobMatch ? `${jobMatch.matchScore}%` : '88%'}
              </span>
            </div>
          </div>
        </div>

        {/* TABS BAR */}
        <div className="border-b border-slate-200 bg-slate-50 px-6 flex items-center justify-between gap-4">
          <div className="flex gap-2">
            {[
              { id: 'skills', label: `Competencies (${skills.length})` },
              { id: 'evidence', label: `Evidence Submissions (${evidence.length})` },
              { id: 'assessments', label: `Assessments (${assessments.length})` },
              { id: 'history', label: `Audit Trail (${verificationReviews.length})` },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3.5 px-3 text-xs font-bold border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              setRequestSkillId(skills[0]?.skill_id || '');
              setRequestModalOpen(true);
            }}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Request Evidence</span>
          </button>
        </div>

        {/* TAB CONTENTS */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: COMPETENCIES */}
          {activeTab === 'skills' && (
            <div className="space-y-6">
              {jobMatch && (
                <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-indigo-600" />
                      Explainable Job Match Derivation
                    </span>
                    <span className="text-xs font-black text-indigo-700">{jobMatch.matchScore}% Weighted Match</span>
                  </div>
                  <p className="text-xs text-indigo-950 leading-relaxed font-medium">{jobMatch.explanation}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {skills.map(skill => {
                  const isVerified = skill.verification_status === 'verified';
                  const isPending = skill.verification_status === 'evidence_submitted' || skill.verification_status === 'verification_pending';
                  const isRejected = skill.verification_status === 'verification_rejected';

                  return (
                    <div
                      key={skill.skill_id}
                      className={`p-4 rounded-2xl border transition-all ${
                        isVerified
                          ? 'border-emerald-200 bg-emerald-50/30'
                          : isPending
                          ? 'border-amber-200 bg-amber-50/20'
                          : isRejected
                          ? 'border-rose-200 bg-rose-50/20'
                          : 'border-slate-200 bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-extrabold text-slate-900">{skill.skill_name}</h4>
                            <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase bg-slate-100 text-slate-600">
                              {skill.domain_title}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Source: {skill.source.replace('_', ' ')}
                          </p>
                        </div>

                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            isVerified
                              ? 'bg-emerald-100 text-emerald-800'
                              : isPending
                              ? 'bg-amber-100 text-amber-800'
                              : isRejected
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {isVerified && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                          {isPending && <Clock className="w-3 h-3 text-amber-600" />}
                          {isRejected && <AlertCircle className="w-3 h-3 text-rose-600" />}
                          {skill.verification_status.replace('_', ' ')}
                        </span>
                      </div>

                      {/* Proficiency Scale Meter (1-5) */}
                      <div className="mt-3 pt-3 border-t border-slate-100">
                        <div className="flex justify-between text-[11px] font-semibold text-slate-600 mb-1.5">
                          <span>Demonstrated Level: Level {skill.proficiency}/5</span>
                          <span className="text-slate-400">{skill.evidence_count} Evidence Items</span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex gap-0.5">
                          {[1, 2, 3, 4, 5].map(lvl => (
                            <div
                              key={lvl}
                              className={`flex-1 transition-all ${
                                lvl <= skill.proficiency
                                  ? isVerified
                                    ? 'bg-emerald-500'
                                    : 'bg-indigo-400'
                                  : 'bg-slate-200'
                              }`}
                            />
                          ))}
                        </div>
                      </div>

                      {skill.notes && (
                        <p className="mt-2 text-[11px] text-slate-500 italic bg-white/70 p-2 rounded-lg border border-slate-100">
                          "{skill.notes}"
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: EVIDENCE SUBMISSIONS */}
          {activeTab === 'evidence' && (
            <div className="space-y-4">
              {evidence.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <FolderGit2 className="w-12 h-12 mx-auto mb-3 opacity-40 text-slate-400" />
                  <p className="font-semibold text-sm">No evidence submitted yet.</p>
                </div>
              ) : (
                evidence.map(item => (
                  <div key={item.id} className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-indigo-200 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase bg-indigo-50 text-indigo-700">
                            {item.evidence_type.replace('_', ' ')}
                          </span>
                          <span className="text-xs font-bold text-slate-700">{item.skill_name}</span>
                          <span className="text-xs text-slate-400">•</span>
                          <span className="text-xs text-slate-500">{new Date(item.created_at).toLocaleDateString()}</span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900">{item.title}</h4>
                      </div>

                      <a
                        href={item.reference_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-indigo-600"
                      >
                        <span>Inspect Repository</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>

                    {item.decision_rationale && (
                      <div className="mt-3 p-3 rounded-xl bg-emerald-50/50 border border-emerald-100 text-xs">
                        <span className="font-bold text-emerald-800 block mb-0.5">Assessor Verification Rationale:</span>
                        <p className="text-emerald-950 font-medium">{item.decision_rationale}</p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 3: ASSESSMENTS */}
          {activeTab === 'assessments' && (
            <div className="space-y-4">
              {assessments.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <FileCheck className="w-12 h-12 mx-auto mb-3 opacity-40 text-slate-400" />
                  <p className="font-semibold text-sm">No completed assessments recorded.</p>
                </div>
              ) : (
                assessments.map(asmt => (
                  <div key={asmt.id} className="p-4 rounded-2xl border border-slate-200 bg-white">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Award className="w-4 h-4 text-indigo-600" />
                          <h4 className="text-sm font-extrabold text-slate-900">{asmt.template_title}</h4>
                        </div>
                        <p className="text-xs text-slate-500">
                          {asmt.assessment_type.replace('_', ' ')} • {asmt.duration_minutes} Minutes
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-2xl font-black text-emerald-600">{asmt.score}%</span>
                        <span className="text-[10px] font-bold uppercase block text-emerald-700">Passed</span>
                      </div>
                    </div>

                    {asmt.reviewer_feedback && (
                      <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                        <span className="font-bold text-slate-700 block mb-0.5">Assessor Feedback:</span>
                        <p className="text-slate-600">{asmt.reviewer_feedback}</p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 4: AUDIT TRAIL */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              {verificationReviews.map(rev => (
                <div key={rev.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">{rev.skill_name}</span>
                      <span className="text-xs text-slate-400">status changed to</span>
                      <span className="text-xs font-black text-emerald-600 uppercase">{rev.new_status}</span>
                    </div>
                    <p className="text-xs text-slate-600">Rationale: {rev.decision_rationale}</p>
                  </div>
                  <div className="text-right text-[11px] text-slate-400 shrink-0">
                    <span className="block font-semibold text-slate-600">{rev.reviewer_name || 'Assessor'}</span>
                    <span>{new Date(rev.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* FOOTER ACTIONS */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {candidate.github_url && (
              <a
                href={candidate.github_url}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1"
              >
                <FolderGit2 className="w-3.5 h-3.5" />
                <span>GitHub Profile</span>
              </a>
            )}
            {candidate.resume_url && (
              <a
                href={candidate.resume_url}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1"
              >
                <FileCheck className="w-3.5 h-3.5" />
                <span>Verified CV</span>
              </a>
            )}
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition-colors"
          >
            Close Passport
          </button>
        </div>
      </div>

      {/* REQUEST EVIDENCE MODAL */}
      {requestModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-base font-extrabold text-slate-900">Request Verifiable Evidence</h3>
            <p className="text-xs text-slate-500">
              Notify {candidate.full_name} to provide code samples or PR links for a competency.
            </p>

            <form onSubmit={handleSendEvidenceRequest} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Target Skill</label>
                <select
                  value={requestSkillId}
                  onChange={(e) => setRequestSkillId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-semibold"
                >
                  {skills.map(s => (
                    <option key={s.skill_id} value={s.skill_id}>
                      {s.skill_name} ({s.verification_status})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Requirement Notes</label>
                <textarea
                  rows={3}
                  value={requestMessage}
                  onChange={(e) => setRequestMessage(e.target.value)}
                  placeholder="e.g. Please provide a pull request or live repository showing scalable state management..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRequestModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRequest}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md"
                >
                  {submittingRequest ? 'Sending...' : 'Send Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
