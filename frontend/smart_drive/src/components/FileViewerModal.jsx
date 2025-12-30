import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../services/api";
import { decryptFile, deriveFileKey, base64ToArrayBuffer, decryptMetadata } from "../services/crypto";
import { Loader2, AlertCircle, FileText, Download, X } from "lucide-react";

const FileViewerModal = ({ file, onClose, encryptionKey }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [decryptedContentUrl, setDecryptedContentUrl] = useState(null);
  const [isText, setIsText] = useState(false);
  const [isImage, setIsImage] = useState(false);
  const [textContent, setTextContent] = useState("");

  const decryptAndLoadFile = useCallback(async () => {
    if (!file || !encryptionKey) return;

    setIsLoading(true);
    setError("");
    setDecryptedContentUrl(null);
    setIsText(false);
    setIsImage(false);

    try {
      // 1. Determine the File Key
      // If Dashboard already derived it, use it. Otherwise, derive it now.
      let fileKey = file.fileKey;
      
      if (!fileKey) {
        if (!file.file_salt) throw new Error("Missing file salt for decryption");
        const saltBuffer = base64ToArrayBuffer(file.file_salt);
        fileKey = await deriveFileKey(encryptionKey, saltBuffer);
      }

      // 2. Fetch the Encrypted Content (Blob)
      // We assume this endpoint returns the raw encrypted bytes
      const response = await api.get(`/files/${file.id}/download`, {
        responseType: "arraybuffer", 
      });
      const encryptedBuffer = response.data;

      // 3. Decrypt the Content
      // Note: crypto.js decryptFile expects (buffer, key, ivBase64String)
      const decryptedBlob = await decryptFile(
        encryptedBuffer,
        fileKey,
        file.file_iv // Pass Base64 string directly
      );

      // 4. Handle File Type (MIME)
      // Use decrypted metadata if available, otherwise fallback
      let mimeType = file.mimeType || file.type || "application/octet-stream";
      
      // Basic extension sniffing if mimeType is generic
      if ((mimeType === "application/octet-stream" || !mimeType) && file.original_filename) {
        const ext = file.original_filename.split(".").pop().toLowerCase();
        const mimeMap = {
          pdf: "application/pdf",
          png: "image/png",
          jpg: "image/jpeg",
          jpeg: "image/jpeg",
          txt: "text/plain",
          json: "application/json",
          md: "text/markdown"
        };
        if (mimeMap[ext]) mimeType = mimeMap[ext];
      }

      // 5. Render Logic
      if (mimeType.startsWith("text/") || mimeType === "application/json") {
        const text = await decryptedBlob.text();
        setTextContent(text);
        setIsText(true);
      } else {
        // Create an Object URL for Images/PDFs
        const displayBlob = new Blob([decryptedBlob], { type: mimeType });
        const url = URL.createObjectURL(displayBlob);
        setDecryptedContentUrl(url);
        if (mimeType.startsWith("image/")) setIsImage(true);
      }

    } catch (err) {
      console.error("File viewing failed:", err);
      setError("Failed to decrypt or load file. Key mismatch or network error.");
    } finally {
      setIsLoading(false);
    }
  }, [file, encryptionKey]);

  useEffect(() => {
    decryptAndLoadFile();
    return () => {
      // Cleanup memory
      if (decryptedContentUrl) URL.revokeObjectURL(decryptedContentUrl);
    };
  }, [decryptAndLoadFile]);

  // Prevent closing when clicking modal content
  const handleContentClick = (e) => e.stopPropagation();

  return (
    <AnimatePresence>
      <motion.div
        key="modal-backdrop"
        className="fixed inset-0 z-50 flex flex-col bg-slate-900/95 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        {/* Header */}
        <motion.header
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex-shrink-0 flex items-center justify-between px-6 py-4 bg-white/5 border-b border-white/10"
          onClick={handleContentClick}
        >
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <FileText size={20} className="text-blue-400" />
            </div>
            <div className="flex flex-col">
              <h3 className="text-white font-medium truncate max-w-[50vw]" title={file?.original_filename}>
                {file?.original_filename || "Secure File"}
              </h3>
              <span className="text-xs text-slate-400">Decrypted locally in browser</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {decryptedContentUrl && !isText && (
              <a
                href={decryptedContentUrl}
                download={file?.original_filename || "decrypted-file"}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <Download size={16} />
                <span className="hidden sm:inline">Download</span>
              </a>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </motion.header>

        {/* Main Content Area */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex-grow flex items-center justify-center p-4 overflow-hidden relative"
          onClick={onClose} // Clicking outside the actual content closes it
        >
          <div 
            className="w-full h-full max-w-6xl flex items-center justify-center relative"
            onClick={handleContentClick}
          >
            {isLoading && (
              <div className="flex flex-col items-center gap-4 text-white animate-pulse">
                <Loader2 size={48} className="animate-spin text-blue-500" />
                <span className="text-lg font-light tracking-wide">Decrypting content...</span>
              </div>
            )}

            {!isLoading && error && (
              <div className="bg-red-500/10 border border-red-500/20 p-8 rounded-2xl flex flex-col items-center text-center max-w-md">
                <AlertCircle size={48} className="text-red-500 mb-4" />
                <h4 className="text-red-200 text-lg font-semibold mb-2">Decryption Failed</h4>
                <p className="text-red-300/80">{error}</p>
              </div>
            )}

            {!isLoading && !error && (
              <>
                {isText ? (
                  <div className="w-full h-full bg-slate-800 rounded-xl border border-slate-700 overflow-auto shadow-2xl">
                    <pre className="p-6 text-sm text-slate-200 font-mono whitespace-pre-wrap">
                      {textContent}
                    </pre>
                  </div>
                ) : isImage ? (
                  <img
                    src={decryptedContentUrl}
                    alt="Decrypted content"
                    className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                  />
                ) : (
                  <iframe
                    src={decryptedContentUrl}
                    title="Document Viewer"
                    className="w-full h-full bg-white rounded-xl shadow-2xl border-0"
                  />
                )}
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default FileViewerModal;