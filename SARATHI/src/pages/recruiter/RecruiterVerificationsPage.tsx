import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ExternalLink,
  CheckCircle2,
  XCircle,
  FolderGit2
} from 'lucide-react';
import { recruiterApi } from '../../services/recruiterApiService';
import { useRecruiter } from '../../context/RecruiterContext';
import { PageHeader } from '../../components/common/PageHeader';
import { EmptyState } from '../../components/common/EmptyState';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';

export const RecruiterVerificationsPage: React.FC = () => {
  const { activeOrgId, refreshKey, showToast } = useRecruiter();
  const [pendingItems, setPendingItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Review Modal State
  const [selectedReviewItem, setSelectedReviewItem] = useState<any | null>(null);
  const [decision, setDecision] = useState<'verified' | 'rejected'>('verified');
  const [decisionRationale, setDecisionRationale] = useState('');
  const [awardedProficiency, setAwardedProficiency] = useState<number>(4);
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const items = await recruiterApi.getPendingVerifications();
      setPendingItems(items);
    } catch (err: any) {
      showToast(err.message || 'Failed to load verification queue', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeOrgId, refreshKey]);

  const openReviewModal = (item: any) => {
    setSelectedReviewItem(item);
    setDecision('verified');
    setDecisionRationale('');
    setAwardedProficiency(4);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReviewItem) return;

    if (!decisionRationale.trim() || decisionRationale.trim().length < 10) {
      showToast('A detailed decision rationale of at least 10 characters is required for audit compliance', 'error');
      return;
    }

    try {
      setSubmitting(true);
      await recruiterApi.submitReview({
        evidenceId: selectedReviewItem.id,
        decision,
        decisionRationale: decisionRationale.trim(),
        awardedProficiency,
      });

      showToast(`Evidence successfully marked as ${decision}`, 'success');
      setSelectedReviewItem(null);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to submit verification decision', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <PageHeader
        title="Skill Evidence Verification Queue"
        description="Review pull requests, repository architectures, and technical artifacts to award tamper-proof verified competencies."
        badge={
          <Badge variant="emerald" dot icon={<ShieldCheck className="w-3.5 h-3.5" />}>
            Authorized Assessor Review Desk
          </Badge>
        }
        actions={
          <div className="px-4 py-2 rounded-2xl bg-slate-50 border border-slate-200 text-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Pending Reviews</span>
            <span className="text-xl font-black text-amber-600">{pendingItems.length}</span>
          </div>
        }
      />

      {/* QUEUE LISTING */}
      {loading ? (
        <div className="space-y-4 animate-pulse">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-slate-200 rounded-3xl" />
          ))}
        </div>
      ) : pendingItems.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200">
          <EmptyState
            icon={<CheckCircle2 className="w-8 h-8 text-emerald-600" />}
            title="Verification Queue is Clear!"
            description="All submitted candidate code artifacts and PR claims have been evaluated against technical rubrics."
            variant="emerald"
          />
        </div>
      ) : (
        <div className="space-y-4">
          {pendingItems.map(item => (
            <div
              key={item.id}
              className="bg-white rounded-3xl border border-slate-200 hover:border-indigo-300 p-6 shadow-xs hover:shadow-md transition-all flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6"
            >
              <div className="space-y-3 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {item.evidence_type.replace('_', ' ')}
                  </span>
                  <span className="text-xs font-bold text-slate-900">{item.domain_title}</span>
                  <span className="text-slate-300">•</span>
                  <span className="text-xs font-black text-[#4F46E5]">{item.skill_name}</span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-900">{item.title}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Candidate: <strong>{item.candidate_name}</strong> ({item.target_role || 'Engineering'}) • Submitted {new Date(item.created_at).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex items-center gap-4 text-xs">
                  <a
                    href={item.reference_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
                  >
                    <FolderGit2 className="w-4 h-4" />
                    <span>Open Evidence Artifact ({item.reference_url})</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* Action */}
              <div className="shrink-0 w-full lg:w-auto">
                <button
                  onClick={() => openReviewModal(item)}
                  className="w-full lg:w-auto px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Evaluate & Record Decision</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* REVIEW DECISION MODAL */}
      <Modal
        isOpen={!!selectedReviewItem}
        onClose={() => setSelectedReviewItem(null)}
        title="Skill Verification Evaluation"
        subtitle={
          selectedReviewItem
            ? `Candidate: ${selectedReviewItem.candidate_name} • Skill: ${selectedReviewItem.skill_name}`
            : undefined
        }
        maxWidth="xl"
      >
        {selectedReviewItem && (
          <form onSubmit={handleSubmitReview} className="space-y-5">
            {/* Decision Choice */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-2">Verification Decision *</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setDecision('verified')}
                  className={`p-3 rounded-2xl border text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    decision === 'verified'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-200'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Approve & Verify</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDecision('rejected')}
                  className={`p-3 rounded-2xl border text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    decision === 'rejected'
                      ? 'border-rose-500 bg-rose-50 text-rose-800 ring-2 ring-rose-200'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <XCircle className="w-4 h-4 text-rose-600" />
                  <span>Reject Evidence</span>
                </button>
              </div>
            </div>

            {/* Awarded Proficiency (if verified) */}
            {decision === 'verified' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">Awarded Proficiency Level</label>
                  <span className="text-xs font-extrabold text-indigo-600">Level {awardedProficiency}/5</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="1"
                  value={awardedProficiency}
                  onChange={(e) => setAwardedProficiency(Number(e.target.value))}
                  className="w-full accent-indigo-600"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-semibold px-1">
                  <span>L1 Beginner</span>
                  <span>L2 Junior</span>
                  <span>L3 Mid</span>
                  <span>L4 Advanced</span>
                  <span>L5 Principal</span>
                </div>
              </div>
            )}

            {/* Mandatory Decision Rationale */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Assessor Audit Rationale * (Minimum 10 characters)
              </label>
              <textarea
                rows={4}
                value={decisionRationale}
                onChange={(e) => setDecisionRationale(e.target.value)}
                placeholder="Detail your assessment observations, code review quality, and proof of proficiency..."
                className="w-full p-3 rounded-xl border border-slate-200 text-xs leading-relaxed focus:ring-2 focus:ring-indigo-100 focus:outline-none"
                required
              />
            </div>

            {/* Modal Buttons */}
            <div className="pt-3 border-t border-slate-100 flex justify-end gap-3">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setSelectedReviewItem(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant={decision === 'verified' ? 'success' : 'danger'}
                size="sm"
                isLoading={submitting}
              >
                {`Confirm ${decision === 'verified' ? 'Verification' : 'Rejection'}`}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
