import React from 'react';
import { AlertCircle, WifiOff, X, ShieldAlert } from 'lucide-react';

interface IntegrityBannerProps {
  showWarning: boolean;
  isOffline: boolean;
  onDismissWarning: () => void;
  actionBlockedNotice?: string | null;
  onDismissActionNotice?: () => void;
}

export const IntegrityBanner: React.FC<IntegrityBannerProps> = ({
  showWarning,
  isOffline,
  onDismissWarning,
  actionBlockedNotice,
  onDismissActionNotice,
}) => {
  if (!showWarning && !isOffline && !actionBlockedNotice) return null;

  return (
    <div className="fixed top-16 left-0 right-0 z-40 px-4 py-2 flex flex-col items-center space-y-2 pointer-events-none">
      {actionBlockedNotice && (
        <div className="pointer-events-auto max-w-lg w-full flex items-center justify-between p-3.5 rounded-xl bg-rose-600 text-white shadow-xl text-xs animate-in slide-in-from-top-2 border border-rose-500">
          <div className="flex items-center space-x-2.5">
            <ShieldAlert className="w-4 h-4 shrink-0 text-white" />
            <span className="font-semibold">{actionBlockedNotice}</span>
          </div>
          {onDismissActionNotice && (
            <button
              onClick={onDismissActionNotice}
              className="p-1 rounded-lg hover:bg-rose-700 text-rose-200 hover:text-white transition-colors ml-3 shrink-0"
              aria-label="Dismiss notice"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {isOffline && (
        <div className="pointer-events-auto max-w-lg w-full flex items-center justify-between p-3 rounded-xl bg-amber-500 text-white shadow-lg text-xs animate-in slide-in-from-top-2">
          <div className="flex items-center space-x-2">
            <WifiOff className="w-4 h-4 shrink-0" />
            <span>Connection paused. Your progress is saved locally and will sync once reconnected.</span>
          </div>
        </div>
      )}

      {showWarning && !isOffline && (
        <div className="pointer-events-auto max-w-xl w-full flex items-center justify-between p-3.5 rounded-xl bg-slate-900/95 text-white shadow-xl backdrop-blur-md border border-slate-700 text-xs">
          <div className="flex items-start space-x-2.5">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-amber-300">Assessment Environment Notice</span>
              <p className="text-slate-300 mt-0.5 leading-relaxed">
                We noticed you navigated away from this tab. For your results to qualify for verified diagnostic status, please stay within the assessment window.
              </p>
            </div>
          </div>
          <button
            onClick={onDismissWarning}
            className="p-1 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors ml-3 shrink-0"
            aria-label="Dismiss warning"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
