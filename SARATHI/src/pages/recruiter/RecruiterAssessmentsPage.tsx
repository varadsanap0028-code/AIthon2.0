import React, { useState, useEffect } from 'react';
import { Plus, ChevronRight, FileCode } from 'lucide-react';
import { recruiterApi } from '../../services/recruiterApiService';
import type { JobItem } from '../../services/recruiterApiService';
import { useRecruiter } from '../../context/RecruiterContext';
import { PageHeader, Card, Badge, Button, Modal, EmptyState } from '../../components/common';

export const RecruiterAssessmentsPage: React.FC = () => {
  const { activeOrgId, refreshKey, showToast } = useRecruiter();
  const [templates, setTemplates] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [, setLoading] = useState(true);

  // Assign Modal
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignTemplateId, setAssignTemplateId] = useState('');
  const [assignCandidateId, setAssignCandidateId] = useState('');
  const [assignJobId, setAssignJobId] = useState('');
  const [assignDeadlineDays, setAssignDeadlineDays] = useState(7);
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [tmplData, asgnData, candData, jobData] = await Promise.all([
        recruiterApi.getAssessmentTemplates(),
        recruiterApi.getAssessmentAssignments(),
        recruiterApi.searchCandidates({ limit: 50 }),
        recruiterApi.getJobs('published'),
      ]);
      setTemplates(tmplData);
      setAssignments(asgnData);
      setCandidates(candData.candidates);
      setJobs(jobData);
      if (tmplData.length > 0) setAssignTemplateId(tmplData[0].id);
      if (candData.candidates.length > 0) setAssignCandidateId(candData.candidates[0].id);
    } catch (err: any) {
      showToast(err.message || 'Failed to load assessments', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeOrgId, refreshKey]);

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignTemplateId || !assignCandidateId) return;

    try {
      setSubmitting(true);
      await recruiterApi.assignAssessment({
        templateId: assignTemplateId,
        candidateId: assignCandidateId,
        jobId: assignJobId || undefined,
        deadlineDays: assignDeadlineDays,
      });

      showToast('Practical assessment invited successfully!', 'success');
      setIsAssignModalOpen(false);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to assign assessment', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <PageHeader
        title="Standardized Skill Assessments"
        description="Assign multi-domain practical coding challenges, review rubric grading, and automatically award verified skill credentials."
        badge={
          <Badge variant="indigo" size="sm" dot>
            Practical Evaluations
          </Badge>
        }
        actions={
          <Button
            variant="indigo"
            size="md"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => setIsAssignModalOpen(true)}
          >
            Assign Assessment
          </Button>
        }
      />

      {/* APPROVED ASSESSMENT TEMPLATES CATALOG */}
      <div className="space-y-4">
        <h3 className="text-base font-extrabold text-slate-900">Approved Domain Assessment Catalogs</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {templates.map(tmpl => (
            <Card
              key={tmpl.id}
              className="p-5 flex flex-col justify-between space-y-3 hover:border-indigo-300 transition-all"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded uppercase bg-indigo-50 text-indigo-700">
                    {tmpl.domain_title}
                  </span>
                  <span className="text-[11px] font-bold text-slate-500">{tmpl.duration_minutes} Mins</span>
                </div>
                <h4 className="text-sm font-extrabold text-slate-900 leading-snug">{tmpl.title}</h4>
                <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">{tmpl.description}</p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-semibold">Passing: {tmpl.passing_score}%</span>
                <button
                  onClick={() => {
                    setAssignTemplateId(tmpl.id);
                    setIsAssignModalOpen(true);
                  }}
                  className="font-bold text-indigo-600 hover:underline flex items-center gap-1"
                >
                  <span>Assign</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* ACTIVE CANDIDATE ASSIGNMENTS LIST */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-extrabold text-slate-900">Assigned Candidate Assessments</h3>
            <p className="text-xs text-slate-500">Live invitation, submission, and grading tracking</p>
          </div>
          <span className="text-xs font-bold text-slate-400">{assignments.length} Total Assignments</span>
        </div>

        {assignments.length === 0 ? (
          <EmptyState
            icon={FileCode}
            title="No Assessments Assigned Yet"
            description="Assign standardized technical challenges to candidates to evaluate code quality, system design, and algorithms."
            action={
              <Button
                variant="indigo"
                size="sm"
                icon={<Plus className="w-4 h-4" />}
                onClick={() => setIsAssignModalOpen(true)}
              >
                Assign Assessment
              </Button>
            }
            variant="indigo"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px] font-bold">
                  <th className="pb-3">Candidate</th>
                  <th className="pb-3">Assessment Challenge</th>
                  <th className="pb-3">Associated Job</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Score & Rubric</th>
                  <th className="pb-3">Assigned Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                {assignments.map(asgn => (
                  <tr key={asgn.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 flex items-center gap-2">
                      <img
                        src={asgn.candidate_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${asgn.candidate_name}`}
                        alt={asgn.candidate_name}
                        className="w-7 h-7 rounded-lg object-cover bg-slate-100"
                      />
                      <div>
                        <span className="font-extrabold text-slate-900 block">{asgn.candidate_name}</span>
                        <span className="text-[10px] text-slate-400">{asgn.candidate_email}</span>
                      </div>
                    </td>
                    <td className="py-3.5 font-bold text-slate-800">{asgn.template_title}</td>
                    <td className="py-3.5 text-slate-600">{asgn.job_title || 'General Evaluation'}</td>
                    <td className="py-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        asgn.status === 'completed'
                          ? 'bg-emerald-50 text-emerald-800'
                          : asgn.status === 'invited'
                          ? 'bg-blue-50 text-blue-800'
                          : 'bg-amber-50 text-amber-800'
                      }`}>
                        {asgn.status}
                      </span>
                    </td>
                    <td className="py-3.5">
                      {asgn.result_score !== null && asgn.result_score !== undefined ? (
                        <span className="font-black text-emerald-600 text-sm">{asgn.result_score}% (Passed)</span>
                      ) : (
                        <span className="text-slate-400">Awaiting Submission</span>
                      )}
                    </td>
                    <td className="py-3.5 text-slate-400">{new Date(asgn.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ASSIGN ASSESSMENT MODAL */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title="Assign Technical Assessment"
        subtitle="Invite a candidate to demonstrate hands-on competencies with timed code evaluation"
        maxWidth="lg"
      >
        <form onSubmit={handleAssignSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Select Challenge Template *</label>
            <select
              value={assignTemplateId}
              onChange={(e) => setAssignTemplateId(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-indigo-100"
              required
            >
              {templates.map(t => (
                <option key={t.id} value={t.id}>
                  {t.title} ({t.domain_title} • {t.duration_minutes}m)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Target Candidate *</label>
            <select
              value={assignCandidateId}
              onChange={(e) => setAssignCandidateId(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-indigo-100"
              required
            >
              {candidates.map(c => (
                <option key={c.id} value={c.id}>
                  {c.full_name} ({c.target_role || 'Candidate'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Associate With Job Posting (Optional)</label>
            <select
              value={assignJobId}
              onChange={(e) => setAssignJobId(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-indigo-100"
            >
              <option value="">-- No specific job association --</option>
              {jobs.map(j => (
                <option key={j.id} value={j.id}>{j.title}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Submission Deadline (Days)</label>
            <input
              type="number"
              min="1"
              max="30"
              value={assignDeadlineDays}
              onChange={(e) => setAssignDeadlineDays(Number(e.target.value))}
              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAssignModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="indigo"
              size="sm"
              isLoading={submitting}
            >
              {submitting ? 'Assigning...' : 'Send Assessment Invitation'}
            </Button>
          </div>
        </form>
      </Modal>

    </div>
  );
};
