import { ArrowLeft, Upload, MessageSquare, LogOut, CheckSquare } from "lucide-react";

interface Props {
  onBack: () => void;
  onUpload: () => void;
  onAIChat: () => void;
  onLogout: () => void;
  onSelectFiles: () => void;
  isSelectionMode: boolean;
}

export const Toolbar = ({
  onBack,
  onUpload,
  onAIChat,
  onLogout,
  onSelectFiles,
  isSelectionMode
}: Props) => {
  return (
    <div className="h-16 px-6 border-b border-gray-800 flex items-center justify-between bg-[#0f172a]/50 backdrop-blur-sm sticky top-0 z-30">

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800/50 hover:bg-gray-800 text-gray-300 hover:text-white rounded-lg transition-all border border-gray-700/50 hover:border-gray-600"
        >
          <ArrowLeft size={16} />
          <span className="text-sm font-medium">Back</span>
        </button>

        <div className="w-[1px] h-8 bg-gray-800 mx-2 self-center"></div>

        <button
          onClick={onUpload}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-all shadow-lg shadow-blue-500/20 font-medium text-sm"
        >
          <Upload size={16} />
          Upload
        </button>

        <button
          onClick={onAIChat}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600/10 hover:bg-purple-600/20 text-purple-400 hover:text-purple-300 border border-purple-500/20 hover:border-purple-500/40 rounded-lg transition-all text-sm font-medium"
        >
          <MessageSquare size={16} />
          AI Chat
        </button>

        {!isSelectionMode && (
          <button
            onClick={onSelectFiles}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800/50 hover:bg-gray-800 text-gray-300 hover:text-white rounded-lg transition-all border border-gray-700/50 hover:border-gray-600 text-sm font-medium"
          >
            <CheckSquare size={16} />
            Select Files
          </button>
        )}
      </div>

      <button
        onClick={onLogout}
        className="flex items-center gap-2 px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors text-sm"
      >
        <LogOut size={16} />
        Logout
      </button>
    </div>
  );
};


