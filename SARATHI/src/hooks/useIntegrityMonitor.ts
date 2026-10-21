import { useEffect, useState, useRef, useCallback } from 'react';
import { AssessmentV2Service } from '../services/assessmentV2Service';
import type { UserProfile } from '../types/user';
import type { SessionRules } from '../types/assessmentV2';

interface UseIntegrityMonitorProps {
  sessionId?: string;
  rules?: SessionRules;
  user?: UserProfile;
  enabled?: boolean;
}

export function useIntegrityMonitor({
  sessionId,
  rules,
  user,
  enabled = true,
}: UseIntegrityMonitorProps) {
  const [warningCount, setWarningCount] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const awayTimerRef = useRef<number | null>(null);
  const eventQueueRef = useRef<Array<{ type: string; ts: string; meta: Record<string, any> }>>([]);

  const flushEvents = useCallback(async () => {
    if (!sessionId || !enabled || eventQueueRef.current.length === 0) return;
    const batch = [...eventQueueRef.current];
    eventQueueRef.current = [];
    try {
      await AssessmentV2Service.logIntegrityEvents(sessionId, batch, user);
    } catch {
      // Re-queue on unexpected transient failure
      eventQueueRef.current = [...batch, ...eventQueueRef.current].slice(-30);
    }
  }, [sessionId, enabled, user]);

  const queueEvent = useCallback((type: string, meta: Record<string, any> = {}) => {
    if (!sessionId || !enabled) return;
    eventQueueRef.current.push({
      type,
      ts: new Date().toISOString(),
      meta,
    });
    // If queue gets to 5 items, flush early
    if (eventQueueRef.current.length >= 5) {
      flushEvents();
    }
  }, [sessionId, enabled, flushEvents]);

  useEffect(() => {
    if (!enabled || !sessionId) return;

    // Periodic flush timer (every 5 seconds)
    const interval = setInterval(flushEvents, 5000);

    // 1. Visibility & Tab Focus Tracking
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        awayTimerRef.current = Date.now();
        queueEvent('visibility_hidden');
        setWarningCount(prev => {
          const next = prev + 1;
          if (next >= 2) setShowWarning(true);
          return next;
        });
      } else {
        const awaySec = awayTimerRef.current ? Math.round((Date.now() - awayTimerRef.current) / 1000) : 0;
        awayTimerRef.current = null;
        queueEvent('visibility_visible', { awaySec });
      }
    };

    const handleBlur = () => {
      if (rules?.blurTracking) {
        queueEvent('blur');
        flushEvents();
      }
    };

    const handleFocus = () => {
      if (rules?.blurTracking) {
        queueEvent('focus');
      }
    };

    // 2. Fullscreen Monitoring
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        queueEvent('fullscreen_exit');
      }
    };

    // 3. Paste Prevention if restricted
    const handlePaste = (e: ClipboardEvent) => {
      if (rules && !rules.pasteAllowed) {
        e.preventDefault();
        queueEvent('paste_blocked');
        setShowWarning(true);
      }
    };

    // 4. Network Offline Tracking
    const handleOffline = () => {
      setIsOffline(true);
      queueEvent('offline_start');
    };

    const handleOnline = () => {
      setIsOffline(false);
      queueEvent('offline_end');
      flushEvents();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('paste', handlePaste);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      clearInterval(interval);
      flushEvents();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('paste', handlePaste);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, [enabled, sessionId, rules, queueEvent, flushEvents]);

  const dismissWarning = useCallback(() => {
    setShowWarning(false);
  }, []);

  return {
    warningCount,
    showWarning,
    isOffline,
    dismissWarning,
    logEvent: queueEvent,
    flushEvents,
  };
}
