interface Props {
  onBack: () => void;
  onUpload: () => void;
  onAIChat: () => void;
  onLogout: () => void;
}

export const Toolbar = ({ onBack, onUpload, onAIChat, onLogout }: Props) => {
  return (
    <div className="h-14 px-6 border-b border-gray-800 flex items-center justify-between">

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded"
        >
          ⬅ Back
        </button>

        <button
          onClick={onUpload}
          className="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded"
        >
          ⬆ Upload
        </button>

        <button
          onClick={onAIChat}
          className="px-3 py-1 bg-purple-600 hover:bg-purple-500 rounded"
        >
          🤖 AI Chat
        </button>
      </div>

      <button
        onClick={onLogout}
        className="text-red-400 hover:text-red-300"
      >
        Logout
      </button>
    </div>
  );
};
