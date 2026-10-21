import React from 'react';
import { ArrowRight } from 'lucide-react';
import type { AssessmentMode } from '../../../types/assessmentV2';

interface AssessmentStartFooterProps {
  selectedMode: AssessmentMode;
  onStart: () => void;
}

export const AssessmentStartFooter: React.FC<AssessmentStartFooterProps> = ({
  selectedMode,
  onStart,
}) => {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-[#E0E7F2] shadow-[var(--shadow-card)]">
      <div className="text-xs sm:text-sm text-[#405B8B] text-center sm:text-left">
        <span className="font-semibold text-[#405B8B]">Selected Track:</span>{' '}
        <strong className="text-[#0B1B43] font-extrabold text-sm sm:text-base">
          {selectedMode === 'secure' ? 'Secure Assessment' : 'Practice & Diagnostic Sandbox'}
        </strong>
      </div>
      <button
        type="button"
        onClick={onStart}
        className={`w-full sm:w-auto inline-flex items-center justify-center px-6 py-3.5 rounded-xl font-bold text-sm text-white transition-all shadow-md cursor-pointer ${
          selectedMode === 'secure'
            ? 'bg-[#4F46E5] hover:bg-[#4338CA] shadow-indigo-500/25 ring-2 ring-indigo-500/20'
            : 'bg-[#087BFA] hover:bg-[#0068DE] shadow-blue-500/25 ring-2 ring-blue-500/20'
        }`}
      >
        <span>{selectedMode === 'secure' ? 'Proceed to Verification & Start' : 'Begin Practice Assessment'}</span>
        <ArrowRight className="w-4 h-4 ml-2" />
      </button>
    </div>
  );
};
