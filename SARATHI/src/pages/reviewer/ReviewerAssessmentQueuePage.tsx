import React, { useEffect, useState, useCallback } from 'react';
import { ShieldCheck, AlertCircle, CheckCircle2, User, FileText, ChevronRight } from 'lucide-react';
import { AssessmentReviewService, type ReviewQueueItem } from '../../services/assessmentReviewService';
import { useAuth } from '../../context/AuthContext';

export const ReviewerAssessmentQueuePage: React.FC = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<ReviewQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [sessionDetail, setSessionDetail] = useState<any>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const loadQueue = useCallback(async () => {
    try {
      setLoading(true);
      const queue = await AssessmentReviewService.getReviewQueue({}, user || undefined);
      setItems(queue);
    } catch (err: any) {
      console.error('Failed to load review queue:', err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  const handleSelectSession = async (sessionId: string) => {
    setSelectedSessionId(sessionId);
    try {
      const detail = await AssessmentReviewService.getSessionReviewDetail(sessionId, user || undefined);
      setSessionDetail(detail);
    } catch (err: any) {
      console.error('Failed to load session details:', err.message);
    }
  };

  const handleDecision = async (decision: 'no_concern' | 'needs_followup' | 'concern_confirmed') => {
    if (!selectedSessionId || submittingReview) return;
    try {
      setSubmittingReview(true);
      await AssessmentReviewService.submitReviewDecision(
        selectedSessionId,
        { decision, note: reviewNote || `Review marked as ${decision}` },
        user || undefined
      );
      setReviewNote('');
      setSelectedSessionId(null);
      setSessionDetail(null);
      await loadQueue();
    } catch (err: any) {
      alert(`Error submitting review: ${err.message}`);
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center space-x-2.5">
          <ShieldCheck className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
          <span>Assessment Review Queue</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">Review flagged attempts, inspect environment signals, and confirm verification.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Queue List */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Attempt Records ({items.length})</h2>
            <button onClick={loadQueue} className="text-xs text-indigo-600 hover:text-indigo-500 font-medium cursor-pointer">Refresh</button>
          </div>

          {loading ? (
            <div className="p-12 text-center text-xs text-slate-400">Loading attempts...</div>
          ) : items.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400">No attempts currently require review.</div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {items.map(item => (
                <div
                  key={item.sessionId}
                  onClick={() => handleSelectSession(item.sessionId)}
                  className={`p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors ${
                    selectedSessionId === item.sessionId ? 'bg-indigo-50/50 dark:bg-indigo-950/20' : ''
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-900 dark:text-white">{item.candidateName}</div>
                      <div className="text-[11px] text-slate-500">{item.role} · Score: <span className="font-semibold text-indigo-600">{item.technicalScore}%</span></div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    {item.integritySummary.level === 'notable' ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                        <AlertCircle className="w-3 h-3 mr-1" /> Notable Signals ({item.integritySummary.eventCount})
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Cleared
                      </span>
                    )}
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Detail Panel */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
          {sessionDetail ? (
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center justify-between">
                <span>Attempt Inspection</span>
                <span className="text-xs text-indigo-600 font-semibold">{sessionDetail.session.mode.toUpperCase()}</span>
              </h2>

              <div className="text-xs space-y-1.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <div><span className="text-slate-500">Candidate:</span> <span className="font-medium text-slate-800 dark:text-slate-200">{sessionDetail.session.candidateName}</span></div>
                <div><span className="text-slate-500">Domain:</span> <span className="font-medium text-slate-800 dark:text-slate-200">{sessionDetail.session.domainId}</span></div>
                <div><span className="text-slate-500">Away Events:</span> <span className="font-semibold text-amber-600">{sessionDetail.integrity.summary.awayCount}</span></div>
                <div><span className="text-slate-500">Longest Away:</span> <span className="font-medium text-slate-800 dark:text-slate-200">{sessionDetail.integrity.summary.longestAwaySec}s</span></div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Reviewer Note / Rationale</label>
                <textarea
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  placeholder="Record your observation or justification..."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  rows={3}
                />
              </div>

              <div className="space-y-2 pt-2">
                <button
                  onClick={() => handleDecision('no_concern')}
                  disabled={submittingReview}
                  className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium transition-colors cursor-pointer"
                >
                  Confirm Diagnostic Badge (No Concern)
                </button>
                <button
                  onClick={() => handleDecision('concern_confirmed')}
                  disabled={submittingReview}
                  className="w-full py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium transition-colors cursor-pointer"
                >
                  Flag Integrity Discrepancy
                </button>
              </div>
            </div>
          ) : (
            <div className="py-20 text-center text-xs text-slate-400">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
              Select an attempt from the queue to inspect timeline and record review.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
