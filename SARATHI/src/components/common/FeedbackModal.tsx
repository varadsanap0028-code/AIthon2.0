import React, { useState } from 'react';
import { X, MessageSquarePlus, CheckCircle2, AlertCircle, Send } from 'lucide-react';
import { Button } from './Button';
import { apiClient } from '../../services/apiClient';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose }) => {
  const [category, setCategory] = useState<
    'bug' | 'feature_request' | 'ux_improvement' | 'content' | 'other'
  >('feature_request');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (message.trim().length < 5) {
      setErrorMessage('Please provide at least 5 characters in your feedback message.');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.post('/api/feedback', {
        category,
        message: message.trim(),
      });

      setSuccess(true);
      setMessage('');
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 2500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-[#E0E7F2] p-6 z-10 space-y-5 animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-[#E0E7F2] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-[#603DF5] flex items-center justify-center">
              <MessageSquarePlus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-extrabold text-[#0B1B43] text-base">Share Feedback</h2>
              <p className="text-xs text-[#405B8B]">Help us improve your Sarathi learning experience</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#405B8B] hover:text-[#0B1B43] hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {success ? (
          <div className="py-8 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-[#16A34A] mx-auto animate-in zoom-in-75" />
            <h3 className="font-bold text-base text-[#0B1B43]">Thank You for Your Feedback!</h3>
            <p className="text-xs text-[#405B8B] max-w-sm mx-auto">
              Your thoughts and suggestions directly shape future releases and features in Sarathi.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-50 text-rose-600 text-xs font-bold border border-rose-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-[#0B1B43] mb-1.5 uppercase tracking-wide">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full p-2.5 rounded-xl border border-[#E0E7F2] text-sm text-[#0B1B43] font-semibold bg-[#F4F7FC] focus:border-[#087BFA] outline-none cursor-pointer"
              >
                <option value="feature_request">💡 Feature Request</option>
                <option value="bug">🐛 Bug Report</option>
                <option value="ux_improvement">✨ UI / UX Improvement</option>
                <option value="content">📚 Learning / Assessment Content</option>
                <option value="other">💬 Other Feedback</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#0B1B43] mb-1.5 uppercase tracking-wide">
                Your Feedback
              </label>
              <textarea
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tell us what's working well, what can be improved, or what features you'd like to see next..."
                className="w-full p-3 rounded-xl border border-[#E0E7F2] text-sm text-[#0B1B43] focus:border-[#087BFA] focus:ring-1 focus:ring-[#087BFA] outline-none"
                required
              />
              <span className="text-[11px] text-[#405B8B] block mt-1">Minimum 5 characters</span>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={isSubmitting || message.trim().length < 5}
                leftIcon={<Send className="w-4 h-4" />}
              >
                {isSubmitting ? 'Submitting...' : 'Send Feedback'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
