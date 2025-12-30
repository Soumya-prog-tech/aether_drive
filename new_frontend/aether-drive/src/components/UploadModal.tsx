// src/components/UploadModal.tsx

import React, { useState } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

import {
  generateRandomBytes,
  deriveFileKeyBytes,
  encryptData,
  toB64,
} from "../crypto/crypto-utils";

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
  const { token, masterKey } = useAuth(); // masterKey: Uint8Array
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<
    "idle" | "encrypting" | "uploading" | "done"
  >("idle");

  const handleUpload = async () => {
    if (!file || !masterKey || !token) return;

    try {
      setStatus("encrypting");

      // =====================================================
      // 1️⃣ Read file bytes
      // =====================================================
      const fileBuffer = await file.arrayBuffer();
      const fileBytes = new Uint8Array(fileBuffer);

      // =====================================================
      // 2️⃣ Generate per-file salt (16 bytes)
      // Python: file_salt = os.urandom(16)
      // =====================================================
      const fileSalt = generateRandomBytes(16);

      // =====================================================
      // 3️⃣ Derive FILE KEY BYTES (PBKDF2)
      // Python: file_key = derive_key(master_key, file_salt)
      // =====================================================
      const fileKeyBytes = await deriveFileKeyBytes(
        masterKey,
        fileSalt
      );

      // =====================================================
      // 4️⃣ Import AES-GCM key
      // =====================================================
      const fileKey = await crypto.subtle.importKey(
        "raw",
        fileKeyBytes,
        { name: "AES-GCM" },
        false,
        ["encrypt"]
      );

      // =====================================================
      // 5️⃣ Encrypt file content
      // =====================================================
      const { ciphertext: encFile, iv: fileIv } =
        await encryptData(fileKey, fileBytes);

      // =====================================================
      // 6️⃣ Encrypt metadata (filename)
      // =====================================================
      const metaJson = JSON.stringify({ filename: file.name });
      const { ciphertext: encMeta, iv: metaIv } =
        await encryptData(fileKey, metaJson);

      setStatus("uploading");

      // =====================================================
      // 7️⃣ Prepare multipart form data
      // =====================================================
      const formData = new FormData();

      formData.append(
        "encrypted_file",
        new Blob([encFile]),
        file.name
      );

      formData.append("encrypted_metadata", toB64(encMeta.buffer));
      formData.append("metadata_iv", toB64(metaIv.buffer));

      formData.append("file_iv", toB64(fileIv.buffer));
      formData.append("file_salt", toB64(fileSalt.buffer));

      formData.append("folder_id", folderId);

      // =====================================================
      // 8️⃣ Upload to backend
      // =====================================================
      await axios.post(
        "http://localhost:8000/api/v1/files/upload",
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setStatus("done");
      onSuccess();
      setTimeout(onClose, 800);
    } catch (e) {
      console.error("Upload failed:", e);
      alert("Upload failed. See console for details.");
      setStatus("idle");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gray-800 border border-gray-700 p-6 rounded-xl w-96 text-white shadow-2xl">
        <h3 className="text-xl font-bold mb-1">Upload Secure File</h3>
        <p className="text-gray-400 text-sm mb-6">
          File is encrypted locally before upload.
        </p>

        {/* File Input */}
        <div className="mb-6">
          <label className="block mb-2 text-sm text-gray-300">
            Select File
          </label>
          <input
            type="file"
            onChange={(e) =>
              setFile(e.target.files?.[0] || null)
            }
            className="block w-full text-sm text-gray-300
              file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-600 file:text-white
              hover:file:bg-blue-700
              cursor-pointer bg-gray-900 rounded-lg border border-gray-600"
          />
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg"
          >
            Cancel
          </button>

          <button
            onClick={handleUpload}
            disabled={!file || status !== "idle"}
            className={`
              px-4 py-2 rounded-lg font-medium transition
              ${status === "idle" && "bg-blue-600 hover:bg-blue-500"}
              ${status === "encrypting" && "bg-yellow-600 cursor-wait"}
              ${status === "uploading" && "bg-indigo-600 cursor-wait"}
              ${status === "done" && "bg-green-600"}
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            {status === "idle" && "Encrypt & Upload"}
            {status === "encrypting" && "🔐 Encrypting..."}
            {status === "uploading" && "☁️ Uploading..."}
            {status === "done" && "✅ Done"}
          </button>
        </div>
      </div>
    </div>
  );
};
