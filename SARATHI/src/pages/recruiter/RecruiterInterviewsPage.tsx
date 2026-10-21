import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  Video,
  Plus,
  Star,
  ExternalLink
} from 'lucide-react';
import { recruiterApi } from '../../services/recruiterApiService';
import type { JobItem } from '../../services/recruiterApiService';
import { useRecruiter } from '../../context/RecruiterContext';
import { PageHeader, Card, Badge, Button, Modal, EmptyState } from '../../components/common';

export const RecruiterInterviewsPage: React.FC = () => {
  const { activeOrgId, refreshKey, showToast } = useRecruiter();
  const [interviews, setInterviews] = useState<any[]>([]);
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Schedule Modal
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [formCandidateId, setFormCandidateId] = useState('');
  const [formJobId, setFormJobId] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formType, setFormType] = useState('technical');
  const [formDateTime, setFormDateTime] = useState('');
  const formDuration = 60;
  const [formMeetingLink, setFormMeetingLink] = useState('https://meet.google.com/sarathi-tech-eval');
  const [submittingSchedule, setSubmittingSchedule] = useState(false);

  // Feedback Modal
  const [feedbackInterviewId, setFeedbackInterviewId] = useState<string | null>(null);
  const [techRating, setTechRating] = useState(4);
  const [commRating, setCommRating] = useState(4);
  const [recommendation, setRecommendation] = useState('hire');
  const [feedbackNotes, setFeedbackNotes] = useState('');
  const [confidentialNotes, setConfidentialNotes] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [intData, jobsData, candsData] = await Promise.all([
        recruiterApi.getInterviews(),
        recruiterApi.getJobs('published'),
        recruiterApi.searchCandidates({ limit: 50 }),
      ]);
      setInterviews(intData);
      setJobs(jobsData);
      setCandidates(candsData.candidates);
      if (jobsData.length > 0) setFormJobId(jobsData[0].id);
      if (candsData.candidates.length > 0) setFormCandidateId(candsData.candidates[0].id);
    } catch (err: any) {
      showToast(err.message || 'Failed to load interviews', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeOrgId, refreshKey]);

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCandidateId || !formJobId || !formTitle.trim() || !formDateTime) return;

    try {
      setSubmittingSchedule(true);
      await recruiterApi.scheduleInterview({
        candidateId: formCandidateId,
        jobId: formJobId,
        title: formTitle.trim(),
        interviewType: formType,
        scheduledAt: new Date(formDateTime).toISOString(),
        durationMinutes: formDuration,
        meetingLink: formMeetingLink,
      });

      showToast('Technical interview booked and calendar invites dispatched!', 'success');
      setIsScheduleOpen(false);
      setFormTitle('');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to schedule interview', 'error');
    } finally {
      setSubmittingSchedule(false);
    }
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackInterviewId || !feedbackNotes.trim()) return;

    try {
      setSubmittingFeedback(true);
      await recruiterApi.submitInterviewFeedback(feedbackInterviewId, {
        technicalRating: techRating,
        communicationRating: commRating,
        overallRecommendation: recommendation,
        feedbackNotes: feedbackNotes.trim(),
        confidentialNotes: confidentialNotes.trim() || undefined,
      });

      showToast('Structured interview rubric evaluation recorded!', 'success');
      setFeedbackInterviewId(null);
      setFeedbackNotes('');
      setConfidentialNotes('');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to submit feedback', 'error');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <PageHeader
        title="Technical Interviews & Panel Feedback"
        description="Coordinate technical panels, share structured evaluation rubrics, and record hiring recommendations."
        badge={
          <Badge variant="indigo" size="sm" dot>
            Live Technical Panels
          </Badge>
        }
        actions={
          <Button
            variant="indigo"
            size="md"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => {
              const nextDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
              setFormDateTime(nextDate.toISOString().slice(0, 16));
              setFormTitle('Technical Architecture Deep-Dive');
              setIsScheduleOpen(true);
            }}
          >
            Schedule Interview
          </Button>
        }
      />

      {/* INTERVIEWS LIST */}
      <div className="space-y-4">
        {loading ? (
          <div className="space-y-3 animate-pulse">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-slate-200 rounded-3xl" />
            ))}
          </div>
        ) : interviews.length === 0 ? (
          <Card>
            <EmptyState
              icon={Calendar}
              title="No Interviews Currently Scheduled"
              description="Schedule a technical architecture or live coding interview session with your shortlisted candidates."
              action={
                <Button
                  variant="indigo"
                  size="sm"
                  icon={<Plus className="w-4 h-4" />}
                  onClick={() => {
                    const nextDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
                    setFormDateTime(nextDate.toISOString().slice(0, 16));
                    setFormTitle('Technical Architecture Deep-Dive');
                    setIsScheduleOpen(true);
                  }}
                >
                  Schedule Interview
                </Button>
              }
              variant="indigo"
            />
          </Card>
        ) : (
          <div className="space-y-4">
            {interviews.map(int => (
              <div
                key={int.id}
                className="bg-white rounded-3xl border border-slate-200 hover:border-indigo-300 p-6 shadow-xs hover:shadow-md transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6"
              >
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                      {int.interview_type.replace('_', ' ')}
                    </span>
                    <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                      int.status === 'completed'
                        ? 'bg-emerald-50 text-emerald-800'
                        : int.status === 'cancelled'
                        ? 'bg-rose-50 text-rose-800'
                        : 'bg-blue-50 text-blue-800'
                    }`}>
                      {int.status}
                    </span>
                    <span className="text-xs text-slate-400">•</span>
                    <span className="text-xs font-bold text-slate-600">{int.job_title}</span>
                  </div>

                  <h3 className="text-base font-extrabold text-slate-900 leading-snug">{int.title}</h3>

                  <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                    <span className="font-semibold text-slate-800">Candidate: {int.candidate_name}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1 font-medium">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {new Date(int.scheduled_at).toLocaleString()} ({int.duration_minutes}m)
                    </span>
                  </div>

                  {int.meeting_link && (
                    <div className="pt-1">
                      <a
                        href={int.meeting_link}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
                      >
                        <Video className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Launch Virtual Meeting Room</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="shrink-0 flex items-center gap-2 w-full sm:w-auto">
                  {int.status === 'scheduled' && (
                    <button
                      onClick={() => setFeedbackInterviewId(int.id)}
                      className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
                    >
                      <Star className="w-4 h-4 text-amber-400" />
                      <span>Submit Rubric Feedback</span>
                    </button>
                  )}
                  {int.status === 'completed' && (
                    <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                      Feedback Recorded ({int.feedback_count} reviews)
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SCHEDULE INTERVIEW MODAL */}
      <Modal
        isOpen={isScheduleOpen}
        onClose={() => setIsScheduleOpen(false)}
        title="Schedule Technical Evaluation"
        maxWidth="md"
      >
        <form onSubmit={handleScheduleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Interview Title *</label>
            <input
              type="text"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="e.g. Systems Architecture Deep-Dive"
              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Candidate *</label>
              <select
                value={formCandidateId}
                onChange={(e) => setFormCandidateId(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                required
              >
                {candidates.map(c => (
                  <option key={c.id} value={c.id}>{c.full_name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Job Role *</label>
              <select
                value={formJobId}
                onChange={(e) => setFormJobId(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                required
              >
                {jobs.map(j => (
                  <option key={j.id} value={j.id}>{j.title}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Interview Type</label>
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="technical">Technical Live Coding</option>
                <option value="system_design">System Architecture Design</option>
                <option value="screening">Initial Screening</option>
                <option value="culture_fit">Values & Team Fit</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Date & Time *</label>
              <input
                type="datetime-local"
                value={formDateTime}
                onChange={(e) => setFormDateTime(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Meeting Link</label>
            <input
              type="text"
              value={formMeetingLink}
              onChange={(e) => setFormMeetingLink(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsScheduleOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={submittingSchedule}
            >
              {submittingSchedule ? 'Booking...' : 'Book Interview'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* FEEDBACK RUBRIC MODAL */}
      <Modal
        isOpen={!!feedbackInterviewId}
        onClose={() => setFeedbackInterviewId(null)}
        title="Interviewer Rubric Evaluation"
        maxWidth="md"
      >
        <form onSubmit={handleFeedbackSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Technical Rating (1-5)</label>
              <select
                value={techRating}
                onChange={(e) => setTechRating(Number(e.target.value))}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                {[1, 2, 3, 4, 5].map(r => (
                  <option key={r} value={r}>Rating {r} / 5</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Communication Rating (1-5)</label>
              <select
                value={commRating}
                onChange={(e) => setCommRating(Number(e.target.value))}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                {[1, 2, 3, 4, 5].map(r => (
                  <option key={r} value={r}>Rating {r} / 5</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Overall Recommendation *</label>
            <select
              value={recommendation}
              onChange={(e) => setRecommendation(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="strong_hire">Strong Hire (Top 5%)</option>
              <option value="hire">Hire (Meets All Standards)</option>
              <option value="lean_hire">Lean Hire</option>
              <option value="lean_no_hire">Lean No Hire</option>
              <option value="no_hire">No Hire</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Feedback Notes & Code Observations *</label>
            <textarea
              rows={3}
              value={feedbackNotes}
              onChange={(e) => setFeedbackNotes(e.target.value)}
              placeholder="Detail problem solving approach, algorithmic complexity, and design choices..."
              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              required
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Confidential Hiring Committee Notes (Optional)</label>
            <textarea
              rows={2}
              value={confidentialNotes}
              onChange={(e) => setConfidentialNotes(e.target.value)}
              placeholder="Private interviewer thoughts and compensation guidance..."
              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setFeedbackInterviewId(null)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={submittingFeedback}
            >
              {submittingFeedback ? 'Submitting...' : 'Submit Evaluation'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
