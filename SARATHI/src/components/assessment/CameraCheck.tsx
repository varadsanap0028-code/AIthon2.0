import React, { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, CheckCircle2, RefreshCw, AlertTriangle, ShieldCheck } from 'lucide-react';

interface CameraCheckProps {
  enabled?: boolean;
  variant?: 'compact' | 'readiness';
  onStatusChange?: (status: { isReady: boolean; hasError: boolean }) => void;
}

export const CameraCheck: React.FC<CameraCheckProps> = ({
  enabled = true,
  variant = 'compact',
  onStatusChange,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [streamActive, setStreamActive] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);

  const initCamera = async () => {
    if (!enabled) return;
    setIsLoading(true);
    setPermissionError(null);

    // Stop any existing tracks first
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Webcam media API is not supported in this browser environment.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, frameRate: 15 },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setStreamActive(true);
      setPermissionError(null);
      onStatusChange?.({ isReady: true, hasError: false });
    } catch (err: any) {
      setStreamActive(false);
      setPermissionError(err.message || 'Camera access unavailable or denied');
      onStatusChange?.({ isReady: false, hasError: true });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    initCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [enabled]);

  // If in readiness variant
  if (variant === 'readiness') {
    return (
      <div className="p-4 rounded-2xl border border-[#E0E7F2] bg-[#F4F7FC] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-[#4F46E5]" />
            <span className="text-xs font-bold text-[#0B1B43]">
              Workstation Camera Readiness Check
            </span>
          </div>
          {streamActive ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#F0FDF4] text-[#16A34A] text-[11px] font-bold border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" />
              Camera Ready
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#F4F7FC] text-[#405B8B] text-[11px] font-semibold border border-[#E0E7F2]">
              {permissionError ? 'Optional Check' : 'Verifying...'}
            </span>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="relative w-44 h-28 shrink-0 rounded-xl overflow-hidden border border-[#E0E7F2] bg-slate-900 shadow-inner flex items-center justify-center">
            {streamActive ? (
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover transform -scale-x-100"
              />
            ) : (
              <div className="p-3 text-center text-slate-400 text-[11px] flex flex-col items-center">
                {isLoading ? (
                  <>
                    <RefreshCw className="w-5 h-5 text-indigo-400 animate-spin mb-1" />
                    <span>Connecting camera...</span>
                  </>
                ) : permissionError ? (
                  <>
                    <CameraOff className="w-5 h-5 text-slate-400 mb-1" />
                    <span className="text-[10px] text-slate-400 leading-tight">Camera not detected or permission denied</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-5 h-5 text-slate-400 mb-1" />
                    <span>Standby</span>
                  </>
                )}
              </div>
            )}
            {streamActive && (
              <div className="absolute top-1.5 left-1.5 flex items-center space-x-1 px-1.5 py-0.5 rounded bg-black/75 text-[9px] text-emerald-400 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Live Mirror</span>
              </div>
            )}
          </div>

          <div className="text-xs text-[#405B8B] space-y-2 flex-1">
            <p>
              Your camera preview confirms your testing workspace. <strong>Privacy Guarantee:</strong> Video is processed locally in your browser and is <strong>never recorded, stored, or transmitted</strong> to any server.
            </p>
            {permissionError && (
              <div className="flex items-start gap-1.5 text-[11px] text-[#D97706] bg-[#FFFBEB] p-2 rounded-lg border border-amber-200">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>Webcam not detected. You can still take the verified assessment; environment focus monitoring will be active.</span>
              </div>
            )}
            <div>
              <button
                type="button"
                onClick={initCamera}
                disabled={isLoading}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-lg border border-[#E0E7F2] bg-white text-[11px] font-semibold text-[#405B8B] hover:bg-[#F4F7FC] transition cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                <span>{streamActive ? 'Re-test Camera' : 'Retry Camera Connection'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Compact variant for Active Assessment Engine
  if (!enabled) {
    return (
      <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-[#F4F7FC] text-[11px] text-[#405B8B] font-medium border border-[#E0E7F2]">
        <CameraOff className="w-3.5 h-3.5 text-slate-400" />
        <span>Privacy Mode (Camera Disabled)</span>
      </div>
    );
  }

  return (
    <div className="relative w-36 h-24 rounded-xl overflow-hidden border-2 border-indigo-500 shadow-md bg-black">
      {streamActive ? (
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover transform -scale-x-100"
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center text-[10px] text-slate-400">
          <Camera className="w-4 h-4 mb-1 text-slate-500 animate-pulse" />
          <span>{permissionError ? 'Cam Optional' : 'Connecting...'}</span>
        </div>
      )}
      <div className="absolute top-1 left-1 flex items-center space-x-1 px-1.5 py-0.5 rounded bg-black/70 text-[9px] text-emerald-400">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span>Local</span>
      </div>
    </div>
  );
};
