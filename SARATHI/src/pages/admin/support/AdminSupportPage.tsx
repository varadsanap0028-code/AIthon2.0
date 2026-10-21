import React, { useState, useEffect, useRef } from 'react';
import {
  HelpCircle,
  Clock,
  AlertTriangle,
  Lock,
  Send,
  User,
  Search,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { adminApi, useAdminQuery } from '../../../services/adminApi';

const PRIORITY_BADGES: Record<string, string> = {
  urgent: 'bg-red-50 text-red-700 border-red-200',
  high: 'bg-amber-50 text-amber-700 border-amber-200',
  normal: 'bg-blue-50 text-blue-700 border-blue-200',
  low: 'bg-gray-50 text-gray-600 border-gray-200',
};

const STATUS_BADGES: Record<string, string> = {
  open: 'bg-emerald-50 text-emerald-700',
  pending: 'bg-amber-50 text-amber-700',
  resolved: 'bg-blue-50 text-blue-700',
  closed: 'bg-gray-100 text-gray-600',
};

export const AdminSupportPage: React.FC = () => {
  // Query filters
  const [statusFilter, setStatusFilter] = useState<string>('open');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  // Composer
  const [replyText, setReplyText] = useState<string>('');
  const [isInternalNote, setIsInternalNote] = useState<boolean>(false);
  const [statusAfterSend, setStatusAfterSend] = useState<string>('pending');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [showCannedMenu, setShowCannedMenu] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Fetch Stats
  const { data: statsData, refetch: refetchStats } = useAdminQuery(
    (signal) => adminApi.getSupportStats(signal),
    []
  );

  // Fetch Canned Responses
  const { data: cannedData } = useAdminQuery(
    (signal) => adminApi.getCannedResponses(signal),
    []
  );

  // Fetch Tickets List
  const {
    data: ticketsData,
    loading: ticketsLoading,
    refetch: refetchTickets,
  } = useAdminQuery(
    (signal) =>
      adminApi.getSupportTickets(
        {
          status: statusFilter === 'all' ? undefined : statusFilter,
          priority: priorityFilter === 'all' ? undefined : priorityFilter,
          category: categoryFilter === 'all' ? undefined : categoryFilter,
          assignee: assigneeFilter === 'all' ? undefined : assigneeFilter,
          q: searchQuery,
          pageSize: 50,
        },
        signal
      ),
    [statusFilter, priorityFilter, categoryFilter, assigneeFilter, searchQuery]
  );

  // Auto-select first ticket if none selected
  useEffect(() => {
    if (!selectedTicketId && ticketsData?.tickets && ticketsData.tickets.length > 0) {
      setSelectedTicketId(ticketsData.tickets[0].id);
    }
  }, [ticketsData, selectedTicketId]);

  // Fetch Selected Ticket Detail
  const {
    data: ticketDetailData,
    refetch: refetchTicketDetail,
  } = useAdminQuery(
    (signal) =>
      selectedTicketId ? adminApi.getSupportTicketDetail(selectedTicketId, signal) : Promise.resolve({ ticket: null }),
    [selectedTicketId]
  );

  const activeTicket = ticketDetailData?.ticket;

  // Polling: Open thread every 8s and list every 30s (paused when document hidden)
  useEffect(() => {
    const threadInterval = setInterval(() => {
      if (!document.hidden && selectedTicketId) {
        refetchTicketDetail();
      }
    }, 8000);

    const listInterval = setInterval(() => {
      if (!document.hidden) {
        refetchTickets();
        refetchStats();
      }
    }, 30000);

    return () => {
      clearInterval(threadInterval);
      clearInterval(listInterval);
    };
  }, [selectedTicketId, refetchTicketDetail, refetchTickets, refetchStats]);

  // Scroll to bottom of message thread
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeTicket?.messages]);

  // Send reply or internal note
  const handleSendReply = async () => {
    if (!selectedTicketId || !replyText.trim() || isSending) return;
    try {
      setIsSending(true);
      await adminApi.replySupportTicket(selectedTicketId, {
        body: replyText.trim(),
        isInternalNote,
        setStatus: isInternalNote ? undefined : statusAfterSend,
      });
      setReplyText('');
      refetchTicketDetail();
      refetchTickets();
      refetchStats();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSending(false);
    }
  };

  // Insert canned response
  const handleInsertCanned = (body: string) => {
    setReplyText((prev) => (prev ? `${prev}\n\n${body}` : body));
    setShowCannedMenu(false);
  };

  // Update Ticket Metadata
  const handleUpdateTicketMeta = async (updates: any) => {
    if (!selectedTicketId) return;
    try {
      await adminApi.updateSupportTicket(selectedTicketId, updates);
      refetchTicketDetail();
      refetchTickets();
      refetchStats();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Support Desk</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Two-way omnichannel helpdesk with SLA tracking, staff internal notes, and instant canned responses.
          </p>
        </div>
      </div>

      {/* Top Stats Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-500 block">Open Tickets</span>
            <span className="text-xl font-bold text-gray-900">{statsData?.openCount || 0}</span>
          </div>
          <HelpCircle className="w-6 h-6 text-indigo-500" />
        </div>
        <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-500 block">Unassigned</span>
            <span className="text-xl font-bold text-amber-600">{statsData?.unassignedCount || 0}</span>
          </div>
          <User className="w-6 h-6 text-amber-500" />
        </div>
        <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-500 block">SLA Breached</span>
            <span className="text-xl font-bold text-red-600">{statsData?.breachedCount || 0}</span>
          </div>
          <AlertTriangle className="w-6 h-6 text-red-500" />
        </div>
        <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-500 block">Avg First Reply</span>
            <span className="text-xl font-bold text-gray-900">
              {statsData?.avgResponseHours ? `${statsData.avgResponseHours}h` : '—'}
            </span>
          </div>
          <Clock className="w-6 h-6 text-emerald-500" />
        </div>
      </div>

      {/* 3-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[calc(100vh-280px)] min-h-[600px]">
        {/* Column 1: Ticket Queue (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
          {/* Filters Bar */}
          <div className="p-3 border-b border-gray-100 space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search ticket #, subject, user..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-1/2 border border-gray-200 rounded-lg px-2 py-1 text-xs focus:ring-1 focus:ring-indigo-500"
              >
                <option value="open">Open</option>
                <option value="pending">Pending</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
                <option value="all">All Statuses</option>
              </select>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="w-1/2 border border-gray-200 rounded-lg px-2 py-1 text-xs focus:ring-1 focus:ring-indigo-500"
              >
                <option value="all">All Priorities</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="normal">Normal</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div className="flex gap-2">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-1/2 border border-gray-200 rounded-lg px-2 py-1 text-xs focus:ring-1 focus:ring-indigo-500"
              >
                <option value="all">All Categories</option>
                <option value="technical">Technical</option>
                <option value="billing">Billing</option>
                <option value="assessment">Assessment</option>
                <option value="account">Account</option>
                <option value="general">General</option>
              </select>
              <select
                value={assigneeFilter}
                onChange={(e) => setAssigneeFilter(e.target.value)}
                className="w-1/2 border border-gray-200 rounded-lg px-2 py-1 text-xs focus:ring-1 focus:ring-indigo-500"
              >
                <option value="all">All Assignees</option>
                <option value="unassigned">Unassigned</option>
                <option value="me">Assigned to Me</option>
              </select>
            </div>
          </div>

          {/* Ticket List */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
            {ticketsLoading ? (
              <div className="p-8 text-center text-xs text-gray-400">Loading tickets...</div>
            ) : ticketsData?.tickets?.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-500">No tickets match criteria.</div>
            ) : (
              ticketsData?.tickets?.map((t: any) => {
                const isSelected = t.id === selectedTicketId;
                return (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTicketId(t.id)}
                    className={`p-3.5 cursor-pointer transition border-l-4 ${
                      isSelected
                        ? 'bg-indigo-50/50 border-indigo-600'
                        : 'hover:bg-gray-50 border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-mono text-gray-400">#{t.id}</span>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase border ${
                            PRIORITY_BADGES[t.priority] || PRIORITY_BADGES.normal
                          }`}
                        >
                          {t.priority}
                        </span>
                        {t.slaBreached && (
                          <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-800 text-[10px] font-bold">
                            SLA BREACH
                          </span>
                        )}
                      </div>
                    </div>
                    <h4 className="text-xs font-semibold text-gray-900 line-clamp-1">{t.subject}</h4>
                    <div className="flex items-center justify-between text-[11px] text-gray-500 mt-2">
                      <span className="truncate max-w-[140px]">{t.requester_name || t.requester_email}</span>
                      <span>{new Date(t.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Column 2: Chat Thread (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
          {activeTicket ? (
            <>
              {/* Thread Header */}
              <div className="p-3.5 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 line-clamp-1">{activeTicket.subject}</h3>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                    <span>Category: <strong className="capitalize">{activeTicket.category}</strong></span>
                    <span>&bull;</span>
                    <span
                      className={`px-1.5 py-0.5 rounded font-medium ${
                        STATUS_BADGES[activeTicket.status] || STATUS_BADGES.open
                      }`}
                    >
                      {activeTicket.status}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => refetchTicketDetail()}
                  title="Refresh thread"
                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              {/* Message Bubbles */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F9FAFB]/50">
                {activeTicket.messages?.map((msg: any) => {
                  const isUser = msg.sender_role === 'candidate' || msg.sender_role === 'student' || msg.sender_role === 'recruiter';
                  const isInternal = msg.is_internal_note === 1;

                  if (isInternal) {
                    return (
                      <div
                        key={msg.id}
                        className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-3 text-xs text-amber-900 shadow-xs"
                      >
                        <div className="flex items-center gap-1.5 font-bold text-amber-800 mb-1">
                          <Lock className="w-3.5 h-3.5 text-amber-700" />
                          <span>Staff Internal Note &bull; {msg.sender_name || 'Admin'}</span>
                          <span className="text-[10px] text-amber-600 font-normal ml-auto">
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap">{msg.body}</p>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isUser ? 'items-start' : 'items-end'}`}
                    >
                      <div className="flex items-center gap-1.5 text-[10px] text-gray-400 mb-1 px-1">
                        <span>{msg.sender_name || (isUser ? 'Requester' : 'Staff Support')}</span>
                        <span>&bull;</span>
                        <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs shadow-xs leading-relaxed whitespace-pre-wrap ${
                          isUser
                            ? 'bg-white border border-gray-200 text-gray-800 rounded-tl-sm'
                            : 'bg-indigo-600 text-white rounded-tr-sm'
                        }`}
                      >
                        {msg.body}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Composer */}
              <div className="p-3 border-t border-gray-100 bg-white space-y-2 relative">
                {/* Canned responses dropdown popover */}
                {showCannedMenu && (
                  <div className="absolute bottom-full mb-2 left-3 right-3 bg-white border border-gray-200 rounded-xl shadow-xl p-2 z-20 max-h-48 overflow-y-auto">
                    <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-2 py-1">
                      Insert Pre-approved Canned Response
                    </div>
                    {cannedData?.canned?.map((c: any) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleInsertCanned(c.body)}
                        className="w-full text-left p-2 rounded-lg hover:bg-indigo-50 text-xs transition"
                      >
                        <div className="font-semibold text-gray-800">{c.title}</div>
                        <div className="text-[11px] text-gray-400 line-clamp-1">{c.body}</div>
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5 cursor-pointer font-medium text-amber-800 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                      <input
                        type="checkbox"
                        checked={isInternalNote}
                        onChange={(e) => setIsInternalNote(e.target.checked)}
                        className="rounded text-amber-600 focus:ring-0"
                      />
                      <Lock className="w-3 h-3 text-amber-700" />
                      Internal Note
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowCannedMenu(!showCannedMenu)}
                      className="text-indigo-600 hover:text-indigo-800 text-xs font-semibold px-2 py-0.5 rounded hover:bg-indigo-50 transition"
                    >
                      / Canned Template
                    </button>
                  </div>
                  {!isInternalNote && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <span>After sending:</span>
                      <select
                        value={statusAfterSend}
                        onChange={(e) => setStatusAfterSend(e.target.value)}
                        className="border border-gray-200 rounded px-1.5 py-0.5 text-xs"
                      >
                        <option value="pending">Set Pending</option>
                        <option value="resolved">Set Resolved</option>
                        <option value="open">Keep Open</option>
                      </select>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 items-end">
                  <textarea
                    rows={2}
                    value={replyText}
                    onChange={(e) => {
                      setReplyText(e.target.value);
                      if (e.target.value === '/') setShowCannedMenu(true);
                    }}
                    placeholder={
                      isInternalNote
                        ? 'Write internal staff note (only visible to team)...'
                        : 'Write public response to user (plain text, auto-links enabled)...'
                    }
                    className="flex-1 p-2.5 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  />
                  <button
                    onClick={handleSendReply}
                    disabled={!replyText.trim() || isSending}
                    className={`p-2.5 rounded-xl font-medium text-white transition disabled:opacity-40 ${
                      isInternalNote ? 'bg-amber-600 hover:bg-amber-700' : 'bg-indigo-600 hover:bg-indigo-700'
                    }`}
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-xs">
              Select a support ticket to inspect conversation.
            </div>
          )}
        </div>

        {/* Column 3: Requester Context & Controls (3 cols) */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-gray-200 shadow-sm p-4 overflow-y-auto space-y-4">
          {activeTicket ? (
            <>
              {/* Requester Identity Card */}
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-200/70 space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Requester Identity
                </h4>
                <div>
                  <div className="font-bold text-gray-900 text-sm">{activeTicket.requester_name}</div>
                  <div className="text-xs text-gray-500 truncate">{activeTicket.requester_email}</div>
                </div>
                <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-200/60">
                  <span className="text-gray-400">Portal Role:</span>
                  <span className="font-semibold text-gray-700 capitalize">{activeTicket.requester_role}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">Account Status:</span>
                  <span className="font-semibold text-emerald-700 capitalize">{activeTicket.requester_status}</span>
                </div>
                <a
                  href={`/admin/users?q=${encodeURIComponent(activeTicket.requester_email)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="block text-center text-xs font-semibold text-indigo-600 hover:text-indigo-800 pt-1"
                >
                  Open User Drawer &rarr;
                </a>
              </div>

              {/* Status Controls */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Ticket Controls
                </h4>
                <div className="space-y-2 text-xs">
                  <div>
                    <label className="text-gray-500 block mb-1">Status</label>
                    <select
                      value={activeTicket.status}
                      onChange={(e) => handleUpdateTicketMeta({ status: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg p-1.5 focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="open">Open</option>
                      <option value="pending">Pending</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-gray-500 block mb-1">Priority</label>
                    <select
                      value={activeTicket.priority}
                      onChange={(e) => handleUpdateTicketMeta({ priority: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg p-1.5 focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="urgent">Urgent</option>
                      <option value="high">High</option>
                      <option value="normal">Normal</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-gray-500 block mb-1">Category</label>
                    <select
                      value={activeTicket.category}
                      onChange={(e) => handleUpdateTicketMeta({ category: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg p-1.5 focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="account">Account</option>
                      <option value="approval">Approval</option>
                      <option value="test">Test</option>
                      <option value="bug">Bug</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* SLA Target */}
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200/70 text-xs space-y-1">
                <span className="text-gray-400 block">SLA Target Due:</span>
                <span className="font-semibold text-gray-800">
                  {new Date(activeTicket.sla_due_at).toLocaleString()}
                </span>
                <div className="pt-1">
                  {activeTicket.slaBreached ? (
                    <span className="text-red-600 font-bold flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> SLA Breached
                    </span>
                  ) : (
                    <span className="text-emerald-700 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Within SLA ({activeTicket.slaHoursLeft}h left)
                    </span>
                  )}
                </div>
              </div>

              {/* Previous Tickets */}
              {activeTicket.previousTickets && activeTicket.previousTickets.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-gray-100">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                    User Ticket History
                  </h4>
                  <div className="space-y-1.5">
                    {activeTicket.previousTickets.map((pt: any) => (
                      <button
                        key={pt.id}
                        onClick={() => setSelectedTicketId(pt.id)}
                        className="w-full text-left p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition text-xs"
                      >
                        <div className="font-semibold text-gray-800 truncate">{pt.subject}</div>
                        <div className="text-[10px] text-gray-400 mt-0.5 flex justify-between">
                          <span className="capitalize">{pt.status}</span>
                          <span>{new Date(pt.created_at).toLocaleDateString()}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center text-xs text-gray-400 py-12">
              Requester metadata will appear here when a ticket is opened.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminSupportPage;
