import React from "react";
import { X, UploadCloud, File, Lock, CheckCircle2, Loader2 } from "lucide-react";
import { useUploadLogic } from "../hooks/useUploadLogic";

interface Props {
  folderId: string;
  onSuccess: () => void;
  onClose: () => void;
}

export const UploadModal: React.FC<Props> = ({
  folderId,
  onSuccess,
  onClose,
}) => {
  const { file, setFile, status, handleUpload } = useUploadLogic(
    folderId,
    onSuccess,
    onClose
  );

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
      <div className="bg-[#0f172a] border border-gray-800 p-0 rounded-xl w-[440px] text-white shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between bg-[#1e293b]/50">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <UploadCloud size={20} className="text-blue-500" />
            Upload Secure File
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          <p className="text-gray-400 text-sm mb-6 leading-relaxed">
            Files are encrypted with a unique key derived from your master key before leaving your device.
          </p>

          {/* File Input Area */}
          <div className="mb-8">
            <label
              htmlFor="file-upload"
              className={`
                relative flex flex-col items-center justify-center w-full h-32 
                border-2 border-dashed rounded-lg cursor-pointer transition-all
                ${file
                  ? "border-blue-500/50 bg-blue-500/5"
                  : "border-gray-700 hover:border-gray-600 hover:bg-gray-800/50"
                }
              `}
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                {file ? (
                  <>
                    <File className="w-8 h-8 text-blue-500 mb-2" />
                    <p className="text-sm text-gray-300 font-medium truncate max-w-[200px]">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-8 h-8 text-gray-500 mb-2" />
                    <p className="text-sm text-gray-400">
                      <span className="font-semibold text-blue-500">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Any file type supported</p>
                  </>
                )}
              </div>
              <input
                id="file-upload"
                type="file"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </label>
          </div>

          {/* Status Indicators */}
          {status !== "idle" && (
            <div className="mb-6 space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center transition-colors
                  ${status === "encrypting" || status === "uploading" || status === "done" ? "bg-blue-500/20 text-blue-400" : "bg-gray-800 text-gray-600"}
                `}>
                  <Lock size={14} />
                </div>
                <span className={status === "encrypting" ? "text-white font-medium" : "text-gray-500"}>
                  Encrypting locally...
                </span>
                {status === "encrypting" && <Loader2 size={14} className="animate-spin ml-auto text-blue-500" />}
                {(status === "uploading" || status === "done") && <CheckCircle2 size={16} className="ml-auto text-green-500" />}
              </div>

              <div className="w-[2px] h-4 bg-gray-800 ml-4"></div>

              <div className="flex items-center gap-3 text-sm">
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center transition-colors
                  ${status === "uploading" || status === "done" ? "bg-blue-500/20 text-blue-400" : "bg-gray-800 text-gray-600"}
                `}>
                  <UploadCloud size={14} />
                </div>
                <span className={status === "uploading" ? "text-white font-medium" : "text-gray-500"}>
                  Uploading to cloud...
                </span>
                {status === "uploading" && <Loader2 size={14} className="animate-spin ml-auto text-blue-500" />}
                {status === "done" && <CheckCircle2 size={16} className="ml-auto text-green-500" />}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>

            <button
              onClick={handleUpload}
              disabled={!file || status !== "idle"}
              className={`
                px-6 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2
                ${status === "idle"
                  ? "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20"
                  : "bg-gray-800 text-gray-400 cursor-not-allowed"}
              `}
            >
              {status === "idle" ? "Encrypt & Upload" : "Processing..."}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

