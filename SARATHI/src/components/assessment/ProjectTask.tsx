import React, { useState } from 'react';
import { FolderGit2, Globe, FileCode2, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import type { V2QuestionClient } from '../../types/assessmentV2';

interface ProjectTaskProps {
  question: V2QuestionClient;
  code: string;
  onCodeChange: (code: string) => void;
  repoUrl?: string;
  onRepoUrlChange?: (url: string) => void;
  demoUrl?: string;
  onDemoUrlChange?: (url: string) => void;
  pasteAllowed?: boolean;
  onPasteBlocked?: () => void;
}

export const ProjectTask: React.FC<ProjectTaskProps> = ({
  question,
  code,
  onCodeChange,
  repoUrl = '',
  onRepoUrlChange,
  demoUrl = '',
  onDemoUrlChange,
  pasteAllowed = true,
  onPasteBlocked,
}) => {
  const [rubricOpen, setRubricOpen] = useState(true);

  return (
    <div className="space-y-6">
      {/* Project Brief */}
      <div className="bg-white border border-[#E0E7F2] rounded-xl p-6 shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between mb-4">
          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-purple-50 text-[#603DF5] border border-purple-200">
            Mini-Project Challenge • {question.skillName}
          </span>
          <span className="text-xs text-slate-500 font-mono">Rubric-Evaluated</span>
        </div>

        <h2 className="text-lg font-bold text-[#0B1B43] mb-3">
          Architecture & Implementation Challenge
        </h2>

        <div className="text-sm text-[#405B8B] whitespace-pre-wrap leading-relaxed mb-5">
          {question.prompt}
        </div>

        {/* Rubric Criteria Accordion */}
        {question.rubric && question.rubric.length > 0 && (
          <div className="border border-[#E0E7F2] rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setRubricOpen(!rubricOpen)}
              className="w-full bg-[#F4F7FC] px-4 py-2.5 text-left text-xs font-semibold text-[#405B8B] flex items-center justify-between hover:bg-[#E0E7F2] transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#603DF5]" />
                Transparent Evaluation Rubric ({question.rubric.length} Criteria)
              </span>
              {rubricOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {rubricOpen && (
              <div className="p-4 bg-white grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {question.rubric.map((r) => (
                  <div key={r.key} className="p-3 bg-[#F4F7FC] rounded-lg border border-[#E0E7F2]">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-[#0B1B43]">{r.label}</span>
                      <span className="text-[#603DF5] font-mono font-bold">{r.weight}%</span>
                    </div>
                    <p className="text-[#405B8B] text-[11px] leading-normal">{r.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Submission Inputs: Code Editor Text & Repository Links */}
      <div className="bg-white border border-[#E0E7F2] rounded-xl p-6 shadow-[var(--shadow-card)] space-y-4">
        <h3 className="text-sm font-semibold text-[#0B1B43] flex items-center gap-2">
          <FileCode2 className="w-4 h-4 text-sky-500" /> Source Code & Implementation Deliverables
        </h3>

        <div>
          <label className="block text-xs font-medium text-[#405B8B] mb-1.5">
            Key Code Snippet / Module Text (Markdown or Source)
          </label>
          <textarea
            value={code}
            onChange={(e) => onCodeChange(e.target.value)}
            onPaste={(e) => {
              if (!pasteAllowed) {
                e.preventDefault();
                onPasteBlocked?.();
              }
            }}
            onCopy={(e) => {
              if (!pasteAllowed) {
                e.preventDefault();
                onPasteBlocked?.();
              }
            }}
            onCut={(e) => {
              if (!pasteAllowed) {
                e.preventDefault();
                onPasteBlocked?.();
              }
            }}
            onDrop={(e) => {
              if (!pasteAllowed) {
                e.preventDefault();
                onPasteBlocked?.();
              }
            }}
            rows={10}
            placeholder={
              pasteAllowed
                ? "Paste or type your core implementation, route handlers, or architectural code here..."
                : "Type your core implementation, route handlers, or architectural code here (copy/paste disabled in Secure Mode)..."
            }
            className="w-full bg-[#F4F7FC] border border-[#E0E7F2] rounded-lg p-3 text-xs font-mono text-[#0B1B43] focus:ring-2 focus:ring-[#603DF5] outline-none"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="block text-xs font-medium text-[#405B8B] mb-1 flex items-center gap-1.5">
              <FolderGit2 className="w-3.5 h-3.5 text-slate-400" /> GitHub Repository URL (Optional)
            </label>
            <input
              type="url"
              value={repoUrl}
              onChange={(e) => onRepoUrlChange?.(e.target.value)}
              placeholder="https://github.com/username/project"
              className="w-full bg-[#F4F7FC] border border-[#E0E7F2] rounded-lg px-3 py-2 text-xs text-[#0B1B43] focus:ring-1 focus:ring-[#603DF5] outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#405B8B] mb-1 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-slate-400" /> Live Demo / Deployment URL (Optional)
            </label>
            <input
              type="url"
              value={demoUrl}
              onChange={(e) => onDemoUrlChange?.(e.target.value)}
              placeholder="https://my-app.vercel.app"
              className="w-full bg-[#F4F7FC] border border-[#E0E7F2] rounded-lg px-3 py-2 text-xs text-[#0B1B43] focus:ring-1 focus:ring-[#603DF5] outline-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
