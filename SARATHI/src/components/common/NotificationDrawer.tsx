import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Bell, CheckCheck, ExternalLink, Info, CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';
import { apiClient } from '../../services/apiClient';

export interface NotificationItem {
  id: string;
  userId: string;
  type: 'info' | 'success' | 'warning' | 'alert';
  title: string;
  body: string;
  link?: string | null;
  isRead: boolean;
  createdAt: string;
}

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onUnreadCountChange?: (count: number) => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  onUnreadCountChange,
}) => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get<{
        success: boolean;
        data: NotificationItem[];
        unreadCount: number;
      }>('/api/notifications');

      if (res?.data) {
        setNotifications(res.data);
        setUnreadCount(res.unreadCount || 0);
        if (onUnreadCountChange) onUnreadCountChange(res.unreadCount || 0);
      }
    } catch (err) {
      console.warn('Failed to fetch notifications:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  const handleMarkAsRead = async (id: string, link?: string | null) => {
    try {
      await apiClient.patch(`/api/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => {
        const next = Math.max(0, prev - 1);
        if (onUnreadCountChange) onUnreadCountChange(next);
        return next;
      });

      if (link) {
        onClose();
        if (link.startsWith('http')) {
          window.open(link, '_blank');
        } else {
          navigate(link);
        }
      }
    } catch (err) {
      console.warn('Failed to mark notification read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await apiClient.post('/api/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      if (onUnreadCountChange) onUnreadCountChange(0);
    } catch (err) {
      console.warn('Failed to mark all notifications read:', err);
    }
  };

  if (!isOpen) return null;

  const filteredNotifications = notifications.filter((n) =>
    filter === 'unread' ? !n.isRead : true
  );

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />;
      case 'alert':
        return <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />;
      default:
        return <Info className="w-4 h-4 text-[#087BFA] flex-shrink-0" />;
    }
  };

  const formatRelativeTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const diffMs = Date.now() - date.getTime();
      const diffMinutes = Math.floor(diffMs / 60000);
      if (diffMinutes < 1) return 'Just now';
      if (diffMinutes < 60) return `${diffMinutes}m ago`;
      const diffHours = Math.floor(diffMinutes / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    } catch {
      return '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-5 border-b border-[#E0E7F2] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#087BFA] flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-extrabold text-[#0B1B43] text-base">Notifications</h2>
              <p className="text-xs text-[#405B8B]">
                {unreadCount > 0 ? `${unreadCount} unread update(s)` : 'All caught up'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#405B8B] hover:text-[#0B1B43] hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Bar & Action */}
        <div className="px-5 py-3 border-b border-[#E0E7F2] bg-[#F4F7FC]/70 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                filter === 'all'
                  ? 'bg-white text-[#0B1B43] shadow-sm'
                  : 'text-[#405B8B] hover:text-[#0B1B43]'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                filter === 'unread'
                  ? 'bg-white text-[#0B1B43] shadow-sm'
                  : 'text-[#405B8B] hover:text-[#0B1B43]'
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="text-xs font-semibold text-[#087BFA] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark all read</span>
            </button>
          )}
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {isLoading && notifications.length === 0 ? (
            <div className="space-y-3 animate-pulse">
              <div className="h-20 bg-slate-100 rounded-xl" />
              <div className="h-20 bg-slate-100 rounded-xl" />
              <div className="h-20 bg-slate-100 rounded-xl" />
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-[#405B8B]">
                <Bell className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-[#0B1B43]">No notifications</p>
              <p className="text-xs text-[#405B8B]">
                {filter === 'unread'
                  ? 'You have read all your notifications.'
                  : 'New announcements and career updates will appear here.'}
              </p>
            </div>
          ) : (
            filteredNotifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => handleMarkAsRead(notif.id, notif.link)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  notif.isRead
                    ? 'bg-white border-[#E0E7F2] text-slate-700 opacity-80 hover:opacity-100'
                    : 'bg-blue-50/50 border-blue-200 shadow-xs hover:border-[#087BFA]'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5">{getTypeIcon(notif.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3
                        className={`text-xs font-bold leading-tight truncate ${
                          notif.isRead ? 'text-[#0B1B43]' : 'text-[#087BFA]'
                        }`}
                      >
                        {notif.title}
                      </h3>
                      <span className="text-[10px] text-[#405B8B] whitespace-nowrap">
                        {formatRelativeTime(notif.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-[#405B8B] mt-1 leading-relaxed">
                      {notif.body}
                    </p>
                    {notif.link && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#087BFA] mt-2 hover:underline">
                        <span>View details</span>
                        <ExternalLink className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
