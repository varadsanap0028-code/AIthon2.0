import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useGoogleSignIn } from '../../hooks/useGoogleSignIn';
import type { UserRole, UserProfile } from '../../types/user';
import { Sparkles, CheckCircle2, X } from 'lucide-react';

interface GoogleLoginButtonProps {
  role?: UserRole;
  text?: string;
  rememberMe?: boolean;
  className?: string;
  onSuccess?: (user: UserProfile) => void;
  onError?: (error: Error) => void;
}

export const GoogleLoginButton: React.FC<GoogleLoginButtonProps> = ({
  role = 'student',
  text = 'Continue with Google',
  rememberMe = true,
  className = '',
  onSuccess,
  onError,
}) => {
  const { appMode, loginWithGoogle } = useAuth();
  const googleBtnContainerRef = useRef<HTMLDivElement>(null);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [demoEmail, setDemoEmail] = useState('');
  const [demoName, setDemoName] = useState('');
  const [demoLoading, setDemoLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const {
    isLoading,
    error: hookError,
    isGsiLoaded,
    isConfigured,
    renderGoogleButton,
    triggerGoogleSignIn,
  } = useGoogleSignIn({
    portalHint: role,
    rememberMe,
    onSuccess,
    onError,
  });

  // Render official Google GSI button when configured
  useEffect(() => {
    if (isConfigured && isGsiLoaded && googleBtnContainerRef.current) {
      renderGoogleButton(googleBtnContainerRef.current);
    }
  }, [isConfigured, isGsiLoaded, renderGoogleButton]);

  const handleButtonClick = () => {
    setLocalError(null);
    if (isConfigured) {
      triggerGoogleSignIn();
    } else if (appMode === 'demo') {
      setShowDemoModal(true);
    }
  };

  const handleDemoSubmit = async (e?: React.FormEvent, directEmail?: string, directName?: string) => {
    if (e) e.preventDefault();
    const emailToUse = directEmail || demoEmail.trim();
    const nameToUse = directName || demoName.trim() || emailToUse.split('@')[0];

    if (!emailToUse) {
      setLocalError('Please enter a valid email address.');
      return;
    }

    setDemoLoading(true);
    setLocalError(null);
    try {
      const user = await loginWithGoogle({
        email: emailToUse.includes('@') ? emailToUse : `${emailToUse}@gmail.com`,
        fullName: nameToUse,
        role,
        rememberMe,
      });
      setShowDemoModal(false);
      onSuccess?.(user);
    } catch (err: any) {
      setLocalError(err.message || 'Demo Google sign-in failed');
    } finally {
      setDemoLoading(false);
    }
  };

  const displayedError = localError || hookError;

  return (
    <div className={`space-y-2 w-full ${className}`}>
      {/* Official GIS Button Container (Used when client ID is configured) */}
      {isConfigured && (
        <div
          ref={googleBtnContainerRef}
          className="flex justify-center min-h-[44px] w-full"
        />
      )}

      {/* Styled Google Fallback / Action Button */}
      {(!isConfigured || !isGsiLoaded) && (
        <button
          type="button"
          onClick={handleButtonClick}
          disabled={isLoading || demoLoading || (!isConfigured && appMode === 'production')}
          className="w-full min-h-[44px] flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-800 font-semibold text-sm transition-all shadow-xs hover:shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#087BFA]"
        >
          {/* Official Google G SVG */}
          <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z" />
            <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z" />
            <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z" />
            <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
          </svg>
          <span>{isLoading || demoLoading ? 'Signing in with Google...' : text}</span>
        </button>
      )}

      {/* Production Notice when Google Client ID is not configured */}
      {!isConfigured && appMode === 'production' && (
        <p className="text-[11px] text-gray-500 text-center">
          Google Single Sign-On is not configured for this environment. Please sign in with your email.
        </p>
      )}

      {/* Error Message Alert */}
      {displayedError && (
        <div role="alert" className="p-2.5 rounded-lg bg-red-50 text-red-700 text-xs font-medium border border-red-200">
          {displayedError}
        </div>
      )}

      {/* Demo Account Modal (Active in Demo Mode Only) */}
      {showDemoModal && appMode === 'demo' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 border border-gray-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-gray-900 text-sm">Simulated Google SSO (Demo)</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowDemoModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-gray-600">
              Select a pre-seeded account or enter any test email to simulate Google Identity login:
            </p>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleDemoSubmit(undefined, 'alex.chen.dev@gmail.com', 'Alex Chen')}
                className="w-full flex items-center justify-between p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-left text-xs transition-colors cursor-pointer"
              >
                <div>
                  <span className="font-bold text-gray-900 block">Alex Chen (Student)</span>
                  <span className="text-gray-500 text-[11px]">alex.chen.dev@gmail.com</span>
                </div>
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
              </button>

              <button
                type="button"
                onClick={() => handleDemoSubmit(undefined, 'priya.sharma.tech@gmail.com', 'Priya Sharma')}
                className="w-full flex items-center justify-between p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-left text-xs transition-colors cursor-pointer"
              >
                <div>
                  <span className="font-bold text-gray-900 block">Priya Sharma (Student)</span>
                  <span className="text-gray-500 text-[11px]">priya.sharma.tech@gmail.com</span>
                </div>
                <CheckCircle2 className="w-4 h-4 text-purple-600" />
              </button>
            </div>

            <form onSubmit={handleDemoSubmit} className="pt-2 border-t border-gray-100 space-y-2">
              <input
                type="text"
                placeholder="display name (optional)..."
                value={demoName}
                onChange={(e) => setDemoName(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="or custom Google email..."
                value={demoEmail}
                onChange={(e) => setDemoEmail(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={demoLoading}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                {demoLoading ? 'Signing in...' : 'Sign in with Custom Email'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
