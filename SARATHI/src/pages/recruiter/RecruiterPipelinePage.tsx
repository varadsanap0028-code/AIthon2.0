import React, { useState, useEffect } from 'react';
import { MessageSquare } from 'lucide-react';
import { recruiterApi } from '../../services/recruiterApiService';
import type { ApplicationItem, JobItem, CandidatePassport } from '../../services/recruiterApiService';
import { useRecruiter } from '../../context/RecruiterContext';
import { CandidatePassportModal } from '../../components/recruiter/CandidatePassportModal';
import { PageHeader, Badge, Modal, Button } from '../../components/common';

const PIPELINE_COLUMNS = [
  { id: 'new_applicant', label: 'New Applicants', color: 'border-blue-400' },
  { id: 'under_review', label: 'Under Review', color: 'border-purple-400' },
  { id: 'shortlisted', label: 'Shortlisted', color: 'border-indigo-400' },
  { id: 'assessment_invited', label: 'Assessment Invited', color: 'border-amber-400' },
  { id: 'interview_scheduled', label: 'Interview Scheduled', color: 'border-rose-400' },
  { id: 'offer_extended', label: 'Offer Extended', color: 'border-emerald-400' },
  { id: 'hired', label: 'Hired', color: 'border-teal-400' },
];

export const RecruiterPipelinePage: React.FC = () => {
  const { activeOrgId, refreshKey, showToast } = useRecruiter();
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [, setLoading] = useState(true);
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [search] = useState('');
  const [selectedCandidatePassport, setSelectedCandidatePassport] = useState<CandidatePassport | null>(null);

  // Stage change modal
  const [stageChangeModal, setStageChangeModal] = useState<{
    applicationId: string;
    targetStage: string;
    candidateName: string;
  } | null>(null);
  const [stageChangeReason, setStageChangeReason] = useState('');

  // Note modal
  const [noteModal, setNoteModal] = useState<{
    candidateId: string;
    candidateName: string;
    jobId: string;
  } | null>(null);
  const [noteText, setNoteText] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [appsData, jobsData] = await Promise.all([
        recruiterApi.getApplications(selectedJobId || undefined, undefined, search || undefined),
        recruiterApi.getJobs('published'),
      ]);
      setApplications(appsData);
      setJobs(jobsData);
    } catch (err: any) {
      showToast(err.message || 'Failed to load pipeline', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeOrgId, refreshKey, selectedJobId]);

  const handleInspectPassport = async (candidateId: string) => {
    try {
      const passport = await recruiterApi.getCandidatePassport(candidateId, selectedJobId || undefined);
      setSelectedCandidatePassport(passport);
    } catch (err: any) {
      showToast('Failed to open passport', 'error');
    }
  };

  const handleConfirmStageChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stageChangeModal) return;
    try {
      await recruiterApi.updateApplicationStage(
        stageChangeModal.applicationId,
        stageChangeModal.targetStage,
        stageChangeReason || undefined
      );
      showToast(`Application moved to ${stageChangeModal.targetStage.replace('_', ' ')}`, 'success');
      setStageChangeModal(null);
      setStageChangeReason('');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Stage transition failed', 'error');
    }
  };

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteModal || !noteText.trim()) return;
    try {
      await recruiterApi.addRecruiterNote(
        noteModal.candidateId,
        noteText.trim(),
        noteModal.jobId
      );
      showToast('Internal note saved to candidate audit record', 'success');
      setNoteModal(null);
      setNoteText('');
    } catch (err: any) {
      showToast(err.message || 'Failed to save note', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <PageHeader
        title="Recruitment Pipeline & Kanban"
        description="Track applicants through validated stages with complete audit history and human review controls."
        badge={
          <Badge variant="indigo" size="sm" dot>
            {applications.length} Active Applicants
          </Badge>
        }
        actions={
          <div className="flex items-center gap-2">
            <select
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
              className="p-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-100"
            >
              <option value="">-- All Active Job Postings --</option>
              {jobs.map(j => (
                <option key={j.id} value={j.id}>{j.title}</option>
              ))}
            </select>
          </div>
        }
      />

      {/* MOBILE SCROLL HINT */}
      <div className="lg:hidden px-4 py-2.5 bg-indigo-50 border border-indigo-100 rounded-2xl text-[11px] font-semibold text-indigo-700 flex items-center justify-between shadow-2xs">
        <span>← Scroll horizontally across pipeline stages →</span>
        <span className="font-extrabold">{PIPELINE_COLUMNS.length} Stages</span>
      </div>

      {/* KANBAN BOARD */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-[1400px]">
          {PIPELINE_COLUMNS.map(col => {
            const colApps = applications.filter(a => a.stage === col.id);

            return (
              <div
                key={col.id}
                className="flex-1 bg-slate-100/70 border border-slate-200 rounded-3xl p-4 flex flex-col space-y-3 min-w-[260px] max-w-[320px]"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full border-2 ${col.color} bg-white`} />
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">{col.label}</h3>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-white text-slate-600 font-bold text-[11px] shadow-2xs">
                    {colApps.length}
                  </span>
                </div>

                {/* Candidate Cards */}
                <div className="space-y-3 flex-1 overflow-y-auto max-h-[680px]">
                  {colApps.map(app => (
                    <div
                      key={app.id}
                      className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-indigo-300 shadow-xs hover:shadow-md transition-all space-y-3 group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={app.candidate_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${app.candidate_name}`}
                            alt={app.candidate_name}
                            className="w-9 h-9 rounded-xl object-cover bg-slate-100 shrink-0"
                          />
                          <div className="min-w-0">
                            <h4 className="text-xs font-extrabold text-slate-900 truncate">{app.candidate_name}</h4>
                            <p className="text-[11px] text-slate-500 truncate">{app.job_title}</p>
                          </div>
                        </div>

                        <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md shrink-0">
                          {app.match_score}%
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">{app.headline}</p>

                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                        <span>{app.experience_years} Yrs Exp</span>
                        <span className="font-bold text-emerald-600">{app.verified_skill_count} Verified</span>
                      </div>

                      {/* Card Actions */}
                      <div className="flex items-center justify-between gap-1 pt-1">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setNoteModal({
                              candidateId: app.candidate_id,
                              candidateName: app.candidate_name,
                              jobId: app.job_id,
                            })}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 cursor-pointer"
                            title="Add Recruiter Note"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleInspectPassport(app.candidate_id)}
                            className="text-[11px] font-bold text-indigo-600 hover:underline px-1 cursor-pointer"
                          >
                            Passport
                          </button>
                        </div>

                        {/* Move stage trigger */}
                        <select
                          value={app.stage}
                          onChange={(e) => setStageChangeModal({
                            applicationId: app.id,
                            targetStage: e.target.value,
                            candidateName: app.candidate_name,
                          })}
                          className="text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 py-1 px-1.5 rounded-lg outline-none cursor-pointer"
                        >
                          <option value={app.stage}>Move To...</option>
                          {PIPELINE_COLUMNS.map(c => (
                            <option key={c.id} value={c.id}>{c.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}

                  {colApps.length === 0 && (
                    <div className="text-center py-10 border border-dashed border-slate-200 rounded-2xl text-[11px] text-slate-400">
                      No candidates in this stage
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* STAGE TRANSITION CONFIRMATION MODAL */}
      <Modal
        isOpen={Boolean(stageChangeModal)}
        onClose={() => setStageChangeModal(null)}
        title="Advance Candidate Pipeline Stage"
        subtitle={
          stageChangeModal
            ? `Move ${stageChangeModal.candidateName} to stage ${stageChangeModal.targetStage.replace('_', ' ').toUpperCase()}`
            : undefined
        }
        maxWidth="md"
      >
        {stageChangeModal && (
          <form onSubmit={handleConfirmStageChange} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Audit Rationale / Stage Note</label>
              <textarea
                rows={3}
                value={stageChangeReason}
                onChange={(e) => setStageChangeReason(e.target.value)}
                placeholder="e.g. Cleared technical screening with top marks; scheduling onsite interview..."
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setStageChangeModal(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="indigo"
                size="sm"
              >
                Confirm Transition
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* RECRUITER NOTE MODAL */}
      <Modal
        isOpen={Boolean(noteModal)}
        onClose={() => setNoteModal(null)}
        title="Add Confidential Recruiter Note"
        subtitle={noteModal ? `Candidate: ${noteModal.candidateName}` : undefined}
        maxWidth="md"
      >
        {noteModal && (
          <form onSubmit={handleSaveNote} className="space-y-4">
            <textarea
              rows={4}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Record interview notes, compensation requirements, or feedback..."
              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-100"
              required
            />

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setNoteModal(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="indigo"
                size="sm"
              >
                Save Note
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* CANDIDATE PASSPORT MODAL */}
      <CandidatePassportModal
        passport={selectedCandidatePassport}
        onClose={() => setSelectedCandidatePassport(null)}
        onRefresh={loadData}
      />
    </div>
  );
};
