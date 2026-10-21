import React, { useState, useEffect } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  Download,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  ShieldCheck,
  Building,
  User,
  History,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { Drawer } from '../../../components/admin/Drawer';
import { ConfirmDialog } from '../../../components/admin/ConfirmDialog';
import { StatusDot } from '../../../components/admin/StatusDot';
import type { StatusType } from '../../../components/admin/StatusDot';
import { Skeleton } from '../../../components/admin/Skeleton';
import { adminApi } from '../../../services/adminApi';
import type { AdminApprovalDetail } from '../../../services/adminApi';

interface ApprovalDrawerProps {
  verificationId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onDecisionSubmitted: () => void;
}

export const ApprovalDrawer: React.FC<ApprovalDrawerProps> = ({
  verificationId,
  isOpen,
  onClose,
  onDecisionSubmitted,
}) => {
  const [detail, setDetail] = useState<AdminApprovalDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Document viewer state
  const [docBlobUrl, setDocBlobUrl] = useState<string | null>(null);
  const [docMime, setDocMime] = useState<string>('');
  const [docFilename, setDocFilename] = useState<string>('');
  const [docLoading, setDocLoading] = useState(false);
  const [docError, setDocError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  // Decision form state
  const [decision, setDecision] = useState<'approve' | 'reject' | 'needs_info'>('approve');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [override, setOverride] = useState(false);
  const [templates, setTemplates] = useState<string[]>([]);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Load reason templates once
  useEffect(() => {
    adminApi.getReasonTemplates().then(setTemplates).catch(() => {});
  }, []);

  // Fetch verification detail and document blob when drawer opens
  useEffect(() => {
    if (!isOpen || !verificationId) {
      setDetail(null);
      if (docBlobUrl) {
        URL.revokeObjectURL(docBlobUrl);
        setDocBlobUrl(null);
      }
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);
    setFormError(null);
    setZoom(1);
    setRotation(0);
    setOverride(false);

    // Fetch detail
    adminApi
      .getApprovalDetail(verificationId)
      .then((data) => {
        if (!active) return;
        setDetail(data);
        setDecision(data.status === 'pending' ? 'approve' : (data.status as any));
        setReason(data.decisionReason || '');
        setNotes(data.decisionNotes || '');
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message || 'Failed to load verification detail');
        setLoading(false);
      });

    // Fetch document attachment blob
    setDocLoading(true);
    setDocError(null);
    adminApi
      .fetchDocumentBlob(verificationId)
      .then((res) => {
        if (!active) return;
        setDocBlobUrl(res.blobUrl);
        setDocMime(res.mimeType);
        setDocFilename(res.filename);
        setDocLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setDocError(err.message || 'Failed to stream document attachment');
        setDocLoading(false);
      });

    return () => {
      active = false;
      if (docBlobUrl) {
        URL.revokeObjectURL(docBlobUrl);
      }
    };
  }, [isOpen, verificationId]);

  const handleZoomIn = () => setZoom((z) => Math.min(3, Number((z + 0.25).toFixed(2))));
  const handleZoomOut = () => setZoom((z) => Math.max(0.5, Number((z - 0.25).toFixed(2))));
  const handleResetView = () => {
    setZoom(1);
    setRotation(0);
  };
  const handleRotate = () => setRotation((r) => (r + 90) % 360);

  const handleTemplateSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val) {
      setReason(val);
      e.target.value = '';
    }
  };

  const handlePreSubmitCheck = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if ((decision === 'reject' || decision === 'needs_info') && reason.trim().length < 10) {
      setFormError('A detailed reason (at least 10 characters) is required when rejecting or requesting info.');
      return;
    }

    if (detail && detail.status !== 'pending' && !override) {
      setFormError('This verification has already been decided. Please check "Override previous decision" to continue.');
      return;
    }

    setIsConfirmOpen(true);
  };

  const handleExecuteDecision = async () => {
    if (!verificationId) return;
    setSubmitting(true);
    setFormError(null);

    try {
      await adminApi.submitApprovalDecision(verificationId, {
        decision,
        reason: reason.trim() || undefined,
        notes: notes.trim() || undefined,
        override,
      });
      setIsConfirmOpen(false);
      setSubmitting(false);
      onDecisionSubmitted();
      onClose();
    } catch (err: any) {
      setFormError(err.message || 'Failed to submit verification decision');
      setSubmitting(false);
      setIsConfirmOpen(false);
    }
  };

  if (!isOpen) return null;

  const isPdf = docMime.includes('pdf') || docFilename.toLowerCase().endsWith('.pdf');
  const isPending = detail?.status === 'pending';

  return (
    <>
      <Drawer
        isOpen={isOpen}
        onClose={onClose}
        title={detail?.company.name || 'Verification Review'}
        subtitle={
          detail
            ? `${detail.document.documentType.toUpperCase()} Document • Submitted ${new Date(
                detail.submittedAt
              ).toLocaleDateString()} (${detail.waitingHours}h waiting)`
            : 'Loading verification item...'
        }
        width="max-w-[1080px]"
      >
        {loading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-8 w-1/3" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Skeleton className="h-[480px]" />
              <div className="space-y-4">
                <Skeleton className="h-32" />
                <Skeleton className="h-40" />
                <Skeleton className="h-32" />
              </div>
            </div>
          </div>
        ) : error ? (
          <div className="p-8 text-center space-y-3">
            <AlertCircle className="mx-auto text-[#DC2626]" size={36} />
            <p className="text-[14px] text-[#111827] font-medium">{error}</p>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-[#E5E7EB] rounded-[6px] text-[13px] font-medium text-[#111827] hover:bg-[#F9FAFB]"
            >
              Close
            </button>
          </div>
        ) : detail ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 min-h-full divide-y lg:divide-y-0 lg:divide-x divide-[#E5E7EB]">
            {/* Left Column: Secure Document Viewer */}
            <div className="lg:col-span-6 p-5 flex flex-col bg-[#F9FAFB]">
              <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB] mb-4">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {detail.document.documentType}
                  </span>
                  <span className="text-[12px] text-[#6B7280] truncate max-w-[180px]" title={detail.document.documentName}>
                    {detail.document.documentName}
                  </span>
                </div>

                {/* Viewer Controls */}
                <div className="flex items-center gap-1">
                  {!isPdf && (
                    <>
                      <button
                        type="button"
                        onClick={handleZoomIn}
                        title="Zoom In"
                        className="p-1.5 text-[#6B7280] hover:text-[#111827] hover:bg-white rounded transition-colors"
                      >
                        <ZoomIn size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={handleZoomOut}
                        title="Zoom Out"
                        className="p-1.5 text-[#6B7280] hover:text-[#111827] hover:bg-white rounded transition-colors"
                      >
                        <ZoomOut size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={handleRotate}
                        title="Rotate 90°"
                        className="p-1.5 text-[#6B7280] hover:text-[#111827] hover:bg-white rounded transition-colors"
                      >
                        <RotateCw size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={handleResetView}
                        title="Reset View"
                        className="p-1.5 text-[#6B7280] hover:text-[#111827] hover:bg-white rounded transition-colors"
                      >
                        <RotateCcw size={16} />
                      </button>
                    </>
                  )}
                  {docBlobUrl && (
                    <a
                      href={docBlobUrl}
                      download={docFilename || 'document'}
                      title="Download Original"
                      className="p-1.5 text-[#6B7280] hover:text-[#111827] hover:bg-white rounded transition-colors ml-1"
                    >
                      <Download size={16} />
                    </a>
                  )}
                </div>
              </div>

              {/* Document Display Canvas */}
              <div className="flex-1 min-h-[500px] border border-[#E5E7EB] bg-white rounded-lg overflow-hidden flex items-center justify-center relative">
                {docLoading ? (
                  <div className="flex flex-col items-center gap-2 p-6 text-center text-[#6B7280]">
                    <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    <span className="text-[13px]">Decrypting and streaming document...</span>
                  </div>
                ) : docError ? (
                  <div className="p-6 text-center text-red-600 space-y-2">
                    <AlertTriangle className="mx-auto" size={28} />
                    <p className="text-[13px] font-medium">{docError}</p>
                  </div>
                ) : docBlobUrl ? (
                  isPdf ? (
                    <iframe
                      src={docBlobUrl}
                      title="Verification Document"
                      className="w-full h-full min-h-[520px] border-none"
                    />
                  ) : (
                    <div className="w-full h-full min-h-[500px] overflow-auto flex items-center justify-center p-4">
                      <img
                        src={docBlobUrl}
                        alt="Verification Attachment"
                        style={{
                          transform: `scale(${zoom}) rotate(${rotation}deg)`,
                          transition: 'transform 150ms ease-in-out',
                        }}
                        className="max-w-full max-h-full object-contain rounded select-none shadow-xs"
                      />
                    </div>
                  )
                ) : (
                  <p className="text-[13px] text-[#6B7280]">No document preview available</p>
                )}
              </div>
            </div>

            {/* Right Column: Information, Hints, History, Decision */}
            <div className="lg:col-span-6 p-5 space-y-5 overflow-y-auto max-h-[calc(100vh-140px)]">
              {/* Company & Recruiter Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 border border-[#E5E7EB] rounded-lg bg-white space-y-1">
                  <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-[#6B7280]">
                    <Building size={13} />
                    <span>Company</span>
                  </div>
                  <h4 className="text-[14px] font-semibold text-[#111827] truncate">{detail.company.name}</h4>
                  <p className="text-[12px] text-[#6B7280]">Status: <span className="font-medium text-[#111827] capitalize">{detail.company.verificationStatus}</span></p>
                </div>

                <div className="p-3.5 border border-[#E5E7EB] rounded-lg bg-white space-y-1">
                  <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-[#6B7280]">
                    <User size={13} />
                    <span>Recruiter</span>
                  </div>
                  <h4 className="text-[14px] font-semibold text-[#111827] truncate">{detail.recruiter.fullName}</h4>
                  <p className="text-[12px] text-[#6B7280] truncate" title={detail.recruiter.email}>
                    {detail.recruiter.email}
                    {detail.recruiter.emailVerified && (
                      <span className="ml-1 text-emerald-600 text-[11px] font-medium">✓ Verified</span>
                    )}
                  </p>
                </div>
              </div>

              {/* Automated Hints Checklist */}
              <div className="border border-[#E5E7EB] rounded-lg bg-white p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-2">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck size={16} className="text-indigo-600" />
                    <h4 className="text-[13px] font-semibold text-[#111827]">Automated Advisory Checks</h4>
                  </div>
                  <span className="text-[11px] text-[#6B7280]">Advisory Only</span>
                </div>

                <div className="space-y-2">
                  {detail.automatedHints.map((hint) => {
                    const statusColors = {
                      pass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                      warn: 'bg-amber-50 text-amber-700 border-amber-200',
                      fail: 'bg-rose-50 text-rose-700 border-rose-200',
                      unknown: 'bg-gray-50 text-gray-600 border-gray-200',
                    }[hint.status];

                    return (
                      <div
                        key={hint.key}
                        className="flex items-start justify-between gap-3 p-2.5 rounded border border-[#E5E7EB] bg-[#FAFAFA] text-[12px]"
                      >
                        <div className="space-y-0.5">
                          <span className="font-semibold text-[#111827]">{hint.title}</span>
                          <p className="text-[#6B7280]">{hint.message}</p>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border shrink-0 ${statusColors}`}
                        >
                          {hint.status}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <p className="text-[11px] text-[#6B7280] italic">
                  Note: Automated checks do not auto-approve verifications. Every decision requires manual verification by an administrator.
                </p>
              </div>

              {/* Earlier Submissions / Audit History */}
              {(detail.earlierSubmissions.length > 0 || detail.decisionHistory.length > 0) && (
                <div className="border border-[#E5E7EB] rounded-lg bg-white p-4 space-y-3">
                  <div className="flex items-center gap-1.5 border-b border-[#E5E7EB] pb-2 text-[13px] font-semibold text-[#111827]">
                    <History size={15} />
                    <span>Submission & Decision History</span>
                  </div>

                  {detail.decisionHistory.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">Past Decisions</span>
                      {detail.decisionHistory.map((item) => (
                        <div key={item.id} className="text-[12px] p-2 bg-[#FAFAFA] border border-[#E5E7EB] rounded">
                          <div className="flex justify-between items-center text-[#111827] font-medium">
                            <span>{item.action === 'approval.override' ? 'Decision Override' : 'Decision Submitted'} by {item.adminName}</span>
                            <span className="text-[11px] text-[#6B7280]">{new Date(item.createdAt).toLocaleDateString()}</span>
                          </div>
                          {item.reason && <p className="text-[#6B7280] mt-0.5 italic">"{item.reason}"</p>}
                        </div>
                      ))}
                    </div>
                  )}

                  {detail.earlierSubmissions.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">Previous Attachments</span>
                      <div className="divide-y divide-[#E5E7EB] border border-[#E5E7EB] rounded">
                        {detail.earlierSubmissions.map((sub) => {
                          const statusTypeMap: Record<string, StatusType> = {
                            approved: 'success',
                            rejected: 'danger',
                            needs_info: 'neutral',
                            pending: 'warning',
                          };
                          return (
                            <div key={sub.id} className="p-2 flex items-center justify-between text-[12px]">
                              <span className="font-medium text-[#111827] truncate max-w-[200px]">{sub.document_name}</span>
                              <div className="flex items-center gap-2">
                                <StatusDot
                                  status={statusTypeMap[sub.status] || 'neutral'}
                                  label={sub.status.replace('_', ' ')}
                                />
                                <span className="text-[11px] text-[#6B7280]">{new Date(sub.submitted_at).toLocaleDateString()}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Decision Submission Form */}
              <form onSubmit={handlePreSubmitCheck} className="border border-[#E5E7EB] rounded-lg bg-white p-4 space-y-4">
                <h4 className="text-[14px] font-semibold text-[#111827]">Verification Decision</h4>

                {/* Overwrite Banner if already decided */}
                {!isPending && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-[12px] space-y-2">
                    <div className="flex items-center gap-1.5 font-semibold">
                      <AlertTriangle size={15} />
                      <span>Already Decided (Currently: {detail.status})</span>
                    </div>
                    <p>To change this decision, you must acknowledge the override checkbox below.</p>
                    <label className="flex items-center gap-2 font-medium cursor-pointer text-[#111827] pt-1">
                      <input
                        type="checkbox"
                        checked={override}
                        onChange={(e) => setOverride(e.target.checked)}
                        className="rounded border-[#E5E7EB] text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>Override previous decision</span>
                    </label>
                  </div>
                )}

                {/* Decision Radio/Toggle Buttons */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setDecision('approve')}
                    className={`py-2 px-3 rounded-[6px] border text-[13px] font-medium flex items-center justify-center gap-1.5 transition-colors ${
                      decision === 'approve'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-700 ring-1 ring-emerald-500'
                        : 'border-[#E5E7EB] text-[#6B7280] hover:bg-[#F9FAFB]'
                    }`}
                  >
                    <CheckCircle size={15} />
                    <span>Approve</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDecision('needs_info')}
                    className={`py-2 px-3 rounded-[6px] border text-[13px] font-medium flex items-center justify-center gap-1.5 transition-colors ${
                      decision === 'needs_info'
                        ? 'bg-amber-50 border-amber-500 text-amber-700 ring-1 ring-amber-500'
                        : 'border-[#E5E7EB] text-[#6B7280] hover:bg-[#F9FAFB]'
                    }`}
                  >
                    <HelpCircle size={15} />
                    <span>Needs Info</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDecision('reject')}
                    className={`py-2 px-3 rounded-[6px] border text-[13px] font-medium flex items-center justify-center gap-1.5 transition-colors ${
                      decision === 'reject'
                        ? 'bg-rose-50 border-rose-500 text-rose-700 ring-1 ring-rose-500'
                        : 'border-[#E5E7EB] text-[#6B7280] hover:bg-[#F9FAFB]'
                    }`}
                  >
                    <AlertCircle size={15} />
                    <span>Reject</span>
                  </button>
                </div>

                {/* Quick Fill Reason Templates */}
                {(decision === 'reject' || decision === 'needs_info') && templates.length > 0 && (
                  <div className="space-y-1">
                    <label className="text-[12px] font-medium text-[#6B7280]">Reason Template</label>
                    <select
                      onChange={handleTemplateSelect}
                      defaultValue=""
                      className="w-full text-[13px] border border-[#E5E7EB] rounded-[6px] py-1.5 px-2.5 bg-white text-[#111827] focus:outline-hidden focus:border-indigo-600"
                    >
                      <option value="" disabled>
                        Choose a predefined reason...
                      </option>
                      {templates.map((tpl) => (
                        <option key={tpl} value={tpl}>
                          {tpl}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Reason Field */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-[12px] font-medium text-[#374151]">
                      Decision Reason {decision !== 'approve' && <span className="text-red-500">*</span>}
                    </label>
                    {decision !== 'approve' && (
                      <span className={`text-[11px] ${reason.trim().length >= 10 ? 'text-emerald-600' : 'text-[#6B7280]'}`}>
                        {reason.trim().length} / 10 min chars
                      </span>
                    )}
                  </div>
                  <textarea
                    rows={2}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder={
                      decision === 'approve'
                        ? 'Optional approval note...'
                        : 'Provide a clear explanation that will be sent to the recruiter...'
                    }
                    className="w-full text-[13px] border border-[#E5E7EB] rounded-[6px] p-2.5 bg-white text-[#111827] focus:outline-hidden focus:border-indigo-600 placeholder:text-[#9CA3AF]"
                  />
                </div>

                {/* Internal Notes Field */}
                <div className="space-y-1">
                  <label className="text-[12px] font-medium text-[#374151]">Internal Admin Notes (Optional)</label>
                  <textarea
                    rows={1}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Private notes for compliance record..."
                    className="w-full text-[13px] border border-[#E5E7EB] rounded-[6px] p-2 bg-white text-[#111827] focus:outline-hidden focus:border-indigo-600 placeholder:text-[#9CA3AF]"
                  />
                </div>

                {/* Form Error */}
                {formError && (
                  <div className="p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-700 text-[12px] flex items-center gap-1.5">
                    <AlertCircle size={14} className="shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Submit Action */}
                <button
                  type="submit"
                  disabled={submitting || (!isPending && !override)}
                  className={`w-full py-2.5 px-4 rounded-[6px] text-[13px] font-medium text-white transition-colors flex items-center justify-center gap-2 ${
                    decision === 'approve'
                      ? 'bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50'
                      : decision === 'needs_info'
                      ? 'bg-amber-600 hover:bg-amber-700 disabled:opacity-50'
                      : 'bg-rose-600 hover:bg-rose-700 disabled:opacity-50'
                  }`}
                >
                  {submitting ? 'Submitting...' : `Submit Decision (${decision.replace('_', ' ')})`}
                </button>
              </form>
            </div>
          </div>
        ) : null}
      </Drawer>

      {/* Confirmation Dialog before submitting sensitive decision */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        title={
          decision === 'approve'
            ? 'Approve Recruiter Verification?'
            : decision === 'reject'
            ? 'Reject Company Verification?'
            : 'Request Additional Information?'
        }
        message={
          decision === 'approve'
            ? `Are you sure you want to approve "${detail?.company.name}"? The company status will be set to Verified and the recruiter will receive an approval confirmation.`
            : decision === 'reject'
            ? `Are you sure you want to reject verification for "${detail?.company.name}"? The recruiter will be notified with your stated reason.`
            : `Are you sure you want to request additional documents from "${detail?.company.name}"?`
        }
        confirmLabel={`Confirm ${decision.replace('_', ' ')}`}
        isDestructive={decision === 'reject'}
        onConfirm={handleExecuteDecision}
        onClose={() => setIsConfirmOpen(false)}
      />
    </>
  );
};
