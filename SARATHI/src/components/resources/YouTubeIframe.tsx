import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ExternalLink, AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '../common/Button';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: (() => void) | undefined;
  }
}

interface YouTubeIframeProps {
  videoId: string;
  initialSeconds?: number;
  onPlay?: () => void;
  onPause?: (seconds: number) => void;
  onEnded?: () => void;
  onTimeUpdate?: (seconds: number, percent: number) => void;
  onNearEnd?: () => void;
  title: string;
}

export const YouTubeIframe: React.FC<YouTubeIframeProps> = ({
  videoId,
  initialSeconds = 0,
  onPlay,
  onPause,
  onEnded,
  onTimeUpdate,
  onNearEnd,
  title,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const nearEndFiredRef = useRef<boolean>(false);

  const [hasError, setHasError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const initPlayer = useCallback(() => {
    if (!window.YT || !window.YT.Player || !containerRef.current) return;

    try {
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }

      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId,
        host: 'https://www.youtube-nocookie.com',
        playerVars: {
          autoplay: 1,
          start: Math.max(0, Math.floor(initialSeconds)),
          playsinline: 1,
          rel: 0,
          modestbranding: 1,
          enablejsapi: 1,
        },
        events: {
          onReady: () => {
            setIsLoading(false);
            setHasError(false);
          },
          onStateChange: (event: any) => {
            const state = event.data;
            if (state === window.YT.PlayerState.PLAYING) {
              onPlay?.();
              clearTimer();
              timerRef.current = setInterval(() => {
                if (playerRef.current?.getCurrentTime) {
                  const current = playerRef.current.getCurrentTime();
                  const duration = playerRef.current.getDuration() || 1;
                  const pct = Math.min(100, (current / duration) * 100);
                  onTimeUpdate?.(current, pct);

                  if (pct >= 90 && !nearEndFiredRef.current) {
                    nearEndFiredRef.current = true;
                    onNearEnd?.();
                  }
                }
              }, 1000);
            } else if (state === window.YT.PlayerState.PAUSED) {
              clearTimer();
              const current = playerRef.current?.getCurrentTime ? playerRef.current.getCurrentTime() : initialSeconds;
              onPause?.(current);
            } else if (state === window.YT.PlayerState.ENDED) {
              clearTimer();
              onEnded?.();
            }
          },
          onError: (event: any) => {
            clearTimer();
            setIsLoading(false);
            setHasError(true);
            const code = event.data;
            if (code === 101 || code === 150) {
              setErrorMessage('The video owner has restricted in-app playback for this content.');
            } else if (code === 100) {
              setErrorMessage('The requested video was not found or has been removed.');
            } else {
              setErrorMessage('Playback could not be loaded. This may be caused by network blocking or ad-blockers.');
            }
          },
        },
      });
    } catch (err: any) {
      setHasError(true);
      setErrorMessage(err?.message || 'Failed to initialize YouTube video player.');
      setIsLoading(false);
    }
  }, [videoId, initialSeconds, onPlay, onPause, onEnded, onTimeUpdate, onNearEnd, clearTimer]);

  useEffect(() => {
    nearEndFiredRef.current = false;
    let isMounted = true;

    if (!window.YT) {
      const existingScript = document.querySelector('script[src*="youtube.com/iframe_api"]');
      if (!existingScript) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        tag.async = true;
        tag.onerror = () => {
          if (isMounted) {
            setHasError(true);
            setErrorMessage('Unable to load YouTube player script. Please check your network connection.');
            setIsLoading(false);
          }
        };
        document.head.appendChild(tag);
      }

      const prevReady = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        prevReady?.();
        if (isMounted) initPlayer();
      };
    } else {
      initPlayer();
    }

    return () => {
      isMounted = false;
      clearTimer();
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch {}
        playerRef.current = null;
      }
    };
  }, [videoId, initPlayer, clearTimer]);

  const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;

  if (hasError) {
    return (
      <div className="w-full aspect-video bg-slate-900 border border-slate-800 rounded-xl flex flex-col items-center justify-center p-6 text-center text-slate-300">
        <AlertTriangle className="w-12 h-12 text-amber-400 mb-3" />
        <h3 className="text-base font-semibold text-white mb-1">Embedded Playback Unavailable</h3>
        <p className="text-xs text-slate-400 max-w-md mb-4">{errorMessage}</p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setHasError(false);
              setIsLoading(true);
              initPlayer();
            }}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry
          </Button>
          <a
            href={youtubeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-medium transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Open on YouTube
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl border border-slate-800">
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 text-slate-400 z-10">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-2" />
          <p className="text-xs font-medium text-slate-300">Loading {title}...</p>
        </div>
      )}
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
};
