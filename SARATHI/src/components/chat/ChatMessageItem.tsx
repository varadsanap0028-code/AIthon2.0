import React, { useState } from 'react';
import { Bot, User, Copy, Check, AlertCircle } from 'lucide-react';
import type { ChatMessage } from './types';
import { ChatMarkdown } from './ChatMarkdown';

interface ChatMessageItemProps {
  message: ChatMessage;
}

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);

  const formattedTime = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isUser) {
    return (
      <div className="flex justify-end gap-2 my-3 group">
        <div className="flex flex-col items-end max-w-[85%]">
          <div className="px-4 py-2.5 rounded-2xl rounded-tr-xs bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-sm text-sm leading-relaxed whitespace-pre-wrap select-text">
            {message.content}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 mr-1">{formattedTime}</span>
        </div>
        <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 text-indigo-700 shadow-xs border border-indigo-200">
          <User size={14} />
        </div>
      </div>
    );
  }

  // Assistant Message
  return (
    <div className="flex justify-start gap-2.5 my-3 group">
      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center shrink-0 text-white shadow-sm ring-2 ring-white">
        <Bot size={16} />
      </div>

      <div className="flex flex-col items-start max-w-[88%]">
        <div
          className={`px-4 py-3 rounded-2xl rounded-tl-xs border shadow-xs text-sm ${
            message.isError
              ? 'bg-rose-50/80 border-rose-200 text-rose-900'
              : 'bg-white border-slate-200/90 text-slate-800'
          }`}
        >
          {message.isError ? (
            <div className="flex items-start gap-2 text-rose-700">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <div className="text-xs leading-relaxed">{message.content}</div>
            </div>
          ) : (
            <ChatMarkdown content={message.content} />
          )}
        </div>

        {/* Footer info: time, provider/model tag, copy action */}
        <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1 ml-1">
          <span>{formattedTime}</span>

          {message.provider && (
            <span
              className={`px-1.5 py-0.2 rounded font-medium text-[9px] ${
                message.isFallback
                  ? 'bg-amber-100/70 text-amber-800 border border-amber-200'
                  : 'bg-emerald-100/70 text-emerald-800 border border-emerald-200'
              }`}
            >
              {message.isFallback ? 'Local Knowledge' : message.provider}
            </span>
          )}

          <button
            onClick={handleCopyMessage}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-slate-600 p-0.5 rounded"
            title="Copy response"
            aria-label="Copy response"
          >
            {copied ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
          </button>
        </div>
      </div>
    </div>
  );
};
