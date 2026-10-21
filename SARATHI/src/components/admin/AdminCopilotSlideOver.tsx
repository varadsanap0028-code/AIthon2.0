/**
 * SARATHI Admin Portal — Copilot Quick Slide-over Drawer
 * PRD Phase 9: Opens with Ctrl+J / Cmd+J anywhere in the Admin Portal.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Bot, X, Send, Sparkles, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { adminApi } from '../../services/adminApi';

export const AdminCopilotSlideOver: React.FC = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  // Global Ctrl+J listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSend = async (q?: string) => {
    const text = q || inputText;
    if (!text.trim() || isLoading) return;

    setInputText('');
    setIsLoading(true);

    const tempMsg = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: text,
    };
    setMessages((prev) => [...prev, tempMsg]);

    try {
      let res;
      if (sessionId) {
        res = await adminApi.sendCopilotMessage(sessionId, text);
      } else {
        res = await adminApi.startCopilotSession(text);
        setSessionId(res.sessionId);
      }

      setMessages((prev) => [
        ...prev,
        {
          id: res.messageId,
          role: 'assistant',
          content: res.text,
          blocks: res.blocks || [],
          links: res.links || [],
          followUps: res.followUps || [],
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: 'Unable to process query. Please retry.',
        },
      ]);
    } finally {
      setIsLoading(false);
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-xs">
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col border-l border-gray-200">
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs shadow-2xs">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-xs text-gray-900">Admin Copilot</h3>
              <span className="text-[10px] text-gray-400">Ctrl+J to close</span>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 ? (
            <div className="text-center py-8 space-y-3">
              <Sparkles className="w-8 h-8 text-indigo-400 mx-auto" />
              <p className="text-xs text-gray-500">Quickly query platform status or look up users.</p>
              <div className="space-y-1.5 pt-2">
                {[
                  'How many users joined this week',
                  'Which recruiters are waiting more than 48 hours',
                  'Is the system healthy',
                ].map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(q)}
                    className="w-full p-2 text-left text-xs bg-gray-50 hover:bg-indigo-50 border border-gray-100 rounded-lg text-gray-700 block transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className={`p-3 rounded-xl text-xs ${
                  m.role === 'user'
                    ? 'bg-indigo-600 text-white ml-8'
                    : 'bg-gray-50 border border-gray-100 text-gray-900 mr-8'
                }`}
              >
                <p className="whitespace-pre-wrap">{m.content}</p>
                {m.links && m.links.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-200 flex flex-wrap gap-2">
                    {m.links.map((link: any, idx: number) => (
                      <Link
                        key={idx}
                        to={link.href}
                        onClick={() => setIsOpen(false)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:underline"
                      >
                        {link.label} <ExternalLink className="w-3 h-3" />
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
          {isLoading && (
            <div className="text-xs text-gray-400 flex items-center gap-2">
              <Bot className="w-3.5 h-3.5 animate-spin text-indigo-600" /> Thinking...
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Input */}
        <div className="p-3 border-t border-gray-200 bg-white">
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Ask Copilot..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSend();
              }}
              className="flex-1 px-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
            />
            <button
              onClick={() => handleSend()}
              disabled={!inputText.trim() || isLoading}
              className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-40"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
