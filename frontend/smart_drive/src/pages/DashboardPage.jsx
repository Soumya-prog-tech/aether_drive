import React, {
  useState,
  useEffect,
  useCallback,
  useContext,
} from "react";
import { motion } from "framer-motion";
import { AuthContext } from "../context/AuthContext"; 
import { api } from "../services/api";
import { decryptMetadata, deriveFileKey, base64ToArrayBuffer } from "../services/crypto";

// --- UI & Icons ---
import {
  FolderPlus,
  FilePlus,
  LogOut,
  BotMessageSquare,
  AlertCircle,
  UserCircle2,
  Lock
} from "lucide-react";

// --- Component Imports ---
import ItemGrid from "../components/ItemGrid";
import Breadcrumbs from "../components/Breadcrumbs";
import UploadModal from "../components/UploadModal";
import FileViewerModal from "../components/FileViewerModal";
import AIChatPanel from "../components/AIChatPanel";
import NewFolderModal from "../components/NewFolderModal";
import SkeletonGrid from "../components/SkeletonGrid";

const DashboardPage = () => {
  const { user, setIsAuthenticated, setUser, masterKey } = useContext(AuthContext);

  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Local state for the key to ensure UI consistency
  const [encryptionKey, setEncryptionKey] = useState(masterKey);

  const [isUploadModalOpen, setUploadModalOpen] = useState(false);
  const [isAIChatOpen, setAIChatOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  const [currentFolderId, setCurrentFolderId] = useState("root");
  const [path, setPath] = useState([{ id: "root", name: "My Drive" }]);
  
  const [isNewFolderModalOpen, setNewFolderModalOpen] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  const handleLogout = useCallback(() => {
    localStorage.removeItem("accessToken");
    setEncryptionKey(null);
    setIsAuthenticated(false);
    setUser(null);
  }, [setIsAuthenticated, setUser]);

  // ✅ 1. Key Sync Effect
  // If masterKey is present (login success), sync it.
  // If missing (refresh), stop loading so we can show the "Vault Locked" screen.
  useEffect(() => {
    if (masterKey) {
      setEncryptionKey(masterKey);
      fetchItems(masterKey, currentFolderId);
    } else {
      setIsLoading(false);
    }
  }, [masterKey, currentFolderId]);

  // ✅ 2. Fetch Items & Decrypt on the fly
  const fetchItems = useCallback(async (key, folderId) => {
    if (!key) return;
    setIsLoading(true);
    setError("");
    try {
      const response = await api.get(`/items?folder_id=${folderId}`);
      
      // Inside DashboardPage.js -> fetchItems

      const decryptedItems = await Promise.all(
        response.data.map(async (item) => {
          if (item.type === "file") {
            try {
              const fileSalt = base64ToArrayBuffer(item.file_salt);
              const fileKey = await deriveFileKey(key, fileSalt);
              const metadata = await decryptMetadata(
                item.encrypted_metadata,
                fileKey,
                item.metadata_iv
              );

              return { 
                ...item, 
                ...metadata, 
                name: metadata.original_filename, // ✅ FIX: Map filename to 'name' for the UI
                fileKey 
              }; 
            } catch (e) {
              console.error(`Failed to decrypt file ${item.id}`, e);
              return { 
                  ...item, 
                  name: "⚠️ Decryption Failed", // ✅ FIX: Fallback name
                  mimeType: "unknown" 
              };
            }
          }
          return item;
        })
      );
      setItems(decryptedItems);
    } catch (err) {
      console.error(err);
      setError("Failed to load files. Please check your connection.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ✅ 3. Handle Folder Creation
  const handleCreateFolder = async (folderName) => {
    if (!folderName || !encryptionKey) return;
    
    setIsCreatingFolder(true);
    try {
      await api.post("/folders", { 
        name: folderName, 
        parent_id: currentFolderId 
      });

      // Refresh list
      fetchItems(encryptionKey, currentFolderId);
      setNewFolderModalOpen(false);
    } catch (err) {
      console.error("Failed to create folder", err);
      alert("Could not create folder. Please try again.");
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const handleFolderSelect = (folder) => {
    setCurrentFolderId(folder.id);
    setPath((prevPath) => [...prevPath, { id: folder.id, name: folder.name }]);
  };

  const handleBreadcrumbNavigate = (folderId, index) => {
    setCurrentFolderId(folderId);
    setPath((prevPath) => prevPath.slice(0, index + 1));
  };

  const currentFolderName = path[path.length - 1]?.name || "My Drive";

  return (
    <div className="h-screen w-screen flex flex-col font-sans bg-gradient-to-br from-slate-50 to-slate-100 text-slate-800">
      
      {/* --- HEADER --- */}
      <header className="flex-shrink-0 sticky top-0 z-40 flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white/70 backdrop-blur-lg shadow-sm">
        <div className="flex items-center gap-2">
           <div className="bg-blue-600 p-1.5 rounded-lg">
             <Lock size={18} className="text-white" />
           </div>
           <h1 className="text-xl font-bold text-slate-900 tracking-tight">Secure Drive</h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-full shadow-sm">
            <UserCircle2 className="text-slate-400" size={20} />
            <span className="text-sm font-medium text-slate-600 hidden sm:block">
              {user?.email}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
          >
            <LogOut size={18} />
            <span className="hidden md:block">Logout</span>
          </button>
        </div>
      </header>

      {/* --- BODY --- */}
      <div className="flex-grow flex min-h-0">
        
        {/* Sidebar */}
        <aside className="w-64 p-4 border-r border-slate-200 bg-white/60 backdrop-blur-md hidden md:flex flex-col gap-3">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => setUploadModalOpen(true)}
            disabled={!encryptionKey}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 font-semibold text-white bg-blue-600 rounded-xl shadow-md shadow-blue-500/20 hover:bg-blue-700 transition-all disabled:opacity-50"
          >
            <FilePlus size={20} />
            Upload File
          </motion.button>
          
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => setNewFolderModalOpen(true)}
            disabled={!encryptionKey}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-50"
          >
            <FolderPlus size={20} />
            New Folder
          </motion.button>
        </aside>

        {/* Main Content */}
        <main className="flex-grow p-6 md:p-8 overflow-y-auto relative">
          
          {/* Breadcrumbs & Title */}
          <div className="mb-6">
             <Breadcrumbs path={path} onNavigate={handleBreadcrumbNavigate} />
             <div className="flex items-end justify-between mt-2">
               <h2 className="text-3xl font-bold text-slate-800">{currentFolderName}</h2>
               <span className="text-sm font-medium text-slate-400 mb-1">
                 {items.length} item{items.length !== 1 ? 's' : ''}
               </span>
             </div>
          </div>

          {/* Content State Handling */}
          {!encryptionKey ? (
            // 🔒 Locked State
            <div className="flex flex-col items-center justify-center h-64 mt-10 text-center animate-fadeIn">
               <div className="bg-amber-100 p-4 rounded-full mb-4">
                 <Lock size={48} className="text-amber-500" />
               </div>
               <h3 className="text-xl font-bold text-slate-800 mb-2">Vault Locked</h3>
               <p className="text-slate-500 max-w-sm mb-6">
                 For your security, encryption keys are cleared from memory on refresh.
               </p>
               <button 
                  onClick={handleLogout}
                  className="px-6 py-2.5 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800 transition-colors shadow-lg"
               >
                 Re-enter Password
               </button>
            </div>
          ) : isLoading ? (
            // ⏳ Loading State
            <SkeletonGrid count={8} />
          ) : error ? (
            // ⚠️ Error State
            <div className="flex flex-col items-center justify-center h-64 text-red-500">
              <AlertCircle className="mb-2" size={32} />
              <p>{error}</p>
            </div>
          ) : items.length === 0 ? (
            // 📂 Empty State
            <div className="flex flex-col items-center justify-center h-64 text-slate-400 mt-10 border-2 border-dashed border-slate-200 rounded-2xl">
              <FolderPlus size={48} className="mb-4 opacity-50" />
              <p className="font-medium">This folder is empty</p>
              <button 
                onClick={() => setUploadModalOpen(true)}
                className="mt-4 text-blue-600 font-semibold hover:underline"
              >
                Upload your first file
              </button>
            </div>
          ) : (
            // ✅ Data State
            <ItemGrid
              items={items}
              onFileSelect={setSelectedFile}
              onFolderSelect={handleFolderSelect}
            />
          )}
        </main>
      </div>

      {/* --- FLOATING AI BUTTON --- */}
      {encryptionKey && (
        <motion.button
          onClick={() => setAIChatOpen(true)}
          className="fixed bottom-8 right-8 w-14 h-14 md:w-16 md:h-16 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-105 transition-all focus:outline-none focus:ring-4 focus:ring-violet-300 z-50"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileHover={{ boxShadow: "0 20px 25px -5px rgba(79, 70, 229, 0.4)" }}
        >
          <BotMessageSquare size={28} />
        </motion.button>
      )}

      {/* --- MODALS --- */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onUploadSuccess={() => {
          setUploadModalOpen(false);
          fetchItems(encryptionKey, currentFolderId);
        }}
        encryptionKey={encryptionKey}
        currentFolderId={currentFolderId}
      />

      {selectedFile && (
        <FileViewerModal
          file={selectedFile}
          onClose={() => setSelectedFile(null)}
          encryptionKey={encryptionKey}
        />
      )}
      
      {isAIChatOpen && (
        <AIChatPanel
          onClose={() => setAIChatOpen(false)}
          currentFolderId={currentFolderId}
          items={items}
          encryptionKey={encryptionKey}
          requestDriveAccess={async () => {
            return window.confirm(
              "Allow AI Assistant to access your Drive context? " +
              "If denied, files remain encrypted and inaccessible."
            );
          }}
        />
      )}
      
      <NewFolderModal
        isOpen={isNewFolderModalOpen}
        onClose={() => setNewFolderModalOpen(false)}
        onCreate={handleCreateFolder}
        loading={isCreatingFolder}
      />
    </div>
  );
};

export default DashboardPage;