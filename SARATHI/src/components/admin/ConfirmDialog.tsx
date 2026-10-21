import React, { useState, useEffect } from 'react';

// Modal confirmation dialog for sensitive actions with optional required reason textarea input.
export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason?: string) => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  reasonRequired?: boolean;
  reasonPlaceholder?: string;
  isLoading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDestructive = false,
  reasonRequired = false,
  reasonPlaceholder = 'Please enter a mandatory reason...',
  isLoading = false,
}) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setReason('');
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (reasonRequired && !reason.trim()) {
      setError('A reason is required to proceed with this action.');
      return;
    }
    setError('');
    onConfirm(reason.trim());
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 transition-opacity" onClick={onClose} aria-hidden="true" />

      {/* Modal Dialog */}
      <div className="min-h-full flex items-center justify-center p-4">
        <div className="relative bg-white rounded-[8px] border border-[#E5E7EB] shadow-xl max-w-md w-full p-6 text-left">
          <h3 className="text-[17px] font-semibold text-[#111827]">{title}</h3>
          <p className="text-[14px] text-[#6B7280] mt-2 leading-relaxed">{message}</p>

          {reasonRequired && (
            <div className="mt-4">
              <label htmlFor="confirm-reason" className="block text-[13px] font-medium text-[#111827] mb-1">
                Reason <span className="text-[#DC2626]">*</span>
              </label>
              <textarea
                id="confirm-reason"
                rows={3}
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  if (error) setError('');
                }}
                placeholder={reasonPlaceholder}
                className="w-full text-[13px] p-2.5 border border-[#E5E7EB] rounded-[6px] focus:outline-hidden focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] resize-none"
              />
              {error && <p className="text-[12px] text-[#DC2626] mt-1">{error}</p>}
            </div>
          )}

          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              disabled={isLoading}
              onClick={onClose}
              className="px-3.5 py-1.5 text-[13px] font-medium text-[#111827] bg-white border border-[#E5E7EB] hover:bg-[#F9FAFB] rounded-[6px] transition-colors"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              disabled={isLoading}
              onClick={handleConfirm}
              className={`px-3.5 py-1.5 text-[13px] font-medium text-white rounded-[6px] transition-colors ${
                isDestructive
                  ? 'bg-[#DC2626] hover:bg-[#B91C1C]'
                  : 'bg-[#4F46E5] hover:bg-[#4338CA]'
              } ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {isLoading ? 'Processing...' : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
