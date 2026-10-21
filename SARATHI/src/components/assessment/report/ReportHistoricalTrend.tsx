import React from 'react';
import { TrendingUp, Info } from 'lucide-react';

interface AttemptRecord {
  id?: string;
  sessionId?: string;
  overallScore?: number;
  technicalScore?: number;
  knowledgeScore?: number;
  practicalScore?: number;
  completedAt: string;
}

interface ReportHistoricalTrendProps {
  history: AttemptRecord[];
  activeSessionId?: string;
  onSelectAttempt?: (sessionId: string) => void;
}

export const ReportHistoricalTrend: React.FC<ReportHistoricalTrendProps> = ({
  history,
  activeSessionId,
  onSelectAttempt,
}) => {
  if (!history || history.length < 2) {
    return (
      <div className="pt-2 text-xs text-[#405B8B] italic flex items-center gap-1.5">
        <Info className="w-3.5 h-3.5" />
        Baseline Diagnostic Attempt Recorded: Subsequent reassessments will chart your genuine score progression
        timeline here.
      </div>
    );
  }

  return (
    <div className="pt-4 border-t border-[#E0E7F2] space-y-3">
      <h3 className="text-xs font-bold text-[#0B1B43] flex items-center gap-1.5 uppercase tracking-wider">
        <TrendingUp className="w-4 h-4 text-[#16A34A]" />
        Historical Assessment Trend ({history.length} Verified Attempts)
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {history.map((h, i) => {
          const sid = h.sessionId || h.id;
          const isSelected = sid && sid === activeSessionId;
          const score = h.overallScore ?? h.technicalScore ?? 0;
          return (
            <div
              key={sid || i}
              onClick={() => sid && onSelectAttempt?.(sid)}
              className={`p-3 rounded-xl border text-xs transition-all ${
                onSelectAttempt && sid ? 'cursor-pointer hover:border-[#4F46E5]' : ''
              } ${
                isSelected
                  ? 'bg-[#EEF2FF] border-[#4F46E5] shadow-sm'
                  : 'bg-[#F4F7FC] border-[#E0E7F2]'
              }`}
            >
              <div className="text-[10px] text-[#405B8B] mb-1 flex items-center justify-between">
                <span>Attempt #{i + 1}</span>
                <span>
                  {new Date(h.completedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
              </div>
              <div className="text-lg font-extrabold text-[#0B1B43]">
                {score}%
              </div>
              <div className="text-[10px] text-[#405B8B] mt-1 flex justify-between">
                <span>Quiz: {h.knowledgeScore ?? 0}%</span>
                <span>Lab: {h.practicalScore ?? 0}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
