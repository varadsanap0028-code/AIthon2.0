import React from 'react';

interface LoadingFeedbackProps {
  message?: string;
}

export const AssessmentShellLoading: React.FC<LoadingFeedbackProps> = ({
  message = 'Loading your authoritative assessment records',
}) => (
  <div className="max-w-md mx-auto my-20 p-8 bg-white rounded-2xl border border-[#E0E7F2] text-center shadow-[var(--shadow-card)]">
    <div className="w-9 h-9 border-[3px] border-[#4F46E5] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
    <h3 className="text-sm font-bold text-[#0B1B43] mb-1">Checking Assessment Status...</h3>
    <p className="text-xs text-[#405B8B]">{message}</p>
  </div>
);

interface ErrorFeedbackProps {
  errorType: 'auth_expired' | 'network' | 'not_found' | 'general' | null;
  initError: string;
  onSignInAgain: () => void;
  onRetry: () => void;
  onStartNew: () => void;
}

export const AssessmentShellError: React.FC<ErrorFeedbackProps> = ({
  errorType,
  initError,
  onSignInAgain,
  onRetry,
  onStartNew,
}) => (
  <div className="max-w-md mx-auto my-20 p-8 bg-white rounded-2xl border border-rose-200 text-center shadow-[var(--shadow-card)]">
    <h3 className="text-sm font-bold text-[#DC2626] mb-1">
      {errorType === 'auth_expired'
        ? 'Authentication Required'
        : errorType === 'not_found'
        ? 'Attempt Not Found'
        : 'Assessment Records Unavailable'}
    </h3>
    <p className="text-xs text-[#405B8B] mb-4">{initError}</p>
    <div className="flex items-center justify-center gap-3">
      {errorType === 'auth_expired' ? (
        <button
          onClick={onSignInAgain}
          className="px-4 py-2 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-bold transition cursor-pointer"
        >
          Sign In Again
        </button>
      ) : (
        <>
          <button
            onClick={onRetry}
            className="px-4 py-2 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-bold transition cursor-pointer"
          >
            Retry Loading
          </button>
          <button
            onClick={onStartNew}
            className="px-4 py-2 rounded-xl bg-[#F4F7FC] hover:bg-[#E0E7F2] text-[#0B1B43] text-xs font-bold transition cursor-pointer border border-[#E0E7F2]"
          >
            Start New Assessment
          </button>
        </>
      )}
    </div>
  </div>
);
