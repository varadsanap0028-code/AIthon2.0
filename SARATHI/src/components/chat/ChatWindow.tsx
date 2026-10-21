import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  Send,
  RotateCcw,
  Sparkles,
  ChevronDown,
  Info,
  RefreshCw,
} from 'lucide-react';
import type { ChatMessage, ChatStatus, SuggestedPrompt } from './types';
import { ChatService } from '../../services/chatService';
import { ChatMessageItem } from './ChatMessageItem';

interface ChatWindowProps {
  onClose: () => void;
  token?: string | null;
  user?: any;
  currentPath?: string;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  onClose,
  token,
  user,
  currentPath = window.location.pathname,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = sessionStorage.getItem('sarathi_chat_history');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatStatus, setChatStatus] = useState<ChatStatus | null>(null);
  const [suggestions, setSuggestions] = useState<SuggestedPrompt[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Save conversation in session storage
  useEffect(() => {
    try {
      sessionStorage.setItem('sarathi_chat_history', JSON.stringify(messages));
    } catch {}
  }, [messages]);

  // Load status and suggestions on mount
  useEffect(() => {
    let isMounted = true;

    async function loadInitialData() {
      const role = user?.role || user?.globalRole || 'student';
      const [status, fetchedSuggestions] = await Promise.all([
        ChatService.getStatus(token),
        ChatService.getSuggestions(role),
      ]);

      if (!isMounted) return;
      setChatStatus(status);
      setSuggestions(fetchedSuggestions);
    }

    loadInitialData();

    return () => {
      isMounted = false;
    };
  }, [token, user]);

  // Scroll to bottom when messages or loading state changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text || isLoading) return;

    setErrorMessage(null);
    setLastFailedMessage(null);
    setInputValue('');

    const userMessage: ChatMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    const newHistory = [...messages, userMessage];
    setMessages(newHistory);
    setIsLoading(true);

    try {
      // Gather client context
      const targetRole = localStorage.getItem(`sarathi_${user?.id}_targetRole`) || user?.targetRole;
      const clientContext = {
        activePath: currentPath,
        targetRole,
        activeTrack: currentPath.includes('roadmap') ? 'active-roadmap' : undefined,
      };

      const result = await ChatService.sendMessage(text, messages, clientContext, token);
      setMessages(prev => [...prev, result.message]);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to send message. Please try again.');
      setLastFailedMessage(text);
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearChat = () => {
    if (messages.length === 0) return;
    if (window.confirm('Clear your current conversation history?')) {
      setMessages([]);
      sessionStorage.removeItem('sarathi_chat_history');
      setErrorMessage(null);
      setLastFailedMessage(null);
    }
  };

  const handleRetry = () => {
    if (lastFailedMessage) {
      handleSendMessage(lastFailedMessage);
    }
  };

  const userName = user?.fullName || user?.full_name || 'there';

  return (
    <div
      className="fixed bottom-20 right-4 sm:right-6 w-[calc(100vw-2rem)] sm:w-[420px] h-[580px] max-h-[calc(100vh-6.5rem)] rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden border border-slate-200/90 bg-white/95 backdrop-blur-md animate-in fade-in slide-in-from-bottom-4 duration-200 font-sans"
      role="dialog"
      aria-labelledby="chatbot-title"
    >
      {/* Header */}
      <header className="px-4 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white flex items-center justify-between shrink-0 shadow-sm select-none">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/30 shadow-xs">
            <Bot size={20} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 id="chatbot-title" className="font-semibold text-sm tracking-tight leading-tight">
                Sarathi AI Copilot
              </h2>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping opacity-75" />
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-white/80">
              <span>{chatStatus?.configured ? 'AI Connected' : 'Local Knowledge'}</span>
              <span>•</span>
              <span className="capitalize">{user?.role || 'Career Mentor'}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 text-white/80">
          <button
            onClick={handleClearChat}
            disabled={messages.length === 0}
            className="p-1.5 rounded-lg hover:bg-white/15 hover:text-white transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
            title="Reset conversation"
            aria-label="Reset conversation"
          >
            <RotateCcw size={16} />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/15 hover:text-white transition-colors"
            title="Minimize chat"
            aria-label="Minimize chat"
          >
            <ChevronDown size={18} />
          </button>
        </div>
      </header>

      {/* Mode Banner if in Local Knowledge Mode */}
      {chatStatus && !chatStatus.configured && (
        <div className="px-3 py-1.5 bg-amber-50 border-b border-amber-200/80 text-[11px] text-amber-800 flex items-center justify-between shrink-0">
          <span className="flex items-center gap-1.5">
            <Info size={12} className="shrink-0 text-amber-600" />
            <span>Local Knowledge Mode active.</span>
          </span>
          <span className="font-mono text-[10px] text-amber-700 bg-amber-200/60 px-1.5 py-0.2 rounded">
            GEMINI_API_KEY ready
          </span>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-slate-50/50">
        {/* Welcome Card if no messages yet */}
        {messages.length === 0 && (
          <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs my-2 text-slate-700 space-y-3">
            <div className="flex items-center gap-2 text-indigo-700 font-semibold text-sm">
              <Sparkles size={16} />
              <span>Welcome{user ? `, ${userName}` : ''}!</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              I am your <strong>Sarathi Career & Skill Copilot</strong>. Ask me anything about career tracks, milestone roadmaps, diagnostic assessments, or verified credentials on your Skill Passport.
            </p>

            <div className="pt-2 border-t border-slate-100">
              <div className="text-[11px] font-medium text-slate-500 mb-2">
                Suggested prompts to get started:
              </div>
              <div className="flex flex-col gap-1.5">
                {suggestions.slice(0, 5).map(s => (
                  <button
                    key={s.id}
                    onClick={() => handleSendMessage(s.prompt)}
                    className="text-left text-xs px-3 py-2 rounded-lg bg-indigo-50/70 hover:bg-indigo-100/80 text-indigo-900 border border-indigo-100 transition-colors flex items-center justify-between group"
                  >
                    <span>{s.label}</span>
                    <Send size={11} className="opacity-0 group-hover:opacity-100 text-indigo-600 transition-opacity" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Message history */}
        {messages.map(msg => (
          <ChatMessageItem key={msg.id} message={msg} />
        ))}

        {/* Typing indicator */}
        {isLoading && (
          <div className="flex items-center gap-2.5 my-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center shrink-0 text-white shadow-sm">
              <Bot size={16} />
            </div>
            <div className="px-4 py-3 rounded-2xl rounded-tl-xs bg-white border border-slate-200/90 shadow-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce [animation-delay:-0.3s]" />
                <span className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce [animation-delay:-0.15s]" />
                <span className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce" />
                <span className="text-xs text-slate-400 ml-1.5 font-medium">Thinking...</span>
              </div>
            </div>
          </div>
        )}

        {/* Error Banner with Retry */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between gap-2 shadow-xs">
            <span>{errorMessage}</span>
            {lastFailedMessage && (
              <button
                onClick={handleRetry}
                className="flex items-center gap-1 font-medium text-rose-700 hover:text-rose-900 bg-rose-100 px-2 py-1 rounded shrink-0 transition-colors"
              >
                <RefreshCw size={12} />
                <span>Retry</span>
              </button>
            )}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested chips below message area when chat is active */}
      {messages.length > 0 && messages.length < 6 && (
        <div className="px-4 py-1.5 bg-slate-100/70 border-t border-slate-200/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
          <span className="text-[10px] text-slate-400 shrink-0">Suggestions:</span>
          {suggestions.slice(0, 3).map(s => (
            <button
              key={s.id}
              onClick={() => handleSendMessage(s.prompt)}
              disabled={isLoading}
              className="text-[11px] whitespace-nowrap px-2.5 py-1 rounded-full bg-white hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200 hover:border-indigo-200 transition-colors shrink-0 disabled:opacity-50"
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      {/* Input area */}
      <footer className="p-3 bg-white border-t border-slate-200 shrink-0">
        <div className="flex items-end gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-indigo-500/30 focus-within:border-indigo-500 transition-all">
          <textarea
            ref={inputRef}
            rows={1}
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about careers, roadmaps, skills, interview prep..."
            className="flex-1 bg-transparent resize-none outline-hidden text-sm text-slate-800 placeholder:text-slate-400 max-h-24 leading-relaxed"
            disabled={isLoading}
            aria-label="Chat input"
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={!inputValue.trim() || isLoading}
            className="w-8 h-8 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-center shrink-0 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xs"
            title="Send message (Enter)"
            aria-label="Send message"
          >
            <Send size={15} />
          </button>
        </div>
        <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1.5 px-1">
          <span>Press <strong>Enter</strong> to send, <strong>Shift+Enter</strong> for newline</span>
          <span>Sarathi Platform</span>
        </div>
      </footer>
    </div>
  );
};
