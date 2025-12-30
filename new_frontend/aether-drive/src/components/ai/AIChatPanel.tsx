// src/components/ai/AIChatPanel.tsx
import { X, Bot } from "lucide-react";

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
  if (!open) return null;

  return (
    <div className="w-[420px] bg-[#0b1220] border-l border-gray-800 flex flex-col h-screen">
      
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <div className="flex items-center gap-2 text-white font-semibold">
          <Bot size={18} />
          AI Chat
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-white">
          <X size={18} />
        </button>
      </div>

      {/* Context selection */}
      <div className="px-4 py-3 border-b border-gray-800 space-y-2 text-sm">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            checked={useFullContext}
            onChange={() => setUseFullContext(true)}
          />
          Full folder context
        </label>

        <label
          className={`flex items-center gap-2 cursor-pointer ${
            selectedCount === 0 ? "opacity-50" : ""
          }`}
        >
          <input
            type="radio"
            checked={!useFullContext}
            onChange={() => setUseFullContext(false)}
            disabled={selectedCount === 0}
          />
          Selected files only ({selectedCount})
        </label>
      </div>

      {/* Input */}
      <div className="p-4 space-y-3">
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask something about your files..."
          className="w-full min-h-[100px] rounded-lg bg-[#101826] border border-gray-700 p-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
        />

        <button
          onClick={onRun}   // 🔥 THIS WAS MISSING / WRONG
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-medium py-2 rounded-lg transition"
        >
          {loading ? "Thinking…" : "Ask AI"}
        </button>
      </div>

      {/* Response */}
      <div className="flex-1 overflow-auto p-4">
        {!response && !loading && (
          <p className="text-gray-500 text-sm">
            AI response will appear here…
          </p>
        )}

        {response && (
          <pre className="whitespace-pre-wrap text-sm text-gray-200">
            {response}
          </pre>
        )}
      </div>
    </div>
  );
};
