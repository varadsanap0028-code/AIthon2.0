import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { MessageSquareText, Sparkles, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ChatWindow } from './ChatWindow';

export const FloatingChatbot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, token } = useAuth();
  const location = useLocation();

  const toggleOpen = () => {
    setIsOpen(prev => !prev);
  };

  if (location.pathname.startsWith('/admin')) {
    return null;
  }

  return (
    <aside
      className="no-print relative z-50"
      aria-label="Sarathi AI Career Copilot"
    >
      {/* Floating Toggle Button */}
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3">
        {/* Subtle tooltip / teaser badge when minimized */}
        {!isOpen && (
          <button
            onClick={toggleOpen}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/95 backdrop-blur-md shadow-lg border border-slate-200/80 text-xs font-medium text-slate-700 hover:text-indigo-600 transition-all hover:scale-105 select-none"
            title="Open Sarathi AI Copilot"
          >
            <Sparkles size={13} className="text-indigo-600" />
            <span>Need career or skill advice?</span>
          </button>
        )}

        <button
          onClick={toggleOpen}
          aria-expanded={isOpen}
          aria-label={isOpen ? 'Close AI Career Copilot' : 'Open AI Career Copilot'}
          className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95 focus:outline-hidden focus:ring-4 focus:ring-indigo-500/40 select-none ${
            isOpen
              ? 'bg-slate-800 rotate-90 shadow-slate-900/20'
              : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 shadow-indigo-600/30'
          }`}
          title={isOpen ? 'Close Chat' : 'Chat with Sarathi AI'}
        >
          {isOpen ? (
            <X size={24} className="transition-transform" />
          ) : (
            <div className="relative flex items-center justify-center">
              <MessageSquareText size={26} />
              {/* Pulsing AI badge */}
              <span className="absolute -top-1.5 -right-1.5 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 ring-2 ring-white" />
              </span>
            </div>
          )}
        </button>
      </div>

      {/* Chat Window Dialog */}
      {isOpen && (
        <ChatWindow
          onClose={() => setIsOpen(false)}
          token={token}
          user={user}
          currentPath={location.pathname}
        />
      )}
    </aside>
  );
};
