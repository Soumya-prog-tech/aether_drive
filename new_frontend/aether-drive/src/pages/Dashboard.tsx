// src/pages/Dashboard.tsx
import { useState } from "react";
import { useAuth } from "../context/AuthContext";

import { useFiles } from "../hooks/useFiles";
import { useSelection } from "../hooks/useSelection";
import { useAIChat } from "../hooks/useAIChat";

import { Toolbar } from "../components/dashboard/Toolbar";
import { FileGrid } from "../components/dashboard/FileGrid";
import { UploadModal } from "../components/UploadModal";
import { SelectionBar } from "../components/dashboard/SelectionBar";
import { AIChatPanel } from "../components/ai/AIChatPanel";

const Dashboard = () => {
  const { masterKey, logout } = useAuth();

  const {
    items,
    loading,
    currentFolder,
    goBack,
    openFolder,
    refresh,
  } = useFiles(masterKey);

  const {
    selectedFiles,
    toggleSelect,
    clearSelection,
  } = useSelection();

  const {
    showChat,
    setShowChat,
    chatQuery,
    setChatQuery,
    chatResponse,
    chatLoading,
    runChat,
    useFullContext,
    setUseFullContext,
  } = useAIChat(masterKey, items, selectedFiles);

  const [showUpload, setShowUpload] = useState(false);

  if (!masterKey) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900 text-white">
        🔒 Locked — please login again
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-gray-900 text-white flex">
      
      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col">
        <Toolbar
          onBack={goBack}
          onUpload={() => setShowUpload(true)}
          onAIChat={() => setShowChat(true)}
          onLogout={logout}
        />

        <FileGrid
          items={items}
          loading={loading}
          selectedFiles={selectedFiles}
          onOpenFolder={openFolder}
          onToggleSelect={toggleSelect}
        />

        {showUpload && (
          <UploadModal
            folderId={currentFolder}
            onClose={() => setShowUpload(false)}
            onSuccess={refresh}
          />
        )}

        {/* FLOATING SELECTION BAR */}
        {selectedFiles.length > 0 && (
          <SelectionBar
            count={selectedFiles.length}
            onAskAI={() => setShowChat(true)}
            onClear={clearSelection}
          />
        )}
      </div>

      {/* AI CHAT SIDE PANEL */}
      <AIChatPanel
        open={showChat}
        onClose={() => {
          setShowChat(false);
          clearSelection();
        }}
        query={chatQuery}
        setQuery={setChatQuery}
        response={chatResponse}
        loading={chatLoading}
        onRun={runChat}
        useFullContext={useFullContext}
        setUseFullContext={setUseFullContext}
        selectedCount={selectedFiles.length}
      />
    </div>
  );
};

export default Dashboard;
