import React, { useState } from 'react';
import { Copy, Check, Split, AlignLeft } from 'lucide-react';

interface CodeDiffViewerProps {
  originalCode: string;
  modifiedCode: string;
  originalLabel?: string;
  modifiedLabel?: string;
  language?: string;
}

export const CodeDiffViewer: React.FC<CodeDiffViewerProps> = ({
  originalCode,
  modifiedCode,
  originalLabel = 'Original / Peer Submission',
  modifiedLabel = 'Current Candidate Submission',
  language = 'python',
}) => {
  const [viewMode, setViewMode] = useState<'split' | 'unified'>('split');
  const [copiedOriginal, setCopiedOriginal] = useState(false);
  const [copiedModified, setCopiedModified] = useState(false);

  const origLines = (originalCode || '').split('\n');
  const modLines = (modifiedCode || '').split('\n');
  const maxLines = Math.max(origLines.length, modLines.length);

  const handleCopy = (text: string, isOriginal: boolean) => {
    navigator.clipboard.writeText(text);
    if (isOriginal) {
      setCopiedOriginal(true);
      setTimeout(() => setCopiedOriginal(false), 2000);
    } else {
      setCopiedModified(true);
      setTimeout(() => setCopiedModified(false), 2000);
    }
  };

  return (
    <div className="flex flex-col border border-slate-200 rounded-xl overflow-hidden bg-slate-900 text-slate-100 font-mono text-xs">
      {/* Header controls */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-slate-700 text-slate-300">
            {language}
          </span>
          <span className="text-slate-400 text-[11px]">
            {origLines.length} lines vs {modLines.length} lines
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-700/70 p-0.5 rounded-lg border border-slate-600">
            <button
              type="button"
              onClick={() => setViewMode('split')}
              className={`px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1 transition-colors ${
                viewMode === 'split' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:text-white'
              }`}
            >
              <Split className="w-3 h-3" />
              <span>Split</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('unified')}
              className={`px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1 transition-colors ${
                viewMode === 'unified' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:text-white'
              }`}
            >
              <AlignLeft className="w-3 h-3" />
              <span>Unified</span>
            </button>
          </div>
        </div>
      </div>

      {/* Code Area */}
      {viewMode === 'split' ? (
        <div className="grid grid-cols-2 divide-x divide-slate-700 max-h-[480px] overflow-auto select-text">
          {/* Left: Original / Peer */}
          <div className="flex flex-col">
            <div className="sticky top-0 z-10 flex items-center justify-between px-3 py-1.5 bg-slate-800/95 border-b border-slate-700 text-[11px] text-slate-300">
              <span className="font-semibold text-amber-400 truncate">{originalLabel}</span>
              <button
                type="button"
                onClick={() => handleCopy(originalCode, true)}
                className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-slate-200 transition-colors"
                title="Copy code"
              >
                {copiedOriginal ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
            <div className="p-3 space-y-0.5">
              {origLines.map((line, idx) => {
                const isDifferent = idx < modLines.length && line.trim() !== modLines[idx]?.trim();
                return (
                  <div
                    key={`orig-${idx}`}
                    className={`flex items-start gap-3 px-1 rounded ${
                      isDifferent ? 'bg-amber-950/40 text-amber-200' : 'text-slate-300'
                    }`}
                  >
                    <span className="w-6 shrink-0 text-right text-slate-500 select-none text-[10px]">
                      {idx + 1}
                    </span>
                    <pre className="whitespace-pre-wrap break-all flex-1 font-mono">{line || ' '}</pre>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Modified / Current Candidate */}
          <div className="flex flex-col">
            <div className="sticky top-0 z-10 flex items-center justify-between px-3 py-1.5 bg-slate-800/95 border-b border-slate-700 text-[11px] text-slate-300">
              <span className="font-semibold text-indigo-400 truncate">{modifiedLabel}</span>
              <button
                type="button"
                onClick={() => handleCopy(modifiedCode, false)}
                className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-slate-200 transition-colors"
                title="Copy code"
              >
                {copiedModified ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
            <div className="p-3 space-y-0.5">
              {modLines.map((line, idx) => {
                const isDifferent = idx < origLines.length && line.trim() !== origLines[idx]?.trim();
                return (
                  <div
                    key={`mod-${idx}`}
                    className={`flex items-start gap-3 px-1 rounded ${
                      isDifferent ? 'bg-indigo-950/40 text-indigo-200' : 'text-slate-300'
                    }`}
                  >
                    <span className="w-6 shrink-0 text-right text-slate-500 select-none text-[10px]">
                      {idx + 1}
                    </span>
                    <pre className="whitespace-pre-wrap break-all flex-1 font-mono">{line || ' '}</pre>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="p-3 max-h-[480px] overflow-auto select-text space-y-0.5">
          {Array.from({ length: maxLines }).map((_, idx) => {
            const orig = origLines[idx];
            const mod = modLines[idx];
            const isMatch = orig !== undefined && mod !== undefined && orig.trim() === mod.trim();

            if (isMatch) {
              return (
                <div key={`u-match-${idx}`} className="flex items-start gap-3 px-2 py-0.5 text-slate-300">
                  <span className="w-6 shrink-0 text-right text-slate-500 select-none text-[10px]">{idx + 1}</span>
                  <span className="w-3 select-none text-slate-600"> </span>
                  <pre className="whitespace-pre-wrap break-all flex-1 font-mono">{mod || ' '}</pre>
                </div>
              );
            }

            return (
              <React.Fragment key={`u-diff-${idx}`}>
                {orig !== undefined && (
                  <div className="flex items-start gap-3 px-2 py-0.5 bg-red-950/40 text-red-200">
                    <span className="w-6 shrink-0 text-right text-red-400 select-none text-[10px]">{idx + 1}</span>
                    <span className="w-3 select-none text-red-400 font-bold">-</span>
                    <pre className="whitespace-pre-wrap break-all flex-1 font-mono">{orig || ' '}</pre>
                  </div>
                )}
                {mod !== undefined && (
                  <div className="flex items-start gap-3 px-2 py-0.5 bg-emerald-950/40 text-emerald-200">
                    <span className="w-6 shrink-0 text-right text-emerald-400 select-none text-[10px]">{idx + 1}</span>
                    <span className="w-3 select-none text-emerald-400 font-bold">+</span>
                    <pre className="whitespace-pre-wrap break-all flex-1 font-mono">{mod || ' '}</pre>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
};
