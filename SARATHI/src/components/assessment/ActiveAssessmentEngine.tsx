import React from 'react';
import type { AssessmentSessionClient, V2SessionResult } from '../../types/assessmentV2';
import { QuizPanel } from './QuizPanel';
import { CodeWorkbench } from './CodeWorkbench';
import { ProjectTask } from './ProjectTask';
import { QuestionPalette } from './QuestionPalette';
import { IntegrityBanner } from './IntegrityBanner';
import { CameraCheck } from './CameraCheck';
import { useAssessmentEngine } from '../../hooks/useAssessmentEngine';
import { useIntegrityMonitor } from '../../hooks/useIntegrityMonitor';
import { Clock, Send, ShieldCheck, BookOpen } from 'lucide-react';

interface ActiveAssessmentEngineProps {
  session: AssessmentSessionClient;
  user?: any;
  onComplete: (res: V2SessionResult) => void;
}

export const ActiveAssessmentEngine: React.FC<ActiveAssessmentEngineProps> = ({ session, user, onComplete }) => {
  const engine = useAssessmentEngine({ initialSession: session, user, onSubmitted: onComplete });
  const integrity = useIntegrityMonitor({
    sessionId: session.sessionId,
    rules: session.rules,
    user,
    enabled: session.mode === 'secure' && session.status === 'in_progress',
  });

  const [actionBlockedNotice, setActionBlockedNotice] = React.useState<string | null>(null);
  const noticeTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const pasteAllowed = session.mode === 'practice' || Boolean(session.rules?.pasteAllowed);

  const handleActionBlocked = React.useCallback(() => {
    setActionBlockedNotice('Copy and paste are disabled during Secure Assessment Mode.');
    integrity.logEvent('paste_blocked', { ts: new Date().toISOString() });
    if (noticeTimeoutRef.current) clearTimeout(noticeTimeoutRef.current);
    noticeTimeoutRef.current = setTimeout(() => setActionBlockedNotice(null), 4000);
  }, [integrity]);

  React.useEffect(() => {
    return () => {
      if (noticeTimeoutRef.current) clearTimeout(noticeTimeoutRef.current);
      engine.saveImmediately();
    };
  }, [engine]);

  const activeQ = engine.activeQuestion;
  const isMcq = activeQ?.type === 'mcq';
  const isCode = activeQ?.type === 'code' || activeQ?.type === 'sql';
  const isProject = activeQ?.type === 'project';

  const answeredMap: Record<string, boolean> = {};
  engine.questions.forEach(q => {
    answeredMap[q.id] = q.type === 'mcq'
      ? engine.answers[q.id] !== undefined
      : Boolean(engine.codeMap[q.id]?.code && engine.codeMap[q.id].code !== q.starterCode);
  });

  const isSecure = session.mode === 'secure';

  return (
    <div className="max-w-7xl mx-auto py-6 px-4">
      <IntegrityBanner
        showWarning={integrity.showWarning}
        isOffline={integrity.isOffline}
        onDismissWarning={integrity.dismissWarning}
        actionBlockedNotice={actionBlockedNotice}
        onDismissActionNotice={() => setActionBlockedNotice(null)}
      />

      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 mb-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className={`p-2.5 rounded-xl ${isSecure ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}`}>
            {isSecure ? <ShieldCheck className="w-5 h-5" /> : <BookOpen className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-[#0B1B43] capitalize">{session.mode} Assessment</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                isSecure ? 'bg-indigo-50 border border-indigo-200 text-indigo-700' : 'bg-emerald-50 border border-emerald-200 text-emerald-700'
              }`}>
                {isSecure ? 'Recruiter Verified' : 'Practice Sandbox'}
              </span>
            </div>
            <div className="flex items-center space-x-2 text-xs text-slate-500 mt-0.5">
              <span>{session.role}</span>
              <span>·</span>
              <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                engine.autosaveStatus === 'saving' ? 'bg-amber-100 text-amber-700' : engine.autosaveStatus === 'offline' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  engine.autosaveStatus === 'saving' ? 'bg-amber-500 animate-pulse' : engine.autosaveStatus === 'offline' ? 'bg-rose-500' : 'bg-emerald-500'
                }`} />
                <span>
                  {engine.autosaveStatus === 'saving' ? 'Saving...' : engine.autosaveStatus === 'offline' ? 'Offline (queued)' : engine.lastSavedAt ? `Saved ${engine.lastSavedAt}` : 'Saved'}
                </span>
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {isSecure ? <CameraCheck /> : (
            <div className="px-2.5 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium">
              Zero Proctoring · 100% Private
            </div>
          )}
          <div className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold ${
            engine.isLowTime ? 'bg-rose-100 text-rose-700 animate-pulse' : 'bg-slate-100 text-slate-700'
          }`}>
            <Clock className="w-4 h-4 text-slate-500" />
            <span>{engine.formattedTime}</span>
          </div>
          <button
            onClick={engine.submitAssessment}
            disabled={engine.isSubmitting}
            className={`inline-flex items-center px-4 py-2 rounded-xl text-white text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 ${
              isSecure ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
          >
            <Send className="w-3.5 h-3.5 mr-1.5" />
            <span>{engine.isSubmitting ? 'Grading...' : (isSecure ? 'Submit for Verification' : 'Finish Practice')}</span>
          </button>
        </div>
      </div>

      {/* Main interactive section */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          {activeQ && isMcq && (
            <QuizPanel
              question={activeQ}
              selectedOption={typeof engine.answers[activeQ.id] === 'number' ? engine.answers[activeQ.id] : undefined}
              onSelectOption={(idx: number) => engine.selectAnswer(activeQ.id, idx)}
              currentIndex={engine.currentIndex}
              totalQuestions={engine.questions.length}
              onNext={engine.nextQuestion}
              onPrev={engine.prevQuestion}
              pasteAllowed={pasteAllowed}
              onPasteBlocked={handleActionBlocked}
            />
          )}

          {activeQ && isCode && (
            <CodeWorkbench
              question={activeQ}
              code={engine.codeMap[activeQ.id]?.code || ''}
              onCodeChange={(newCode: string) => engine.updateCode(activeQ.id, newCode)}
              onRun={async (qId: string) => { await engine.runCode(qId); }}
              isRunning={engine.isRunningCode}
              runResults={engine.testResults[activeQ.id]}
              pasteAllowed={pasteAllowed}
              onPasteBlocked={handleActionBlocked}
            />
          )}

          {activeQ && isProject && (
            <ProjectTask
              question={activeQ}
              code={typeof engine.answers[activeQ.id] === 'string' ? engine.answers[activeQ.id] : ''}
              onCodeChange={(text: string) => engine.selectAnswer(activeQ.id, text)}
              pasteAllowed={pasteAllowed}
              onPasteBlocked={handleActionBlocked}
            />
          )}
        </div>

        <div className="lg:col-span-1">
          <QuestionPalette
            questions={engine.questions}
            currentIndex={engine.currentIndex}
            onSelect={engine.goToQuestion}
            answeredMap={answeredMap}
          />
        </div>
      </div>
    </div>
  );
};
