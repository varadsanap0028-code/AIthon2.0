import React, { useState, useEffect } from 'react';
import {
  X,
  Shield,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Code2,
  RefreshCw,
  Eye,
  Copy,
  Ban,
  Activity,
  Layers,
  HelpCircle,
} from 'lucide-react';
import { CodeDiffViewer } from './CodeDiffViewer';
import { adminApi, type IntegritySessionDetailResponse, type IntegrityComparisonResponse } from '../../../services/adminApi';

interface IntegrityDetailDrawerProps {
  sessionId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onDecisionSubmitted: () => void;
  onOpenModelHelp: () => void;
}

export const IntegrityDetailDrawer: React.FC<IntegrityDetailDrawerProps> = ({
  sessionId,
  isOpen,
  onClose,
  onDecisionSubmitted,
  onOpenModelHelp,
}) => {
  const [detail, setDetail] = useState<IntegritySessionDetailResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Review Form state
  const [decision, setDecision] = useState<'clean' | 'violation' | 'escalate'>('clean');
  const [notes, setNotes] = useState('');
  const [invalidateScore, setInvalidateScore] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [recomputing, setRecomputing] = useState(false);

  // Comparison state
  const [comparisonTarget, setComparisonTarget] = useState<'initial' | string>('initial');
  const [comparisonData, setComparisonData] = useState<IntegrityComparisonResponse | null>(null);
  const [comparisonLoading, setComparisonLoading] = useState(false);

  // Fetch session details
  const fetchDetail = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminApi.getIntegritySessionDetail(id);
      setDetail(data);

      // Pre-fill notes if already reviewed
      if (data.reviews && data.reviews.length > 0) {
        const last = data.reviews[0];
        setNotes(last.note || '');
        if (['no_concern', 'clean', 'cleared'].includes(last.decision)) setDecision('clean');
        else if (['concern_confirmed', 'violation', 'flagged'].includes(last.decision)) setDecision('violation');
        else if (['needs_followup', 'escalate'].includes(last.decision)) setDecision('escalate');
      } else {
        setNotes('');
        setDecision('clean');
        setInvalidateScore(false);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load session integrity details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sessionId && isOpen) {
      fetchDetail(sessionId);
      setComparisonTarget('initial');
      setComparisonData(null);
    } else {
      setDetail(null);
    }
  }, [sessionId, isOpen]);

  // Load peer comparison diff when target changes to a peer session
  useEffect(() => {
    if (sessionId && comparisonTarget !== 'initial') {
      setComparisonLoading(true);
      adminApi
        .getIntegrityComparison(sessionId, comparisonTarget)
        .then(setComparisonData)
        .catch(() => setComparisonData(null))
        .finally(() => setComparisonLoading(false));
    } else {
      setComparisonData(null);
    }
  }, [sessionId, comparisonTarget]);

  // Handle recompute
  const handleRecompute = async () => {
    if (!sessionId) return;
    setRecomputing(true);
    try {
      await adminApi.recomputeIntegrityRisk(sessionId);
      await fetchDetail(sessionId);
    } catch (err: any) {
      alert(`Recompute failed: ${err.message}`);
    } finally {
      setRecomputing(false);
    }
  };

  // Submit decision
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionId || notes.trim().length < 5) return;

    setSubmitting(true);
    try {
      await adminApi.submitIntegrityReview(sessionId, {
        decision,
        notes: notes.trim(),
        invalidateScore: decision === 'violation' ? invalidateScore : false,
      });
      onDecisionSubmitted();
      onClose();
    } catch (err: any) {
      alert(`Submission failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  // Code for initial vs final diff
  const firstSnapshot = detail?.snapshots?.[0]?.code || '';
  const finalSnapshot = detail?.snapshots?.[detail.snapshots.length - 1]?.code || firstSnapshot;

  const bandBadge = {
    low: { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Low Risk' },
    medium: { bg: 'bg-amber-50 text-amber-700 border-amber-200', label: 'Medium Risk' },
    high: { bg: 'bg-red-50 text-red-700 border-red-200', label: 'High Risk' },
  }[detail?.risk?.band || 'low'];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-6xl h-full shadow-2xl flex flex-col border-l border-slate-200">
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  {detail?.session?.candidateName || 'Candidate Attempt'}
                </h2>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${bandBadge.bg}`}>
                  {bandBadge.label} ({detail?.risk?.score ?? 0}/100)
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {detail?.session?.id}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {detail?.session?.candidateEmail} &bull; {detail?.session?.role || 'Assessment'} &bull; Domain: {detail?.session?.domainId}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRecompute}
              disabled={recomputing || loading}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              title="Recalculate risk score from latest events"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${recomputing ? 'animate-spin' : ''}`} />
              <span>Recompute</span>
            </button>

            <button
              type="button"
              onClick={onOpenModelHelp}
              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
              title="How this score works"
            >
              <HelpCircle className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-slate-500 font-medium">Loading session audit details...</span>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-600 text-xs">{error}</div>
        ) : !detail ? null : (
          <div className="flex-1 overflow-hidden grid grid-cols-12 divide-x divide-slate-200">
            {/* COLUMN 1: Event Timeline (2.5 / 12) */}
            <div className="col-span-3 flex flex-col h-full overflow-hidden bg-slate-50/30">
              <div className="px-4 py-3 border-b border-slate-200 bg-white flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-indigo-600" />
                  Proctoring Timeline
                </span>
                <span className="text-[10px] text-slate-400">
                  {detail.timeline.length} events
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {detail.timeline.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400">
                    No proctoring anomalies or notable events recorded during this session.
                  </div>
                ) : (
                  detail.timeline.map((evt, idx) => {
                    const isPaste = evt.type === 'paste_blocked' || evt.type === 'paste';
                    const isExit = evt.type === 'fullscreen_exit';
                    const isBlur = evt.type === 'visibility_hidden' || evt.type === 'blur';
                    const isCamera = evt.type === 'camera_unauthorized' || evt.type === 'no_face';

                    return (
                      <div key={evt.id || idx} className="flex items-start gap-2.5 text-xs">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                            isPaste
                              ? 'bg-amber-100 text-amber-700'
                              : isExit || isCamera
                              ? 'bg-red-100 text-red-700'
                              : isBlur
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {isPaste ? (
                            <Copy className="w-3 h-3" />
                          ) : isExit ? (
                            <AlertTriangle className="w-3 h-3" />
                          ) : isCamera ? (
                            <Eye className="w-3 h-3" />
                          ) : (
                            <Clock className="w-3 h-3" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-800 text-[11px] truncate">
                              {evt.type.replace(/_/g, ' ')}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              +{evt.relativeSeconds}s
                            </span>
                          </div>
                          {evt.meta?.pastedLength && (
                            <p className="text-[10px] text-amber-700 font-medium">
                              Pasted: {evt.meta.pastedLength} characters
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* COLUMN 2: Code Diff & Solution Inspector (5.5 / 12) */}
            <div className="col-span-5 flex flex-col h-full overflow-hidden bg-white">
              {/* Diff Mode Selector */}
              <div className="px-4 py-2.5 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Code2 className="w-3.5 h-3.5 text-indigo-600" />
                  Code Inspection & Diff
                </span>

                <div className="flex items-center gap-2">
                  <select
                    value={comparisonTarget}
                    onChange={(e) => setComparisonTarget(e.target.value)}
                    className="text-xs font-medium border border-slate-200 rounded-lg px-2.5 py-1 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="initial">Compare: Initial Snapshot vs Final Code</option>
                    {detail.similarSessions.map((peer) => (
                      <option key={peer.sessionId} value={peer.sessionId}>
                        Compare with {peer.pseudonym} ({peer.similarityPct}% match)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Code viewer */}
              <div className="flex-1 p-4 overflow-y-auto">
                {comparisonLoading ? (
                  <div className="h-64 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : comparisonTarget === 'initial' ? (
                  <CodeDiffViewer
                    originalCode={firstSnapshot}
                    modifiedCode={finalSnapshot}
                    originalLabel="Initial Autosave Snapshot"
                    modifiedLabel="Final Submitted Solution"
                    language={detail.snapshots[0]?.language || 'python'}
                  />
                ) : comparisonData ? (
                  <CodeDiffViewer
                    originalCode={comparisonData.otherCode}
                    modifiedCode={comparisonData.sessionCode}
                    originalLabel={`${comparisonData.otherCandidateLabel} (${comparisonData.similarityPct}% match)`}
                    modifiedLabel="Current Candidate Submission"
                    language={comparisonData.sessionLanguage}
                  />
                ) : (
                  <div className="p-8 text-center text-xs text-slate-400">
                    No comparison data available for this session.
                  </div>
                )}
              </div>
            </div>

            {/* COLUMN 3: Risk Breakdown & Review Decision Form (4 / 12) */}
            <div className="col-span-4 flex flex-col h-full overflow-hidden bg-slate-50/40">
              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                {/* 1. Why This Score */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-indigo-600" />
                      Risk Factor Contributions
                    </span>
                    <button
                      type="button"
                      onClick={onOpenModelHelp}
                      className="text-[11px] text-indigo-600 hover:underline font-medium"
                    >
                      Formula details
                    </button>
                  </div>

                  {/* Top 3 Plain English Reasons */}
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Primary Indicators</span>
                    {detail.risk.reasons.map((r, i) => (
                      <div key={i} className="flex items-start gap-1.5 text-xs text-slate-800">
                        <span className="text-indigo-600 font-bold">&bull;</span>
                        <span className="leading-snug">{r}</span>
                      </div>
                    ))}
                  </div>

                  {/* Horizontal contribution bars */}
                  <div className="space-y-2 pt-1">
                    {Object.entries(detail.risk.contributions).map(([feat, cont]) => {
                      const pct = Math.min(100, Math.round((cont / 2.5) * 100));
                      return (
                        <div key={feat} className="space-y-0.5">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-600 font-mono">{feat}</span>
                            <span className="font-semibold text-slate-900">+{cont}</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Candidate & Test Scores */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                  <span className="text-xs font-bold text-slate-900">Attempt Benchmark</span>
                  <div className="grid grid-cols-3 gap-2 text-center pt-1">
                    <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                      <div className="text-[10px] text-slate-500 font-medium">Technical</div>
                      <div className="text-sm font-bold text-slate-900">{detail.scores.technicalScore}%</div>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                      <div className="text-[10px] text-slate-500 font-medium">Knowledge</div>
                      <div className="text-sm font-bold text-slate-900">{detail.scores.knowledgeScore}%</div>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                      <div className="text-[10px] text-slate-500 font-medium">Practical</div>
                      <div className="text-sm font-bold text-slate-900">{detail.scores.practicalScore}%</div>
                    </div>
                  </div>
                </div>

                {/* 3. Decision Form */}
                <form onSubmit={handleSubmitReview} className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-4">
                  <span className="text-xs font-bold text-slate-900">Admin Proctoring Judgment</span>

                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setDecision('clean')}
                      className={`p-2 rounded-lg text-xs font-bold flex flex-col items-center gap-1 border transition-all cursor-pointer ${
                        decision === 'clean'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-500 shadow-xs ring-1 ring-emerald-500'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Clean</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDecision('violation')}
                      className={`p-2 rounded-lg text-xs font-bold flex flex-col items-center gap-1 border transition-all cursor-pointer ${
                        decision === 'violation'
                          ? 'bg-red-50 text-red-700 border-red-500 shadow-xs ring-1 ring-red-500'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <Ban className="w-4 h-4 text-red-600" />
                      <span>Violation</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDecision('escalate')}
                      className={`p-2 rounded-lg text-xs font-bold flex flex-col items-center gap-1 border transition-all cursor-pointer ${
                        decision === 'escalate'
                          ? 'bg-purple-50 text-purple-700 border-purple-500 shadow-xs ring-1 ring-purple-500'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <AlertTriangle className="w-4 h-4 text-purple-600" />
                      <span>Escalate</span>
                    </button>
                  </div>

                  {/* Notes / Rationale */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-700">
                      Audit Notes & Review Rationale <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      placeholder="Explain findings from code analysis, event logs, and diff inspection (minimum 5 characters)..."
                      className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                      required
                    />
                  </div>

                  {/* Invalidate Score Checkbox (Only if violation) */}
                  {decision === 'violation' && (
                    <label className="flex items-start gap-2.5 p-3 rounded-lg bg-red-50/60 border border-red-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={invalidateScore}
                        onChange={(e) => setInvalidateScore(e.target.checked)}
                        className="mt-0.5 rounded text-red-600 focus:ring-red-500"
                      />
                      <div className="text-xs">
                        <strong className="font-semibold text-red-900 block">Invalidate Candidate Benchmark Score</strong>
                        <span className="text-red-700 text-[11px] leading-tight block">
                          Resets technical score to 0 and downgrades candidate skills from verified to unverified.
                        </span>
                      </div>
                    </label>
                  )}

                  <button
                    type="submit"
                    disabled={submitting || notes.trim().length < 5}
                    className="w-full py-2.5 rounded-xl text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 transition-colors cursor-pointer shadow-xs"
                  >
                    {submitting ? 'Recording Decision...' : 'Confirm Review Decision'}
                  </button>
                </form>

                {/* 4. Prior Reviews History */}
                {detail.reviews && detail.reviews.length > 0 && (
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                    <span className="text-xs font-bold text-slate-900">Review Audit Log</span>
                    <div className="space-y-2 pt-1">
                      {detail.reviews.map((rev) => (
                        <div key={rev.id} className="text-xs p-2.5 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-800">{rev.reviewer_name || 'Admin'}</span>
                            <span className="text-[10px] text-slate-400">
                              {new Date(rev.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-slate-600 text-[11px]">{rev.note}</p>
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700">
                            {rev.decision}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
