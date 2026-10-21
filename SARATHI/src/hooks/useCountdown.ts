import { useState, useEffect, useRef, useCallback } from 'react';

interface UseCountdownOptions {
  expiresAt: string | null | undefined;
  onExpire?: () => void;
  enabled?: boolean;
}

export function useCountdown({ expiresAt, onExpire, enabled = true }: UseCountdownOptions) {
  const [targetTime, setTargetTime] = useState<string | null | undefined>(expiresAt);

  useEffect(() => {
    setTargetTime(expiresAt);
  }, [expiresAt]);

  const calculateRemaining = useCallback(() => {
    if (!targetTime) return 0;
    const diffMs = new Date(targetTime).getTime() - Date.now();
    return Math.max(0, Math.floor(diffMs / 1000));
  }, [targetTime]);

  const [secondsRemaining, setSecondsRemaining] = useState<number>(calculateRemaining);
  const onExpireCalledRef = useRef(false);

  useEffect(() => {
    if (!enabled || !targetTime) return;
    onExpireCalledRef.current = false;

    const tick = () => {
      const remaining = calculateRemaining();
      setSecondsRemaining(remaining);

      if (remaining <= 0 && !onExpireCalledRef.current) {
        onExpireCalledRef.current = true;
        onExpire?.();
      }
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [targetTime, enabled, onExpire, calculateRemaining]);

  const syncDeadline = useCallback((newDeadline: string) => {
    setTargetTime(newDeadline);
    const diffMs = new Date(newDeadline).getTime() - Date.now();
    setSecondsRemaining(Math.max(0, Math.floor(diffMs / 1000)));
  }, []);

  const hours = Math.floor(secondsRemaining / 3600);
  const minutes = Math.floor((secondsRemaining % 3600) / 60);
  const seconds = secondsRemaining % 60;

  const formattedTime = hours > 0
    ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    : `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const isLowTime = secondsRemaining > 0 && secondsRemaining <= 300; // < 5 mins

  return {
    secondsRemaining,
    formattedTime,
    isExpired: secondsRemaining <= 0,
    isLowTime,
    syncDeadline,
  };
}
