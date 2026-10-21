import { useEffect, useRef, useState, useCallback } from 'react';
import { AssessmentV2Service } from '../services/assessmentV2Service';
import type { UserProfile } from '../types/user';

export type AutosaveStatus = 'saved' | 'saving' | 'offline' | 'error';

interface UseAutosaveProps {
  sessionId?: string;
  answers: Record<string, any>;
  activeCode?: { questionId: string; code: string; language: string };
  user?: UserProfile;
  initialSaveVersion?: number;
  enabled?: boolean;
}

export function useAutosave({
  sessionId,
  answers,
  activeCode,
  user,
  initialSaveVersion = 1,
  enabled = true,
}: UseAutosaveProps) {
  const [status, setStatus] = useState<AutosaveStatus>('saved');
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const saveVersionRef = useRef<number>(initialSaveVersion);
  const prevAnswersRef = useRef<string>('');
  const prevCodeRef = useRef<string>('');
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryAttemptRef = useRef<number>(0);
  const isSavingRef = useRef<boolean>(false);
  const hasQueuedSaveRef = useRef<boolean>(false);

  // Queue to sessionStorage immediately on local state change
  useEffect(() => {
    if (!sessionId) return;
    try {
      sessionStorage.setItem(`sarathi_v2_${sessionId}_answers`, JSON.stringify(answers));
      sessionStorage.setItem(`sarathi_v2_${sessionId}_save_version`, String(saveVersionRef.current));
      if (activeCode?.code) {
        sessionStorage.setItem(`sarathi_v2_${sessionId}_code_${activeCode.questionId}`, activeCode.code);
      }
    } catch {}
  }, [sessionId, answers, activeCode]);

  // Handle online/offline browser events
  useEffect(() => {
    const handleOnline = () => {
      if (status === 'offline') {
        setStatus('saved');
        triggerSave();
      }
    };
    const handleOffline = () => {
      setStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [status]);

  const triggerSave = useCallback(async () => {
    if (!sessionId || !enabled) return;

    if (isSavingRef.current) {
      hasQueuedSaveRef.current = true;
      return;
    }

    const answersJson = JSON.stringify(answers);
    const codeJson = JSON.stringify(activeCode || {});
    const answersChanged = answersJson !== prevAnswersRef.current;
    const codeChanged = codeJson !== prevCodeRef.current;

    if (!answersChanged && !codeChanged) return;

    if (!navigator.onLine) {
      setStatus('offline');
      return;
    }

    try {
      isSavingRef.current = true;
      setStatus('saving');

      if (answersChanged && Object.keys(answers).length > 0) {
        const res = await AssessmentV2Service.saveAnswers(
          sessionId,
          answers,
          user,
          saveVersionRef.current
        );
        if (res.saveVersion) {
          saveVersionRef.current = res.saveVersion;
        }
        prevAnswersRef.current = answersJson;
      }

      if (codeChanged && activeCode?.questionId && activeCode?.code) {
        await AssessmentV2Service.saveSnapshot(
          sessionId,
          {
            questionId: activeCode.questionId,
            code: activeCode.code,
            language: activeCode.language || 'javascript',
            reason: 'autosave',
          },
          user
        );
        prevCodeRef.current = codeJson;
      }

      retryAttemptRef.current = 0;
      setStatus('saved');
      setLastSavedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (err: any) {
      if (err?.code === 'VERSION_CONFLICT') {
        console.warn('[Autosave] Save conflict detected; fetching updated server state.');
        try {
          const state = await AssessmentV2Service.getSessionState(sessionId, user);
          saveVersionRef.current = (state.saveVersion || 1) + 1;
        } catch {}
      }

      setStatus(navigator.onLine ? 'error' : 'offline');

      // Exponential backoff retry (2s, 4s, 8s, max 30s)
      const attempt = retryAttemptRef.current;
      const delayMs = Math.min(2000 * Math.pow(2, attempt), 30000);
      retryAttemptRef.current += 1;

      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = setTimeout(() => {
        triggerSave();
      }, delayMs);
    } finally {
      isSavingRef.current = false;
      if (hasQueuedSaveRef.current) {
        hasQueuedSaveRef.current = false;
        triggerSave();
      }
    }
  }, [sessionId, enabled, answers, activeCode, user]);

  useEffect(() => {
    if (!enabled || !sessionId) return;
    const interval = setInterval(triggerSave, 25000);
    return () => {
      clearInterval(interval);
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    };
  }, [enabled, sessionId, triggerSave]);

  return {
    status,
    lastSavedAt,
    isSaving: status === 'saving',
    saveImmediately: triggerSave,
  };
}
