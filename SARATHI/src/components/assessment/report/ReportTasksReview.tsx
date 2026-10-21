import React, { useState } from 'react';
import { Terminal, CheckCircle2, XCircle, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';

interface PracticalTaskSummary {
  taskId?: string;
  taskTitle: string;
  skillName: string;
  score?: number;
  isPassed: boolean;
  isInfrastructureError?: boolean;
  feedback?: string;
  visiblePassed?: number;
  visibleTotal?: number;
  hiddenPassed?: number;
  hiddenTotal?: number;
  executionStatus?: string;
}

interface ReportTasksReviewProps {
  tasks: PracticalTaskSummary[];
}

export const ReportTasksReview: React.FC<ReportTasksReviewProps> = ({ tasks }) => {
  const [openTasks, setOpenTasks] = useState<Record<string, boolean>>({});

  if (!tasks || tasks.length === 0) return null;

  const toggleTask = (id: string) => {
    setOpenTasks((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const succeededCount = tasks.filter((t) => t.isPassed).length;

  return (
    <div className="bg-white border border-[#E0E7F2] rounded-2xl p-6 sm:p-8 shadow-[var(--shadow-card)] space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-[#E0E7F2]">
        <div>
          <h2 className="text-lg font-bold text-[#0B1B43] flex items-center gap-2">
            <Terminal className="w-5 h-5 text-[#16A34A]" />
            Practical Workbench Tasks ({tasks.length})
          </h2>
          <p className="text-xs text-[#405B8B] mt-0.5">
            Evaluated against unit tests and automated verification runners in an isolated sandbox.
          </p>
        </div>
        <span className="text-xs font-mono font-bold text-[#405B8B]">
          {succeededCount}/{tasks.length} Succeeded
        </span>
      </div>

      <div className="space-y-3">
        {tasks.map((t, idx) => {
          const taskId = t.taskId || String(idx);
          const isOpen = Boolean(openTasks[taskId]);
          return (
            <div
              key={taskId}
              className="border border-[#E0E7F2] rounded-xl overflow-hidden bg-[#F4F7FC] text-xs"
            >
              <button
                type="button"
                onClick={() => toggleTask(taskId)}
                className="w-full text-left p-4 flex items-center justify-between hover:bg-slate-100/80 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3 truncate pr-2">
                  {t.isInfrastructureError ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                      NOT EXECUTED
                    </span>
                  ) : t.isPassed ? (
                    <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  )}
                  <div>
                    <span className="font-semibold text-[#0B1B43]">
                      Task {idx + 1}: {t.taskTitle}
                    </span>
                    <span className="ml-2 text-[11px] text-[#405B8B] font-normal">({t.skillName})</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-mono text-[11px] text-[#405B8B]">
                    {t.isInfrastructureError ? 'Infrastructure Issue' : `Score: ${t.score ?? (t.isPassed ? 100 : 0)}%`}
                  </span>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-[#405B8B]" /> : <ChevronDown className="w-4 h-4 text-[#405B8B]" />}
                </div>
              </button>

              {isOpen && (
                <div className="p-4 bg-white border-t border-[#E0E7F2] space-y-3">
                  {t.feedback && (
                    <div>
                      <div className="text-[11px] font-bold text-[#405B8B] uppercase tracking-wider mb-1">
                        Feedback & Diagnostic Notice
                      </div>
                      <p className="text-[#0B1B43] leading-relaxed">{t.feedback}</p>
                    </div>
                  )}

                  {t.isInfrastructureError ? (
                    <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <strong>Execution Halted:</strong> The execution runtime was unavailable on the execution
                        server. This check was marked as <em>NOT EXECUTED</em> and did not lower your technical score.
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-lg bg-[#F4F7FC] border border-[#E0E7F2] text-[11px] font-mono text-[#405B8B] flex flex-wrap gap-4">
                      <div>
                        <span className="font-bold text-[#0B1B43]">Visible Unit Checks:</span>{' '}
                        {t.visiblePassed ?? 0}/{t.visibleTotal ?? 0} passed
                      </div>
                      <div>
                        <span className="font-bold text-[#0B1B43]">Hidden Assertions:</span>{' '}
                        {t.hiddenPassed ?? 0}/{t.hiddenTotal ?? 0} passed
                      </div>
                      <div>
                        <span className="font-bold text-[#0B1B43]">Execution Status:</span>{' '}
                        <span className="capitalize text-[#0B1B43]">{t.executionStatus || 'completed'}</span>
                      </div>
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
