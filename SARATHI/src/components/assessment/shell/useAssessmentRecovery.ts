import { useState, useEffect } from 'react';
import { AssessmentV2Service } from '../../../services/assessmentV2Service';
import type { AssessmentMode, AssessmentSessionClient, V2SessionResult } from '../../../types/assessmentV2';

export type ShellStep = 'briefing' | 'consent' | 'assessment' | 'results';

interface UseAssessmentRecoveryParams {
  domainId: string;
  user: any;
  isAuthLoading: boolean;
  attemptIdFromUrl: string | null;
  setSearchParams: (params: any, options?: any) => void;
}

export function useAssessmentRecovery({
  domainId,
  user,
  isAuthLoading,
  attemptIdFromUrl,
  setSearchParams,
}: UseAssessmentRecoveryParams) {
  const [step, setStep] = useState<ShellStep>('briefing');
  const [selectedMode, setSelectedMode] = useState<AssessmentMode>('practice');
  const [session, setSession] = useState<AssessmentSessionClient | null>(null);
  const [isRecovering, setIsRecovering] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<'auth_expired' | 'network' | 'not_found' | 'general' | null>(null);
  const [finalResult, setFinalResult] = useState<V2SessionResult | null>(null);
  const [latestCompletedResult, setLatestCompletedResult] = useState<V2SessionResult | null>(null);

  useEffect(() => {
    if (isAuthLoading) return;
    let isCancelled = false;

    const recoverState = async () => {
      try {
        setIsRecovering(true);
        setInitError(null);
        setErrorType(null);

        // 1. If explicit attemptId in URL, fetch that exact attempt directly
        if (attemptIdFromUrl) {
          try {
            const specificResult = await AssessmentV2Service.getSessionResult(attemptIdFromUrl, user || undefined);
            if (!isCancelled && specificResult) {
              setFinalResult(specificResult);
              setLatestCompletedResult(specificResult);
              setStep('results');
              return;
            }
          } catch (err: any) {
            if (!isCancelled) {
              const status = err.status || err.code;
              if (status === 401 || status === 'SESSION_EXPIRED') {
                setErrorType('auth_expired');
                setInitError('Your session has expired. Please sign in again.');
              } else if (status === 404 || status === 'NOT_FOUND') {
                setErrorType('not_found');
                setInitError('The requested assessment attempt could not be found.');
              } else {
                setErrorType('general');
                setInitError(err.message || 'Unable to load the requested assessment attempt.');
              }
              return;
            }
          }
        }

        // 2. Check for active in-progress session in sessionStorage or on server
        const localActiveId = sessionStorage.getItem('sarathi_v2_active_session_id');
        if (localActiveId) {
          try {
            const resumed = await AssessmentV2Service.getSession(localActiveId, user || undefined);
            if (!isCancelled && resumed?.status === 'in_progress') {
              setSession(resumed);
              setSelectedMode(resumed.mode);
              setStep('assessment');
              return;
            } else if (!isCancelled) {
              sessionStorage.removeItem('sarathi_v2_active_session_id');
              sessionStorage.removeItem('sarathi_v2_active_mode');
            }
          } catch {}
        }

        const activeRes = await AssessmentV2Service.getActiveSession(domainId, user || undefined);
        if (!isCancelled && activeRes.active && activeRes.session?.status === 'in_progress') {
          sessionStorage.setItem('sarathi_v2_active_session_id', activeRes.session.sessionId);
          sessionStorage.setItem('sarathi_v2_active_mode', activeRes.session.mode);
          setSession(activeRes.session);
          setSelectedMode(activeRes.session.mode);
          setStep('assessment');
          return;
        }

        // 3. Check for last completed attempt in sessionStorage
        const lastCompletedId = sessionStorage.getItem('sarathi_v2_last_completed_attempt_id');
        if (lastCompletedId) {
          try {
            const cachedResult = await AssessmentV2Service.getSessionResult(lastCompletedId, user || undefined);
            if (!isCancelled && cachedResult && (!domainId || cachedResult.domainId === domainId)) {
              setFinalResult(cachedResult);
              setLatestCompletedResult(cachedResult);
              setSearchParams({ attemptId: cachedResult.sessionId }, { replace: true });
              setStep('results');
              return;
            }
          } catch {}
        }

        // 4. Query authoritative latest completed result from backend (unless candidate clicked Retake)
        if (sessionStorage.getItem('sarathi_v2_retaking') === 'true') {
          setStep('briefing');
          return;
        }

        const latestRes = await AssessmentV2Service.getLatestResult(domainId, user || undefined);
        if (isCancelled) return;

        if (latestRes.success && latestRes.result) {
          sessionStorage.setItem('sarathi_v2_last_completed_attempt_id', latestRes.result.sessionId);
          setSearchParams({ attemptId: latestRes.result.sessionId }, { replace: true });
          setLatestCompletedResult(latestRes.result);
          setFinalResult(latestRes.result);
          setStep('results');
          return;
        }

        if (latestRes.success && latestRes.notFound) {
          setStep('briefing');
          return;
        }

        if (!latestRes.success) {
          setErrorType('network');
          setInitError(latestRes.error || 'Failed to load assessment records. Please retry.');
          return;
        }

        setStep('briefing');
      } catch (err: any) {
        if (!isCancelled) {
          setErrorType('general');
          setInitError(err.message || 'Error checking assessment status.');
        }
      } finally {
        if (!isCancelled) setIsRecovering(false);
      }
    };

    recoverState();
    return () => { isCancelled = true; };
  }, [domainId, user?.id, isAuthLoading, attemptIdFromUrl]);

  return {
    step,
    setStep,
    selectedMode,
    setSelectedMode,
    session,
    setSession,
    isRecovering,
    setIsRecovering,
    initError,
    setInitError,
    errorType,
    setErrorType,
    finalResult,
    setFinalResult,
    latestCompletedResult,
    setLatestCompletedResult,
  };
}
