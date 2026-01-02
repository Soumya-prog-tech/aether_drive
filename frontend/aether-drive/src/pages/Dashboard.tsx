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
import { downloadAndDecrypt } from "../utils/downloadAndDecrypt";
import { Loader2 } from "lucide-react";
import { CreateFolderModal } from "../components/dashboard/CreateFolderModal";

const Dashboard = () => {
  const { masterKey, token, logout } = useAuth();

  const {
    items,
    loading,
    currentFolder,
    goBack,
    openFolder,
    refresh,
    createFolder,
  } = useFiles(masterKey);

  const {
    selectedFiles,
    isSelectionMode,
    toggleSelect,
    selectAll,
    enterSelectionMode,
    exitSelectionMode,
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
    ingestStatus,
    ingesting,
  } = useAIChat(masterKey, items, selectedFiles);

  const [showUpload, setShowUpload] = useState(false);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async (item: any) => {
    if (!masterKey || !token) return;
    try {
      setDownloading(true);
      await downloadAndDecrypt(item, token, masterKey);
    } catch (e) {
      alert("Download failed");
    } finally {
      setDownloading(false);
    }
  };

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
          onCreateFolder={() => setShowCreateFolder(true)}
          onAIChat={() => setShowChat(true)}
          onLogout={logout}
          onSelectFiles={enterSelectionMode}
          isSelectionMode={isSelectionMode}
        />

        <FileGrid
          items={items}
          loading={loading}
          selectedFiles={selectedFiles}
          selectionMode={isSelectionMode}
          onOpenFolder={openFolder}
          onToggleSelect={toggleSelect}
          onDownload={handleDownload}
        />

        {showUpload && (
          <UploadModal
            folderId={currentFolder}
            onClose={() => setShowUpload(false)}
            onSuccess={refresh}
          />
        )}

        {showCreateFolder && (
          <CreateFolderModal
            onClose={() => setShowCreateFolder(false)}
            onCreate={createFolder}
          />
        )}


        {/* FLOATING SELECTION BAR */}
        {isSelectionMode && (
          <SelectionBar
            count={selectedFiles.length}
            onAskAI={() => setShowChat(true)}
            onClear={exitSelectionMode}
            onSelectAll={() => selectAll(items)}
          />
        )}

        {/* Global Download Loading Overlay */}
        {downloading && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm">
            <div className="bg-gray-900 border border-gray-700 p-6 rounded-xl flex flex-col items-center gap-4 shadow-2xl">
              <Loader2 size={32} className="animate-spin text-blue-500" />
              <div className="text-center">
                <h3 className="font-semibold text-white">Decrypting & Downloading...</h3>
                <p className="text-sm text-gray-400 mt-1">Please wait while we secure your file</p>
              </div>
            </div>
          </div>
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
        ingestStatus={ingestStatus}
        ingesting={ingesting}
      />
    </div>
  );
};

export default Dashboard;

