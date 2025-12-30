// components/NewFolderModal.jsx
import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FolderPlus, Loader2 } from "lucide-react";

const NewFolderModal = ({ isOpen, onClose, onCreate, loading }) => {
  const [name, setName] = useState("");
  const inputRef = useRef(null);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e?.preventDefault(); // Prevent form submit refresh
    if (!name.trim()) return;
    onCreate(name);
    setName("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 10 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2 bg-sky-100 rounded-lg">
              <FolderPlus className="text-sky-600" size={24} />
            </div>
            <h2 className="text-xl font-bold text-slate-800">
              New Folder
            </h2>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Folder Name
                </label>
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="e.g., Projects, Photos"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:bg-white focus:outline-none transition-all"
                  disabled={loading}
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !name.trim()}
                  className="px-4 py-2 text-sm font-bold text-white bg-sky-600 rounded-lg hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-sky-500/30 transition-all"
                >
                  {loading && <Loader2 className="animate-spin" size={16} />}
                  Create Folder
                </button>
              </div>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default NewFolderModal;