import React from 'react';
import { Accessibility, ShieldCheck } from 'lucide-react';

interface AssessmentAccommodationsProps {
  extendedTime: boolean;
  setExtendedTime: React.Dispatch<React.SetStateAction<boolean>>;
  screenReaderMode: boolean;
  setScreenReaderMode: React.Dispatch<React.SetStateAction<boolean>>;
  showAccommodations: boolean;
  setShowAccommodations: React.Dispatch<React.SetStateAction<boolean>>;
}

export const AssessmentAccommodations: React.FC<AssessmentAccommodationsProps> = ({
  extendedTime,
  setExtendedTime,
  screenReaderMode,
  setScreenReaderMode,
  showAccommodations,
  setShowAccommodations,
}) => {
  return (
    <>
      {/* Accessibility & Accommodations Collapsible */}
      <div className="bg-white rounded-2xl border border-[#E0E7F2] p-4 mb-6 shadow-[var(--shadow-card)]">
        <button
          type="button"
          onClick={() => setShowAccommodations((prev) => !prev)}
          className="w-full flex items-center justify-between text-left text-xs sm:text-sm font-bold text-[#0B1B43] cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Accessibility className="w-4 h-4 text-[#4F46E5]" />
            <span>Accessibility Accommodations</span>
            {(extendedTime || screenReaderMode) && (
              <span className="px-2 py-0.5 rounded-full bg-[#EEF2FF] text-[#4F46E5] text-[10px] font-bold">
                Active
              </span>
            )}
          </div>
          <span className="text-xs text-[#405B8B] hover:text-[#0B1B43]">
            {showAccommodations ? 'Hide' : 'Configure'}
          </span>
        </button>

        {showAccommodations && (
          <div className="mt-4 pt-3 border-t border-[#E0E7F2] space-y-3 text-xs">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={extendedTime}
                onChange={(e) => setExtendedTime(e.target.checked)}
                className="mt-0.5 rounded border-[#E0E7F2] text-[#4F46E5] focus:ring-[#4F46E5]"
              />
              <div>
                <span className="font-semibold text-[#0B1B43]">Extended Time (1.5x Multiplier)</span>
                <p className="text-[#405B8B] mt-0.5">Extends total assessment countdown from 45 minutes to 68 minutes.</p>
              </div>
            </label>

            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={screenReaderMode}
                onChange={(e) => setScreenReaderMode(e.target.checked)}
                className="mt-0.5 rounded border-[#E0E7F2] text-[#4F46E5] focus:ring-[#4F46E5]"
              />
              <div>
                <span className="font-semibold text-[#0B1B43]">Screen Reader &amp; Keyboard Navigation Mode</span>
                <p className="text-[#405B8B] mt-0.5">Optimizes text areas and adapts strict focus restraints for assistive tools.</p>
              </div>
            </label>
          </div>
        )}
      </div>

      {/* Privacy & Integrity Commitment */}
      <div className="flex items-start gap-3 p-4 rounded-2xl bg-[#EFF6FF] border border-blue-200 text-xs sm:text-sm text-[#0B1B43] mb-6 shadow-[var(--shadow-card)]">
        <ShieldCheck className="w-5 h-5 text-[#087BFA] shrink-0 mt-0.5" />
        <div className="leading-relaxed text-[#405B8B]">
          <strong className="text-[#0B1B43] font-bold">Privacy Commitment:</strong>{' '}
          No video or audio is ever recorded, transmitted, or stored on remote servers. For secure assessments, camera readiness is verified locally on your device to confirm workstation setup.
        </div>
      </div>
    </>
  );
};
