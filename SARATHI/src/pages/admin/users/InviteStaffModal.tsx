import React, { useState } from 'react';
import { X, Copy, Check, UserPlus } from 'lucide-react';
import { adminApi } from '../../../services/adminApi';

export interface InviteStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const InviteStaffModal: React.FC<InviteStaffModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'reviewer' | 'platform_admin'>('reviewer');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [setupLink, setSetupLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setError('Please provide a valid email address.');
      return;
    }
    if (!name.trim()) {
      setError('Please enter the full name.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await adminApi.inviteStaff({ email: email.trim(), name: name.trim(), role });
      setSetupLink(res.setupLink);
      onSuccess();
    } catch (err: any) {
      setError(err?.message || 'Failed to send staff invitation.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (setupLink) {
      const fullUrl = `${window.location.origin}${setupLink}`;
      navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleResetAndClose = () => {
    setEmail('');
    setName('');
    setRole('reviewer');
    setError(null);
    setSetupLink(null);
    setCopied(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 transition-opacity"
        onClick={handleResetAndClose}
        aria-hidden="true"
      />

      <div className="min-h-full flex items-center justify-center p-4">
        <div className="relative bg-white rounded-[8px] border border-[#E5E7EB] shadow-xl max-w-md w-full p-6 text-left">
          <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
            <div className="flex items-center gap-2">
              <UserPlus size={18} className="text-[#4F46E5]" />
              <h3 className="text-[17px] font-semibold text-[#111827]">Invite Staff Member</h3>
            </div>
            <button
              type="button"
              onClick={handleResetAndClose}
              className="text-[#9CA3AF] hover:text-[#111827] p-1 rounded-[6px] transition-colors focus:outline-hidden"
            >
              <X size={18} />
            </button>
          </div>

          {setupLink ? (
            <div className="mt-4 space-y-4">
              <div className="p-3 bg-[#ECFDF5] border border-[#A7F3D0] rounded-[6px]">
                <p className="text-[13px] font-medium text-[#065F46]">
                  Staff member invited successfully! The one-time setup link is valid for 48 hours.
                </p>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[#4B5563] mb-1">
                  One-time Setup Link
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`${window.location.origin}${setupLink}`}
                    className="w-full px-3 py-1.5 text-[12px] bg-[#F9FAFB] border border-[#E5E7EB] rounded-[6px] text-[#374151] font-mono select-all focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-white bg-[#4F46E5] hover:bg-[#4338CA] rounded-[6px] transition-colors shrink-0"
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-[#E5E7EB] flex justify-end">
                <button
                  type="button"
                  onClick={handleResetAndClose}
                  className="px-4 py-1.5 text-[13px] font-medium text-[#374151] bg-white border border-[#E5E7EB] hover:bg-[#F9FAFB] rounded-[6px] transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              {error && (
                <div className="p-2.5 bg-[#FEF2F2] border border-[#FEE2E2] rounded-[6px] text-[12px] text-[#991B1B]">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-[13px] font-medium text-[#374151] mb-1">
                  Full Name <span className="text-[#DC2626]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Jane Doe"
                  className="w-full px-3 py-1.5 text-[13px] border border-[#E5E7EB] rounded-[6px] focus:outline-hidden focus:border-[#4F46E5]"
                />
              </div>

              <div>
                <label className="block text-[13px] font-medium text-[#374151] mb-1">
                  Email Address <span className="text-[#DC2626]">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jane.doe@sarathi.dev"
                  className="w-full px-3 py-1.5 text-[13px] border border-[#E5E7EB] rounded-[6px] focus:outline-hidden focus:border-[#4F46E5]"
                />
              </div>

              <div>
                <label className="block text-[13px] font-medium text-[#374151] mb-1">
                  Staff Role <span className="text-[#DC2626]">*</span>
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as 'reviewer' | 'platform_admin')}
                  className="w-full px-3 py-1.5 text-[13px] border border-[#E5E7EB] rounded-[6px] bg-white focus:outline-hidden focus:border-[#4F46E5]"
                >
                  <option value="reviewer">Technical Reviewer (Code & Verification Review)</option>
                  <option value="platform_admin">Platform Administrator (Full Access)</option>
                </select>
              </div>

              <div className="pt-3 border-t border-[#E5E7EB] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleResetAndClose}
                  className="px-3.5 py-1.5 text-[13px] font-medium text-[#374151] bg-white border border-[#E5E7EB] hover:bg-[#F9FAFB] rounded-[6px] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-1.5 text-[13px] font-medium text-white bg-[#4F46E5] hover:bg-[#4338CA] rounded-[6px] transition-colors disabled:opacity-50"
                >
                  {loading ? 'Sending...' : 'Create & Generate Link'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default InviteStaffModal;
