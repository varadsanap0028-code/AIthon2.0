import React, { useState } from 'react';
import { BookOpen, CheckCircle2, XCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface QuestionSummary {
  questionId?: string;
  question: string;
  skillName: string;
  isCorrect: boolean;
  explanation?: string;
}

interface ReportQuizReviewProps {
  questions: QuestionSummary[];
}

export const ReportQuizReview: React.FC<ReportQuizReviewProps> = ({ questions }) => {
  const [openQuestions, setOpenQuestions] = useState<Record<string, boolean>>({});

  if (!questions || questions.length === 0) return null;

  const toggleQuestion = (id: string) => {
    setOpenQuestions((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const correctCount = questions.filter((q) => q.isCorrect).length;

  return (
    <div className="bg-white border border-[#E0E7F2] rounded-2xl p-6 sm:p-8 shadow-[var(--shadow-card)] space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-[#E0E7F2]">
        <div>
          <h2 className="text-lg font-bold text-[#0B1B43] flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#087BFA]" />
            Knowledge Quiz Review &amp; Explanations ({questions.length})
          </h2>
          <p className="text-xs text-[#405B8B] mt-0.5">
            Questions are collapsed by default. Expand any question to view the full conceptual explanation.
          </p>
        </div>
        <span className="text-xs font-mono font-bold text-[#405B8B]">
          {correctCount}/{questions.length} Correct
        </span>
      </div>

      <div className="space-y-2.5">
        {questions.map((q, idx) => {
          const qId = q.questionId || String(idx);
          const isOpen = Boolean(openQuestions[qId]);
          return (
            <div
              key={qId}
              className="border border-[#E0E7F2] rounded-xl overflow-hidden text-xs"
            >
              <button
                type="button"
                onClick={() => toggleQuestion(qId)}
                className="w-full text-left p-3.5 bg-[#F4F7FC] flex items-center justify-between hover:bg-slate-100/80 transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2.5 truncate pr-2">
                  {q.isCorrect ? (
                    <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  )}
                  <span className="font-semibold text-[#0B1B43] truncate">
                    Q{idx + 1}: {q.question}
                  </span>
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] px-2 py-0.5 rounded bg-white border border-[#E0E7F2] text-[#405B8B] font-mono">
                    {q.skillName}
                  </span>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-[#405B8B]" /> : <ChevronDown className="w-4 h-4 text-[#405B8B]" />}
                </div>
              </button>

              {isOpen && (
                <div className="p-4 bg-white border-t border-[#E0E7F2] space-y-2.5">
                  <div className="text-[#0B1B43] font-medium leading-relaxed">{q.question}</div>
                  {q.explanation && (
                    <div className="p-3 bg-[#F4F7FC] rounded-lg border border-[#E0E7F2] text-[#405B8B] leading-relaxed">
                      <strong className="text-[#0B1B43]">Explanation:</strong> {q.explanation}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
