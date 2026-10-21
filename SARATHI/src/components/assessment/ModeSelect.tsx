import React from 'react';
import { ShieldCheck, BookOpen, Clock, ArrowRight, Award, Sparkles, Building2, Eye, EyeOff, Check, X } from 'lucide-react';
import type { AssessmentMode } from '../../types/assessmentV2';

interface ModeSelectProps {
  selectedMode: AssessmentMode;
  onSelectMode: (mode: AssessmentMode) => void;
  domainTitle: string;
  roleTitle: string;
  onContinue: () => void;
}

export const ModeSelect: React.FC<ModeSelectProps> = ({
  selectedMode,
  onSelectMode,
  domainTitle,
  roleTitle,
  onContinue,
}) => {
  return (
    <div className="max-w-5xl mx-auto py-6 px-4">
      {/* Header Section */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Step 1 of 3 · Choose Your Pathway</span>
        </div>
        <h1 className="text-3xl font-extrabold text-[#0B1B43] tracking-tight">
          Select Assessment Mode
        </h1>
        <p className="mt-2 text-sm text-[#405B8B]">
          Role: <strong className="text-indigo-600 font-bold">{roleTitle}</strong> · Domain: <strong className="text-slate-800">{domainTitle}</strong>
        </p>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Practice Mode Card */}
        <div
          onClick={() => onSelectMode('practice')}
          className={`cursor-pointer relative p-6 rounded-2xl border-2 transition-all flex flex-col justify-between ${
            selectedMode === 'practice'
              ? 'border-[#087BFA] bg-[#EFF6FF] shadow-md ring-2 ring-[#087BFA]/20'
              : 'border-[#E0E7F2] hover:border-[#087BFA]/50 hover:bg-blue-50/30 bg-white shadow-[var(--shadow-card)]'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-xl border transition-colors ${selectedMode === 'practice' ? 'bg-[#087BFA] text-white border-[#087BFA]' : 'bg-blue-50 text-[#087BFA] border-blue-200'}`}>
                <BookOpen className="w-6 h-6" />
              </div>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${selectedMode === 'practice' ? 'bg-blue-100 text-[#0B1B43] border-blue-200' : 'bg-[#F4F7FC] text-[#405B8B] border-[#E0E7F2]'}`}>
                Self-Paced · Zero Risk
              </span>
            </div>

            <h2 className="text-xl font-bold text-[#0B1B43] mb-1">Practice Mode</h2>
            <p className="text-xs text-[#405B8B] mb-5 leading-relaxed">
              Explore questions and diagnose readiness. Solutions revealed immediately with zero proctoring.
            </p>

            <div className="space-y-3 border-t border-slate-100 pt-4 text-xs text-slate-700">
              <div className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
                <span><strong>Instant Solutions:</strong> View detailed code & explanation after every task</span>
              </div>
              <div className="flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-[#087BFA] shrink-0 mt-0.5" />
                <span><strong>Self-Paced Sandbox:</strong> Pause timer anytime with unlimited retries</span>
              </div>
              <div className="flex items-start gap-2.5">
                <EyeOff className="w-4 h-4 text-[#087BFA] shrink-0 mt-0.5" />
                <span><strong>100% Private:</strong> Scores stay strictly confidential (hidden from recruiters)</span>
              </div>
              <div className="flex items-start gap-2.5">
                <X className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <span className="text-slate-500">No recruiter shortlisting or verified Skill Passport credential</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-[#405B8B]">Best for: Preparation &amp; diagnostic</span>
            <span className={`font-bold ${selectedMode === 'practice' ? 'text-[#087BFA]' : 'text-[#8FA1C0]'}`}>
              {selectedMode === 'practice' ? '● Selected' : '○ Click to select'}
            </span>
          </div>
        </div>

        {/* Secure Mode Card (Recruiter Endorsed) */}
        <div
          onClick={() => onSelectMode('secure')}
          className={`cursor-pointer relative p-6 rounded-2xl border-2 transition-all flex flex-col justify-between ${
            selectedMode === 'secure'
              ? 'border-[#4F46E5] bg-[#EEF2FF] shadow-md ring-2 ring-[#4F46E5]/20'
              : 'border-[#E0E7F2] hover:border-[#4F46E5]/50 hover:bg-indigo-50/30 bg-white shadow-[var(--shadow-card)]'
          }`}
        >
          {/* Top highlight badge */}
          <div className="absolute -top-3 right-6 px-3 py-0.5 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-[11px] font-bold shadow-sm flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            <span>Recommended for Hiring</span>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
                Hiring Partner Verified
              </span>
            </div>

            <h2 className="text-xl font-bold text-[#0B1B43] mb-1 flex items-center gap-2">
              <span>Secure Mode</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#4F46E5] text-white font-bold tracking-wide uppercase">Official</span>
            </h2>
            <p className="text-xs text-[#405B8B] mb-5 leading-relaxed">
              Standardized evaluation with focus monitoring. Verified credentials unlock direct recruiter pipelines.
            </p>

            <div className="space-y-3 border-t border-indigo-100/60 pt-4 text-xs text-slate-700">
              <div className="flex items-start gap-2.5">
                <Building2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <span><strong>Direct Recruiter Talent Pool:</strong> Profiles are shared with 120+ active hiring partners</span>
              </div>
              <div className="flex items-start gap-2.5">
                <Award className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <span><strong>Verified Skill Passport:</strong> Earn official Level 3–5 badges recognized by employers</span>
              </div>
              <div className="flex items-start gap-2.5">
                <Eye className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <span><strong>Interview Shortlist Priority:</strong> Scores $\ge 75\%$ fast-track to technical interview rounds</span>
              </div>
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <span><strong>Anti-Cheating Assurance:</strong> Standardized sandbox & focus log gives recruiters full trust</span>
              </div>
            </div>

            {/* Recruiter Trust Strip */}
            <div className="mt-4 p-2.5 rounded-xl bg-indigo-100/60 border border-indigo-200/80 flex items-center justify-between text-[11px] text-indigo-900 font-medium">
              <span>Trusted by: NexTech · FinCorp · CloudScale</span>
              <span className="font-bold text-indigo-600">Fast-Track Active</span>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-[#4F46E5] font-semibold">Best for: Getting shortlisted for jobs</span>
            <span className={`font-bold ${selectedMode === 'secure' ? 'text-[#4F46E5]' : 'text-[#8FA1C0]'}`}>
              {selectedMode === 'secure' ? '● Selected' : '○ Click to select'}
            </span>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
        <div className="text-xs text-slate-600">
          Selected: <strong className="text-[#0B1B43]">{selectedMode === 'secure' ? 'Secure Mode (Recruiter Verified)' : 'Practice Mode (Self-Paced)'}</strong>
          <span className="text-slate-400"> — {selectedMode === 'secure' ? 'Includes proctor rules & recruiter submission' : 'Immediate solution review with zero risk'}</span>
        </div>
        <button
          onClick={onContinue}
          className={`inline-flex items-center px-6 py-3 rounded-xl font-bold text-sm text-white transition-all shadow-md cursor-pointer ${
            selectedMode === 'secure'
              ? 'bg-[#4F46E5] hover:bg-[#4338CA] shadow-indigo-500/25'
              : 'bg-[#087BFA] hover:bg-[#0068DE] shadow-blue-500/25'
          }`}
        >
          <span>{selectedMode === 'secure' ? 'Continue to Session Rules & Consent' : 'Begin Practice Assessment'}</span>
          <ArrowRight className="w-4 h-4 ml-2" />
        </button>
      </div>
    </div>
  );
};
