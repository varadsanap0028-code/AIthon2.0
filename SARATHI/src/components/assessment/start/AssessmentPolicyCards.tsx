import React from 'react';
import { BookOpen, Check, CheckCircle2, Info, Lock, ShieldCheck } from 'lucide-react';
import type { AssessmentMode } from '../../../types/assessmentV2';

interface AssessmentPolicyCardsProps {
  selectedMode: AssessmentMode;
  onSelectMode: (mode: AssessmentMode) => void;
}

export const AssessmentPolicyCards: React.FC<AssessmentPolicyCardsProps> = ({
  selectedMode,
  onSelectMode,
}) => {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[#405B8B]">
          Select Assessment Operating Policy
        </h2>
        <span className="text-xs text-[#405B8B] font-medium">Click a card to choose</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5" role="radiogroup" aria-label="Assessment Operating Policy">
        {/* Practice & Diagnostic Sandbox Card */}
        <div
          role="radio"
          aria-checked={selectedMode === 'practice'}
          tabIndex={0}
          onClick={() => onSelectMode('practice')}
          onKeyDown={(e) => {
            if (e.key === ' ' || e.key === 'Enter') {
              e.preventDefault();
              onSelectMode('practice');
            }
          }}
          className={`cursor-pointer relative p-6 rounded-2xl border-2 transition-all duration-200 flex flex-col justify-between focus:outline-none focus-visible:ring-2 focus-visible:ring-[#087BFA] focus-visible:ring-offset-2 ${
            selectedMode === 'practice'
              ? 'border-[#087BFA] bg-[#EFF6FF] shadow-md ring-2 ring-[#087BFA]/20'
              : 'border-[#E0E7F2] bg-white hover:border-[#087BFA]/50 hover:bg-blue-50/30 shadow-[var(--shadow-card)]'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2.5 rounded-xl border transition-colors ${
                    selectedMode === 'practice'
                      ? 'bg-[#087BFA] text-white border-[#087BFA] shadow-sm'
                      : 'bg-blue-50 text-[#087BFA] border-blue-200'
                  }`}
                >
                  <BookOpen className="w-5 h-5" />
                </div>
                <span
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-full border inline-block ${
                    selectedMode === 'practice'
                      ? 'bg-blue-100 text-[#0B1B43] border-blue-200'
                      : 'bg-[#F4F7FC] text-[#405B8B] border-[#E0E7F2]'
                  }`}
                >
                  Diagnostic &amp; Low-Stakes
                </span>
              </div>

              {/* Radio Selection Indicator */}
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                  selectedMode === 'practice'
                    ? 'bg-[#087BFA] text-white ring-2 ring-[#087BFA] ring-offset-2 shadow-sm'
                    : 'border-2 border-[#E0E7F2] bg-white'
                }`}
                aria-hidden="true"
              >
                {selectedMode === 'practice' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </div>
            </div>

            <h3 className="text-lg font-bold text-[#0B1B43] mb-0.5">
              Practice &amp; Diagnostic Sandbox
            </h3>
            <div className="text-xs font-semibold text-[#087BFA] mb-2">
              Practice Policy
            </div>
            <p className="text-xs text-[#405B8B] mb-4 leading-relaxed">
              Ideal for preparation, diagnosing skill gaps, and familiarizing yourself with the workbench.
            </p>

            <div className="space-y-2.5 border-t border-[#E0E7F2] pt-3 text-xs text-[#0B1B43]">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
                <span>
                  <strong className="text-[#0B1B43]">Open Sandbox:</strong> Copy, paste, and run code freely inside the editor
                </span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
                <span>
                  <strong className="text-[#0B1B43]">Zero Camera Requirement:</strong> No webcam hardware check or permissions needed
                </span>
              </div>
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-[#405B8B] shrink-0 mt-0.5" />
                <span>
                  Result labeled as <strong className="text-[#0B1B43]">Practice Result</strong> (provisional baseline)
                </span>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-[#E0E7F2] flex items-center justify-between text-xs">
            <span className="text-[#405B8B] font-medium">Best for: Diagnostic benchmarks</span>
            <span
              className={`font-bold flex items-center gap-1 ${
                selectedMode === 'practice' ? 'text-[#087BFA]' : 'text-[#8FA1C0]'
              }`}
            >
              {selectedMode === 'practice' ? '● Selected' : '○ Select Practice'}
            </span>
          </div>
        </div>

        {/* Secure Assessment Card */}
        <div
          role="radio"
          aria-checked={selectedMode === 'secure'}
          tabIndex={0}
          onClick={() => onSelectMode('secure')}
          onKeyDown={(e) => {
            if (e.key === ' ' || e.key === 'Enter') {
              e.preventDefault();
              onSelectMode('secure');
            }
          }}
          className={`cursor-pointer relative p-6 rounded-2xl border-2 transition-all duration-200 flex flex-col justify-between focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5] focus-visible:ring-offset-2 ${
            selectedMode === 'secure'
              ? 'border-[#4F46E5] bg-[#EEF2FF] shadow-md ring-2 ring-[#4F46E5]/20'
              : 'border-[#E0E7F2] bg-white hover:border-[#4F46E5]/50 hover:bg-indigo-50/30 shadow-[var(--shadow-card)]'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2.5 rounded-xl border transition-colors ${
                    selectedMode === 'secure'
                      ? 'bg-[#4F46E5] text-white border-[#4F46E5] shadow-sm'
                      : 'bg-indigo-50 text-[#4F46E5] border-indigo-200'
                  }`}
                >
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <span
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-full border inline-block ${
                    selectedMode === 'secure'
                      ? 'bg-indigo-100 text-[#0B1B43] border-indigo-200'
                      : 'bg-[#F4F7FC] text-[#405B8B] border-[#E0E7F2]'
                  }`}
                >
                  Verified Skill Passport
                </span>
              </div>

              {/* Radio Selection Indicator */}
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                  selectedMode === 'secure'
                    ? 'bg-[#4F46E5] text-white ring-2 ring-[#4F46E5] ring-offset-2 shadow-sm'
                    : 'border-2 border-[#E0E7F2] bg-white'
                }`}
                aria-hidden="true"
              >
                {selectedMode === 'secure' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </div>
            </div>

            <h3 className="text-lg font-bold text-[#0B1B43] mb-0.5 flex items-center gap-2">
              <span>Secure Assessment</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#4F46E5] text-white font-bold tracking-wide uppercase">
                Official
              </span>
            </h3>
            <div className="text-xs font-semibold text-[#4F46E5] mb-2">
              Secure Policy · Official Verification
            </div>
            <p className="text-xs text-[#405B8B] mb-4 leading-relaxed">
              Standardized verification suitable for job applications and recruiter talent pool matching.
            </p>

            <div className="space-y-2.5 border-t border-[#E0E7F2] pt-3 text-xs text-[#0B1B43]">
              <div className="flex items-start gap-2">
                <Lock className="w-4 h-4 text-[#4F46E5] shrink-0 mt-0.5" />
                <span>
                  <strong className="text-[#0B1B43]">Scoped Clipboard Lock:</strong> Copy/paste blocked inside answer fields only
                </span>
              </div>
              <div className="flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-[#4F46E5] shrink-0 mt-0.5" />
                <span>
                  <strong className="text-[#0B1B43]">Camera Readiness Preview:</strong> Verifies webcam device readiness locally before start
                </span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#4F46E5] shrink-0 mt-0.5" />
                <span>
                  <strong className="text-[#0B1B43]">Verified Badges:</strong> Scores qualify for official Level 3–4 Skill Passport badges
                </span>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-[#E0E7F2] flex items-center justify-between text-xs">
            <span className="text-[#4F46E5] font-semibold">Best for: Job readiness &amp; recruiters</span>
            <span
              className={`font-bold flex items-center gap-1 ${
                selectedMode === 'secure' ? 'text-[#4F46E5]' : 'text-[#8FA1C0]'
              }`}
            >
              {selectedMode === 'secure' ? '● Selected' : '○ Select Secure'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
