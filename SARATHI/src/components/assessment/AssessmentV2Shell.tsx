import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useStudent } from '../../context/StudentContext';
import { AssessmentV2Service } from '../../services/assessmentV2Service';
import { toLegacyAssessmentResult } from '../../adapters/toLegacyAssessmentResult';
import type { AssessmentMode, V2SessionResult } from '../../types/assessmentV2';
import { UnifiedAssessmentStart } from './UnifiedAssessmentStart';
import { RulesConsent } from './RulesConsent';
import { ResultsReport } from './ResultsReport';
import { ActiveAssessmentEngine } from './ActiveAssessmentEngine';
import { useAssessmentRecovery } from './shell/useAssessmentRecovery';
import { AssessmentShellLoading, AssessmentShellError } from './shell/AssessmentShellFeedback';

interface AssessmentV2ShellProps {
  domainId: string;
  domainTitle: string;
  roleTitle: string;
}

export const AssessmentV2Shell: React.FC<AssessmentV2ShellProps> = ({ domainId, domainTitle, roleTitle }) => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { recordFullAssessmentResult } = useStudent();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [isInitializing, setIsInitializing] = useState(false);
  const [pendingAccommodations, setPendingAccommodations] = useState<any>(null);

  const attemptIdFromUrl = searchParams.get('attemptId') || searchParams.get('id');

  const {
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
    finalResult,
    setFinalResult,
    latestCompletedResult,
    setLatestCompletedResult,
  } = useAssessmentRecovery({
    domainId,
    user,
    isAuthLoading,
    attemptIdFromUrl,
    setSearchParams,
  });

  const startSession = async (mode: AssessmentMode, consentData?: any) => {
    try {
      setIsInitializing(true);
      setInitError(null);
      sessionStorage.removeItem('sarathi_v2_retaking');
      const newSession = await AssessmentV2Service.createSession(
        { mode, domainId, role: roleTitle, consent: consentData, accommodation: consentData?.accommodations },
        user || undefined
      );
      sessionStorage.setItem('sarathi_v2_active_session_id', newSession.sessionId);
      sessionStorage.setItem('sarathi_v2_active_mode', newSession.mode);
      setSession(newSession);
      setSelectedMode(newSession.mode);
      setStep('assessment');
    } catch (err: any) {
      setInitError(err.message || 'Failed to start assessment session.');
    } finally {
      setIsInitializing(false);
    }
  };

  const handleAssessmentSubmitted = (result: V2SessionResult) => {
    sessionStorage.removeItem('sarathi_v2_active_session_id');
    sessionStorage.removeItem('sarathi_v2_active_mode');
    sessionStorage.removeItem('sarathi_v2_retaking');
    sessionStorage.setItem('sarathi_v2_last_completed_attempt_id', result.sessionId);
    setSearchParams({ attemptId: result.sessionId }, { replace: true });
    setFinalResult(result);
    setLatestCompletedResult(result);
    setStep('results');
    try {
      recordFullAssessmentResult(toLegacyAssessmentResult(result));
    } catch {}
  };

  const handleRetake = () => {
    sessionStorage.removeItem('sarathi_v2_active_session_id');
    sessionStorage.removeItem('sarathi_v2_active_mode');
    sessionStorage.removeItem('sarathi_v2_last_completed_attempt_id');
    sessionStorage.setItem('sarathi_v2_retaking', 'true');
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('attemptId');
    newParams.delete('id');
    setSearchParams(newParams, { replace: true });
    setSession(null);
    setFinalResult(null);
    setStep('briefing');
  };

  if ((isRecovering || isAuthLoading) && !session && !latestCompletedResult && !initError) {
    return <AssessmentShellLoading />;
  }

  if (initError && !session && !latestCompletedResult) {
    return (
      <AssessmentShellError
        errorType={errorType}
        initError={initError}
        onSignInAgain={() => navigate('/login?returnTo=' + encodeURIComponent(window.location.pathname + window.location.search))}
        onRetry={() => { setInitError(null); setIsRecovering(true); }}
        onStartNew={() => { setInitError(null); handleRetake(); }}
      />
    );
  }

  if (step === 'results' && finalResult) {
    return (
      <div className="max-w-6xl mx-auto py-8 px-4">
        <ResultsReport
          result={finalResult}
          domainTitle={domainTitle}
          roleTitle={roleTitle}
          inProgressSessionId={session?.status === 'in_progress' ? session.sessionId : null}
          onResumeInProgress={() => setStep('assessment')}
          onRetake={handleRetake}
          onNavigateRoadmap={() => navigate('/student/roadmap')}
          onNavigateSkillGap={() => navigate('/student/skill-gap')}
        />
      </div>
    );
  }

  if (step === 'briefing') {
    return (
      <UnifiedAssessmentStart
        selectedMode={selectedMode}
        onSelectMode={setSelectedMode}
        domainTitle={domainTitle}
        roleTitle={roleTitle}
        onContinue={(accommodation) => {
          setPendingAccommodations(accommodation);
          if (selectedMode === 'secure') {
            setStep('consent');
          } else {
            startSession('practice', { accommodations: accommodation });
          }
        }}
      />
    );
  }

  if (step === 'consent') {
    return (
      <RulesConsent
        domainTitle={domainTitle}
        roleTitle={roleTitle}
        initialAccommodations={pendingAccommodations}
        isStarting={isInitializing}
        onBack={() => (latestCompletedResult ? setStep('results') : setStep('briefing'))}
        onConsentAndStart={(consentData) =>
          startSession('secure', {
            ...consentData,
            accommodations: { ...pendingAccommodations, ...consentData?.accommodations },
          })
        }
      />
    );
  }

  if (step === 'assessment' && session) {
    return <ActiveAssessmentEngine session={session} user={user || undefined} onComplete={handleAssessmentSubmitted} />;
  }

  return null;
};
