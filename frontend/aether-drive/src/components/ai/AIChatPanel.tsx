import React, { useEffect, useRef } from "react";
import { X, Bot, Send, Sparkles, FileText, FolderOpen } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Props {
  open: boolean;
  onClose: () => void;
  query: string;
  setQuery: (q: string) => void;
  response: string;
  loading: boolean;
  onRun: () => void;
  useFullContext: boolean;
  setUseFullContext: (v: boolean) => void;
  selectedCount: number;
}

export const AIChatPanel = ({
  open,
  onClose,
  query,
  setQuery,
  response,
  loading,
  onRun,
  useFullContext,
  setUseFullContext,
  selectedCount,
}: Props) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when response updates
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [response, loading]);

  if (!open) return null;

  return (
    <div className="w-[480px] bg-[#0b1220] border-l border-gray-800 flex flex-col h-screen shadow-2xl animate-in slide-in-from-right duration-300 z-40">

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 bg-[#0f172a]">
        <div className="flex items-center gap-3 text-white font-semibold">
          <div className="w-8 h-8 rounded-lg bg-blue-600/20 flex items-center justify-center text-blue-400">
            <Bot size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold leading-none">AI Assistant</h3>
            <p className="text-xs text-gray-500 mt-1 font-normal">Ask questions about your files</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white hover:bg-gray-800 p-2 rounded-lg transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* Response Area */}
      <div
        className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth custom-scrollbar"
        ref={scrollRef}
      >
        {!response && !loading && (
          <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 space-y-4 opacity-60">
            <div className="w-16 h-16 rounded-full bg-gray-800/50 flex items-center justify-center">
              <Sparkles size={32} className="text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-300">No messages yet</p>
              <p className="text-xs mt-1 max-w-[200px] mx-auto">
                Ask me to summarize files, find specific data, or explain code.
              </p>
            </div>
          </div>
        )}

        {response && (
          <div className="prose prose-invert prose-sm max-w-none text-gray-300 leading-relaxed">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code({ node, inline, className, children, ...props }: any) {
                  const match = /language-(\w+)/.exec(className || '')
                  return !inline && match ? (
                    <div className="relative group rounded-lg overflow-hidden my-4 border border-gray-700 bg-[#1e293b]">
                      <div className="px-4 py-2 bg-[#0f172a] border-b border-gray-700 text-xs text-gray-400 font-mono flex justify-between">
                        <span>{match[1]}</span>
                      </div>
                      <div className="p-4 overflow-x-auto">
                        <code className={className} {...props}>
                          {children}
                        </code>
                      </div>
                    </div>
                  ) : (
                    <code className="bg-gray-800 px-1.5 py-0.5 rounded text-blue-300 font-mono text-xs" {...props}>
                      {children}
                    </code>
                  )
                },
                ul: ({ children }) => <ul className="list-disc pl-4 space-y-1 my-2">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal pl-4 space-y-1 my-2">{children}</ol>,
                li: ({ children }) => <li className="text-gray-300">{children}</li>,
                h1: ({ children }) => <h1 className="text-xl font-bold text-white mt-6 mb-3 border-b border-gray-700 pb-2">{children}</h1>,
                h2: ({ children }) => <h2 className="text-lg font-bold text-white mt-5 mb-2">{children}</h2>,
                h3: ({ children }) => <h3 className="text-base font-bold text-white mt-4 mb-2">{children}</h3>,
                p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
                blockquote: ({ children }) => <blockquote className="border-l-4 border-blue-500 pl-4 py-1 my-4 bg-blue-500/10 rounded-r italic text-gray-400">{children}</blockquote>,
                a: ({ href, children }) => <a href={href} className="text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">{children}</a>,
                table: ({ children }) => <div className="overflow-x-auto my-4 border border-gray-700 rounded-lg"><table className="min-w-full divide-y divide-gray-700">{children}</table></div>,
                th: ({ children }) => <th className="px-4 py-2 bg-gray-800 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">{children}</th>,
                td: ({ children }) => <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-300 border-t border-gray-700">{children}</td>,
              }}
            >
              {response}
            </ReactMarkdown>
          </div>
        )}

        {loading && (
          <div className="flex items-center gap-3 text-gray-400 animate-pulse">
            <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center">
              <Bot size={16} className="text-blue-400" />
            </div>
            <div className="space-y-2">
              <div className="h-2 w-24 bg-gray-700 rounded"></div>
              <div className="h-2 w-16 bg-gray-700 rounded"></div>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-5 border-t border-gray-800 bg-[#0f172a]">
        {/* Context Toggles */}
        <div className="flex gap-4 mb-4 text-xs">
          <label className={`
            flex items-center gap-2 cursor-pointer transition-colors
            ${useFullContext ? "text-blue-400 font-medium" : "text-gray-500 hover:text-gray-400"}
          `}>
            <input
              type="radio"
              checked={useFullContext}
              onChange={() => setUseFullContext(true)}
              className="hidden"
            />
            <FolderOpen size={14} />
            Full Folder Context
          </label>

          <label className={`
            flex items-center gap-2 cursor-pointer transition-colors
            ${!useFullContext ? "text-blue-400 font-medium" : "text-gray-500 hover:text-gray-400"}
            ${selectedCount === 0 ? "opacity-50 cursor-not-allowed" : ""}
          `}>
            <input
              type="radio"
              checked={!useFullContext}
              onChange={() => setUseFullContext(false)}
              disabled={selectedCount === 0}
              className="hidden"
            />
            <FileText size={14} />
            Selected Files Only ({selectedCount})
          </label>
        </div>

        <div className="relative">
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onRun();
              }
            }}
            placeholder="Ask something about your files..."
            className="w-full min-h-[100px] rounded-xl bg-[#1e293b] border border-gray-700 p-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600/50 focus:border-blue-500 resize-none"
          />
          <button
            onClick={onRun}
            disabled={loading || !query.trim()}
            className="absolute bottom-3 right-3 p-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 text-white rounded-lg transition-all shadow-lg shadow-blue-600/20"
          >
            {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send size={16} />}
          </button>
        </div>
        <p className="text-[10px] text-gray-600 mt-2 text-center">
          AI can make mistakes. Verify important information.
        </p>
      </div>
    </div>
  );
};

