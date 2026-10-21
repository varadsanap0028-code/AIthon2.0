import React, { useState } from 'react';
import { Award, CheckCircle2 } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import type { LearningResource } from './types';

interface PassportModalProps {
  isOpen: boolean;
  onClose: () => void;
  resource: LearningResource | null;
  onConfirmAdd: (resourceId: string) => Promise<string>;
}

export const PassportModal: React.FC<PassportModalProps> = ({
  isOpen,
  onClose,
  resource,
  onConfirmAdd,
}) => {
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen || !resource) return null;

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      const msg = await onConfirmAdd(resource.id);
      setSuccessMessage(msg);
      setTimeout(() => {
        setSuccessMessage(null);
        onClose();
      }, 1600);
    } catch {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Learning Evidence to Skill Passport"
      subtitle={`Connect "${resource.title}" to your verified credential profile`}
      maxWidth="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="purple"
            size="sm"
            onClick={handleConfirm}
            disabled={isSubmitting || Boolean(successMessage)}
            leftIcon={<Award className="w-4 h-4" />}
          >
            {isSubmitting ? 'Recording Evidence...' : 'Confirm & Add Evidence'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4 text-xs text-[#405B8B]">
        {successMessage ? (
          <div className="p-4 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-2.5 font-medium">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        ) : (
          <>
            <p className="text-[#405B8B] leading-relaxed">
              Completing this curriculum demonstrates practical learning and adds verifiable evidence to the following competencies in your Sarathi Skill Passport:
            </p>

            <div className="p-3.5 rounded-xl bg-[#F4F7FC] border border-[#E0E7F2] space-y-2">
              <span className="font-bold text-[#0B1B43] block">Skills to record:</span>
              <div className="flex flex-wrap gap-1.5">
                {resource.skillTags.map((tag) => (
                  <span
                    key={tag}
                    className="bg-purple-50 border border-purple-200 text-[#603DF5] px-2.5 py-1 rounded-lg text-xs font-semibold shadow-2xs"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="text-[11px] text-[#405B8B] bg-amber-50/80 p-3 rounded-xl border border-amber-200/70 leading-relaxed">
              <span className="font-bold text-amber-900 block mb-0.5">Verification Note:</span>
              Completed self-study and YouTube courses are recorded as self-guided learning evidence. Take a domain assessment to elevate them to verified benchmark level.
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};
