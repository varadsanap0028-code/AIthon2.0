import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import type { UserRole, UserProfile } from '../types/user';

interface UseGoogleSignInOptions {
  portalHint?: UserRole;
  rememberMe?: boolean;
  onSuccess?: (user: UserProfile) => void;
  onError?: (error: Error) => void;
}

export function useGoogleSignIn(options: UseGoogleSignInOptions = {}) {
  const { portalHint = 'student', rememberMe = true, onSuccess, onError } = options;
  const { loginWithGoogle, appMode } = useAuth();

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isGsiLoaded, setIsGsiLoaded] = useState<boolean>(false);
  const nonceRef = useRef<string | null>(null);

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
  const isConfigured = Boolean(clientId && clientId !== 'your-google-client-id-here');

  // Fetch short-lived cryptographic nonce from server for replay protection
  const fetchNonce = useCallback(async (): Promise<string | null> => {
    try {
      const res = await fetch('/api/auth/google/nonce');
      if (res.ok) {
        const data = await res.json();
        nonceRef.current = data.nonce;
        return data.nonce;
      }
    } catch {
      // Nonce fetch failure will fall back to server error
    }
    return null;
  }, []);

  // Load Google Identity Services script on auth pages only
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if ((window as any).google?.accounts?.id) {
      setIsGsiLoaded(true);
      return;
    }

    const scriptId = 'sarathi-google-gsi-script';
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => setIsGsiLoaded(true);
      script.onerror = () => {
        setIsGsiLoaded(false);
        setError('Failed to load Google Identity Services. Check your network or ad-blocker.');
      };
      document.body.appendChild(script);
    } else {
      setIsGsiLoaded(true);
    }
  }, []);

  // Handle credential response from Google Identity Services
  const handleCredentialResponse = useCallback(
    async (response: { credential?: string; select_by?: string }) => {
      if (!response?.credential) {
        setError('Google sign-in did not return a valid credential.');
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const user = await loginWithGoogle({
          credential: response.credential,
          portalHint,
          nonce: nonceRef.current || undefined,
          rememberMe,
        });
        onSuccess?.(user);
      } catch (err: any) {
        const msg = err.message || 'Google authentication failed';
        setError(msg);
        onError?.(err);
      } finally {
        setIsLoading(false);
        // Refresh nonce for next attempt
        fetchNonce();
      }
    },
    [loginWithGoogle, portalHint, rememberMe, onSuccess, onError, fetchNonce]
  );

  // Initialize GIS client once loaded and configured
  useEffect(() => {
    if (!isGsiLoaded || !isConfigured || typeof window === 'undefined') return;

    const google = (window as any).google;
    if (!google?.accounts?.id) return;

    // Fetch initial nonce and initialize
    fetchNonce().then((nonce) => {
      try {
        google.accounts.id.initialize({
          client_id: clientId,
          callback: handleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: true,
          nonce: nonce || undefined,
          context: 'signin',
        });
      } catch (e) {
        console.warn('[GoogleSignIn] GIS init warning:', e);
      }
    });
  }, [isGsiLoaded, isConfigured, clientId, handleCredentialResponse, fetchNonce]);

  // Render the official Google Sign-In button into a DOM container
  const renderGoogleButton = useCallback(
    (container: HTMLElement | null) => {
      if (!container || !isGsiLoaded || !isConfigured) return;
      const google = (window as any).google;
      if (!google?.accounts?.id) return;

      try {
        container.innerHTML = '';
        google.accounts.id.renderButton(container, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'rectangular',
          logo_alignment: 'left',
          width: container.clientWidth || 360,
        });
      } catch (err) {
        console.warn('[GoogleSignIn] Button rendering warning:', err);
      }
    },
    [isGsiLoaded, isConfigured]
  );

  // Fallback trigger if official button container is unavailable
  const triggerGoogleSignIn = useCallback(() => {
    setError(null);

    if (!isConfigured) {
      if (appMode === 'production') {
        setError('Google Sign-In is not configured in this environment. Please sign in with your email and password.');
      }
      return;
    }

    const google = (window as any).google;
    if (google?.accounts?.id) {
      google.accounts.id.prompt((notification: any) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          // Fallback or user dismissed
        }
      });
    } else {
      setError('Google Identity Services is still initializing. Please wait a moment.');
    }
  }, [isConfigured, appMode]);

  return {
    isLoading,
    error,
    isGsiLoaded,
    isConfigured,
    renderGoogleButton,
    triggerGoogleSignIn,
    clearError: () => setError(null),
  };
}
