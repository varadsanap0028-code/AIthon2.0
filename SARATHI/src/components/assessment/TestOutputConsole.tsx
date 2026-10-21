import React from 'react';
import { Terminal, CheckCircle2, XCircle, Clock, AlertTriangle, ShieldCheck } from 'lucide-react';

export interface TestResultItem {
  id: string;
  kind?: string;
  passed: boolean;
  actual?: string;
  expected?: string;
  executionTimeMs?: number;
  error?: string | null;
}

interface TestOutputConsoleProps {
  status: 'idle' | 'running' | 'success' | 'failed' | 'error';
  visiblePassed: number;
  visibleTotal: number;
  results: TestResultItem[];
  stdout?: string;
  stderr?: string;
  timeMs?: number;
  isolationNotice?: string;
}

export const TestOutputConsole: React.FC<TestOutputConsoleProps> = ({
  status,
  visiblePassed,
  visibleTotal,
  results,
  stdout,
  stderr,
  timeMs,
  isolationNotice,
}) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col h-full text-slate-100 font-mono text-xs">
      {/* Console Header */}
      <div className="bg-slate-950 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-sky-400" />
          <span className="font-semibold text-slate-200">Execution Output & Test Verification</span>
        </div>
        <div className="flex items-center gap-3">
          {timeMs !== undefined && timeMs > 0 && (
            <span className="flex items-center gap-1 text-slate-400">
              <Clock className="w-3.5 h-3.5" /> {timeMs} ms
            </span>
          )}
          {status !== 'idle' && (
            <span
              className={`px-2 py-0.5 rounded text-[11px] font-medium flex items-center gap-1 ${
                status === 'success'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : status === 'running'
                  ? 'bg-sky-500/20 text-sky-300 animate-pulse'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              }`}
            >
              {status === 'success' ? (
                <>
                  <CheckCircle2 className="w-3 h-3" /> Passed ({visiblePassed}/{visibleTotal})
                </>
              ) : status === 'running' ? (
                'Running Suite...'
              ) : (
                <>
                  <XCircle className="w-3 h-3" /> Failed ({visiblePassed}/{visibleTotal})
                </>
              )}
            </span>
          )}
        </div>
      </div>

      {/* Main Console Body */}
      <div className="p-4 flex-1 overflow-y-auto space-y-4">
        {status === 'idle' ? (
          <div className="text-slate-500 flex items-center justify-center h-28 italic">
            Click &quot;Run Verification Check&quot; to execute solution against visible test suite.
          </div>
        ) : (
          <>
            {/* Test Case Cards */}
            {results && results.length > 0 && (
              <div className="space-y-2">
                <div className="text-slate-400 uppercase tracking-wider text-[10px] font-semibold">
                  Visible Test Assertions
                </div>
                <div className="grid gap-2">
                  {results.map((r, idx) => (
                    <div
                      key={r.id || idx}
                      className={`p-2.5 rounded-lg border text-xs ${
                        r.passed
                          ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-200'
                          : 'bg-rose-950/20 border-rose-800/40 text-rose-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold flex items-center gap-1.5">
                          {r.passed ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 text-rose-400" />
                          )}
                          Test Case #{idx + 1}
                        </span>
                        {r.executionTimeMs !== undefined && (
                          <span className="text-[10px] text-slate-400">{r.executionTimeMs} ms</span>
                        )}
                      </div>
                      {!r.passed && (
                        <div className="mt-1.5 space-y-1 bg-slate-950/60 p-2 rounded border border-slate-800 font-mono text-[11px]">
                          <div>
                            <span className="text-slate-500">Expected:</span>{' '}
                            <span className="text-slate-300">{r.expected}</span>
                          </div>
                          <div>
                            <span className="text-slate-500">Actual:</span>{' '}
                            <span className="text-rose-300">{r.actual || '(no output)'}</span>
                          </div>
                          {r.error && (
                            <div className="text-rose-400 text-[10px] pt-1 border-t border-slate-800">
                              Error: {r.error}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Standard Output / Error Stream */}
            {stdout && (
              <div>
                <div className="text-slate-400 uppercase tracking-wider text-[10px] font-semibold mb-1">
                  Standard Output (stdout)
                </div>
                <pre className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-emerald-400 text-xs overflow-x-auto whitespace-pre-wrap">
                  {stdout}
                </pre>
              </div>
            )}

            {stderr && (
              <div>
                <div className="text-rose-400 uppercase tracking-wider text-[10px] font-semibold mb-1 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Runtime Warnings / Errors (stderr)
                </div>
                <pre className="bg-rose-950/30 p-2.5 rounded-lg border border-rose-900/40 text-rose-300 text-xs overflow-x-auto whitespace-pre-wrap">
                  {stderr}
                </pre>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer isolation notice */}
      {isolationNotice && (
        <div className="bg-slate-950/90 px-4 py-2 border-t border-slate-800/80 text-[10px] text-slate-400 flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-sky-400 shrink-0" />
          <span className="truncate">{isolationNotice}</span>
        </div>
      )}
    </div>
  );
};
