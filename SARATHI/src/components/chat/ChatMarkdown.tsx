import React, { useState } from 'react';
import { Copy, Check, ExternalLink } from 'lucide-react';

interface ChatMarkdownProps {
  content: string;
}

export const ChatMarkdown: React.FC<ChatMarkdownProps> = ({ content }) => {
  if (!content) return null;

  // Split content into blocks: code blocks vs text blocks
  const blocks = parseBlocks(content);

  return (
    <div className="space-y-2 text-sm leading-relaxed text-slate-800 break-words">
      {blocks.map((block, i) => {
        if (block.type === 'code') {
          return <CodeBlock key={i} code={block.content} language={block.language} />;
        }
        return <TextBlock key={i} text={block.content} />;
      })}
    </div>
  );
};

interface Block {
  type: 'code' | 'text';
  content: string;
  language?: string;
}

function parseBlocks(markdown: string): Block[] {
  const blocks: Block[] = [];
  const lines = markdown.split(/\r?\n/);
  let inCodeBlock = false;
  let codeLang = '';
  let currentBlockLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const codeMatch = line.match(/^```(\w*)/);

    if (codeMatch && !inCodeBlock) {
      if (currentBlockLines.length > 0) {
        blocks.push({ type: 'text', content: currentBlockLines.join('\n') });
        currentBlockLines = [];
      }
      inCodeBlock = true;
      codeLang = codeMatch[1] || '';
      continue;
    }

    if (line.trim() === '```' && inCodeBlock) {
      blocks.push({ type: 'code', content: currentBlockLines.join('\n'), language: codeLang });
      currentBlockLines = [];
      inCodeBlock = false;
      codeLang = '';
      continue;
    }

    currentBlockLines.push(line);
  }

  if (currentBlockLines.length > 0) {
    blocks.push({
      type: inCodeBlock ? 'code' : 'text',
      content: currentBlockLines.join('\n'),
      language: codeLang,
    });
  }

  return blocks;
}

const CodeBlock: React.FC<{ code: string; language?: string }> = ({ code, language }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-2 rounded-xl overflow-hidden border border-slate-700 bg-slate-900 text-slate-100 shadow-md">
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-800/90 text-xs text-slate-400 border-b border-slate-700">
        <span className="font-mono uppercase text-[10px] tracking-wider">{language || 'code'}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 hover:text-white transition-colors py-0.5 px-1.5 rounded bg-slate-700/50 hover:bg-slate-700"
          title="Copy code to clipboard"
          aria-label="Copy code to clipboard"
        >
          {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
          <span className="text-[11px]">{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <pre className="p-3 text-xs font-mono overflow-x-auto text-emerald-300 leading-normal">
        <code>{code}</code>
      </pre>
    </div>
  );
};

const TextBlock: React.FC<{ text: string }> = ({ text }) => {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let listItems: React.ReactNode[] = [];
  let isNumberedList = false;

  const flushList = () => {
    if (listItems.length > 0) {
      if (isNumberedList) {
        elements.push(
          <ol key={`ol-${elements.length}`} className="list-decimal pl-5 space-y-1 my-1.5">
            {listItems}
          </ol>
        );
      } else {
        elements.push(
          <ul key={`ul-${elements.length}`} className="list-disc pl-5 space-y-1 my-1.5">
            {listItems}
          </ul>
        );
      }
      listItems = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      flushList();
      continue;
    }

    // Horizontal Rule
    if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
      flushList();
      elements.push(<hr key={i} className="my-2 border-slate-200" />);
      continue;
    }

    // Blockquote
    if (trimmed.startsWith('>')) {
      flushList();
      const quoteText = trimmed.replace(/^>\s*/, '');
      elements.push(
        <div key={i} className="pl-3 py-1 my-1 border-l-4 border-indigo-500 bg-indigo-50/60 rounded-r text-xs text-indigo-900 italic">
          {renderInlineFormatting(quoteText)}
        </div>
      );
      continue;
    }

    // Headings
    if (trimmed.startsWith('#### ')) {
      flushList();
      elements.push(
        <h4 key={i} className="font-bold text-slate-900 text-xs uppercase tracking-wider mt-2 mb-1">
          {renderInlineFormatting(trimmed.substring(5))}
        </h4>
      );
      continue;
    }

    if (trimmed.startsWith('### ')) {
      flushList();
      elements.push(
        <h3 key={i} className="font-semibold text-slate-900 text-sm mt-2.5 mb-1 text-indigo-900">
          {renderInlineFormatting(trimmed.substring(4))}
        </h3>
      );
      continue;
    }

    if (trimmed.startsWith('## ') || trimmed.startsWith('# ')) {
      flushList();
      elements.push(
        <h2 key={i} className="font-bold text-slate-900 text-base mt-3 mb-1">
          {renderInlineFormatting(trimmed.replace(/^#+\s*/, ''))}
        </h2>
      );
      continue;
    }

    // Unordered List Items: -, *, or bullet
    const ulMatch = trimmed.match(/^[-*•]\s+(.*)/);
    if (ulMatch) {
      if (isNumberedList) flushList();
      isNumberedList = false;
      listItems.push(
        <li key={`li-${i}`} className="leading-snug">
          {renderInlineFormatting(ulMatch[1])}
        </li>
      );
      continue;
    }

    // Ordered List Items: 1., 2., etc.
    const olMatch = trimmed.match(/^\d+\.\s+(.*)/);
    if (olMatch) {
      if (!isNumberedList && listItems.length > 0) flushList();
      isNumberedList = true;
      listItems.push(
        <li key={`oli-${i}`} className="leading-snug">
          {renderInlineFormatting(olMatch[1])}
        </li>
      );
      continue;
    }

    // Regular line / paragraph
    flushList();
    elements.push(
      <p key={i} className="my-1 leading-relaxed">
        {renderInlineFormatting(trimmed)}
      </p>
    );
  }

  flushList();

  return <>{elements}</>;
};

function renderInlineFormatting(text: string): React.ReactNode {
  // Replace tokens safely using regex splitting
  // Patterns: `inline code`, [link text](url), **bold**, *italic*
  const tokenRegex = /(`[^`]+`|\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  const parts = text.split(tokenRegex);

  return parts.map((part, index) => {
    if (!part) return null;

    // Inline code: `code`
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      return (
        <code
          key={index}
          className="px-1.5 py-0.5 rounded bg-slate-100 text-indigo-700 font-mono text-[11px] border border-slate-200"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    // Bold: **text**
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      return (
        <strong key={index} className="font-semibold text-slate-900">
          {part.slice(2, -2)}
        </strong>
      );
    }

    // Italic: *text*
    if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
      return (
        <em key={index} className="italic text-slate-700">
          {part.slice(1, -1)}
        </em>
      );
    }

    // Link: [text](url)
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      const linkText = linkMatch[1];
      const linkUrl = linkMatch[2];
      const isExternal = linkUrl.startsWith('http://') || linkUrl.startsWith('https://');

      return (
        <a
          key={index}
          href={linkUrl}
          target={isExternal ? '_blank' : undefined}
          rel={isExternal ? 'noopener noreferrer' : undefined}
          className="inline-flex items-center gap-0.5 font-medium text-blue-600 hover:text-blue-800 underline underline-offset-2 transition-colors"
        >
          {linkText}
          {isExternal && <ExternalLink size={10} className="inline ml-0.5 opacity-70" />}
        </a>
      );
    }

    return part;
  });
}
