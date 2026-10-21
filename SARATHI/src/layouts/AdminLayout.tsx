import React, { useState, useEffect, useCallback } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  BarChart3,
  Sparkles,
  Users,
  Building2,
  ShieldCheck,
  BookOpen,
  HelpCircle,
  Megaphone,
  Activity,
  ScrollText,
  Settings,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  LogOut,
  Search,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { adminApi } from '../services/adminApi';
import type { NavBadgesResponse } from '../services/adminApi';
import { AdminCopilotSlideOver } from '../components/admin/AdminCopilotSlideOver';
import { CommandPalette } from '../components/admin/CommandPalette';

interface NavSection {
  title: string;
  items: {
    label: string;
    path: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    badgeKey?: keyof NavBadgesResponse;
  }[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', path: '/admin', icon: LayoutDashboard },
      { label: 'Insights', path: '/admin/insights', icon: BarChart3 },
      { label: 'Copilot', path: '/admin/copilot', icon: Sparkles },
    ],
  },
  {
    title: 'People & Approvals',
    items: [
      { label: 'Users', path: '/admin/users', icon: Users },
      { label: 'Recruiter Approvals', path: '/admin/approvals', icon: Building2, badgeKey: 'pendingApprovals' },
      { label: 'Test Integrity', path: '/admin/integrity', icon: ShieldCheck, badgeKey: 'flaggedSessions' },
    ],
  },
  {
    title: 'Content',
    items: [
      { label: 'Skills & Resources', path: '/admin/content', icon: BookOpen },
    ],
  },
  {
    title: 'Help',
    items: [
      { label: 'Support', path: '/admin/support', icon: HelpCircle, badgeKey: 'openTickets' },
      { label: 'Announcements', path: '/admin/announcements', icon: Megaphone },
    ],
  },
  {
    title: 'Platform',
    items: [
      { label: 'System', path: '/admin/system', icon: Activity },
      { label: 'Audit Log', path: '/admin/audit', icon: ScrollText },
      { label: 'Settings', path: '/admin/settings', icon: Settings },
    ],
  },
];

