import React from 'react';
import type { V2QuestionClient } from '../../types/assessmentV2';

interface QuestionPaletteProps {
  questions: V2QuestionClient[];
  currentIndex: number;
  onSelect: (index: number) => void;
  answeredMap: Record<string, boolean>;
}

export const QuestionPalette: React.FC<QuestionPaletteProps> = ({
  questions,
  currentIndex,
  onSelect,
  answeredMap,
}) => {
  return (
    <div className="bg-white border border-[#E0E7F2] rounded-xl p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between mb-3 text-xs">
        <span className="font-semibold text-[#0B1B43] uppercase tracking-wider text-[11px]">
          Question Palette
        </span>
        <span className="text-[#405B8B]">
          {Object.values(answeredMap).filter(Boolean).length}/{questions.length} Completed
        </span>
      </div>

      <div className="grid grid-cols-5 sm:grid-cols-6 lg:grid-cols-8 gap-2">
        {questions.map((q, idx) => {
          const isCurrent = currentIndex === idx;
          const isAnswered = Boolean(answeredMap[q.id]);

          let typeColor = 'text-[#405B8B]';
          if (q.type === 'code') typeColor = 'text-sky-500';
          else if (q.type === 'sql') typeColor = 'text-amber-500';
          else if (q.type === 'project') typeColor = 'text-[#603DF5]';

          return (
            <button
              key={q.id || idx}
              type="button"
              onClick={() => onSelect(idx)}
              className={`h-11 rounded-lg border flex flex-col items-center justify-center transition-all ${
                isCurrent
                  ? 'border-[#4F46E5] ring-2 ring-[#4F46E5]/30 bg-[#EEF2FF] text-[#4F46E5] font-bold'
                  : isAnswered
                  ? 'border-emerald-300 bg-[#F0FDF4] text-[#16A34A] font-medium'
                  : 'border-[#E0E7F2] hover:border-[#C7D2FE] text-[#405B8B]'
              }`}
            >
              <span className="text-xs">{idx + 1}</span>
              <span className={`text-[9px] uppercase tracking-tighter font-semibold ${typeColor}`}>
                {q.type === 'mcq' ? 'MCQ' : q.type === 'code' ? 'Code' : q.type === 'sql' ? 'SQL' : 'Proj'}
              </span>
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between text-[10px] text-[#405B8B] pt-3 mt-3 border-t border-[#E0E7F2]">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#4F46E5] inline-block" /> Current
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#16A34A] inline-block" /> Answered
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#E0E7F2] inline-block" /> Remaining
        </span>
      </div>
    </div>
  );
};
