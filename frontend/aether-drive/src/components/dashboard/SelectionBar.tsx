import { X, MessageSquare, CheckSquare } from "lucide-react";

interface Props {
  count: number;
  onAskAI: () => void;
  onClear: () => void;
  onSelectAll: () => void;
}

export const SelectionBar = ({ count, onAskAI, onClear, onSelectAll }: Props) => {
  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-[#1e293b] border border-gray-700 rounded-full shadow-2xl px-6 py-3 flex items-center gap-6 animate-in slide-in-from-bottom-10 z-40">
      <div className="flex items-center gap-3 border-r border-gray-700 pr-6">
        <div className="bg-blue-600 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">
          {count}
        </div>
        <span className="text-sm font-medium text-gray-200">Selected</span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onSelectAll}
          className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-700 rounded-lg text-gray-300 hover:text-white transition-colors text-sm font-medium"
        >
          <CheckSquare size={16} />
          Select All
        </button>

        <button
          onClick={onAskAI}
          className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors text-sm font-medium shadow-lg shadow-purple-500/20"
        >
          <MessageSquare size={16} />
          Ask AI
        </button>

        <button
          onClick={onClear}
          className="flex items-center gap-2 px-3 py-1.5 hover:bg-red-500/10 text-gray-400 hover:text-red-400 rounded-lg transition-colors text-sm font-medium ml-2"
        >
          <X size={16} />
          Cancel
        </button>
      </div>
    </div>
  );
};

