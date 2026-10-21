import React from 'react';
import { HelpCircle, ChevronLeft, ChevronRight, MessageSquareText } from 'lucide-react';
import type { V2QuestionClient } from '../../types/assessmentV2';

interface QuizPanelProps {
  question: V2QuestionClient;
  currentIndex: number;
  totalQuestions: number;
  selectedOption: number | undefined;
  onSelectOption: (optionIndex: number) => void;
  explanationText?: string;
  onExplanationChange?: (text: string) => void;
  onNext: () => void;
  onPrev: () => void;
  pasteAllowed?: boolean;
  onPasteBlocked?: () => void;
}

export const QuizPanel: React.FC<QuizPanelProps> = ({
  question,
  currentIndex,
  totalQuestions,
  selectedOption,
  onSelectOption,
  explanationText = '',
  onExplanationChange,
  onNext,
  onPrev,
  pasteAllowed = true,
  onPasteBlocked,
}) => {
  const letters = ['A', 'B', 'C', 'D', 'E', 'F'];

  const handleCopyPaste = (e: React.ClipboardEvent) => {
    if (!pasteAllowed) {
      e.preventDefault();
      onPasteBlocked?.();
    }
  };

  return (
    <div
      onCopy={handleCopyPaste}
      onCut={handleCopyPaste}
      onPaste={handleCopyPaste}
      className="bg-white border border-[#E0E7F2] rounded-2xl p-6 sm:p-8 shadow-[var(--shadow-card)] flex flex-col justify-between min-h-[480px]"
    >
      <div>
        {/* Header badges */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-50 text-[#087BFA] border border-blue-200">
              {question.skillName} • Difficulty {question.difficulty}/3
            </span>
            <span className="text-xs text-slate-500 font-mono">
              Q{currentIndex + 1} of {totalQuestions}
            </span>
          </div>
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <HelpCircle className="w-3.5 h-3.5" /> Multiple Choice
          </span>
        </div>

        {/* Question Prompt */}
        <h2 className="text-base sm:text-lg font-bold text-[#0B1B43] mb-6 leading-relaxed">
          {question.prompt}
        </h2>

        {/* Tactile Option Selectors */}
        <div className="space-y-3 mb-6">
          {question.options?.map((option, idx) => {
            const isSelected = selectedOption === idx;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => onSelectOption(idx)}
                className={`w-full text-left p-4 rounded-xl border transition-all flex items-start gap-3.5 text-sm ${
                  isSelected
                    ? 'border-indigo-600 border-[#4F46E5] bg-[#EEF2FF] text-[#0B1B43] shadow-sm'
                    : 'border-[#E0E7F2] hover:border-[#C7D2FE] bg-white text-[#405B8B]'
                }`}
              >
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                    isSelected
                      ? 'bg-[#4F46E5] text-white'
                      : 'bg-[#F4F7FC] text-[#405B8B]'
                  }`}
                >
                  {letters[idx] || idx + 1}
                </span>
                <span className="leading-snug pt-0.5">{option}</span>
              </button>
            );
          })}
        </div>

        {/* Short Explanation Justification Box */}
        {onExplanationChange && (
          <div className="pt-2 border-t border-[#E0E7F2]">
            <label className="block text-xs font-medium text-[#405B8B] mb-1.5 flex items-center gap-1.5">
              <MessageSquareText className="w-3.5 h-3.5 text-slate-400" />
              Briefly explain your reasoning (Optional - evaluates understanding)
            </label>
            <input
              type="text"
              value={explanationText}
              onChange={(e) => onExplanationChange(e.target.value)}
              placeholder="e.g. useCallback caches function references across re-renders to maintain referential equality..."
              className="w-full bg-[#F4F7FC] border border-[#E0E7F2] rounded-lg px-3 py-2 text-xs text-[#0B1B43] focus:ring-1 focus:ring-[#4F46E5] outline-none"
            />
          </div>
        )}
      </div>

      {/* Footer Navigation Buttons */}
      <div className="flex items-center justify-between pt-6 border-t border-[#E0E7F2] mt-6">
        <button
          type="button"
          onClick={onPrev}
          disabled={currentIndex === 0}
          className="px-4 py-2 border border-[#E0E7F2] hover:bg-[#F4F7FC] disabled:opacity-40 text-[#405B8B] rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Previous
        </button>

        <button
          type="button"
          onClick={onNext}
          className="px-5 py-2 bg-[#4F46E5] hover:bg-[#4338CA] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
        >
          {currentIndex === totalQuestions - 1 ? 'Review & Submit' : 'Next Question'}
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
