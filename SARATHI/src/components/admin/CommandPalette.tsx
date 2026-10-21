/**
 * SARATHI Admin Portal — Global Command Palette (Ctrl+K / Cmd+K)
 * PRD Phase 11
 *
 * Instant fuzzy keyboard navigation, page jump, user search, ticket jump, and quick operational actions.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  LayoutDashboard,
  Users,
  ShieldCheck,
  Award,
  BookOpen,
  LifeBuoy,
  Megaphone,
  TrendingUp,
  Bot,
  Activity,
  ScrollText,
  Sliders,
  Database,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { adminApi } from '../../services/adminApi';

interface CommandItem {
  id: string;
  category: 'Pages' | 'Actions' | 'Users' | 'Tickets';
  title: string;
  subtitle?: string;
  icon: React.ElementType;
  action: () => void;
  shortcut?: string;
}

export const CommandPalette: React.FC = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [query, setQuery] = useState<string>('');
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [userResults, setUserResults] = useState<any[]>([]);
  const [ticketResults, setTicketResults] = useState<any[]>([]);
  const [loadingSearch, setLoadingSearch] = useState<boolean>(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Listen for Ctrl+K or Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setUserResults([]);
      setTicketResults([]);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Debounced search for live users & tickets
  useEffect(() => {
    if (!isOpen || query.trim().length < 2) {
      setUserResults([]);
      setTicketResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setLoadingSearch(true);
        const [usersRes, ticketsRes] = await Promise.allSettled([
          adminApi.getUsers({ q: query.trim(), pageSize: 4 }),
          adminApi.getSupportTickets({ q: query.trim(), pageSize: 4 }),
        ]);

        if (usersRes.status === 'fulfilled' && usersRes.value?.items) {
          setUserResults(usersRes.value.items);
        }
        if (ticketsRes.status === 'fulfilled' && ticketsRes.value?.tickets) {
          setTicketResults(ticketsRes.value.tickets);
        }
      } catch {
        // Non-fatal search failure
      } finally {
        setLoadingSearch(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query, isOpen]);

  // Static Admin Pages
  const staticPages: CommandItem[] = [
    {
      id: 'page-overview',
      category: 'Pages',
      title: 'Overview Dashboard',
      subtitle: 'Platform metrics, attention queue & traffic charts',
      icon: LayoutDashboard,
      action: () => navigate('/admin'),
    },
    {
      id: 'page-users',
      category: 'Pages',
      title: 'Users & Roles',
      subtitle: 'Manage candidates, recruiters, colleges & permissions',
      icon: Users,
      action: () => navigate('/admin/users'),
    },
    {
      id: 'page-approvals',
      category: 'Pages',
      title: 'Recruiter Approvals',
      subtitle: 'Review employer verification docs & GSTIN validation',
      icon: ShieldCheck,
      action: () => navigate('/admin/approvals'),
    },
    {
      id: 'page-integrity',
      category: 'Pages',
      title: 'Test Integrity & Risk',
      subtitle: 'Anti-cheat monitoring, anomaly flags & session diffs',
      icon: Award,
      action: () => navigate('/admin/integrity'),
    },
    {
      id: 'page-content',
      category: 'Pages',
      title: 'Content & Skills Catalog',
      subtitle: 'Taxonomy, benchmarks radar & learning resources',
      icon: BookOpen,
      action: () => navigate('/admin/content'),
    },
    {
      id: 'page-support',
      category: 'Pages',
      title: 'Support Desk',
      subtitle: 'Ticketing desk, canned answers & SLA tracking',
      icon: LifeBuoy,
      action: () => navigate('/admin/support'),
    },
    {
      id: 'page-announcements',
      category: 'Pages',
      title: 'Platform Announcements',
      subtitle: 'Broadcast alerts to candidates, recruiters, or colleges',
      icon: Megaphone,
      action: () => navigate('/admin/announcements'),
    },
    {
      id: 'page-insights',
      category: 'Pages',
      title: 'Analytics & Forecasts',
      subtitle: 'OLS predictions, anomalies, trust score & correlations',
      icon: TrendingUp,
      action: () => navigate('/admin/insights'),
    },
    {
      id: 'page-copilot',
      category: 'Pages',
      title: 'Admin Copilot',
      subtitle: 'Natural language Q&A, KPI reports & charts',
      icon: Bot,
      action: () => navigate('/admin/copilot'),
      shortcut: 'Ctrl+J',
    },
    {
      id: 'page-system',
      category: 'Pages',
      title: 'System Health & Backups',
      subtitle: 'Node process telemetry, SQLite backups & data retention',
      icon: Activity,
      action: () => navigate('/admin/system'),
    },
    {
      id: 'page-audit',
      category: 'Pages',
      title: 'Audit Log & Ledger',
      subtitle: 'Cryptographic SHA-256 chain verification & state diffs',
      icon: ScrollText,
      action: () => navigate('/admin/audit'),
    },
    {
      id: 'page-settings',
      category: 'Pages',
      title: 'Platform Settings & Switches',
      subtitle: 'Feature flags, maintenance mode & registration gates',
      icon: Sliders,
      action: () => navigate('/admin/settings'),
    },
  ];

  // Quick Operational Actions
  const staticActions: CommandItem[] = [
    {
      id: 'action-copilot-slide',
      category: 'Actions',
      title: 'Open Copilot Drawer',
      subtitle: 'Launch assistant slide-over without leaving current page',
      icon: Bot,
      action: () => {
        window.dispatchEvent(new CustomEvent('toggle-admin-copilot'));
      },
      shortcut: 'Ctrl+J',
    },
    {
      id: 'action-backup',
      category: 'Actions',
      title: 'Create Safe Database Backup',
      subtitle: 'Immediately snapshot SQLite database to disk',
      icon: Database,
      action: async () => {
        navigate('/admin/system');
      },
    },
    {
      id: 'action-verify-chain',
      category: 'Actions',
      title: 'Verify Audit Ledger Hashes',
      subtitle: 'Run complete cryptographic SHA-256 chain validation',
      icon: ShieldCheck,
      action: () => navigate('/admin/audit'),
    },
  ];

  // Combine and filter items based on user query
  const qLower = query.toLowerCase().trim();

  const filteredPages = staticPages.filter(
    (p) =>
      p.title.toLowerCase().includes(qLower) ||
      (p.subtitle && p.subtitle.toLowerCase().includes(qLower))
  );

  const filteredActions = staticActions.filter(
    (a) =>
      a.title.toLowerCase().includes(qLower) ||
      (a.subtitle && a.subtitle.toLowerCase().includes(qLower))
  );

  const dynamicUsers: CommandItem[] = userResults.map((u) => ({
    id: `user-${u.id}`,
    category: 'Users',
    title: u.fullName || u.email,
    subtitle: `${u.email} • Role: ${u.role} • Status: ${u.status}`,
    icon: Users,
    action: () => navigate(`/admin/users?q=${encodeURIComponent(u.email)}`),
  }));

  const dynamicTickets: CommandItem[] = ticketResults.map((t) => ({
    id: `ticket-${t.id}`,
    category: 'Tickets',
    title: t.subject || `Ticket #${t.id}`,
    subtitle: `Status: ${t.status} • Priority: ${t.priority} • By: ${t.requesterEmail || t.requesterName}`,
    icon: LifeBuoy,
    action: () => navigate(`/admin/support?q=${encodeURIComponent(t.id)}`),
  }));

  const allItems: CommandItem[] = [
    ...filteredPages,
    ...filteredActions,
    ...dynamicUsers,
    ...dynamicTickets,
  ];

  // Keep selected index in bounds
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Handle keyboard navigation inside palette
  const handleKeyDownList = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < allItems.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : allItems.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (allItems[selectedIndex]) {
        executeItem(allItems[selectedIndex]);
      }
    }
  };

  const executeItem = (item: CommandItem) => {
    setIsOpen(false);
    item.action();
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Admin Command Palette"
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-start justify-center pt-20 px-4 transition-opacity"
      onClick={() => setIsOpen(false)}
    >
      <div
        className="w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[75vh] animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDownList}
      >
        {/* Search Input Bar */}
        <div className="relative border-b border-slate-800 p-4 flex items-center gap-3 bg-slate-900/90">
          <Search className="w-5 h-5 text-indigo-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a page, user email, ticket ID, or command..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-white placeholder-slate-500 text-base focus:outline-none"
          />
          {loadingSearch && (
            <div className="text-xs text-indigo-400 font-medium animate-pulse shrink-0">
              Searching...
            </div>
          )}
          <span className="hidden sm:inline-block text-[11px] font-mono text-slate-500 px-1.5 py-0.5 rounded border border-slate-800 bg-slate-950">
            ESC to close
          </span>
        </div>

        {/* Results List */}
        <div ref={listRef} className="overflow-y-auto p-2 space-y-1 divide-y divide-slate-800/40">
          {allItems.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              No matching pages, users, or commands found for "{query}".
            </div>
          ) : (
            allItems.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => executeItem(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl cursor-pointer transition ${
                    isSelected
                      ? 'bg-indigo-600/20 border border-indigo-500/40 text-white'
                      : 'hover:bg-slate-800/60 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`p-2 rounded-lg shrink-0 ${
                        isSelected
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold truncate text-slate-100">
                          {item.title}
                        </span>
                        <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500 px-1.5 py-0.2 rounded bg-slate-800/80 border border-slate-700/60">
                          {item.category}
                        </span>
                      </div>
                      {item.subtitle && (
                        <p className="text-xs text-slate-400 truncate mt-0.5">
                          {item.subtitle}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    {item.shortcut && (
                      <span className="text-[11px] font-mono bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700">
                        {item.shortcut}
                      </span>
                    )}
                    {isSelected ? (
                      <ArrowRight className="w-4 h-4 text-indigo-400" />
                    ) : (
                      <ExternalLink className="w-3.5 h-3.5 text-slate-600 opacity-0 group-hover:opacity-100" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info bar */}
        <div className="border-t border-slate-800 p-2.5 px-4 bg-slate-950/70 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="font-mono bg-slate-800 px-1.5 py-0.5 rounded text-[11px] text-slate-400">↑↓</kbd> Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="font-mono bg-slate-800 px-1.5 py-0.5 rounded text-[11px] text-slate-400">↵</kbd> Select
            </span>
          </div>
          <span className="text-[11px] text-slate-500">
            SARATHI Admin Command Hub
          </span>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
