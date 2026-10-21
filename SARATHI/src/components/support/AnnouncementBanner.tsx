import React, { useState, useEffect } from 'react';
import { Info, AlertTriangle, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { request } from '../../services/apiClient';

interface Announcement {
  id: string;
  title: string;
  body: string;
  severity: 'info' | 'warning' | 'critical' | 'success';
}

const SEVERITY_STYLES: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
  info: { bg: 'bg-blue-600 text-white', text: 'text-blue-100', icon: <Info className="w-4 h-4 text-white" /> },
  warning: { bg: 'bg-amber-500 text-white', text: 'text-amber-100', icon: <AlertTriangle className="w-4 h-4 text-white" /> },
  critical: { bg: 'bg-red-600 text-white', text: 'text-red-100', icon: <AlertCircle className="w-4 h-4 text-white" /> },
  success: { bg: 'bg-emerald-600 text-white', text: 'text-emerald-100', icon: <CheckCircle2 className="w-4 h-4 text-white" /> },
};

export const AnnouncementBanner: React.FC = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  useEffect(() => {
    let active = true;
    request<{ announcements: Announcement[] }>('/api/announcements/active')
      .then((res) => {
        if (active && res?.announcements) {
          setAnnouncements(res.announcements);
        }
      })
      .catch(() => {
        // Silently ignore if not logged in or endpoint unavailable
      });

    return () => {
      active = false;
    };
  }, []);

  const handleDismiss = async (id: string) => {
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    try {
      await request(`/api/announcements/${encodeURIComponent(id)}/dismiss`, {
        method: 'POST',
      });
    } catch {}
  };

  if (announcements.length === 0) return null;

  return (
    <div className="space-y-1 w-full z-40">
      {announcements.map((ann) => {
        const conf = SEVERITY_STYLES[ann.severity] || SEVERITY_STYLES.info;
        return (
          <div
            key={ann.id}
            className={`px-4 py-2.5 flex items-center justify-between shadow-xs transition-all ${conf.bg}`}
          >
            <div className="flex items-center gap-2.5 text-xs max-w-4xl">
              <span className="shrink-0">{conf.icon}</span>
              <span className="font-bold">{ann.title}:</span>
              <span className="line-clamp-1">{ann.body}</span>
            </div>
            <button
              onClick={() => handleDismiss(ann.id)}
              className="p-1 hover:opacity-80 rounded-full text-white/90 transition"
              title="Dismiss announcement"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default AnnouncementBanner;
