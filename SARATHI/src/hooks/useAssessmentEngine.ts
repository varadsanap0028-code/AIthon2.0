import { useState, useCallback, useMemo } from 'react';
import type { AssessmentSessionClient, V2QuestionClient, V2SessionResult } from '../types/assessmentV2';
import type { UserProfile } from '../types/user';
import { AssessmentV2Service } from '../services/assessmentV2Service';
import { useCountdown } from './useCountdown';
import { useAutosave } from './useAutosave';

interface UseAssessmentEngineOptions {
  initialSession: AssessmentSessionClient;
  user?: UserProfile;
  onSubmitted?: (result: V2SessionResult) => void;
}

function initCodeMap(questions: V2QuestionClient[], sessionId: string, initialSnapshots?: Record<string, any>) {
  const map: Record<string, { code: string; language: string }> = {};
  for (const q of questions) {
    if (q.type === 'code' || q.type === 'sql') {
      let saved: string | null = null;
      try { saved = sessionStorage.getItem(`sarathi_v2_${sessionId}_code_${q.id}`); } catch {}
      const snapshotCode = initialSnapshots?.[q.id]?.code;
      map[q.id] = {
        code: saved !== null ? saved : (snapshotCode !== undefined ? snapshotCode : (q.starterCode || '')),
        language: q.language || (q.type === 'sql' ? 'sql' : 'javascript'),
      };
    }
  }
  return map;
}

export function useAssessmentEngine({ initialSession, user, onSubmitted }: UseAssessmentEngineOptions) {
  const [session, setSession] = useState<AssessmentSessionClient>(initialSession);
  const [currentIndex, setCurrentIndex] = useState(() => {
    try {
      const saved = sessionStorage.getItem(`sarathi_v2_${initialSession.sessionId}_current_index`);
      if (saved !== null) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= 0 && parsed < initialSession.questions.length) {
          return parsed;
        }
      }
    } catch {}
    return 0;
  });

  const [answers, setAnswers] = useState<Record<string, any>>(() => {
    let localDraft: Record<string, any> = {};
    try {
      const s = sessionStorage.getItem(`sarathi_v2_${initialSession.sessionId}_answers`);
      if (s) localDraft = JSON.parse(s);
    } catch {}
    // Merge server draftAnswers with local sessionStorage, prioritizing local
    return {
      ...(initialSession.draftAnswers || {}),
      ...localDraft,
    };
  });

  const [codeMap, setCodeMap] = useState(() =>
    initCodeMap(initialSession.questions, initialSession.sessionId, initialSession.snapshots)
  );
  const [testResults, setTestResults] = useState<Record<string, any>>({});
  const [isRunningCode, setIsRunningCode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<V2SessionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeQuestion: V2QuestionClient | undefined = session.questions[currentIndex];

  const activeCodeObj = useMemo(() => {
    if (!activeQuestion || (activeQuestion.type !== 'code' && activeQuestion.type !== 'sql')) return undefined;
    const cur = codeMap[activeQuestion.id];
    return { questionId: activeQuestion.id, code: cur?.code || '', language: cur?.language || 'javascript' };
  }, [activeQuestion, codeMap]);

  const submitAssessment = useCallback(async () => {
    if (isSubmitting || session.status === 'graded') return;
    setIsSubmitting(true);
    setError(null);
    try {
      const tasksPayload: Record<string, any> = {};
      Object.entries(codeMap).forEach(([qId, data]) => {
        tasksPayload[qId] = { code: data.code, language: data.language };
      });
      const graded = await AssessmentV2Service.submitSession(session.sessionId, { answers, tasks: tasksPayload }, user);
      setResult(graded);
      setSession(prev => ({ ...prev, status: 'graded' }));
      try {
        sessionStorage.removeItem('sarathi_v2_active_session_id');
        sessionStorage.removeItem('sarathi_v2_active_mode');
        sessionStorage.removeItem(`sarathi_v2_${session.sessionId}_current_index`);
      } catch {}
      onSubmitted?.(graded);
    } catch (err: any) {
      setError(err.message || 'Failed to submit assessment.');
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, session, answers, codeMap, user, onSubmitted]);

  const { formattedTime, secondsRemaining, isLowTime, isExpired } = useCountdown({
    expiresAt: session.deadlineAt || session.expiresAt,
    onExpire: submitAssessment,
    enabled: session.status === 'in_progress',
  });

  const { status: autosaveStatus, lastSavedAt, isSaving, saveImmediately } = useAutosave({
    sessionId: session.sessionId,
    answers,
    activeCode: activeCodeObj,
    user,
    initialSaveVersion: session.saveVersion,
    enabled: session.status === 'in_progress',
  });

  const selectAnswer = useCallback((questionId: string, answer: any) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  }, []);

  const updateCode = useCallback((questionId: string, code: string, language?: string) => {
    setCodeMap(prev => ({
      ...prev,
      [questionId]: { code, language: language || prev[questionId]?.language || 'javascript' },
    }));
  }, []);

  const runCode = useCallback(async (questionId?: string) => {
    const targetQId = questionId || activeQuestion?.id;
    if (!targetQId || !codeMap[targetQId]) return;
    setIsRunningCode(true);
    setError(null);
    try {
      const res = await AssessmentV2Service.runCode(
        session.sessionId,
        { questionId: targetQId, code: codeMap[targetQId].code, language: codeMap[targetQId].language },
        user
      );
      setTestResults(prev => ({ ...prev, [targetQId]: res }));
    } catch (err: any) {
      setError(err.message || 'Execution error');
      setTestResults(prev => ({
        ...prev,
        [targetQId]: { status: 'error', visiblePassed: 0, visibleTotal: 0, results: [], stderr: err.message },
      }));
    } finally {
      setIsRunningCode(false);
    }
  }, [activeQuestion, codeMap, session.sessionId, user]);

  const goToQuestion = useCallback((idx: number) => {
    if (idx >= 0 && idx < session.questions.length) {
      setCurrentIndex(idx);
      try {
        sessionStorage.setItem(`sarathi_v2_${session.sessionId}_current_index`, String(idx));
      } catch {}
    }
  }, [session.questions.length, session.sessionId]);

  return {
    session,
    currentIndex,
    activeQuestion,
    questions: session.questions,
    answers,
    codeMap,
    testResults,
    isRunningCode,
    isSubmitting,
    result,
    error,
    formattedTime,
    secondsRemaining,
    isLowTime,
    isExpired,
    autosaveStatus,
    lastSavedAt,
    isSaving,
    selectAnswer,
    updateCode,
    runCode,
    submitAssessment,
    saveImmediately,
    goToQuestion,
    nextQuestion: () => goToQuestion(currentIndex + 1),
    prevQuestion: () => goToQuestion(currentIndex - 1),
  };
}
