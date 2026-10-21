import React, { useState } from 'react';
import { Shield, Lock, EyeOff, Clock, ArrowLeft, Play, Accessibility, Building2 } from 'lucide-react';
import { CameraCheck } from './CameraCheck';

interface RulesConsentProps {
  domainTitle: string;
  roleTitle: string;
  initialAccommodations?: {
    extendedTimeMultiplier?: number;
    disabledRestrictions?: boolean;
    screenReaderMode?: boolean;
  };
  onConsentAndStart: (consentData: {
    agreed: boolean;
    accommodations: {
      extendedTimeMultiplier: number;
      disabledRestrictions: boolean;
      screenReaderMode: boolean;
    };
  }) => void;
  onBack: () => void;
  isStarting?: boolean;
}

export const RulesConsent: React.FC<RulesConsentProps> = ({
  domainTitle,
  roleTitle,
  initialAccommodations,
  onConsentAndStart,
  onBack,
  isStarting = false,
}) => {
  const [agreed, setAgreed] = useState(false);
  const [timeMultiplier, setTimeMultiplier] = useState<number>(initialAccommodations?.extendedTimeMultiplier || 1.0);
  const [screenReaderMode, setScreenReaderMode] = useState<boolean>(Boolean(initialAccommodations?.screenReaderMode));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed || isStarting) return;
    onConsentAndStart({
      agreed: true,
      accommodations: {
        extendedTimeMultiplier: timeMultiplier,
        disabledRestrictions: screenReaderMode || timeMultiplier > 1.0,
        screenReaderMode,
      },
    });
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="bg-white rounded-2xl border border-[#E0E7F2] p-6 sm:p-8 shadow-[var(--shadow-card)]">
        {/* Step Header */}
        <div className="flex items-center justify-between pb-5 border-b border-[#E0E7F2] mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-[#EEF2FF] border border-indigo-100 text-[#4F46E5]">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#4F46E5]">
                Step 2 of 2 · Verified Candidate Protocol
              </span>
              <h1 className="text-xl font-bold text-[#0B1B43]">Secure Assessment Rules &amp; Verification</h1>
              <p className="text-xs text-[#405B8B] font-medium">{roleTitle} · {domainTitle}</p>
            </div>
          </div>
          <span className="hidden sm:inline-flex px-3 py-1 rounded-full bg-[#F0FDF4] border border-emerald-200 text-[#16A34A] text-xs font-bold">
            Recruiter Verified Session
          </span>
        </div>

        {/* Recruiter Guarantee Callout */}
        <div className="mb-6 p-4 rounded-xl bg-[#EEF2FF] border border-indigo-200 flex items-start gap-3">
          <Building2 className="w-5 h-5 text-[#4F46E5] shrink-0 mt-0.5" />
          <div className="text-xs text-[#405B8B] leading-relaxed">
            <strong className="text-[#0B1B43] block mb-0.5">Direct Employer Talent Pipeline Active</strong>
            Completing this secure assessment generates a tamper-proof verification report. Candidates scoring <span className="font-semibold text-[#4F46E5]">75%+</span> earn official Skill Passport credentials and priority review for interview shortlists.
          </div>
        </div>

        {/* Camera Readiness Check */}
        <div className="mb-6"><CameraCheck variant="readiness" /></div>

        {/* Verification Rules */}
        <div className="space-y-3 mb-6">
          <div className="flex items-start space-x-3 p-3.5 rounded-xl bg-[#F4F7FC] border border-[#E0E7F2]">
            <Lock className="w-5 h-5 text-[#4F46E5] shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="font-bold text-[#0B1B43]">Focus Monitoring &amp; Environment Integrity</span>
              <p className="text-[#405B8B] mt-0.5">Tab switches, window unfocus events, and clipboard activity are logged to provide advisory verification signals.</p>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-3.5 rounded-xl bg-[#F4F7FC] border border-[#E0E7F2]">
            <EyeOff className="w-5 h-5 text-[#16A34A] shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="font-bold text-[#0B1B43]">Strict Privacy &amp; Zero Video Uploading</span>
              <p className="text-[#405B8B] mt-0.5">No video feeds or biometric recordings are ever sent or stored on remote servers. Full candidate privacy is guaranteed.</p>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-3.5 rounded-xl bg-[#F4F7FC] border border-[#E0E7F2]">
            <Clock className="w-5 h-5 text-[#D97706] shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="font-bold text-[#0B1B43]">Server-Side Countdown &amp; Persistent Cloud Autosave</span>
              <p className="text-[#405B8B] mt-0.5">Answers autosave continuously. If you accidentally reload or close the tab, your session state is immediately restored.</p>
            </div>
          </div>
        </div>

        {/* Accommodations */}
        <div className="mb-6 p-4 rounded-xl border border-[#E0E7F2] bg-[#F4F7FC] space-y-3">
          <div className="flex items-center space-x-2 text-xs font-bold text-[#0B1B43]">
            <Accessibility className="w-4 h-4 text-[#4F46E5]" />
            <span>Accessibility &amp; Fair Testing Accommodations</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-[#405B8B] mb-1 font-medium">Timer Multiplier</label>
              <select
                value={timeMultiplier}
                onChange={(e) => setTimeMultiplier(parseFloat(e.target.value))}
                className="w-full px-3 py-1.5 rounded-lg border border-[#E0E7F2] bg-white text-[#0B1B43] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
              >
                <option value={1.0}>1.0× Standard Duration (45 mins)</option>
                <option value={1.5}>1.5× Extended Time (68 mins)</option>
                <option value={2.0}>2.0× Double Duration (90 mins)</option>
              </select>
            </div>

            <div className="flex items-center justify-between sm:pt-4">
              <span className="text-[#405B8B] font-medium">Screen Reader Friendly Mode</span>
              <input
                type="checkbox"
                checked={screenReaderMode}
                onChange={(e) => setScreenReaderMode(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
              />
            </div>
          </div>
          <p className="text-[11px] text-[#405B8B]">Accommodations ensure fair access and never penalize your score.</p>
        </div>

        {/* Consent Checkbox */}
        <div className="mb-6 p-3.5 rounded-xl border border-indigo-200 bg-[#EEF2FF]">
          <label className="flex items-start space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 mt-0.5 cursor-pointer"
            />
            <span className="text-xs text-[#405B8B] leading-relaxed">
              I agree to solve all questions independently without unauthorized AI assistants or human proxies. I understand this session will be validated and shared with partner recruiters.
            </span>
          </label>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-[#E0E7F2]">
          <button
            type="button"
            onClick={onBack}
            disabled={isStarting}
            className="inline-flex items-center px-4 py-2 text-xs font-semibold text-[#405B8B] hover:text-[#0B1B43] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Back
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!agreed || isStarting}
            className={`inline-flex items-center px-6 py-2.5 rounded-xl font-bold text-xs text-white transition-all shadow-md ${
              agreed && !isStarting
                ? 'bg-[#4F46E5] hover:bg-[#4338CA] shadow-indigo-500/25 cursor-pointer'
                : 'bg-[#E0E7F2] cursor-not-allowed opacity-60'
            }`}
          >
            {isStarting ? (
              <span>Initializing Session...</span>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 mr-1.5 fill-current" />
                <span>Begin Verified Assessment</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
