import React from 'react';
import { Calendar, Shield, CheckCircle2 } from 'lucide-react';
import type { V2SessionResult } from '../../../types/assessmentV2';
import type { PerformanceTier } from './reportUtils';

interface ReportHeaderProps {
  result: V2SessionResult;
  tier: PerformanceTier;
  activeRoleTitle: string;
  inProgressSessionId?: string | null;
  onResumeInProgress?: () => void;
  history?: any[];
  onSelectAttempt?: (sessionId: string) => void;
}

export const ReportHeader: React.FC<ReportHeaderProps> = ({
  result,
  tier,
  activeRoleTitle,
  inProgressSessionId,
  onResumeInProgress,
  history = [],
  onSelectAttempt,
}) => {
  const isSecure = result.mode === 'secure';

  const formattedDate = result.completedAt
    ? new Date(result.completedAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Recent';

  return (
    <div className="space-y-4">
      {inProgressSessionId && onResumeInProgress && (
        <div className="flex items-center justify-between p-4 bg-amber-50 border border-amber-200 rounded-2xl shadow-[var(--shadow-card)]">
          <div className="flex items-center space-x-3">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
            <div>
              <p className="text-sm font-bold text-amber-900">Unfinished Assessment Detected</p>
              <p className="text-xs text-amber-800">You have an in-progress session. You can resume where you left off.</p>
            </div>
          </div>
          <button
            onClick={onResumeInProgress}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition cursor-pointer"
          >
            Resume Assessment
          </button>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-[#E0E7F2] rounded-2xl p-6 shadow-[var(--shadow-card)]">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#F0FDF4] text-[#16A34A] border border-emerald-200">
              <CheckCircle2 className="w-3 h-3" /> Assessment Completed
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${tier.badge}`}>
              {tier.label}
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#F4F7FC] border border-[#E0E7F2] text-[#405B8B] font-medium">
              {isSecure ? 'Diagnostic Assessment (Proctored)' : 'Practice Assessment'}
            </span>
            <span className="text-xs text-[#405B8B] flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-[#4F46E5]" />
              {formattedDate}
            </span>
            {history.length >= 2 && onSelectAttempt && (
              <div className="inline-flex items-center gap-1.5 ml-2">
                <label htmlFor="attempt-picker" className="text-[11px] font-bold text-[#405B8B]">
                  Attempt:
                </label>
                <select
                  id="attempt-picker"
                  value={result.sessionId}
                  onChange={(e) => onSelectAttempt(e.target.value)}
                  className="px-2 py-0.5 rounded-lg border border-[#E0E7F2] bg-white text-[11px] font-semibold text-[#0B1B43] cursor-pointer"
                >
                  {history.map((h: any, idx: number) => {
                    const sid = h.sessionId || h.id;
                    const score = h.overallScore ?? h.technicalScore ?? 0;
                    const date = h.completedAt ? new Date(h.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : `Attempt ${idx + 1}`;
                    return (
                      <option key={sid} value={sid}>
                        #{idx + 1}: {date} ({score}%) {h.mode === 'secure' ? '· Verified' : '· Practice'}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B1B43] tracking-tight">
            Skill Assessment Results
          </h1>
          <p className="text-xs sm:text-sm text-[#405B8B] mt-1">
            Target Career Track: <strong className="text-[#0B1B43]">{activeRoleTitle}</strong>
          </p>
        </div>

        <div className="flex flex-col sm:items-end gap-1.5">
          <div
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs font-semibold ${
              result.hasInfrastructureError
                ? 'bg-amber-50 text-amber-800 border-amber-200'
                : isSecure
                ? 'bg-[#EEF2FF] text-[#4F46E5] border-indigo-200'
                : 'bg-[#F0FDF4] text-[#16A34A] border-emerald-200'
            }`}
          >
            {result.hasInfrastructureError ? <Shield className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
            <span>
              {result.hasInfrastructureError
                ? 'Infrastructure Runtime Issue'
                : isSecure
                ? 'Diagnostic Evidence Recorded'
                : 'Practice Session Completed'}
            </span>
          </div>
          <p className="text-[11px] text-[#405B8B] text-right max-w-xs">
            {isSecure
              ? 'Recorded as baseline diagnostic evidence. Verified badge requires multi-source evidence.'
              : 'Self-practice record saved to your learning profile.'}
          </p>
        </div>
      </div>
    </div>
  );
};
