/**
 * SARATHI Admin Portal — Admin Copilot Page
 * PRD Phase 9
 * Natural Language Querying, Explainable Assistant with Dynamic Cards, Tables, and Charts
 */

import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Bot,
  Send,
  Plus,
  Trash2,
  ThumbsUp,
  ThumbsDown,
  ExternalLink,
  MessageSquare,
  Sparkles,
  Download,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { adminApi } from '../../../services/adminApi';

const STARTER_QUESTIONS = [
  'How many users joined this week',
  'Show signups by role last 30 days',
  'Which recruiters are waiting more than 48 hours',
  'Any suspicious test sessions',
  'Forecast applications next 2 weeks',
  'What skills do we lack',
  'List risky recruiters',
  'Is the system healthy',
];

export const AdminCopilotPage: React.FC = () => {
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSessionsLoading, setIsSessionsLoading] = useState<boolean>(true);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Load sessions
  const loadSessions = async () => {
    try {
      setIsSessionsLoading(true);
      const res = await adminApi.listCopilotSessions();
      setSessions(res.sessions || []);
      if (!selectedSessionId && res.sessions?.length > 0) {
        setSelectedSessionId(res.sessions[0].id);
      }
    } catch {
      // Ignored
    } finally {
      setIsSessionsLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  // Load active session messages
  useEffect(() => {
    if (!selectedSessionId) {
      setMessages([]);
      return;
    }
    adminApi.getCopilotSession(selectedSessionId).then((res) => {
      setMessages(res.messages || []);
      scrollToBottom();
    }).catch(() => {});
  }, [selectedSessionId]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  };

  // Handle Send
  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim() || isLoading) return;

    setInputText('');
    setIsLoading(true);

    // Optimistic user message
    const tempUserMsg = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);
    scrollToBottom();

    try {
      let res;
      if (selectedSessionId) {
        res = await adminApi.sendCopilotMessage(selectedSessionId, text);
      } else {
        res = await adminApi.startCopilotSession(text);
        setSelectedSessionId(res.sessionId);
        await loadSessions();
      }

      const assistantMsg = {
        id: res.messageId,
        role: 'assistant',
        content: res.text,
        blocks: res.blocks || [],
        links: res.links || [],
        followUps: res.followUps || [],
        tool: res.tool,
        usedFallback: res.usedFallback,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
      scrollToBottom();
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: 'Sorry, I encountered an issue processing your query. Please try again.',
          blocks: [],
          links: [],
          followUps: ['Help'],
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Delete Session
  const handleDeleteSession = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm('Delete this chat session?')) return;
    try {
      await adminApi.deleteCopilotSession(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
      if (selectedSessionId === id) {
        setSelectedSessionId(null);
        setMessages([]);
      }
    } catch {}
  };

  // Handle Feedback
  const handleFeedback = async (messageId: string, value: number) => {
    try {
      await adminApi.submitCopilotFeedback(messageId, value);
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, feedback: value } : m))
      );
    } catch {}
  };

  // Export Chat Markdown
  const handleExportMarkdown = () => {
    if (messages.length === 0) return;
    let md = `# SARATHI Admin Copilot Session\nGenerated: ${new Date().toLocaleString()}\n\n`;
    messages.forEach((m) => {
      md += `### ${m.role === 'user' ? 'Admin' : 'Copilot'}\n${m.content}\n\n`;
    });
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `copilot-session-${selectedSessionId || 'export'}.md`;
    a.click();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900">Admin Copilot</h1>
            <span className="px-2 py-0.5 text-xs font-semibold rounded bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Natural Language
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Query platform metrics, cross-domain forecasts, and applicant data in plain English. Press <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-[11px] font-mono border">Ctrl+J</kbd> anywhere in admin for quick slide-over.
          </p>
        </div>

        {selectedSessionId && messages.length > 0 && (
          <button
            onClick={handleExportMarkdown}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700 shadow-2xs"
          >
            <Download className="w-3.5 h-3.5" /> Export Markdown
          </button>
        )}
      </div>

      {/* Main Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[calc(100vh-220px)] min-h-[580px]">
        {/* Sidebar: Session History (3 cols) */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
          <div className="p-3 border-b border-gray-100 flex items-center justify-between">
            <span className="text-xs font-bold text-gray-900">Conversations</span>
            <button
              onClick={() => {
                setSelectedSessionId(null);
                setMessages([]);
              }}
              className="flex items-center gap-1 text-xs text-indigo-600 font-semibold hover:text-indigo-700"
            >
              <Plus className="w-3.5 h-3.5" /> New
            </button>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
            {isSessionsLoading ? (
              <div className="p-4 text-center text-xs text-gray-400">Loading...</div>
            ) : sessions.length === 0 ? (
              <div className="p-6 text-center text-xs text-gray-400">
                No past conversations. Click "New" or type a prompt below!
              </div>
            ) : (
              sessions.map((s) => {
                const isSelected = selectedSessionId === s.id;
                return (
                  <div
                    key={s.id}
                    onClick={() => setSelectedSessionId(s.id)}
                    className={`p-3 cursor-pointer group flex items-center justify-between transition-colors ${
                      isSelected ? 'bg-indigo-50/60 text-indigo-900' : 'hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-indigo-600' : 'text-gray-400'}`} />
                      <span className="text-xs font-medium truncate">{s.title}</span>
                    </div>
                    <button
                      onClick={(e) => handleDeleteSession(e, s.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-600 transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Main Conversation Column (9 cols) */}
        <div className="lg:col-span-9 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-2xs">
                  <Bot className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-gray-900">What would you like to ask SARATHI?</h3>
                  <p className="text-xs text-gray-400 max-w-md mt-1">
                    Ask anything about platform health, test integrity, hiring funnels, or applicant anomalies.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-xl w-full text-left pt-2">
                  {STARTER_QUESTIONS.map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(q)}
                      className="p-3 text-xs text-gray-700 bg-gray-50 hover:bg-indigo-50/50 hover:border-indigo-200 border border-gray-100 rounded-xl transition-all flex items-center justify-between text-left"
                    >
                      <span>{q}</span>
                      <Sparkles className="w-3 h-3 text-indigo-400 shrink-0 ml-2" />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m) => {
                const isUser = m.role === 'user';
                return (
                  <div key={m.id} className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
                    {!isUser && (
                      <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 text-xs shadow-2xs">
                        <Bot className="w-4 h-4" />
                      </div>
                    )}
                    <div className={`max-w-2xl space-y-2 ${isUser ? 'items-end' : 'items-start'}`}>
                      <div
                        className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                          isUser
                            ? 'bg-indigo-600 text-white rounded-br-none shadow-2xs'
                            : 'bg-gray-50 border border-gray-200 text-gray-900 rounded-bl-none'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{m.content}</p>

                        {/* Blocks */}
                        {m.blocks && m.blocks.length > 0 && (
                          <div className="mt-3 space-y-3 pt-3 border-t border-gray-200">
                            {m.blocks.map((b: any, bIdx: number) => {
                              // KPI Block
                              if (b.type === 'kpis') {
                                return (
                                  <div key={bIdx} className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    {b.kpis.map((kpi: any, kIdx: number) => (
                                      <div key={kIdx} className="bg-white p-2.5 rounded-lg border border-gray-100 shadow-2xs">
                                        <span className="text-[10px] text-gray-400 block">{kpi.label}</span>
                                        <span className="text-sm font-bold text-gray-900">{kpi.value}</span>
                                      </div>
                                    ))}
                                  </div>
                                );
                              }

                              // Table Block
                              if (b.type === 'table' && Array.isArray(b.data) && b.data.length > 0) {
                                const headers = Object.keys(b.data[0]);
                                return (
                                  <div key={bIdx} className="bg-white rounded-lg border border-gray-100 overflow-hidden shadow-2xs">
                                    <table className="w-full text-left text-[11px]">
                                      <thead className="bg-gray-100 text-gray-600 font-bold border-b">
                                        <tr>
                                          {headers.map((h) => (
                                            <th key={h} className="py-1.5 px-3 capitalize">{h}</th>
                                          ))}
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-gray-100">
                                        {b.data.map((row: any, rIdx: number) => (
                                          <tr key={rIdx} className="hover:bg-gray-50">
                                            {headers.map((h) => (
                                              <td key={h} className="py-1.5 px-3 text-gray-800">{row[h]}</td>
                                            ))}
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                );
                              }

                              // Chart Block
                              if (b.type === 'chart' && Array.isArray(b.data)) {
                                return (
                                  <div key={bIdx} className="bg-white p-3 rounded-lg border border-gray-100 shadow-2xs h-48">
                                    <ResponsiveContainer width="100%" height="100%">
                                      <LineChart data={b.data}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                                        <XAxis dataKey={b.xKey} tick={{ fontSize: 10 }} />
                                        <YAxis tick={{ fontSize: 10 }} />
                                        <Tooltip />
                                        {b.series?.map((sName: string, sIdx: number) => (
                                          <Line
                                            key={sName}
                                            type="monotone"
                                            dataKey={sName}
                                            stroke={['#4F46E5', '#10B981', '#F59E0B'][sIdx % 3]}
                                            strokeWidth={2}
                                            dot={false}
                                          />
                                        ))}
                                      </LineChart>
                                    </ResponsiveContainer>
                                  </div>
                                );
                              }
                              return null;
                            })}
                          </div>
                        )}

                        {/* Deep Links */}
                        {m.links && m.links.length > 0 && (
                          <div className="mt-2.5 pt-2 border-t border-gray-100 flex flex-wrap gap-2">
                            {m.links.map((link: any, lIdx: number) => (
                              <Link
                                key={lIdx}
                                to={link.href}
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:underline"
                              >
                                {link.label} <ExternalLink className="w-3 h-3" />
                              </Link>
                            ))}
                          </div>
                        )}

                        {/* Footer tags & feedback */}
                        {!isUser && (
                          <div className="mt-2 flex items-center justify-between text-[10px] text-gray-400 pt-1">
                            <span className="px-1.5 py-0.2 bg-gray-100 text-gray-500 rounded font-mono">
                              Basic Mode
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleFeedback(m.id, 1)}
                                className={`p-0.5 rounded hover:text-emerald-600 ${
                                  m.feedback === 1 ? 'text-emerald-600 font-bold' : ''
                                }`}
                              >
                                <ThumbsUp className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleFeedback(m.id, -1)}
                                className={`p-0.5 rounded hover:text-red-600 ${
                                  m.feedback === -1 ? 'text-red-600 font-bold' : ''
                                }`}
                              >
                                <ThumbsDown className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Follow-up suggestions */}
                      {!isUser && m.followUps && m.followUps.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {m.followUps.map((fu: string, fuIdx: number) => (
                            <button
                              key={fuIdx}
                              onClick={() => handleSendMessage(fu)}
                              className="px-2.5 py-1 text-[11px] bg-white border border-gray-200 rounded-full text-gray-600 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/30 transition-all shadow-2xs"
                            >
                              {fu}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}

            {isLoading && (
              <div className="flex gap-3 items-center text-xs text-gray-400 py-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 animate-spin" />
                </div>
                <span>Analyzing platform data...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Composer */}
          <div className="p-3 border-t border-gray-200 bg-white">
            <div className="relative flex items-center">
              <input
                type="text"
                placeholder="Ask Admin Copilot... (e.g., 'how many users joined this week')"
                value={inputText}
                maxLength={500}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                disabled={isLoading}
                className="w-full pr-24 pl-4 py-2.5 text-xs border border-gray-200 rounded-xl focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <div className="absolute right-2 flex items-center gap-2">
                <span className="text-[10px] text-gray-400">{inputText.length}/500</span>
                <button
                  onClick={() => handleSendMessage()}
                  disabled={!inputText.trim() || isLoading}
                  className="p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-40 transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminCopilotPage;
