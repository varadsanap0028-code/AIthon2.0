import React, { useState, useEffect } from 'react';
import { HelpCircle, Send, MessageSquare, Plus, ChevronRight, X } from 'lucide-react';
import { request } from '../../services/apiClient';

interface Ticket {
  id: string;
  category: string;
  subject: string;
  status: 'open' | 'pending' | 'resolved' | 'closed';
  priority: string;
  created_at: string;
  last_message_at: string;
  messages?: any[];
}

export const SupportCenter: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isCreatingTicket, setIsCreatingTicket] = useState<boolean>(false);

  // Form state
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('bug');
  const [body, setBody] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reply state
  const [replyText, setReplyText] = useState('');
  const [isReplying, setIsReplying] = useState(false);

  const loadTickets = async () => {
    try {
      setLoading(true);
      const res = await request<{ tickets: Ticket[] }>('/api/support/tickets');
      setTickets(res.tickets || []);
    } catch {
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  const handleOpenTicket = async (t: Ticket) => {
    try {
      const res = await request<{ ticket: Ticket }>(`/api/support/tickets/${t.id}`);
      setSelectedTicket(res.ticket);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !body.trim()) return;

    try {
      setIsSubmitting(true);
      const res = await request<{ ticket: Ticket }>('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, subject: subject.trim(), body: body.trim() }),
      });
      setSubject('');
      setBody('');
      setIsCreatingTicket(false);
      await loadTickets();
      setSelectedTicket(res.ticket);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendReply = async () => {
    if (!selectedTicket || !replyText.trim() || isReplying) return;

    try {
      setIsReplying(true);
      const res = await request<{ ticket: Ticket }>(`/api/support/tickets/${selectedTicket.id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: replyText.trim() }),
      });
      setReplyText('');
      setSelectedTicket(res.ticket);
      loadTickets();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsReplying(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-indigo-600" />
            Sarathi Support Center
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Submit inquiry tickets to platform admins and track resolution status in real-time.
          </p>
        </div>
        {!isCreatingTicket && !selectedTicket && (
          <button
            onClick={() => setIsCreatingTicket(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition"
          >
            <Plus className="w-4 h-4" />
            Contact Support
          </button>
        )}
      </div>

      {/* Mode 1: Create Ticket Modal/Form */}
      {isCreatingTicket && (
        <form onSubmit={handleCreateTicket} className="space-y-4 max-w-xl mx-auto bg-gray-50 p-5 rounded-2xl border border-gray-200/80">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900">New Support Request</h3>
            <button
              type="button"
              onClick={() => setIsCreatingTicket(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full border border-gray-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-indigo-500"
            >
              <option value="account">Account & Authentication</option>
              <option value="approval">Verification & Approvals</option>
              <option value="test">Assessment & Proctoring</option>
              <option value="bug">Platform Bug Report</option>
              <option value="other">General Inquiry</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Subject</label>
            <input
              type="text"
              required
              maxLength={120}
              placeholder="Brief summary of the issue..."
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full border border-gray-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Description</label>
            <textarea
              required
              rows={4}
              maxLength={5000}
              placeholder="Detailed description of what you were doing and what happened..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full border border-gray-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsCreatingTicket(false)}
              className="px-3 py-1.5 border border-gray-200 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Submitting...' : 'Send Ticket'}
            </button>
          </div>
        </form>
      )}

      {/* Mode 2: Ticket Conversation Thread */}
      {selectedTicket && (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <button
              onClick={() => setSelectedTicket(null)}
              className="text-xs text-indigo-600 hover:underline font-semibold"
            >
              &larr; Back to My Tickets
            </button>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${
                selectedTicket.status === 'resolved'
                  ? 'bg-blue-50 text-blue-700'
                  : selectedTicket.status === 'open'
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-amber-50 text-amber-700'
              }`}
            >
              {selectedTicket.status}
            </span>
          </div>

          <div>
            <h3 className="text-base font-bold text-gray-900">{selectedTicket.subject}</h3>
            <span className="text-[11px] text-gray-400">
              Ticket #{selectedTicket.id} &bull; Opened {new Date(selectedTicket.created_at).toLocaleDateString()}
            </span>
          </div>

          {/* Conversation messages */}
          <div className="bg-gray-50/75 rounded-2xl p-4 border border-gray-200/60 space-y-3 max-h-96 overflow-y-auto">
            {selectedTicket.messages?.map((msg: any) => {
              const isStaff = msg.sender_role === 'platform_admin';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isStaff ? 'items-start' : 'items-end'}`}
                >
                  <span className="text-[10px] text-gray-400 mb-1 px-1">
                    {isStaff ? 'Support Team' : 'You'} &bull; {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2 text-xs leading-relaxed whitespace-pre-wrap ${
                      isStaff
                        ? 'bg-white border border-gray-200 text-gray-800 shadow-xs'
                        : 'bg-indigo-600 text-white'
                    }`}
                  >
                    {msg.body}
                  </div>
                </div>
              );
            })}
          </div>

          {/* User Reply box */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Type your response to the support team..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSendReply();
              }}
              className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-indigo-500"
            />
            <button
              onClick={handleSendReply}
              disabled={!replyText.trim() || isReplying}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition disabled:opacity-50 flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              Reply
            </button>
          </div>
        </div>
      )}

      {/* Mode 3: Ticket List */}
      {!isCreatingTicket && !selectedTicket && (
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            My Support Inquiries
          </h3>

          {loading ? (
            <div className="text-center py-8 text-xs text-gray-400">Loading tickets...</div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-12 text-gray-400 space-y-2">
              <MessageSquare className="w-8 h-8 mx-auto text-gray-300" />
              <p className="text-xs">You have no active support tickets.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden">
              {tickets.map((t) => (
                <div
                  key={t.id}
                  onClick={() => handleOpenTicket(t)}
                  className="p-4 hover:bg-gray-50 cursor-pointer transition flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900 text-xs">{t.subject}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                          t.status === 'resolved'
                            ? 'bg-blue-50 text-blue-700'
                            : t.status === 'open'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {t.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-gray-400 flex items-center gap-2">
                      <span>#{t.id}</span>
                      <span>&bull;</span>
                      <span className="capitalize">{t.category}</span>
                      <span>&bull;</span>
                      <span>Last activity: {new Date(t.last_message_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SupportCenter;
