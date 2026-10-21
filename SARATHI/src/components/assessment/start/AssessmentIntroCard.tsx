import React from 'react';
import { Sparkles, Clock, BookOpen, Code2, Database, FileCode, CheckCircle2 } from 'lucide-react';

interface AssessmentIntroCardProps {
  domainTitle: string;
  roleTitle: string;
  durationMinutes: number;
}

export const AssessmentIntroCard: React.FC<AssessmentIntroCardProps> = ({
  domainTitle,
  roleTitle,
  durationMinutes,
}) => {
  return (
    <div className="bg-white rounded-2xl border border-[#E0E7F2] shadow-[var(--shadow-card)] p-6 sm:p-8 mb-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#EEF2FF] border border-indigo-200 text-[#4F46E5] text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Authoritative Skill Assessment</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-[#405B8B] font-medium">
          <Clock className="w-4 h-4 text-[#4F46E5]" />
          <span>Time Allowed: <strong className="text-[#0B1B43]">{durationMinutes} Minutes</strong></span>
        </div>
      </div>

      <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B1B43] tracking-tight mb-2">
        {domainTitle} Assessment
      </h1>
      <p className="text-sm text-[#405B8B] leading-relaxed mb-6">
        Calibrated evaluation designed for <strong className="text-[#4F46E5] font-bold">{roleTitle}</strong> candidates.
        Complete technical tasks across core principles, real-time code execution, database queries, and architectural reasoning.
      </p>

      {/* Structure Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-[#E0E7F2]">
        <div className="p-3 rounded-xl bg-[#F4F7FC] border border-[#E0E7F2]">
          <div className="flex items-center gap-2 text-[#4F46E5] mb-1">
            <BookOpen className="w-4 h-4" />
            <span className="text-xs font-bold">Knowledge</span>
          </div>
          <p className="text-lg font-extrabold text-[#0B1B43]">8 MCQs</p>
          <p className="text-[11px] text-[#405B8B]">Core concepts &amp; theory</p>
        </div>

        <div className="p-3 rounded-xl bg-[#F4F7FC] border border-[#E0E7F2]">
          <div className="flex items-center gap-2 text-[#4F46E5] mb-1">
            <Code2 className="w-4 h-4" />
            <span className="text-xs font-bold">Workbench</span>
          </div>
          <p className="text-lg font-extrabold text-[#0B1B43]">2 Tasks</p>
          <p className="text-[11px] text-[#405B8B]">Interactive live code</p>
        </div>

        <div className="p-3 rounded-xl bg-[#F4F7FC] border border-[#E0E7F2]">
          <div className="flex items-center gap-2 text-[#4F46E5] mb-1">
            <Database className="w-4 h-4" />
            <span className="text-xs font-bold">Database</span>
          </div>
          <p className="text-lg font-extrabold text-[#0B1B43]">1 Query</p>
          <p className="text-[11px] text-[#405B8B]">SQL query validation</p>
        </div>

        <div className="p-3 rounded-xl bg-[#F4F7FC] border border-[#E0E7F2]">
          <div className="flex items-center gap-2 text-[#4F46E5] mb-1">
            <FileCode className="w-4 h-4" />
            <span className="text-xs font-bold">Project</span>
          </div>
          <p className="text-lg font-extrabold text-[#0B1B43]">1 Scenario</p>
          <p className="text-[11px] text-[#405B8B]">Architecture &amp; trade-offs</p>
        </div>
      </div>

      {/* Persistence & Save Guarantee Strip */}
      <div className="mt-5 p-3 rounded-xl bg-[#F0FDF4] border border-emerald-200 flex items-start gap-2.5 text-xs text-emerald-900">
        <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
        <span>
          <strong>Authoritative Persistence:</strong> Answers are automatically synchronized and committed to the database. If you reload the page or navigate away, your attempt and submitted results remain safely preserved.
        </span>
      </div>
    </div>
  );
};