export const AdminLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Sidebar collapse state persisted in localStorage
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('sarathi_admin_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const [mobileOpen, setMobileOpen] = useState<boolean>(false);
  const [badges, setBadges] = useState<NavBadgesResponse>({
    pendingApprovals: 0,
    flaggedSessions: 0,
    openTickets: 0,
  });

  const toggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('sarathi_admin_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  // Poll badges every 60s, paused when tab is hidden
  const fetchBadges = useCallback(async () => {
    if (document.visibilityState === 'hidden') return;
    try {
      const data = await adminApi.getNavBadges();
      setBadges(data);
    } catch {
      // Non-fatal badge update
    }
  }, []);

  useEffect(() => {
    fetchBadges();
    const interval = setInterval(fetchBadges, 60000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchBadges();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [fetchBadges]);

  // Close mobile sidebar on navigation
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const getActiveTitle = (): string => {
    for (const section of NAV_SECTIONS) {
      for (const item of section.items) {
        if (item.path === location.pathname) {
          return item.label;
        }
      }
    }
    if (location.pathname.startsWith('/admin')) {
      return 'Platform Administration';
    }
    return 'SARATHI Admin';
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col antialiased text-[#111827]">
      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden transition-opacity"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 bg-[#FFFFFF] border-r border-[#E5E7EB] flex flex-col justify-between transition-all duration-150 ease-in-out lg:static lg:z-auto ${
            collapsed ? 'lg:w-[64px]' : 'lg:w-[220px]'
          } ${mobileOpen ? 'w-[240px] translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
        >
          {/* Top Brand Header */}
          <div>
            <div className="h-[56px] border-b border-[#E5E7EB] px-4 flex items-center justify-between">
              <div className="flex items-center gap-2 overflow-hidden">
                <div className="w-8 h-8 rounded-[6px] bg-[#4F46E5] flex items-center justify-center text-white shrink-0 font-bold text-sm">
                  S
                </div>
                {!collapsed && (
                  <div className="truncate">
                    <span className="font-semibold text-[14px] text-[#111827] block tracking-tight">SARATHI</span>
                    <span className="text-[11px] text-[#6B7280] block -mt-1 font-mono uppercase tracking-wider">Admin</span>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="lg:hidden text-[#6B7280] hover:text-[#111827] p-1"
                aria-label="Close navigation"
              >
                <X size={18} />
              </button>
            </div>

            {/* Navigation Links */}
            <nav className="p-3 space-y-5 overflow-y-auto max-h-[calc(100vh-120px)]" aria-label="Admin Navigation">
              {NAV_SECTIONS.map((section) => (
                <div key={section.title} className="space-y-1">
                  {!collapsed && (
                    <h3 className="px-3 text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider mb-1">
                      {section.title}
                    </h3>
                  )}
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const count = item.badgeKey ? badges[item.badgeKey] : 0;
                    const isExact = item.path === '/admin' ? location.pathname === '/admin' : location.pathname.startsWith(item.path);

                    return (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        end={item.path === '/admin'}
                        title={collapsed ? item.label : undefined}
                        className={({ isActive }) =>
                          `flex items-center gap-2.5 px-3 py-2 rounded-[6px] text-[13px] font-medium transition-colors ${
                            isActive || isExact
                              ? 'bg-[#EEF2FF] text-[#4F46E5] font-semibold'
                              : 'text-[#4B5563] hover:text-[#111827] hover:bg-[#F9FAFB]'
                          } ${collapsed ? 'justify-center px-2' : ''}`
                        }
                      >
                        <Icon size={16} className="shrink-0" />
                        {!collapsed && <span className="truncate flex-1">{item.label}</span>}
                        {!collapsed && count > 0 && (
                          <span className="ml-auto text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-[#DC2626] text-white leading-none">
                            {count}
                          </span>
                        )}
                        {collapsed && count > 0 && (
                          <span
                            aria-label={`${count} pending`}
                            className="w-2 h-2 rounded-full bg-[#DC2626] absolute top-1.5 right-1.5"
                          />
                        )}
                      </NavLink>
                    );
                  })}
                </div>
              ))}
            </nav>
          </div>

          {/* Bottom Sidebar Collapse Toggle (Desktop) */}
          <div className="border-t border-[#E5E7EB] p-2 hidden lg:flex items-center justify-end">
            <button
              type="button"
              onClick={toggleCollapse}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="w-full py-1.5 px-2 text-[#6B7280] hover:text-[#111827] hover:bg-[#F9FAFB] rounded-[6px] flex items-center justify-center transition-colors text-[12px]"
            >
              {collapsed ? <ChevronRight size={16} /> : <div className="flex items-center gap-1.5 w-full"><ChevronLeft size={16} /><span>Collapse</span></div>}
            </button>
          </div>
        </aside>

        {/* Right Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {/* Top Bar */}
          <header className="h-[56px] bg-[#FFFFFF] border-b border-[#E5E7EB] px-6 flex items-center justify-between sticky top-0 z-20">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="lg:hidden text-[#4B5563] hover:text-[#111827] p-1 -ml-1"
                aria-label="Open sidebar"
              >
                <Menu size={20} />
              </button>
              <div className="flex items-center gap-2 text-[14px]">
                <span className="text-[#6B7280]">Admin</span>
                <span className="text-[#9CA3AF]">/</span>
                <span className="font-semibold text-[#111827]">{getActiveTitle()}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
                }}
                className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-medium border border-slate-200 transition"
                title="Search or Jump to... (Ctrl+K)"
              >
                <Search size={14} className="text-slate-500" />
                <span>Search / Jump...</span>
                <kbd className="font-mono text-[10px] bg-white px-1.5 py-0.5 rounded border border-slate-300 text-slate-500 shadow-2xs">
                  Ctrl+K
                </kbd>
              </button>

              <div className="flex items-center gap-2.5 text-right hidden sm:flex">
                <div>
                  <span className="block text-[13px] font-semibold text-[#111827] leading-tight">
                    {user?.fullName || 'Platform Administrator'}
                  </span>
                  <span className="block text-[11px] text-[#6B7280] leading-tight">
                    {user?.email || 'admin@sarathi.dev'}
                  </span>
                </div>
                <div className="w-8 h-8 rounded-full bg-[#EEF2FF] border border-[#C7D2FE] flex items-center justify-center text-[#4F46E5] font-semibold text-[13px]">
                  {user?.fullName?.charAt(0) || 'A'}
                </div>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                aria-label="Sign out of Admin Portal"
                className="inline-flex items-center gap-1.5 text-[13px] text-[#DC2626] hover:text-[#B91C1C] px-2.5 py-1.5 rounded-[6px] border border-transparent hover:border-[#FEE2E2] hover:bg-[#FEF2F2] transition-colors"
                title="Log Out"
              >
                <LogOut size={15} />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </header>

          {/* Main Workspace Container */}
          <main className="flex-1 p-6 max-w-[1200px] w-full mx-auto">
            <Outlet />
          </main>
        </div>
      </div>

      {/* Global Quick Copilot Slide-over (Ctrl+J) */}
      <AdminCopilotSlideOver />

      {/* Global Command Palette (Ctrl+K) */}
      <CommandPalette />
    </div>
  );
};

export default AdminLayout;
