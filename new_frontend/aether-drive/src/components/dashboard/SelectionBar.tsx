// src/components/dashboard/SelectionBar.tsx

interface Props {
  count: number;
  onAskAI: () => void;
  onClear: () => void;
}

export const SelectionBar = ({ count, onAskAI, onClear }: Props) => {
  if (count === 0) return null;

  return (
    <div className="
      fixed bottom-4 left-1/2 -translate-x-1/2
      bg-gray-800 border border-gray-700
      rounded-xl shadow-xl px-6 py-3
      flex items-center gap-4
      z-50
    ">
      <span className="text-sm text-gray-300">
        {count} file{count > 1 ? "s" : ""} selected
      </span>

      <div className="w-px h-6 bg-gray-600" />

      <button
        onClick={onAskAI}
        className="px-3 py-1 bg-purple-600 hover:bg-purple-500 rounded text-sm"
      >
        🤖 Ask AI
      </button>

      <button
        onClick={onClear}
        className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm"
      >
        Clear
      </button>
    </div>
  );
};
